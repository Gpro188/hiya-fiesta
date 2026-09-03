"use client";

import { useState, useEffect } from "react";
import { updateProgramSchedule, autoCalculateCandidateSlots, addBreak, autoGenerateSchedule, shiftSchedule, publishMasterScheduleToAllZones } from "./actions";
import { importScheduleFromExcel, checkSchedulingConflicts } from "./importActions";

export default function AdminScheduler({ 
  initialPrograms, 
  eventId, 
  allJudges = [],
  isSuperAdmin = false 
}: { 
  initialPrograms: any[], 
  eventId: string, 
  allJudges?: any[],
  isSuperAdmin?: boolean 
}) {
  const [programs, setPrograms] = useState<any[]>(initialPrograms);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [localVenues, setLocalVenues] = useState<string[]>([]);
  
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
  }, [programs]);

  const fetchConflicts = async () => {
    const result = await checkSchedulingConflicts(eventId);
    if (result.success) {
      setConflicts(result.conflicts || []);
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
    });

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
    if (!confirm("This will overwrite unscheduled programs and automatically assign them to available venues. Are you sure?")) return;
    
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
      setLocalVenues([...localVenues, newVenueName]);
      setNewVenueName("");
    }
  };

  // Group filtered programs by venue
  const groupeCSWCgrams: Record<string, any[]> = {};
  allVenues.forEach(v => groupeCSWCgrams[v] = []);
  groupeCSWCgrams["Unassigned"] = [];

  const filteredPrograms = programs.filter(p => {
    let cat = "GENERAL PROGRAMS";
    if (p.type === 'GENERAL') cat = "GENERAL PROGRAMS";
    else if (p.category?.name) cat = p.category.name.toUpperCase();
    
    let stg = p.stageType === 'ON_STAGE' ? 'On Stage' : 'Off Stage';

    const matchesCat = selectedCategory === "All" || cat === selectedCategory;
    const matchesStage = selectedStage === "All" || stg === selectedStage;
    return matchesCat && matchesStage;
  });

  filteredPrograms.forEach(p => {
    if (p.venue && allVenues.has(p.venue)) {
      groupeCSWCgrams[p.venue].push(p);
    } else {
      groupeCSWCgrams["Unassigned"].push(p);
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      
      {/* Top Controls */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 320px' }}>
          <h3 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '1rem' }}>Venue Management</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="New Venue Name (e.g. Main Stage)"
              value={newVenueName}
              onChange={e => setNewVenueName(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
            <button className="btn btn-secondary" onClick={handleAddVenue}>Add Venue</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isSuperAdmin ? (
            <button 
              className="btn btn-primary" 
              style={{ backgroundColor: '#10B981', borderColor: '#10B981', color: '#ffffff', fontWeight: 600 }}
              onClick={handlePublishMasterSchedule} 
              disabled={loadingId !== null}
            >
              {loadingId === "publish-master" ? "Publishing..." : "📢 Publish Master Schedule to All Zones"}
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              style={{ backgroundColor: '#10B981', borderColor: '#10B981', color: '#ffffff', fontWeight: 600 }}
              onClick={async () => {
                if (!confirm("Confirm and publish the final Zone Program Schedule? Once published, candidate timeslots/venues are finalized and institution colleges can view/print Candidate ID Cards.")) return;
                setLoadingId("publish-zone");
                try {
                  const { publishZoneSchedule } = await import("./actions");
                  const res = await publishZoneSchedule(eventId);
                  if (res.success) {
                    alert(`✅ Final Zone Schedule successfully published! Candidate time slots are synced and colleges can now print ID Cards.`);
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
              {loadingId === "publish-zone" ? "Publishing..." : "📢 Publish Final Zone Schedule (Enable ID Cards)"}
            </button>
          )}
          <button className="btn btn-primary" onClick={handleAutoGenerate} disabled={loadingId !== null}>
            {loadingId === "auto-gen" ? "..." : "🤖 Auto-Generate Schedule"}
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Category:</span>
          {categoryOrder.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: '0.85rem', borderRadius: '20px' }}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 8px' }} />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Stage:</span>
          {stageOrder.map(stage => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`btn ${selectedStage === stage ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: '0.85rem', borderRadius: '20px' }}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {loadingId && (
        <div style={{ padding: 'var(--spacing-sm)', backgroundColor: 'var(--primary)', color: 'white', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
          Processing... Please wait.
        </div>
      )}

      {conflicts.length > 0 && (
        <div style={{ 
          padding: 'var(--spacing-md)', 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid var(--error)', 
          borderRadius: 'var(--radius-md)'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--error)' }}>⚠️ Scheduling Conflicts</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
            {conflicts.map((c, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                <strong>{c.candidateName}</strong> is scheduled for <strong>{c.programs.join(' & ')}</strong> at the same time ({c.time}).
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Venues View */}
      {Object.keys(groupeCSWCgrams).map(venue => (
        <div key={venue} className="glass-panel" style={{ padding: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📍 {venue}
              <span className="badge badge-secondary">{groupeCSWCgrams[venue].length} Programs</span>
            </h2>
            {venue !== "Unassigned" && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleAddBreak(venue)}>+ Add Break</button>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleShiftSchedule(venue, 15)}>Delay 15m</button>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleShiftSchedule(venue, -15)}>Advance 15m</button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {groupeCSWCgrams[venue].length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: 'var(--spacing-md)', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                No programs assigned to this venue yet.
              </div>
            ) : (
              groupeCSWCgrams[venue].map(program => {
                const isBreak = program.type === "BREAK";
                const endTime = program.startTime ? new Date(new Date(program.startTime).getTime() + (program.duration * 60 * 1000)) : null;
                
                return (
                  <div key={program.id} style={{ 
                    padding: 'var(--spacing-md)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isBreak ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    borderColor: isBreak ? 'var(--warning)' : 'var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                      <div>
                        <h4 style={{ margin: 0, color: isBreak ? 'var(--warning)' : 'var(--text-primary)' }}>
                          {isBreak ? `☕ ${program.name}` : program.name}
                        </h4>
                        {!isBreak && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {program.stageType} • {program.category?.name || 'General'} • {program._count?.assignments || 0} Candidates
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--success)' }}>
                        {program.startTime ? new Date(program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No Time"} 
                        {endTime && ` - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{program.duration} min</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end' }}>
                      {!isBreak && (
                        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 140px' }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Venue</label>
                          <select className="form-input" defaultValue={program.venue || ""} id={`venue-${program.id}`}>
                            <option value="">Unassigned</option>
                            {Array.from(allVenues).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      )}
                      {isBreak && (
                         <input type="hidden" id={`venue-${program.id}`} value={program.venue || ""} />
                      )}
                      
                      <div className="form-group" style={{ marginBottom: 0, flex: '1 1 140px' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Start Time</label>
                        <input type="datetime-local" className="form-input" defaultValue={program.startTime ? new Date(program.startTime).toISOString().slice(0, 16) : ""} id={`time-${program.id}`} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, flex: '1 1 80px' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Duration</label>
                        <input type="number" className="form-input" defaultValue={program.duration} id={`dur-${program.id}`} />
                      </div>
                      
                      {!isBreak && (
                        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 120px' }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Stage Type</label>
                          <select className="form-input" defaultValue={program.stageType} id={`stage-${program.id}`}>
                            <option value="ON_STAGE">ON STAGE</option>
                            <option value="OFF_STAGE">OFF STAGE</option>
                          </select>
                        </div>
                      )}
                      {isBreak && (
                         <input type="hidden" id={`stage-${program.id}`} value="BREAK" />
                      )}

                      <button 
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', flex: '0 0 auto' }}
                        disabled={loadingId === program.id}
                        onClick={() => {
                          const v = (document.getElementById(`venue-${program.id}`) as HTMLSelectElement | HTMLInputElement).value;
                          const t = (document.getElementById(`time-${program.id}`) as HTMLInputElement).value;
                          const d = parseInt((document.getElementById(`dur-${program.id}`) as HTMLInputElement).value) || 10;
                          const s = (document.getElementById(`stage-${program.id}`) as HTMLSelectElement | HTMLInputElement).value;
                          
                          let judgeIds: string[] = [];
                          if (!isBreak) {
                             const jSelect = document.getElementById(`judges-${program.id}`) as HTMLSelectElement;
                             if (jSelect) {
                                judgeIds = Array.from(jSelect.selectedOptions).map(opt => opt.value);
                             }
                          }
                          
                          handleUpdate(program.id, v, t, d, s, judgeIds);
                        }}
                      >
                        {loadingId === program.id ? "..." : "Save"}
                      </button>
                    </div>

                    {!isBreak && (
                      <div style={{ marginTop: '8px' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Judges (Hold Ctrl to select multiple)</label>
                        <select 
                          multiple 
                          className="form-input" 
                          id={`judges-${program.id}`}
                          defaultValue={program.judges?.map((j: any) => j.id) || []}
                          style={{ height: '50px', padding: '4px', fontSize: '0.8rem' }}
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
      ))}
    </div>
  );
}
