"use client";

import { useState } from "react";
import { togglePublishResult, deleteResult, publishProgramResults } from "./actions";
import EditResultModal from "./EditResultModal";

export default function ResultList({ results, role }: { results: any[], role: string }) {
  const [filter, setFilter] = useState<'all' | 'published' | 'pending'>('all');
  const [editingResult, setEditingResult] = useState<any | null>(null);

  // Group results by program
  const groupedResults: { [key: string]: { program: any, results: any[] } } = {};
  
  results.forEach(res => {
    if (!groupedResults[res.programId]) {
      groupedResults[res.programId] = {
        program: res.program,
        results: []
      };
    }
    groupedResults[res.programId].results.push(res);
  });

  const programIds = Object.keys(groupedResults).filter(pid => {
    const group = groupedResults[pid];
    const hasPublished = group.results.some(r => r.isPublished);
    const hasPending = group.results.some(r => !r.isPublished);
    
    if (filter === 'published') return hasPublished;
    if (filter === 'pending') return hasPending;
    return true;
  });

  if (results.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No marks entered yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
        <button 
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
        >
          All ({results.length})
        </button>
        <button 
          onClick={() => setFilter('pending')}
          className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderColor: filter !== 'pending' ? 'var(--warning)' : undefined }}
        >
          Pending ({results.filter(r => !r.isPublished).length})
        </button>
        <button 
          onClick={() => setFilter('published')}
          className={`btn ${filter === 'published' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderColor: filter !== 'published' ? 'var(--success)' : undefined }}
        >
          Published ({results.filter(r => r.isPublished).length})
        </button>
      </div>

      {programIds.length === 0 ? (
        <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          No {filter} results found.
        </div>
      ) : (
        programIds.map((pid) => {
          const group = groupedResults[pid];
          const isFullyPublished = group.results.every(r => r.isPublished);
          const hasPending = group.results.some(r => !r.isPublished);

          return (
            <div key={pid} className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: isFullyPublished ? '1px solid var(--success)' : '1px solid var(--warning)' }}>
              <div style={{ 
                padding: 'var(--spacing-sm) var(--spacing-md)', 
                backgroundColor: isFullyPublished ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{group.program.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {group.program.category?.name || 'General'} • {group.program.type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                   <a 
                    href={`/print/results/${pid}`}
                    target="_blank"
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                  >
                    🖨️ {isFullyPublished ? "Notice Board" : "Announce Print"}
                  </a>

                  {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && hasPending && (
                    <button 
                      onClick={() => {
                        if (confirm(`Publish all results for ${group.program.name}?`)) {
                          publishProgramResults(pid);
                        }
                      }}
                      className="btn btn-primary"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      🚀 Publish Results
                    </button>
                  )}
                </div>
              </div>

              <div style={{ padding: 'var(--spacing-sm)' }}>
                {group.results.sort((a,b) => (a.rank || 99) - (b.rank || 99)).map((result) => {
                  const isGroupOrGeneral = group.program.type !== "INDIVIDUAL";
                  const participantName = result.candidate ? result.candidate.name : (result.team ? result.team.name : 'Unknown');
                  const participantChest = result.candidate ? result.candidate.chestNumber : (result.team ? result.team.prefixCode : '-');
                  const teamInfo = result.candidate ? result.candidate.team : result.team;
                  const showPhoto = result.candidate?.photo || result.team?.leaderPhoto;

                  return (
                    <div key={result.id} style={{ 
                      padding: 'var(--spacing-xs) var(--spacing-sm)', 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.875rem'
                    }}>
                      <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flex: 1 }}>
                        <div style={{ width: '25px', fontWeight: 'bold', color: result.rank === 1 ? '#FCD34D' : 'inherit' }}>
                          {result.rank ? `${result.rank}.` : '-'}
                        </div>
                        
                        {/* PHOTO DISPLAY */}
                        <div style={{ position: 'relative' }}>
                          {showPhoto ? (
                            <img 
                              src={showPhoto} 
                              alt={participantName} 
                              style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${teamInfo?.flagColor || 'var(--border-color)'}` }}
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                              {isGroupOrGeneral ? '👥' : '👤'}
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>{participantName}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '8px' }}>({participantChest})</span>
                          {isGroupOrGeneral && teamInfo?.leaderName && !result.candidate && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Leader: {teamInfo.leaderName}</div>
                          )}
                        </div>
                        
                        <div style={{ fontSize: '0.75rem', color: teamInfo?.flagColor || 'var(--primary)', fontWeight: 600, width: '80px' }}>
                          {teamInfo?.name}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                         <div style={{ fontWeight: 'bold', width: '35px', textAlign: 'right' }}>{result.marks}</div>
                         <div style={{ width: '15px', textAlign: 'center', color: 'var(--success)', fontWeight: 'bold' }}>{result.grade || '-'}</div>
                         
                         <div style={{ display: 'flex', gap: '4px' }}>
                           {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && (
                             <>
                              <button 
                                onClick={() => setEditingResult(result)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '2px' }}
                              >
                                📝
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm('Delete?')) deleteResult(result.id);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '2px' }}
                              >
                                🗑️
                              </button>
                             </>
                           )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {editingResult && (
        <EditResultModal 
          result={editingResult} 
          onClose={() => setEditingResult(null)} 
        />
      )}
    </div>
  );
}
