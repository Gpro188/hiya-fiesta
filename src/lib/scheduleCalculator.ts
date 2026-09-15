/**
 * scheduleCalculator.ts
 * Engine to calculate program durations and venue timelines dynamically
 * based on registered candidate/team attendance per zone or state event.
 * Specifically tailored for 1-Day Zonal Festivals starting at 09:00 AM.
 */

export interface ProgramAssignmentLike {
  id: string;
  candidateId?: string;
  slotNumber?: number | null;
  scheduledTime?: string | Date | null;
  candidate?: {
    id: string;
    name?: string;
    teamId?: string;
    institutionId?: string | null;
    institution?: {
      id?: string;
      zoneId?: string | null;
      zone?: { id?: string; name?: string } | null;
    } | null;
    team?: {
      id?: string;
      eventId?: string;
      institutionId?: string | null;
      institution?: {
        id?: string;
        zoneId?: string | null;
        zone?: { id?: string; name?: string } | null;
      } | null;
    } | null;
  } | null;
}

export interface ProgramLike {
  id: string;
  programCode?: string | null;
  name: string;
  type?: string; // "INDIVIDUAL" | "GROUP" | "GENERAL" | "INSTITUTION" | "BREAK"
  stageType?: string; // "ON_STAGE" | "OFF_STAGE" | "BREAK"
  venue?: string | null;
  duration?: number; // base duration in minutes (e.g. 5, 8, 10, 60)
  durationMode?: string | null; // "AUTO" | "PER_TEAM" | "PER_CANDIDATE" | "TOTAL_FIXED"
  candidateLimitPerTeam?: number;
  startTime?: string | Date | null;
  assignments?: ProgramAssignmentLike[];
  category?: { id?: string; name?: string } | null;
}

export interface CalculationOptions {
  minutesPerCandidate?: number; // override if needed, otherwise uses program.duration or 5
  minutesPerTeam?: number; // for group programs
  bufferMinutes?: number; // transition buffer between programs (default 0 or 5)
  targetZoneId?: string | null; // filter candidates to this specific zone
  baseStartTime?: Date; // default is 09:00 AM
  oneDayCutoffHour?: number; // default 18 (6:00 PM)
  extendedCutoffHour?: number; // default 20 (8:00 PM)
}

export interface CalculatedProgramSlot {
  program: ProgramLike;
  index: number;
  candidateCount: number;
  teamCount: number;
  duration: number; // total calculated minutes
  durationPerItem: number; // minutes per candidate / team
  durationMode?: string;
  predictedStart: Date;
  predictedEnd: Date;
  filteredAssignments: ProgramAssignmentLike[];
}

export interface VenueTimelineResult {
  venue: string;
  programs: CalculatedProgramSlot[];
  totalPrograms: number;
  totalCandidates: number;
  totalDurationMinutes: number;
  startTime: Date;
  endTime: Date;
  bufferMinutes: number;
  status: "FEASIBLE" | "TIGHT" | "OVERRUN";
  statusText: string;
  statusColor: string;
}

/**
 * Filter candidate assignments to those belonging to the target zone (if specified)
 */
export function getZoneCandidatesForProgram(
  assignments: ProgramAssignmentLike[] = [],
  targetZoneId?: string | null
): ProgramAssignmentLike[] {
  if (!targetZoneId) {
    return assignments.filter(a => Boolean(a.candidate));
  }

  return assignments.filter(a => {
    if (!a.candidate) return false;
    const c = a.candidate;
    const zId =
      c.institution?.zoneId ||
      c.institution?.zone?.id ||
      c.team?.institution?.zoneId ||
      c.team?.institution?.zone?.id;
    return zId === targetZoneId;
  });
}

/**
 * Calculate dynamic duration of a program based on registered candidates/teams in the zone
 */
