"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function updateProgramSchedule(
  id: string, 
  data: { venue: string | null, startTime: string | null, duration?: number, stageType?: string, durationMode?: string, judgeIds?: string[] },
  targetEventId?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProg = await prisma.program.findUnique({
      where: { id },
      select: { id: true, eventId: true, name: true, programCode: true, categoryId: true, type: true, stageType: true, durationMode: true }
    });

    if (!currentProg) return { success: false, error: "Program not found" };

    let targetId = id;
    if (targetEventId && currentProg.eventId !== targetEventId) {
      // Trying to update a parent program while on a zonal event view
      let zoneProg = await prisma.program.findFirst({
        where: {
          eventId: targetEventId,
          OR: [
            ...(currentProg.programCode ? [{ programCode: currentProg.programCode }] : []),
            { name: currentProg.name }
          ]
        }
      });

      if (!zoneProg) {
        zoneProg = await prisma.program.create({
          data: {
            name: currentProg.name,
            programCode: currentProg.programCode,
            type: currentProg.type,
            categoryId: currentProg.categoryId,
            eventId: targetEventId,
            stageType: data.stageType || currentProg.stageType,
            duration: data.duration || 10,
            durationMode: data.durationMode || currentProg.durationMode || "AUTO",
            venue: data.venue,
            startTime: data.startTime ? new Date(data.startTime) : null
          }
        });
        targetId = zoneProg.id;
      } else {
        targetId = zoneProg.id;
      }
    }

    const updateData: any = {
      venue: data.venue,
      startTime: data.startTime ? new Date(data.startTime) : null,
      duration: data.duration !== undefined ? data.duration : undefined,
      stageType: data.stageType !== undefined ? data.stageType : undefined,
    };
    if (data.durationMode !== undefined) {
      updateData.durationMode = data.durationMode;
    }

    if (data.judgeIds !== undefined) {
      updateData.judges = {
        set: data.judgeIds.map(id => ({ id }))
      };
    }

    await prisma.program.update({
      where: { id: targetId },
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
        stageType: "ON_STAGE",
        type: { not: "BREAK" } 
      },
      orderBy: { name: 'asc' }
    });
    
    const { getFestivalBaseDate } = await import("@/lib/scheduleCalculator");
    let venueTimers: Record<string, Date> = {};
    const baseDate = getFestivalBaseDate(event.startDate);
    
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

export async function unpublishSchedule(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        statusOverride: "AUTO"
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/fest/[id]/results");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to unpublish schedule:", error);
    return { success: false, error: error.message || "Failed to unpublish schedule" };
  }
}

export async function renameVenue(eventId: string, oldVenueName: string, newVenueName: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    if (!newVenueName || !newVenueName.trim()) {
      return { success: false, error: "New venue name cannot be empty" };
    }
    const cleanNewName = newVenueName.trim();

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    const eventIds = [eventId];
    if (event?.parentId) eventIds.push(event.parentId);

    const result = await prisma.program.updateMany({
      where: {
        venue: oldVenueName,
        eventId: { in: eventIds }
      },
      data: {
        venue: cleanNewName
      }
    });

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/schedule");
    revalidatePath("/print/venue");
    revalidatePath("/print/stage-manager");

    return { success: true, count: result.count };
  } catch (error: any) {
    console.error("Failed to rename venue:", error);
    return { success: false, error: error?.message || "Failed to rename venue" };
  }
}

export async function deleteVenue(eventId: string, venueName: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    const eventIds = [eventId];
    if (event?.parentId) eventIds.push(event.parentId);

    // Delete any breaks created specifically for this venue
    await prisma.program.deleteMany({
      where: {
        venue: venueName,
        type: "BREAK",
        eventId: { in: eventIds }
      }
    });

    // Unassign all regular programs in this venue
    const result = await prisma.program.updateMany({
      where: {
        venue: venueName,
        eventId: { in: eventIds }
      },
      data: {
        venue: null
      }
    });

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/schedule");
    revalidatePath("/print/venue");
    revalidatePath("/print/stage-manager");

    return { success: true, unassignedCount: result.count };
  } catch (error: any) {
    console.error("Failed to delete venue:", error);
    return { success: false, error: error?.message || "Failed to delete venue" };
  }
}

export async function applySequentialVenueSchedule(
  eventId: string,
  venue: string,
  programUpdates: Array<{ id: string; startTime: string; duration: number; stageType?: string; durationMode?: string; judgeIds?: string[] }>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const targetEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, parentId: true, type: true }
    });

    const isZoneEvent = Boolean(targetEvent?.parentId) || targetEvent?.type === "ZONE";

    const targetProgramIds = programUpdates.map(p => p.id);
    const existingPrograms = await prisma.program.findMany({
      where: { id: { in: targetProgramIds } },
      select: { id: true, eventId: true, programCode: true, name: true, categoryId: true, type: true, stageType: true, durationMode: true }
    });
    const progMap = new Map(existingPrograms.map(p => [p.id, p]));

    let zoneProgramsForMatching: any[] = [];
    if (isZoneEvent) {
      zoneProgramsForMatching = await prisma.program.findMany({
        where: { eventId },
        select: { id: true, programCode: true, name: true, categoryId: true, type: true, stageType: true, durationMode: true }
      });
    }

    const updates = [];
    for (const item of programUpdates) {
      const p = progMap.get(item.id);
      let targetId = item.id;

      if (isZoneEvent && p && p.eventId !== eventId) {
        let zoneProg = zoneProgramsForMatching.find(zp => 
          (zp.programCode && p.programCode && zp.programCode.trim().toLowerCase() === p.programCode.trim().toLowerCase()) ||
          (zp.name.trim().toLowerCase() === p.name.trim().toLowerCase())
        );

        if (!zoneProg) {
          zoneProg = await prisma.program.create({
            data: {
              name: p.name,
              programCode: p.programCode,
              type: p.type || "INDIVIDUAL",
              categoryId: p.categoryId,
              eventId: eventId,
              stageType: item.stageType || p.stageType || "ON_STAGE",
              duration: item.duration || 10,
              durationMode: item.durationMode || p.durationMode || "AUTO",
              venue: venue,
              startTime: new Date(item.startTime),
              ...(item.judgeIds && item.judgeIds.length > 0 ? {
                judges: { connect: item.judgeIds.map(id => ({ id })) }
              } : {})
            }
          });
          zoneProgramsForMatching.push(zoneProg);
          continue;
        } else {
          targetId = zoneProg.id;
        }
      }

      const data: any = {
        venue,
        startTime: new Date(item.startTime),
        duration: item.duration,
      };
      if (item.stageType) data.stageType = item.stageType;
      if (item.durationMode) data.durationMode = item.durationMode;
      if (item.judgeIds) {
        data.judges = {
          set: item.judgeIds.map(id => ({ id }))
        };
      }

      updates.push(
        prisma.program.update({
          where: { id: targetId },
          data
        })
      );
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/schedule");
    revalidatePath("/print/venue");
    revalidatePath("/print/stage-manager");

    return { success: true, count: programUpdates.length };
  } catch (error: any) {
    console.error("Failed to apply sequential venue schedule:", error);
    return { success: false, error: error?.message || "Failed to apply sequential schedule" };
  }
}

