"use client";

import { useState, useEffect, useMemo } from "react";
import ZoneScheduleAnalyzer from "./ZoneScheduleAnalyzer";
import { 
  getZoneCandidatesForProgram, 
  calculateDynamicProgramDuration,
  getFestivalBaseDate,
  detectCandidateScheduleClashes,
  formatTimeAmPm,
  CandidateClash,
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
  unpublishSchedule
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

  // Load saved venue buffer gaps from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`venue_buffers_${eventId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setVenueBuffers(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load venue buffers from localStorage:", e);
    }
  }, [eventId]);

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

  // Helper to get predicted sequential timeline starting strictly from 09:00 AM IST
  const getPredictedVenueTimeline = (venue: string, venuePrograms: any[], bufferMinutes: number = 5) => {
    const baseDate = getFestivalBaseDate(eventStartDate);
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

  // Compute calculated timelines for all venues
  const allVenueTimelines = useMemo(() => {
    const timelines: Record<string, any[]> = {};
    for (const v of allVenues) {
      const vProgs = groupedPrograms[v] || [];
      const buf = getVenueBuffer(v, vProgs);
      const { predictedList } = getPredictedVenueTimeline(v, vProgs, buf);
      timelines[v] = predictedList;
    }
    return timelines;
  }, [groupedPrograms, allVenues, venueBuffers, eventStartDate, targetZoneId]);

  // Live Real-Time Candidate Clash Detection
  const { clashes, clashesByProgramId, clashCandidateCount } = useMemo(() => {
    return detectCandidateScheduleClashes(allVenueTimelines, targetZoneId);
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
    const { predictedList } = getPredictedVenueTimeline(venue, venueProgs, buf);

    setLoadingId(`apply-${venue}`);
    try {
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
        alert(`✅ Successfully saved schedule for ${venueProgs.length} programs in ${venue}!`);
      } else {
        alert("Failed to save schedule: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error saving schedule: " + (err.message || "Unknown error"));
    } finally {
      setLoadingId(null);
    }
  };

  // Auto-calculate venue program durations by candidates attending
  const handleAutoCalculateVenueByCandidates = async (venue: string) => {
    const venueProgs = groupedPrograms[venue] || [];
    if (venueProgs.length === 0) return;

    const buf = getVenueBuffer(venue, venueProgs);
    setLoadingId(`auto-calc-${venue}`);
    try {
      const updatedVenueProgs = venueProgs.map(p => {
        const zoneCandidates = getZoneCandidatesForProgram(p.assignments, targetZoneId);
        const calcInfo = calculateDynamicProgramDuration(p, zoneCandidates, { targetZoneId });
        return { ...p, duration: calcInfo.duration, durationMode: calcInfo.durationMode };
      });

      const { predictedList } = getPredictedVenueTimeline(venue, updatedVenueProgs, buf);
      const updateMap = new Map(predictedList.map(item => [item.program.id, { start: item.predictedStart.toISOString(), duration: item.duration, mode: item.durationMode }]));

      setPrograms(prev => prev.map(p => {
        if (updateMap.has(p.id)) {
          const info = updateMap.get(p.id)!;
          return { ...p, duration: info.duration, durationMode: info.mode, startTime: info.start, venue };
        }
        return p;
      }));

      const updates = predictedList.map(item => ({
        id: item.program.id,
        startTime: item.predictedStart.toISOString(),
        duration: item.duration,
        durationMode: item.durationMode,
        stageType: item.program.stageType
      }));

      await applySequentialVenueSchedule(eventId, venue, updates);
      alert(`✅ Auto-calculated ${predictedList.length} programs in ${venue} based on registered candidates!`);
    } catch (e: any) {
      alert("Failed to auto-calculate: " + (e.message || "Unknown error"));
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

          <ZoneScheduleAnalyzer 
            isSuperAdmin={isSuperAdmin} 
            activeEventId={eventId} 
            onScheduleUpdated={() => window.location.reload()} 
          />

          <button 
            className="btn btn-secondary" 
            onClick={async () => {
              if (!confirm("Automatically assign unscheduled programs to stages starting at 09:00 AM?")) return;
              setLoadingId("auto-gen");
              try {
                const res = await autoGenerateSchedule(eventId, allVenues);
                if (res.success) window.location.reload();
                else alert("Failed to auto-schedule.");
              } finally {
                setLoadingId(null);
              }
            }} 
            disabled={loadingId !== null}
          >
            {loadingId === "auto-gen" ? "..." : "🤖 Auto-Assign Venues"}
          </button>
        </div>
      </div>

      {/* REAL-TIME CANDIDATE CLASH BANNER */}
      {clashes.length > 0 ? (
        <div style={{
          padding: "16px 20px",
          borderRadius: "12px",
          backgroundColor: "#fef2f2",
          border: "2px solid #ef4444",
          color: "#991b1b",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 4px 12px rgba(239, 68, 68, 0.12)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#991b1b" }}>
                  Real-Time Program Clashes Detected ({clashes.length} Clash{clashes.length > 1 ? "es" : ""})
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#b91c1c" }}>
                  <strong>{clashCandidateCount} student(s)</strong> are scheduled in different programs on separate stages at the same time. 
                  Adjust the program order below (using <strong>▲</strong> or <strong>▼</strong>) to eliminate the clashes!
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "8px", maxHeight: "180px", overflowY: "auto", padding: "4px" }}>
            {clashes.map((c, idx) => (
              <div 
                key={idx} 
                style={{ 
                  backgroundColor: "#ffffff", 
                  border: "1px solid #fca5a5", 
                  borderRadius: "8px", 
                  padding: "8px 12px",
                  fontSize: "0.78rem"
                }}
              >
                <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: "3px" }}>
                  👤 {c.candidateName}
                </div>
                <div style={{ color: "#334155" }}>
                  📍 <strong>{c.program1Venue}</strong>: {c.program1Name} ({formatTimeAmPm(c.program1Start)} - {formatTimeAmPm(c.program1End)})
                </div>
                <div style={{ color: "#334155" }}>
                  📍 <strong>{c.program2Venue}</strong>: {c.program2Name} ({formatTimeAmPm(c.program2Start)} - {formatTimeAmPm(c.program2End)})
                </div>
                <div style={{ color: "#b91c1c", fontWeight: 700, marginTop: "2px", fontSize: "0.72rem" }}>
                  Overlap: {c.overlapMinutes} mins
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          padding: "10px 16px",
          borderRadius: "10px",
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
          <span>No Candidate Clashes: All scheduled programs across all stages are conflict-free!</span>
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
            const hasClash = (groupedPrograms[v] || []).some(p => clashesByProgramId[p.id]);
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
                {hasClash && <span title="Has candidate clash" style={{ color: "#ef4444" }}>⚠️</span>}
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
        const timeline = allVenueTimelines[venue] ? {
          predictedList: allVenueTimelines[venue],
          totalDurationMinutes: allVenueTimelines[venue].reduce((acc: number, p: any) => acc + p.duration, 0) + Math.max(0, allVenueTimelines[venue].length - 1) * buf,
          totalCandidates: allVenueTimelines[venue].reduce((acc: number, p: any) => acc + p.candidateCount, 0),
          predictedStart: getFestivalBaseDate(eventStartDate),
          predictedEnd: allVenueTimelines[venue].length > 0 ? allVenueTimelines[venue][allVenueTimelines[venue].length - 1].predictedEnd : getFestivalBaseDate(eventStartDate)
        } : getPredictedVenueTimeline(venue, venueProgs, buf);

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
                    className="btn btn-secondary"
                    style={{ padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700 }}
                    onClick={() => handleAutoCalculateVenueByCandidates(venue)}
                    disabled={loadingId !== null}
                    title="Recalculate durations from registered candidate counts"
                  >
                    ⚡ Auto-Calculate Durations
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
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      backgroundColor: "#f0fdf4",
                      color: "#15803d",
                      border: "1.5px solid #bbf7d0",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 800
                    }}>
                      <span>🕒</span>
                      <span>Starts: <strong>09:00 AM (Fixed IST)</strong></span>
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
