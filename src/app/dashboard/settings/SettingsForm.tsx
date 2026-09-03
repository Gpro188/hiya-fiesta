"use client";

import { useState, useEffect } from "react";
import { updateSettings, updateEventDeadlines, updateZoneTimelines, resetSystem } from "./actions";
import ImageUpload from "../../components/ImageUpload";

export default function SettingsForm({ initialSettings, events, role }: { initialSettings: any, events: any[], role: string }) {
  const [festName, setFestName] = useState(initialSettings?.festName || "Arts Fest");
  const [festMoto, setFestMoto] = useState(initialSettings?.festMoto || "Celebrating Creativity");
  const [festLogo, setFestLogo] = useState(initialSettings?.festLogo || "");
  
  // Event Deadline State
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || "");
  
  const [registrationStart, setRegistrationStart] = useState("");
  const [registrationEnd, setRegistrationEnd] = useState("");
  const [assignmentStart, setAssignmentStart] = useState("");
  const [assignmentEnd, setAssignmentEnd] = useState("");

  const [institutionRegistrationEndDate, setInstitutionRegistrationEndDate] = useState("");
  const [zoneActiveStartTime, setZoneActiveStartTime] = useState("");
  const [zoneActiveEndTime, setZoneActiveEndTime] = useState("");
  const [stateConfirmEndDate, setStateConfirmEndDate] = useState("");
  const [statusOverride, setStatusOverride] = useState("AUTO");

  // Per-zone custom schedules
  const [zoneSchedules, setZoneSchedules] = useState<Array<{
    id: string;
    name: string;
    zoneActiveStartTime: string;
    zoneActiveEndTime: string;
    statusOverride: string;
  }>>([]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Helper to format Date in local input format YYYY-MM-DDTHH:mm
  const toLocalISOString = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (selectedEvent) {
      setRegistrationStart(toLocalISOString(selectedEvent.registrationStart));
      // Sync registrationEnd with institutionRegistrationEndDate if present
      const effectiveRegEnd = selectedEvent.institutionRegistrationEndDate || selectedEvent.registrationEnd;
      setRegistrationEnd(toLocalISOString(effectiveRegEnd));
      setAssignmentStart(toLocalISOString(selectedEvent.assignmentStart));
      setAssignmentEnd(toLocalISOString(selectedEvent.assignmentEnd));

      setInstitutionRegistrationEndDate(toLocalISOString(effectiveRegEnd));
      setZoneActiveStartTime(toLocalISOString(selectedEvent.zoneActiveStartTime || selectedEvent.startDate));
      setZoneActiveEndTime(toLocalISOString(selectedEvent.zoneActiveEndTime || selectedEvent.endDate));
      setStateConfirmEndDate(toLocalISOString(selectedEvent.stateConfirmEndDate));
      setStatusOverride(selectedEvent.statusOverride || "AUTO");
    }

    // Populate zone-specific schedules
    const childZones = events.filter(e => e.type === 'ZONE');
    if (childZones.length > 0) {
      setZoneSchedules(childZones.map(z => ({
        id: z.id,
        name: z.name,
        zoneActiveStartTime: toLocalISOString(z.zoneActiveStartTime || z.startDate),
        zoneActiveEndTime: toLocalISOString(z.zoneActiveEndTime || z.endDate),
        statusOverride: z.statusOverride || "AUTO"
      })));
    }
  }, [selectedEventId, events]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    
    // Save global settings (only if Admin)
    let result = { success: true };
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      result = await updateSettings({ 
        festName, 
        festMoto, 
        festLogo
      });
    }

    // Save event deadlines (ensure registrationEnd and institutionRegistrationEndDate match)
    const effectiveRegistrationEnd = registrationEnd || institutionRegistrationEndDate;
    const deadlineResult = await updateEventDeadlines(selectedEventId, {
      registrationStart: registrationStart || null,
      registrationEnd: effectiveRegistrationEnd || null,
      assignmentStart: assignmentStart || null,
      assignmentEnd: assignmentEnd || null,
      institutionRegistrationEndDate: effectiveRegistrationEnd || null,
      zoneActiveStartTime: zoneActiveStartTime || null,
      zoneActiveEndTime: zoneActiveEndTime || null,
      stateConfirmEndDate: stateConfirmEndDate || null,
      statusOverride: statusOverride
    });

    // Save per-zone schedules if any
    let zonesResult = { success: true };
    if (zoneSchedules.length > 0) {
      zonesResult = await updateZoneTimelines(zoneSchedules);
    }

    if (result.success && deadlineResult.success && zonesResult.success) {
      setStatus({ type: 'success', message: '✅ All settings, zone timelines, and festival countdowns saved successfully.' });
    } else {
      setStatus({ type: 'error', message: 'Failed to save some settings' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {status && (
        <div style={{ 
          padding: 'var(--spacing-sm)', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: 'var(--spacing-md)',
          backgroundColor: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: status.type === 'error' ? 'var(--error)' : 'var(--success)',
          border: `1px solid ${status.type === 'error' ? 'var(--error)' : 'var(--success)'}`
        }}>
          {status.message}
        </div>
      )}

      {(role === "ADMIN" || role === "SUPER_ADMIN") && (
        <>
          <div className="form-group">
            <label className="form-label">Festival Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={festName}
              onChange={(e) => setFestName(e.target.value)}
              placeholder="e.g. Hifz Fest 2024"
              required={role === "ADMIN" || role === "SUPER_ADMIN"}
            />
            <span className="field-helper">Displayed across the dashboard, login page, and public-facing pages.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Festival Motto / Slogan</label>
            <input 
              type="text" 
              className="form-input" 
              value={festMoto}
              onChange={(e) => setFestMoto(e.target.value)}
              placeholder="e.g. Celebrating Creativity"
              required={role === "ADMIN" || role === "SUPER_ADMIN"}
            />
            <span className="field-helper">A short tagline shown below the festival name in the sidebar and login.</span>
          </div>
          
          <ImageUpload 
            label="Festival Logo" 
            folder="logos" 
            initialUrl={festLogo}
            onUploadComplete={(url) => setFestLogo(url)} 
          />

          <hr style={{ margin: 'var(--spacing-lg) 0', borderColor: 'var(--border-color)' }} />
        </>
      )}

      <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Event Timelines & Deadlines</h3>

      {events.length > 0 ? (
        <>
          <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Select Festival Event to Configure</label>
            <select 
              className="form-input"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ fontWeight: 600, borderColor: 'var(--primary)' }}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.type})</option>
              ))}
            </select>
            <span className="field-helper">Saving deadlines will automatically update and synchronize all child zones.</span>
          </div>

          {/* BOARD 1: INSTITUTION PORTAL DEADLINES */}
          <div style={{
            border: '2px solid rgba(165,0,58,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'rgba(165,0,58,0.02)',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-xs)' }}>
              <span style={{ fontSize: '1.4rem' }}>🏛️</span>
              <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.15rem' }}>Board 1: Institution Portal Deadlines (Colleges & Teams)</h4>
            </div>
            <p style={{ margin: '0 0 var(--spacing-md) 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Control when college/institution managers can add students and assign competition programs. Once the deadline passes, institution portals lock automatically.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Candidate Registration Start</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={registrationStart}
                  onChange={(e) => setRegistrationStart(e.target.value)}
                />
                <span className="field-helper">Opening time for institutions to add student candidates.</span>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--primary)' }}>Candidate Registration Deadline</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={registrationEnd}
                  onChange={(e) => {
                    setRegistrationEnd(e.target.value);
                    setInstitutionRegistrationEndDate(e.target.value);
                  }}
                  style={{ borderColor: 'var(--primary)', borderWidth: '2px' }}
                />
                <span className="field-helper">Strict cutoff for institutions to add or delete candidates.</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Program Assignment Start</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={assignmentStart}
                  onChange={(e) => setAssignmentStart(e.target.value)}
                />
                <span className="field-helper">Opening time for institutions to allocate programs to candidates.</span>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--primary)' }}>Program Assignment Deadline</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={assignmentEnd}
                  onChange={(e) => setAssignmentEnd(e.target.value)}
                  style={{ borderColor: 'var(--primary)', borderWidth: '2px' }}
                />
                <span className="field-helper">Strict cutoff for institutions to assign or remove programs.</span>
              </div>
            </div>
          </div>

          {/* BOARD 2: FEST & ZONE COMPETITION DATES */}
          <div style={{
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'rgba(59, 130, 246, 0.02)',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-xs)' }}>
              <span style={{ fontSize: '1.4rem' }}>⏱️</span>
              <h4 style={{ margin: 0, color: '#1d4ed8', fontSize: '1.15rem' }}>Board 2: Zone & State Fest Competition Timelines (Per-Zone Countdown)</h4>
            </div>
            <p style={{ margin: '0 0 var(--spacing-md) 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Each zone can have its own distinct competition dates and times. The homepage displays live real-time countdown clocks for each zone based on these dates!
            </p>

            {/* Selected Event / State Master Countdown */}
            {(() => {
              const currentEv = events.find(e => e.id === selectedEventId);
              return (
                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: 'var(--spacing-lg)' }}>
                  <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    {currentEv?.name} Default Schedule:
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-md)' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>Fest Start Time (Countdown Target)</label>
                      <input 
                        type="datetime-local" 
                        className="form-input" 
                        value={zoneActiveStartTime}
                        onChange={(e) => setZoneActiveStartTime(e.target.value)}
                      />
                      <span className="field-helper">Default target time for countdown before competitions begin.</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>Fest End Time</label>
                      <input 
                        type="datetime-local" 
                        className="form-input" 
                        value={zoneActiveEndTime}
                        onChange={(e) => setZoneActiveEndTime(e.target.value)}
                      />
                      <span className="field-helper">Grand finale & valedictory conclusion time.</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Individual Zone Schedules Grid */}
            {zoneSchedules.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>
                    📍 Configure Individual Zone Dates & Auto Countdown:
                  </h5>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    onClick={() => {
                      // Apply the selected event times to all zones
                      if (zoneActiveStartTime) {
                        setZoneSchedules(prev => prev.map(z => ({
                          ...z,
                          zoneActiveStartTime,
                          zoneActiveEndTime: zoneActiveEndTime || z.zoneActiveEndTime
                        })));
                      }
                    }}
                  >
                    ⚡ Copy Default Time to All Zones
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                  {zoneSchedules.map((zone, idx) => (
                    <div 
                      key={zone.id}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--ink, #1e293b)', fontSize: '0.9rem' }}>
                          {zone.name}
                        </span>
                        <select
                          className="form-input"
                          style={{ width: 'auto', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 700 }}
                          value={zone.statusOverride}
                          onChange={(e) => {
                            const val = e.target.value;
                            setZoneSchedules(prev => prev.map(z => z.id === zone.id ? { ...z, statusOverride: val } : z));
                          }}
                        >
                          <option value="AUTO">AUTO (Date Clock)</option>
                          <option value="LIVE">LIVE NOW</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="REGISTRATION">REGISTRATION</option>
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '2px', color: '#64748b' }}>
                            Start Time (Countdown)
                          </label>
                          <input 
                            type="datetime-local" 
                            className="form-input"
                            style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                            value={zone.zoneActiveStartTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setZoneSchedules(prev => prev.map(z => z.id === zone.id ? { ...z, zoneActiveStartTime: val } : z));
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '2px', color: '#64748b' }}>
                            End Time
                          </label>
                          <input 
                            type="datetime-local" 
                            className="form-input"
                            style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                            value={zone.zoneActiveEndTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setZoneSchedules(prev => prev.map(z => z.id === zone.id ? { ...z, zoneActiveEndTime: val } : z));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BOARD 3: STATE ADVANCEMENT CONFIRMATION */}
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-xs)' }}>
              <span style={{ fontSize: '1.4rem' }}>🏆</span>
              <h4 style={{ margin: 0, fontSize: '1.15rem' }}>Board 3: State Fest Advancement Deadline</h4>
            </div>
            <p style={{ margin: '0 0 var(--spacing-md) 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Deadline for Zone Admins to confirm zonal winners promoted to the State Final competition.
            </p>

            <div className="form-group" style={{ maxWidth: '450px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>State Confirm End Date</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={stateConfirmEndDate}
                onChange={(e) => setStateConfirmEndDate(e.target.value)}
              />
              <span className="field-helper">Deadline for Zone Admins to submit advanced finalists.</span>
            </div>
          </div>

          {/* BOARD 4: PUBLIC PORTAL VISIBILITY */}
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            marginBottom: 'var(--spacing-xl)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-xs)' }}>
              <span style={{ fontSize: '1.4rem' }}>🌐</span>
              <h4 style={{ margin: 0, fontSize: '1.15rem' }}>Board 4: Public Website Visibility & Mode</h4>
            </div>
            <p style={{ margin: '0 0 var(--spacing-md) 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Force the public status of the event on the homepage, results portal, and public hub.
            </p>

            <div className="form-group" style={{ maxWidth: '450px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Visibility Status Override</label>
              <select 
                className="form-input"
                value={statusOverride}
                onChange={(e) => setStatusOverride(e.target.value)}
                style={{ backgroundColor: statusOverride !== 'AUTO' ? '#fffbeb' : undefined, borderColor: statusOverride !== 'AUTO' ? '#f59e0b' : undefined }}
              >
                <option value="AUTO">AUTO (Follows Scheduled Dates)</option>
                <option value="REGISTRATION">REGISTRATION OPEN (Force Registration Banner)</option>
                <option value="LIVE">LIVE NOW (Force Live Festival Banner)</option>
                <option value="COMPLETED">COMPLETED (Show Results & Winners)</option>
                <option value="HIDDEN">HIDDEN (Hide from public website)</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>No events created yet.</p>
      )}
      {role === "SUPER_ADMIN" && (
        <>
          <hr style={{ margin: 'var(--spacing-lg) 0', borderColor: 'var(--border-color)' }} />
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Storage Management</h3>
          <div className="form-group" style={{ 
            padding: 'var(--spacing-md)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)'
          }}>
            <h4 style={{ color: 'var(--error)', margin: '0 0 10px 0' }}>Clear Image Storage</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
              Warning: This will permanently delete ALL images currently uploaded for candidates, teams, and posters across the entire app. Use this ONLY after a fest ends and you are preparing the system for a new one.
            </p>
            <button 
              type="button" 
              onClick={async () => {
                if (confirm("Are you absolutely sure you want to permanently delete ALL images in the Cloudflare R2 bucket? This cannot be undone!")) {
                  try {
                    const res = await fetch("/api/storage/clear", { method: "POST" });
                    const data = await res.json();
                    if (res.ok) {
                      alert(data.message || "Storage cleared successfully.");
                    } else {
                      alert(data.error || "Failed to clear storage.");
                    }
                  } catch (e) {
                    alert("An error occurred while clearing storage.");
                  }
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: 'var(--error)',
                border: '1px solid var(--error)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              🗑️ Permanently Delete All Images
            </button>

            <h4 style={{ color: 'var(--error)', margin: '20px 0 10px 0' }}>Wipe Database (Text Data)</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
              Warning: This will permanently delete ALL events, teams, candidates, programs, results, and managers. Your global settings and admin account will be kept.
            </p>
            <button 
              type="button" 
              onClick={async () => {
                const code = Math.floor(1000 + Math.random() * 9000).toString();
                const input = prompt(`To confirm wiping the entire database, please type this code: ${code}`);
                if (input === code) {
                  setLoading(true);
                  try {
                    const res = await resetSystem();
                    if (res.success) {
                      alert("Database completely wiped successfully.");
                      window.location.reload();
                    } else {
                      alert("Error: " + res.error);
                    }
                  } catch (e) {
                    alert("An error occurred while wiping database.");
                  }
                  setLoading(false);
                } else if (input !== null) {
                  alert("Incorrect confirmation code. Database wipe cancelled.");
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: 'var(--error)',
                border: '1px solid var(--error)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
              disabled={loading}
            >
              🚨 Permanently Wipe Database
            </button>
          </div>
        </>
      )}

      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }} disabled={loading}>
        {loading ? "Saving..." : "Save Configuration"}
      </button>
    </form>
  );
}