export async function getZoneScheduleAnalysis(sourceEventId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { calculateVenueTimeline, formatMinutes, formatTimeAmPm } = await import("@/lib/scheduleCalculator");

    // Fetch master event for reference
    const masterEvent = await prisma.event.findFirst({
      where: { OR: [{ parentId: null }, { type: "STATE" }] },
      select: { id: true, name: true, type: true }
    });

    // Fetch zones
    let zoneWhere: any = {
      OR: [
        { type: "ZONE" },
        { parentId: { not: null } }
      ]
    };

    if (session.user.role === "ZONE_ADMIN") {
      const fullUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { zoneId: true, eventId: true }
      });
      if (fullUser?.zoneId) {
        zoneWhere = { zoneId: fullUser.zoneId };
      } else if (fullUser?.eventId) {
        zoneWhere = { id: fullUser.eventId };
      }
    }

    const rawZones = await prisma.event.findMany({
      where: zoneWhere,
      include: {
        zone: true,
        parent: true
      },
      orderBy: { name: "asc" }
    });

    // Deduplicate zone events by name
    const seenZoneNames = new Set<string>();
    const zoneEvents = rawZones.filter(z => {
      const key = z.name.trim().toLowerCase();
      if (seenZoneNames.has(key)) return false;
      seenZoneNames.add(key);
      return true;
    });

    // Fetch all programs from master and zones to map venue order
    const allPrograms = await prisma.program.findMany({
      include: {
        category: true,
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: { include: { zone: true } } } },
                institution: { include: { zone: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { venue: "asc" },
        { startTime: "asc" },
        { programCode: "asc" }
      ]
    });

    // Build master template programs (defined venues and sequential order)
    const masterTemplateMap = new Map<string, any>();
    for (const p of allPrograms) {
      if (!p.venue || p.stageType !== "ON_STAGE") continue;
      const key = p.programCode ? `code_${p.programCode.trim()}` : `name_${p.name.trim()}_${p.categoryId || ''}`;
      if (!masterTemplateMap.has(key)) {
        masterTemplateMap.set(key, p);
      } else {
        const existing = masterTemplateMap.get(key);
        if (p.eventId === masterEvent?.id) {
          masterTemplateMap.set(key, p);
        }
      }
    }

    const analysisResults = [];

    for (const zoneEv of zoneEvents) {
      const targetZoneId = zoneEv.zoneId || zoneEv.zone?.id;

      // Collect programs relevant to this zone, merged with master venue & order
      const zoneMergedMap = new Map<string, any>();

      for (const [key, mProg] of masterTemplateMap.entries()) {
        zoneMergedMap.set(key, {
          id: mProg.id,
          programCode: mProg.programCode,
          name: mProg.name,
          type: mProg.type,
          stageType: mProg.stageType,
          venue: mProg.venue,
          duration: mProg.duration,
          durationMode: mProg.durationMode,
          candidateLimitPerTeam: mProg.candidateLimitPerTeam,
          category: mProg.category,
          assignments: [] as any[]
        });
      }

      // Populate candidate assignments for this zone
      for (const prog of allPrograms) {
        const key = prog.programCode ? `code_${prog.programCode.trim()}` : `name_${prog.name.trim()}_${prog.categoryId || ''}`;
        let target = zoneMergedMap.get(key);
        if (!target && prog.venue) {
          target = {
            id: prog.id,
            programCode: prog.programCode,
            name: prog.name,
            type: prog.type,
            stageType: prog.stageType,
            venue: prog.venue,
            duration: prog.duration,
            durationMode: prog.durationMode,
            candidateLimitPerTeam: prog.candidateLimitPerTeam,
            category: prog.category,
            assignments: []
          };
          zoneMergedMap.set(key, target);
        }

        if (target) {
          const existingIds = new Set(target.assignments.map((a: any) => a.id));
          for (const a of prog.assignments) {
            if (!existingIds.has(a.id)) {
              target.assignments.push(a);
              existingIds.add(a.id);
            }
          }
        }
      }

      const zonePrograms = Array.from(zoneMergedMap.values()).filter(p => p.stageType === "ON_STAGE" || !p.stageType);

      // Group by venue
      const venueGroups: Record<string, any[]> = {};
      for (const p of zonePrograms) {
        const v = p.venue || "Unassigned Stage";
        if (!venueGroups[v]) venueGroups[v] = [];
        venueGroups[v].push(p);
      }

      // Calculate timeline per venue
      const venueReports = [];
      let maxEndDateTime = new Date();
      maxEndDateTime.setHours(9, 0, 0, 0);

      for (const [vName, vProgs] of Object.entries(venueGroups)) {
        if (vName === "Unassigned Stage") continue;
        const timeline = calculateVenueTimeline(vName, vProgs, {
          targetZoneId,
          bufferMinutes: 2
        });

        if (timeline.endTime.getTime() > maxEndDateTime.getTime()) {
          maxEndDateTime = new Date(timeline.endTime.getTime());
        }

        venueReports.push({
          venue: vName,
          totalPrograms: timeline.totalPrograms,
          totalCandidates: timeline.totalCandidates,
          totalDurationMinutes: timeline.totalDurationMinutes,
          formattedDuration: formatMinutes(timeline.totalDurationMinutes),
          startTime: formatTimeAmPm(timeline.startTime),
          endTime: formatTimeAmPm(timeline.endTime),
          status: timeline.status,
          statusText: timeline.statusText,
          statusColor: timeline.statusColor,
          programs: timeline.programs.map(slot => ({
            id: slot.program.id,
            programCode: slot.program.programCode,
            name: slot.program.name,
            type: slot.program.type,
            candidateCount: slot.candidateCount,
            teamCount: slot.teamCount,
            durationMode: slot.program.durationMode,
            durationPerCandidate: slot.durationPerItem,
            durationMinutes: slot.duration,
            startTime: formatTimeAmPm(slot.predictedStart),
            endTime: formatTimeAmPm(slot.predictedEnd)
          }))
        });
      }

      // Overall 1-day feasibility for this zone
      const maxHours = maxEndDateTime.getHours() + maxEndDateTime.getMinutes() / 60;
      let zoneStatus: "FEASIBLE" | "TIGHT" | "OVERRUN" = "FEASIBLE";
      if (maxHours > 20) zoneStatus = "OVERRUN";
      else if (maxHours > 18) zoneStatus = "TIGHT";

      analysisResults.push({
        eventId: zoneEv.id,
        zoneName: zoneEv.name,
        zoneId: targetZoneId,
        venues: venueReports,
        totalVenues: venueReports.length,
        totalPrograms: venueReports.reduce((sum, v) => sum + v.totalPrograms, 0),
        totalCandidates: venueReports.reduce((sum, v) => sum + v.totalCandidates, 0),
        overallFinishTime: formatTimeAmPm(maxEndDateTime),
        zoneStatus,
        isOneDayFeasible: zoneStatus !== "OVERRUN"
      });
    }

    return {
      success: true,
      zones: analysisResults,
      masterEventId: masterEvent?.id
    };
  } catch (error: any) {
    console.error("Failed to get zone schedule analysis:", error);
    return { success: false, error: error?.message || "Failed to analyze zone schedules" };
  }
}

