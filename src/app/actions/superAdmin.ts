"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";

// Middleware helper to ensure user is SUPER_ADMIN
async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session;
}

export async function getSuperAdminData() {
  try {
    await ensureSuperAdmin();

    const [totalVisits, totalEvents, events, users, allEvents] = await Promise.all([
      prisma.pageVisit.count(),
      prisma.event.count(),
      prisma.event.findMany({
        where: { parentId: null },
        select: {
          id: true,
          name: true,
          customDomain: true,
          createdAt: true,
          _count: {
            select: {
              pageVisits: true,
              teams: true,
              programs: true,
              users: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "MANAGER", "JUDGE"] }
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          event: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.event.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          parentId: true,
        },
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }]
      })
    ]);

    // Group visits by date for simple charts if needed
    // (We will present the raw numbers and fests breakdown on the dashboard)
    return {
      success: true,
      data: {
        totalVisits,
        totalEvents,
        events,
        users,
        allEvents
      }
    };
  } catch (error: any) {
    console.error("Super Admin fetch failed:", error);
    return { success: false, error: error.message || "Unauthorized" };
  }
}

export async function createFest(name: string) {
  try {
    await ensureSuperAdmin();

    if (!name || name.trim() === "") {
      return { success: false, error: "Event name is required" };
    }

    const newEvent = await prisma.event.create({
      data: {
        name: name.trim()
      }
    });

    // Create a default GlobalSetting record if it doesn't exist
    // Usually it exists as 'default'
    await prisma.globalSetting.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        festName: name.trim(),
        festMoto: "Celebrating Creativity"
      }
    });

    revalidatePath("/super-admin");
    revalidatePath("/");
    return { success: true, eventId: newEvent.id };
  } catch (error: any) {
    console.error("Failed to create fest:", error);
    return { success: false, error: error.message || "Failed to create event" };
  }
}

export async function createFestUser(data: {
  username: string;
  password?: string;
  role: "ADMIN" | "MANAGER" | "JUDGE";
  eventId: string;
}) {
  try {
    await ensureSuperAdmin();

    const username = data.username.trim();
    if (!username || !data.password) {
      return { success: false, error: "Username and password are required" };
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (existing) {
      return { success: false, error: "Username is already taken" };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: data.role,
        eventId: data.eventId
      }
    });

    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return { success: false, error: error.message || "Failed to create user" };
  }
}

export async function deleteFest(eventId: string) {
  try {
    await ensureSuperAdmin();
    
    await prisma.event.delete({
      where: { id: eventId }
    });

    revalidatePath("/super-admin");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete fest:", error);
    return { success: false, error: error.message || "Failed to delete event" };
  }
}

export async function deleteUser(userId: string) {
  try {
    await ensureSuperAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user && user.role === "SUPER_ADMIN") {
      return { success: false, error: "Cannot delete the Super Admin account" };
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return { success: false, error: error.message || "Failed to delete user" };
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    await ensureSuperAdmin();

    const passwordTrim = newPassword.trim();
    if (!passwordTrim) {
      return { success: false, error: "Password cannot be empty" };
    }

    const hashedPassword = await bcrypt.hash(passwordTrim, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to reset password:", error);
    return { success: false, error: error.message || "Failed to reset password" };
  }
}

export async function updateFestDomain(eventId: string, domain: string | null) {
  try {
    await ensureSuperAdmin();

    // Basic domain validation
    let sanitizedDomain = null;
    if (domain && domain.trim() !== "") {
      sanitizedDomain = domain.trim().toLowerCase();
      // Remove http:// or https:// if provided
      sanitizedDomain = sanitizedDomain.replace(/^https?:\/\//, '');
      // Remove trailing slashes
      sanitizedDomain = sanitizedDomain.replace(/\/+$/, '');
    }

    // Check if domain is already in use by another event
    if (sanitizedDomain) {
      const existing = await prisma.event.findFirst({
        where: {
          customDomain: sanitizedDomain,
          id: { not: eventId }
        }
      });
      if (existing) {
        return { success: false, error: "This domain is already mapped to another event" };
      }
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        customDomain: sanitizedDomain
      }
    });

    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update custom domain:", error);
    return { success: false, error: error.message || "Failed to update custom domain" };
  }
}
