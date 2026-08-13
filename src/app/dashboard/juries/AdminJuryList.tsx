"use client";

import { useState } from "react";
import { createJury, updateJury, deleteJury } from "./actions";
import ZoneJurySelection from "./ZoneJurySelection";

export default function AdminJuryList({ judges, zones, stateEvent, statePrograms }: { judges: any[], zones: any[], stateEvent?: any, statePrograms?: any[] }) {
  const [activeTab, setActiveTab] = useState<'list' | 'assign' | 'report'>('list');
  const [filterZoneId, setFilterZoneId] = useState<string>('ALL');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [place, setPlace] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullDayRate, setFullDayRate] = useState(2000);
  const [halfDayRate, setHalfDayRate] = useState(1000);

  const startEdit = (judge: any) => {
    setEditingId(judge.id);
    setUsername(judge.username);
    setPhone(judge.phone || "");
    setPlace(judge.place || "");
    setPassword("");
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setUsername("");
    setPhone("");
    setPlace("");
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    if (editingId) {
      const res = await updateJury(editingId, { username, password, phone, place });
      if (res.success) {
        cancelEdit();
      } else {
        setError(res.error || "Failed to update jury");
      }
    } else {
      const res = await createJury({ username, password, phone, place });
      if (res.success) {
        setUsername("");
        setPassword("");
        setPhone("");
        setPlace("");
      } else {
        setError(res.error || "Failed to create jury");
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this Jury?")) {
      await deleteJury(id);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: 'var(--spacing-lg)' }}>
        <button 
          onClick={() => setActiveTab('list')} 
          className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Master Jury List
        </button>
        {stateEvent && (
          <button 
            onClick={() => setActiveTab('assign')} 
            className={`btn ${activeTab === 'assign' ? 'btn-primary' : 'btn-secondary'}`}
          >
            State Fest Assignment
          </button>
        )}
        <button 
          onClick={() => setActiveTab('report')} 
          className={`btn ${activeTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Jury Payment Report
        </button>
      </div>

      {activeTab === 'assign' && stateEvent && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>State Fest Jury Assignment</h3>
          <ZoneJurySelection 
            allJudges={judges} 
            selectedJudges={stateEvent.selectedJudges || []} 
            programs={statePrograms || []}
            eventId={stateEvent.id} 
          />
        </div>
      )}

      {activeTab === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-lg)' }}>
          <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
              {editingId ? "Edit Global Jury" : "Create Global Jury"}
            </h3>
            <form onSubmit={handleSubmit}>
              {error && <div style={{ color: 'var(--error)', marginBottom: '10px' }}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Username (Full Name)</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. Dr. John Doe" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Place</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={place} 
                  onChange={e => setPlace(e.target.value)}
                  placeholder="e.g. Kozhikode" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password {editingId && "(Leave blank to keep current)"}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder={editingId ? "New password..." : "Default is 123"} 
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? "Saving..." : (editingId ? "Update Jury" : "Publish Jury to Master List")}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="btn btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Published Master List ({judges.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {judges.map(judge => (
                <div key={judge.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{judge.username}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Created {new Date(judge.createdAt).toLocaleDateString()}
                      {(judge.phone || judge.place) && (
                        <span> • {judge.phone} {judge.place && `(${judge.place})`}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                      {judge.assignedPrograms?.length || 0} Programs
                    </div>
                    <button onClick={() => startEdit(judge)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Edit</button>
                    <button onClick={() => handleDelete(judge.id)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--error)' }}>Del</button>
                  </div>
                </div>
              ))}
              {judges.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No juries created yet.</div>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h3>Jury Assignment Payment Report</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Half Day: ₹</span>
                <input type="number" className="form-input" style={{ width: '80px', padding: '0.3rem' }} value={halfDayRate} onChange={e => setHalfDayRate(Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full Day: ₹</span>
                <input type="number" className="form-input" style={{ width: '80px', padding: '0.3rem' }} value={fullDayRate} onChange={e => setFullDayRate(Number(e.target.value))} />
              </div>
              <select 
                className="form-input" 
                style={{ width: '200px' }}
                value={filterZoneId}
                onChange={(e) => setFilterZoneId(e.target.value)}
              >
                <option value="ALL">All Zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <tr>
                <th style={{ padding: '12px' }}>Jury Name</th>
                <th style={{ padding: '12px' }}>Schedule Summary</th>
                <th style={{ padding: '12px' }}>Total Payments (Est.)</th>
              </tr>
            </thead>
            <tbody>
              {judges.map(judge => {
                // Filter assignments based on zone
                const validAssignments = filterZoneId === 'ALL' 
                  ? (judge.assignedPrograms || []) 
                  : (judge.assignedPrograms || []).filter((p: any) => p.event?.zoneId === filterZoneId);
                
                if (validAssignments.length === 0 && filterZoneId !== 'ALL') return null;

                const daysMap = new Map<string, { min: number, max: number }>();
                
                validAssignments.forEach((p: any) => {
                  if (!p.startTime) return;
                  const date = new Date(p.startTime);
                  const dayKey = date.toISOString().split('T')[0];
                  const timeMs = date.getTime();
                  const endTimeMs = timeMs + ((p.duration || 10) * 60000);
                  
                  if (!daysMap.has(dayKey)) {
                    daysMap.set(dayKey, { min: timeMs, max: endTimeMs });
                  } else {
                    const d = daysMap.get(dayKey)!;
                    if (timeMs < d.min) d.min = timeMs;
                    if (endTimeMs > d.max) d.max = endTimeMs;
                  }
                });

                let fullDays = 0;
                let halfDays = 0;
                
                daysMap.forEach((d) => {
                  const hoursSpan = (d.max - d.min) / (1000 * 60 * 60);
                  if (hoursSpan <= 4) {
                    halfDays++;
                  } else {
                    fullDays++;
                  }
                });

                const totalPayment = (fullDays * fullDayRate) + (halfDays * halfDayRate);

                return (
                  <tr key={judge.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>{judge.username}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        {validAssignments.length} programs total
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {fullDays} Full Days, {halfDays} Half Days
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: 600 }}>
                      ₹{totalPayment}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-md)' }}>
            * Payment is automatically calculated based on scheduled program times (≤4 hours = Half Day, {">"}4 hours = Full Day). Programs without a scheduled time are ignored.
          </p>
        </div>
      )}
    </div>
  );
}
