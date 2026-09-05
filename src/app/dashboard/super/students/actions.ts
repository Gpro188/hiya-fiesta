"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function bulkImportStudents(studentsData: Array<{
  institutionName: string;
  name: string;
  district?: string;
  uid: string;
  phone?: string;
  stream: string;
}>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const institutions = await prisma.masterInstitution.findMany({
      select: { id: true, name: true, code: true }
    });

    let importedCount = 0;
    const skippedRecords: Array<{
      rowNumber: number;
      name: string;
      uid: string;
      institutionName: string;
      reason: string;
    }> = [];

    // Helper to resolve institution by cleaned name or code
    const resolveInstitution = (instNameRaw: string) => {
      if (!instNameRaw?.trim()) return null;
      const cleanSearchName = instNameRaw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      // 1. Exact match on cleaned name or code
      const exactMatch = institutions.find(inst => {
        const cleanDbName = inst.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const cleanDbCode = (inst.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        return cleanDbName === cleanSearchName || (cleanDbCode && cleanDbCode === cleanSearchName);
      });
      if (exactMatch) return exactMatch;

      // 2. Substring match, prioritizing longest (most specific) name
      const candidates = institutions.filter(inst => {
        const cleanDbName = inst.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        return cleanDbName.includes(cleanSearchName) || cleanSearchName.includes(cleanDbName);
      });
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.name.length - a.name.length);
        return candidates[0];
      }
      return null;
    };

    // Pre-fetch all existing students in DB matching the UIDs in this upload
    const validUids = studentsData.map(s => s.uid?.trim().toUpperCase()).filter(Boolean);
    const existingInDb = await prisma.masterStudent.findMany({
      where: { uid: { in: validUids } },
      select: { uid: true, institutionId: true, name: true, institution: { select: { name: true } } }
    });

    // Key existing DB records by `${institutionId}_${uid}` to scope uniqueness per institution
    const existingDbMap = new Map<string, { name: string; instName: string }>();
    existingInDb.forEach(s => {
      existingDbMap.set(`${s.institutionId}_${s.uid.toUpperCase()}`, { 
        name: s.name, 
        instName: s.institution?.name || "Institution" 
      });
    });

    // Track duplicate entries inside the uploaded Excel sheet itself, keyed per institution: `${institutionId}_${uid}`
    const seenInUpload = new Map<string, number>();

    for (let idx = 0; idx < studentsData.length; idx++) {
      const item = studentsData[idx];
      const rowNum = idx + 2; // header is row 1
      const uidTrimmed = item.uid?.trim().toUpperCase();

      if (!uidTrimmed) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name || "Unknown",
          uid: "-",
          institutionName: item.institutionName || "-",
          reason: "Missing Student UID"
        });
        continue;
      }

      if (!item.name?.trim()) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: "-",
          uid: uidTrimmed,
          institutionName: item.institutionName || "-",
          reason: "Missing Student Name"
        });
        continue;
      }

      if (!item.institutionName?.trim()) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name,
          uid: uidTrimmed,
          institutionName: "-",
          reason: "Missing Institution Name"
        });
        continue;
      }

      // Match institution
      const matchedInst = resolveInstitution(item.institutionName);
      if (!matchedInst) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name,
          uid: uidTrimmed,
          institutionName: item.institutionName,
          reason: `Institution not matched in Master Institutions Directory ("${item.institutionName}")`
        });
        continue;
      }

      // Composite key per institution: `${institutionId}_${uid}`
      // This allows different institutions to have the same UID, while blocking duplicates in the same institution!
      const compositeKey = `${matchedInst.id}_${uidTrimmed}`;

      // 1. Check duplicate within the uploaded Excel sheet for this institution
      if (seenInUpload.has(compositeKey)) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name,
          uid: uidTrimmed,
          institutionName: item.institutionName,
          reason: `Duplicate UID in Excel for "${matchedInst.name}" (already on Row ${seenInUpload.get(compositeKey)})`
        });
        continue;
      }
      seenInUpload.set(compositeKey, rowNum);

      // 2. Check duplicate in database for this institution
      if (existingDbMap.has(compositeKey)) {
        const existing = existingDbMap.get(compositeKey)!;
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name,
          uid: uidTrimmed,
          institutionName: item.institutionName,
          reason: `Already Uploaded (Student already exists under ${matchedInst.name})`
        });
        continue;
      }

      try {
        await prisma.masterStudent.create({
          data: {
            uid: uidTrimmed,
            name: item.name.trim(),
            institutionId: matchedInst.id,
            district: item.district || null,
            phone: item.phone || null,
            stream: (item.stream || "FADHILA").trim().toUpperCase()
          }
        });

        // Remember newly created student in map so subsequent rows in same batch are caught
        existingDbMap.set(compositeKey, { name: item.name.trim(), instName: matchedInst.name });
        importedCount++;
      } catch (dbErr: any) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name,
          uid: uidTrimmed,
          institutionName: item.institutionName,
          reason: `Database Error: ${dbErr.message || "Failed to save"}`
        });
      }
    }

    revalidatePath("/dashboard/super/students");
    return { 
      success: true, 
      count: importedCount, 
      totalInExcel: studentsData.length,
      skippedCount: skippedRecords.length,
      skippedRecords 
    };
  } catch (error: any) {
    console.error("Failed to bulk import students:", error);
    return { success: false, error: error.message || "Failed to import students" };
  }
}

