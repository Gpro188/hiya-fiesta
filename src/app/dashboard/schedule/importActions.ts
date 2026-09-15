"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

export async function importScheduleFromExcel(eventId: string, base64Data: string) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    // Fetch all programs for the event up-front to prevent N+1 select queries
    const programs = await prisma.program.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        venue: true,
        startTime: true,
        duration: true,
        stageType: true
      }
    });

    const programMap = new Map(
      programs.map(p => [p.name.toLowerCase().trim(), p])
    );

    const updates = [];

    // Data format expected: { ProgramName, Venue, StartTime, Duration, StageType }
    for (const row of data) {
      const programName = row.ProgramName || row.Program;
      if (!programName) continue;

      const program = programMap.get(programName.toString().toLowerCase().trim());

      if (program) {
        let startTime = null;
        if (row.StartTime) {
          // Attempt to parse Date/Time
          startTime = new Date(row.StartTime);
          if (isNaN(startTime.getTime())) startTime = null;
        }

        updates.push(
          prisma.program.update({
            where: { id: program.id },
            data: {
              venue: row.Venue?.toString() || program.venue,
              startTime: startTime || program.startTime,
              duration: parseInt(row.Duration) || program.duration,
              stageType: row.StageType?.toString() || program.stageType,
            }
          })
        );
      }
    }

    if (updates.length > 0) {
      // Execute all updates in a single database transaction
      await prisma.$transaction(updates);
    }

    revalidatePath("/dashboard/schedule");
    return { success: true, count: updates.length };
  } catch (error) {
    console.error("Failed to import schedule:", error);
    return { success: false, error: "Failed to import Excel data" };
  }
}

export async function checkSchedulingConflicts(eventId: string, targetZoneId?: string | null) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true }
    });

    if (!event) return { success: true, conflicts: [] };

    const isStateEvent = (!event.parentId || event.type === "STATE") && !targetZoneId && !event.zoneId;

    if (isStateEvent) {
      // In Super Admin / State Fest: only show after zonal fest is completed and candidates are promoted to state fest
      const stateQualifiedCount = await prisma.candidate.count({
        where: { isStateQualified: true }
      });

      if (stateQualifiedCount === 0) {
        return { success: true, conflicts: [] };
      }
    }

    const zoneId = targetZoneId || event.zoneId || event.zone?.id;

    // Fetch candidate assignments
    const assignments = await prisma.programAssignment.findMany({
      where: {
        OR: [
          { program: { eventId } },
          ...(event.parentId ? [{ program: { eventId: event.parentId } }] : [])
        ]
      },
      include: {
        candidate: {
          include: {
            institution: { include: { zone: true } },
            team: { include: { institution: { include: { zone: true } } } }
          }
        },
        program: true,
      }
    });

    // If state event with qualified candidates, only check qualified candidates
    let filteredAssignments = assignments;
    if (isStateEvent) {
      filteredAssignments = assignments.filter(as => as.candidate?.isStateQualified);
    } else if (zoneId) {
      // Filter strictly to candidates in THIS specific zone
      filteredAssignments = assignments.filter(as => {
        if (!as.candidate) return false;
        const c = as.candidate;
        const cZoneId =
          c.institution?.zoneId ||
          c.institution?.zone?.id ||
          c.team?.institution?.zoneId ||
          c.team?.institution?.zone?.id;
        return cZoneId === zoneId;
      });
    }

    // Fetch zone programs to get zone-specific timing
    const zonePrograms = await prisma.program.findMany({
      where: { eventId }
    });
    const zoneProgMap = new Map<string, any>();
    for (const zp of zonePrograms) {
      if (zp.programCode) zoneProgMap.set(`code_${zp.programCode.trim().toLowerCase()}`, zp);
      zoneProgMap.set(`name_${zp.name.trim().toLowerCase()}`, zp);
    }

    const conflicts: any[] = [];
    
    // Group assignments by candidate
    const candidateSchedules: Record<string, any[]> = {};
    filteredAssignments.forEach(as => {
      const key1 = as.program.programCode ? `code_${as.program.programCode.trim().toLowerCase()}` : '';
      const key2 = `name_${as.program.name.trim().toLowerCase()}`;
      const zoneProg = (key1 && zoneProgMap.get(key1)) || zoneProgMap.get(key2);

      const progTime = zoneProg?.startTime || as.program.startTime;
      const progDuration = zoneProg?.duration || as.program.duration || 10;
      if (!progTime) return;
      
      if (!candidateSchedules[as.candidateId]) candidateSchedules[as.candidateId] = [];
      
      const start = new Date(progTime).getTime();
      const end = start + (progDuration * 60 * 1000);
      
      candidateSchedules[as.candidateId].push({
        id: as.id,
        candidateName: as.candidate.name,
        programName: as.program.name,
        start,
        end
      });
    });

    // Check for overlaps for each candidate
    Object.values(candidateSchedules).forEach(schedule => {
      for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
          const a = schedule[i];
          const b = schedule[j];
          
          if (a.start < b.end && b.start < a.end) {
            conflicts.push({
              candidateName: a.candidateName,
              programs: [a.programName, b.programName],
              time: new Date(a.start).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })
            });
          }
        }
      }
    });

    // --- Jury Clash Detection ---
    const programsWithJudges = await prisma.program.findMany({
      where: { eventId, startTime: { not: null } },
      include: { judges: true }
    });

    const jurySchedules: Record<string, any[]> = {};
    programsWithJudges.forEach(program => {
      if (!program.startTime) return;
      const start = new Date(program.startTime).getTime();
      const end = start + (program.duration * 60 * 1000);

      program.judges.forEach(judge => {
        if (!jurySchedules[judge.id]) jurySchedules[judge.id] = [];
        jurySchedules[judge.id].push({
          juryName: judge.username,
          programName: program.name,
          start,
          end
        });
      });
    });

    Object.values(jurySchedules).forEach(schedule => {
      for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
          const a = schedule[i];
          const b = schedule[j];
          
          if (a.start < b.end && b.start < a.end) {
            const conflictExists = conflicts.some(c => 
              c.candidateName === `Jury: ${a.juryName}` && 
              c.programs.includes(a.programName) && 
              c.programs.includes(b.programName)
            );
            
            if (!conflictExists) {
              conflicts.push({
                candidateName: `Jury: ${a.juryName}`,
                programs: [a.programName, b.programName],
                time: new Date(a.start).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })
              });
            }
          }
        }
      }
    });

    return { success: true, conflicts };
  } catch (error) {
    console.error("Error checking scheduling conflicts:", error);
    return { success: false, error: "Failed to check conflicts" };
  }
}
