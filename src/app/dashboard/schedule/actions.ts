"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function updateProgramSchedule(id: string, data: { venue: string | null, startTime: string | null, duration?: number, stageType?: string, judgeIds?: string[] }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = {
      venue: data.venue,
      startTime: data.startTime ? new Date(data.startTime) : null,
      duration: data.duration !== undefined ? data.duration : undefined,
      stageType: data.stageType !== undefined ? data.stageType : undefined,
    };

    if (data.judgeIds !== undefined) {
      updateData.judges = {
        set: data.judgeIds.map(id => ({ id }))
      };
    }

    await prisma.program.update({
      where: { id },
      data: updateData
    });

    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to update program schedule:", error);
    return { success: false, error: "Failed to update schedule" };
  }
}

export async function updateCandidateSlot(assignmentId: string, data: { slotNumber: number | null, scheduledTime: string | null }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.programAssignment.update({
      where: { id: assignmentId },
      data: {
        slotNumber: data.slotNumber,
        scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : null,
      }
    });

    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to update candidate slot:", error);
    return { success: false, error: "Failed to update slot" };
  }
}

export async function autoCalculateCandidateSlots(programId: string) {
  try {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { assignments: { orderBy: { createdAt: 'asc' } } }
    });

    if (!program || !program.startTime) return { success: false, error: "Program or Start Time not found" };

    const duration = program.duration || 10;
    const baseTime = new Date(program.startTime);

    const updates = program.assignments.map((assignment, index) => {
      let slotNumber, scheduledTime;
      if (program.type === "INDIVIDUAL") {
        slotNumber = index + 1;
        scheduledTime = new Date(baseTime.getTime() + (index * duration * 60000));
      } else {
        // Group/General programs happen all at once at the program's start time
        slotNumber = 1; 
        scheduledTime = baseTime;
      }
      return prisma.programAssignment.update({
        where: { id: assignment.id },
        data: { slotNumber, scheduledTime }
      });
    });

    await prisma.$transaction(updates);

    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to auto-calculate slots:", error);
    return { success: false, error: "Failed to auto-calculate slots" };
  }
}

export async function addBreak(data: { name: string, venue: string, duration: number, eventId: string }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) return { success: false, error: "Unauthorized" };

  try {
    await prisma.program.create({
      data: {
        name: data.name,
        type: "BREAK",
        venue: data.venue,
        duration: data.duration,
        stageType: "BREAK",
        eventId: data.eventId,
        categoryId: "break" // Assuming categoryId is required, we may need a generic or nullable. If it's required, we can point to the first category.
      }
    });
    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to add break:", error);
    return { success: false, error: "Failed to add break" };
  }
}

export async function autoGenerateSchedule(eventId: string, venues: string[]) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) return { success: false, error: "Unauthorized" };

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return { success: false, error: "Event not found" };

    const programs = await prisma.program.findMany({ 
      where: { 
        OR: [
          { eventId: eventId },
          ...(event.parentId ? [{ eventId: event.parentId }] : [])
        ],
        type: { not: "BREAK" } 
      },
      orderBy: { name: 'asc' }
    });
    
    let venueTimers: Record<string, Date> = {};
    const baseDate = new Date();
    baseDate.setHours(9, 0, 0, 0);
    
    if (venues.length === 0) venues.push("Main Stage");
    venues.forEach(v => { venueTimers[v] = new Date(baseDate.getTime()); });

    let vIdx = 0;
    for (const prog of programs) {
      if (prog.venue) continue; 
      
      const targetVenue = venues[vIdx % venues.length];
      const startTime = new Date(venueTimers[targetVenue].getTime());
      
      await prisma.program.update({
        where: { id: prog.id },
        data: {
          venue: targetVenue,
          startTime: startTime
        }
      });
      
      venueTimers[targetVenue] = new Date(startTime.getTime() + ((prog.duration || 10) * 60 * 1000));
      vIdx++;
    }
    
    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to auto-schedule:", error);
    return { success: false, error: "Failed to auto-schedule" };
  }
}

export async function shiftSchedule(eventId: string, venue: string, minutes: number) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) return { success: false, error: "Unauthorized" };

  try {
    const programs = await prisma.program.findMany({ 
      where: { venue, startTime: { not: null }, OR: [{ eventId }, { event: { subEvents: { some: { id: eventId } } } }] }
    });
    
    for (const prog of programs) {
      if (!prog.startTime) continue;
      const newTime = new Date(prog.startTime.getTime() + (minutes * 60 * 1000));
      await prisma.program.update({
        where: { id: prog.id },
        data: { startTime: newTime }
      });
    }
    
    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (error) {
    console.error("Failed to shift schedule:", error);
    return { success: false, error: "Failed to shift schedule" };
  }
}

