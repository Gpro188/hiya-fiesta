"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";

export async function editUser(userId: string, newUsername: string, newPasswordRaw?: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }
  
  if (!newUsername || newUsername.length < 3) {
    return { success: false, error: "Username must be at least 3 characters long." };
  }

  try {
    const caller = await prisma.user.findUnique({ where: { id: session.user.id } });
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || !caller) return { success: false, error: "User not found" };

    if (session.user.role === "ZONE_ADMIN" && target.zoneId !== caller.zoneId) {
      return { success: false, error: "Unauthorized to modify this user" };
    }

    const exists = await prisma.user.findUnique({ where: { username: newUsername } });
    if (exists && exists.id !== userId) return { success: false, error: "Username already taken." };

    const updateData: any = { username: newUsername };

    if (newPasswordRaw) {
      if (newPasswordRaw.length < 3) {
        return { success: false, error: "Password must be at least 3 characters long." };
      }
      updateData.password = await bcrypt.hash(newPasswordRaw, 10);
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to edit user:", error);
    return { success: false, error: error.message || "Failed to edit user" };
  }
}

export async function deleteUser(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const caller = await prisma.user.findUnique({ where: { id: session.user.id } });
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || !caller) return { success: false, error: "User not found" };

    if (session.user.role === "ZONE_ADMIN" && target.zoneId !== caller.zoneId) {
      return { success: false, error: "Unauthorized to modify this user" };
    }
    
    // Prevent deleting admins
    if (["ADMIN", "SUPER_ADMIN"].includes(target.role)) {
      return { success: false, error: "Cannot delete administrators" };
    }

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete user" };
  }
}

export async function createUser(username: string, passwordRaw: string, role: string, zoneId?: string | null, institutionId?: string | null) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  if (!username || username.length < 3) return { success: false, error: "Username must be at least 3 characters." };
  if (!passwordRaw || passwordRaw.length < 3) return { success: false, error: "Password must be at least 3 characters." };

  try {
    const caller = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!caller) return { success: false, error: "Caller not found" };

    let newZoneId = zoneId;
    
    if (session.user.role === "ZONE_ADMIN") {
      // Zone admins can only create users in their zone
      newZoneId = caller.zoneId;
      // Zone admins cannot create Judges or Admins
      if (!["INSTITUTION_MANAGER"].includes(role)) {
         return { success: false, error: "Zone Admins can only create Institution Managers" };
      }
    } else {
      // Admins can create anything except another SUPER_ADMIN
      if (role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
         return { success: false, error: "Only Super Admin can create Super Admins" };
      }
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return { success: false, error: "Username already taken." };

    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    
    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        zoneId: newZoneId,
        institutionId: institutionId,
        eventId: caller.eventId // inherit event id
      }
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create user" };
  }
}