export async function addStudent(data: {
  uid: string;
  name: string;
  institutionId: string;
  district?: string;
  phone?: string;
  stream: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const uidTrimmed = data.uid.trim().toUpperCase();
    const existing = await prisma.masterStudent.findFirst({
      where: {
        uid: uidTrimmed,
        institutionId: data.institutionId
      },
      include: { institution: { select: { name: true } } }
    });

    if (existing) {
      return { 
        success: false, 
        error: `Student with UID "${uidTrimmed}" already exists in ${existing.institution?.name || "this institution"}.` 
      };
    }

    const student = await prisma.masterStudent.create({
      data: {
        uid: uidTrimmed,
        name: data.name.trim(),
        institutionId: data.institutionId,
        district: data.district || null,
        phone: data.phone || null,
        stream: (data.stream || "FADHILA").trim().toUpperCase()
      }
    });

    revalidatePath("/dashboard/super/students");
    return { success: true, student };
  } catch (error: any) {
    console.error("Failed to add student:", error);
    return { success: false, error: error.message || "Failed to add student" };
  }
}

export async function updateStudent(id: string, data: {
  uid: string;
  name: string;
  institutionId: string;
  district?: string;
  phone?: string;
  stream: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.masterStudent.update({
      where: { id },
      data: {
        uid: data.uid.trim(),
        name: data.name.trim(),
        institutionId: data.institutionId,
        district: data.district || null,
        phone: data.phone || null,
        stream: (data.stream || "FADHILA").trim().toUpperCase()
      }
    });

    revalidatePath("/dashboard/super/students");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update student:", error);
    return { success: false, error: error.message || "Failed to update student" };
  }
}

export async function deleteStudent(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.masterStudent.delete({ where: { id } });

    revalidatePath("/dashboard/super/students");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete student:", error);
    return { success: false, error: error.message || "Failed to delete student" };
  }
}

export async function bulkDeleteStudentsByZone(zoneId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    // Find all institutions in this zone
    const institutions = await prisma.masterInstitution.findMany({
      where: { zoneId },
      select: { id: true }
    });
    
    const instIds = institutions.map(i => i.id);

    if (instIds.length > 0) {
      await prisma.masterStudent.deleteMany({
        where: { institutionId: { in: instIds } }
      });
    }

    revalidatePath("/dashboard/super/students");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to bulk delete by zone:", error);
    return { success: false, error: error.message || "Failed to bulk delete" };
  }
}

export async function bulkDeleteStudentsByInstitution(institutionId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.masterStudent.deleteMany({
      where: { institutionId }
    });

    revalidatePath("/dashboard/super/students");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to bulk delete by institution:", error);
    return { success: false, error: error.message || "Failed to bulk delete" };
  }
}

export async function bulkDeleteAllStudents() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized: Super Admin permission required." };
    }

    // First unlink candidates from masterStudent to avoid foreign key constraints
    await prisma.candidate.updateMany({
      data: { uid: null }
    });

    await prisma.masterStudent.deleteMany({});

    revalidatePath("/dashboard/super/students");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to bulk delete all students:", error);
    return { success: false, error: error.message || "Failed to delete all students" };
  }
}
