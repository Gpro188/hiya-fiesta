"use client";

import { useState, useEffect } from "react";
import { updateSettings, updateEventDeadlines, resetSystem } from "./actions";
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

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (selectedEvent) {
      setRegistrationStart(selectedEvent.registrationStart ? new Date(selectedEvent.registrationStart).toISOString().slice(0, 16) : "");
      setRegistrationEnd(selectedEvent.registrationEnd ? new Date(selectedEvent.registrationEnd).toISOString().slice(0, 16) : "");
      setAssignmentStart(selectedEvent.assignmentStart ? new Date(selectedEvent.assignmentStart).toISOString().slice(0, 16) : "");
      setAssignmentEnd(selectedEvent.assignmentEnd ? new Date(selectedEvent.assignmentEnd).toISOString().slice(0, 16) : "");

      setInstitutionRegistrationEndDate(selectedEvent.institutionRegistrationEndDate ? new Date(selectedEvent.institutionRegistrationEndDate).toISOString().slice(0, 16) : "");
      setZoneActiveStartTime(selectedEvent.zoneActiveStartTime ? new Date(selectedEvent.zoneActiveStartTime).toISOString().slice(0, 16) : "");
      setZoneActiveEndTime(selectedEvent.zoneActiveEndTime ? new Date(selectedEvent.zoneActiveEndTime).toISOString().slice(0, 16) : "");
      setStateConfirmEndDate(selectedEvent.stateConfirmEndDate ? new Date(selectedEvent.stateConfirmEndDate).toISOString().slice(0, 16) : "");
      setStatusOverride(selectedEvent.statusOverride || "AUTO");
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

    // Save event deadlines
    const deadlineResult = await updateEventDeadlines(selectedEventId, {
      registrationStart: registrationStart || null,
      registrationEnd: registrationEnd || null,
      assignmentStart: assignmentStart || null,
      assignmentEnd: assignmentEnd || null,
      institutionRegistrationEndDate: institutionRegistrationEndDate || null,
      zoneActiveStartTime: zoneActiveStartTime || null,
      zoneActiveEndTime: zoneActiveEndTime || null,
      stateConfirmEndDate: stateConfirmEndDate || null,
      statusOverride: statusOverride
    });

    if (result.success && deadlineResult.success) {
      setStatus({ type: 'success', message: 'Settings saved successfully.' });
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
          <div className="form-group">
            <label className="form-label">Select Event</label>
            <select 
              className="form-input"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: 'var(--spacing-sm)' }}>
            <label className="form-label">Visibility Status Override</label>
            <select 
              className="form-input"
              value={statusOverride}
              onChange={(e) => setStatusOverride(e.target.value)}
              style={{ backgroundColor: statusOverride !== 'AUTO' ? '#fffbeb' : undefined, borderColor: statusOverride !== 'AUTO' ? '#f59e0b' : undefined }}
            >
              <option value="AUTO">AUTO (Depends on dates)</option>
              <option value="HIDDEN">HIDDEN (Hide from public)</option>
              <option value="PENDING">PENDING</option>
              <option value="REGISTRATION">REGISTRATION OPEN</option>
              <option value="LIVE">LIVE NOW</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
            <p className="form-help">Force the visibility state of this event on the public homepage. "AUTO" uses the scheduled dates.</p>
          </div>

          {(role === "ADMIN" || role === "SUPER_ADMIN") && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                <div className="form-group">
                  <label className="form-label">Registration Start Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={registrationStart}
                    onChange={(e) => setRegistrationStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Deadline</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={registrationEnd}
                    onChange={(e) => setRegistrationEnd(e.target.value)}
                  />
                </div>
              </div>
              <span className="field-helper" style={{ display: 'block', marginBottom: 'var(--spacing-md)' }}>Managers cannot add new candidates outside this window.</span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div className="form-group">
                  <label className="form-label">Assignment Start Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={assignmentStart}
                    onChange={(e) => setAssignmentStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assignment Deadline</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={assignmentEnd}
                    onChange={(e) => setAssignmentEnd(e.target.value)}
                  />
                </div>
              </div>
              <span className="field-helper" style={{ display: 'block', marginBottom: 'var(--spacing-md)' }}>Managers cannot assign programs outside this window.</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div className="form-group">
                  <label className="form-label">Zone Active Start Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={zoneActiveStartTime}
                    onChange={(e) => setZoneActiveStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Zone Active End Time</label>
                  <input 
                    type="datetime-local" 
                    className="form-input" 
                    value={zoneActiveEndTime}
                    onChange={(e) => setZoneActiveEndTime(e.target.value)}
                  />
                </div>
              </div>
              <span className="field-helper" style={{ display: 'block', marginBottom: 'var(--spacing-md)' }}>Period during which the zone portal is considered fully active.</span>

              <div className="form-group">
                <label className="form-label">State Confirm End Date</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={stateConfirmEndDate}
                  onChange={(e) => setStateConfirmEndDate(e.target.value)}
                />
                <span className="field-helper">Deadline to confirm registrations to the state portal.</span>
              </div>
            </>
          )}

          <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
            <label className="form-label">Institution Registration End Date</label>
            <input 
              type="datetime-local" 
              className="form-input" 
              value={institutionRegistrationEndDate}
              onChange={(e) => setInstitutionRegistrationEndDate(e.target.value)}
              disabled={role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "ZONE_ADMIN"}
            />
            <span className="field-helper">Deadline for institutions to register candidates.</span>
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>No events created yet.</p>
      )}
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

      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }} disabled={loading}>
        {loading ? "Saving..." : "Save Configuration"}
      </button>
    </form>
  );
}
