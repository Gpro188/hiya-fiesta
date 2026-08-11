"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function addZone(data: { name: string; code: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const zone = await prisma.zone.create({
      data: {
        name: data.name.trim().toUpperCase(),
        code: data.code.trim().toUpperCase(),
      }
    });

    revalidatePath("/dashboard/super/zones");
    return { success: true, zone };
  } catch (error: any) {
    console.error("Failed to add zone:", error);
    return { success: false, error: error.message || "Failed to add zone" };
  }
}

export async function updateZone(id: string, data: { name: string; code: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.zone.update({
      where: { id },
      data: {
        name: data.name.trim().toUpperCase(),
        code: data.code.trim().toUpperCase(),
      }
    });

    revalidatePath("/dashboard/super/zones");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update zone:", error);
    return { success: false, error: error.message || "Failed to update zone" };
  }
}

export async function deleteZone(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.zone.delete({ where: { id } });

    revalidatePath("/dashboard/super/zones");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete zone:", error);
    return { success: false, error: error.message || "Failed to delete zone" };
  }
}