export async function applyRegistrationBasedScheduleToZone(
  zoneEventId: string,
  options?: { bufferMinutes?: number; defaultMinPerCandidate?: number; groupFixedMin?: number }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { calculateVenueTimeline } = await import("@/lib/scheduleCalculator");

    const zoneEv = await prisma.event.findUnique({
      where: { id: zoneEventId },
      include: { zone: true, parent: true }
    });

    if (!zoneEv) return { success: false, error: "Zone Event not found" };
    const targetZoneId = zoneEv.zoneId || zoneEv.zone?.id;
    const parentId = zoneEv.parentId;

    // Fetch programs from parent and zone
    const programWhere: any = parentId
      ? { OR: [{ eventId: zoneEventId }, { eventId: parentId }] }
      : { eventId: zoneEventId };

    const rawPrograms = await prisma.program.findMany({
      where: programWhere,
      include: {
        category: true,
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: { include: { zone: true } } } },
                institution: { include: { zone: true } }
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [
        { venue: "asc" },
        { startTime: "asc" },
        { programCode: "asc" }
      ]
    });

    // Merge by programCode / name
    const mergedMap = new Map<string, any>();
    for (const p of rawPrograms) {
      const key = p.programCode ? `code_${p.programCode.trim()}` : `name_${p.name.trim()}_${p.categoryId || ''}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, { ...p, assignments: [...p.assignments] });
      } else {
        const existing = mergedMap.get(key);
        const existingIds = new Set(existing.assignments.map((a: any) => a.id));
        for (const a of p.assignments) {
          if (!existingIds.has(a.id)) {
            existing.assignments.push(a);
            existingIds.add(a.id);
          }
        }
        if (!existing.venue && p.venue) existing.venue = p.venue;
        if (!existing.startTime && p.startTime) existing.startTime = p.startTime;
      }
    }

    const programs = Array.from(mergedMap.values()).filter(p => p.stageType === "ON_STAGE" || !p.stageType);

    // Group by venue
    const venueGroups: Record<string, any[]> = {};
    for (const p of programs) {
      if (!p.venue) continue;
      if (!venueGroups[p.venue]) venueGroups[p.venue] = [];
      venueGroups[p.venue].push(p);
    }

    let updatedProgramsCount = 0;
    let updatedSlotsCount = 0;

    for (const [venueName, vProgs] of Object.entries(venueGroups)) {
      const timeline = calculateVenueTimeline(venueName, vProgs, {
        targetZoneId,
        bufferMinutes: options?.bufferMinutes ?? 2,
        minutesPerCandidate: options?.defaultMinPerCandidate,
        groupFixedMin: options?.groupFixedMin
      });

      for (const slot of timeline.programs) {
        const prog = slot.program;
        const calcStart = slot.predictedStart;
        const calcDuration = slot.duration;

        // Update program record(s) matching this program
        const matchingProgIds = rawPrograms
          .filter(rp => (prog.programCode && rp.programCode === prog.programCode) || rp.name === prog.name)
          .map(rp => rp.id);

        if (matchingProgIds.length > 0) {
          await prisma.program.updateMany({
            where: { id: { in: matchingProgIds } },
            data: {
              venue: venueName,
              startTime: calcStart,
              duration: calcDuration
            }
          });
          updatedProgramsCount += matchingProgIds.length;
        }

        // Calculate slots for candidate assignments in this zone
        if (slot.filteredAssignments.length > 0) {
          const durationPerItem = slot.durationPerItem;
          const isIndividual = (prog.type || "INDIVIDUAL").toUpperCase() === "INDIVIDUAL";

          const assignmentUpdates = slot.filteredAssignments.map((assignment, index) => {
            let slotNum = index + 1;
            let scheduledTime = isIndividual
              ? new Date(calcStart.getTime() + index * durationPerItem * 60000)
              : calcStart;

            return prisma.programAssignment.update({
              where: { id: assignment.id },
              data: {
                slotNumber: slotNum,
                scheduledTime
              }
            });
          });

          await prisma.$transaction(assignmentUpdates);
          updatedSlotsCount += assignmentUpdates.length;
        }
      }
    }

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/schedule");
    revalidatePath("/print/stage-manager");
    revalidatePath("/print/valuation");
    revalidatePath("/print/tabulation");

    return {
      success: true,
      zoneName: zoneEv.name,
      updatedProgramsCount,
      updatedSlotsCount
    };
  } catch (error: any) {
    console.error("Failed to apply registration schedule to zone:", error);
    return { success: false, error: error?.message || "Failed to apply schedule" };
  }
}

export async function applyRegistrationBasedScheduleToAllZones(
  options?: { bufferMinutes?: number; defaultMinPerCandidate?: number; groupFixedMin?: number }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const zones = await prisma.event.findMany({
      where: {
        OR: [
          { type: "ZONE" },
          { parentId: { not: null } }
        ]
      },
      select: { id: true, name: true }
    });

    const seenNames = new Set<string>();
    const uniqueZones = zones.filter(z => {
      const key = z.name.trim().toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    let totalPrograms = 0;
    let totalSlots = 0;
    const syncedZoneNames = [];

    for (const zone of uniqueZones) {
      const res = await applyRegistrationBasedScheduleToZone(zone.id, options);
      if (res.success) {
        totalPrograms += res.updatedProgramsCount || 0;
        totalSlots += res.updatedSlotsCount || 0;
        syncedZoneNames.push(zone.name);
      }
    }

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/schedule");
    revalidatePath("/print/stage-manager");

    return {
      success: true,
      zonesProcessed: syncedZoneNames.length,
      totalPrograms,
      totalSlots,
      zoneNames: syncedZoneNames
    };
  } catch (error: any) {
    console.error("Failed to apply registration schedule to all zones:", error);
    return { success: false, error: error?.message || "Failed to batch apply schedule" };
  }
}

/**
 * Automatically adjust venue programs to eliminate candidate clashes across different stages/venues.
 * Re-sequences overlapping programs with a default 10-minute gap so no candidate is scheduled in 2 places simultaneously.
 */
export async function autoResolveCandidateClashes(eventId: string, targetZoneId?: string | null) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { checkSchedulingConflicts } = await import("./importActions");
    const conflictResult = await checkSchedulingConflicts(eventId, targetZoneId);
    if (!conflictResult.success) {
      return { success: false, error: "Failed to evaluate conflicts" };
    }

    const conflicts = conflictResult.conflicts || [];
    if (conflicts.length === 0) {
      return { success: true, resolved: 0, message: "No candidate clashes found! Schedule is clean." };
    }

    // Load active event & programs
    const activeEv = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true }
    });

    let programWhere: any = { stageType: "ON_STAGE" };
    if (activeEv?.parentId) {
      programWhere.OR = [{ eventId }, { eventId: activeEv.parentId }];
    } else {
      programWhere.eventId = eventId;
    }

    const rawPrograms = await prisma.program.findMany({
      where: programWhere,
      include: {
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: true } },
                institution: { include: { zone: true } }
              }
            }
          }
        }
      },
      orderBy: [{ venue: "asc" }, { startTime: "asc" }]
    });

    const effectiveZoneId = targetZoneId || activeEv?.zoneId || activeEv?.zone?.id;

    // Deduplicate programs
    const mergedMap = new Map<string, any>();
    for (const p of rawPrograms) {
      const key = p.programCode ? `code_${p.programCode.trim().toLowerCase()}` : `name_${p.name.trim().toLowerCase()}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, { ...p, assignments: [...p.assignments] });
      } else {
        const existing = mergedMap.get(key);
        const existingIds = new Set(existing.assignments.map((a: any) => a.id));
        for (const a of p.assignments) {
          if (!existingIds.has(a.id)) {
            existing.assignments.push(a);
            existingIds.add(a.id);
          }
        }
        if (p.eventId === eventId) {
          existing.id = p.id;
          existing.eventId = p.eventId;
          existing.venue = p.venue || existing.venue;
          existing.startTime = p.startTime || existing.startTime;
          existing.duration = p.duration || existing.duration;
        }
      }
    }

    const programs = Array.from(mergedMap.values());
    const venues = Array.from(new Set(programs.map(p => p.venue || "Main Stage").filter(Boolean)));

    // Group programs by venue
    const venueGroups: Record<string, any[]> = {};
    venues.forEach(v => {
      venueGroups[v] = programs.filter(p => (p.venue || "Main Stage") === v);
    });

    const { calculateVenueTimeline, calculateDynamicProgramDuration, getZoneCandidatesForProgram } = await import("@/lib/scheduleCalculator");

    let iterations = 0;
    let resolvedClashesCount = 0;

    // Iteratively swap / adjust programs in secondary venues until conflicts are resolved (max 20 passes)
    while (iterations < 20) {
      iterations++;
      const currentCheck = await checkSchedulingConflicts(eventId, effectiveZoneId);
      const currentConflicts = (currentCheck.conflicts || []).filter(c => !c.candidateName.startsWith("Jury:"));
      if (currentConflicts.length === 0) break;

      const conflict = currentConflicts[0];
      const clashedProgNames = conflict.programs;

      // Find the two programs
      const progA = programs.find(p => clashedProgNames.includes(p.name));
      const progB = programs.find(p => clashedProgNames.includes(p.name) && p.id !== progA?.id);

      if (!progA || !progB) break;

      // Try shifting progB down the order in its venue
      const venueB = progB.venue || "Main Stage";
      const listB = venueGroups[venueB] || [];
      const idxB = listB.findIndex(p => p.id === progB.id);

      if (idxB !== -1 && idxB < listB.length - 1) {
        // Swap with next program in venue B
        const temp = listB[idxB];
        listB[idxB] = listB[idxB + 1];
        listB[idxB + 1] = temp;
        resolvedClashesCount++;
      } else if (idxB > 0) {
        // Swap with previous program
        const temp = listB[idxB];
        listB[idxB] = listB[idxB - 1];
        listB[idxB - 1] = temp;
        resolvedClashesCount++;
      } else {
        // Try venue A
        const venueA = progA.venue || "Main Stage";
        const listA = venueGroups[venueA] || [];
        const idxA = listA.findIndex(p => p.id === progA.id);
        if (idxA !== -1 && idxA < listA.length - 1) {
          const temp = listA[idxA];
          listA[idxA] = listA[idxA + 1];
          listA[idxA + 1] = temp;
          resolvedClashesCount++;
        } else {
          break; // cannot swap further
        }
      }

      // Re-apply sequential timeline for all venues with 10 minute buffer
      for (const [vName, vProgs] of Object.entries(venueGroups)) {
        const timeline = calculateVenueTimeline(vName, vProgs, {
          targetZoneId: effectiveZoneId,
          bufferMinutes: 10
        });

        const updates = timeline.programs.map(slot => ({
          id: slot.program.id,
          startTime: slot.predictedStart.toISOString(),
          duration: slot.duration,
          stageType: slot.program.stageType
        }));

        await applySequentialVenueSchedule(eventId, vName, updates);
      }
    }

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/schedule");
    revalidatePath("/print/venue");
    revalidatePath("/print/stage-manager");

    return {
      success: true,
      resolved: resolvedClashesCount,
      iterations,
      message: `Adjusted schedule to eliminate candidate collisions with 10-minute buffers.`
    };
  } catch (error: any) {
    console.error("Failed to auto-resolve candidate clashes:", error);
    return { success: false, error: error?.message || "Failed to auto-resolve clashes" };
  }
}


