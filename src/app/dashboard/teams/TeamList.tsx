"use client";

import { useState } from "react";
import { deleteTeam } from "./actions";
import EditTeamModal from "./EditTeamModal";
import RegistrationAccessModal from "./RegistrationAccessModal";
import { formatInstitutionDisplay } from "@/lib/formatUtils";

type TeamType = {
  id: string;
  name: string;
  prefixCode: string;
  eventId?: string;
  event: { 
    id?: string;
    name: string;
    offStageRegistrationEnd?: string | Date | null;
    onStageRegistrationEnd?: string | Date | null;
    institutionRegistrationEndDate?: string | Date | null;
    registrationEnd?: string | Date | null;
    parent?: {
      offStageRegistrationEnd?: string | Date | null;
      onStageRegistrationEnd?: string | Date | null;
      institutionRegistrationEndDate?: string | Date | null;
      registrationEnd?: string | Date | null;
    } | null;
  };
  institution?: { id: string; name: string; code?: string | null; place?: string | null } | null;
  manager?: { username: string } | null;
  leaderName: string | null;
  leaderPhoto: string | null;
  flagColor: string | null;
  isAssignmentsConfirmed: boolean;
  isOnStageConfirmed?: boolean;
  offStageUnlocked?: boolean;
  onStageUnlocked?: boolean;
  registrationUnlocked?: boolean;
  magazineCode?: string | null;
  _count: { candidates: number };
  candidates?: { id: string; _count: { programs: number } }[];
};

