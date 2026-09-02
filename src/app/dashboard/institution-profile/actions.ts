"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";

export async function getMyInstitutionProfile() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["INSTITUTION_MANAGER", "MANAGER"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        institution: {
          include: {
            zone: true,
            teams: true,
          },
        },
      },
    });

    if (!user || !user.institution) {
      return { success: false, error: "Institution not found" };
    }

    return {
      success: true,
      data: {
        id: user.institution.id,
        code: user.institution.code,
        name: user.institution.name,
        logoUrl: user.institution.logoUrl,
        place: user.institution.place,
        district: user.institution.district,
        stream: user.institution.stream,
        zoneName: user.institution.zone?.name,
        username: user.username,
      },
    };
  } catch (error: any) {
    console.error("Failed to fetch institution profile:", error);
    return { success: false, error: error.message || "Failed to fetch profile" };
  }
}

export async function updateMyInstitutionProfile(data: {
  logoUrl?: string;
  newPassword?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["INSTITUTION_MANAGER", "MANAGER"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, institutionId: true, username: true },
    });

    if (!user || !user.institutionId) {
      return { success: false, error: "Institution profile not found" };
    }

    // 1. Update logo if provided
    if (data.logoUrl !== undefined) {
      await prisma.masterInstitution.update({
        where: { id: user.institutionId },
        data: { logoUrl: data.logoUrl || null },
      });
    }

    // 2. Update password if provided
    if (data.newPassword && data.newPassword.trim().length >= 4) {
      const hashedPassword = await bcrypt.hash(data.newPassword.trim(), 10);
      
      // Update User table password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      // Update MasterInstitution plain password for records
      await prisma.masterInstitution.update({
        where: { id: user.institutionId },
        data: { password: data.newPassword.trim() },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/reports");
    revalidatePath("/");
    revalidatePath("/tv");

    return { success: true, message: "Profile & security updated successfully." };
  } catch (error: any) {
    console.error("Failed to update institution profile:", error);
    return { success: false, error: error.message || "Failed to update profile" };
  }
}
