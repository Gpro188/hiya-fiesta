"use client";

import { useState } from "react";
import { promoteToState } from "./actions";

export default function PromotionsClient({ zoneEvents, masterPrograms, isZoneAdmin, stateConfirmEndDate }: { zoneEvents: any[], masterPrograms: any[], isZoneAdmin: boolean, stateConfirmEndDate: Date | null | undefined }) {
  const [loading, setLoading] = useState(false);

  const isLocked = isZoneAdmin && stateConfirmEndDate && new Date() > new Date(stateConfirmEndDate);

  const handlePromote = async (resultId: string, masterProgramId: string) => {
    setLoading(true);
    const res = await promoteToState(resultId, masterProgramId);
    if (!res.success) {
      alert("Failed to promote: " + res.error);
    } else {
      window.location.reload();
    }
    setLoading(false);
  };

  return (
    <div>
      {isZoneAdmin && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)', backgroundColor: isLocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
          <h3 style={{ margin: 0, color: isLocked ? 'var(--error)' : 'var(--success)' }}>
            {isLocked ? "🔒 State Advancements Locked" : "🔓 State Advancements Open"}
          </h3>
          <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isLocked 
              ? "The deadline to confirm advancements has passed. Please contact the Fest Office to request changes." 
              : `You can modify the state promotion list until ${stateConfirmEndDate ? new Date(stateConfirmEndDate).toLocaleString() : 'the deadline'}.`}
          </p>
        </div>
      )}

      {zoneEvents.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No zones found.</p>
      ) : (
        zoneEvents.map(event => (
          <div key={event.id} className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>{event.name}</h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '8px' }}>Program</th>
                    <th>Published Results</th>
                    <th>Promoted to State</th>
                    <th style={{ textAlign: 'right', paddingRight: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {event.programs.map((program: any) => {
                    const topResults = program.results || [];
                    if (topResults.length === 0) return null;

                    const matchKey = `${program.name}-${program.programCode || ''}`.toUpperCase();
                    const masterProg = masterPrograms.find((mp: any) => `${mp.name}-${mp.programCode || ''}`.toUpperCase() === matchKey);
                    
                    if (!masterProg) return null;

                    // Check who from this zone is assigned to this master program
                    const promotedCandidateId = masterProg.assignments.find((a: any) => a.candidate.teamId.startsWith(event.id) || topResults.some((r: any) => r.candidateId === a.candidateId))?.candidateId;

                    return (
                      <tr key={program.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ fontWeight: 600 }}>{program.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{program.stageType}</div>
                        </td>
                        <td>
                          {topResults.map((r: any) => (
                            <div key={r.id} style={{ 
                              color: promotedCandidateId === r.candidateId ? 'var(--success)' : 'var(--text-primary)',
                              fontWeight: promotedCandidateId === r.candidateId ? 700 : 400,
                              marginBottom: '4px'
                            }}>
                              Rank {r.rank}: {r.candidate?.name || r.team?.name}
                            </div>
                          ))}
                        </td>
                        <td>
                          {promotedCandidateId ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                              {topResults.find((r: any) => r.candidateId === promotedCandidateId)?.candidate?.name || 'Assigned'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--warning)' }}>Pending...</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                            {topResults.map((r: any) => (
                              <button 
                                key={r.id}
                                disabled={Boolean(loading || (isLocked && !(!isZoneAdmin)))}
                                onClick={() => handlePromote(r.id, masterProg.id)}
                                className={`btn ${promotedCandidateId === r.candidateId ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: (isLocked && isZoneAdmin) ? 0.5 : 1 }}
                              >
                                {promotedCandidateId === r.candidateId ? 'Selected' : `Promote Rank ${r.rank}`}
                              </button>
                            ))}
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
