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

    let importedCount = 0;

    for (const item of studentsData) {
      if (!item.uid || !item.name || !item.institutionName) continue;

      const normInstName = item.institutionName.trim();
      let inst = await prisma.masterInstitution.findFirst({
        where: { name: { equals: normInstName, mode: 'insensitive' } }
      });

      if (!inst) {
        // Fallback default institution
        let defaultZone = await prisma.zone.findFirst();
        if (!defaultZone) {
          defaultZone = await prisma.zone.create({ data: { name: 'GENERAL', code: 'GEN' } });
        }
        inst = await prisma.masterInstitution.create({
          data: {
            code: item.uid.substring(0, 5).toUpperCase(),
            name: normInstName,
            zoneId: defaultZone.id
          }
        });
      }

      await prisma.masterStudent.upsert({
        where: { uid: item.uid.trim() },
        update: {
          name: item.name.trim(),
          institutionId: inst.id,
          district: item.district || null,
          phone: item.phone || null,
          stream: (item.stream || "FADHILA").trim().toUpperCase()
        },
        create: {
          uid: item.uid.trim(),
          name: item.name.trim(),
          institutionId: inst.id,
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
