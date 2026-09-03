"use client";

import { useState } from "react";
import { addZone, updateZone, deleteZone, resetFestData } from "./actions";

export default function ZonesClient({ initialZones }: { initialZones: any[] }) {
  const [zones, setZones] = useState(initialZones);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedResetZoneId, setSelectedResetZoneId] = useState("ALL");
  const [resetSuccess, setResetSuccess] = useState("");

  const handleResetFestData = async () => {
    const isAll = selectedResetZoneId === "ALL";
    const zoneName = isAll ? "ENTIRE FESTIVAL (ALL ZONES)" : zones.find(z => z.id === selectedResetZoneId)?.name;
    const confirmation = prompt(`⚠️ CAUTION: RESET TEST DATA FOR ${zoneName}?\n\nThis will permanently DELETE:\n1. All test candidates & chest numbers\n2. All test program assignments\n3. All test marks/results & rankings\n4. Re-unlock all institutions so they can freshly register.\n\nTo confirm, type "RESET" below:`);

    if (confirmation === "RESET") {
      setActionLoading(true);
      setResetSuccess("");
      const res = await resetFestData({
        zoneId: isAll ? undefined : selectedResetZoneId,
        clearResults: true,
        clearAssignments: true,
        clearCandidates: true,
        unlockTeams: true
      });

      if (res.success) {
        setResetSuccess(`✅ Festival test data cleared successfully for ${zoneName}! Institutions are unlocked and ready for fresh registration.`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        alert("Failed to reset: " + res.error);
        setActionLoading(false);
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
    };

    const res = await addZone(data);
    if (res.success) {
      setShowAddModal(false);
      window.location.reload();
    } else {
      alert("Failed to add zone: " + res.error);
    }
    setActionLoading(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingZone) return;
    setActionLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
    };

    const res = await updateZone(editingZone.id, data);
    if (res.success) {
      setEditingZone(null);
      window.location.reload();
    } else {
      alert("Failed to update zone: " + res.error);
    }
    setActionLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete zone "${name}"? This action cannot be undone.`)) {
      const res = await deleteZone(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert("Failed to delete: " + res.error);
      }
    }
  };

  return (
    <div>
      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: 'var(--spacing-lg)' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Regional Zones</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', marginTop: '4px' }}>{zones.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>State Festival Divisions</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Colleges</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3b82f6', marginTop: '4px' }}>
            {zones.reduce((acc, z) => acc + (z.totalInstitutions || 0), 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {zones.reduce((acc, z) => acc + (z.registeredInstitutions || 0), 0)} Colleges Started Registration
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Candidates Enrolled</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
            {zones.reduce((acc, z) => acc + (z.totalCandidates || 0), 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Registered Candidates in Teams</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Zone Confirmations</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ec4899', marginTop: '4px' }}>
            {zones.reduce((acc, z) => acc + (z.confirmedInstitutions || 0), 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Institutions Submitted & Locked</div>
        </div>
      </div>

      {/* Fresh Start Test Data Reset Box */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)', border: '1.5px solid rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧹</span> Fresh Start Festival Data Reset (Clean Test Registrations)
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Tested registrations, candidates, programs, or marks? Clear test data so institutions can register cleanly from scratch.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select 
              className="form-input" 
              value={selectedResetZoneId} 
              onChange={(e) => setSelectedResetZoneId(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: '180px' }}
            >
              <option value="ALL">🌐 All Zones (Entire Fest)</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>

            <button 
              onClick={handleResetFestData} 
              disabled={actionLoading}
              className="btn btn-secondary" 
              style={{ borderColor: '#dc2626', color: '#dc2626', backgroundColor: 'rgba(239, 68, 68, 0.1)', fontWeight: 700, padding: '6px 16px', fontSize: '0.85rem' }}
            >
              {actionLoading ? "Resetting..." : "🔥 Reset & Unlock for Fresh Start"}
            </button>
          </div>
        </div>
        {resetSuccess && (
          <div style={{ marginTop: '10px', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
            {resetSuccess}
          </div>
        )}
      </div>

      {/* Zone Actions Bar */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0 }}>Zone Registration & Results Status</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Real-time breakdown of registration progress and result evaluation by zone.
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            ➕ Add New Zone
          </button>
        </div>
      </div>

      {/* Zones Table with Progress */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        {zones.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No zones registered yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '10px 8px' }}>Zone Name</th>
                  <th>Code</th>
                  <th>Colleges</th>
                  <th>Candidates</th>
                  <th style={{ minWidth: '160px' }}>Registration Progress</th>
                  <th style={{ minWidth: '150px' }}>Results Progress</th>
                  <th style={{ textAlign: 'right', paddingRight: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {zone.name}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{zone.code}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{zone.totalInstitutions || 0}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        ({zone.registeredInstitutions || 0} active)
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      {zone.totalCandidates || 0}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${zone.registrationPercentage || 0}%`, 
                              height: '100%', 
                              backgroundColor: (zone.registrationPercentage || 0) >= 80 ? '#10b981' : ((zone.registrationPercentage || 0) >= 40 ? '#f59e0b' : '#ec4899'),
                              borderRadius: '10px',
                              transition: 'width 0.3s ease'
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '35px' }}>
                          {zone.registrationPercentage || 0}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {zone.confirmedInstitutions || 0} / {zone.totalInstitutions || 0} confirmed
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${zone.resultsPercentage || 0}%`, 
                              height: '100%', 
                              backgroundColor: '#8E0033',
                              borderRadius: '10px',
                              transition: 'width 0.3s ease'
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '35px', color: '#8E0033' }}>
                          {zone.resultsPercentage || 0}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {zone.scoredPrograms || 0} / {zone.totalPrograms || 0} programs
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setEditingZone(zone)} 
                          className="btn btn-secondary" 
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(zone.id, zone.name)} 
                          className="btn btn-secondary" 
                          style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Zone Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '16px', backgroundColor: 'var(--surface-color)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Add New Zone</h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Zone Name</label>
                <input type="text" name="name" placeholder="e.g. MALAPPURAM EAST" required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Zone Code</label>
                <input type="text" name="code" placeholder="e.g. MALA" required className="form-input" />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? "Adding..." : "Add Zone"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Edit Zone Modal */}
      {editingZone && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '16px', backgroundColor: 'var(--surface-color)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Edit Zone</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Zone Name</label>
                <input type="text" name="name" defaultValue={editingZone.name} required className="form-input" />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Zone Code</label>
                <input type="text" name="code" defaultValue={editingZone.code} required className="form-input" />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingZone(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
