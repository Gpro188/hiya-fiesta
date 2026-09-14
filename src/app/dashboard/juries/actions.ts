"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createJury(data: { username: string, password?: string, phone?: string, place?: string }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) {
      return { success: false, error: "Username already exists" };
    }

    await prisma.user.create({
      data: {
        username: data.username,
        password: data.password || "123", // Default password if not provided
        role: "JUDGE",
        phone: data.phone,
        place: data.place,
      }
    });

    revalidatePath("/dashboard/juries");
    revalidatePath("/dashboard/users"); // Also revalidate users if they go there
    return { success: true };
  } catch (error: any) {
    console.error("Create Jury Error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleJurySelection(eventId: string, juryId: string, isSelected: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    if (isSelected) {
      // Add to event
      await prisma.event.update({
        where: { id: eventId },
        data: {
          selectedJudges: {
            connect: { id: juryId }
          }
        }
      });
    } else {
      // Remove from event
      await prisma.event.update({
        where: { id: eventId },
        data: {
          selectedJudges: {
            disconnect: { id: juryId }
          }
        }
      });
    }

    revalidatePath("/dashboard/juries");
    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (error: any) {
    console.error("Toggle Jury Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateJury(id: string, data: { username: string, password?: string, phone?: string, place?: string }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) return { success: false, error: "Unauthorized" };

  try {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing && existing.id !== id) return { success: false, error: "Username already exists" };

    const updateData: any = {
      username: data.username,
      phone: data.phone,
      place: data.place,
    };
    if (data.password) updateData.password = data.password;

    await prisma.user.update({
      where: { id },
      data: updateData
    });

    revalidatePath("/dashboard/juries");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteJury(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) return { success: false, error: "Unauthorized" };

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/dashboard/juries");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignJudgesToProgram(programId: string, judgeIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) return { success: false, error: "Unauthorized" };

  try {
    await prisma.program.update({
      where: { id: programId },
      data: {
        judges: {
          set: judgeIds.map(id => ({ id }))
        }
      }
    });
    revalidatePath("/dashboard/juries");
    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createOrUpdateVenueLogin(data: {
  eventId: string;
  venue: string;
  username: string;
  password?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const cleanUsername = data.username.trim().toLowerCase();
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: { zone: true }
    });
    if (!event) return { success: false, error: "Event not found" };

    const zoneId = event.zoneId || event.zone?.id || null;

    // Check if username is taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: "insensitive" }
      }
    });

    // Check if a venue user already exists for this event and venue
    const existingVenueUser = await prisma.user.findFirst({
      where: {
        role: "JUDGE",
        place: data.venue,
        OR: [
          { eventId: data.eventId },
          ...(zoneId ? [{ zoneId: zoneId }] : [])
        ]
      }
    });

    if (existing && existingVenueUser && existing.id !== existingVenueUser.id) {
      return { success: false, error: `Username '${cleanUsername}' is already in use by another account.` };
    }

    if (existingVenueUser) {
      await prisma.user.update({
        where: { id: existingVenueUser.id },
        data: {
          username: cleanUsername,
          ...(data.password ? { password: data.password } : {}),
          place: data.venue,
          phone: "ACTIVE"
        }
      });
    } else {
      if (existing) {
        return { success: false, error: `Username '${cleanUsername}' is already taken.` };
      }
      await prisma.user.create({
        data: {
          username: cleanUsername,
          password: data.password || "123456",
          role: "JUDGE",
          place: data.venue,
          eventId: data.eventId,
          zoneId: zoneId,
          phone: "ACTIVE"
        }
      });
    }

    revalidatePath("/dashboard/juries");
    return { success: true };
  } catch (error: any) {
    console.error("Venue Login Error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleVenueLoginStatus(userId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: isActive ? "ACTIVE" : "INACTIVE"
      }
    });

    revalidatePath("/dashboard/juries");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleAllVenueLogins(eventId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true }
    });
    const zoneId = event?.zoneId || event?.zone?.id;

    await prisma.user.updateMany({
      where: {
        role: "JUDGE",
        place: { not: null },
        OR: [
          { eventId: eventId },
          ...(zoneId ? [{ zoneId: zoneId }] : [])
        ]
      },
      data: {
        phone: isActive ? "ACTIVE" : "INACTIVE"
      }
    });

    revalidatePath("/dashboard/juries");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteVenueLogin(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/dashboard/juries");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
