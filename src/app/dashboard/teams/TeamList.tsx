"use client";

import { useState } from "react";
import { deleteTeam } from "./actions";
import EditTeamModal from "./EditTeamModal";

type TeamType = {
  id: string;
  name: string;
  prefixCode: string;
  event: { name: string };
  manager: { username: string } | null;
  leaderName: string | null;
  leaderPhoto: string | null;
  flagColor: string | null;
  isAssignmentsConfirmed: boolean;
  _count: { candidates: number };
  candidates?: { id: string; _count: { programs: number } }[];
};

export default function TeamList({ teams, role = "ADMIN" }: { teams: TeamType[], role?: string }) {
  const [editingTeam, setEditingTeam] = useState<TeamType | null>(null);

  if (teams.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No teams created yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {teams.map((team) => {
        const totalPrograms = team.candidates?.reduce((sum, c) => sum + c._count.programs, 0) || 0;
        return (
        <div key={team.id} style={{ 
          padding: 'var(--spacing-md)', 
          border: '1px solid var(--border-color)', 
          borderLeft: `5px solid ${team.flagColor || 'var(--primary)'}`,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
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
              {team.isAssignmentsConfirmed ? (
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '8px', fontWeight: 700, padding: '4px 8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'inline-block', borderRadius: '4px' }}>
                  ✅ Registration Confirmed & Locked (Chest Numbers Assigned)
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
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexDirection: 'column' }}>
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
                    else alert(`Successfully confirmed ${result.count} candidates and generated sequential chest numbers.`);
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
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && team.isAssignmentsConfirmed && (
                <button 
                  onClick={async (e) => {
                    const reason = prompt(`Unlock registration & assignments for "${team.name}"?\n\nEnter reason for unlocking (e.g., "Add candidate correction", "Replace program assignment"):`, "Permission granted by Zone Admin for correction");
                    if (reason !== null) {
                      const btn = e.currentTarget;
                      btn.disabled = true;
                      btn.innerText = "Unlocking...";
                      const result = await import("./actions").then(m => m.unlockTeamAssignments(team.id));
                      if (!result.success) {
                        alert(result.error);
                        btn.disabled = false;
                        btn.innerText = "🔓 Unlock for Edit";
                      } else {
                        alert(`✅ ${team.name} has been unlocked! The institution can now edit candidates and assignments.`);
                      }
                    }
                  }}
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'rgba(245,158,11,0.15)', color: '#d97706', borderColor: '#d97706', fontWeight: 700 }}
                  title="Unlock registration for this institution so they can make changes"
                >
                  🔓 Unlock for Edit
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

              <a href={`/print/id-cards?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)', textDecoration: 'none' }}>
                🆔 ID Cards
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
    </div>
  );
}
