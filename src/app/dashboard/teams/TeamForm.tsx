"use client";

import { useState } from "react";
import { createTeam } from "./actions";
import ImageUpload from "../../components/ImageUpload";

type EventType = { id: string; name: string };

export default function TeamForm({ events }: { events: EventType[] }) {
  const [name, setName] = useState("");
  const [prefixCode, setPrefixCode] = useState("");
  const [eventId, setEventId] = useState(events[0]?.id || "");
  const [managerUsername, setManagerUsername] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  
  const [leaderName, setLeaderName] = useState("");
  const [leaderPhoto, setLeaderPhoto] = useState("");
  const [flagColor, setFlagColor] = useState("#8E0033");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const result = await createTeam({
      name,
      prefixCode,
      eventId,
      managerUsername,
      managerPassword,
      leaderName,
      leaderPhoto,
      flagColor,
    });
    
    if (result.success) {
      setName("");
      setPrefixCode("");
      setManagerUsername("");
      setManagerPassword("");
      setLeaderName("");
      setLeaderPhoto("");
      setFlagColor("#8E0033");
    } else {
      setError(result.error || "Failed to create team");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ color: 'var(--error)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}
      
      <div className="form-group">
        <label className="form-label">Event</label>
        <select 
          className="form-input" 
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          required
        >
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <span className="field-helper">Select which festival event this team belongs to.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <div className="form-group">
          <label className="form-label">Team Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Al-Fatah"
            required
          />
          <span className="field-helper">Display name shown in standings and results.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Chest No Prefix</label>
          <input 
            type="text" 
            className="form-input" 
            value={prefixCode}
            onChange={(e) => setPrefixCode(e.target.value)}
            placeholder="e.g. 1"
            required
          />
          <span className="field-helper">Used to generate chest numbers (e.g., prefix "1" = 101, 102...).</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-md)' }}>
        <div className="form-group">
          <label className="form-label">Team Leader Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={leaderName}
            onChange={(e) => setLeaderName(e.target.value)}
            placeholder="e.g. Abdullah"
          />
          <span className="field-helper">Optional. Name displayed on team profile.</span>
        </div>
        <div className="form-group">
          <label className="form-label">Flag Color</label>
          <input 
            type="color" 
            className="form-input" 
            value={flagColor}
            onChange={(e) => setFlagColor(e.target.value)}
            style={{ height: '42px', padding: '2px' }}
          />
          <span className="field-helper">Team color used in charts and ID cards.</span>
        </div>
      </div>

      <div className="form-group">
        <ImageUpload 
          label="Leader Photo (Optional)" 
          folder="teams" 
          initialUrl={leaderPhoto}
          onUploadComplete={(url) => setLeaderPhoto(url)} 
        />
      </div>

      <h4 style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
        Team Manager Credentials
      </h4>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}>
        Create login credentials for this team's manager. They will use these to access their dashboard.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input 
            type="text" 
            className="form-input" 
            value={managerUsername}
            onChange={(e) => setManagerUsername(e.target.value)}
            required
          />
          <span className="field-helper">Unique login username for the team manager.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input 
            type="password" 
            className="form-input" 
            value={managerPassword}
            onChange={(e) => setManagerPassword(e.target.value)}
            required
            minLength={6}
          />
          <span className="field-helper">Minimum 6 characters. Share this securely with the manager.</span>
        </div>
      </div>
      
      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-sm)' }} disabled={loading}>
        {loading ? "Creating..." : "Create Team"}
      </button>
    </form>
  );
}