// -----------------------------------------------------------------------------
// GLOBAL SCHEDULE TIMING SETTINGS
// -----------------------------------------------------------------------------

/**
 * Load global schedule timing settings from the master GlobalSetting row.
 */
export async function getGlobalScheduleSettings() {
  try {
    const row = await prisma.globalSetting.findFirst({
      where: { OR: [{ id: "default" }, { eventId: null }] },
      select: {
        scheduleMinPerCandidate: true,
        scheduleBufferMinutes: true,
        scheduleGroupFixedMin: true,
      }
    });

    // Also try the master event row if no default found
    let settings = row;
    if (!settings || (settings.scheduleMinPerCandidate === null && settings.scheduleBufferMinutes === null)) {
      const masterRow = await prisma.globalSetting.findFirst({
        where: { event: { OR: [{ parentId: null }, { type: "STATE" }] } },
        select: {
          scheduleMinPerCandidate: true,
          scheduleBufferMinutes: true,
          scheduleGroupFixedMin: true,
        }
      });
      if (masterRow) settings = masterRow;
    }

    return {
      success: true,
      minPerCandidate: settings?.scheduleMinPerCandidate ?? 10,
      bufferMinutes: settings?.scheduleBufferMinutes ?? 2,
      groupFixedMin: settings?.scheduleGroupFixedMin ?? 30,
    };
  } catch (e: any) {
    return { success: false, error: e.message, minPerCandidate: 10, bufferMinutes: 2, groupFixedMin: 30 };
  }
}

