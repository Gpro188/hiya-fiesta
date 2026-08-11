"use client";

import { useState } from "react";
import { createProgram } from "./actions";

type EventType = { id: string; name: string; categories: { id: string; name: string }[] };

export default function ProgramForm({ events }: { events: EventType[] }) {
  const [name, setName] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [type, setType] = useState("INDIVIDUAL");
  const [stageType, setStageType] = useState("ON_STAGE");
  const [eventId, setEventId] = useState(events[0]?.id || "");
  
  const selectedEvent = events.find(e => e.id === eventId);
  const categories = selectedEvent?.categories || [];
  
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [candidateLimitPerTeam, setCandidateLimitPerTeam] = useState(1);
  const [duration, setDuration] = useState(10);
  const [description, setDescription] = useState("");
  const [evaluationCriteria, setEvaluationCriteria] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const result = await createProgram({
      programCode,
      name,
      type,
      categoryId: type === "GENERAL" ? null : categoryId,
      eventId,
      candidateLimitPerTeam: parseInt(candidateLimitPerTeam.toString()) || 1,
      duration: parseInt(duration.toString()) || 10,
      description,
      evaluationCriteria,
      stageType,
    });
    
    if (result.success) {
      setName("");
      setProgramCode("");
      setDescription("");
      setEvaluationCriteria("");
    } else {
      setError(result.error || "Failed to create program");
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
          onChange={(e) => {
            setEventId(e.target.value);
            // Reset category when event changes
            const ev = events.find(event => event.id === e.target.value);
            setCategoryId(ev?.categories[0]?.id || "");
          }}
          required
        >
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-md)' }}>
        <div className="form-group">
          <label className="form-label">Program Code</label>
          <input 
            type="text" 
            className="form-input" 
            value={programCode}
            onChange={(e) => setProgramCode(e.target.value)}
            placeholder="e.g. P101"
          />
          <span className="field-helper">Short reference code (optional). Useful for schedules and reports.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Program Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Quran Recitation"
            required
          />
          <span className="field-helper">Full name displayed on results and schedules.</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Program Type</label>
        <select 
          className="form-input" 
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
        >
          <option value="INDIVIDUAL">Individual</option>
          <option value="GROUP">Group</option>
          <option value="GENERAL">General</option>
        </select>
        <span className="field-helper">Individual = scored per candidate. Group = scored as a team. General = non-category program.</span>
      </div>

      <div className="form-group">
        <label className="form-label">Stage Type</label>
        <select 
          className="form-input" 
          value={stageType}
          onChange={(e) => setStageType(e.target.value)}
          required
        >
          <option value="ON_STAGE">On-Stage (Live Performance)</option>
          <option value="OFF_STAGE">Off-Stage (Written/Submission)</option>
        </select>
        <span className="field-helper">Off-stage programs generally occur before the live events.</span>
      </div>

      {type !== "GENERAL" && (
        <div className="form-group">
          <label className="form-label">Category</label>
          <select 
            className="form-input" 
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {categories.length === 0 ? (
              <option value="">No categories available</option>
            ) : (
              categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)
            )}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          {type === "INDIVIDUAL" ? "Duration Per Candidate" : "Total Program Duration"} (Minutes)
        </label>
        <input 
          type="number" 
          className="form-input" 
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          min="1"
          required
        />
        <span className="field-helper">Time allocated in minutes. Used for schedule planning.</span>
      </div>

      <div className="form-group">
        <label className="form-label">Description (Topics etc.)</label>
        <textarea 
          className="form-input" 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Topics for speech: Faith over fame, etc."
          rows={3}
        />
        <span className="field-helper">Optional details about the program topics or rules.</span>
      </div>

      <div className="form-group">
        <label className="form-label">Evaluation Criteria / Assessment Criteria</label>
        <textarea 
          className="form-input" 
          value={evaluationCriteria}
          onChange={(e) => setEvaluationCriteria(e.target.value)}
          placeholder="e.g. Voice 20, Pronunciation 30..."
          rows={3}
        />
        <span className="field-helper">Optional breakdown of how this program is judged.</span>
      </div>

      <div className="form-group">
        <label className="form-label">Candidates Per Team Limit</label>
        <input 
          type="number" 
          className="form-input" 
          value={candidateLimitPerTeam}
          onChange={(e) => setCandidateLimitPerTeam(parseInt(e.target.value))}
          min="1"
          required
        />
        <span className="field-helper">Maximum number of candidates a single team can assign to this program.</span>
      </div>
      
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? "Creating..." : "Create Program"}
      </button>
    </form>
  );
}
