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

  // Compute Champions
  const overallSorted = [...scores].sort((a, b) => b.publishedPoints - a.publishedPoints || b.totalPoints - a.totalPoints);
  const fadhilaSorted = [...scores].sort((a, b) => (b.fadhilaPublished || 0) - (a.fadhilaPublished || 0) || (b.fadhilaTotal || 0) - (a.fadhilaTotal || 0));
  const fadheelaSorted = [...scores].sort((a, b) => (b.fadheelaPublished || 0) - (a.fadheelaPublished || 0) || (b.fadheelaTotal || 0) - (a.fadheelaTotal || 0));
  
  const zonesSorted = [...zoneScores].sort((a, b) => b.publishedPoints - a.publishedPoints || b.totalPoints - a.totalPoints);
  const fadhilaZonesSorted = [...zoneScores].sort((a, b) => (b.fadhilaPublished || 0) - (a.fadhilaPublished || 0) || (b.fadhilaTotal || 0) - (a.fadhilaTotal || 0));
  const fadheelaZonesSorted = [...zoneScores].sort((a, b) => (b.fadheelaPublished || 0) - (a.fadheelaPublished || 0) || (b.fadheelaTotal || 0) - (a.fadheelaTotal || 0));

  const overallLeader = overallSorted[0];
  const fadhilaChampion = fadhilaSorted[0];
  const fadheelaChampion = fadheelaSorted[0];
  const topZone = zonesSorted[0];

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
          🏆 Standings & Champions
        </h3>
        {isStateFest && (
          <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
            State Fest Mode
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.3 }}>
        Compare <strong style={{ color: 'var(--success)' }}>Live</strong> (public) vs <strong style={{ color: 'var(--warning)' }}>Draft</strong> (projected) standings.
      </p>

      {/* Category Champions Hero Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isStateFest ? '1fr 1fr' : '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
        {/* Fadhila Champion Card */}
        <div style={{
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '8px',
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🌸</span> Fadhila Top Inst.
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fadhilaChampion?.name || 'Pending'}>
            {fadhilaChampion ? fadhilaChampion.name : 'No Results Yet'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '1px' }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{fadhilaChampion?.fadhilaPublished || 0} pts</span> live ({fadhilaChampion?.fadhilaTotal || 0} draft)
          </div>
        </div>

        {/* Fadheela Champion Card */}
        <div style={{
          backgroundColor: 'rgba(244, 114, 182, 0.08)',
          border: '1px solid rgba(244, 114, 182, 0.25)',
          borderRadius: '8px',
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🌺</span> Fadheela Top Inst.
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fadheelaChampion?.name || 'Pending'}>
            {fadheelaChampion ? fadheelaChampion.name : 'No Results Yet'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '1px' }}>
            <span style={{ color: '#f472b6', fontWeight: 700 }}>{fadheelaChampion?.fadheelaPublished || 0} pts</span> live ({fadheelaChampion?.fadheelaTotal || 0} draft)
          </div>
        </div>

        {/* Overall Leader */}
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '8px',
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>👑</span> Overall Leader
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={overallLeader?.name || 'Pending'}>
            {overallLeader ? overallLeader.name : 'No Results Yet'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '1px' }}>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>{overallLeader?.publishedPoints || 0} pts</span> live ({overallLeader?.totalPoints || 0} draft)
          </div>
        </div>

        {/* State Top Zone (if State Fest) */}
        {isStateFest && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '8px 10px',
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🌍</span> State Top Zone
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={topZone?.name || 'Pending'}>
              {topZone ? topZone.name : 'No Results Yet'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '1px' }}>
              <span style={{ color: '#34d399', fontWeight: 700 }}>{topZone?.publishedPoints || 0} pts</span> live ({topZone?.totalPoints || 0} draft)
            </div>
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
          Overall
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
          🌸 Fadhila
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
          🌺 Fadheela
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
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.82rem', width: '22px', display: 'inline-block' }}>{medal}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                        {item.name}
                      </span>
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