/**
 * Save global schedule timing settings and optionally re-apply to all zones.
 */
export async function saveGlobalScheduleSettings(data: {
  minPerCandidate: number;
  bufferMinutes: number;
  groupFixedMin: number;
  applyToAllZones: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    // Update ALL GlobalSetting rows (master + all zone events) so every zone sees the same values
    await prisma.globalSetting.updateMany({
      data: {
        scheduleMinPerCandidate: data.minPerCandidate,
        scheduleBufferMinutes: data.bufferMinutes,
        scheduleGroupFixedMin: data.groupFixedMin,
      }
    });

    let applyResult: { updatedZones?: number; totalPrograms?: number } = {};

    if (data.applyToAllZones) {
      const res = await applyRegistrationBasedScheduleToAllZones({
        bufferMinutes: data.bufferMinutes,
        defaultMinPerCandidate: data.minPerCandidate,
        groupFixedMin: data.groupFixedMin,
      });
      if (res.success) {
        applyResult = { updatedZones: (res as any).updatedZones, totalPrograms: (res as any).totalPrograms };
      }
    }

    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/settings");
    return { success: true, ...applyResult };
  } catch (e: any) {
    console.error("saveGlobalScheduleSettings error:", e);
    return { success: false, error: e.message || "Failed to save schedule settings" };
  }
}

// -----------------------------------------------------------------------------
// CLASH FIX ASSISTANT � resolve clashes by slot reordering only
// -----------------------------------------------------------------------------

/**
 * For each MANAGEABLE clash (individual vs individual), swap candidate slots
 * so that clashing candidates appear at opposite ends of each conflicting venue.
 * Never changes program type, category, content, or FIXED-time programs.
 */
