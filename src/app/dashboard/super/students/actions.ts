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

    // Track duplicate UIDs inside the uploaded excel sheet itself
    const seenUidsInUpload = new Map<string, number>();

    studentsData.forEach((item, idx) => {
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
        return;
      }

      if (!item.name?.trim()) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: "-",
          uid: uidTrimmed,
          institutionName: item.institutionName || "-",
          reason: "Missing Student Name"
        });
        return;
      }

      if (!item.institutionName?.trim()) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name,
          uid: uidTrimmed,
          institutionName: "-",
          reason: "Missing Institution Name"
        });
        return;
      }

      if (seenUidsInUpload.has(uidTrimmed)) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name,
          uid: uidTrimmed,
          institutionName: item.institutionName,
          reason: `Duplicate UID in Excel (already on Row ${seenUidsInUpload.get(uidTrimmed)})`
        });
        return;
      }
      seenUidsInUpload.set(uidTrimmed, rowNum);
    });

    for (let idx = 0; idx < studentsData.length; idx++) {
      const item = studentsData[idx];
      const rowNum = idx + 2;
      const uidTrimmed = item.uid?.trim().toUpperCase();

      if (!uidTrimmed || !item.name?.trim() || !item.institutionName?.trim()) continue;

      // Normalize search name (remove non-alphanumeric, extra spaces)
      const cleanSearchName = item.institutionName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      let targetInstitutionId = null;
      let matchedInstName = "";

      // 1. First priority: Exact match on cleaned name or code
      const exactMatch = institutions.find(inst => {
        const cleanDbName = inst.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const cleanDbCode = (inst.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        return cleanDbName === cleanSearchName || (cleanDbCode && cleanDbCode === cleanSearchName);
      });

      if (exactMatch) {
        targetInstitutionId = exactMatch.id;
        matchedInstName = exactMatch.name;
      } else {
        // 2. Fallback: Substring match, prioritizing longest (most specific) name
        const candidates = institutions.filter(inst => {
          const cleanDbName = inst.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          return cleanDbName.includes(cleanSearchName) || cleanSearchName.includes(cleanDbName);
        });

        if (candidates.length > 0) {
          candidates.sort((a, b) => b.name.length - a.name.length);
          targetInstitutionId = candidates[0].id;
          matchedInstName = candidates[0].name;
        }
      }

      if (!targetInstitutionId) {
        skippedRecords.push({
          rowNumber: rowNum,
          name: item.name,
          uid: uidTrimmed,
          institutionName: item.institutionName,
          reason: `Institution not matched in Master Institutions Directory ("${item.institutionName}")`
        });
        continue;
      }

      try {
        await prisma.masterStudent.upsert({
          where: { uid: uidTrimmed },
          update: {
            name: item.name.trim(),
            institutionId: targetInstitutionId,
            district: item.district || null,
            phone: item.phone || null,
            stream: (item.stream || "FADHILA").trim().toUpperCase(),
          },
          create: {
            uid: uidTrimmed,
            name: item.name.trim(),
            institutionId: targetInstitutionId,
            district: item.district || null,
            phone: item.phone || null,
            stream: (item.stream || "FADHILA").trim().toUpperCase()
          }
        });

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

    const student = await prisma.masterStudent.create({
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