export function calculateDynamicProgramDuration(
  program: ProgramLike,
  filteredAssignments: ProgramAssignmentLike[],
  options: CalculationOptions = {}
): { duration: number; candidateCount: number; teamCount: number; durationPerItem: number; durationMode: string } {
  const isBreak = program.type === "BREAK" || program.stageType === "BREAK";
  if (isBreak) {
    return {
      duration: program.duration || 15,
      candidateCount: 0,
      teamCount: 0,
      durationPerItem: program.duration || 15,
      durationMode: "TOTAL_FIXED"
    };
  }

  const candidateCount = filteredAssignments.length;
  const uniqueTeams = new Set(
    filteredAssignments.map(a => a.candidate?.teamId).filter(Boolean)
  );
  const rawTeamCount = uniqueTeams.size;
  const limitPerTeam = program.candidateLimitPerTeam || 1;
  const teamCount = rawTeamCount > 0 ? rawTeamCount : (candidateCount > 0 ? Math.ceil(candidateCount / limitPerTeam) : 0);

  const progType = (program.type || "INDIVIDUAL").toUpperCase();
  const baseProgDuration = program.duration && program.duration > 0 ? program.duration : 5;

  // Determine effective timing mode
  let effectiveMode = (program.durationMode || "AUTO").toUpperCase();
  if (effectiveMode === "AUTO") {
    if (progType === "GROUP" || progType === "GENERAL" || limitPerTeam > 1) {
      effectiveMode = "PER_TEAM";
    } else if (progType === "INDIVIDUAL") {
      effectiveMode = "PER_CANDIDATE";
    } else {
      effectiveMode = "TOTAL_FIXED";
    }
  }

  // 1. TOTAL_FIXED: Program has a fixed duration for the whole session (e.g. written exams, quizzes, or fixed group slot)
  if (effectiveMode === "TOTAL_FIXED") {
    const duration = baseProgDuration;
    return {
      duration,
      candidateCount,
      teamCount,
      durationPerItem: duration,
      durationMode: "TOTAL_FIXED"
    };
  }

  // 2. PER_TEAM: Multiplied by Group / Team Count (e.g. Mashup, Group Song, Skit, Kolkali)
  if (effectiveMode === "PER_TEAM") {
    if (options.minutesPerTeam) {
      const minPerTeam = options.minutesPerTeam;
      const duration = teamCount > 0 ? teamCount * minPerTeam : minPerTeam;
      return { duration, candidateCount, teamCount, durationPerItem: minPerTeam, durationMode: "PER_TEAM" };
    }
    // No override: derive per-team minutes from stored total duration
    if (teamCount === 0) {
      const fallbackPerItem = baseProgDuration > 0 ? baseProgDuration : 8;
      return { duration: baseProgDuration, candidateCount: 0, teamCount: 0, durationPerItem: fallbackPerItem, durationMode: "PER_TEAM" };
    }
    const minPerTeam = Math.max(1, Math.round(baseProgDuration / teamCount));
    return {
      duration: baseProgDuration,
      candidateCount,
      teamCount,
      durationPerItem: minPerTeam,
      durationMode: "PER_TEAM"
    };
  }

  // 3. PER_CANDIDATE: Multiplied by Individual Candidate Count
  if (options.minutesPerCandidate) {
    const minPerCandidate = options.minutesPerCandidate;
    const duration = candidateCount > 0 ? candidateCount * minPerCandidate : minPerCandidate;
    return { duration, candidateCount, teamCount, durationPerItem: minPerCandidate, durationMode: "PER_CANDIDATE" };
  }
  if (candidateCount === 0) {
    const fallbackPerItem = baseProgDuration > 0 ? baseProgDuration : 5;
    return { duration: baseProgDuration, candidateCount: 0, teamCount: 0, durationPerItem: fallbackPerItem, durationMode: "PER_CANDIDATE" };
  }
  const minPerCandidate = Math.max(1, Math.round(baseProgDuration / candidateCount));
  return {
    duration: baseProgDuration,
    candidateCount,
    teamCount,
    durationPerItem: minPerCandidate,
    durationMode: "PER_CANDIDATE"
  };
}

/**
 * Calculate sequential timeline for an entire venue starting at 09:00 AM
 */
export function calculateVenueTimeline(
  venue: string,
  programs: ProgramLike[],
  options: CalculationOptions = {}
): VenueTimelineResult {
  const bufferMinutes = options.bufferMinutes ?? 10;

  // Initialize start date strictly at 09:00 AM (IST)
  let baseDate = options.baseStartTime ? new Date(options.baseStartTime) : new Date();
  if (isNaN(baseDate.getTime())) baseDate = new Date();
  baseDate.setHours(9, 0, 0, 0);

  let currentCursor = new Date(baseDate.getTime());
  let totalCandidates = 0;

  const calculatedSlots: CalculatedProgramSlot[] = programs.map((p, idx) => {
    const filteredAssignments = getZoneCandidatesForProgram(p.assignments, options.targetZoneId);
    const { duration, candidateCount, teamCount, durationPerItem } = calculateDynamicProgramDuration(
      p,
      filteredAssignments,
      options
    );

    totalCandidates += candidateCount;

    const start = new Date(currentCursor.getTime());
    const end = new Date(start.getTime() + duration * 60000);
    currentCursor = new Date(end.getTime() + bufferMinutes * 60000);

    return {
      program: p,
      index: idx + 1,
      candidateCount,
      teamCount,
      duration,
      durationPerItem,
      predictedStart: start,
      predictedEnd: end,
      filteredAssignments,
    };
  });

  const totalDurationMinutes = calculatedSlots.reduce((acc, slot) => acc + slot.duration, 0) +
    Math.max(0, calculatedSlots.length - 1) * bufferMinutes;

  const endTime = calculatedSlots.length > 0 
    ? calculatedSlots[calculatedSlots.length - 1].predictedEnd 
    : baseDate;

  // 1-Day Feasibility check (Standard: 9:00 AM to 6:00 PM is 9 hours = 540 mins)
  // Extended evening: up to 8:00 PM (11 hours = 660 mins)
  const endHours = endTime.getHours() + endTime.getMinutes() / 60;
  const cutoffHour = options.oneDayCutoffHour || 18; // 6:00 PM
  const extendedCutoff = options.extendedCutoffHour || 20; // 8:00 PM

  let status: "FEASIBLE" | "TIGHT" | "OVERRUN" = "FEASIBLE";
  let statusText = "Fits within 1-Day";
  let statusColor = "#10b981"; // Green

  if (endHours > extendedCutoff) {
    status = "OVERRUN";
    statusText = `Overruns 1-Day (> ${Math.floor(endHours - 12)}:${String(endTime.getMinutes()).padStart(2, '0')} PM)`;
    statusColor = "#ef4444"; // Red
  } else if (endHours > cutoffHour) {
    status = "TIGHT";
    statusText = `Tight Evening Finish (${Math.floor(endHours - 12)}:${String(endTime.getMinutes()).padStart(2, '0')} PM)`;
    statusColor = "#f59e0b"; // Amber
  }

  return {
    venue,
    programs: calculatedSlots,
    totalPrograms: calculatedSlots.length,
    totalCandidates,
    totalDurationMinutes,
    startTime: baseDate,
    endTime,
    bufferMinutes,
    status,
    statusText,
    statusColor,
  };
}

/**
 * Helper to format minutes as "Xh Ym"
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Helper to format date to "hh:mm A" in Indian Standard Time (Asia/Kolkata)
 */
export function formatTimeAmPm(d: Date | string | null | undefined): string {
  if (!d) return "TBD";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "TBD";
  return dateObj.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