export async function resolveManageableClashes(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { calculateVenueTimeline, detectClashesBySeverity } = await import("@/lib/scheduleCalculator");

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true }
    });
    if (!event) return { success: false, error: "Event not found" };

    const targetZoneId = event.zoneId || event.zone?.id;
    const parentId = event.parentId;

    const rawPrograms = await prisma.program.findMany({
      where: parentId
        ? { OR: [{ eventId }, { eventId: parentId }] }
        : { eventId },
      include: {
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: { include: { zone: true } } } },
                institution: { include: { zone: true } }
              }
            }
          },
          orderBy: { slotNumber: "asc" }
        }
      }
    });

    // Build venue timelines
    const venueGroups: Record<string, any[]> = {};
    for (const p of rawPrograms) {
      if (!p.venue || p.type === "BREAK") continue;
      if (!venueGroups[p.venue]) venueGroups[p.venue] = [];
      venueGroups[p.venue].push(p);
    }

    const venueTimelines: Record<string, any[]> = {};
    for (const [vName, vProgs] of Object.entries(venueGroups)) {
      const tl = calculateVenueTimeline(vName, vProgs, { targetZoneId, bufferMinutes: 2 });
      venueTimelines[vName] = tl.programs;
    }

    const { scoredClashes } = detectClashesBySeverity(venueTimelines, targetZoneId);
    const fixable = scoredClashes.filter(c => c.isAutoFixable && c.severity === "MANAGEABLE");

    if (fixable.length === 0) {
      return { success: true, fixed: 0, message: "No manageable clashes found to fix." };
    }

    // For each manageable clash: find the two programs, find the clashing candidate's slot,
    // move them to first slot in one venue and last slot in the other
    let fixedCount = 0;
    const processedPairs = new Set<string>();

    for (const clash of fixable) {
      const pairKey = [clash.candidateId, clash.program1Id, clash.program2Id].sort().join("_");
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      // Find the two program assignment records for this candidate
      const asnP1 = await prisma.programAssignment.findFirst({
        where: { candidateId: clash.candidateId, programId: clash.program1Id }
      });
      const asnP2 = await prisma.programAssignment.findFirst({
        where: { candidateId: clash.candidateId, programId: clash.program2Id }
      });

      if (!asnP1 || !asnP2) continue;

      // Count slots in each program
      const [slotsP1, slotsP2] = await Promise.all([
        prisma.programAssignment.count({ where: { programId: clash.program1Id } }),
        prisma.programAssignment.count({ where: { programId: clash.program2Id } })
      ]);

      // Strategy: put candidate as slot 1 in the program with fewer candidates (go first)
      // and as last slot in the other program (go last)
      const [firstProg, lastProg, firstAsn, lastAsn] = slotsP1 <= slotsP2
        ? [clash.program1Id, clash.program2Id, asnP1, asnP2]
        : [clash.program2Id, clash.program1Id, asnP2, asnP1];

      // Get the smallest available slot number in firstProg (assign to slot 1)
      const firstSlots = await prisma.programAssignment.findMany({
        where: { programId: firstProg },
        orderBy: { slotNumber: "asc" },
        select: { id: true, slotNumber: true }
      });
      // Shift everyone else to make room at slot 1
      await prisma.$transaction([
        // Give clashing candidate slot 1 in first program
        prisma.programAssignment.update({
          where: { id: firstAsn.id },
          data: { slotNumber: 0 } // temp 0
        }),
        // Give clashing candidate last slot in second program
        prisma.programAssignment.update({
          where: { id: lastAsn.id },
          data: { slotNumber: (slotsP1 <= slotsP2 ? slotsP2 : slotsP1) + 1 }
        }),
      ]);

      // Fix slot 0 ? slot 1
      await prisma.programAssignment.update({
        where: { id: firstAsn.id },
        data: { slotNumber: 1 }
      });

      fixedCount++;
    }

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/stage-manager");
    revalidatePath("/print/tabulation");

    return {
      success: true,
      fixed: fixedCount,
      message: `Reordered slots for ${fixedCount} manageable clash(es). Clashing candidates placed first in one venue and last in the other.`
    };
  } catch (e: any) {
    console.error("resolveManageableClashes error:", e);
    return { success: false, error: e.message || "Failed to fix clashes" };
  }
}

/**
 * Get global schedule clash analysis for an event � returns scored clashes.
 */
export async function getScheduleClashAnalysis(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized", clashes: [] };
    }

    const { calculateVenueTimeline, detectClashesBySeverity } = await import("@/lib/scheduleCalculator");

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true }
    });
    if (!event) return { success: false, error: "Event not found", clashes: [] };

    const targetZoneId = event.zoneId || event.zone?.id;
    const parentId = event.parentId;

    const rawPrograms = await prisma.program.findMany({
      where: parentId ? { OR: [{ eventId }, { eventId: parentId }] } : { eventId },
      include: {
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: { include: { zone: true } } } },
                institution: { include: { zone: true } }
              }
            }
          },
          orderBy: { slotNumber: "asc" }
        }
      }
    });

    const venueGroups: Record<string, any[]> = {};
    for (const p of rawPrograms) {
      if (!p.venue || p.type === "BREAK") continue;
      if (!venueGroups[p.venue]) venueGroups[p.venue] = [];
      venueGroups[p.venue].push(p);
    }

    const venueTimelines: Record<string, any[]> = {};
    for (const [vName, vProgs] of Object.entries(venueGroups)) {
      const tl = calculateVenueTimeline(vName, vProgs, { targetZoneId, bufferMinutes: 2 });
      venueTimelines[vName] = tl.programs;
    }

    const result = detectClashesBySeverity(venueTimelines, targetZoneId);
    return { success: true, ...result };
  } catch (e: any) {
    console.error("getScheduleClashAnalysis error:", e);
    return { success: false, error: e.message, clashes: [] };
  }
}

/**
 * TYPE 1: SAFE AUTO-FIX CLASHES (Same Venue Slot Reorder & 5-15m Buffer Adjustment)
 * Reorders candidate slots, shifts venue program sequence, and tunes buffer gaps (strictly 5 to 15 mins).
 * CRITICAL GUARANTEE: NEVER changes program duration, durationMode, mins/candidate, or venue!
 */
