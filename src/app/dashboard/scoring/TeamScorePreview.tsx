"use client";

import { useState } from "react";

export type TeamScore = {
  id: string;
  name: string;
  flagColor: string | null;
  zoneName?: string | null;
  publishedPoints: number;
  totalPoints: number;
  fadhilaPublished?: number;
  fadhilaTotal?: number;
  fadheelaPublished?: number;
  fadheelaTotal?: number;
};

export type ZoneScore = {
  id: string;
  name: string;
  code: string;
  publishedPoints: number;
  totalPoints: number;
  fadhilaPublished?: number;
  fadhilaTotal?: number;
  fadheelaPublished?: number;
  fadheelaTotal?: number;
};

export default function TeamScorePreview({ 
  scores, 
  zoneScores = [], 
  isStateFest = false 
}: { 
  scores: TeamScore[]; 
  zoneScores?: ZoneScore[]; 
  isStateFest?: boolean;
}) {
  const [viewArea, setViewArea] = useState<'OVERALL' | 'FADHILA' | 'FADHEELA' | 'ZONES'>('OVERALL');

  // Compute Overall Standings (ALL Programs: Category Individual + Group + General)
  const overallSorted = [...scores].sort((a, b) => b.publishedPoints - a.publishedPoints || b.totalPoints - a.totalPoints);
  
  // Compute Category Standings (INDIVIDUAL Programs ONLY)
  const fadhilaSorted = [...scores].sort((a, b) => (b.fadhilaPublished || 0) - (a.fadhilaPublished || 0) || (b.fadhilaTotal || 0) - (a.fadhilaTotal || 0));
  const fadheelaSorted = [...scores].sort((a, b) => (b.fadheelaPublished || 0) - (a.fadheelaPublished || 0) || (b.fadheelaTotal || 0) - (a.fadheelaTotal || 0));
  
  // Compute Zone Standings
  const zonesSorted = [...zoneScores].sort((a, b) => b.publishedPoints - a.publishedPoints || b.totalPoints - a.totalPoints);
  const fadhilaZonesSorted = [...zoneScores].sort((a, b) => (b.fadhilaPublished || 0) - (a.fadhilaPublished || 0) || (b.fadhilaTotal || 0) - (a.fadhilaTotal || 0));
  const fadheelaZonesSorted = [...zoneScores].sort((a, b) => (b.fadheelaPublished || 0) - (a.fadheelaPublished || 0) || (b.fadheelaTotal || 0) - (a.fadheelaTotal || 0));

  // Champions & Runner-Ups
  const overallChampion = overallSorted[0];
  const overallRunnerUp = overallSorted[1];
  const overallSecondRunnerUp = overallSorted[2];

  const fadhilaChampion = fadhilaSorted[0];
  const fadhilaRunnerUp = fadhilaSorted[1];

  const fadheelaChampion = fadheelaSorted[0];
  const fadheelaRunnerUp = fadheelaSorted[1];

  const topZone = zonesSorted[0];
  const runnerUpZone = zonesSorted[1];

  // Active list based on viewArea
  const currentItems = (() => {
    if (viewArea === 'FADHILA') {
      return fadhilaSorted.map(t => ({
        id: t.id,
        name: t.name,
        subTitle: t.zoneName,
        flagColor: t.flagColor || '#38bdf8',
        publishedPoints: t.fadhilaPublished || 0,
        totalPoints: t.fadhilaTotal || 0,
      }));
    }
    if (viewArea === 'FADHEELA') {
      return fadheelaSorted.map(t => ({
        id: t.id,
        name: t.name,
        subTitle: t.zoneName,
        flagColor: t.flagColor || '#f472b6',
        publishedPoints: t.fadheelaPublished || 0,
        totalPoints: t.fadheelaTotal || 0,
      }));
    }
    if (viewArea === 'ZONES') {
      return zonesSorted.map(z => ({
        id: z.id,
        name: z.name,
        subTitle: `Zone Code: ${z.code}`,
        flagColor: '#10b981',
        publishedPoints: z.publishedPoints,
        totalPoints: z.totalPoints,
      }));
    }
    return overallSorted.map(t => ({
      id: t.id,
      name: t.name,
      subTitle: t.zoneName,
      flagColor: t.flagColor || 'var(--primary)',
      publishedPoints: t.publishedPoints,
      totalPoints: t.totalPoints,
    }));
  })();

  const maxPts = Math.max(...currentItems.map(i => i.totalPoints), 1);

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', height: 'fit-content' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
          🏆 Champions & Standings Hub
        </h3>
        {isStateFest && (
          <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
            State Fest Mode
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.3 }}>
        Category Champions are calculated <strong style={{ color: '#38bdf8' }}>strictly by Individual Programs</strong>. Overall Standings include <strong style={{ color: 'var(--warning)' }}>Total Points (Category + General)</strong>.
      </p>

      {/* Category Champions & Runner-Ups Hero Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isStateFest ? '1fr 1fr' : '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        
        {/* 1. Overall Total Champions & Runner-Up */}
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '10px',
          padding: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>👑</span> Overall Standings
            </div>
            <span style={{ fontSize: '0.62rem', color: '#9ca3af', backgroundColor: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px' }}>Total Pts</span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '4px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {overallChampion?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.64rem', color: '#fbbf24', fontWeight: 600 }}>CHAMPION</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#fbbf24' }}>{overallChampion?.publishedPoints || 0} pts</div>
              <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{overallChampion?.totalPoints || 0} draft</div>
            </div>
          </div>

          {/* Runner Up */}
          {overallRunnerUp && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', marginTop: '4px' }}>
              <div style={{ minWidth: 0, paddingRight: '4px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🥈 {overallRunnerUp.name}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 600 }}>RUNNER-UP</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e5e7eb' }}>{overallRunnerUp.publishedPoints} pts</div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Fadhila Category Champions & Runner-Up */}
        <div style={{
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '10px',
          padding: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🌸</span> Fadhila Category
            </div>
            <span style={{ fontSize: '0.62rem', color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.12)', padding: '1px 5px', borderRadius: '3px' }}>Indiv Only</span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '4px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {fadhilaChampion?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.64rem', color: '#38bdf8', fontWeight: 600 }}>CHAMPION</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#38bdf8' }}>{fadhilaChampion?.fadhilaPublished || 0} pts</div>
              <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{fadhilaChampion?.fadhilaTotal || 0} draft</div>
            </div>
          </div>

          {/* Runner Up */}
          {fadhilaRunnerUp && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', marginTop: '4px' }}>
              <div style={{ minWidth: 0, paddingRight: '4px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🥈 {fadhilaRunnerUp.name}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 600 }}>RUNNER-UP</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e5e7eb' }}>{fadhilaRunnerUp.fadhilaPublished || 0} pts</div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Fadheela Category Champions & Runner-Up */}
        <div style={{
          backgroundColor: 'rgba(244, 114, 182, 0.08)',
          border: '1px solid rgba(244, 114, 182, 0.3)',
          borderRadius: '10px',
          padding: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🌺</span> Fadheela Category
            </div>
            <span style={{ fontSize: '0.62rem', color: '#f472b6', backgroundColor: 'rgba(244,114,182,0.12)', padding: '1px 5px', borderRadius: '3px' }}>Indiv Only</span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '4px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {fadheelaChampion?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.64rem', color: '#f472b6', fontWeight: 600 }}>CHAMPION</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f472b6' }}>{fadheelaChampion?.fadheelaPublished || 0} pts</div>
              <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{fadheelaChampion?.fadheelaTotal || 0} draft</div>
            </div>
          </div>

          {/* Runner Up */}
          {fadheelaRunnerUp && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', marginTop: '4px' }}>
              <div style={{ minWidth: 0, paddingRight: '4px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🥈 {fadheelaRunnerUp.name}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 600 }}>RUNNER-UP</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e5e7eb' }}>{fadheelaRunnerUp.fadheelaPublished || 0} pts</div>
              </div>
            </div>
          )}
        </div>

        {/* 4. State Top Zones & Runner-Up (if State Fest) */}
        {isStateFest && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🌍</span> State Top Zones
              </div>
              <span style={{ fontSize: '0.62rem', color: '#34d399', backgroundColor: 'rgba(16,185,129,0.12)', padding: '1px 5px', borderRadius: '3px' }}>Regional</span>
            </div>

            {/* Champion Zone */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
              <div style={{ minWidth: 0, paddingRight: '4px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🥇 {topZone?.name || 'Tallying...'}
                </div>
                <div style={{ fontSize: '0.64rem', color: '#34d399', fontWeight: 600 }}>CHAMPION ZONE</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#34d399' }}>{topZone?.publishedPoints || 0} pts</div>
              </div>
            </div>

            {/* Runner Up Zone */}
            {runnerUpZone && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', marginTop: '4px' }}>
                <div style={{ minWidth: 0, paddingRight: '4px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    🥈 {runnerUpZone.name}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 600 }}>RUNNER-UP ZONE</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e5e7eb' }}>{runnerUpZone.publishedPoints} pts</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Area Type Selector Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        marginBottom: '10px',
        backgroundColor: 'rgba(0,0,0,0.25)',
        padding: '3px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <button
          type="button"
          onClick={() => setViewArea('OVERALL')}
          style={{
            flex: 1,
            padding: '5px 2px',
            fontSize: '0.74rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: viewArea === 'OVERALL' ? 'var(--primary)' : 'transparent',
            color: viewArea === 'OVERALL' ? '#fff' : '#9ca3af',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Overall (Total)
        </button>
        <button
          type="button"
          onClick={() => setViewArea('FADHILA')}
          style={{
            flex: 1,
            padding: '5px 2px',
            fontSize: '0.74rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: viewArea === 'FADHILA' ? '#0284c7' : 'transparent',
            color: viewArea === 'FADHILA' ? '#fff' : '#9ca3af',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          🌸 Fadhila (Indiv)
        </button>
        <button
          type="button"
          onClick={() => setViewArea('FADHEELA')}
          style={{
            flex: 1,
            padding: '5px 2px',
            fontSize: '0.74rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: viewArea === 'FADHEELA' ? '#db2777' : 'transparent',
            color: viewArea === 'FADHEELA' ? '#fff' : '#9ca3af',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          🌺 Fadheela (Indiv)
        </button>
        {(isStateFest || zoneScores.length > 0) && (
          <button
            type="button"
            onClick={() => setViewArea('ZONES')}
            style={{
              flex: 1,
              padding: '5px 2px',
              fontSize: '0.74rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewArea === 'ZONES' ? '#059669' : 'transparent',
              color: viewArea === 'ZONES' ? '#fff' : '#9ca3af',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🌍 Zones
          </button>
        )}
      </div>

      {/* Standings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '440px', overflowY: 'auto', paddingRight: '4px' }}>
        {currentItems.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
            No standings available for this view.
          </div>
        ) : (
          currentItems.map((item, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const titleBadge = index === 0 ? 'CHAMPION' : index === 1 ? 'RUNNER-UP' : index === 2 ? '2ND RUNNER-UP' : null;
            return (
              <div 
                key={item.id} 
                style={{ 
                  padding: '7px 10px', 
                  backgroundColor: 'rgba(255,255,255,0.02)', 
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `4px solid ${item.flagColor}`,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ minWidth: 0, paddingRight: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', width: '22px', display: 'inline-block' }}>{medal}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                        {item.name}
                      </span>
                      {titleBadge && (
                        <span style={{ 
                          fontSize: '0.62rem', 
                          fontWeight: 800, 
                          color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#b45309',
                          backgroundColor: index === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          letterSpacing: '0.5px'
                        }}>
                          {titleBadge}
                        </span>
                      )}
                    </div>
                    {item.subTitle && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '26px' }}>
                        {item.subTitle}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {item.totalPoints} <span style={{ fontSize: '0.66rem', color: 'var(--warning)', fontWeight: 600 }}>Draft</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--success)', fontWeight: 700 }}>
                      {item.publishedPoints} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Live</span>
                    </div>
                  </div>
                </div>

                {/* Dual Progress Bar */}
                <div style={{ 
                  width: '100%', 
                  height: '4px', 
                  backgroundColor: 'rgba(255,255,255,0.08)', 
                  marginTop: '5px', 
                  borderRadius: '2px', 
                  overflow: 'hidden', 
                  display: 'flex' 
                }}>
                  <div style={{ 
                    width: `${(item.publishedPoints / maxPts) * 100}%`, 
                    backgroundColor: 'var(--success)', 
                    height: '100%',
                    transition: 'width 0.3s ease',
                  }}></div>
                  <div style={{ 
                    width: `${((item.totalPoints - item.publishedPoints) / maxPts) * 100}%`, 
                    backgroundColor: 'var(--warning)', 
                    opacity: 0.6,
                    height: '100%',
                    transition: 'width 0.3s ease',
                  }}></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
