"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function createEvent(name: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }
    
    if (session.user.role !== "SUPER_ADMIN" && !session.user.eventId) {
      return { success: false, error: "Unauthorized or no Main Event assigned" };
    }

    await prisma.event.create({
      data: { 
        name,
        parentId: session.user.eventId || null
      },
    });
    revalidatePath("/dashboard/events");
    return { success: true };
  } catch (error) {
    console.error("Failed to create event:", error);
    return { success: false, error: "Failed to create event" };
  }
}

export async function updateEvent(id: string, data: { name?: string, statusOverride?: string }) {
  try {
    await prisma.event.update({
      where: { id },
      data: { 
        name: data.name,
        statusOverride: data.statusOverride
      },
    });
    revalidatePath("/dashboard/events");
    return { success: true };
  } catch (error) {
    console.error("Failed to update event:", error);
    return { success: false, error: "Failed to update event" };
  }
}

export async function deleteEvent(id: string) {
  try {
    await prisma.event.delete({
      where: { id },
    });
    revalidatePath("/dashboard/events");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete event:", error);
    return { success: false, error: "Failed to delete event" };
  }
}
