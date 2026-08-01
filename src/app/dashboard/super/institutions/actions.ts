"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";

export async function bulkImportInstitutions(institutionsData: Array<{
  code: string;
  password?: string;
  affiliationNo?: string;
  name: string;
  place?: string;
  zoneName: string;
  district?: string;
  stream?: string;
}>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    let importedCount = 0;

    for (const item of institutionsData) {
      if (!item.code || !item.name || !item.zoneName) continue;

      const normZoneName = item.zoneName.trim().toUpperCase();
      let zone = await prisma.zone.findFirst({
        where: { OR: [{ name: { equals: normZoneName, mode: 'insensitive' } }, { code: { equals: normZoneName, mode: 'insensitive' } }] }
      });

      if (!zone) {
        // Auto-create zone if not existing
        zone = await prisma.zone.create({
          data: {
            name: normZoneName,
            code: normZoneName.substring(0, 4)
          }
        });
      }

      const instPassword = item.password || "123";
      const hashedPassword = await bcrypt.hash(instPassword, 10);

      const institution = await prisma.masterInstitution.upsert({
        where: { code: item.code.trim().toUpperCase() },
        update: {
          name: item.name.trim(),
          password: instPassword,
          affiliationNo: item.affiliationNo || null,
          place: item.place || null,
          zoneId: zone.id,
          district: item.district || null,
          stream: item.stream || null,
        },
        create: {
          code: item.code.trim().toUpperCase(),
          password: instPassword,
          name: item.name.trim(),
          affiliationNo: item.affiliationNo || null,
          place: item.place || null,
          zoneId: zone.id,
          district: item.district || null,
          stream: item.stream || null,
        }
      });

      // Auto-create user login account for institution manager
      const username = item.code.trim().toLowerCase();
      await prisma.user.upsert({
        where: { username },
        update: {
          password: hashedPassword,
          institutionId: institution.id,
          zoneId: zone.id,
          role: "INSTITUTION_MANAGER"
        },
        create: {
          username,
          password: hashedPassword,
          institutionId: institution.id,
          zoneId: zone.id,
          role: "INSTITUTION_MANAGER"
        }
      });

      importedCount++;
    }

    revalidatePath("/dashboard/super/institutions");
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error("Failed to bulk import institutions:", error);
    return { success: false, error: error.message || "Failed to import institutions" };
  }
}
