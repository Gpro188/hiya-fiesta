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
    let targetEventIds: string[] = [eventId];
    if (eventId === "collab_state_pg") {
      const stateEv = await prisma.event.findFirst({ where: { type: "STATE" }, select: { id: true } });
      const pgEv = await prisma.event.findFirst({
        where: { name: { contains: "Fadheela", mode: "insensitive" } },
        select: { id: true }
      });
      targetEventIds = [stateEv?.id, pgEv?.id].filter(Boolean) as string[];
    }

    for (const evId of targetEventIds) {
      if (isSelected) {
        await prisma.event.update({
          where: { id: evId },
          data: {
            selectedJudges: {
              connect: { id: juryId }
            }
          }
        }).catch(() => {});
      } else {
        await prisma.event.update({
          where: { id: evId },
          data: {
            selectedJudges: {
              disconnect: { id: juryId }
            }
          }
        }).catch(() => {});
      }
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
    let targetEventId = data.eventId;
    if (data.eventId === "collab_state_pg") {
      const stateEv = await prisma.event.findFirst({ where: { type: "STATE" }, select: { id: true } });
      if (stateEv) targetEventId = stateEv.id;
    }

    const event = await prisma.event.findUnique({
      where: { id: targetEventId },
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
          { eventId: targetEventId },
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
          eventId: targetEventId,
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
    let targetEventIds: string[] = [eventId];
    if (eventId === "collab_state_pg") {
      const stateEv = await prisma.event.findFirst({ where: { type: "STATE" }, select: { id: true } });
      const pgEv = await prisma.event.findFirst({ where: { name: { contains: "Fadheela", mode: "insensitive" } }, select: { id: true } });
      targetEventIds = [stateEv?.id, pgEv?.id].filter(Boolean) as string[];
    }

    const events = await prisma.event.findMany({
      where: { id: { in: targetEventIds } },
      include: { zone: true }
    });
    const zoneIds = events.map(e => e.zoneId || e.zone?.id).filter(Boolean) as string[];

    await prisma.user.updateMany({
      where: {
        role: "JUDGE",
        place: { not: null },
        OR: [
          { eventId: { in: targetEventIds } },
          ...(zoneIds.length > 0 ? [{ zoneId: { in: zoneIds } }] : [])
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

export async function assignJudgesToVenue(
  eventId: string,
  venue: string,
  judgeIds: string[],
  options?: { targetFest?: 'ALL' | 'STATE' | 'PG' }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const cleanIds = judgeIds.filter(Boolean);
    if (!venue || !venue.trim()) {
      return { success: false, error: "Please select a venue" };
    }

    let targetEventIds: string[] = [];
    if (eventId === "collab_state_pg") {
      const stateEv = await prisma.event.findFirst({ where: { type: "STATE" }, select: { id: true } });
      const pgEv = await prisma.event.findFirst({
        where: { name: { contains: "Fadheela", mode: "insensitive" } },
        select: { id: true }
      });
      if (options?.targetFest === "STATE") {
        targetEventIds = [stateEv?.id].filter(Boolean) as string[];
      } else if (options?.targetFest === "PG") {
        targetEventIds = [pgEv?.id].filter(Boolean) as string[];
      } else {
        targetEventIds = [stateEv?.id, pgEv?.id].filter(Boolean) as string[];
      }
    } else {
      const targetEvent = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, parentId: true, type: true }
      });
      if (targetEvent?.type === "STATE" && (!options?.targetFest || options.targetFest === "ALL")) {
        const pgEv = await prisma.event.findFirst({
          where: { name: { contains: "Fadheela", mode: "insensitive" } },
          select: { id: true }
        });
        targetEventIds = [targetEvent.id, pgEv?.id].filter(Boolean) as string[];
      } else {
        const progEventId = targetEvent?.parentId || eventId;
        targetEventIds = [progEventId];
      }
    }

    const venuePrograms = await prisma.program.findMany({
      where: {
        eventId: { in: targetEventIds },
        venue: { equals: venue.trim(), mode: "insensitive" }
      },
      select: { id: true }
    });

    if (venuePrograms.length === 0) {
      return { success: false, error: `No programs found scheduled at venue "${venue}".` };
    }

    for (const vp of venuePrograms) {
      await prisma.program.update({
        where: { id: vp.id },
        data: {
          judges: {
            set: cleanIds.map(id => ({ id }))
          }
        }
      }).catch(() => {});
    }

    revalidatePath("/dashboard/juries");
    revalidatePath("/dashboard/scoring");
    revalidatePath("/dashboard/schedule");
    return { success: true, count: venuePrograms.length };
  } catch (error: any) {
    console.error("assignJudgesToVenue error:", error);
    return { success: false, error: error.message || "Failed to assign juries to venue" };
  }
}
