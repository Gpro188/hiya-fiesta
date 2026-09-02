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
      select: { id: true, name: true }
    });

    let importedCount = 0;

    for (const item of studentsData) {
      if (!item.uid || !item.name || !item.institutionName) continue;

      const searchInstName = item.institutionName.trim().toUpperCase();
      let targetInstitutionId = null;

      for (const inst of institutions) {
        const dbInstName = inst.name.trim().toUpperCase();
        if (dbInstName === searchInstName || dbInstName.includes(searchInstName) || searchInstName.includes(dbInstName)) {
          targetInstitutionId = inst.id;
          break;
        }
      }

      if (!targetInstitutionId) continue;

      await prisma.masterStudent.upsert({
        where: { uid: item.uid.trim() },
        update: {
          name: item.name.trim(),
          institutionId: targetInstitutionId,
          district: item.district || null,
          phone: item.phone || null,
          stream: item.stream || "FADHILA",
        },
        create: {
          uid: item.uid.trim().toUpperCase(),
          name: item.name.trim(),
          institutionId: targetInstitutionId,
          district: item.district || null,
          phone: item.phone || null,
          stream: (item.stream || "FADHILA").trim().toUpperCase()
        }
      });

      importedCount++;
    }

    revalidatePath("/dashboard/super/students");
    return { success: true, count: importedCount };
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

    await prisma.masterStudent.deleteMany({});

    revalidatePath("/dashboard/super/students");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to bulk delete all students:", error);
    return { success: false, error: error.message || "Failed to delete all students" };
  }
}