export default function TeamList({ teams, role = "ADMIN" }: { teams: TeamType[], role?: string }) {
  const [editingTeam, setEditingTeam] = useState<TeamType | null>(null);
  const [accessModalTeam, setAccessModalTeam] = useState<TeamType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  if (teams.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No teams created yet.</div>;
  }

  const now = new Date();

  const filteredTeams = teams.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const { name: instName, place: instPlace } = formatInstitutionDisplay(t);
    return (
      instName.toLowerCase().includes(q) ||
      (instPlace && instPlace.toLowerCase().includes(q)) ||
      t.name.toLowerCase().includes(q) ||
      t.prefixCode.toLowerCase().includes(q) ||
      (t.institution?.place && t.institution.place.toLowerCase().includes(q)) ||
      (t.institution?.code && t.institution.code.toLowerCase().includes(q)) ||
      (t.manager?.username && t.manager.username.toLowerCase().includes(q)) ||
      (t.leaderName && t.leaderName.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Zone Admin Bulk Action Bar */}
      {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && teams.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          marginBottom: '4px'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎭</span> On-Stage Batch Control
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              Open On-Stage registration for all colleges in this zone at once. Previously confirmed Off-Stage registrations remain strictly locked!
            </div>
          </div>
          <button
            onClick={async () => {
              if (!confirm("Are you sure you want to open On-Stage registration for all colleges in this zone? All confirmed Off-Stage registrations will remain strictly locked!")) {
                return;
              }
              setBulkLoading(true);
              const { bulkUnlockOnStageForZone } = await import("./actions");
              const res = await bulkUnlockOnStageForZone(teams[0]?.eventId || teams[0]?.event?.id || "");
              if (res.success) {
                alert(`✅ Successfully opened On-Stage registration for ${res.count} institutions! Off-Stage registrations remain strictly locked.`);
                window.location.reload();
              } else {
                alert(res.error || "Failed to bulk open On-Stage.");
                setBulkLoading(false);
              }
            }}
            disabled={bulkLoading}
            className="btn"
            style={{
              padding: '0.45rem 1.1rem',
              fontSize: '0.84rem',
              fontWeight: 800,
              backgroundColor: '#db2777',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(219,39,119,0.2)'
            }}
          >
            {bulkLoading ? "Opening..." : "🎭 Open On-Stage for All Teams"}
          </button>
        </div>
      )}

      {/* Team Search Bar */}
      <div style={{ marginBottom: '4px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search team / college by name, code, or place..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', borderRadius: '8px' }}
        />
      </div>

      {filteredTeams.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No teams found matching &quot;{searchQuery}&quot;.
        </div>
      ) : (
        filteredTeams.map((team) => {
          const totalPrograms = team.candidates?.reduce((sum, c) => sum + c._count.programs, 0) || 0;
          const { name: instName, place: instPlace } = formatInstitutionDisplay(team);

          const offDeadline =
            team.event?.offStageRegistrationEnd ||
            team.event?.parent?.offStageRegistrationEnd ||
            team.event?.institutionRegistrationEndDate ||
            team.event?.parent?.institutionRegistrationEndDate ||
            team.event?.registrationEnd ||
            team.event?.parent?.registrationEnd;

          const onDeadline =
            team.event?.onStageRegistrationEnd ||
            team.event?.parent?.onStageRegistrationEnd ||
            team.event?.institutionRegistrationEndDate ||
            team.event?.parent?.institutionRegistrationEndDate ||
            team.event?.registrationEnd ||
            team.event?.parent?.registrationEnd;

          const isOffDeadlinePassed = offDeadline ? now > new Date(offDeadline) : false;
          const isOnDeadlinePassed = onDeadline ? now > new Date(onDeadline) : false;

          const isOffStageOpen = team.offStageUnlocked || (!team.isAssignmentsConfirmed && !isOffDeadlinePassed);
          const isOnStageOpen = team.onStageUnlocked || (!team.isOnStageConfirmed && !isOnDeadlinePassed);

          return (
          <div key={team.id} style={{ 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0', 
            borderLeft: `5px solid ${team.flagColor || '#8E0033'}`,
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
            gap: 'var(--spacing-md)',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1, minWidth: '300px' }}>
              {team.leaderPhoto && (
                <img 
                  src={team.leaderPhoto} 
                  alt={team.leaderName || "Leader"} 
                  style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                />
              )}
              <div>
                <h4 style={{ color: '#0f172a', marginBottom: '2px', fontSize: '1.05rem', fontWeight: 800 }}>
                  {instName}{" "}
                  <span style={{ color: '#8E0033', fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', padding: '2px 8px', borderRadius: '4px' }}>
                    Prefix: {team.prefixCode}
                  </span>
                  {team.isAssignmentsConfirmed && (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: '#059669', color: 'white', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 800 }}>LOCKED</span>
                  )}
                </h4>
                {instPlace && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📍</span> {instPlace}
                  </div>
                )}
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                Event: <strong style={{ color: '#1e293b' }}>{team.event.name}</strong> • Manager: <strong style={{ color: '#1e293b' }}>{team.manager?.username || 'None'}</strong>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '4px' }}>
                <strong style={{ color: '#0f172a' }}>{team._count.candidates}</strong> Registered Candidates • <strong style={{ color: '#0f172a' }}>{totalPrograms}</strong> Programs Assigned
              </div>
              {team.leaderName && (
                <div style={{ fontSize: '0.8rem', color: '#8E0033', fontWeight: 600, marginTop: '4px' }}>
                  Leader: {team.leaderName}
                </div>
              )}

              {/* Off-Stage and On-Stage Status Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', alignItems: 'flex-start' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  fontWeight: 700,
                  backgroundColor: team.offStageUnlocked ? '#ecfdf5' : isOffStageOpen ? '#f0fdf4' : '#fef2f2',
                  color: team.offStageUnlocked ? '#047857' : isOffStageOpen ? '#15803d' : '#b91c1c',
                  border: `1px solid ${team.offStageUnlocked ? '#6ee7b7' : isOffStageOpen ? '#86efac' : '#fecaca'}`
                }}>
                  🎨 Off-Stage: {team.offStageUnlocked ? '⚡ Zone Override (Open)' : isOffStageOpen ? '🟢 Open' : '🔒 Closed'}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  fontWeight: 700,
                  backgroundColor: team.onStageUnlocked ? '#ecfdf5' : isOnStageOpen ? '#f0fdf4' : '#fef2f2',
                  color: team.onStageUnlocked ? '#047857' : isOnStageOpen ? '#15803d' : '#b91c1c',
                  border: `1px solid ${team.onStageUnlocked ? '#6ee7b7' : isOnStageOpen ? '#86efac' : '#fecaca'}`
                }}>
                  🎭 On-Stage: {team.onStageUnlocked ? '⚡ Zone Override (Open)' : isOnStageOpen ? '🟢 Open' : '🔒 Closed'}
                </span>
              </div>

              {team.isAssignmentsConfirmed ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 700, padding: '4px 10px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '4px' }}>
                    ✅ Registration Confirmed & Locked (Chest Numbers Assigned)
                  </div>
                  {team.magazineCode && (
                    <div style={{ fontSize: '0.8rem', color: '#7e22ce', fontWeight: 800, padding: '4px 10px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '4px' }}>
                      📖 Magazine Code: <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{team.magazineCode}</span>
                    </div>
                  )}
                </div>
              ) : totalPrograms === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '8px', fontWeight: 700, padding: '4px 10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'inline-block', borderRadius: '4px' }}>
                  🔴 Registration Pending (No programs assigned)
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '8px', fontWeight: 700, padding: '4px 10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'inline-block', borderRadius: '4px' }}>
                  🟡 Ready for Zone Approval & Chest Numbers
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
              <a 
                href={`/print/assignments?teamId=${team.id}`} 
                target="_blank" 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', textDecoration: 'none', backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}
              >
                Review Assignments
              </a>
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && (
                <a 
                  href={`/print/off-stage-invigilation?teamId=${team.id}`} 
                  target="_blank" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', textDecoration: 'none', borderColor: '#fecdd3', backgroundColor: '#fff1f2', color: '#9f1239', fontWeight: 700, borderRadius: '6px' }}
                  title="Print Off-Stage Invigilation Sheet with candidate photos"
                >
                  📝 Off-Stage Sheet
                </a>
              )}
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && totalPrograms > 0 && !team.isAssignmentsConfirmed && (
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerText = "Approving Off-Stage...";
                    const result = await import("./actions").then(m => m.confirmTeamRegistration(team.id, "OFF_STAGE"));
                    if (!result.success) alert(result.error);
                    else if (result.count === 0) alert("No new candidates to confirm.");
                    else alert(`Successfully confirmed Off-Stage for ${result.count} candidates and assigned Magazine Code: ${result.magazineCode || 'Assigned'}.`);
                    btn.disabled = false;
                    btn.innerText = "Approve & Generate Chest Nos";
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                >
                  Approve & Generate Chest Nos
                </button>
              )}

              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && totalPrograms > 0 && team.isAssignmentsConfirmed && !team.isOnStageConfirmed && (
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerText = "Confirming On-Stage...";
                    const result = await import("./actions").then(m => m.confirmTeamRegistration(team.id, "ON_STAGE"));
                    if (!result.success) alert(result.error);
                    else alert(`Successfully confirmed On-Stage registration! Any new candidates received sequential chest numbers.`);
                    btn.disabled = false;
                    btn.innerText = "🎭 Confirm On-Stage";
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', backgroundColor: '#db2777', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                  title="Confirm On-Stage candidates and assign sequential chest numbers to any newly registered students"
                >
                  🎭 Confirm On-Stage
                </button>
              )}

              {team.isAssignmentsConfirmed && team.isOnStageConfirmed && (
                <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                  ✅ Fully Confirmed (Off & On-Stage)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Dedicated Stage Unlock / Access Control for Zone Admins & Admins */}
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && (
                <button 
                  onClick={() => setAccessModalTeam(team)}
                  className="btn" 
                  style={{ 
                    padding: '0.35rem 0.95rem', 
                    fontSize: '0.82rem', 
                    backgroundColor: (team.offStageUnlocked || team.onStageUnlocked || team.registrationUnlocked) ? '#059669' : '#8E0033', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '6px',
                    fontWeight: 700,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Open Off-Stage only, On-Stage only, Both, or Lock registration for this institution"
                >
                  {(team.offStageUnlocked || team.onStageUnlocked || team.registrationUnlocked) ? "🔓 Stage Access (Unlocked)" : "⚡ Unlock Registration (Off/On-Stage)"}
                </button>
              )}

              {/* Edit and Delete are only available for State Super Admins / Admins, NOT Zone Admins */}
              {["ADMIN", "SUPER_ADMIN"].includes(role) && (
                <>
                  <button 
                    onClick={() => setEditingTeam(team)}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', borderRadius: '6px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this team and its manager?')) {
                        deleteTeam(team.id);
                      }
                    }}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', color: '#dc2626', borderColor: '#fca5a5', borderRadius: '6px' }}
                  >
                    Delete
                  </button>
                </>
              )}

              <a href={`/print/id-cards?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', color: '#047857', textDecoration: 'none', fontWeight: 700, borderRadius: '6px' }}>
                🪪 Chest Slips & ID Cards
              </a>
              <a href={`/print/institution-report?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', textDecoration: 'none', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}>
                📑 Candidates Report
              </a>
            </div>
          </div>
        </div>
      );
    }))}

      {editingTeam && (
        <EditTeamModal 
          team={editingTeam} 
          onClose={() => setEditingTeam(null)} 
        />
      )}

      {accessModalTeam && (
        <RegistrationAccessModal
          team={accessModalTeam}
          onClose={() => setAccessModalTeam(null)}
          onUpdated={() => setAccessModalTeam(null)}
        />
      )}
    </div>
  );
}
