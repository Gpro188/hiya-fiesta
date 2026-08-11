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
  district?: string;
  stream?: string;
  zoneName?: string;
}>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const zones = await prisma.zone.findMany({
      select: { id: true, name: true }
    });

    let importedCount = 0;

    for (const item of institutionsData) {
      if (!item.code || !item.name || !item.zoneName) continue;

      const searchZoneName = item.zoneName.trim().toUpperCase();
      let matchedZoneId = null;

      for (const zone of zones) {
        const dbZoneName = zone.name.trim().toUpperCase();
        // Match exact or substring (e.g. "KASARAGOD" in "KASARAGOD Zone")
        if (dbZoneName === searchZoneName || dbZoneName.includes(searchZoneName) || searchZoneName.includes(dbZoneName)) {
          matchedZoneId = zone.id;
          break;
        }
      }

      if (!matchedZoneId) continue;

      const instPassword = item.password || "123";
      const hashedPassword = await bcrypt.hash(instPassword, 10);

      const institution = await prisma.masterInstitution.upsert({
        where: { code: item.code.trim().toUpperCase() },
        update: {
          name: item.name.trim(),
          password: instPassword,
          affiliationNo: item.affiliationNo || null,
          place: item.place || null,
          zoneId: matchedZoneId,
          district: item.district || null,
          stream: item.stream || null,
        },
        create: {
          code: item.code.trim().toUpperCase(),
          password: instPassword,
          name: item.name.trim(),
          affiliationNo: item.affiliationNo || null,
          place: item.place || null,
          zoneId: matchedZoneId,
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
          zoneId: matchedZoneId,
          role: "INSTITUTION_MANAGER"
        },
        create: {
          username,
          password: hashedPassword,
          institutionId: institution.id,
          zoneId: matchedZoneId,
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

export async function updateInstitution(id: string, data: {
  code: string;
  name: string;
  affiliationNo?: string;
  place?: string;
  zoneId: string;
  district?: string;
  stream?: string;
  password?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const inst = await prisma.masterInstitution.update({
      where: { id },
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        affiliationNo: data.affiliationNo || null,
        place: data.place || null,
        zoneId: data.zoneId,
        district: data.district || null,
        stream: data.stream || null,
        password: data.password || undefined
      }
    });

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      await prisma.user.updateMany({
        where: { institutionId: id },
        data: { password: hashedPassword }
      });
    }

    revalidatePath("/dashboard/super/institutions");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update institution:", error);
    return { success: false, error: error.message || "Failed to update institution" };
  }
}

export async function deleteInstitution(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.masterInstitution.delete({ where: { id } });

    revalidatePath("/dashboard/super/institutions");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete institution:", error);
    return { success: false, error: error.message || "Failed to delete institution" };
  }
}
