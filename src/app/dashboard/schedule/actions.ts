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