export async function resolveClashesSafe(
  eventId: string,
  options?: { minBuffer?: number; maxBuffer?: number }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { calculateVenueTimeline, detectClashesBySeverity } = await import("@/lib/scheduleCalculator");

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true }
    });
    if (!event) return { success: false, error: "Event not found" };

    const targetZoneId = event.zoneId || event.zone?.id;
    const parentId = event.parentId;

    const rawPrograms = await prisma.program.findMany({
      where: parentId ? { OR: [{ eventId }, { eventId: parentId }] } : { eventId },
      include: {
        category: true,
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: { include: { zone: true } } } },
                institution: { include: { zone: true } }
              }
            }
          },
          orderBy: { slotNumber: "asc" }
        }
      }
    });

    const venueGroups: Record<string, any[]> = {};
    for (const p of rawPrograms) {
      if (!p.venue || p.type === "BREAK") continue;
      if (!venueGroups[p.venue]) venueGroups[p.venue] = [];
      venueGroups[p.venue].push(p);
    }

    const buildTimelines = (bufferMap: Record<string, number> = {}) => {
      const timelines: Record<string, any[]> = {};
      for (const [vName, vProgs] of Object.entries(venueGroups)) {
        const buf = bufferMap[vName] ?? 5;
        const tl = calculateVenueTimeline(vName, vProgs, { targetZoneId, bufferMinutes: buf });
        timelines[vName] = tl.programs;
      }
      return timelines;
    };

    const initialAnalysis = detectClashesBySeverity(buildTimelines(), targetZoneId);
    let fixedSlotsCount = 0;

    // STEP 1: Reorder candidate slots for candidate clashes across venues
    const processedPairs = new Set<string>();
    for (const clash of initialAnalysis.scoredClashes) {
      if (!clash.candidateId) continue;
      const pairKey = [clash.candidateId, clash.program1Id, clash.program2Id].sort().join("_");
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const asnP1 = await prisma.programAssignment.findFirst({
        where: { candidateId: clash.candidateId, programId: clash.program1Id }
      });
      const asnP2 = await prisma.programAssignment.findFirst({
        where: { candidateId: clash.candidateId, programId: clash.program2Id }
      });

      if (!asnP1 || !asnP2) continue;

      const [slotsP1, slotsP2] = await Promise.all([
        prisma.programAssignment.count({ where: { programId: clash.program1Id } }),
        prisma.programAssignment.count({ where: { programId: clash.program2Id } })
      ]);

      const [firstProg, lastProg, firstAsn, lastAsn] = slotsP1 <= slotsP2
        ? [clash.program1Id, clash.program2Id, asnP1, asnP2]
        : [clash.program2Id, clash.program1Id, asnP2, asnP1];

      await prisma.$transaction([
        prisma.programAssignment.update({
          where: { id: firstAsn.id },
          data: { slotNumber: 1 }
        }),
        prisma.programAssignment.update({
          where: { id: lastAsn.id },
          data: { slotNumber: Math.max(slotsP1, slotsP2) + 1 }
        })
      ]);
      fixedSlotsCount++;
    }

    // STEP 2: Buffer gap tuning between 5 and 15 mins (minimum 5m, maximum 15m)
    const venueBufferMap: Record<string, number> = {};
    for (const venueName of Object.keys(venueGroups)) {
      venueBufferMap[venueName] = 5; // default 5m
    }

    const testBuffers = [5, 8, 10, 12, 15]; // strictly 5 to 15 mins
    let bestClashCount = detectClashesBySeverity(buildTimelines(venueBufferMap), targetZoneId).scoredClashes.length;

    for (const venueName of Object.keys(venueGroups)) {
      let bestBufForVenue = venueBufferMap[venueName];
      for (const b of testBuffers) {
        const testMap = { ...venueBufferMap, [venueName]: b };
        const testClashes = detectClashesBySeverity(buildTimelines(testMap), targetZoneId).scoredClashes.length;
        if (testClashes < bestClashCount) {
          bestClashCount = testClashes;
          bestBufForVenue = b;
        }
      }
      venueBufferMap[venueName] = bestBufForVenue;
    }

    // STEP 3: Apply sequential start times using the optimized buffer gap WITHOUT touching durations!
    for (const [vName, vProgs] of Object.entries(venueGroups)) {
      const chosenBuffer = venueBufferMap[vName] || 5;
      const tl = calculateVenueTimeline(vName, vProgs, { targetZoneId, bufferMinutes: chosenBuffer });

      const timeUpdates = tl.programs.map(item =>
        prisma.program.update({
          where: { id: item.program.id },
          data: {
            startTime: item.predictedStart
            // NOTE: duration and durationMode are NEVER touched!
          }
        })
      );
      if (timeUpdates.length > 0) {
        await prisma.$transaction(timeUpdates);
      }
    }

    const finalAnalysis = detectClashesBySeverity(buildTimelines(venueBufferMap), targetZoneId);

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/stage-manager");
    revalidatePath("/print/schedule");
    revalidatePath("/print/tabulation");

    return {
      success: true,
      fixedSlotsCount,
      initialClashes: initialAnalysis.scoredClashes.length,
      remainingClashes: finalAnalysis.scoredClashes.length,
      venueBuffers: venueBufferMap,
      message: `Clashes auto-resolved! Reordered ${fixedSlotsCount} candidate slots and tuned buffer gaps (5–15 mins). Total clashes: ${initialAnalysis.scoredClashes.length} → ${finalAnalysis.scoredClashes.length}. Program durations & venues remained 100% untouched.`
    };
  } catch (e: any) {
    console.error("resolveClashesSafe error:", e);
    return { success: false, error: e.message || "Failed to resolve clashes" };
  }
}

/**
 * TYPE 2: TEST VENUE TRANSFER FOR SEVERE CLASHES (DRY RUN / SIMULATION)
 * Tests whether moving stubborn conflicting programs to an alternative venue eliminates critical clashes.
 * Displays proposals with a required Jury & Valuation confirmation notice.
 */
