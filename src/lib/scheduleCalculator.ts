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
  groupFixedMin?: number; // duration for group / fixed programs
  bufferMinutes?: number; // transition buffer between programs (default 0 or 5, up to 60m)
  targetZoneId?: string | null; // filter candidates to this specific zone
  baseStartTime?: Date | string; // explicit base start time
  startTimeMode?: "SAVED" | "FIXED_930" | "CUSTOM"; // default SAVED: preserves venue's saved start time
  startHour?: number; // default 9
  startMinute?: number; // default 30
  oneDayCutoffHour?: number; // recommended finish hour (default 17 = 5:00 PM)
  extendedCutoffHour?: number; // hard ceiling finish hour (default 18 = 6:00 PM)
  enableBreak?: boolean; // lunch/prayer break option
  breakStartHour?: number; // default 13 (1:00 PM)
  breakStartMinute?: number; // default 0
  breakEndHour?: number; // default 13 (1:45 PM) or 14 (2:00 PM)
  breakEndMinute?: number; // default 45
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
    const duration = options.groupFixedMin && options.groupFixedMin > 0 ? options.groupFixedMin : baseProgDuration;
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
    if (teamCount === 0) {
      const fallbackPerItem = baseProgDuration > 0 ? baseProgDuration : 10;
      return { duration: baseProgDuration, candidateCount: 0, teamCount: 0, durationPerItem: fallbackPerItem, durationMode: "PER_TEAM" };
    }
    // If baseProgDuration is substantially larger than team count, it represents total saved time
    const minPerTeam = baseProgDuration >= teamCount * 4
      ? Math.max(1, Math.round(baseProgDuration / teamCount))
      : Math.max(1, baseProgDuration);
    const duration = teamCount * minPerTeam;
    return {
      duration,
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
  // If baseProgDuration is substantially larger than candidate count, it represents total saved time
  // Otherwise it was saved as per-candidate minutes (e.g. 5m / candidate)
  const minPerCandidate = baseProgDuration >= candidateCount * 2
    ? Math.max(1, Math.round(baseProgDuration / candidateCount))
    : Math.max(1, baseProgDuration);
  const duration = candidateCount * minPerCandidate;
  return {
    duration,
    candidateCount,
    teamCount,
    durationPerItem: minPerCandidate,
    durationMode: "PER_CANDIDATE"
  };
}

/**
 * Helper to get festival base start time at 09:30 AM Indian Standard Time (Asia/Kolkata)
 */
