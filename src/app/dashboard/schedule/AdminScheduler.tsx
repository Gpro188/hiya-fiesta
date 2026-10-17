"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import ZoneScheduleAnalyzer from "./ZoneScheduleAnalyzer";
import { 
  getZoneCandidatesForProgram, 
  calculateDynamicProgramDuration,
  getFestivalBaseDate,
  detectCandidateScheduleClashes,
  detectClashesBySeverity,
  formatTimeAmPm,
  CandidateClash,
  ScoredClash,
  detectVenueSavedBuffer
} from "@/lib/scheduleCalculator";

import { 
  updateProgramSchedule, 
  addBreak, 
  autoGenerateSchedule, 
  renameVenue,
  deleteVenue,
  applySequentialVenueSchedule,
  publishMasterScheduleToAllZones,
  publishZoneSchedule,
  unpublishSchedule,
  getGlobalScheduleSettings,
  saveGlobalScheduleSettings,
  getScheduleClashAnalysis,
  resolveManageableClashes,
  resolveClashesSafe
} from "./actions";

export default function AdminScheduler({ 
  initialPrograms, 
  eventId, 
  targetZoneId = null,
  isSuperAdmin = false,
  eventStatusOverride = "AUTO",
  eventStartDate = null,
  eventEndDate = null,
  isCollab = false
}: { 
  initialPrograms: any[], 
  eventId: string, 
  targetZoneId?: string | null,
  allJudges?: any[],
  isSuperAdmin?: boolean,
  eventStatusOverride?: string,
  eventStartDate?: string | null,
  eventEndDate?: string | null,
  isCollab?: boolean
}) {
  const [programs, setPrograms] = useState<any[]>(initialPrograms);
  const [statusOverride, setStatusOverride] = useState(eventStatusOverride);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [newVenueName, setNewVenueName] = useState("");
  const [localVenues, setLocalVenues] = useState<string[]>([]);
  
  // Active stage tab: "ALL", a specific venue like "Stage 1", or "Unassigned"
  const [activeStageTab, setActiveStageTab] = useState<string>("ALL");
  
  // Multi-selected program IDs for batch actions (e.g. moving to Stage 1)
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [batchTargetStage, setBatchTargetStage] = useState<string>("");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categoryOrder = ["All", "FADHILA", "FADHEELA", "GENERAL PROGRAMS"];

  // Collaborative Fest Filter (All / State Final / Fadheela PG)
  const isCollabMode = Boolean(isCollab || eventId === "collab_state_pg" || eventId === "collab");
  const [selectedFest, setSelectedFest] = useState<"ALL" | "STATE" | "PG">("ALL");
  const stateProgCount = useMemo(() => programs.filter(p => p.festType === "STATE").length, [programs]);
  const pgProgCount = useMemo(() => programs.filter(p => p.festType === "PG").length, [programs]);

  // Venue buffer configuration: { [venue]: bufferMinutes }
  const [venueBuffers, setVenueBuffers] = useState<Record<string, number>>({});

  // Venue start time configuration: { [venue]: "09:30" }
  const [venueStartTimes, setVenueStartTimes] = useState<Record<string, string>>({});

  // Venue break configuration: { [venue]: { enabled: boolean; start: string; end: string } }
  const [venueBreaks, setVenueBreaks] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({});

  // Venue date configuration: { [venue]: "2026-10-20" }
  const [venueDates, setVenueDates] = useState<Record<string, string>>({});

  // -- Global Schedule Timing Settings ------------------------------------------
  const [globalTimingOpen, setGlobalTimingOpen] = useState(false);
  const [globalMinPerCandidate, setGlobalMinPerCandidate] = useState(10);
  const [globalBufferMinutes, setGlobalBufferMinutes] = useState(2);
  const [globalGroupFixedMin, setGlobalGroupFixedMin] = useState(30);
  const [globalStartTime, setGlobalStartTime] = useState("09:30");
  const [globalEnableBreak, setGlobalEnableBreak] = useState(true);
  const [globalBreakStart, setGlobalBreakStart] = useState("13:00");
  const [globalBreakEnd, setGlobalBreakEnd] = useState("13:45");
  const [globalTimingSaving, setGlobalTimingSaving] = useState(false);
  const [globalTimingMsg, setGlobalTimingMsg] = useState<string | null>(null);

  // -- Clash Analysis ------------------------------------------------------------
  const [clashPanelOpen, setClashPanelOpen] = useState(false);
  const [clashLoading, setClashLoading] = useState(false);
  const [clashFixLoading, setClashFixLoading] = useState(false);
  const [scoredClashes, setScoredClashes] = useState<ScoredClash[]>([]);
  const [clashStats, setClashStats] = useState<{critical:number;high:number;medium:number;manageable:number}>({critical:0,high:0,medium:0,manageable:0});
  const [clashMsg, setClashMsg] = useState<string | null>(null);

  // Per-item saved notification map: { [programId]: "Saved! ✅" }
  const [savedItemMap, setSavedItemMap] = useState<Record<string, string>>({});

  // Candidate Collision Inspector state
  const [collisionInspectorOpen, setCollisionInspectorOpen] = useState(true);
  const [collisionViewMode, setCollisionViewMode] = useState<"CANDIDATES" | "SEVERITY">("CANDIDATES");
  const [collisionSearch, setCollisionSearch] = useState<string>("");

  // Load saved venue buffer gaps and start times from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`venue_buffers_${eventId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setVenueBuffers(parsed);
        }
      }
      const savedTimes = localStorage.getItem(`venue_start_times_${eventId}`);
      if (savedTimes) {
        const parsedTimes = JSON.parse(savedTimes);
        if (parsedTimes && typeof parsedTimes === "object") {
          setVenueStartTimes(parsedTimes);
        }
      }
      const savedBreaks = localStorage.getItem(`venue_breaks_${eventId}`);
      if (savedBreaks) {
        const parsedBreaks = JSON.parse(savedBreaks);
        if (parsedBreaks && typeof parsedBreaks === "object") {
          setVenueBreaks(parsedBreaks);
        }
      }
      const savedDates = localStorage.getItem(`venue_dates_${eventId}`);
      if (savedDates) {
        const parsedDates = JSON.parse(savedDates);
        if (parsedDates && typeof parsedDates === "object") {
          setVenueDates(parsedDates);
        }
      }
    } catch (e) {
      console.error("Failed to load venue configs from localStorage:", e);
    }
  }, [eventId]);

  // Load global schedule timing settings on mount
  useEffect(() => {
    getGlobalScheduleSettings()
      .then(res => {
        if (res && res.success) {
          if (res.minPerCandidate) setGlobalMinPerCandidate(res.minPerCandidate);
          if (res.bufferMinutes !== undefined) setGlobalBufferMinutes(res.bufferMinutes);
          if (res.groupFixedMin) setGlobalGroupFixedMin(res.groupFixedMin);
        }
      })
      .catch(err => console.error("Failed to load global schedule settings:", err));
  }, []);

  const handleSaveGlobalTiming = async (applyToAllZones: boolean) => {
    setGlobalTimingSaving(true);
    setGlobalTimingMsg(null);
    try {
      const res = await saveGlobalScheduleSettings({
        minPerCandidate: globalMinPerCandidate,
        bufferMinutes: globalBufferMinutes,
        groupFixedMin: globalGroupFixedMin,
        applyToAllZones,
        defaultStartTime: globalStartTime,
        enableBreak: globalEnableBreak,
        breakStartTime: globalBreakStart,
        breakEndTime: globalBreakEnd,
      });
      if (res.success) {
        const anyRes = res as any;
        const msg = applyToAllZones
          ? `✅ Saved & Synchronized to all zones! (${anyRes.totalPrograms ?? 0} programs updated across ${anyRes.updatedZones ?? "all"} zones)`
          : `✅ Global schedule settings saved successfully.`;
        setGlobalTimingMsg(msg);
        if (applyToAllZones) {
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        setGlobalTimingMsg(`❌ Error: ${res.error || "Failed to save settings"}`);
      }
    } catch (e: any) {
      setGlobalTimingMsg(`❌ Error: ${e.message || "Failed to save settings"}`);
    } finally {
      setGlobalTimingSaving(false);
    }
  };

  const handleResolveManageableClashes = async () => {
    if (!confirm("Automatically resolve candidate clashes?\n\nThis will reorder slots and adjust buffer gaps (5–15 mins) within venues. Program durations, fixed times, and venues are 100% PRESERVED and NEVER changed.")) return;
    setClashFixLoading(true);
    setClashMsg(null);
    try {
      const res = await resolveClashesSafe(eventId);
      if (res.success) {
        setClashMsg(res.message || "Clashes resolved successfully!");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setClashMsg(`❌ ${res.error || "Failed to resolve clashes"}`);
      }
    } catch (e: any) {
      setClashMsg(`❌ ${e.message || "Error resolving clashes"}`);
    } finally {
      setClashFixLoading(false);
    }
  };

  // Sync state when props change
  useEffect(() => {
    setPrograms(initialPrograms);
  }, [initialPrograms]);

  // Extract all distinct venue names
  const allVenues = useMemo(() => {
    const venues = new Set<string>();
    localVenues.forEach(v => venues.add(v));
    programs.forEach(p => {
      if (p.venue && p.venue.trim()) venues.add(p.venue.trim());
    });
    return Array.from(venues).sort();
  }, [programs, localVenues]);

  // Set default batch target stage if not set
  useEffect(() => {
    if (!batchTargetStage && allVenues.length > 0) {
      setBatchTargetStage(allVenues[0]);
    }
  }, [allVenues, batchTargetStage]);

  const handleAddVenue = () => {
    const clean = newVenueName.trim();
    if (clean && !allVenues.includes(clean)) {
      setLocalVenues(prev => [...prev, clean]);
      setNewVenueName("");
      setActiveStageTab(clean);
    }
  };

  // Group programs by venue
  const groupedPrograms = useMemo(() => {
    const map: Record<string, any[]> = {};
    allVenues.forEach(v => map[v] = []);
    map["Unassigned"] = [];

    const filtered = programs.filter(p => {
      if (p.stageType && p.stageType !== "ON_STAGE" && p.type !== "BREAK") return false;
      let cat = "GENERAL PROGRAMS";
      if (p.type === "GENERAL") cat = "GENERAL PROGRAMS";
      else if (p.category?.name) cat = p.category.name.toUpperCase();
      const matchCat = selectedCategory === "All" || cat === selectedCategory;
      const matchFest = selectedFest === "ALL" || (p.festType ? p.festType === selectedFest : true);
      return matchCat && matchFest;
    });

    filtered.forEach(p => {
      const v = p.venue && allVenues.includes(p.venue) ? p.venue : "Unassigned";
      if (!map[v]) map[v] = [];
      map[v].push(p);
    });

    return map;
  }, [programs, allVenues, selectedCategory, selectedFest]);

  // Derive available festival days (e.g. Day 1, Day 2)
  const festivalDays = useMemo(() => {
    const parseToIstDate = (dInput: string | Date | null | undefined) => {
      if (!dInput) return null;
      const d = typeof dInput === "string" ? new Date(dInput) : dInput;
      if (isNaN(d.getTime())) return null;
      return d;
    };

    const startD = parseToIstDate(eventStartDate) || new Date("2026-10-20T09:00:00+05:30");
    const endD = parseToIstDate(eventEndDate) || startD;

    const getIstYmd = (d: Date) => {
      return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
    };

    const days: Array<{ dayNumber: number; dateStr: string; label: string; shortLabel: string }> = [];
    const cur = new Date(startD.getTime());
    let dayNum = 1;
    const seenYmd = new Set<string>();

    for (let i = 0; i < 7; i++) {
      const ymd = getIstYmd(cur);
      if (!seenYmd.has(ymd)) {
        seenYmd.add(ymd);
        const weekday = cur.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" });
        const dayMonth = cur.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
        days.push({
          dayNumber: dayNum,
          dateStr: ymd,
          label: `Day ${dayNum} (${weekday}, ${dayMonth})`,
          shortLabel: `Day ${dayNum} (${dayMonth})`
        });
        dayNum++;
      }

      if (getIstYmd(cur) >= getIstYmd(endD) && i >= 1) {
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (days.length === 1) {
      const nextDay = new Date(cur.getTime());
      const ymd2 = getIstYmd(nextDay);
      const weekday2 = nextDay.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" });
      const dayMonth2 = nextDay.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
      days.push({
        dayNumber: 2,
        dateStr: ymd2,
        label: `Day 2 (${weekday2}, ${dayMonth2})`,
        shortLabel: `Day 2 (${dayMonth2})`
      });
    }

    return days;
  }, [eventStartDate, eventEndDate]);

  // Helper to detect saved venue date from scheduled programs
  const detectVenueSavedDate = (venuePrograms: any[]): string | null => {
    if (!venuePrograms || venuePrograms.length === 0) return null;
    const progsWithTime = venuePrograms
      .filter(p => p.startTime)
      .slice()
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    if (progsWithTime.length > 0) {
      const firstTime = new Date(progsWithTime[0].startTime);
      if (!isNaN(firstTime.getTime())) {
        return firstTime.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      }
    }
    return null;
  };

  const getVenueDate = (venue: string, venuePrograms?: any[]): string => {
    if (venueDates[venue]) {
      return venueDates[venue];
    }
    const progs = venuePrograms || groupedPrograms[venue] || [];
    const detected = detectVenueSavedDate(progs);
    if (detected) {
      return detected;
    }
    return festivalDays[0]?.dateStr || "2026-10-20";
  };

  // Helper to detect saved venue start time from the first scheduled program
  const detectVenueSavedStartTime = (venuePrograms: any[]): string | null => {
    if (!venuePrograms || venuePrograms.length === 0) return null;
    const progsWithTime = venuePrograms
      .filter(p => p.startTime)
      .slice()
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    if (progsWithTime.length > 0) {
      const firstTime = new Date(progsWithTime[0].startTime);
      if (!isNaN(firstTime.getTime())) {
        const istTimeStr = firstTime.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit"
        });
        return istTimeStr;
      }
    }
    return null;
  };

  const getVenueStartTime = (venue: string, venuePrograms?: any[]): string => {
    if (venueStartTimes[venue]) {
      return venueStartTimes[venue];
    }
    const progs = venuePrograms || groupedPrograms[venue] || [];
    const detected = detectVenueSavedStartTime(progs);
    if (detected) {
      return detected;
    }
    return "09:30"; // Default 09:30 AM
  };

  // Helper to get active break config for a venue
  const getVenueBreak = (venue: string): { enabled: boolean; start: string; end: string } => {
    if (venueBreaks[venue]) {
      return venueBreaks[venue];
    }
    return { enabled: true, start: "13:00", end: "13:45" };
  };

  // Helper to get predicted sequential timeline starting from venue start time and respecting breaks and festival day
  const getPredictedVenueTimeline = (
    venue: string, 
    venuePrograms: any[], 
    bufferMinutes: number = 5, 
    customStartTime?: string,
    customBreak?: { enabled: boolean; start: string; end: string },
    customDate?: string
  ) => {
    const targetDateStr = customDate || getVenueDate(venue, venuePrograms);
    const startTimeStr = customStartTime || getVenueStartTime(venue, venuePrograms);
    const [sh, sm] = startTimeStr.split(":").map(Number);
    const baseDate = getFestivalBaseDate(targetDateStr, isNaN(sh) ? 9 : sh, isNaN(sm) ? 30 : sm);
    let currentCursor = new Date(baseDate.getTime());
    let totalCandidates = 0;

    const breakConfig = customBreak || getVenueBreak(venue);
    let breakStartDate: Date | null = null;
    let breakEndDate: Date | null = null;

    if (breakConfig.enabled && breakConfig.start && breakConfig.end) {
      const [bsh, bsm] = breakConfig.start.split(":").map(Number);
      const [beh, bem] = breakConfig.end.split(":").map(Number);

      breakStartDate = getFestivalBaseDate(baseDate, isNaN(bsh) ? 13 : bsh, isNaN(bsm) ? 0 : bsm);
      breakEndDate = getFestivalBaseDate(baseDate, isNaN(beh) ? 13 : beh, isNaN(bem) ? 45 : bem);

      if (breakEndDate.getTime() <= breakStartDate.getTime()) {
        breakEndDate = new Date(breakStartDate.getTime() + 45 * 60000);
      }
    }

    const isBreakBeforeStart = Boolean(
      breakConfig.enabled && 
      breakStartDate && 
      breakStartDate.getTime() < baseDate.getTime()
    );

    const predictedList = venuePrograms.map((p, idx) => {
      const zoneCandidates = getZoneCandidatesForProgram(p.assignments, targetZoneId);
      const calcInfo = calculateDynamicProgramDuration(p, zoneCandidates, { targetZoneId });

      totalCandidates += calcInfo.candidateCount;
      const effectiveDuration = p.duration && p.duration > 0 ? p.duration : (calcInfo.duration > 0 ? calcInfo.duration : 10);

      // If program has an explicit/saved startTime, honor its exact date and time!
      let start: Date;
      let end: Date;
      let isFirstAfterBreak = false;

      if (p.startTime) {
        const explicitDate = new Date(p.startTime);
        if (!isNaN(explicitDate.getTime())) {
          start = explicitDate;
          end = new Date(start.getTime() + effectiveDuration * 60000);
          currentCursor = new Date(end.getTime() + bufferMinutes * 60000);
        } else {
          start = new Date(currentCursor.getTime());
          end = new Date(start.getTime() + effectiveDuration * 60000);
          currentCursor = new Date(end.getTime() + bufferMinutes * 60000);
        }
      } else {
        // Check if this program needs to jump across the break window
        if (breakConfig.enabled && breakStartDate && breakEndDate) {
          if (currentCursor >= breakStartDate && currentCursor < breakEndDate) {
            currentCursor = new Date(breakEndDate.getTime());
            isFirstAfterBreak = true;
          } else if (currentCursor < breakStartDate && (currentCursor.getTime() + effectiveDuration * 60000) > breakStartDate.getTime()) {
            currentCursor = new Date(breakEndDate.getTime());
            isFirstAfterBreak = true;
          }
        }

        start = new Date(currentCursor.getTime());
        end = new Date(start.getTime() + effectiveDuration * 60000);
        currentCursor = new Date(end.getTime() + bufferMinutes * 60000);
      }

      return {
        program: p,
        index: idx + 1,
        predictedStart: start,
        predictedEnd: end,
        duration: effectiveDuration,
        candidateCount: calcInfo.candidateCount,
        teamCount: calcInfo.teamCount,
        durationPerItem: calcInfo.durationPerItem,
        durationMode: p.durationMode || calcInfo.durationMode,
        filteredAssignments: zoneCandidates,
        isFirstAfterBreak
      };
    });

    const totalDurationMinutes = predictedList.reduce((acc, p) => acc + p.duration, 0) + 
      Math.max(0, predictedList.length - 1) * bufferMinutes;

    const finalEndTime = predictedList.length > 0 ? predictedList[predictedList.length - 1].predictedEnd : baseDate;

    return {
      predictedList,
      totalDurationMinutes,
      totalCandidates,
      predictedStart: baseDate,
      predictedEnd: finalEndTime,
      breakStartDate,
      breakEndDate,
      breakEnabled: breakConfig.enabled,
      isBreakBeforeStart
    };
  };

  // Helper to get active buffer for a venue (from state, localStorage, or detected from saved programs)
  const getVenueBuffer = (venue: string, venuePrograms?: any[]): number => {
    if (venueBuffers[venue] !== undefined) {
      return venueBuffers[venue];
    }
    const progs = venuePrograms || groupedPrograms[venue] || [];
    const detected = detectVenueSavedBuffer(progs);
    if (detected !== null) {
      return detected;
    }
    return 5;
  };

  // Change buffer gap for a venue, persist to localStorage, and recalculate
  const handleVenueBufferChange = (venue: string, newBuffer: number) => {
    setVenueBuffers(prev => {
      const updated = { ...prev, [venue]: newBuffer };
      try {
        localStorage.setItem(`venue_buffers_${eventId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Also update start times in state with the new buffer so live preview updates immediately
    const venueProgs = groupedPrograms[venue] || [];
    if (venueProgs.length > 0) {
      const startTimeStr = getVenueStartTime(venue, venueProgs);
      const breakConfig = getVenueBreak(venue);
      const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, newBuffer, startTimeStr, breakConfig);
      const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));
      setPrograms(prev => prev.map(p => {
        if (updateMap.has(p.id)) {
          return { ...p, startTime: updateMap.get(p.id) };
        }
        return p;
      }));
    }
  };

  // Change start time for a venue, persist to localStorage, and recalculate
  const handleVenueStartTimeChange = (venue: string, newTime: string) => {
    setVenueStartTimes(prev => {
      const updated = { ...prev, [venue]: newTime };
      try {
        localStorage.setItem(`venue_start_times_${eventId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const venueProgs = groupedPrograms[venue] || [];
    if (venueProgs.length > 0) {
      const buf = getVenueBuffer(venue, venueProgs);
      const breakConfig = getVenueBreak(venue);
      const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf, newTime, breakConfig);
      const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));
      setPrograms(prev => prev.map(p => {
        if (updateMap.has(p.id)) {
          return { ...p, startTime: updateMap.get(p.id) };
        }
        return p;
      }));
    }
  };

  // Change break configuration for a venue, persist to localStorage, and recalculate
  const handleVenueBreakChange = (venue: string, newBreak: { enabled: boolean; start: string; end: string }) => {
    setVenueBreaks(prev => {
      const updated = { ...prev, [venue]: newBreak };
      try {
        localStorage.setItem(`venue_breaks_${eventId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const venueProgs = groupedPrograms[venue] || [];
    if (venueProgs.length > 0) {
      const buf = getVenueBuffer(venue, venueProgs);
      const startTimeStr = getVenueStartTime(venue, venueProgs);
      const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf, startTimeStr, newBreak);
      const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));
      setPrograms(prev => prev.map(p => {
        if (updateMap.has(p.id)) {
          return { ...p, startTime: updateMap.get(p.id) };
        }
        return p;
      }));
    }
  };

  // Change date (Day 1 vs Day 2) for a venue, persist to localStorage, and recalculate
  const handleVenueDateChange = (venue: string, newDateStr: string) => {
    setVenueDates(prev => {
      const updated = { ...prev, [venue]: newDateStr };
      try {
        localStorage.setItem(`venue_dates_${eventId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const venueProgs = groupedPrograms[venue] || [];
    if (venueProgs.length > 0) {
      const buf = getVenueBuffer(venue, venueProgs);
      const startTimeStr = getVenueStartTime(venue, venueProgs);
      const breakConfig = getVenueBreak(venue);
      const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf, startTimeStr, breakConfig, newDateStr);
      const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));
      setPrograms(prev => prev.map(p => {
        if (updateMap.has(p.id)) {
          return { ...p, startTime: updateMap.get(p.id) };
        }
        return p;
      }));
    }
  };

  // Compute calculated timelines for all venues
  const allVenueTimelines = useMemo(() => {
    const timelines: Record<string, any[]> = {};
    for (const v of allVenues) {
      const vProgs = groupedPrograms[v] || [];
      const buf = getVenueBuffer(v, vProgs);
      const startTimeStr = getVenueStartTime(v, vProgs);
      const breakConfig = getVenueBreak(v);
      const venueDateStr = getVenueDate(v, vProgs);
      const { predictedList } = getPredictedVenueTimeline(v, vProgs, buf, startTimeStr, breakConfig, venueDateStr);
      timelines[v] = predictedList;
    }
    return timelines;
  }, [groupedPrograms, allVenues, venueBuffers, venueStartTimes, venueBreaks, venueDates, eventStartDate, eventEndDate, targetZoneId]);

  // Live Real-Time Candidate Clash Detection
  const { clashes, clashesByProgramId, clashCandidateCount } = useMemo(() => {
    return detectCandidateScheduleClashes(allVenueTimelines, targetZoneId);
  }, [allVenueTimelines, targetZoneId]);

  // Live Clash Severity Analysis (4 levels: Critical, High, Medium, Manageable)
  const {
    scoredClashes: liveScoredClashes,
    criticalCount,
    highCount,
    mediumCount,
    manageableCount,
    clashesByProgramId: scoredClashesByProgramId,
  } = useMemo(() => {
    return detectClashesBySeverity(allVenueTimelines, targetZoneId);
  }, [allVenueTimelines, targetZoneId]);

  // Group candidate collisions by Candidate for transparent inspection
  const clashesByCandidate = useMemo(() => {
    const map = new Map<string, {
      candidateId: string;
      candidateName: string;
      chestNumber?: string | null;
      institutionName?: string | null;
      zoneName?: string | null;
      clashes: CandidateClash[];
    }>();

    for (const c of clashes) {
      if (!map.has(c.candidateId)) {
        map.set(c.candidateId, {
          candidateId: c.candidateId,
          candidateName: c.candidateName,
          chestNumber: c.chestNumber,
          institutionName: c.institutionName,
          zoneName: c.zoneName,
          clashes: []
        });
      }
      map.get(c.candidateId)!.clashes.push(c);
    }

    return Array.from(map.values());
  }, [clashes]);

  // Helper to extract program's scheduled or fallback IST date string: "YYYY-MM-DD"
  const getItemDateStr = useCallback((program: any, fallbackDateStr?: string): string => {
    if (program.startTime) {
      const d = new Date(program.startTime);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      }
    }
    return fallbackDateStr || festivalDays[0]?.dateStr || "2026-10-20";
  }, [festivalDays]);

  // Helper to extract program's scheduled or fallback IST time string: "HH:mm"
  const getItemTimeStr = useCallback((program: any, fallbackTime?: Date | null): string => {
    const d = program.startTime ? new Date(program.startTime) : fallbackTime;
    if (!d || isNaN(d.getTime())) return "09:30";
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  }, []);

  // Helper to construct ISO timestamp in Asia/Kolkata from dateStr ("YYYY-MM-DD") and timeStr ("HH:mm")
  const combineDateAndTime = useCallback((dateStr: string, timeStr: string): string => {
    const [sh, sm] = (timeStr || "09:30").split(":").map(Number);
    const hour = isNaN(sh) ? 9 : sh;
    const minute = isNaN(sm) ? 30 : sm;
    const baseDate = getFestivalBaseDate(dateStr, hour, minute);
    return baseDate.toISOString();
  }, []);

  // Handler to update a single item's schedule (Date and/or Start Time) in local state
  const handleItemScheduleChange = useCallback((programId: string, newDateStr: string, newTimeStr: string) => {
    const targetIso = combineDateAndTime(newDateStr, newTimeStr);
    setPrograms(prev => prev.map(p => {
      if (p.id === programId) {
        return { ...p, startTime: targetIso };
      }
      return p;
    }));
  }, [combineDateAndTime]);

  // Handler to immediately save a single program's schedule to the database
  const handleSaveItem = useCallback(async (program: any, venue: string, item: any) => {
    setLoadingId(program.id);
    try {
      const vSelect = (document.getElementById(`venue-${program.id}`) as HTMLSelectElement | null)?.value || program.venue || venue;
      const targetVenue = vSelect === "Unassigned" ? null : vSelect;
      const modeSelect = document.getElementById(`mode-${program.id}`) as HTMLSelectElement | null;
      const modeVal = modeSelect?.value || program.durationMode || "AUTO";
      const durInput = document.getElementById(`dur-${program.id}`) as HTMLInputElement | null;
      const enteredMins = parseInt(durInput?.value || "5") || (program.duration || 10);

      let d = enteredMins;
      if (modeVal === "PER_TEAM") {
        d = item.teamCount > 0 ? item.teamCount * enteredMins : enteredMins;
      } else if (modeVal === "PER_CANDIDATE") {
        d = item.candidateCount > 0 ? item.candidateCount * enteredMins : enteredMins;
      }

      const curDate = getItemDateStr(program, getVenueDate(venue));
      const curTime = getItemTimeStr(program, item.predictedStart);
      const targetIso = combineDateAndTime(curDate, curTime);
      const s = program.stageType || "ON_STAGE";

      await updateProgramSchedule(program.id, {
        venue: targetVenue,
        startTime: targetVenue ? targetIso : null,
        duration: d,
        durationMode: modeVal,
        stageType: s
      }, eventId);

      // Update local state to ensure it stays in sync
      setPrograms(prev => prev.map(p => p.id === program.id ? {
        ...p,
        venue: targetVenue,
        startTime: targetVenue ? targetIso : null,
        duration: d,
        durationMode: modeVal
      } : p));

      setSavedItemMap(prev => ({ ...prev, [program.id]: "Saved! ✅" }));
      setTimeout(() => {
        setSavedItemMap(prev => ({ ...prev, [program.id]: "" }));
      }, 3000);
    } catch (e: any) {
      alert("Error saving program: " + (e.message || "Unknown error"));
    } finally {
      setLoadingId(null);
    }
  }, [eventId, getItemDateStr, getItemTimeStr, combineDateAndTime, getVenueDate]);

  // Quick 1-click action: Move program to Day 2
  const handleQuickMoveToDay2 = useCallback(async (programId: string) => {
    const prog = programs.find(p => p.id === programId);
    if (!prog) return;
    const day2 = festivalDays[1]?.dateStr || "2026-10-21";
    const curTime = getItemTimeStr(prog, new Date());
    const newIso = combineDateAndTime(day2, curTime);
    
    setPrograms(prev => prev.map(p => p.id === programId ? { ...p, startTime: newIso } : p));
    
    try {
      const v = prog.venue === "Unassigned" ? null : prog.venue;
      await updateProgramSchedule(programId, {
        venue: v,
        startTime: v ? newIso : null,
        duration: prog.duration || 10,
        durationMode: prog.durationMode || "AUTO",
        stageType: prog.stageType || "ON_STAGE"
      }, eventId);
      setSavedItemMap(prev => ({ ...prev, [programId]: "Moved to Day 2! ✅" }));
      setTimeout(() => {
        setSavedItemMap(prev => ({ ...prev, [programId]: "" }));
      }, 3000);
    } catch (e) {
      console.error("Quick move to Day 2 failed:", e);
    }
  }, [programs, festivalDays, getItemTimeStr, combineDateAndTime, eventId]);

  // Quick 1-click action: Shift program time by X minutes
  const handleQuickShiftTime = useCallback(async (programId: string, shiftMinutes: number) => {
    const prog = programs.find(p => p.id === programId);
    if (!prog || !prog.startTime) return;
    const curD = new Date(prog.startTime);
    const newD = new Date(curD.getTime() + shiftMinutes * 60000);
    const newIso = newD.toISOString();
    
    setPrograms(prev => prev.map(p => p.id === programId ? { ...p, startTime: newIso } : p));
    try {
      const v = prog.venue === "Unassigned" ? null : prog.venue;
      await updateProgramSchedule(programId, {
        venue: v,
        startTime: v ? newIso : null,
        duration: prog.duration || 10,
        durationMode: prog.durationMode || "AUTO",
        stageType: prog.stageType || "ON_STAGE"
      }, eventId);
      setSavedItemMap(prev => ({ ...prev, [programId]: `Shifted +${shiftMinutes}m! ✅` }));
      setTimeout(() => {
        setSavedItemMap(prev => ({ ...prev, [programId]: "" }));
      }, 3000);
    } catch (e) {
      console.error("Shift time failed:", e);
    }
  }, [programs, eventId]);

  // Assign program to a venue
  const handleAssignVenue = async (programId: string, targetVenue: string) => {
    const v = targetVenue === "Unassigned" ? null : targetVenue;
    setPrograms(prev => prev.map(p => p.id === programId ? { ...p, venue: v } : p));
    try {
      await updateProgramSchedule(programId, {
        venue: v,
        startTime: null
      }, eventId);
    } catch (e) {
      console.error("Failed to assign venue:", e);
    }
  };

  // Batch assign selected programs to a venue
  const handleBatchAssignVenue = async (targetVenue: string) => {
    if (selectedProgramIds.size === 0) return;
    const v = targetVenue === "Unassigned" ? null : targetVenue;
    const ids = Array.from(selectedProgramIds);
    setLoadingId("batch-assign");
    try {
      setPrograms(prev => prev.map(p => ids.includes(p.id) ? { ...p, venue: v } : p));
      for (const id of ids) {
        await updateProgramSchedule(id, { venue: v, startTime: null }, eventId);
      }
      setSelectedProgramIds(new Set());
      if (v) setActiveStageTab(v);
    } catch (e) {
      console.error("Batch assign failed:", e);
    } finally {
      setLoadingId(null);
    }
  };

  // Reordering inside venue: instantly swaps and auto-saves the 9:00 AM sequential timings
  const handleMoveProgram = async (venue: string, currentIndex: number, direction: "up" | "down") => {
    const venueProgs = [...(groupedPrograms[venue] || [])];
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= venueProgs.length) return;

    const itemA = venueProgs[currentIndex];
    const itemB = venueProgs[targetIndex];
    venueProgs[currentIndex] = itemB;
    venueProgs[targetIndex] = itemA;

    const buf = getVenueBuffer(venue, venueProgs);
    const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf);
    const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));

    setPrograms(prev => {
      const venueIds = new Set(venueProgs.map(p => p.id));
      const otherProgs = prev.filter(p => !venueIds.has(p.id));
      const updatedVenueProgs = venueProgs.map(p => ({
        ...p,
        startTime: updateMap.get(p.id) || p.startTime,
        venue
      }));
      return [...otherProgs, ...updatedVenueProgs];
    });

    try {
      const updates = predictedList.map(item => ({
        id: item.program.id,
        startTime: item.predictedStart.toISOString(),
        duration: item.duration,
        durationMode: item.durationMode,
        stageType: item.program.stageType
      }));
      await applySequentialVenueSchedule(eventId, venue, updates);
    } catch (e) {
      console.error("Auto-save on move failed:", e);
    }
  };

  const handleJumpProgram = async (venue: string, currentIndex: number, targetIndex: number) => {
    const venueProgs = [...(groupedPrograms[venue] || [])];
    if (targetIndex < 0 || targetIndex >= venueProgs.length || targetIndex === currentIndex) return;
    const [removed] = venueProgs.splice(currentIndex, 1);
    venueProgs.splice(targetIndex, 0, removed);

    const buf = getVenueBuffer(venue, venueProgs);
    const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf);
    const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));

    setPrograms(prev => {
      const venueIds = new Set(venueProgs.map(p => p.id));
      const otherProgs = prev.filter(p => !venueIds.has(p.id));
      const updatedVenueProgs = venueProgs.map(p => ({
        ...p,
        startTime: updateMap.get(p.id) || p.startTime,
        venue
      }));
      return [...otherProgs, ...updatedVenueProgs];
    });

    try {
      const updates = predictedList.map(item => ({
        id: item.program.id,
        startTime: item.predictedStart.toISOString(),
        duration: item.duration,
        durationMode: item.durationMode,
        stageType: item.program.stageType
      }));
      await applySequentialVenueSchedule(eventId, venue, updates);
    } catch (e) {
      console.error("Auto-save on jump failed:", e);
    }
  };

  // Duration changes
  const handleDurationChange = (venue: string, programId: string, newTotalDuration: number, newMode?: string) => {
    const buf = getVenueBuffer(venue);
    const venueProgs = (groupedPrograms[venue] || []).map(p => 
      p.id === programId ? { ...p, duration: newTotalDuration, durationMode: newMode || p.durationMode } : p
    );
    const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf);
    const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));

    setPrograms(prev => prev.map(p => {
      if (p.id === programId) {
        return { 
          ...p, 
          duration: newTotalDuration, 
          durationMode: newMode || p.durationMode, 
          startTime: updateMap.get(p.id) || p.startTime 
        };
      }
      if (updateMap.has(p.id)) {
        return { ...p, startTime: updateMap.get(p.id) };
      }
      return p;
    }));
  };

  // 1-Click Save Order & Timings for a venue
  const handleApplyVenueTimings = async (venue: string) => {
    const venueProgs = groupedPrograms[venue] || [];
    if (venueProgs.length === 0) return;

    const targetDateStr = getVenueDate(venue, venueProgs);
    const buf = getVenueBuffer(venue, venueProgs);
    const startTimeStr = getVenueStartTime(venue, venueProgs);
    const breakConfig = getVenueBreak(venue);
    const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf, startTimeStr, breakConfig, targetDateStr);

    setLoadingId(`apply-${venue}`);
    try {
      try {
        localStorage.setItem(`venue_buffers_${eventId}`, JSON.stringify({ ...venueBuffers, [venue]: buf }));
        localStorage.setItem(`venue_start_times_${eventId}`, JSON.stringify({ ...venueStartTimes, [venue]: startTimeStr }));
        localStorage.setItem(`venue_breaks_${eventId}`, JSON.stringify({ ...venueBreaks, [venue]: breakConfig }));
        localStorage.setItem(`venue_dates_${eventId}`, JSON.stringify({ ...venueDates, [venue]: targetDateStr }));
      } catch (e) {}

      const updates = predictedList.map(item => ({
        id: item.program.id,
        startTime: item.predictedStart.toISOString(),
        duration: item.duration,
        durationMode: item.durationMode,
        stageType: item.program.stageType
      }));

      const res = await applySequentialVenueSchedule(eventId, venue, updates);
      if (res.success) {
        setPrograms(prev => {
          const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));
          return prev.map(p => {
            if (updateMap.has(p.id)) {
              return { ...p, startTime: updateMap.get(p.id), venue };
            }
            return p;
          });
        });
        const dayInfo = festivalDays.find(d => d.dateStr === targetDateStr);
        const dayLabel = dayInfo ? dayInfo.shortLabel : targetDateStr;
        alert(`✅ Successfully saved schedule for ${venue} on ${dayLabel} starting at ${formatTimeAmPm(predictedList[0]?.predictedStart)} (${venueProgs.length} programs)!`);
      } else {
        alert("Failed to save schedule: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error saving schedule: " + (err.message || "Unknown error"));
    } finally {
      setLoadingId(null);
    }
  };



  const handleRenameVenue = async (oldName: string) => {
    const newName = prompt(`Enter new name for venue "${oldName}":`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const clean = newName.trim();
    setLoadingId(`rename-${oldName}`);
    try {
      const res = await renameVenue(eventId, oldName, clean);
      if (res.success) {
        setPrograms(prev => prev.map(p => p.venue === oldName ? { ...p, venue: clean } : p));
        setLocalVenues(prev => prev.map(v => v === oldName ? clean : v));
        if (activeStageTab === oldName) setActiveStageTab(clean);
      } else {
        alert("Failed to rename venue: " + (res.error || "Unknown error"));
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteVenue = async (venueName: string) => {
    const count = programs.filter(p => p.venue === venueName).length;
    const msg = count > 0 
      ? `Are you sure you want to delete venue "${venueName}"?\nAll ${count} assigned program(s) will be moved to Unassigned.` 
      : `Are you sure you want to delete venue "${venueName}"?`;
    if (!confirm(msg)) return;

    setLoadingId(`delete-${venueName}`);
    try {
      const res = await deleteVenue(eventId, venueName);
      if (res.success) {
        setPrograms(prev => prev.map(p => p.venue === venueName ? { ...p, venue: null } : p));
        setLocalVenues(prev => prev.filter(v => v !== venueName));
        if (activeStageTab === venueName) setActiveStageTab("ALL");
      } else {
        alert("Failed to delete venue: " + (res.error || "Unknown error"));
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleAddBreak = async (venue: string) => {
    const breakName = prompt("Enter Break Name (e.g., Lunch Break / Prayer Break):", "Lunch Break");
    const durationStr = prompt("Enter duration in minutes:", "45");
    if (!breakName || !durationStr) return;
    const duration = parseInt(durationStr) || 30;
    
    setLoadingId("new-break");
    try {
      const res = await addBreak({ name: breakName, venue, duration, eventId });
      if (res.success) {
        window.location.reload();
      } else {
        alert("Failed to add break.");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handlePublishMasterSchedule = async () => {
    if (!confirm("This will publish this Master Schedule to all Zone Festivals as their default schedule. Proceed?")) return;
    setLoadingId("publish-master");
    try {
      const res = await publishMasterScheduleToAllZones(eventId);
      if (res.success) {
        alert(`✅ Master Schedule successfully published to ${res.zoneCount} Zone Festivals (${res.count} programs synced)!`);
        window.location.reload();
      } else {
        alert("Failed to publish master schedule: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error: " + (err.message || "Failed to publish master schedule"));
    } finally {
      setLoadingId(null);
    }
  };

  // Determine which venues to show based on active tab
  const displayVenues = activeStageTab === "ALL" 
    ? [...allVenues, "Unassigned"]
    : [activeStageTab];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
      
      {/* Top Venue Management & Master Controls */}
      <div className="glass-panel" style={{ padding: "var(--spacing-md)", display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 360px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1.05rem", fontWeight: 800 }}>🏛️ Stage & Venue Management</h3>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Add Stage (e.g. Stage 1, Stage 2)"
              value={newVenueName}
              onChange={e => setNewVenueName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddVenue(); }}
              style={{ maxWidth: "260px" }}
            />
            <button className="btn btn-primary" onClick={handleAddVenue} style={{ fontWeight: 700 }}>
              + Add Stage
            </button>
          </div>

          {/* Venue Badges */}
          {allVenues.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Active Stages:</span>
              {allVenues.map(v => {
                const count = (groupedPrograms[v] || []).length;
                return (
                  <div
                    key={v}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      backgroundColor: activeStageTab === v ? "rgba(142, 0, 51, 0.15)" : "rgba(142, 0, 51, 0.06)",
                      border: activeStageTab === v ? "1.5px solid #8E0033" : "1px solid rgba(142, 0, 51, 0.2)",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#8E0033",
                      cursor: "pointer"
                    }}
                    onClick={() => setActiveStageTab(v)}
                  >
                    <span>📍 {v}</span>
                    <span style={{ fontSize: "0.7rem", backgroundColor: "white", padding: "1px 6px", borderRadius: "10px", color: "#475569" }}>
                      {count}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRenameVenue(v); }}
                      title={`Rename stage "${v}"`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "0.85rem" }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteVenue(v); }}
                      title={`Delete stage "${v}"`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "0.85rem", color: "#ef4444" }}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Global Schedule Actions */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {statusOverride === "SCHEDULE_PUBLISHED" ? (
            <span style={{ 
              padding: "6px 12px", 
              borderRadius: "6px", 
              backgroundColor: "rgba(16, 185, 129, 0.15)", 
              color: "#10b981", 
              fontWeight: 700, 
              fontSize: "0.82rem",
              border: "1px solid rgba(16, 185, 129, 0.3)"
            }}>
              🟢 Schedule is PUBLISHED (Live)
            </span>
          ) : (
            <span style={{ 
              padding: "6px 12px", 
              borderRadius: "6px", 
              backgroundColor: "rgba(239, 68, 68, 0.15)", 
              color: "#ef4444", 
              fontWeight: 700, 
              fontSize: "0.82rem",
              border: "1px solid rgba(239, 68, 68, 0.3)"
            }}>
              🔒 Schedule is DRAFT / HIDDEN
            </span>
          )}

          {isSuperAdmin ? (
            <button 
              className="btn btn-primary" 
              style={{ backgroundColor: "#10B981", borderColor: "#10B981", color: "#ffffff", fontWeight: 700 }}
              onClick={handlePublishMasterSchedule} 
              disabled={loadingId !== null}
            >
              {loadingId === "publish-master" ? "Publishing..." : "📢 Publish Master Schedule to All Zones"}
            </button>
          ) : (
            statusOverride !== "SCHEDULE_PUBLISHED" ? (
              <button 
                className="btn btn-primary" 
                style={{ backgroundColor: "#10B981", borderColor: "#10B981", color: "#ffffff", fontWeight: 700 }}
                onClick={async () => {
                  if (!confirm("Publish the finalized Zone Program Schedule? Timings and venues will be visible to colleges and public results.")) return;
                  setLoadingId("publish-zone");
                  try {
                    const res = await publishZoneSchedule(eventId);
                    if (res.success) {
                      setStatusOverride("SCHEDULE_PUBLISHED");
                      alert(`✅ Final Zone Schedule published!`);
                      window.location.reload();
                    } else {
                      alert("Failed: " + (res.error || "Unknown error"));
                    }
                  } finally {
                    setLoadingId(null);
                  }
                }} 
                disabled={loadingId !== null}
              >
                {loadingId === "publish-zone" ? "Publishing..." : "📢 Publish Final Zone Schedule"}
              </button>
            ) : (
              <button 
                className="btn btn-secondary" 
                style={{ borderColor: "#ef4444", color: "#ef4444", fontWeight: 700 }}
                onClick={async () => {
                  if (!confirm("Return schedule to Draft mode (hidden from colleges)?")) return;
                  setLoadingId("unpublish-zone");
                  try {
                    const res = await unpublishSchedule(eventId);
                    if (res.success) {
                      setStatusOverride("AUTO");
                      alert(`🔒 Schedule unpublished (Draft Mode).`);
                      window.location.reload();
                    } else {
                      alert("Failed: " + (res.error || "Unknown error"));
                    }
                  } finally {
                    setLoadingId(null);
                  }
                }} 
                disabled={loadingId !== null}
              >
                {loadingId === "unpublish-zone" ? "Hiding..." : "🔒 Hide Schedule (Draft)"}
              </button>
            )
          )}

          {isSuperAdmin && (
            <button 
              className="btn btn-secondary" 
              style={{ borderColor: "#6366f1", color: "#4f46e5", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => setGlobalTimingOpen(prev => !prev)}
            >
              <span>⚙️</span>
              <span>Global Timing Settings</span>
              <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>{globalTimingOpen ? "▲" : "▼"}</span>
            </button>
          )}

          <a
            href={`/print/schedule?eventId=${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
            title="Open official printable layout for this schedule"
          >
            <span>🖨️</span>
            <span>Print Schedule</span>
          </a>

          <ZoneScheduleAnalyzer 
            isSuperAdmin={isSuperAdmin} 
            activeEventId={eventId} 
            onScheduleUpdated={() => window.location.reload()} 
          />
        </div>
      </div>

      {/* GLOBAL SCHEDULE TIMING PANEL */}
      {globalTimingOpen && (
        <div style={{
          padding: "20px 24px",
          borderRadius: "14px",
          background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
          border: "2px solid #818cf8",
          boxShadow: "0 8px 24px rgba(99, 102, 241, 0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.4rem" }}>⚙️</span>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1e1b4b" }}>
                  Global Schedule Timing Settings (Synced Across All Zones & State)
                </h3>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#475569" }}>
                Edit here once to establish standard timing for <strong>all zones and state</strong>. Individual programs scale per candidate; group and fixed programs use the fixed duration.
              </p>
            </div>
            <button
              onClick={() => setGlobalTimingOpen(false)}
              style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {/* Field 1: Min Per Candidate */}
            <div style={{ backgroundColor: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #c7d2fe" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#3730a3", marginBottom: "6px" }}>
                👤 Min per Candidate (Individual)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={globalMinPerCandidate}
                  onChange={e => setGlobalMinPerCandidate(Math.max(1, parseInt(e.target.value) || 1))}
                  className="form-input"
                  style={{ width: "90px", fontSize: "0.95rem", fontWeight: 700, textAlign: "center" }}
                />
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>minutes / slot</span>
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                Multiplied by actual candidates registered in each zone.
              </p>
            </div>

            {/* Field 2: Buffer Gap */}
            <div style={{ backgroundColor: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #c7d2fe" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#3730a3", marginBottom: "6px" }}>
                ⏱️ Transition Buffer Gap
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={globalBufferMinutes}
                  onChange={e => setGlobalBufferMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="form-input"
                  style={{ width: "90px", fontSize: "0.95rem", fontWeight: 700, textAlign: "center" }}
                />
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>minutes between programs</span>
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                Stage clearance and transition gap between back-to-back programs.
              </p>
            </div>

            {/* Field 3: Group / Fixed Duration */}
            <div style={{ backgroundColor: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #c7d2fe" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#3730a3", marginBottom: "6px" }}>
                👥 Group / Fixed Program Duration
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={globalGroupFixedMin}
                  onChange={e => setGlobalGroupFixedMin(Math.max(5, parseInt(e.target.value) || 5))}
                  className="form-input"
                  style={{ width: "90px", fontSize: "0.95rem", fontWeight: 700, textAlign: "center" }}
                />
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>minutes / program</span>
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                Default slot duration for group, general, or fixed-duration events.
              </p>
            </div>

            {/* Field 4: Festival Start Time */}
            <div style={{ backgroundColor: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #c7d2fe" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#3730a3", marginBottom: "6px" }}>
                🚩 Default Venue Start Time
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="time"
                  value={globalStartTime}
                  onChange={e => setGlobalStartTime(e.target.value)}
                  className="form-input"
                  style={{ width: "120px", fontSize: "0.95rem", fontWeight: 700, textAlign: "center", backgroundColor: "#f0fdf4", color: "#15803d", borderColor: "#86efac" }}
                />
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                Standard starting time for venues across festival zones (default 09:30 AM).
              </p>
            </div>

            {/* Field 5: Lunch / Prayer Break Window */}
            <div style={{ backgroundColor: "#ffffff", padding: "14px", borderRadius: "10px", border: "1px solid #c7d2fe" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#3730a3", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={globalEnableBreak}
                    onChange={e => setGlobalEnableBreak(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  🍽️ Lunch / Prayer Break
                </label>
              </div>
              {globalEnableBreak ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="time"
                    value={globalBreakStart}
                    onChange={e => setGlobalBreakStart(e.target.value)}
                    className="form-input"
                    style={{ width: "100px", fontSize: "0.85rem", fontWeight: 700, textAlign: "center" }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>to</span>
                  <input
                    type="time"
                    value={globalBreakEnd}
                    onChange={e => setGlobalBreakEnd(e.target.value)}
                    className="form-input"
                    style={{ width: "100px", fontSize: "0.85rem", fontWeight: 700, textAlign: "center" }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>Break disabled</span>
              )}
              <p style={{ margin: "6px 0 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                Automatic pause window for lunch & prayer. Programs resume after break.
              </p>
            </div>
          </div>

          {globalTimingMsg && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: globalTimingMsg.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${globalTimingMsg.startsWith("✅") ? "#86efac" : "#fca5a5"}`,
              color: globalTimingMsg.startsWith("✅") ? "#166534" : "#991b1b",
              fontSize: "0.85rem",
              fontWeight: 700
            }}>
              {globalTimingMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              onClick={() => handleSaveGlobalTiming(false)}
              disabled={globalTimingSaving}
              className="btn btn-secondary"
              style={{ fontSize: "0.82rem", fontWeight: 700 }}
            >
              {globalTimingSaving ? "Saving..." : "💾 Save Settings Only"}
            </button>
            <button
              onClick={() => handleSaveGlobalTiming(true)}
              disabled={globalTimingSaving}
              className="btn"
              style={{
                background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 800,
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                cursor: globalTimingSaving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>🚀</span>
              <span>{globalTimingSaving ? "Saving & Syncing All Zones..." : "Save & Sync to ALL Zones Now"}</span>
            </button>
          </div>
        </div>
      )}

      {/* CANDIDATE COLLISION & CLASH INSPECTOR */}
      {clashes.length > 0 ? (
        <div style={{
          padding: "18px 22px",
          borderRadius: "14px",
          backgroundColor: "#ffffff",
          border: criticalCount > 0 ? "2px solid #ef4444" : "2px solid #f97316",
          boxShadow: "0 6px 20px rgba(239, 68, 68, 0.10)",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}>
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.8rem" }}>
                {criticalCount > 0 ? "🚨" : "⚠️"}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900, color: "#991b1b", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>Candidate Collision Center</span>
                  <span style={{
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    padding: "2px 10px",
                    borderRadius: "9999px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    border: "1px solid #fca5a5"
                  }}>
                    {clashesByCandidate.length} Candidate{clashesByCandidate.length > 1 ? "s" : ""} Overlapping • {clashes.length} Colliding Pair{clashes.length > 1 ? "s" : ""}
                  </span>
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  The same candidates are enrolled in multiple on-stage programs scheduled at overlapping times. Use <strong>Day 2 shifting</strong> or adjust start times to resolve.
                </p>
              </div>
            </div>

            {/* Controls: View Tabs & Toggle */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", borderRadius: "8px", border: "1px solid #cbd5e1", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setCollisionViewMode("CANDIDATES")}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    border: "none",
                    backgroundColor: collisionViewMode === "CANDIDATES" ? "#8E0033" : "#ffffff",
                    color: collisionViewMode === "CANDIDATES" ? "#ffffff" : "#475569",
                    cursor: "pointer"
                  }}
                >
                  👥 By Candidate ({clashesByCandidate.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCollisionViewMode("SEVERITY")}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    border: "none",
                    backgroundColor: collisionViewMode === "SEVERITY" ? "#8E0033" : "#ffffff",
                    color: collisionViewMode === "SEVERITY" ? "#ffffff" : "#475569",
                    cursor: "pointer"
                  }}
                >
                  ⚡ By Severity ({liveScoredClashes.length})
                </button>
              </div>

              {manageableCount > 0 && (
                <button
                  onClick={handleResolveManageableClashes}
                  disabled={clashFixLoading}
                  className="btn"
                  style={{
                    background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    padding: "5px 12px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: clashFixLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(34, 197, 94, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>🔧</span>
                  <span>{clashFixLoading ? "Fixing..." : `Auto-Fix (${manageableCount})`}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCollisionInspectorOpen(!collisionInspectorOpen)}
                style={{
                  padding: "5px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                {collisionInspectorOpen ? "▲ Hide Details" : "▼ Show Details"}
              </button>
            </div>
          </div>

          {collisionInspectorOpen && (
            <>
              {/* Filter / Search Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", backgroundColor: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
                  <span style={{ fontSize: "0.85rem" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search candidate name, chest number or program..."
                    value={collisionSearch}
                    onChange={(e) => setCollisionSearch(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      backgroundColor: "transparent",
                      fontSize: "0.82rem",
                      width: "100%",
                      fontWeight: 600
                    }}
                  />
                  {collisionSearch && (
                    <button
                      type="button"
                      onClick={() => setCollisionSearch("")}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.8rem" }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>Quick Guide:</span>
                  <span style={{ fontSize: "0.72rem", backgroundColor: "#eef2ff", color: "#4338ca", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                    💡 Move 2nd Program to Day 2 to completely resolve clash
                  </span>
                </div>
              </div>

              {clashMsg && (
                <div style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: clashMsg.startsWith("❌") ? "#fef2f2" : "#f0fdf4",
                  border: `1px solid ${clashMsg.startsWith("❌") ? "#fca5a5" : "#86efac"}`,
                  color: clashMsg.startsWith("❌") ? "#991b1b" : "#166534",
                  fontSize: "0.82rem",
                  fontWeight: 700
                }}>
                  {clashMsg}
                </div>
              )}

              {/* Collisions Content */}
              {collisionViewMode === "CANDIDATES" ? (
                /* Grouped by Candidate View */
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                  {clashesByCandidate
                    .filter(c => {
                      if (!collisionSearch.trim()) return true;
                      const q = collisionSearch.toLowerCase();
                      const matchName = c.candidateName.toLowerCase().includes(q);
                      const matchChest = c.chestNumber && c.chestNumber.toLowerCase().includes(q);
                      const matchProgs = c.clashes.some(cl => 
                        cl.program1Name.toLowerCase().includes(q) || 
                        cl.program2Name.toLowerCase().includes(q) ||
                        (cl.program1Code && cl.program1Code.toLowerCase().includes(q)) ||
                        (cl.program2Code && cl.program2Code.toLowerCase().includes(q))
                      );
                      return matchName || matchChest || matchProgs;
                    })
                    .map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1.5px solid #fca5a5",
                          borderRadius: "10px",
                          padding: "12px 16px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                        }}
                      >
                        {/* Candidate Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "1.1rem" }}>👤</span>
                            <span style={{ fontWeight: 900, fontSize: "0.92rem", color: "#0f172a" }}>
                              {item.candidateName}
                            </span>
                            {item.chestNumber && (
                              <span style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "1px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800 }}>
                                #{item.chestNumber}
                              </span>
                            )}
                            {item.institutionName && (
                              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                                • {item.institutionName}
                              </span>
                            )}
                            {item.zoneName && (
                              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                                ({item.zoneName})
                              </span>
                            )}
                          </div>
                          <span style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 800, border: "1px solid #fca5a5" }}>
                            ⚠️ {item.clashes.length} Colliding Pair{item.clashes.length > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Conflicting Programs */}
                        {item.clashes.map((clash, cIdx) => (
                          <div
                            key={cIdx}
                            style={{
                              backgroundColor: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              marginTop: cIdx > 0 ? "8px" : "0"
                            }}
                          >
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "10px", alignItems: "center" }}>
                              {/* Program 1 */}
                              <div style={{ backgroundColor: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                                  <span style={{
                                    fontSize: "0.68rem",
                                    fontWeight: 800,
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: clash.program1Fest?.includes("PG") ? "rgba(168, 85, 247, 0.15)" : "rgba(37, 99, 235, 0.15)",
                                    color: clash.program1Fest?.includes("PG") ? "#7e22ce" : "#1d4ed8"
                                  }}>
                                    {clash.program1Fest}
                                  </span>
                                  <span style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a" }}>
                                    {clash.program1Code ? `[${clash.program1Code}] ` : ""}{clash.program1Name}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                                  📍 <strong>{clash.program1Venue}</strong>
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#1e293b", fontWeight: 700, marginTop: "2px" }}>
                                  📅 {new Date(clash.program1Start).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })} • 🕒 {formatTimeAmPm(clash.program1Start)} – {formatTimeAmPm(clash.program1End)}
                                </div>
                              </div>

                              {/* Overlap Indicator */}
                              <div style={{ textAlign: "center", padding: "0 4px" }}>
                                <div style={{ backgroundColor: "#dc2626", color: "#fff", padding: "3px 8px", borderRadius: "6px", fontSize: "0.70rem", fontWeight: 900, whiteSpace: "nowrap" }}>
                                  ⚡ OVERLAP
                                </div>
                                <div style={{ fontSize: "0.70rem", fontWeight: 800, color: "#991b1b", marginTop: "2px" }}>
                                  {clash.overlapMinutes}m
                                </div>
                              </div>

                              {/* Program 2 */}
                              <div style={{ backgroundColor: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                                  <span style={{
                                    fontSize: "0.68rem",
                                    fontWeight: 800,
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: clash.program2Fest?.includes("PG") ? "rgba(168, 85, 247, 0.15)" : "rgba(37, 99, 235, 0.15)",
                                    color: clash.program2Fest?.includes("PG") ? "#7e22ce" : "#1d4ed8"
                                  }}>
                                    {clash.program2Fest}
                                  </span>
                                  <span style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a" }}>
                                    {clash.program2Code ? `[${clash.program2Code}] ` : ""}{clash.program2Name}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                                  📍 <strong>{clash.program2Venue}</strong>
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#1e293b", fontWeight: 700, marginTop: "2px" }}>
                                  📅 {new Date(clash.program2Start).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })} • 🕒 {formatTimeAmPm(clash.program2Start)} – {formatTimeAmPm(clash.program2End)}
                                </div>
                              </div>
                            </div>

                            {/* 1-Click Resolve Actions */}
                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed #fca5a5", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.72rem", color: "#7f1d1d", fontWeight: 700 }}>Quick Actions:</span>
                              <button
                                type="button"
                                onClick={() => handleQuickMoveToDay2(clash.program2Id)}
                                style={{
                                  padding: "3px 10px",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  backgroundColor: "#4338ca",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                                title="Move Program 2 to Day 2"
                              >
                                📅 Move "{clash.program2Name}" to Day 2
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickShiftTime(clash.program2Id, 45)}
                                style={{
                                  padding: "3px 10px",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  backgroundColor: "#059669",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                                title="Delay Program 2 by 45 minutes"
                              >
                                🕒 Delay "{clash.program2Name}" (+45m)
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              ) : (
                /* Scored Severity View */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px", maxHeight: "360px", overflowY: "auto", padding: "2px" }}>
                  {liveScoredClashes.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: "#ffffff",
                        border: `1.5px solid ${c.severityColor}`,
                        borderRadius: "10px",
                        padding: "10px 14px",
                        fontSize: "0.8rem",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{
                          backgroundColor: `${c.severityColor}15`,
                          color: c.severityColor,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          border: `1px solid ${c.severityColor}35`
                        }}>
                          {c.severityLabel}
                        </span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                          {c.overlapMinutes} min overlap
                        </span>
                      </div>

                      <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
                        👤 {c.candidateName}
                      </div>

                      <div style={{ color: "#334155", fontSize: "0.75rem", marginBottom: "2px" }}>
                        📍 <strong>{c.program1Venue}</strong>: {c.program1Name} ({formatTimeAmPm(c.program1Start)} - {formatTimeAmPm(c.program1End)})
                      </div>
                      <div style={{ color: "#334155", fontSize: "0.75rem", marginBottom: "4px" }}>
                        📍 <strong>{c.program2Venue}</strong>: {c.program2Name} ({formatTimeAmPm(c.program2Start)} - {formatTimeAmPm(c.program2End)})
                      </div>

                      <div style={{
                        fontSize: "0.72rem",
                        color: "#475569",
                        backgroundColor: "#f8fafc",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        marginTop: "6px",
                        borderLeft: `3px solid ${c.severityColor}`
                      }}>
                        {c.explanation}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                        <button
                          type="button"
                          onClick={() => handleQuickMoveToDay2(c.program2Id)}
                          style={{
                            padding: "3px 8px",
                            fontSize: "0.70rem",
                            fontWeight: 800,
                            backgroundColor: "#4338ca",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          📅 Shift to Day 2
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div style={{
          padding: "12px 18px",
          borderRadius: "12px",
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          border: "1.5px solid rgba(16, 185, 129, 0.3)",
          color: "#065f46",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: 700
        }}>
          <span>✅</span>
          <span>Zero Candidate Clashes: All scheduled programs across all stages are 100% conflict-free!</span>
        </div>
      )}

      {/* EASY STAGE NAVIGATION TABS */}
      <div className="glass-panel" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569", marginRight: "4px" }}>Stage View:</span>
          
          <button
            onClick={() => setActiveStageTab("ALL")}
            className={`btn ${activeStageTab === "ALL" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "5px 14px", fontSize: "0.82rem", borderRadius: "8px", fontWeight: 700 }}
          >
            🌐 All Stages ({programs.filter(p => p.stageType === "ON_STAGE").length})
          </button>

          {allVenues.map(v => {
            const count = (groupedPrograms[v] || []).length;
            const venueScored = (groupedPrograms[v] || []).flatMap(p => scoredClashesByProgramId[p.id] || []);
            const hasCrit = venueScored.some(c => c.severity === "CRITICAL");
            const hasHi = venueScored.some(c => c.severity === "HIGH");
            const hasMed = venueScored.some(c => c.severity === "MEDIUM");
            const hasMan = venueScored.some(c => c.severity === "MANAGEABLE");

            return (
              <button
                key={v}
                onClick={() => setActiveStageTab(v)}
                className={`btn ${activeStageTab === v ? "btn-primary" : "btn-secondary"}`}
                style={{ 
                  padding: "5px 14px", 
                  fontSize: "0.82rem", 
                  borderRadius: "8px", 
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>📍 {v}</span>
                <span style={{ 
                  backgroundColor: activeStageTab === v ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)", 
                  padding: "1px 6px", 
                  borderRadius: "10px", 
                  fontSize: "0.72rem" 
                }}>
                  {count}
                </span>
                {hasCrit ? (
                  <span title="Critical Clash (3+ Simultaneous Programs)" style={{ fontSize: "0.78rem" }}>🔴</span>
                ) : hasHi ? (
                  <span title="High Conflict (Fixed Time Conflict)" style={{ fontSize: "0.78rem" }}>🟠</span>
                ) : hasMed ? (
                  <span title="Medium Conflict (Individual vs Group)" style={{ fontSize: "0.78rem" }}>🟡</span>
                ) : hasMan ? (
                  <span title="Manageable Conflict (Adjustable slots)" style={{ fontSize: "0.78rem" }}>🟢</span>
                ) : null}
              </button>
            );
          })}

          <button
            onClick={() => setActiveStageTab("Unassigned")}
            className={`btn ${activeStageTab === "Unassigned" ? "btn-primary" : "btn-secondary"}`}
            style={{ 
              padding: "5px 14px", 
              fontSize: "0.82rem", 
              borderRadius: "8px", 
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>⏳ Unassigned</span>
            <span style={{ 
              backgroundColor: (groupedPrograms["Unassigned"] || []).length > 0 ? "#fef3c7" : "rgba(0,0,0,0.06)", 
              color: (groupedPrograms["Unassigned"] || []).length > 0 ? "#b45309" : "inherit",
              padding: "1px 6px", 
              borderRadius: "10px", 
              fontSize: "0.72rem",
              fontWeight: 800
            }}>
              {(groupedPrograms["Unassigned"] || []).length}
            </span>
          </button>
        </div>

        {/* Collaborative Fest Filters */}
        {isCollabMode && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginRight: "12px", paddingRight: "12px", borderRight: "1.5px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>Fest:</span>
            <button
              onClick={() => setSelectedFest("ALL")}
              style={{
                padding: "3px 10px",
                fontSize: "0.75rem",
                borderRadius: "14px",
                border: "1px solid",
                borderColor: selectedFest === "ALL" ? "#f59e0b" : "#cbd5e1",
                backgroundColor: selectedFest === "ALL" ? "#f59e0b" : "#ffffff",
                color: selectedFest === "ALL" ? "#ffffff" : "#475569",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              🌟 All Combined ({programs.length})
            </button>
            <button
              onClick={() => setSelectedFest("STATE")}
              style={{
                padding: "3px 10px",
                fontSize: "0.75rem",
                borderRadius: "14px",
                border: "1px solid",
                borderColor: selectedFest === "STATE" ? "#2563eb" : "#cbd5e1",
                backgroundColor: selectedFest === "STATE" ? "#2563eb" : "#ffffff",
                color: selectedFest === "STATE" ? "#ffffff" : "#475569",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              🏆 State Final ({stateProgCount})
            </button>
            <button
              onClick={() => setSelectedFest("PG")}
              style={{
                padding: "3px 10px",
                fontSize: "0.75rem",
                borderRadius: "14px",
                border: "1px solid",
                borderColor: selectedFest === "PG" ? "#7e22ce" : "#cbd5e1",
                backgroundColor: selectedFest === "PG" ? "#7e22ce" : "#ffffff",
                color: selectedFest === "PG" ? "#ffffff" : "#475569",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              🎓 Fadheela PG ({pgProgCount})
            </button>
          </div>
        )}

        {/* Category filters */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>Category:</span>
          {categoryOrder.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "3px 10px",
                fontSize: "0.75rem",
                borderRadius: "14px",
                border: "1px solid",
                borderColor: selectedCategory === cat ? "#8E0033" : "#cbd5e1",
                backgroundColor: selectedCategory === cat ? "#8E0033" : "#ffffff",
                color: selectedCategory === cat ? "#ffffff" : "#475569",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* BATCH STAGE ASSIGNMENT BAR */}
      {selectedProgramIds.size > 0 && (
        <div style={{
          padding: "12px 18px",
          borderRadius: "10px",
          backgroundColor: "#f0fdf4",
          border: "1.5px solid #86efac",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div style={{ fontWeight: 800, color: "#166534", fontSize: "0.9rem" }}>
            ☑️ {selectedProgramIds.size} Program(s) Selected
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#166534" }}>Move to:</span>
            <select
              className="form-input"
              value={batchTargetStage}
              onChange={(e) => setBatchTargetStage(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "0.82rem", maxWidth: "160px" }}
            >
              {allVenues.map(v => <option key={v} value={v}>{v}</option>)}
              <option value="Unassigned">Unassigned</option>
            </select>
            <button
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 800 }}
              onClick={() => handleBatchAssignVenue(batchTargetStage)}
              disabled={loadingId !== null}
            >
              {loadingId === "batch-assign" ? "Assigning..." : "Assign to Stage"}
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: "6px 10px", fontSize: "0.82rem" }}
              onClick={() => setSelectedProgramIds(new Set())}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* VENUES LIST */}
      {displayVenues.map(venue => {
        const venueProgs = groupedPrograms[venue] || [];
        const isUnassigned = venue === "Unassigned";
        const buf = getVenueBuffer(venue, venueProgs);
        const startTimeStr = getVenueStartTime(venue, venueProgs);
        const venueBreak = getVenueBreak(venue);
        const venueDateStr = getVenueDate(venue, venueProgs);
        const timeline = getPredictedVenueTimeline(venue, venueProgs, buf, startTimeStr, venueBreak, venueDateStr);

        const { predictedList, totalDurationMinutes, totalCandidates, predictedStart, predictedEnd } = timeline;

        const eveningCutoff = getFestivalBaseDate(predictedStart, 18, 0);
        const isExceedingEvening = predictedEnd.getTime() > eveningCutoff.getTime();
        const diffMinutes = Math.abs(Math.round((predictedEnd.getTime() - eveningCutoff.getTime()) / 60000));

        return (
          <div key={venue} className="glass-panel" style={{ padding: "var(--spacing-md)", borderRadius: "14px" }}>
            
            {/* Stage Header */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "14px", 
              borderBottom: "1.5px solid var(--border-color)", 
              paddingBottom: "12px",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, color: "#8E0033", display: "flex", alignItems: "center", gap: "8px", fontSize: "1.25rem" }}>
                  📍 {venue}
                  <span className="badge badge-secondary">{venueProgs.length} Programs</span>
                </h2>

                {!isUnassigned && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleRenameVenue(venue)}
                      title="Rename stage"
                      style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                    >
                      ✏️ Rename
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleDeleteVenue(venue)}
                      title="Delete stage"
                      style={{ padding: "3px 8px", fontSize: "0.75rem", borderColor: "#fca5a5", color: "#dc2626" }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>

              {!isUnassigned && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-secondary" style={{ padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700 }} onClick={() => handleAddBreak(venue)}>
                    + Add Break
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "6px 18px", fontSize: "0.85rem", fontWeight: 800, backgroundColor: "#8E0033", borderColor: "#8E0033" }}
                    onClick={() => handleApplyVenueTimings(venue)}
                    disabled={loadingId !== null}
                  >
                    💾 Save Order & Timings
                  </button>
                </div>
              )}
            </div>

            {/* Stage Timeline Controller Bar */}
            {!isUnassigned && venueProgs.length > 0 && (
              <div 
                style={{
                  backgroundColor: "rgba(248, 250, 252, 0.95)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    
                    {/* Day Selector (Day 1 / Day 2) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", borderRight: "1.5px solid #cbd5e1", paddingRight: "10px" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#4338ca", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>📅</span>
                        <span>Day:</span>
                      </label>
                      <select
                        className="form-input"
                        value={venueDateStr}
                        onChange={(e) => handleVenueDateChange(venue, e.target.value)}
                        style={{
                          fontSize: "0.80rem",
                          padding: "3px 8px",
                          fontWeight: 800,
                          backgroundColor: "#eef2ff",
                          borderColor: "#c7d2fe",
                          color: "#4338ca",
                          borderRadius: "6px",
                          cursor: "pointer"
                        }}
                      >
                        {festivalDays.map((d) => (
                          <option key={d.dateStr} value={d.dateStr}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Starts (Preset + Custom Time Picker) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#15803d", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>🕒</span>
                        <span>Starts:</span>
                      </label>
                      <select 
                        className="form-input" 
                        value={[ "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00" ].includes(startTimeStr) ? startTimeStr : "CUSTOM"}
                        onChange={(e) => {
                          if (e.target.value !== "CUSTOM") {
                            handleVenueStartTimeChange(venue, e.target.value);
                          }
                        }}
                        style={{ 
                          fontSize: "0.80rem", 
                          padding: "3px 8px", 
                          width: "115px", 
                          fontWeight: 800,
                          backgroundColor: "#f0fdf4",
                          borderColor: "#bbf7d0",
                          color: "#15803d"
                        }}
                      >
                        <option value="08:00">08:00 AM</option>
                        <option value="08:30">08:30 AM</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="09:30">09:30 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="10:30">10:30 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="11:30">11:30 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="CUSTOM">Custom Time...</option>
                      </select>
                      <input
                        type="time"
                        value={startTimeStr}
                        onChange={(e) => handleVenueStartTimeChange(venue, e.target.value)}
                        className="form-input"
                        style={{
                          fontSize: "0.80rem",
                          padding: "2px 6px",
                          width: "105px",
                          fontWeight: 800,
                          backgroundColor: "#f0fdf4",
                          borderColor: "#bbf7d0",
                          color: "#15803d"
                        }}
                        title="Pick or type custom stage start time"
                      />
                      {(() => {
                        const [hStr, mStr] = startTimeStr.split(":");
                        const h = parseInt(hStr, 10);
                        const isPm = !isNaN(h) && h >= 12;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              const curH = isNaN(h) ? 9 : h;
                              const targetH = isPm ? (curH - 12) : (curH + 12);
                              const newTime = `${String(targetH).padStart(2, "0")}:${mStr || "00"}`;
                              handleVenueStartTimeChange(venue, newTime);
                            }}
                            title={`Currently ${isPm ? "PM (Afternoon/Night)" : "AM (Morning)"}. Click to toggle.`}
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "4px",
                              border: isPm ? "1px solid #f87171" : "1px solid #86efac",
                              backgroundColor: isPm ? "#fee2e2" : "#dcfce7",
                              color: isPm ? "#dc2626" : "#15803d",
                              cursor: "pointer"
                            }}
                          >
                            {isPm ? "PM 🌙" : "AM ☀️"}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Buffer Gap */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                        Buffer Gap:
                      </label>
                      <select 
                        className="form-input" 
                        value={buf}
                        onChange={(e) => handleVenueBufferChange(venue, parseInt(e.target.value) || 0)}
                        style={{ fontSize: "0.80rem", padding: "3px 6px", width: "110px" }}
                      >
                        <option value={0}>0 min (Direct)</option>
                        <option value={5}>5 mins gap</option>
                        <option value={10}>10 mins gap</option>
                        <option value={15}>15 mins gap</option>
                        <option value={20}>20 mins gap</option>
                        <option value={30}>30 mins gap</option>
                        {![0, 5, 10, 15, 20, 30].includes(buf) && (
                          <option value={buf}>{buf} mins gap</option>
                        )}
                      </select>
                    </div>

                    {/* Break Option (NEW!) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", borderLeft: "1.5px solid #cbd5e1", paddingLeft: "10px" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#b45309", margin: 0, display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={venueBreak.enabled}
                          onChange={(e) => handleVenueBreakChange(venue, { ...venueBreak, enabled: e.target.checked })}
                          style={{ cursor: "pointer" }}
                        />
                        <span>🍽️ Break:</span>
                      </label>
                      {venueBreak.enabled ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input
                            type="time"
                            value={venueBreak.start}
                            onChange={(e) => handleVenueBreakChange(venue, { ...venueBreak, start: e.target.value })}
                            className="form-input"
                            style={{ fontSize: "0.78rem", padding: "2px 4px", width: "105px", fontWeight: 700, backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#b45309" }}
                            title="Break Start Time"
                          />
                          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>–</span>
                          <input
                            type="time"
                            value={venueBreak.end}
                            onChange={(e) => handleVenueBreakChange(venue, { ...venueBreak, end: e.target.value })}
                            className="form-input"
                            style={{ fontSize: "0.78rem", padding: "2px 4px", width: "105px", fontWeight: 700, backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#b45309" }}
                            title="Break End Time"
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>None</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.82rem", flexWrap: "wrap" }}>
                    <span style={{ 
                      backgroundColor: "#e0e7ff", 
                      color: "#3730a3", 
                      padding: "2px 8px", 
                      borderRadius: "6px", 
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span>📅</span>
                      <span>{predictedStart.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })}</span>
                    </span>
                    <span style={{ color: "#475569" }}>
                      Total Runtime: <strong>{Math.floor(totalDurationMinutes / 60)}h {totalDurationMinutes % 60}m</strong>
                    </span>
                    <span>•</span>
                    <span style={{ color: "#059669", fontWeight: 800 }}>
                      {formatTimeAmPm(predictedStart)} &rarr; {formatTimeAmPm(predictedEnd)}
                    </span>
                    <span>•</span>
                    <span style={{
                      fontWeight: 700,
                      color: isExceedingEvening ? "#dc2626" : "#059669"
                    }}>
                      {isExceedingEvening 
                        ? `⚠️ Overruns 6 PM (+${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m)`
                        : `✅ Finishes by ${formatTimeAmPm(predictedEnd)}`}
                    </span>
                  </div>
                </div>

                {/* Warning if Break is set before Stage Start */}
                {timeline.isBreakBeforeStart && (
                  <div style={{
                    backgroundColor: "#fff7ed",
                    border: "1.5px solid #fdba74",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#c2410c",
                    fontSize: "0.82rem",
                    gap: "10px",
                    flexWrap: "wrap"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                      <span>
                        <strong>Break Time Mismatch:</strong> The break ({venueBreak.start} – {venueBreak.end}) is set earlier than the stage start time ({formatTimeAmPm(predictedStart)}). If this stage starts in the morning, switch to AM!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const [h, m] = startTimeStr.split(":").map(Number);
                        const morningH = h >= 12 ? h - 12 : h;
                        const fixedTime = `${String(morningH).padStart(2, "0")}:${String(isNaN(m) ? 0 : m).padStart(2, "0")}`;
                        handleVenueStartTimeChange(venue, fixedTime);
                      }}
                      style={{
                        padding: "4px 12px",
                        backgroundColor: "#ea580c",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.78rem",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      ⚡ Switch Start to {(() => {
                        const [h, m] = startTimeStr.split(":").map(Number);
                        const morningH = h >= 12 ? h - 12 : h;
                        return formatTimeAmPm(getFestivalBaseDate(predictedStart, morningH, m));
                      })()}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Programs List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {venueProgs.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "var(--spacing-md)", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
                  No programs assigned to this stage yet.
                </div>
              ) : (
                predictedList.map((item: any, idx: number) => {
                  const program = item.program;
                  const isBreak = program.type === "BREAK";
                  const isFirst = idx === 0;
                  const isLast = idx === predictedList.length - 1;
                  const itemClashes = clashesByProgramId[program.id] || [];

                  const isFixedTime = (program.durationMode || '').toUpperCase() === 'TOTAL_FIXED';
                  const isTeamBased = (program.durationMode || '').toUpperCase() === 'PER_TEAM' || 
                    ((!program.durationMode || program.durationMode === 'AUTO') && (program.type === 'GROUP' || program.type === 'GENERAL' || (program.candidateLimitPerTeam && program.candidateLimitPerTeam > 1)));

                  return (
                    <div key={program.id} style={{ display: "contents" }}>
                      {item.isFirstAfterBreak && timeline.breakStartDate && timeline.breakEndDate && (
                        <div style={{
                          padding: "10px 16px",
                          borderRadius: "10px",
                          backgroundColor: "#fffbeb",
                          border: "1.5px dashed #f59e0b",
                          color: "#b45309",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          boxShadow: "0 1px 4px rgba(245, 158, 11, 0.12)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "0.85rem" }}>
                            <span style={{ fontSize: "1.1rem" }}>🍽️</span>
                            <span>LUNCH / PRAYER BREAK</span>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#92400e" }}>
                              (Stage paused for prayer & lunch)
                            </span>
                          </div>
                          <div style={{
                            backgroundColor: "#fef3c7",
                            padding: "3px 10px",
                            borderRadius: "8px",
                            fontWeight: 800,
                            fontSize: "0.80rem",
                            border: "1px solid #fde68a"
                          }}>
                            {formatTimeAmPm(timeline.breakStartDate)} – {formatTimeAmPm(timeline.breakEndDate)}
                          </div>
                        </div>
                      )}

                      <div 
                        style={{ 
                          padding: "12px 16px", 
                          border: itemClashes.length > 0 ? "2px solid #ef4444" : "1px solid var(--border-color)", 
                          borderRadius: "10px",
                          backgroundColor: itemClashes.length > 0 ? "#fff5f5" : isBreak ? "rgba(245, 158, 11, 0.08)" : "#ffffff",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          boxShadow: itemClashes.length > 0 ? "0 2px 8px rgba(239, 68, 68, 0.15)" : "0 1px 3px rgba(0,0,0,0.03)"
                        }}
                      >
                      {/* Top Program Card Row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        
                        {/* Sequence + Up/Down + Title */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          
                          {/* Checkbox for batch actions */}
                          <input
                            type="checkbox"
                            checked={selectedProgramIds.has(program.id)}
                            onChange={(e) => {
                              const next = new Set(selectedProgramIds);
                              if (e.target.checked) next.add(program.id);
                              else next.delete(program.id);
                              setSelectedProgramIds(next);
                            }}
                            style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          />

                          {/* Order / Sequence Controller */}
                          {!isUnassigned && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span 
                                style={{ 
                                  backgroundColor: itemClashes.length > 0 ? "#dc2626" : "#0f172a", 
                                  color: "#ffffff", 
                                  fontWeight: 800, 
                                  fontSize: "0.78rem", 
                                  padding: "3px 8px", 
                                  borderRadius: "6px",
                                  minWidth: "26px",
                                  textAlign: "center"
                                }}
                                title={`Program sequence #${idx + 1}`}
                              >
                                #{idx + 1}
                              </span>

                              {/* Up / Down Buttons */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleMoveProgram(venue, idx, "up")}
                                  disabled={isFirst}
                                  title="Move Up"
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: isFirst ? "#f1f5f9" : "#ffffff",
                                    cursor: isFirst ? "not-allowed" : "pointer",
                                    borderRadius: "3px",
                                    padding: "0 5px",
                                    fontSize: "0.65rem",
                                    lineHeight: "1.1",
                                    color: isFirst ? "#94a3b8" : "#0f172a"
                                  }}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveProgram(venue, idx, "down")}
                                  disabled={isLast}
                                  title="Move Down"
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: isLast ? "#f1f5f9" : "#ffffff",
                                    cursor: isLast ? "not-allowed" : "pointer",
                                    borderRadius: "3px",
                                    padding: "0 5px",
                                    fontSize: "0.65rem",
                                    lineHeight: "1.1",
                                    color: isLast ? "#94a3b8" : "#0f172a"
                                  }}
                                >
                                  ▼
                                </button>
                              </div>

                              {/* Direct Jump Selector */}
                              {venueProgs.length > 2 && (
                                <select
                                  value={idx}
                                  onChange={(e) => handleJumpProgram(venue, idx, parseInt(e.target.value))}
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "1px 2px",
                                    borderRadius: "4px",
                                    border: "1px solid #cbd5e1",
                                    color: "#475569"
                                  }}
                                  title="Jump to position"
                                >
                                  {venueProgs.map((_: any, pIdx: number) => (
                                    <option key={pIdx} value={pIdx}>Pos #{pIdx + 1}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}

                          {/* Program Name & Badge Details */}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: isBreak ? "var(--warning)" : "#0f172a" }}>
                                {isBreak ? `☕ ${program.name}` : program.name}
                                {program.programCode && (
                                  <span style={{ marginLeft: "6px", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                                    ({program.programCode})
                                  </span>
                                )}
                              </h4>
                              {program.festType && (
                                <span style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 800,
                                  padding: "1px 7px",
                                  borderRadius: "4px",
                                  backgroundColor: program.festType === "PG" ? "rgba(168, 85, 247, 0.15)" : "rgba(37, 99, 235, 0.15)",
                                  color: program.festType === "PG" ? "#7e22ce" : "#1d4ed8",
                                  border: `1px solid ${program.festType === "PG" ? "#c084fc" : "#93c5fd"}`,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px"
                                }}>
                                  {program.festType === "PG" ? "🎓 Fadheela PG" : "🏆 State Final"}
                                </span>
                              )}
                            </div>
                            
                            {!isBreak && (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "3px" }}>
                                <span style={{
                                  fontSize: "0.70rem",
                                  fontWeight: 800,
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: program.stageType === "OFF_STAGE" ? "rgba(14, 165, 233, 0.16)" : "rgba(236, 72, 153, 0.16)",
                                  color: program.stageType === "OFF_STAGE" ? "#0284c7" : "#db2777",
                                  border: `1px solid ${program.stageType === "OFF_STAGE" ? "#0284c7" : "#db2777"}`
                                }}>
                                  {program.stageType === "OFF_STAGE" ? "🎨 OFF STAGE" : "🎭 ON STAGE"}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  {program.category?.name || "General"}
                                </span>
                                <span style={{
                                  fontSize: "0.70rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: item.candidateCount > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.1)",
                                  color: item.candidateCount > 0 ? "#059669" : "#64748b",
                                  border: `1px solid ${item.candidateCount > 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(100, 116, 139, 0.2)"}`
                                }}>
                                  {isFixedTime ? (
                                    <>⏱️ Fixed Total: {item.duration} mins ({item.teamCount} Teams / {item.candidateCount} Candidates)</>
                                  ) : isTeamBased ? (
                                    <>👥 {item.teamCount} Teams {item.teamCount > 0 ? `× ${item.durationPerItem}m = ${item.duration} mins total` : `(${item.duration}m)`}</>
                                  ) : (
                                    <>👤 {item.candidateCount} Candidates {item.candidateCount > 0 ? `× ${item.durationPerItem}m = ${item.duration} mins total` : `(${item.duration}m)`}</>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timing Badge */}
                        {!isUnassigned && (
                          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                            <div style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              backgroundColor: itemClashes.length > 0 ? "#fef2f2" : "#ecfdf5",
                              border: itemClashes.length > 0 ? "1.5px solid #f87171" : "1.5px solid #a7f3d0",
                              color: itemClashes.length > 0 ? "#dc2626" : "#047857",
                              fontWeight: 800,
                              fontSize: "0.85rem",
                            }}>
                              <span>🕒</span>
                              <span>
                                {formatTimeAmPm(item.predictedStart)} – {formatTimeAmPm(item.predictedEnd)}
                              </span>
                            </div>
                            <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>
                              📅 {item.predictedStart.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CLASH WARNING BOX */}
                      {itemClashes.length > 0 && (
                        <div style={{
                          backgroundColor: "#fef2f2",
                          border: "1.5px solid #ef4444",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          color: "#991b1b",
                          fontSize: "0.80rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.12)"
                        }}>
                          <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: "6px", color: "#b91c1c", fontSize: "0.85rem" }}>
                            <span>⚠️</span>
                            <span>CANDIDATE COLLISION ALERT ({itemClashes.length} Conflict{itemClashes.length > 1 ? "s" : ""})</span>
                          </div>

                          {itemClashes.map((c: any, cIdx: number) => {
                            const isProg1 = c.program1Id === program.id;
                            const otherVenue = isProg1 ? c.program2Venue : c.program1Venue;
                            const otherProg = isProg1 ? c.program2Name : c.program1Name;
                            const otherCode = isProg1 ? c.program2Code : c.program1Code;
                            const otherFest = isProg1 ? c.program2Fest : c.program1Fest;
                            const otherStart = isProg1 ? c.program2Start : c.program1Start;
                            const otherEnd = isProg1 ? c.program2End : c.program1End;
                            const otherDateStr = new Date(otherStart).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });

                            return (
                              <div key={cIdx} style={{ backgroundColor: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.82rem" }}>
                                    👤 <u>{c.candidateName}</u> {c.chestNumber ? `(Chest #${c.chestNumber})` : ""}
                                    {c.institutionName ? <span style={{ color: "#64748b", fontWeight: 600 }}> • {c.institutionName}</span> : null}
                                  </div>
                                  <span style={{ fontSize: "0.72rem", backgroundColor: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: "4px", fontWeight: 800 }}>
                                    {c.overlapMinutes}m Overlap
                                  </span>
                                </div>
                                
                                <div style={{ fontSize: "0.76rem", color: "#475569" }}>
                                  Also scheduled in <strong style={{ color: "#0f172a" }}>"{otherCode ? `[${otherCode}] ` : ""}{otherProg}"</strong> ({otherFest}) on <strong style={{ color: "#4338ca" }}>{otherVenue}</strong>:
                                  <span style={{ color: "#b91c1c", fontWeight: 700, marginLeft: "4px" }}>
                                    📅 {otherDateStr} • 🕒 {formatTimeAmPm(otherStart)} – {formatTimeAmPm(otherEnd)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Quick Conflict Resolution Buttons */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", paddingTop: "4px", borderTop: "1px dashed #fca5a5" }}>
                            <span style={{ fontSize: "0.72rem", color: "#991b1b", fontWeight: 700 }}>
                              ⚡ Quick Resolution:
                            </span>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => handleQuickMoveToDay2(program.id)}
                                style={{
                                  padding: "3px 10px",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  backgroundColor: "#4338ca",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                                title="Move this program to Day 2 to resolve overlap"
                              >
                                📅 Move This Program to Day 2
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickShiftTime(program.id, 45)}
                                style={{
                                  padding: "3px 10px",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  backgroundColor: "#059669",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer"
                                }}
                                title="Shift start time by +45 minutes"
                              >
                                🕒 Delay Start (+45m)
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bottom Controls Row: Day, Start Time, Stage, Timing Mode, Duration & Save */}
                      <div style={{ 
                        display: "flex", 
                        flexWrap: "wrap", 
                        gap: "10px", 
                        alignItems: "flex-end",
                        paddingTop: "10px",
                        borderTop: "1px dashed #e2e8f0"
                      }}>
                        {/* Day Selector (Day 1 vs Day 2) */}
                        <div className="form-group" style={{ marginBottom: 0, minWidth: "150px" }}>
                          <label className="form-label" style={{ fontSize: "0.72rem", marginBottom: "2px", fontWeight: 800, color: "#4338ca", display: "flex", alignItems: "center", gap: "3px" }}>
                            <span>📅</span>
                            <span>Scheduled Day</span>
                          </label>
                          <select
                            className="form-input"
                            value={getItemDateStr(program, venueDateStr)}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              const curTime = getItemTimeStr(program, item.predictedStart);
                              handleItemScheduleChange(program.id, newDate, curTime);
                            }}
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.8rem",
                              height: "32px",
                              fontWeight: 800,
                              backgroundColor: "#eef2ff",
                              borderColor: "#c7d2fe",
                              color: "#4338ca",
                              borderRadius: "6px",
                              cursor: "pointer"
                            }}
                          >
                            {festivalDays.map(d => (
                              <option key={d.dateStr} value={d.dateStr}>{d.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Start Time Input (with AM/PM Toggle) */}
                        <div className="form-group" style={{ marginBottom: 0, minWidth: "160px" }}>
                          <label className="form-label" style={{ fontSize: "0.72rem", marginBottom: "2px", fontWeight: 800, color: "#15803d", display: "flex", alignItems: "center", gap: "3px" }}>
                            <span>🕒</span>
                            <span>Start Time</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                              type="time"
                              className="form-input"
                              value={getItemTimeStr(program, item.predictedStart)}
                              onChange={(e) => {
                                const newTime = e.target.value;
                                const curDate = getItemDateStr(program, venueDateStr);
                                handleItemScheduleChange(program.id, curDate, newTime);
                              }}
                              style={{
                                padding: "4px 6px",
                                fontSize: "0.8rem",
                                height: "32px",
                                width: "95px",
                                fontWeight: 800,
                                backgroundColor: "#f0fdf4",
                                borderColor: "#bbf7d0",
                                color: "#15803d"
                              }}
                              title="Set custom start time for this program"
                            />
                            {(() => {
                              const timeStr = getItemTimeStr(program, item.predictedStart);
                              const [hStr, mStr] = timeStr.split(":");
                              const h = parseInt(hStr, 10);
                              const isPm = !isNaN(h) && h >= 12;
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curH = isNaN(h) ? 9 : h;
                                    const targetH = isPm ? (curH - 12) : (curH + 12);
                                    const newTime = `${String(targetH).padStart(2, "0")}:${mStr || "00"}`;
                                    const curDate = getItemDateStr(program, venueDateStr);
                                    handleItemScheduleChange(program.id, curDate, newTime);
                                  }}
                                  title={`Currently ${isPm ? "PM" : "AM"}. Click to toggle.`}
                                  style={{
                                    fontSize: "0.70rem",
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    border: isPm ? "1px solid #f87171" : "1px solid #86efac",
                                    backgroundColor: isPm ? "#fee2e2" : "#dcfce7",
                                    color: isPm ? "#dc2626" : "#15803d",
                                    cursor: "pointer",
                                    height: "32px"
                                  }}
                                >
                                  {isPm ? "PM 🌙" : "AM ☀️"}
                                </button>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Stage Selector */}
                        {!isBreak && (
                          <div className="form-group" style={{ marginBottom: 0, minWidth: "135px" }}>
                            <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "2px", fontWeight: 700 }}>Stage</label>
                            <select 
                              className="form-input" 
                              value={program.venue || "Unassigned"} 
                              id={`venue-${program.id}`} 
                              onChange={(e) => handleAssignVenue(program.id, e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "0.8rem", height: "32px", fontWeight: 700 }}
                            >
                              <option value="Unassigned">Unassigned</option>
                              {allVenues.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Timing Mode */}
                        {!isBreak && (
                          <div className="form-group" style={{ marginBottom: 0, minWidth: "160px" }}>
                            <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "2px", fontWeight: 700 }}>Timing Mode</label>
                            <select
                              id={`mode-${program.id}`}
                              className="form-input"
                              value={isFixedTime ? "TOTAL_FIXED" : isTeamBased ? "PER_TEAM" : "PER_CANDIDATE"}
                              onChange={(e) => {
                                const newMode = e.target.value;
                                const durInput = document.getElementById(`dur-${program.id}`) as HTMLInputElement | null;
                                const val = parseInt(durInput?.value || "5") || 5;
                                let newTotal = val;
                                if (newMode === "PER_TEAM") {
                                  newTotal = item.teamCount > 0 ? item.teamCount * val : val;
                                } else if (newMode === "PER_CANDIDATE") {
                                  newTotal = item.candidateCount > 0 ? item.candidateCount * val : val;
                                }
                                handleDurationChange(venue, program.id, newTotal, newMode);
                              }}
                              style={{ padding: "4px 8px", fontSize: "0.78rem", height: "32px", fontWeight: 700 }}
                            >
                              <option value="PER_TEAM">👥 Per Group/Team</option>
                              <option value="PER_CANDIDATE">👤 Per Candidate</option>
                              <option value="TOTAL_FIXED">⏱️ Fixed Total</option>
                            </select>
                          </div>
                        )}

                        {/* Duration Input with Equation */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "2px", fontWeight: 700 }}>
                            {isFixedTime ? "Total (mins)" : isTeamBased ? "Mins / Team" : "Mins / Candidate"}
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input 
                              type="number" 
                              className="form-input" 
                              defaultValue={isFixedTime ? (item.duration || 10) : (item.durationPerItem || 5)} 
                              id={`dur-${program.id}`}
                              min={1}
                              onChange={(e) => {
                                const entered = parseInt(e.target.value) || 1;
                                let newTotal = entered;
                                const modeVal = (document.getElementById(`mode-${program.id}`) as HTMLSelectElement | null)?.value || (isFixedTime ? "TOTAL_FIXED" : isTeamBased ? "PER_TEAM" : "PER_CANDIDATE");
                                if (modeVal === "PER_TEAM") {
                                  newTotal = item.teamCount > 0 ? item.teamCount * entered : entered;
                                } else if (modeVal === "PER_CANDIDATE") {
                                  newTotal = item.candidateCount > 0 ? item.candidateCount * entered : entered;
                                }
                                handleDurationChange(venue, program.id, newTotal, modeVal);
                              }}
                              style={{ padding: "4px 8px", fontSize: "0.8rem", width: "65px", height: "32px" }}
                            />
                            {!isFixedTime && isTeamBased && item.teamCount > 0 && (
                              <span style={{ fontSize: "0.72rem", color: "#475569", whiteSpace: "nowrap" }}>
                                × {item.teamCount} = <strong>{item.duration}m</strong>
                              </span>
                            )}
                            {!isFixedTime && !isTeamBased && item.candidateCount > 0 && (
                              <span style={{ fontSize: "0.72rem", color: "#475569", whiteSpace: "nowrap" }}>
                                × {item.candidateCount} = <strong>{item.duration}m</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Save Item Button with Live Status */}
                        <button 
                          className="btn btn-primary"
                          style={{
                            padding: "5px 16px",
                            fontSize: "0.8rem",
                            flex: "0 0 auto",
                            height: "32px",
                            fontWeight: 800,
                            backgroundColor: savedItemMap[program.id] ? "#16a34a" : "#8E0033",
                            borderColor: savedItemMap[program.id] ? "#16a34a" : "#8E0033",
                            transition: "all 0.2s ease"
                          }}
                          disabled={loadingId === program.id}
                          onClick={() => handleSaveItem(program, venue, item)}
                        >
                          {loadingId === program.id ? "Saving..." : savedItemMap[program.id] || "💾 Save Item"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