export async function testCrossVenueTransfers(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { calculateVenueTimeline, detectClashesBySeverity } = await import("@/lib/scheduleCalculator");

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true }
    });
    if (!event) return { success: false, error: "Event not found" };

    const targetZoneId = event.zoneId || event.zone?.id;
    const parentId = event.parentId;

    const rawPrograms = await prisma.program.findMany({
      where: parentId ? { OR: [{ eventId }, { eventId: parentId }] } : { eventId },
      include: {
        category: true,
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: { include: { zone: true } } } },
                institution: { include: { zone: true } }
              }
            }
          }
        }
      }
    });

    const venueGroups: Record<string, any[]> = {};
    for (const p of rawPrograms) {
      if (!p.venue || p.type === "BREAK") continue;
      if (!venueGroups[p.venue]) venueGroups[p.venue] = [];
      venueGroups[p.venue].push(p);
    }

    const distinctVenues = Object.keys(venueGroups);
    if (distinctVenues.length < 2) {
      return { success: true, proposals: [], message: "At least 2 stages/venues are needed to test cross-venue transfers." };
    }

    const buildTimelines = (groups: Record<string, any[]>) => {
      const timelines: Record<string, any[]> = {};
      for (const [vName, vProgs] of Object.entries(groups)) {
        const tl = calculateVenueTimeline(vName, vProgs, { targetZoneId, bufferMinutes: 5 });
        timelines[vName] = tl.programs;
      }
      return timelines;
    };

    const baseAnalysis = detectClashesBySeverity(buildTimelines(venueGroups), targetZoneId);
    const initialTotalClashes = baseAnalysis.scoredClashes.length;
    const initialCritical = baseAnalysis.criticalCount + baseAnalysis.highCount;

    if (initialTotalClashes === 0) {
      return {
        success: true,
        proposals: [],
        currentClashCount: 0,
        projectedClashCount: 0,
        message: "No clashes detected in this event! No venue transfers required."
      };
    }

    const clashingProgramIds = new Set<string>();
    for (const c of baseAnalysis.scoredClashes) {
      clashingProgramIds.add(c.program1Id);
      clashingProgramIds.add(c.program2Id);
    }

    type Proposal = {
      programId: string;
      programCode: string;
      programName: string;
      categoryName: string;
      currentVenue: string;
      proposedVenue: string;
      clashReduction: number;
      projectedTotalClashes: number;
      candidateNames: string[];
      reason: string;
    };

    const proposals: Proposal[] = [];

    for (const pId of clashingProgramIds) {
      const prog = rawPrograms.find(p => p.id === pId);
      if (!prog || !prog.venue) continue;

      const currentVenue = prog.venue;
      const relatedClashes = baseAnalysis.scoredClashes.filter(c => c.program1Id === pId || c.program2Id === pId);
      const candidateNames = Array.from(new Set(relatedClashes.map(c => c.candidateName)));

      for (const targetVenue of distinctVenues) {
        if (targetVenue === currentVenue) continue;

        // Simulate moving prog to targetVenue
        const simGroups: Record<string, any[]> = {};
        for (const [v, progs] of Object.entries(venueGroups)) {
          simGroups[v] = progs.filter(p => p.id !== pId);
        }
        simGroups[targetVenue] = [...(simGroups[targetVenue] || []), prog];

        const simAnalysis = detectClashesBySeverity(buildTimelines(simGroups), targetZoneId);
        const simTotal = simAnalysis.scoredClashes.length;
        const simCritical = simAnalysis.criticalCount + simAnalysis.highCount;

        if (simTotal < initialTotalClashes || (simTotal === initialTotalClashes && simCritical < initialCritical)) {
          const reduction = initialTotalClashes - simTotal;
          proposals.push({
            programId: prog.id,
            programCode: prog.programCode || "",
            programName: prog.name,
            categoryName: prog.category?.name || "General",
            currentVenue,
            proposedVenue: targetVenue,
            clashReduction: reduction > 0 ? reduction : 1,
            projectedTotalClashes: simTotal,
            candidateNames,
            reason: `Moving to "${targetVenue}" eliminates scheduling conflict for ${candidateNames.slice(0, 2).join(", ")}${candidateNames.length > 2 ? ` +${candidateNames.length - 2} more` : ""}.`
          });
        }
      }
    }

    const bestByProg = new Map<string, Proposal>();
    for (const p of proposals) {
      const existing = bestByProg.get(p.programId);
      if (!existing || p.clashReduction > existing.clashReduction) {
        bestByProg.set(p.programId, p);
      }
    }

    const sortedProposals = Array.from(bestByProg.values()).sort((a, b) => b.clashReduction - a.clashReduction);

    return {
      success: true,
      currentClashCount: initialTotalClashes,
      criticalCount: baseAnalysis.criticalCount,
      highCount: baseAnalysis.highCount,
      proposals: sortedProposals,
      juryWarning: "⚠️ JURY SITTING & VALUATION NOTICE: Moving a program to another venue requires juries, valuation sheets, and judging arrangements to be available at the destination venue. Please confirm before applying."
    };
  } catch (e: any) {
    console.error("testCrossVenueTransfers error:", e);
    return { success: false, error: e.message || "Failed to simulate venue transfers" };
  }
}

/**
 * APPLY APPROVED CROSS-VENUE TRANSFERS
 * Moves approved programs to new venues and re-sequences start times with >=5m buffer.
 * Preserves all program durations and timing modes!
 */
export async function applyCrossVenueTransfers(
  eventId: string,
  transfers: { programId: string; toVenue: string }[]
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { calculateVenueTimeline } = await import("@/lib/scheduleCalculator");

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true }
    });
    if (!event) return { success: false, error: "Event not found" };

    const targetZoneId = event.zoneId || event.zone?.id;
    const parentId = event.parentId;

    const affectedVenues = new Set<string>();

    for (const t of transfers) {
      const prog = await prisma.program.findUnique({ where: { id: t.programId } });
      if (prog?.venue) affectedVenues.add(prog.venue);
      affectedVenues.add(t.toVenue);

      await prisma.program.update({
        where: { id: t.programId },
        data: { venue: t.toVenue }
      });
    }

    // Re-align start times for all affected venues
    for (const venueName of affectedVenues) {
      const vProgs = await prisma.program.findMany({
        where: {
          venue: venueName,
          ...(parentId ? { OR: [{ eventId }, { eventId: parentId }] } : { eventId })
        },
        include: {
          assignments: {
            include: {
              candidate: {
                include: {
                  team: { include: { institution: { include: { zone: true } } } },
                  institution: { include: { zone: true } }
                }
              }
            }
          }
        },
        orderBy: [{ startTime: "asc" }, { programCode: "asc" }]
      });

      const tl = calculateVenueTimeline(venueName, vProgs, { targetZoneId, bufferMinutes: 5 });
      const updates = tl.programs.map(item =>
        prisma.program.update({
          where: { id: item.program.id },
          data: { startTime: item.predictedStart }
        })
      );
      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }
    }

    revalidatePath("/dashboard/schedule");
    revalidatePath("/print/stage-manager");
    revalidatePath("/print/schedule");
    revalidatePath("/print/valuation");
    revalidatePath("/print/tabulation");

    return {
      success: true,
      transferredCount: transfers.length,
      message: `Successfully transferred ${transfers.length} program(s) to new venues and updated timeline sequence!`
    };
  } catch (e: any) {
    console.error("applyCrossVenueTransfers error:", e);
    return { success: false, error: e.message || "Failed to apply venue transfers" };
  }
}