export async function publishMasterScheduleToAllZones(sourceEventId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    let masterEvent: any = null;
    if (sourceEventId && sourceEventId !== "default") {
      masterEvent = await prisma.event.findUnique({
        where: { id: sourceEventId },
        include: { programs: { include: { category: true } }, categories: true }
      });
    }

    if (!masterEvent) {
      masterEvent = await prisma.event.findFirst({
        where: { OR: [{ parentId: null }, { type: "STATE" }] },
        include: { programs: { include: { category: true } }, categories: true }
      });
    }

    if (!masterEvent) {
      return { success: false, error: "Master Event not found." };
    }

    if (masterEvent.programs.length === 0) {
      return { success: false, error: "No programs in Master Schedule to publish." };
    }

    const zones = await prisma.event.findMany({
      where: {
        OR: [
          { parentId: masterEvent.id },
          { type: "ZONE" }
        ],
        NOT: { id: masterEvent.id }
      },
      include: {
        categories: true,
        programs: {
          include: { assignments: true }
        }
      }
    });

    if (zones.length === 0) {
      return { success: false, error: "No Zone Events found to receive the Master Schedule." };
    }

    let totalSynced = 0;

    for (const zone of zones) {
      // Build category mapping
      const zoneCatMap = new Map<string, string>();
      for (const cat of zone.categories) {
        zoneCatMap.set(cat.name.trim().toUpperCase(), cat.id);
      }

      // Ensure all master categories exist in zone
      for (const mCat of masterEvent.categories) {
        const key = mCat.name.trim().toUpperCase();
        if (!zoneCatMap.has(key)) {
          const newCat = await prisma.category.create({
            data: {
              name: mCat.name,
              chestNumberOffset: mCat.chestNumberOffset,
              eventId: zone.id
            }
          });
          zoneCatMap.set(key, newCat.id);
        }
      }

      for (const mProg of masterEvent.programs) {
        const mCatName = mProg.category?.name?.trim().toUpperCase();
        const targetCatId = mCatName ? zoneCatMap.get(mCatName) : null;

        // Try to match existing program in zone by programCode, or by name and category
        const existingProg = zone.programs.find(p => {
          if (mProg.programCode && p.programCode) {
            return p.programCode.trim().toLowerCase() === mProg.programCode.trim().toLowerCase();
          }
          return p.name.trim().toLowerCase() === mProg.name.trim().toLowerCase();
        });

        if (existingProg) {
          // Update zone program with master schedule attributes
          await prisma.program.update({
            where: { id: existingProg.id },
            data: {
              venue: mProg.venue,
              startTime: mProg.startTime,
              duration: mProg.duration,
              stageType: mProg.stageType,
              type: mProg.type,
              programCode: mProg.programCode || existingProg.programCode,
              categoryId: targetCatId || existingProg.categoryId,
            }
          });

          // If program has startTime and assignments, sync candidate slots
          if (mProg.startTime && existingProg.assignments && existingProg.assignments.length > 0) {
            const baseTime = new Date(mProg.startTime);
            const duration = mProg.duration || 10;
            const updates = existingProg.assignments.map((assignment: any, index: number) => {
              let slotNumber, scheduledTime;
              if (mProg.type === "INDIVIDUAL") {
                slotNumber = index + 1;
                scheduledTime = new Date(baseTime.getTime() + (index * duration * 60000));
              } else {
                slotNumber = 1;
                scheduledTime = baseTime;
              }
              return prisma.programAssignment.update({
                where: { id: assignment.id },
                data: { slotNumber, scheduledTime }
              });
            });
            await prisma.$transaction(updates);
          }
          totalSynced++;
        } else {
          // Create new program in zone with master schedule attributes
          await prisma.program.create({
            data: {
              programCode: mProg.programCode,
              name: mProg.name,
              type: mProg.type,
              categoryId: targetCatId,
              eventId: zone.id,
              venue: mProg.venue,
              startTime: mProg.startTime,
              duration: mProg.duration,
              stageType: mProg.stageType,
              candidateLimitPerTeam: mProg.candidateLimitPerTeam,
              description: mProg.description,
              evaluationCriteria: mProg.evaluationCriteria
            }
          });
          totalSynced++;
        }
      }
    }

    // Mark master event and zones as SCHEDULE_PUBLISHED
    await prisma.event.update({
      where: { id: masterEvent.id },
      data: { statusOverride: "SCHEDULE_PUBLISHED" }
    });
    await prisma.event.updateMany({
      where: { id: { in: zones.map(z => z.id) } },
      data: { statusOverride: "SCHEDULE_PUBLISHED" }
    });

    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/programs");
    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/print/id-cards");
    return { success: true, count: totalSynced, zoneCount: zones.length };
  } catch (error: any) {
    console.error("Failed to publish master schedule:", error);
    return { success: false, error: error.message || "Failed to publish master schedule." };
  }
}

export async function publishZoneSchedule(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        programs: {
          include: {
            assignments: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    if (!event) return { success: false, error: "Event not found" };

    let totalCalculated = 0;
    const updates: any[] = [];

    // Calculate slots and schedule times for all programs with start times
    for (const prog of event.programs) {
      if (prog.startTime && prog.assignments.length > 0) {
        const baseTime = new Date(prog.startTime);
        const duration = prog.duration || 10;

        prog.assignments.forEach((assignment, index) => {
          let slotNumber = 1;
          let scheduledTime = baseTime;
          if (prog.type === "INDIVIDUAL") {
            slotNumber = index + 1;
            scheduledTime = new Date(baseTime.getTime() + (index * duration * 60000));
          }
          updates.push(
            prisma.programAssignment.update({
              where: { id: assignment.id },
              data: { slotNumber, scheduledTime }
            })
          );
          totalCalculated++;
        });
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    // Mark event statusOverride or custom flag indicating schedule is published
    await prisma.event.update({
      where: { id: eventId },
      data: {
        statusOverride: "SCHEDULE_PUBLISHED"
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/print/id-cards");

    return { success: true, count: totalCalculated, programCount: event.programs.length };
  } catch (error: any) {
    console.error("Failed to publish zone schedule:", error);
    return { success: false, error: error.message || "Failed to publish zone schedule" };
  }
}

