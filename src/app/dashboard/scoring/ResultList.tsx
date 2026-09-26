"use client";

import { useState } from "react";
import { togglePublishResult, deleteResult, deleteProgramResults, publishProgramResults, unpublishProgramResults } from "./actions";
import EditResultModal from "./EditResultModal";

export default function ResultList({ 
  results, 
  role,
  isCompleted = false,
  completedFestName = "",
  activeEventId = ""
}: { 
  results: any[]; 
  role: string;
  isCompleted?: boolean;
  completedFestName?: string;
  activeEventId?: string;
}) {
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

  // Only allow management if festival is NOT completed, OR if user is SUPER_ADMIN
  const canManage = role === "SUPER_ADMIN" || (!isCompleted && ["ADMIN", "ZONE_ADMIN", "JUDGE"].includes(role));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {isCompleted && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1.5px solid #f87171',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#991b1b'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🔒</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>Fest Concluded & Locked</div>
            <div style={{ fontSize: '0.82rem', color: '#b91c1c' }}>
              The festival for {completedFestName || 'this zone'} has concluded and is marked COMPLETED. Results and mark entries are locked against edits or deletions by Zone Admins. Only Super Admin can modify or reopen.
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
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

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a
            href="/print/offstage-results?status=unpublished"
            target="_blank"
            className="btn"
            style={{
              padding: '0.3rem 0.8rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              backgroundColor: '#fffbeb',
              border: '1.5px solid #f59e0b',
              color: '#b45309',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Print all unpublished off-stage results to announce on Stage 1"
          >
            <span>📢</span> Stage 1 Off-Stage Print
          </a>
        </div>
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
          const hasPublished = group.results.some(r => r.isPublished);

          return (
            <div key={pid} className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: isFullyPublished ? '1.5px solid var(--success)' : '1px solid var(--warning)' }}>
              <div style={{ 
                padding: 'var(--spacing-sm) var(--spacing-md)', 
                backgroundColor: isFullyPublished ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{group.program.name}</span>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      backgroundColor: isFullyPublished ? '#dcfce7' : '#fef3c7',
                      color: isFullyPublished ? '#15803d' : '#92400e',
                      fontWeight: 800
                    }}>
                      {isFullyPublished ? "🟢 PUBLISHED" : "🟡 PENDING REVIEW"}
                    </span>
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {group.program.category?.name || 'General'} • {group.program.type}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                   <a 
                    href={`/print/results/${pid}?status=${isFullyPublished ? 'published' : 'unpublished'}`}
                    target="_blank"
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    title={isFullyPublished ? "Print official notice board result" : "Print announcement sheet for Stage 1"}
                  >
                    🖨️ {isFullyPublished ? "Notice Board" : "Announce Print"}
                  </a>

                  {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && hasPublished && (
                    <button 
                      onClick={() => {
                        if (confirm(`Unpublish results for ${group.program.name} back to Pending status so you can check and make changes?`)) {
                          const resIds = group.results.map(r => r.id);
                          const evId = activeEventId || group.results[0]?.candidate?.team?.eventId || group.results[0]?.team?.eventId;
                          unpublishProgramResults(pid, resIds, evId);
                        }
                      }}
                      className="btn"
                      style={{ 
                        padding: '0.25rem 0.75rem', 
                        fontSize: '0.76rem', 
                        fontWeight: 700, 
                        backgroundColor: '#fffbeb',
                        border: '1.5px solid #f59e0b',
                        color: '#b45309',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Unpublish this program's results to make corrections and re-verify"
                    >
                      ↩️ Unpublish (Check)
                    </button>
                  )}

                  {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && hasPending && (
                    <button 
                      onClick={() => {
                        if (confirm(`Approve physical valuation and publish all results for ${group.program.name}?`)) {
                          const resIds = group.results.map(r => r.id);
                          const evId = activeEventId || group.results[0]?.candidate?.team?.eventId || group.results[0]?.team?.eventId;
                          publishProgramResults(pid, resIds, evId);
                        }
                      }}
                      className="btn btn-primary"
                      style={{ 
                        padding: '0.25rem 0.75rem', 
                        fontSize: '0.78rem', 
                        fontWeight: 800, 
                        backgroundColor: '#16a34a',
                        borderColor: '#15803d',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ✅ Approve & Publish
                    </button>
                  )}

                  {canManage && (
                    <button 
                      onClick={async () => {
                        if (confirm(`Are you sure you want to DELETE ALL results for "${group.program.name}"?\n\nThis will remove all entered marks and places for this program in this zone so you can re-enter cleanly.`)) {
                          const resIds = group.results.map(r => r.id);
                          const evId = activeEventId || group.results[0]?.candidate?.team?.eventId || group.results[0]?.team?.eventId;
                          const res = await deleteProgramResults(pid, resIds, evId);
                          if (!res.success) alert(res.error || "Failed to delete program results");
                        }
                      }}
                      className="btn"
                      style={{ 
                        padding: '0.25rem 0.65rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        backgroundColor: '#fef2f2',
                        border: '1.5px solid #f87171',
                        color: '#b91c1c',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Delete all results for this program if entered by mistake"
                    >
                      🗑️ Delete All
                    </button>
                  )}
                </div>
              </div>

              {/* TABLE COLUMN HEADERS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(220px, 2fr) 130px 110px 100px 90px 110px',
                padding: '6px 16px',
                backgroundColor: 'rgba(0,0,0,0.03)',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                <div>Participant / Institution</div>
                <div style={{ textAlign: 'center' }}>Place / Rank</div>
                <div style={{ textAlign: 'center' }}>Grade</div>
                <div style={{ textAlign: 'center' }}>Total Points</div>
                <div style={{ textAlign: 'center' }}>Marks</div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              <div style={{ padding: '0' }}>
                {group.results.sort((a,b) => (a.rank || 99) - (b.rank || 99)).map((result) => {
                  const isGroupOrGeneral = group.program.type !== "INDIVIDUAL";
                  const participantName = result.candidate ? result.candidate.name : (result.team ? result.team.name : 'Unknown');
                  const participantChest = result.candidate ? result.candidate.chestNumber : (result.team ? result.team.prefixCode : '-');
                  const teamInfo = result.candidate ? result.candidate.team : result.team;
                  const showPhoto = result.candidate?.photo || result.team?.leaderPhoto;

                  return (
                    <div 
                      key={result.id} 
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'minmax(220px, 2fr) 130px 110px 100px 90px 110px',
                        alignItems: 'center',
                        padding: '10px 16px', 
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {/* PARTICIPANT & INSTITUTION */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                        {/* Photo / Avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          {showPhoto ? (
                            <img 
                              src={showPhoto} 
                              alt={participantName} 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${teamInfo?.flagColor || 'var(--border-color)'}` }}
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                              {isGroupOrGeneral ? '👥' : '👤'}
                            </div>
                          )}
                        </div>

                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {participantName}
                            {participantChest && participantChest !== '-' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginLeft: '6px' }}>
                                (#{participantChest})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: teamInfo?.flagColor || '#2563eb', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {teamInfo?.name}
                          </div>
                        </div>
                      </div>

                      {/* PLACE / RANK */}
                      <div style={{ textAlign: 'center' }}>
                        {result.rank === 1 ? (
                          <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', color: '#b45309', fontWeight: 800, fontSize: '0.78rem' }}>
                            🥇 1st Place
                          </span>
                        ) : result.rank === 2 ? (
                          <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #94a3b8', color: '#475569', fontWeight: 800, fontSize: '0.78rem' }}>
                            🥈 2nd Place
                          </span>
                        ) : result.rank === 3 ? (
                          <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', backgroundColor: '#ffedd5', border: '1px solid #f97316', color: '#c2410c', fontWeight: 800, fontSize: '0.78rem' }}>
                            🥉 3rd Place
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>—</span>
                        )}
                      </div>

                      {/* GRADE */}
                      <div style={{ textAlign: 'center' }}>
                        {result.grade === "A" ? (
                          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#15803d', fontWeight: 800, fontSize: '0.78rem' }}>
                            ⭐ Grade A
                          </span>
                        ) : result.grade === "B" ? (
                          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #93c5fd', color: '#1d4ed8', fontWeight: 800, fontSize: '0.78rem' }}>
                            ✨ Grade B
                          </span>
                        ) : result.grade === "C" ? (
                          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fef3c7', border: '1px solid #fde047', color: '#854d0e', fontWeight: 800, fontSize: '0.78rem' }}>
                            Grade C
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>—</span>
                        )}
                      </div>

                      {/* TOTAL POINTS */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'baseline',
                          gap: '3px',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          backgroundColor: '#fdf2f8',
                          border: '1.5px solid #f472b6'
                        }}>
                          <span style={{ fontWeight: 900, color: '#db2777', fontSize: '1rem', fontFamily: 'monospace' }}>
                            {result.points !== undefined && result.points !== null ? result.points : 0}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9d174d' }}>PTS</span>
                        </div>
                      </div>

                      {/* MARKS */}
                      <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                        {result.marks && result.marks > 0 ? (
                          <span>{result.marks}</span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </div>

                      {/* ACTIONS: EDIT & DELETE */}
                      <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {canManage && (
                          <>
                            <button 
                              onClick={() => setEditingResult(result)}
                              style={{ 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                border: '1px solid #bfdbfe', 
                                backgroundColor: '#eff6ff', 
                                color: '#1d4ed8', 
                                cursor: 'pointer', 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                              title="Edit Place, Grade, Points or Marks"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm(`Delete result for ${participantName}?`)) {
                                  const res = await deleteResult(result.id);
                                  if (!res.success) alert(res.error || "Failed to delete");
                                }
                              }}
                              style={{ 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                border: '1px solid #fecaca', 
                                backgroundColor: '#fef2f2', 
                                color: '#b91c1c', 
                                cursor: 'pointer', 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                              title="Delete this result"
                            >
                              🗑️
                            </button>
                          </>
                        )}
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
          isCompleted={isCompleted && role !== 'SUPER_ADMIN'}
        />
      )}
    </div>
  );
}
