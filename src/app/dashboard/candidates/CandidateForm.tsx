"use client";

import { useState } from "react";
import { addCandidate } from "./actions";
import ImageUpload from "../../components/ImageUpload";

export default function CandidateForm({ 
  teamId: initialTeamId = "", 
  teams = [], 
  categories, 
  masterStudents = [],
  isRegistrationOpen = true, 
  statusMessage = "",
  isAdmin = false
}: { 
  teamId?: string, 
  teams?: any[], 
  categories: any[], 
  masterStudents?: any[],
  isRegistrationOpen?: boolean, 
  statusMessage?: string,
  isAdmin?: boolean
}) {
  const [name, setName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || teams[0]?.id || "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [photo, setPhoto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isRegistrationOpen && !isAdmin) {
    return (
      <div style={{ 
        padding: 'var(--spacing-lg)', 
        backgroundColor: 'rgba(239, 68, 68, 0.05)', 
        border: '1px dashed var(--error)', 
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
        color: 'var(--error)'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🕒</div>
        <strong>Registration Closed / Not Started</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem' }}>{statusMessage || "The deadline for adding candidates has passed. Please contact the administrator for any urgent changes."}</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError("Please select a team for this candidate.");
      return;
    }
    if (!photo) {
      setError("Candidate photo is mandatory.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(false);
    
    const result = await addCandidate({ name, categoryId, teamId: selectedTeamId, photo, uid });
    
    if (result.success) {
      setSuccess(true);
      setName("");
      setUid("");
      setPhoto("");
    } else {
      setError(result.error || "Failed to add candidate");
    }
    setLoading(false);
  };

  const [uid, setUid] = useState("");
  const [searchingUid, setSearchingUid] = useState(false);
  const [uidStatus, setUidStatus] = useState("");

  const handleUidLookup = async (inputUid: string) => {
    setUid(inputUid);
    if (inputUid.trim().length >= 4) {
      setSearchingUid(true);
      setUidStatus("Searching UID...");
      const { lookupStudentByUID } = await import("./uidLookup");
      const res = await lookupStudentByUID(inputUid);
      if (res.success && res.student) {
        setName(res.student.name);
        setUidStatus(`✅ Found: ${res.student.name} (${res.student.institution?.name})`);
        
        // Auto-match category if stream matches FADHILA or FADHEELA
        if (res.student.stream) {
          const matchedCat = categories.find(c => c.name.toUpperCase().includes(res.student.stream.toUpperCase()));
          if (matchedCat) setCategoryId(matchedCat.id);
        }
      } else {
        setUidStatus("⚠️ UID not found in Master Directory. You can type name manually.");
      }
      setSearchingUid(false);
    } else {
      setUidStatus("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ color: 'var(--error)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: 'var(--success)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-xs)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)' }}>
          Candidate added successfully!
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1.5fr 1.2fr 1.2fr auto' : '1fr 1.5fr 1.2fr 1fr auto', gap: 'var(--spacing-md)', alignItems: 'end' }}>
        
        {isAdmin ? (
          <>
            {/* UID Search Field for Admin */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>Student UID #</label>
              <input 
                type="text" 
                className="form-input" 
                value={uid}
                onChange={(e) => handleUidLookup(e.target.value)}
                placeholder="e.g. FL26CH12"
                style={{ fontWeight: 700, fontFamily: 'monospace' }}
              />
              {uidStatus && <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '2px', color: uidStatus.startsWith('✅') ? 'var(--success)' : 'var(--text-muted)' }}>{uidStatus}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Candidate Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                required
              />
              <span className="field-helper">Enter full name.</span>
            </div>
          </>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>Student UID #</label>
              <input
                type="text"
                className="form-input"
                value={uid}
                onChange={(e) => handleUidLookup(e.target.value)}
                placeholder="e.g. FL26CH12"
                style={{ fontWeight: 700, fontFamily: 'monospace' }}
              />
              {uidStatus && <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '2px', color: uidStatus.startsWith('✅') ? 'var(--success)' : 'var(--text-muted)' }}>{uidStatus}</span>}
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Candidate Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                readOnly
                placeholder="Auto-filled from UID"
                style={{ backgroundColor: 'var(--surface-color)', opacity: 0.7 }}
                required
              />
              <span className="field-helper">Enter UID to fetch name.</span>
            </div>
          </>
        )}
        
        {isAdmin && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Team</label>
            <select 
              className="form-input" 
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              required
            >
              <option value="">Select Team...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <span className="field-helper">Team participant belongs to.</span>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Category</label>
          <select 
            className="form-input" 
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={!!uid}
            style={{ backgroundColor: !!uid ? 'var(--surface-color)' : '', opacity: !!uid ? 0.7 : 1 }}
          >
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <span className="field-helper">{!!uid ? "Category is locked to the pre-registered student's stream." : "Age-group division."}</span>
        </div>

        <ImageUpload 
          label="Photo (Compulsory)" 
          folder="candidates" 
          initialUrl={photo}
          onUploadComplete={(url) => setPhoto(url)} 
        />
        
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '42px', marginBottom: 'var(--spacing-md)' }}>
          {loading ? "Adding..." : "Add Student"}
        </button>
      </div>
    </form>
  );
}
