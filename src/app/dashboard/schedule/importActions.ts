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

export async function checkSchedulingConflicts(eventId: string) {
  try {
    const assignments = await prisma.programAssignment.findMany({
      where: { program: { eventId } },
      include: {
        candidate: true,
        program: true,
      }
    });

    const conflicts: any[] = [];
    
    // Group assignments by candidate
    const candidateSchedules: Record<string, any[]> = {};
    assignments.forEach(as => {
      if (!as.program.startTime) return;
      if (!candidateSchedules[as.candidateId]) candidateSchedules[as.candidateId] = [];
      
      const start = new Date(as.program.startTime).getTime();
      const end = start + (as.program.duration * 60 * 1000);
      
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
              time: new Date(a.start).toLocaleString()
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
            // Check if this specific conflict is already added to avoid duplicates
            const conflictExists = conflicts.some(c => 
              c.candidateName === `Jury: ${a.juryName}` && 
              c.programs.includes(a.programName) && 
              c.programs.includes(b.programName)
            );
            
            if (!conflictExists) {
              conflicts.push({
                candidateName: `Jury: ${a.juryName}`,
                programs: [a.programName, b.programName],
                time: new Date(a.start).toLocaleString()
              });
            }
          }
        }
      }
    });

    return { success: true, conflicts };
  } catch (error) {
    return { success: false, error: "Failed to check conflicts" };
  }
}
