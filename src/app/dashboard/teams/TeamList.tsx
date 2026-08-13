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
                <strong>{team._count.candidates}</strong> Approved Candidates • <strong>{team.candidates?.reduce((sum, c) => sum + c._count.programs, 0) || 0}</strong> Total Programs Assigned
              </div>
              {team.leaderName && (
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px' }}>
                  Leader: {team.leaderName}
                </div>
              )}
              {team.isAssignmentsConfirmed ? (
                <div style={{ fontSize: '0.8rem', color: '#A5003A', marginTop: '8px', fontWeight: 700, padding: '4px 8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'inline-block', borderRadius: '4px' }}>
                  🔵 Registration Confirmed & Locked
                </div>
              ) : totalPrograms === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '8px', fontWeight: 700, padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'inline-block', borderRadius: '4px' }}>
                  🔴 Registration Pending (No programs assigned)
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '8px', fontWeight: 700, padding: '4px 8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'inline-block', borderRadius: '4px' }}>
                  🟢 Registration Active
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexDirection: 'column' }}>
            {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && totalPrograms > 0 && !team.isAssignmentsConfirmed && (
              <button 
                onClick={async (e) => {
                  const btn = e.currentTarget;
                  btn.disabled = true;
                  btn.innerText = "Confirming...";
                  const result = await import("./actions").then(m => m.confirmTeamRegistration(team.id));
                  if (!result.success) alert(result.error);
                  else if (result.count === 0) alert("No new candidates to confirm.");
                  else alert(`Successfully confirmed ${result.count} candidates and generated their chest numbers.`);
                  btn.disabled = false;
                  btn.innerText = "Confirm Registration";
                }}
                className="btn btn-primary" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--success)' }}
              >
                Confirm Registration
              </button>
            )}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && team.isAssignmentsConfirmed && (
                <button 
                  onClick={async (e) => {
                    if (confirm("Are you sure you want to unlock this team's assignments so they can make changes?")) {
                      const btn = e.currentTarget;
                      btn.disabled = true;
                      btn.innerText = "Unlocking...";
                      const result = await import("./actions").then(m => m.unlockTeamAssignments(team.id));
                      if (!result.success) {
                        alert(result.error);
                        btn.disabled = false;
                        btn.innerText = "Unlock Edit";
                      }
                    }
                  }}
                  className="btn btn-secondary" 
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--warning)', color: 'black' }}
                >
                  Unlock Edit
                </button>
              )}
              <button 
                onClick={() => setEditingTeam(team)}
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
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
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              Delete
            </button>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-sm)' }}>
                <a href={`/print/id-cards?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', borderColor: 'var(--primary)', color: 'var(--primary)', textDecoration: 'none' }}>
                  🆔 ID Cards
                </a>
                <a href={`/print/institution-report?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', textDecoration: 'none' }}>
                  📑 Candidates Report
                </a>
              </div>
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
