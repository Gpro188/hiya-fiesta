"use client";

import { useState } from "react";
import { deleteTeam } from "./actions";
import EditTeamModal from "./EditTeamModal";
import RegistrationAccessModal from "./RegistrationAccessModal";

type TeamType = {
  id: string;
  name: string;
  prefixCode: string;
  event: { 
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
  manager: { username: string } | null;
  leaderName: string | null;
  leaderPhoto: string | null;
  flagColor: string | null;
  isAssignmentsConfirmed: boolean;
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

  if (teams.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No teams created yet.</div>;
  }

  const now = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {teams.map((team) => {
        const totalPrograms = team.candidates?.reduce((sum, c) => sum + c._count.programs, 0) || 0;

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
        const isOnStageOpen = team.onStageUnlocked || (!team.isAssignmentsConfirmed && !isOnDeadlinePassed);

        return (
        <div key={team.id} style={{ 
          padding: 'var(--spacing-md)', 
          border: '1px solid var(--border-color)', 
          borderLeft: `5px solid ${team.flagColor || 'var(--primary)'}`,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1, minWidth: '300px' }}>
            {team.leaderPhoto && (
              <img 
                src={team.leaderPhoto} 
                alt={team.leaderName || "Leader"} 
                style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
              />
            )}
            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                {team.name} <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>Prefix: {team.prefixCode}</span>
                {team.isAssignmentsConfirmed && (
                  <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: 'var(--success)', color: 'white', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 'bold' }}>LOCKED</span>
                )}
              </h4>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Event: {team.event.name} • Manager: {team.manager?.username || 'None'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <strong>{team._count.candidates}</strong> Registered Candidates • <strong>{totalPrograms}</strong> Programs Assigned
              </div>
              {team.leaderName && (
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px' }}>
                  Leader: {team.leaderName}
                </div>
              )}

              {/* Off-Stage and On-Stage Status Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '3px 8px', 
                  borderRadius: '4px', 
                  fontWeight: 600,
                  backgroundColor: team.offStageUnlocked ? 'rgba(16, 185, 129, 0.15)' : isOffStageOpen ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: team.offStageUnlocked ? '#10b981' : isOffStageOpen ? '#60a5fa' : '#ef4444',
                  border: `1px solid ${team.offStageUnlocked ? '#10b981' : isOffStageOpen ? 'rgba(96, 165, 250, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  🎨 Off-Stage: {team.offStageUnlocked ? '⚡ Zone Override (Open)' : isOffStageOpen ? '🟢 Open' : '🔒 Closed'}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '3px 8px', 
                  borderRadius: '4px', 
                  fontWeight: 600,
                  backgroundColor: team.onStageUnlocked ? 'rgba(16, 185, 129, 0.15)' : isOnStageOpen ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: team.onStageUnlocked ? '#10b981' : isOnStageOpen ? '#60a5fa' : '#ef4444',
                  border: `1px solid ${team.onStageUnlocked ? '#10b981' : isOnStageOpen ? 'rgba(96, 165, 250, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  🎭 On-Stage: {team.onStageUnlocked ? '⚡ Zone Override (Open)' : isOnStageOpen ? '🟢 Open' : '🔒 Closed'}
                </span>
              </div>

              {team.isAssignmentsConfirmed ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, padding: '4px 8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px' }}>
                    ✅ Registration Confirmed & Locked (Chest Numbers Assigned)
                  </div>
                  {team.magazineCode && (
                    <div style={{ fontSize: '0.8rem', color: '#9333ea', fontWeight: 800, padding: '4px 8px', backgroundColor: 'rgba(147, 51, 234, 0.12)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '4px' }}>
                      📖 Magazine Code: <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{team.magazineCode}</span>
                    </div>
                  )}
                </div>
              ) : totalPrograms === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '8px', fontWeight: 700, padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'inline-block', borderRadius: '4px' }}>
                  🔴 Registration Pending (No programs assigned)
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '8px', fontWeight: 700, padding: '4px 8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'inline-block', borderRadius: '4px' }}>
                  🟡 Ready for Zone Approval & Chest Numbers
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <a 
                href={`/print/assignments?teamId=${team.id}`} 
                target="_blank" 
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}
              >
                Review Assignments
              </a>
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && totalPrograms > 0 && !team.isAssignmentsConfirmed && (
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerText = "Approving...";
                    const result = await import("./actions").then(m => m.confirmTeamRegistration(team.id));
                    if (!result.success) alert(result.error);
                    else if (result.count === 0) alert("No new candidates to confirm.");
                    else alert(`Successfully confirmed ${result.count} candidates and assigned Magazine Code: ${result.magazineCode || 'Assigned'}.`);
                    btn.disabled = false;
                    btn.innerText = "Approve & Generate Chest Nos";
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'var(--success)' }}
                >
                  Approve & Generate Chest Nos
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Dedicated Stage Unlock / Access Control for Zone Admins & Admins */}
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && (
                <button 
                  onClick={() => setAccessModalTeam(team)}
                  className="btn btn-secondary" 
                  style={{ 
                    padding: '0.25rem 0.75rem', 
                    fontSize: '0.8rem', 
                    backgroundColor: (team.offStageUnlocked || team.onStageUnlocked || team.registrationUnlocked) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(142, 0, 51, 0.15)', 
                    color: (team.offStageUnlocked || team.onStageUnlocked || team.registrationUnlocked) ? '#10b981' : 'var(--primary)', 
                    borderColor: (team.offStageUnlocked || team.onStageUnlocked || team.registrationUnlocked) ? '#10b981' : 'var(--primary)', 
                    fontWeight: 700 
                  }}
                  title="Open Off-Stage, On-Stage, Both, or Lock registration for this institution"
                >
                  {(team.offStageUnlocked || team.onStageUnlocked || team.registrationUnlocked) ? "🔓 Registration Access (Unlocked)" : "⚡ Unlock Registration"}
                </button>
              )}

              {/* Edit and Delete are only available for State Super Admins / Admins, NOT Zone Admins */}
              {["ADMIN", "SUPER_ADMIN"].includes(role) && (
                <>
                  <button 
                    onClick={() => setEditingTeam(team)}
                    className="btn btn-secondary" 
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
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
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    Delete
                  </button>
                </>
              )}

              <a href={`/print/id-cards?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderColor: '#10b981', color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                🪪 Chest Slips & ID Cards
              </a>
              <a href={`/print/institution-report?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                📑 Candidates Report
              </a>
            </div>
          </div>
        </div>
        );
      })}

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
