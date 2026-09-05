"use client";

import { useState } from "react";
import { addZone, updateZone, deleteZone, resetFestData, unlockInstitutionTeam, lockInstitutionTeam } from "./actions";
import { formatInstitutionDisplay } from "@/lib/formatUtils";
import RegistrationAccessModal from "@/app/dashboard/teams/RegistrationAccessModal";

export default function ZonesClient({ initialZones }: { initialZones: any[] }) {
  const [zones, setZones] = useState(initialZones);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [viewingCollegesZone, setViewingCollegesZone] = useState<any | null>(null);
  const [accessModalTeam, setAccessModalTeam] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedResetZoneId, setSelectedResetZoneId] = useState("ALL");
  const [resetSuccess, setResetSuccess] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");

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
                      <button 
                        onClick={() => setViewingCollegesZone(zone)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        title="Click to view and unlock individual colleges in this zone"
                      >
                        🏛️ <strong>{zone.totalInstitutions || 0}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ({zone.registeredInstitutions || 0} active)
                        </span>
                      </button>
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
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => setViewingCollegesZone(zone)}
                          className="btn btn-secondary" 
                          style={{ padding: '3px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}
                          title="Open institution list and manage edit permissions"
                        >
                          🏛️ Colleges
                        </button>
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

      {/* View & Manage Zone Colleges Modal */}
      {viewingCollegesZone && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', backgroundColor: 'var(--surface-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏛️</span> {viewingCollegesZone.name} ({viewingCollegesZone.code}) - Institutions Management
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Unlock individual colleges for re-editing / correcting candidate data, or lock and confirm their registrations.
                </p>
              </div>
              <button 
                onClick={() => { setViewingCollegesZone(null); setCollegeSearch(""); }} 
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.85rem' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Filter Search */}
            <div style={{ marginBottom: '14px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search college by name, code, or place..."
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.875rem' }}
              />
            </div>

            {/* Colleges Table */}
            {(!viewingCollegesZone.institutions || viewingCollegesZone.institutions.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No institutions mapped to this zone yet. You can assign colleges in Master Institutions.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px' }}>#</th>
                      <th style={{ padding: '8px' }}>Code</th>
                      <th style={{ padding: '8px' }}>Institution Name</th>
                      <th style={{ padding: '8px' }}>Candidates</th>
                      <th style={{ padding: '8px' }}>Registration Status</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingCollegesZone.institutions
                      .filter((inst: any) => {
                        if (!collegeSearch) return true;
                        const q = collegeSearch.toLowerCase().trim();
                        const { name: instName, place: instPlace } = formatInstitutionDisplay(inst);
                        return (
                          instName.toLowerCase().includes(q) ||
                          (instPlace && instPlace.toLowerCase().includes(q)) ||
                          (inst.code && inst.code.toLowerCase().includes(q)) ||
                          (inst.place && inst.place.toLowerCase().includes(q)) ||
                          (inst.name && inst.name.toLowerCase().includes(q))
                        );
                      })
                      .map((inst: any, idx: number) => {
                        const team = inst.teams?.[0];
                        const candidateCount = team?._count?.candidates || 0;
                        const isConfirmed = team?.isAssignmentsConfirmed;
                        const { name: instName, place: instPlace } = formatInstitutionDisplay(inst);

                        const now = new Date();
                        const offDeadline =
                          team?.event?.offStageRegistrationEnd ||
                          team?.event?.parent?.offStageRegistrationEnd ||
                          team?.event?.institutionRegistrationEndDate ||
                          team?.event?.parent?.institutionRegistrationEndDate ||
                          team?.event?.registrationEnd ||
                          team?.event?.parent?.registrationEnd;

                        const onDeadline =
                          team?.event?.onStageRegistrationEnd ||
                          team?.event?.parent?.onStageRegistrationEnd ||
                          team?.event?.institutionRegistrationEndDate ||
                          team?.event?.parent?.institutionRegistrationEndDate ||
                          team?.event?.registrationEnd ||
                          team?.event?.parent?.registrationEnd;

                        const isOffDeadlinePassed = offDeadline ? now > new Date(offDeadline) : false;
                        const isOnDeadlinePassed = onDeadline ? now > new Date(onDeadline) : false;

                        const isOffStageOpen = team?.offStageUnlocked || (!isConfirmed && !isOffDeadlinePassed);
                        const isOnStageOpen = team?.onStageUnlocked || (!isConfirmed && !isOnDeadlinePassed);

                        const offStageCandidates = team?.candidates?.filter((c: any) =>
                          c.programs?.some((p: any) => p.program?.stageType === "OFF_STAGE")
                        ).length || 0;

                        const onStageCandidates = team?.candidates?.filter((c: any) =>
                          c.programs?.some((p: any) => p.program?.stageType === "ON_STAGE")
                        ).length || 0;

                        return (
                          <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 8px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                              {inst.code || '-'}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{instName}</div>
                              {instPlace && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span>📍</span> {instPlace}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              <div style={{ fontWeight: 700, color: candidateCount > 0 ? '#10b981' : 'var(--text-muted)' }}>
                                {candidateCount} candidates
                              </div>
                              {candidateCount > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem', marginTop: '4px' }}>
                                  <span style={{ color: '#0284c7', fontWeight: 600 }}>🎨 Off-Stage: {offStageCandidates}</span>
                                  <span style={{ color: '#db2777', fontWeight: 600 }}>🎭 On-Stage: {onStageCandidates}</span>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                              {team ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                  <span style={{
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: isOffStageOpen ? 'rgba(14, 165, 233, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                    color: isOffStageOpen ? '#0284c7' : '#ef4444',
                                    border: `1px solid ${isOffStageOpen ? 'rgba(14, 165, 233, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    🎨 Off-Stage: {team.offStageUnlocked ? '⚡ Zone Override (Open)' : isOffStageOpen ? '🟢 Open' : '🔒 Closed'}
                                  </span>
                                  <span style={{
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    backgroundColor: isOnStageOpen ? 'rgba(236, 72, 153, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                    color: isOnStageOpen ? '#db2777' : '#ef4444',
                                    border: `1px solid ${isOnStageOpen ? 'rgba(236, 72, 153, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    🎭 On-Stage: {team.onStageUnlocked ? '⚡ Zone Override (Open)' : isOnStageOpen ? '🟢 Open' : '🔒 Closed'}
                                  </span>
                                  {isConfirmed && (
                                    <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, marginTop: '1px' }}>
                                      ✓ Submitted & Locked
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No team yet</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                              {team && (
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => setAccessModalTeam(team)}
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '3px 8px',
                                      fontSize: '0.75rem',
                                      backgroundColor: (team.offStageUnlocked || team.onStageUnlocked) ? 'rgba(16,185,129,0.15)' : 'rgba(142,0,51,0.1)',
                                      color: (team.offStageUnlocked || team.onStageUnlocked) ? '#059669' : '#8E0033',
                                      borderColor: (team.offStageUnlocked || team.onStageUnlocked) ? '#10b981' : '#8E0033',
                                      fontWeight: 700
                                    }}
                                    title="Open Off-Stage only, On-Stage only, Both, or Lock registration"
                                  >
                                    ⚡ Stage Access
                                  </button>
                                  {isConfirmed ? (
                                    <button
                                      onClick={async () => {
                                        const reason = prompt(`Open registration for "${inst.name}"?\n\nEnter reason / note for opening (e.g. "Name correction", "Add remaining candidates", etc.):`, "Permission granted by Zone Admin for correction");
                                        if (reason !== null) {
                                          setActionLoading(true);
                                          const res = await unlockInstitutionTeam(team.id, reason);
                                          if (res.success) {
                                            alert(`✅ ${inst.name} is now OPEN for editing!`);
                                            window.location.reload();
                                          } else {
                                            alert("Failed: " + res.error);
                                            setActionLoading(false);
                                          }
                                        }
                                      }}
                                      disabled={actionLoading}
                                      className="btn btn-secondary"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(245,158,11,0.15)', color: '#d97706', borderColor: '#d97706', fontWeight: 700 }}
                                    >
                                      🔓 Open All
                                    </button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        if (confirm(`Lock & confirm registration for "${inst.name}"?`)) {
                                          setActionLoading(true);
                                          const res = await lockInstitutionTeam(team.id);
                                          if (res.success) {
                                            window.location.reload();
                                          } else {
                                            alert("Failed: " + res.error);
                                            setActionLoading(false);
                                          }
                                        }
                                      }}
                                      disabled={actionLoading}
                                      className="btn btn-secondary"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: '#10b981' }}
                                    >
                                      🔒 Lock All
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage Access Control Modal */}
      {accessModalTeam && (
        <RegistrationAccessModal
          team={accessModalTeam}
          onClose={() => setAccessModalTeam(null)}
          onUpdated={() => window.location.reload()}
        />
      )}
    </div>
  );
}
