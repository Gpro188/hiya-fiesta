"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function updateProgramSchedule(
  id: string, 
  data: { venue: string | null, startTime: string | null, duration?: number, stageType?: string, judgeIds?: string[] },
  targetEventId?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const currentProg = await prisma.program.findUnique({
      where: { id },
      select: { id: true, eventId: true, name: true, programCode: true, categoryId: true, type: true, stageType: true }
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
            type: currentProg.type || "INDIVIDUAL",
            categoryId: currentProg.categoryId,
            eventId: targetEventId,
            stageType: data.stageType || currentProg.stageType || "ON_STAGE",
            duration: data.duration ?? 10,
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
  programUpdates: Array<{ id: string; startTime: string; duration: number; stageType?: string; judgeIds?: string[] }>
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
      select: { id: true, eventId: true, programCode: true, name: true, categoryId: true, type: true, stageType: true }
    });
    const progMap = new Map(existingPrograms.map(p => [p.id, p]));

    let zoneProgramsForMatching: any[] = [];
    if (isZoneEvent) {
      zoneProgramsForMatching = await prisma.program.findMany({
        where: { eventId },
        select: { id: true, programCode: true, name: true, categoryId: true, type: true, stageType: true }
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
              venue: venue,
              startTime: new Date(item.startTime),
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
  options?: { bufferMinutes?: number; defaultMinPerCandidate?: number }
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
        minutesPerCandidate: options?.defaultMinPerCandidate
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
  options?: { bufferMinutes?: number; defaultMinPerCandidate?: number }
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