export function getFestivalBaseDate(
  dateInput?: string | Date | null,
  startHour: number = 9,
  startMinute: number = 30
): Date {
  let year = 2026, month = 9, day = 19;
  if (dateInput) {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (!isNaN(d.getTime())) {
      const istStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const parts = istStr.split("-");
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      }
    }
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(startHour)}:${pad(startMinute)}:00+05:30`);
}

/**
 * Calculate sequential timeline for an entire venue starting at 09:00 AM IST
 */
export function calculateVenueTimeline(
  venue: string,
  programs: ProgramLike[],
  options: CalculationOptions = {}
): VenueTimelineResult {
  const bufferMinutes = options.bufferMinutes ?? 5;

  // Determine venue base start time:
  // 1. Explicit baseStartTime provided in options
  // 2. If startTimeMode is "SAVED" (or default if programs has saved times):
  //    find the earliest valid saved startTime among the programs
  // 3. Fallback: 09:30 AM IST on the festival date
  let baseDate: Date;
  if (options.baseStartTime) {
    baseDate = getFestivalBaseDate(options.baseStartTime, options.startHour ?? 9, options.startMinute ?? 30);
  } else if (options.startTimeMode === "SAVED") {
    // Check if any program in this venue has a saved startTime
    const validSavedTimes = programs
      .map(p => p.startTime ? new Date(p.startTime) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    // Only accept a saved start time if it is a morning festival start (e.g. between 07:00 and 11:30 AM in IST)
    // If it's afternoon (e.g. 2:29 PM) or night, it's an erroneous UTC offset or late program, so fallback to 09:30 AM!
    const morningSaved = validSavedTimes.find(d => {
      const istHour = (d.getUTCHours() + 5 + Math.floor((d.getUTCMinutes() + 30) / 60)) % 24;
      return istHour >= 7 && istHour <= 11;
    });

    if (morningSaved) {
      baseDate = morningSaved;
    } else {
      const sampleDate = validSavedTimes[0] || programs.find(p => p.startTime)?.startTime;
      baseDate = getFestivalBaseDate(sampleDate, options.startHour ?? 9, options.startMinute ?? 30);
    }
  } else {
    // FIXED_930 or default: Use date from festival / first program at 09:30 AM IST
    const sampleDate = programs.find(p => p.startTime)?.startTime;
    baseDate = getFestivalBaseDate(sampleDate, options.startHour ?? 9, options.startMinute ?? 30);
  }

  // Setup Break Window (if enabled)
  let breakStart: Date | null = null;
  let breakEnd: Date | null = null;
  if (options.enableBreak) {
    const sH = options.breakStartHour ?? 13; // 1:00 PM
    const sM = options.breakStartMinute ?? 0;
    const eH = options.breakEndHour ?? 13;
    const eM = options.breakEndMinute ?? 45; // 1:45 PM (or 14:00 if 2:00 PM)

    breakStart = new Date(baseDate.getTime());
    breakStart.setHours(sH, sM, 0, 0);

    breakEnd = new Date(baseDate.getTime());
    breakEnd.setHours(eH, eM, 0, 0);

    if (breakEnd.getTime() <= breakStart.getTime()) {
      breakEnd = new Date(breakStart.getTime() + 45 * 60000);
    }
  }

  let currentCursor = new Date(baseDate.getTime());
  let totalCandidates = 0;

  const calculatedSlots: CalculatedProgramSlot[] = programs.map((p, idx) => {
    const filteredAssignments = getZoneCandidatesForProgram(p.assignments, options.targetZoneId);
    const { duration, candidateCount, teamCount, durationPerItem, durationMode } = calculateDynamicProgramDuration(
      p,
      filteredAssignments,
      options
    );

    totalCandidates += candidateCount;

    // Apply Break adjustment:
    // If the current cursor is within the break window, or if running this program now would overlap the break window,
    // push the program start to the end of the break window!
    if (options.enableBreak && breakStart && breakEnd) {
      if (currentCursor >= breakStart && currentCursor < breakEnd) {
        currentCursor = new Date(breakEnd.getTime());
      } else if (currentCursor < breakStart && (currentCursor.getTime() + duration * 60000) > breakStart.getTime()) {
        currentCursor = new Date(breakEnd.getTime());
      }
    }

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
      durationMode,
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

  // Recommended close: 5:00 PM (17:00), Hard Limit: 6:00 PM (18:00)
  const endHours = endTime.getHours() + endTime.getMinutes() / 60;
  const cutoffHour = options.oneDayCutoffHour || 17; // 5:00 PM recommended close
  const extendedCutoff = options.extendedCutoffHour || 18; // 6:00 PM hard ceiling

  let status: "FEASIBLE" | "TIGHT" | "OVERRUN" = "FEASIBLE";
  let statusText = "Fits before 5:00 PM";
  let statusColor = "#10b981"; // Green

  if (endHours > extendedCutoff) {
    status = "OVERRUN";
    statusText = `Overruns 6:00 PM (${Math.floor(endHours > 12 ? endHours - 12 : endHours)}:${String(endTime.getMinutes()).padStart(2, '0')} PM)`;
    statusColor = "#ef4444"; // Red
  } else if (endHours > cutoffHour) {
    status = "TIGHT";
    statusText = `Finishes between 5:00 PM and 6:00 PM (${Math.floor(endHours > 12 ? endHours - 12 : endHours)}:${String(endTime.getMinutes()).padStart(2, '0')} PM)`;
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
 * Interface for a real-time candidate clash
 */
export interface CandidateClash {
  candidateId: string;
  candidateName: string;
  chestNumber?: string | null;
  program1Id: string;
  program1Name: string;
  program1Venue: string;
  program1Start: Date;
  program1End: Date;
  program2Id: string;
  program2Name: string;
  program2Venue: string;
  program2Start: Date;
  program2End: Date;
  overlapMinutes: number;
}

/**
 * Real-time Candidate Clash Detection across all venues/stages.
 * Checks for candidates scheduled on multiple stages during overlapping time windows.
 */
export function detectCandidateScheduleClashes(
  venueTimelines: Record<string, CalculatedProgramSlot[]>,
  targetZoneId?: string | null
): {
  clashes: CandidateClash[];
  clashesByProgramId: Record<string, CandidateClash[]>;
  clashCandidateCount: number;
} {
  // Map of candidateId -> list of scheduled appearances
  const candidateAppearances = new Map<string, Array<{
    candidateId: string;
    candidateName: string;
    programId: string;
    programName: string;
    venue: string;
    start: Date;
    end: Date;
  }>>();

  // Populate candidate appearances from all venue calculated slots
  for (const [venue, slots] of Object.entries(venueTimelines)) {
    if (!venue || venue === "Unassigned") continue;

    for (const slot of slots) {
      if (slot.program.type === "BREAK") continue;

      const zoneCandidates = getZoneCandidatesForProgram(slot.program.assignments, targetZoneId);
      for (const assignment of zoneCandidates) {
        const cand = assignment.candidate;
        if (!cand || !cand.id) continue;

        const list = candidateAppearances.get(cand.id) || [];
        list.push({
          candidateId: cand.id,
          candidateName: cand.name || "Candidate",
          programId: slot.program.id,
          programName: slot.program.name,
          venue: venue,
          start: slot.predictedStart,
          end: slot.predictedEnd,
        });
        candidateAppearances.set(cand.id, list);
      }
    }
  }

  const clashes: CandidateClash[] = [];
  const clashesByProgramId: Record<string, CandidateClash[]> = {};
  const clashingCandidateIds = new Set<string>();

  for (const [candId, appearances] of candidateAppearances.entries()) {
    if (appearances.length < 2) continue;

    for (let i = 0; i < appearances.length; i++) {
      for (let j = i + 1; j < appearances.length; j++) {
        const a = appearances[i];
        const b = appearances[j];

        // Only count as clash if they are in different venues/stages
        if (a.venue === b.venue && a.programId === b.programId) continue;

        const startA = a.start.getTime();
        const endA = a.end.getTime();
        const startB = b.start.getTime();
        const endB = b.end.getTime();

        // Check time interval overlap: [startA, endA) and [startB, endB)
        if (startA < endB && startB < endA) {
          const overlapStart = Math.max(startA, startB);
          const overlapEnd = Math.min(endA, endB);
          const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000);

          const clash: CandidateClash = {
            candidateId: candId,
            candidateName: a.candidateName,
            program1Id: a.programId,
            program1Name: a.programName,
            program1Venue: a.venue,
            program1Start: a.start,
            program1End: a.end,
            program2Id: b.programId,
            program2Name: b.programName,
            program2Venue: b.venue,
            program2Start: b.start,
            program2End: b.end,
            overlapMinutes,
          };

          clashes.push(clash);
          clashingCandidateIds.add(candId);

          if (!clashesByProgramId[a.programId]) clashesByProgramId[a.programId] = [];
          clashesByProgramId[a.programId].push(clash);

          if (!clashesByProgramId[b.programId]) clashesByProgramId[b.programId] = [];
          clashesByProgramId[b.programId].push(clash);
        }
      }
    }
  }

  return {
    clashes,
    clashesByProgramId,
    clashCandidateCount: clashingCandidateIds.size,
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

/**
 * Deduce the saved buffer gap (in minutes) between consecutive scheduled programs in a venue.
 * Returns the detected buffer gap (e.g. 0, 5, 10, 15, 20) or null if not enough data.
 */
export function detectVenueSavedBuffer(venuePrograms: any[]): number | null {
  if (!venuePrograms || venuePrograms.length < 2) return null;
  const progsWithTime = venuePrograms
    .filter(p => p.startTime && p.duration && p.type !== "BREAK")
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (progsWithTime.length >= 2) {
    for (let i = 0; i < progsWithTime.length - 1; i++) {
      const p1 = progsWithTime[i];
      const p2 = progsWithTime[i + 1];
      const endP1 = new Date(p1.startTime).getTime() + (p1.duration || 10) * 60000;
      const startP2 = new Date(p2.startTime).getTime();
      const diffMinutes = Math.round((startP2 - endP1) / 60000);
      if (diffMinutes >= 0 && diffMinutes <= 60) {
        return diffMinutes;
      }
    }
  }
  return null;
}


// --- Clash Severity System ----------------------------------------------------

export type ClashSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "MANAGEABLE";

export interface ScoredClash extends CandidateClash {
  severity: ClashSeverity;
  severityLabel: string;
  severityColor: string;
  severityIcon: string;
  explanation: string;
  /** true if the auto-fix tool can resolve this by reordering slots */
  isAutoFixable: boolean;
  program1Type?: string;
  program2Type?: string;
  program1DurationMode?: string;
  program2DurationMode?: string;
  simultaneousCount?: number; // for CRITICAL  how many individual programs clash at once
}

/**
 * Extends existing clash detection with severity scoring.
 *
 * Severity rules (as specified):
 *  CRITICAL    3+ INDIVIDUAL programs at the same time in different venues
 *  HIGH        FIXED/durationMode="FIXED" program + any INDIVIDUAL at same time
 *  MEDIUM      2 INDIVIDUAL programs overlap a GROUP program time window
 *  MANAGEABLE  1 INDIVIDUAL vs 1 INDIVIDUAL (different venues, adjustable by slot position)
 */
export function detectClashesBySeverity(
  venueTimelines: Record<string, CalculatedProgramSlot[]>,
  targetZoneId?: string | null
): {
  scoredClashes: ScoredClash[];
  clashCandidateCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  manageableCount: number;
  clashesByProgramId: Record<string, ScoredClash[]>;
} {
  // -- 1. Build per-candidate timeline of appearances --------------------------
  type Appearance = {
    candidateId: string;
    candidateName: string;
    chestNumber?: string | null;
    programId: string;
    programName: string;
    programType: string;
    durationMode: string;
    venue: string;
    start: Date;
    end: Date;
    assignmentId?: string;
    slotNumber?: number | null;
  };

  const candidateAppearances = new Map<string, Appearance[]>();

  for (const [venue, slots] of Object.entries(venueTimelines)) {
    if (!venue || venue === "Unassigned") continue;
    for (const slot of slots) {
      if (slot.program.type === "BREAK") continue;
      const progType = (slot.program.type || "INDIVIDUAL").toUpperCase();
      const durMode = (slot.program.durationMode || "AUTO").toUpperCase();
      const zoneCands = getZoneCandidatesForProgram(slot.program.assignments || [], targetZoneId);

      for (const asn of zoneCands) {
        const cand = asn.candidate;
        if (!cand?.id) continue;

        const list = candidateAppearances.get(cand.id) || [];
        // For individual programs, use the slot's scheduledTime if available
        const slotStart = asn.scheduledTime
          ? new Date(asn.scheduledTime)
          : slot.predictedStart;
        const slotEnd = new Date(slotStart.getTime() + (slot.durationPerItem || 10) * 60000);

        list.push({
          candidateId: cand.id,
          candidateName: (cand as any).name || "Candidate",
          chestNumber: (cand as any).chestNumber || null,
          programId: slot.program.id,
          programName: slot.program.name,
          programType: progType,
          durationMode: durMode,
          venue,
          start: slotStart,
          end: slotEnd,
          assignmentId: asn.id,
          slotNumber: asn.slotNumber,
        });
        candidateAppearances.set(cand.id, list);
      }
    }
  }

  // -- 2. Find overlapping pairs ------------------------------------------------
  const scored: ScoredClash[] = [];
  const clashesByProgramId: Record<string, ScoredClash[]> = {};
  const clashingCandidateIds = new Set<string>();

  for (const [, appearances] of candidateAppearances.entries()) {
    if (appearances.length < 2) continue;

    for (let i = 0; i < appearances.length; i++) {
      for (let j = i + 1; j < appearances.length; j++) {
        const a = appearances[i];
        const b = appearances[j];

        if (a.venue === b.venue && a.programId === b.programId) continue;
        const startA = a.start.getTime(), endA = a.end.getTime();
        const startB = b.start.getTime(), endB = b.end.getTime();
        if (!(startA < endB && startB < endA)) continue;

        const overlapMs = Math.min(endA, endB) - Math.max(startA, startB);
        const overlapMinutes = Math.round(overlapMs / 60000);

        // -- Determine severity -----------------------------------------------
        const aFixed = a.durationMode === "FIXED" || a.durationMode === "TOTAL_FIXED";
        const bFixed = b.durationMode === "FIXED" || b.durationMode === "TOTAL_FIXED";
        const aInd = a.programType === "INDIVIDUAL";
        const bInd = b.programType === "INDIVIDUAL";
        const aGroup = a.programType === "GROUP" || a.programType === "GENERAL" || a.programType === "INSTITUTION";
        const bGroup = b.programType === "GROUP" || b.programType === "GENERAL" || b.programType === "INSTITUTION";

        // Count how many INDIVIDUAL programs this candidate has at this time window
        const overlapWindow = appearances.filter(x =>
          x.programType === "INDIVIDUAL" &&
          x.start.getTime() < endB && x.end.getTime() > startA
        );

        let severity: ClashSeverity;
        let severityLabel: string;
        let severityColor: string;
        let severityIcon: string;
        let explanation: string;
        let isAutoFixable = false;

        if (overlapWindow.length >= 3) {
          severity = "CRITICAL";
          severityLabel = "Critical  Multiple Simultaneous Individual Slots";
          severityColor = "#ef4444";
          severityIcon = "??";
          explanation = `${overlapWindow.length} individual programs overlap at the same time. Candidate cannot be in multiple venues simultaneously.`;
          isAutoFixable = false;
        } else if (aFixed || bFixed) {
          severity = "HIGH";
          severityLabel = "High  Fixed-Time Conflict";
          severityColor = "#f97316";
          severityIcon = "??";
          const fixedName = aFixed ? a.programName : b.programName;
          explanation = `"${fixedName}" has a fixed start time. Candidate must be present  cannot adjust slot position.`;
          isAutoFixable = false;
        } else if ((aInd && bGroup) || (bInd && aGroup)) {
          severity = "MEDIUM";
          severityLabel = "Medium  Individual vs Group";
          severityColor = "#eab308";
          severityIcon = "??";
          const indName = aInd ? a.programName : b.programName;
          const grpName = aGroup ? a.programName : b.programName;
          explanation = `"${indName}" (individual) overlaps with "${grpName}" (group). Group programs have flexibility  try adjusting buffer or ordering.`;
          isAutoFixable = true;
        } else if (aInd && bInd) {
          severity = "MANAGEABLE";
          severityLabel = "Manageable  Two Individual Programs";
          severityColor = "#22c55e";
          severityIcon = "??";
          explanation = `Candidate can perform first in ${a.venue}, then last in ${b.venue} (or vice versa). Adjustable via slot reordering.`;
          isAutoFixable = true;
        } else {
          severity = "MEDIUM";
          severityLabel = "Medium  Scheduling Overlap";
          severityColor = "#eab308";
          severityIcon = "??";
          explanation = `Time overlap of ${overlapMinutes} min between "${a.programName}" and "${b.programName}".`;
          isAutoFixable = true;
        }

        const sc: ScoredClash = {
          candidateId: a.candidateId,
          candidateName: a.candidateName,
          chestNumber: a.chestNumber,
          program1Id: a.programId,
          program1Name: a.programName,
          program1Venue: a.venue,
          program1Start: a.start,
          program1End: a.end,
          program2Id: b.programId,
          program2Name: b.programName,
          program2Venue: b.venue,
          program2Start: b.start,
          program2End: b.end,
          overlapMinutes,
          severity,
          severityLabel,
          severityColor,
          severityIcon,
          explanation,
          isAutoFixable,
          program1Type: a.programType,
          program2Type: b.programType,
          program1DurationMode: a.durationMode,
          program2DurationMode: b.durationMode,
          simultaneousCount: overlapWindow.length,
        };

        scored.push(sc);
        clashingCandidateIds.add(a.candidateId);

        if (!clashesByProgramId[a.programId]) clashesByProgramId[a.programId] = [];
        clashesByProgramId[a.programId].push(sc);
        if (!clashesByProgramId[b.programId]) clashesByProgramId[b.programId] = [];
        clashesByProgramId[b.programId].push(sc);
      }
    }
  }

  // Sort: CRITICAL first, then HIGH, MEDIUM, MANAGEABLE
  const order: Record<ClashSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, MANAGEABLE: 3 };
  scored.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    scoredClashes: scored,
    clashCandidateCount: clashingCandidateIds.size,
    criticalCount: scored.filter(c => c.severity === "CRITICAL").length,
    highCount: scored.filter(c => c.severity === "HIGH").length,
    mediumCount: scored.filter(c => c.severity === "MEDIUM").length,
    manageableCount: scored.filter(c => c.severity === "MANAGEABLE").length,
    clashesByProgramId,
  };
}
