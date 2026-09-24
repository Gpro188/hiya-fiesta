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
  eventStartDate = null
}: { 
  initialPrograms: any[], 
  eventId: string, 
  targetZoneId?: string | null,
  allJudges?: any[],
  isSuperAdmin?: boolean,
  eventStatusOverride?: string,
  eventStartDate?: string | null
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

  // Venue buffer configuration: { [venue]: bufferMinutes }
  const [venueBuffers, setVenueBuffers] = useState<Record<string, number>>({});

  // Venue start time configuration: { [venue]: "09:30" }
  const [venueStartTimes, setVenueStartTimes] = useState<Record<string, string>>({});

  // -- Global Schedule Timing Settings ------------------------------------------
  const [globalTimingOpen, setGlobalTimingOpen] = useState(false);
  const [globalMinPerCandidate, setGlobalMinPerCandidate] = useState(10);
  const [globalBufferMinutes, setGlobalBufferMinutes] = useState(2);
  const [globalGroupFixedMin, setGlobalGroupFixedMin] = useState(30);
  const [globalTimingSaving, setGlobalTimingSaving] = useState(false);
  const [globalTimingMsg, setGlobalTimingMsg] = useState<string | null>(null);

  // -- Clash Analysis ------------------------------------------------------------
  const [clashPanelOpen, setClashPanelOpen] = useState(false);
  const [clashLoading, setClashLoading] = useState(false);
  const [clashFixLoading, setClashFixLoading] = useState(false);
  const [scoredClashes, setScoredClashes] = useState<ScoredClash[]>([]);
  const [clashStats, setClashStats] = useState<{critical:number;high:number;medium:number;manageable:number}>({critical:0,high:0,medium:0,manageable:0});
  const [clashMsg, setClashMsg] = useState<string | null>(null);

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
      return selectedCategory === "All" || cat === selectedCategory;
    });

    filtered.forEach(p => {
      const v = p.venue && allVenues.includes(p.venue) ? p.venue : "Unassigned";
      if (!map[v]) map[v] = [];
      map[v].push(p);
    });

    return map;
  }, [programs, allVenues, selectedCategory]);

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

  // Helper to get predicted sequential timeline starting from 09:30 AM IST (or venue start time)
  const getPredictedVenueTimeline = (venue: string, venuePrograms: any[], bufferMinutes: number = 5, customStartTime?: string) => {
    const startTimeStr = customStartTime || getVenueStartTime(venue, venuePrograms);
    const [sh, sm] = startTimeStr.split(":").map(Number);
    const baseDate = getFestivalBaseDate(eventStartDate, isNaN(sh) ? 9 : sh, isNaN(sm) ? 30 : sm);
    let currentCursor = new Date(baseDate.getTime());
    let totalCandidates = 0;

    const predictedList = venuePrograms.map((p, idx) => {
      const zoneCandidates = getZoneCandidatesForProgram(p.assignments, targetZoneId);
      const calcInfo = calculateDynamicProgramDuration(p, zoneCandidates, { targetZoneId });

      totalCandidates += calcInfo.candidateCount;
      const effectiveDuration = p.duration && p.duration > 0 ? p.duration : (calcInfo.duration > 0 ? calcInfo.duration : 10);

      const start = new Date(currentCursor.getTime());
      const end = new Date(start.getTime() + effectiveDuration * 60000);
      currentCursor = new Date(end.getTime() + bufferMinutes * 60000);

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
        filteredAssignments: zoneCandidates
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
      const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, newBuffer);
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
      const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf, newTime);
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
      const { predictedList } = getPredictedVenueTimeline(v, vProgs, buf, startTimeStr);
      timelines[v] = predictedList;
    }
    return timelines;
  }, [groupedPrograms, allVenues, venueBuffers, venueStartTimes, eventStartDate, targetZoneId]);

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

    const buf = getVenueBuffer(venue, venueProgs);
    const startTimeStr = getVenueStartTime(venue, venueProgs);
    const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf, startTimeStr);

    setLoadingId(`apply-${venue}`);
    try {
      try {
        localStorage.setItem(`venue_buffers_${eventId}`, JSON.stringify({ ...venueBuffers, [venue]: buf }));
        localStorage.setItem(`venue_start_times_${eventId}`, JSON.stringify({ ...venueStartTimes, [venue]: startTimeStr }));
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
        alert(`✅ Successfully saved schedule starting at ${formatTimeAmPm(predictedList[0]?.predictedStart)} for ${venueProgs.length} programs in ${venue}!`);
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

      {/* 4-SEVERITY CANDIDATE CLASH & FIX ASSISTANT */}
      {liveScoredClashes.length > 0 ? (
        <div style={{
          padding: "18px 22px",
          borderRadius: "14px",
          backgroundColor: "#ffffff",
          border: criticalCount > 0 ? "2px solid #ef4444" : highCount > 0 ? "2px solid #f97316" : "2px solid #eab308",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}>
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.6rem" }}>
                {criticalCount > 0 ? "🚨" : highCount > 0 ? "⚠️" : "⚡"}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                  Schedule Clash Analysis ({liveScoredClashes.length} Total Overlap{liveScoredClashes.length > 1 ? "s" : ""})
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Candidate clashes categorized into 4 severity levels with auto-fix slot reordering.
                </p>
              </div>
            </div>

            {/* Severity summary pills */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {criticalCount > 0 && (
                <span style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 800 }}>
                  🔴 Critical: {criticalCount}
                </span>
              )}
              {highCount > 0 && (
                <span style={{ backgroundColor: "#fff7ed", color: "#ea580c", border: "1px solid #fdba74", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 800 }}>
                  🟠 High: {highCount}
                </span>
              )}
              {mediumCount > 0 && (
                <span style={{ backgroundColor: "#fefce8", color: "#ca8a04", border: "1px solid #fde047", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 800 }}>
                  🟡 Medium: {mediumCount}
                </span>
              )}
              {manageableCount > 0 && (
                <span style={{ backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 800 }}>
                  🟢 Manageable: {manageableCount}
                </span>
              )}

              {/* Auto Fix Button for Manageable Clashes */}
              {manageableCount > 0 && (
                <button
                  onClick={handleResolveManageableClashes}
                  disabled={clashFixLoading}
                  className="btn"
                  style={{
                    background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.8rem",
                    padding: "6px 14px",
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
                  <span>{clashFixLoading ? "Reordering..." : `Auto-Fix Manageable (${manageableCount})`}</span>
                </button>
              )}
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

          {/* Cards List */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px", maxHeight: "240px", overflowY: "auto", padding: "2px" }}>
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
              </div>
            ))}
          </div>
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
        const [sh, sm] = startTimeStr.split(":").map(Number);
        const baseDate = getFestivalBaseDate(eventStartDate, isNaN(sh) ? 9 : sh, isNaN(sm) ? 30 : sm);

        const timeline = allVenueTimelines[venue] ? {
          predictedList: allVenueTimelines[venue],
          totalDurationMinutes: allVenueTimelines[venue].reduce((acc: number, p: any) => acc + p.duration, 0) + Math.max(0, allVenueTimelines[venue].length - 1) * buf,
          totalCandidates: allVenueTimelines[venue].reduce((acc: number, p: any) => acc + p.candidateCount, 0),
          predictedStart: baseDate,
          predictedEnd: allVenueTimelines[venue].length > 0 ? allVenueTimelines[venue][allVenueTimelines[venue].length - 1].predictedEnd : baseDate
        } : getPredictedVenueTimeline(venue, venueProgs, buf, startTimeStr);

        const { predictedList, totalDurationMinutes, totalCandidates, predictedStart, predictedEnd } = timeline;

        const eveningCutoff = new Date(predictedStart.getTime());
        eveningCutoff.setHours(18, 0, 0, 0);
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
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#15803d", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>🕒</span>
                        <span>Starts:</span>
                      </label>
                      <select 
                        className="form-input" 
                        value={startTimeStr}
                        onChange={(e) => handleVenueStartTimeChange(venue, e.target.value)}
                        style={{ 
                          fontSize: "0.80rem", 
                          padding: "3px 8px", 
                          width: "125px", 
                          fontWeight: 800,
                          backgroundColor: "#f0fdf4",
                          borderColor: "#bbf7d0",
                          color: "#15803d"
                        }}
                      >
                        <option value="09:30">09:30 AM</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="08:30">08:30 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="10:30">10:30 AM</option>
                        {![ "09:30", "09:00", "08:30", "10:00", "10:30" ].includes(startTimeStr) && (
                          <option value={startTimeStr}>{startTimeStr} (IST)</option>
                        )}
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                        Buffer Gap:
                      </label>
                      <select 
                        className="form-input" 
                        value={buf}
                        onChange={(e) => handleVenueBufferChange(venue, parseInt(e.target.value) || 0)}
                        style={{ fontSize: "0.80rem", padding: "3px 6px", width: "125px" }}
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
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.82rem" }}>
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
                    <div 
                      key={program.id} 
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
                            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: isBreak ? "var(--warning)" : "#0f172a" }}>
                              {isBreak ? `☕ ${program.name}` : program.name}
                              {program.programCode && (
                                <span style={{ marginLeft: "6px", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                                  ({program.programCode})
                                </span>
                              )}
                            </h4>
                            
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
                          <div style={{ textAlign: "right" }}>
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
                          </div>
                        )}
                      </div>

                      {/* CLASH WARNING BOX */}
                      {itemClashes.length > 0 && (
                        <div style={{
                          backgroundColor: "#fef2f2",
                          border: "1.5px solid #ef4444",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          color: "#991b1b",
                          fontSize: "0.78rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px"
                        }}>
                          {itemClashes.map((c: any, cIdx: number) => {
                            const otherVenue = c.program1Id === program.id ? c.program2Venue : c.program1Venue;
                            const otherProg = c.program1Id === program.id ? c.program2Name : c.program1Name;
                            const otherStart = c.program1Id === program.id ? c.program2Start : c.program1Start;
                            const otherEnd = c.program1Id === program.id ? c.program2End : c.program1End;

                            return (
                              <div key={cIdx}>
                                ⚠️ <strong>Candidate Clash:</strong> <u>{c.candidateName}</u> is also scheduled in <strong>"{otherProg}"</strong> on <strong>{otherVenue}</strong> ({formatTimeAmPm(otherStart)} - {formatTimeAmPm(otherEnd)}).
                              </div>
                            );
                          })}
                          <span style={{ fontSize: "0.72rem", color: "#b91c1c", fontWeight: 600 }}>
                            👉 Click <strong>▲</strong> or <strong>▼</strong> above to move this program up/down and resolve this clash!
                          </span>
                        </div>
                      )}

                      {/* Bottom Controls Row: Stage Assignment, Timing Mode, Duration & Save */}
                      <div style={{ 
                        display: "flex", 
                        flexWrap: "wrap", 
                        gap: "10px", 
                        alignItems: "flex-end",
                        paddingTop: "8px",
                        borderTop: "1px dashed #f1f5f9"
                      }}>
                        {/* Stage Selector */}
                        {!isBreak && (
                          <div className="form-group" style={{ marginBottom: 0, minWidth: "140px" }}>
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
                          <div className="form-group" style={{ marginBottom: 0, minWidth: "170px" }}>
                            <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "2px", fontWeight: 700 }}>Timing Calculation Mode</label>
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
                              <option value="PER_TEAM">👥 Per Group/Team (Teams × Mins)</option>
                              <option value="PER_CANDIDATE">👤 Per Candidate (Candidates × Mins)</option>
                              <option value="TOTAL_FIXED">⏱️ Fixed Total Time (No multiplier)</option>
                            </select>
                          </div>
                        )}

                        {/* Duration Input with Equation */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "2px", fontWeight: 700 }}>
                            {isFixedTime ? "Total Time (mins)" : isTeamBased ? "Mins / Team" : "Mins / Candidate"}
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
                              style={{ padding: "4px 8px", fontSize: "0.8rem", width: "70px", height: "32px" }}
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

                        {/* Save Item Button */}
                        <button 
                          className="btn btn-primary"
                          style={{ padding: "5px 14px", fontSize: "0.8rem", flex: "0 0 auto", height: "32px", fontWeight: 800 }}
                          disabled={loadingId === program.id}
                          onClick={async () => {
                            setLoadingId(program.id);
                            try {
                              const v = (document.getElementById(`venue-${program.id}`) as HTMLSelectElement | null)?.value || venue;
                              const targetVenue = v === "Unassigned" ? null : v;
                              const modeSelect = document.getElementById(`mode-${program.id}`) as HTMLSelectElement | null;
                              const modeVal = modeSelect?.value || (isFixedTime ? "TOTAL_FIXED" : isTeamBased ? "PER_TEAM" : "PER_CANDIDATE");
                              const enteredMins = parseInt((document.getElementById(`dur-${program.id}`) as HTMLInputElement).value) || 1;
                              
                              let d = enteredMins;
                              if (modeVal === "PER_TEAM") {
                                d = item.teamCount > 0 ? item.teamCount * enteredMins : enteredMins;
                              } else if (modeVal === "PER_CANDIDATE") {
                                d = item.candidateCount > 0 ? item.candidateCount * enteredMins : enteredMins;
                              }

                              const s = program.stageType || "ON_STAGE";
                              await updateProgramSchedule(program.id, {
                                venue: targetVenue,
                                startTime: targetVenue ? item.predictedStart.toISOString() : null,
                                duration: d,
                                durationMode: modeVal,
                                stageType: s
                              }, eventId);
                              alert("✅ Program saved!");
                            } catch (e: any) {
                              alert("Error saving: " + (e.message || "Unknown error"));
                            } finally {
                              setLoadingId(null);
                            }
                          }}
                        >
                          {loadingId === program.id ? "..." : "Save"}
                        </button>
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
