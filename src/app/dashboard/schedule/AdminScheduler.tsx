"use client";

import { useState, useEffect } from "react";
import ZoneScheduleAnalyzer from "./ZoneScheduleAnalyzer";
import { getZoneCandidatesForProgram, calculateDynamicProgramDuration } from "@/lib/scheduleCalculator";
import { 
  updateProgramSchedule, 
  autoCalculateCandidateSlots, 
  addBreak, 
  autoGenerateSchedule, 
  shiftSchedule, 
  publishMasterScheduleToAllZones,
  renameVenue,
  deleteVenue,
  applySequentialVenueSchedule
} from "./actions";
import { importScheduleFromExcel, checkSchedulingConflicts } from "./importActions";

export default function AdminScheduler({ 
  initialPrograms, 
  eventId, 
  targetZoneId = null,
  allJudges = [],
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
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [newVenueName, setNewVenueName] = useState("");
  const [localVenues, setLocalVenues] = useState<string[]>([]);
  
  // Venue time configuration state: { [venue]: { startTime, endTime, buffer } }
  const [venueSettings, setVenueSettings] = useState<Record<string, { startTime: string; endTime: string; buffer: number }>>({});

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStage, setSelectedStage] = useState("All");
  
  const categoryOrder = ["All", "FADHILA", "FADHEELA", "GENERAL PROGRAMS"];
  const stageOrder = ["All", "On Stage", "Off Stage"];

  // Sync state with props
  useEffect(() => {
    setPrograms(initialPrograms);
  }, [initialPrograms]);

  useEffect(() => {
    fetchConflicts();
  }, [programs, eventId, targetZoneId]);

  const fetchConflicts = async () => {
    const result = await checkSchedulingConflicts(eventId, targetZoneId);
    if (result.success) {
      setConflicts(result.conflicts || []);
    }
  };

  // Helper to format a Date as YYYY-MM-DDTHH:mm
  const formatDateTimeLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Helper to get venue configuration (Always strictly starts at 9:00 AM)
  const getVenueConfig = (venue: string) => {
    let baseDate = eventStartDate ? new Date(eventStartDate) : new Date();
    if (isNaN(baseDate.getTime())) baseDate = new Date();
    baseDate.setHours(9, 0, 0, 0); // Strictly 09:00 AM!

    const initialStart = formatDateTimeLocal(baseDate);
    const buffer = venueSettings[venue]?.buffer || 0;

    return { startTime: initialStart, buffer };
  };

  const updateVenueConfig = (venue: string, field: "buffer", value: any) => {
    setVenueSettings(prev => {
      const current = prev[venue] || getVenueConfig(venue);
      return {
        ...prev,
        [venue]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Auto-predict cascading sequential timeline starting strictly from 9:00 AM
  const getPredictedVenueTimeline = (venuePrograms: any[], venueStartTimeStr?: string, bufferMinutes: number = 0) => {
    let baseDate = eventStartDate ? new Date(eventStartDate) : new Date();
    if (isNaN(baseDate.getTime())) baseDate = new Date();
    baseDate.setHours(9, 0, 0, 0); // Strictly 9:00 AM sharp!

    let currentCursor = new Date(baseDate.getTime());
    let totalCandidates = 0;

    const predictedList = venuePrograms.map((p, idx) => {
      const zoneCandidates = getZoneCandidatesForProgram(p.assignments, targetZoneId);
      const calcInfo = calculateDynamicProgramDuration(p, zoneCandidates, { targetZoneId });

      totalCandidates += calcInfo.candidateCount;
      const effectiveDuration = p.duration && p.duration > 0 ? p.duration : calcInfo.duration;

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

  // Auto-calculate venue program durations based on registered candidates attending in this zone/event
  const handleAutoCalculateVenueByCandidates = async (venue: string) => {
    const venueProgs = groupedPrograms[venue] || [];
    if (venueProgs.length === 0) return;

    const config = getVenueConfig(venue);
    setLoadingId(`auto-calc-${venue}`);
    try {
      // Calculate dynamic duration for each program as candidateCount * minPerCandidate
      const updatedVenueProgs = venueProgs.map(p => {
        const zoneCandidates = getZoneCandidatesForProgram(p.assignments, targetZoneId);
        const calcInfo = calculateDynamicProgramDuration(p, zoneCandidates, { targetZoneId });
        return { ...p, duration: calcInfo.duration };
      });

      const { predictedList } = getPredictedVenueTimeline(updatedVenueProgs, config.startTime, config.buffer);
      const updateMap = new Map(predictedList.map(item => [item.program.id, { start: item.predictedStart.toISOString(), duration: item.duration }]));

      setPrograms(prev => {
        return prev.map(p => {
          if (updateMap.has(p.id)) {
            const info = updateMap.get(p.id)!;
            return { ...p, duration: info.duration, startTime: info.start, venue };
          }
          return p;
        });
      });

      const updates = predictedList.map(item => ({
        id: item.program.id,
        startTime: item.predictedStart.toISOString(),
        duration: item.duration,
        stageType: item.program.stageType,
        judgeIds: item.program.judges?.map((j: any) => j.id) || []
      }));

      await applySequentialVenueSchedule(eventId, venue, updates);
      alert(`✅ Auto-calculated ${predictedList.length} programs in ${venue} based on registered candidates! Timings start at 09:00 AM.`);
    } catch (e: any) {
      alert("Failed to auto-calculate: " + (e.message || "Unknown error"));
    } finally {
      setLoadingId(null);
    }
  };

  // Reordering inside venue: instantly updates sequence and auto-saves the 9:00 AM sequential timings
  const handleMoveProgram = async (venue: string, currentIndex: number, direction: "up" | "down") => {
    const venueProgs = [...(groupedPrograms[venue] || [])];
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= venueProgs.length) return;

    const itemA = venueProgs[currentIndex];
    const itemB = venueProgs[targetIndex];
    venueProgs[currentIndex] = itemB;
    venueProgs[targetIndex] = itemA;

    // Recalculate sequential times starting from 9:00 AM
    const config = getVenueConfig(venue);
    const { predictedList } = getPredictedVenueTimeline(venueProgs, config.startTime, config.buffer);

    // Update local state immediately with the new order and predicted start times
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

    // Auto-save sequential schedule directly to DB
    try {
      const updates = predictedList.map(item => ({
        id: item.program.id,
        startTime: item.predictedStart.toISOString(),
        duration: item.duration,
        stageType: item.program.stageType,
        judgeIds: item.program.judges?.map((j: any) => j.id) || []
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

    const config = getVenueConfig(venue);
    const { predictedList } = getPredictedVenueTimeline(venueProgs, config.startTime, config.buffer);
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
        stageType: item.program.stageType,
        judgeIds: item.program.judges?.map((j: any) => j.id) || []
      }));
      await applySequentialVenueSchedule(eventId, venue, updates);
    } catch (e) {
      console.error("Auto-save on jump failed:", e);
    }
  };

  const handleDurationChange = (venue: string, programId: string, newDuration: number) => {
    const venueProgs = (groupedPrograms[venue] || []).map(p => p.id === programId ? { ...p, duration: newDuration } : p);
    const config = getVenueConfig(venue);
    const { predictedList } = getPredictedVenueTimeline(venueProgs, config.startTime, config.buffer);
    const updateMap = new Map(predictedList.map(item => [item.program.id, item.predictedStart.toISOString()]));

    setPrograms(prev => {
      return prev.map(p => {
        if (p.id === programId) {
          return { ...p, duration: newDuration, startTime: updateMap.get(p.id) || p.startTime };
        }
        if (updateMap.has(p.id)) {
          return { ...p, startTime: updateMap.get(p.id) };
        }
        return p;
      });
    });
  };

  // Apply & Save all sequential timings from 9:00 AM to all programs in the venue
  const handleApplyVenueTimings = async (venue: string) => {
    const venueProgs = groupedPrograms[venue] || [];
    if (venueProgs.length === 0) return;

    const config = getVenueConfig(venue);
    const { predictedList } = getPredictedVenueTimeline(venueProgs, config.startTime, config.buffer);

    setLoadingId(`apply-${venue}`);
    try {
      const updates = predictedList.map(item => ({
        id: item.program.id,
        startTime: item.predictedStart.toISOString(),
        duration: item.duration,
        stageType: item.program.stageType,
        judgeIds: item.program.judges?.map((j: any) => j.id) || []
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
        alert(`✅ Successfully set and saved schedule for ${venueProgs.length} programs starting at 9:00 AM!`);
      } else {
        alert("Failed to save schedule: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error saving schedule: " + (err.message || "Unknown error"));
    } finally {
      setLoadingId(null);
    }
  };

  // Rename Venue
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
        setVenueSettings(prev => {
          const next = { ...prev };
          if (next[oldName]) {
            next[clean] = next[oldName];
            delete next[oldName];
          }
          return next;
        });
      } else {
        alert("Failed to rename venue: " + (res.error || "Unknown error"));
      }
    } finally {
      setLoadingId(null);
    }
  };

  // Delete Venue
  const handleDeleteVenue = async (venueName: string) => {
    const count = programs.filter(p => p.venue === venueName).length;
    const msg = count > 0 
      ? `Are you sure you want to delete venue "${venueName}"?\nAll ${count} assigned program(s) will be set to Unassigned.` 
      : `Are you sure you want to delete venue "${venueName}"?`;
    if (!confirm(msg)) return;

    setLoadingId(`delete-${venueName}`);
    try {
      const res = await deleteVenue(eventId, venueName);
      if (res.success) {
        setPrograms(prev => prev.map(p => p.venue === venueName ? { ...p, venue: null } : p));
        setLocalVenues(prev => prev.filter(v => v !== venueName));
        setVenueSettings(prev => {
          const next = { ...prev };
          delete next[venueName];
          return next;
        });
      } else {
        alert("Failed to delete venue: " + (res.error || "Unknown error"));
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpdate = async (id: string, venue: string, startTime: string, duration: number, stageType: string, judgeIds: string[]) => {
    setLoadingId(id);
    const result = await updateProgramSchedule(id, { 
      venue: venue || null, 
      startTime: startTime || null,
      duration,
      stageType,
      judgeIds
    }, eventId);

    setPrograms(programs.map(p => {
      if (p.id === id) {
        const assignedJudges = allJudges.filter(j => judgeIds.includes(j.id));
        return { ...p, venue, startTime, duration, stageType, judges: assignedJudges };
      }
      return p;
    }));
    setLoadingId(null);
  };

  const handleAddBreak = async (venue: string) => {
    const breakName = prompt("Enter Break Name (e.g., Lunch Break):", "Lunch Break");
    const durationStr = prompt("Enter duration in minutes:", "60");
    if (!breakName || !durationStr) return;
    const duration = parseInt(durationStr);
    
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

  const handleAutoGenerate = async () => {
    if (!confirm("This will automatically assign unscheduled programs to available venues starting at 9:00 AM. Are you sure?")) return;
    
    setLoadingId("auto-gen");
    try {
      const res = await autoGenerateSchedule(eventId, Array.from(allVenues));
      if (res.success) {
        window.location.reload();
      } else {
        alert("Failed to auto-schedule.");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleShiftSchedule = async (venue: string, minutes: number) => {
    if (!confirm(`Shift all programs in ${venue} by ${minutes} minutes?`)) return;
    setLoadingId("shift");
    try {
      const res = await shiftSchedule(eventId, venue, minutes);
      if (res.success) {
        window.location.reload();
      } else {
        alert("Failed to shift schedule.");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handlePublishMasterSchedule = async () => {
    if (!confirm("This will publish this Master Schedule (Venues, Timings, Stage Types & Durations) to all Zone Festivals as their default schedule. Existing programs in zones will be updated with these timings. Proceed?")) return;
    
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

  // Extract unique venues
  const allVenues = new Set([...localVenues, ...programs.map(p => p.venue).filter(Boolean)]);
  
  const handleAddVenue = () => {
    if (newVenueName && !allVenues.has(newVenueName)) {
      setLocalVenues([...localVenues, newVenueName.trim()]);
      setNewVenueName("");
    }
  };

  // Group filtered programs by venue
  const groupedPrograms: Record<string, any[]> = {};
  allVenues.forEach(v => groupedPrograms[v] = []);
  groupedPrograms["Unassigned"] = [];

  const filteredPrograms = programs.filter(p => {
    let cat = "GENERAL PROGRAMS";
    if (p.type === "GENERAL") cat = "GENERAL PROGRAMS";
    else if (p.category?.name) cat = p.category.name.toUpperCase();
    
    let stg = p.stageType === "ON_STAGE" ? "On Stage" : "Off Stage";

    const matchesCat = selectedCategory === "All" || cat === selectedCategory;
    const matchesStage = selectedStage === "All" || stg === selectedStage;
    return matchesCat && matchesStage;
  });

  filteredPrograms.forEach(p => {
    if (p.venue && allVenues.has(p.venue)) {
      groupedPrograms[p.venue].push(p);
    } else {
      groupedPrograms["Unassigned"].push(p);
    }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
      
      {/* Top Venue Management & Master Controls */}
      <div className="glass-panel" style={{ padding: "var(--spacing-md)", display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 360px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem", fontWeight: 800 }}>🏛️ Venue Management</h3>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="New Venue Name (e.g. Main Stage)"
              value={newVenueName}
              onChange={e => setNewVenueName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddVenue(); }}
              style={{ maxWidth: "280px" }}
            />
            <button className="btn btn-secondary" onClick={handleAddVenue} style={{ fontWeight: 700 }}>
              + Add Venue
            </button>
          </div>

          {/* Quick Venue Badges with Rename and Delete buttons */}
          {Array.from(allVenues).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>Active Venues:</span>
              {Array.from(allVenues).map(v => {
                const count = programs.filter(p => p.venue === v).length;
                return (
                  <div
                    key={v}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      backgroundColor: "rgba(142, 0, 51, 0.08)",
                      border: "1px solid rgba(142, 0, 51, 0.2)",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "var(--primary)"
                    }}
                  >
                    <span>📍 {v}</span>
                    <span style={{ fontSize: "0.7rem", backgroundColor: "white", padding: "1px 6px", borderRadius: "10px", color: "#475569" }}>
                      {count}
                    </span>
                    <button
                      onClick={() => handleRenameVenue(v)}
                      title={`Rename venue "${v}"`}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "0.85rem" }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteVenue(v)}
                      title={`Delete venue "${v}"`}
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

        {/* Master Status & Global Schedule Actions */}
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
              style={{ backgroundColor: "#10B981", borderColor: "#10B981", color: "#ffffff", fontWeight: 600 }}
              onClick={handlePublishMasterSchedule} 
              disabled={loadingId !== null}
            >
              {loadingId === "publish-master" ? "Publishing..." : "📢 Publish Master Schedule to All Zones"}
            </button>
          ) : (
            statusOverride !== "SCHEDULE_PUBLISHED" ? (
              <button 
                className="btn btn-primary" 
                style={{ backgroundColor: "#10B981", borderColor: "#10B981", color: "#ffffff", fontWeight: 600 }}
                onClick={async () => {
                  if (!confirm("Confirm and publish the final Zone Program Schedule? Once published, candidate timeslots and venues are finalized and visible to public results and colleges.")) return;
                  setLoadingId("publish-zone");
                  try {
                    const { publishZoneSchedule } = await import("./actions");
                    const res = await publishZoneSchedule(eventId);
                    if (res.success) {
                      setStatusOverride("SCHEDULE_PUBLISHED");
                      alert(`✅ Final Zone Schedule successfully published!`);
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
                style={{ borderColor: "#ef4444", color: "#ef4444", fontWeight: 600 }}
                onClick={async () => {
                  if (!confirm("Hide this schedule from public results and colleges? It will return to Draft mode (only visible to Admins).")) return;
                  setLoadingId("unpublish-zone");
                  try {
                    const { unpublishSchedule } = await import("./actions");
                    const res = await unpublishSchedule(eventId);
                    if (res.success) {
                      setStatusOverride("AUTO");
                      alert(`🔒 Schedule is now hidden (Draft Mode). Only Zone Admins can view it.`);
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
                {loadingId === "unpublish-zone" ? "Hiding..." : "🔒 Hide / Unpublish Schedule (Draft)"}
              </button>
            )
          )}

          <ZoneScheduleAnalyzer 
            isSuperAdmin={isSuperAdmin} 
            activeEventId={eventId} 
            onScheduleUpdated={() => window.location.reload()} 
          />

          <button className="btn btn-primary" onClick={handleAutoGenerate} disabled={loadingId !== null}>
            {loadingId === "auto-gen" ? "..." : "🤖 Auto-Generate Schedule"}
          </button>
        </div>
      </div>

      {/* Stage Scheduler Focus Notice */}
      <div style={{
        padding: "12px 18px",
        borderRadius: "10px",
        backgroundColor: "rgba(142, 0, 51, 0.05)",
        border: "1.5px solid rgba(142, 0, 51, 0.2)",
        color: "#8E0033",
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <span style={{ fontSize: "1.5rem" }}>⚡</span>
        <div>
          <strong>Auto-Calculated 9:00 AM Schedule:</strong> You only need to order the programs in each venue! Program #1 automatically starts at <strong>9:00 AM</strong>, and every subsequent program automatically starts when the previous one finishes. No manual datetime picking needed!
        </div>
      </div>
      
      {/* Category & Stage Filters */}
      <div className="glass-panel" style={{ padding: "16px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginRight: "4px" }}>Category:</span>
          {categoryOrder.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn ${selectedCategory === cat ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "4px 12px", fontSize: "0.85rem", borderRadius: "20px" }}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div style={{ width: "1px", height: "24px", backgroundColor: "var(--border-color)", margin: "0 8px" }} />

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginRight: "4px" }}>Stage:</span>
          {stageOrder.map(stage => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`btn ${selectedStage === stage ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "4px 12px", fontSize: "0.85rem", borderRadius: "20px" }}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {loadingId && (
        <div style={{ padding: "var(--spacing-sm)", backgroundColor: "var(--primary)", color: "white", textAlign: "center", borderRadius: "var(--radius-md)" }}>
          Processing... Please wait.
        </div>
      )}

      {conflicts.length > 0 && (
        <div style={{ 
          padding: "var(--spacing-md)", 
          backgroundColor: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid var(--error)", 
          borderRadius: "var(--radius-md)"
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "var(--error)" }}>⚠️ Scheduling Conflicts</h3>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.875rem" }}>
            {conflicts.map((c, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                <strong>{c.candidateName}</strong> is scheduled for <strong>{c.programs.join(" & ")}</strong> at the same time ({c.time}).
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Venues View */}
      {Object.keys(groupedPrograms).map(venue => {
        const venueProgs = groupedPrograms[venue] || [];
        const isUnassigned = venue === "Unassigned";
        const config = getVenueConfig(venue);
        const { predictedList, totalDurationMinutes, totalCandidates, predictedStart, predictedEnd } = 
          getPredictedVenueTimeline(venueProgs, config.startTime, config.buffer);

        // Check if finished by 6:00 PM (18:00)
        const eveningCutoff = new Date(predictedStart.getTime());
        eveningCutoff.setHours(18, 0, 0, 0);
        const isExceedingEvening = predictedEnd.getTime() > eveningCutoff.getTime();
        const diffMinutes = Math.abs(Math.round((predictedEnd.getTime() - eveningCutoff.getTime()) / 60000));

        return (
          <div key={venue} className="glass-panel" style={{ padding: "var(--spacing-md)", borderRadius: "14px" }}>
            
            {/* Venue Header: Name, Rename/Delete Controls & Shift/Break Actions */}
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
                <h2 style={{ margin: 0, color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px", fontSize: "1.25rem" }}>
                  📍 {venue}
                  <span className="badge badge-secondary">{venueProgs.length} Programs</span>
                </h2>

                {!isUnassigned && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleRenameVenue(venue)}
                      title="Rename this venue"
                      style={{ padding: "3px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <span>✏️</span> Rename
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleDeleteVenue(venue)}
                      title="Delete this venue and unassign programs"
                      style={{ padding: "3px 8px", fontSize: "0.75rem", borderColor: "#fca5a5", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <span>🗑️</span> Delete
                    </button>
                  </div>
                )}
              </div>

              {!isUnassigned && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: "0.75rem" }} onClick={() => handleAddBreak(venue)}>
                    + Add Break
                  </button>
                </div>
              )}
            </div>

            {/* Venue Timeline & Auto-Prediction Controller Bar */}
            {!isUnassigned && venueProgs.length > 0 && (
              <div 
                style={{
                  backgroundColor: "rgba(248, 250, 252, 0.95)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                {/* Fixed Start 9:00 AM badge, Buffer, and 1-Click Save */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                    
                    {/* Fixed Start Time: Always 9:00 AM */}
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      backgroundColor: "#f0fdf4",
                      color: "#15803d",
                      border: "1.5px solid #bbf7d0",
                      padding: "5px 12px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 800
                    }}>
                      <span>🕒</span>
                      <span>Starts: <strong>09:00 AM (Auto Fixed)</strong></span>
                    </div>

                    {/* Buffer Between Programs */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e293b", margin: 0, whiteSpace: "nowrap" }}>
                        Buffer:
                      </label>
                      <select 
                        className="form-input" 
                        value={config.buffer}
                        onChange={(e) => updateVenueConfig(venue, "buffer", parseInt(e.target.value) || 0)}
                        style={{ fontSize: "0.82rem", padding: "4px 8px", width: "130px" }}
                      >
                        <option value={0}>0 min (Direct)</option>
                        <option value={5}>5 mins</option>
                        <option value={10}>10 mins</option>
                        <option value={15}>15 mins</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {/* 1-Click Auto-Calculate by Candidates Button */}
                    <button
                      onClick={() => handleAutoCalculateVenueByCandidates(venue)}
                      disabled={loadingId !== null}
                      style={{
                        padding: "8px 14px",
                        backgroundColor: "#4f46e5",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        cursor: loadingId !== null ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                      title="Calculate program durations from registered candidates in this zone and set 9:00 AM timeline"
                    >
                      <span>⚡</span>
                      <span>{loadingId === `auto-calc-${venue}` ? "Calculating..." : "Auto-Calculate by Candidates"}</span>
                    </button>

                    {/* 1-Click Save Order & Apply Timings (from 9:00 AM) Button */}
                    <button
                      onClick={() => handleApplyVenueTimings(venue)}
                      disabled={loadingId !== null}
                      style={{
                        padding: "8px 18px",
                        backgroundColor: "#8E0033",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        cursor: loadingId !== null ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 6px rgba(142, 0, 51, 0.25)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <span>💾</span>
                      <span>{loadingId === `apply-${venue}` ? "Saving..." : "Save Order & Timings"}</span>
                    </button>
                  </div>
                </div>

                {/* Timeline Live Summary */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  paddingTop: "8px",
                  borderTop: "1px dashed #cbd5e1",
                  fontSize: "0.82rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ color: "#475569" }}>
                      Total Programs: <strong>{venueProgs.length}</strong>
                    </span>
                    <span>•</span>
                    <span style={{ color: "#475569" }}>
                      Candidates: <strong>{totalCandidates}</strong>
                    </span>
                    <span>•</span>
                    <span style={{ color: "#475569" }}>
                      Total Runtime: <strong>{Math.floor(totalDurationMinutes / 60)}h {totalDurationMinutes % 60}m</strong>
                    </span>
                    <span>•</span>
                    <span style={{ color: "#059669", fontWeight: 800 }}>
                      Timeline: {predictedStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} &rarr; {predictedEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div style={{
                    fontWeight: 700,
                    color: isExceedingEvening ? "#dc2626" : "#059669",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span>{isExceedingEvening ? "⚠️" : "✅"}</span>
                    <span>
                      {isExceedingEvening 
                        ? `Exceeds 6:00 PM by ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`
                        : `Finishes by ${predictedEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Program Items List in this Venue */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {venueProgs.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "var(--spacing-md)", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
                  No programs assigned to this venue yet.
                </div>
              ) : (
                predictedList.map((item, idx) => {
                  const program = item.program;
                  const isBreak = program.type === "BREAK";
                  const isFirst = idx === 0;
                  const isLast = idx === predictedList.length - 1;

                  return (
                    <div 
                      key={program.id} 
                      style={{ 
                        padding: "12px 16px", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "10px",
                        backgroundColor: isBreak ? "rgba(245, 158, 11, 0.08)" : "#ffffff",
                        borderColor: isBreak ? "var(--warning)" : "#e2e8f0",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        transition: "all 0.15s ease",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                      }}
                    >
                      {/* Top Program Card Row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        
                        {/* Left: Sequence badge + Order Controls + Title */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          
                          {/* Order / Sequence Controller */}
                          {!isUnassigned && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span 
                                style={{ 
                                  backgroundColor: "#0f172a", 
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

                              {/* Up / Down Buttons: Reordering auto-calculates time from 9:00 AM */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleMoveProgram(venue, idx, "up")}
                                  disabled={isFirst}
                                  title="Move Up (Auto-recalculates time)"
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
                                  title="Move Down (Auto-recalculates time)"
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
                                  {venueProgs.map((_, pIdx) => (
                                    <option key={pIdx} value={pIdx}>Pos #{pIdx + 1}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}

                          {/* Program Name and Details */}
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
                                  letterSpacing: "0.03em",
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
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  backgroundColor: item.candidateCount > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.1)",
                                  color: item.candidateCount > 0 ? "#059669" : "#64748b",
                                  border: `1px solid ${item.candidateCount > 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(100, 116, 139, 0.2)"}`
                                }}>
                                  👥 {item.candidateCount} Candidates ({item.duration} mins)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Clean Auto-Calculated Timing Badge (From 9:00 AM) */}
                        <div style={{ textAlign: "right" }}>
                          <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            backgroundColor: "#ecfdf5",
                            border: "1.5px solid #a7f3d0",
                            color: "#047857",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                          }}>
                            <span>🕒</span>
                            <span>
                              {item.predictedStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {" – "}
                              {item.predictedEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Program Settings Row: Venue, Duration, StageType, Judges & Save (NO manual Start Time picker!) */}
                      <div style={{ 
                        display: "flex", 
                        flexWrap: "wrap", 
                        gap: "10px", 
                        alignItems: "flex-end",
                        paddingTop: "8px",
                        borderTop: "1px dashed #f1f5f9"
                      }}>
                        {/* Venue selector */}
                        {!isBreak && (
                          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 140px" }}>
                            <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "2px", fontWeight: 700 }}>Venue / Stage</label>
                            <select className="form-input" defaultValue={program.venue || ""} id={`venue-${program.id}`} style={{ padding: "4px 8px", fontSize: "0.8rem" }}>
                              <option value="">Unassigned</option>
                              {Array.from(allVenues).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        )}
                        {isBreak && (
                          <input type="hidden" id={`venue-${program.id}`} value={program.venue || ""} />
                        )}
                        
                        {/* Duration input: changing it recalculates the predicted times starting from 9:00 AM */}
                        <div className="form-group" style={{ marginBottom: 0, width: "110px" }}>
                          <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "2px", fontWeight: 700 }}>Duration (mins)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            defaultValue={program.duration || 10} 
                            id={`dur-${program.id}`} 
                            onChange={(e) => handleDurationChange(venue, program.id, parseInt(e.target.value) || 10)}
                            style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          />
                        </div>
                        
                        {/* Stage Type */}
                        {!isBreak && (
                          <div className="form-group" style={{ marginBottom: 0, width: "130px" }}>
                            <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "2px", fontWeight: 700 }}>Stage Type</label>
                            <select className="form-input" defaultValue={program.stageType} id={`stage-${program.id}`} style={{ padding: "4px 8px", fontSize: "0.8rem" }}>
                              <option value="ON_STAGE">ON STAGE</option>
                              <option value="OFF_STAGE">OFF STAGE</option>
                            </select>
                          </div>
                        )}
                        {isBreak && (
                          <input type="hidden" id={`stage-${program.id}`} value="BREAK" />
                        )}

                        {/* Save Item Button */}
                        <button 
                          className="btn btn-primary"
                          style={{ padding: "5px 14px", fontSize: "0.8rem", flex: "0 0 auto", height: "32px", fontWeight: 700 }}
                          disabled={loadingId === program.id}
                          onClick={() => {
                            const v = (document.getElementById(`venue-${program.id}`) as HTMLSelectElement | HTMLInputElement).value;
                            const d = parseInt((document.getElementById(`dur-${program.id}`) as HTMLInputElement).value) || 10;
                            const s = (document.getElementById(`stage-${program.id}`) as HTMLSelectElement | HTMLInputElement).value;
                            
                            let judgeIds: string[] = [];
                            if (!isBreak) {
                              const jSelect = document.getElementById(`judges-${program.id}`) as HTMLSelectElement;
                              if (jSelect) {
                                judgeIds = Array.from(jSelect.selectedOptions).map(opt => opt.value);
                              }
                            }
                            
                            // Automatically uses the auto-calculated 9:00 AM sequential start time!
                            handleUpdate(program.id, v, item.predictedStart.toISOString(), d, s, judgeIds);
                          }}
                        >
                          {loadingId === program.id ? "..." : "Save"}
                        </button>
                      </div>

                      {/* Judges Multi-select */}
                      {!isBreak && allJudges.length > 0 && (
                        <div style={{ marginTop: "4px" }}>
                          <label className="form-label" style={{ fontSize: "0.68rem", marginBottom: "2px", fontWeight: 700 }}>Judges (Hold Ctrl to select multiple)</label>
                          <select 
                            multiple 
                            className="form-input" 
                            id={`judges-${program.id}`}
                            defaultValue={program.judges?.map((j: any) => j.id) || []}
                            style={{ height: "42px", padding: "2px", fontSize: "0.75rem" }}
                          >
                            {allJudges.map(judge => (
                              <option key={judge.id} value={judge.id}>{judge.username}</option>
                            ))}
                          </select>
                        </div>
                      )}
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
