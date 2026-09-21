"use client";

import { useState, useEffect } from "react";
import { getPointMatrixSettings, savePointMatrixSettings, recalculateAllResults } from "./actions";

interface PointMatrixSettingsCardProps {
  events: Array<{ id: string; name: string; type?: string; parentId?: string | null }>;
}

export default function PointMatrixSettingsCard({ events }: PointMatrixSettingsCardProps) {
  // Find main state event or fallback to first event
  const mainEvent = events.find(e => !e.parentId) || events[0];
  const [selectedEventId, setSelectedEventId] = useState(mainEvent?.id || "default");

  const defaultIndividual = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
  const defaultGeneral = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };

  const [individual, setIndividual] = useState(defaultIndividual);
  const [general, setGeneral] = useState(defaultGeneral);
  const [recalcOnSave, setRecalcOnSave] = useState(false);

  const [loading, setLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch points whenever selected event changes
  useEffect(() => {
    let isMounted = true;
    const fetchMatrix = async () => {
      setLoading(true);
      setStatus(null);
      const res = await getPointMatrixSettings(selectedEventId);
      if (isMounted) {
        if (res.success && res.data) {
          setIndividual(res.data.individual || defaultIndividual);
          setGeneral(res.data.general || defaultGeneral);
        } else {
          setIndividual(defaultIndividual);
          setGeneral(defaultGeneral);
        }
        setLoading(false);
      }
    };
    fetchMatrix();
    return () => { isMounted = false; };
  }, [selectedEventId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const res = await savePointMatrixSettings({
      eventId: selectedEventId,
      individual,
      general,
      recalculateExisting: recalcOnSave
    });

    if (res.success) {
      setStatus({ type: 'success', message: res.message || "Point matrix settings saved successfully!" });
    } else {
      setStatus({ type: 'error', message: res.error || "Failed to save point matrix settings." });
    }
    setLoading(false);
  };

  const handleRecalculateNow = async () => {
    const selectedName = events.find(e => e.id === selectedEventId)?.name || "All Events";
    if (!confirm(`Are you sure you want to recalculate all results for "${selectedName}" using the current point matrix? This will recompute points based on each candidate/team's Rank and Grade.`)) {
      return;
    }

    setRecalcLoading(true);
    setStatus(null);

    const res = await recalculateAllResults(selectedEventId);
    if (res.success) {
      setStatus({
        type: 'success',
        message: `Successfully recalculated points for ${res.count || 0} existing result(s). Leaderboards and standings are now updated!`
      });
    } else {
      setStatus({ type: 'error', message: res.error || "Failed to recalculate results." });
    }
    setRecalcLoading(false);
  };

  const maxIndivPoints = (individual.rank1 || 0) + (individual.gradeA || 0);
  const maxGenPoints = (general.rank1 || 0) + (general.gradeA || 0);

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: 'var(--spacing-xl)', 
        borderTop: '4px solid #e6007e',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        background: '#ffffff',
        color: '#1a1420'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #a3005c, #e6007e)', 
              color: '#fff', 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              padding: '3px 10px', 
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              Super Admin Settings
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 6px 0', color: '#1a1420' }}>
            🏆 Program Scoring & Points Matrix
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
            Configure official championship points awarded for Ranks (1st, 2nd, 3rd) and Grades (A, B, C). These points determine individual star rankings and institution team leaderboards across the portal.
          </p>
        </div>

        {/* Event Scope Selection */}
        <div style={{ minWidth: '240px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
            Target Event / Zone Scope:
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={loading || recalcLoading}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.88rem',
              fontWeight: 600,
              background: '#f8fafc',
              color: '#0f172a'
            }}
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {!ev.parentId ? `🌐 ${ev.name} (Global Master)` : `📍 ${ev.name}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          fontWeight: 600,
          background: status.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: status.type === 'error' ? '#991b1b' : '#166534',
          border: `1.5px solid ${status.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{status.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          
          {/* Individual Programs Box */}
          <div style={{
            background: '#faf5f8',
            border: '1.5px solid #f3d2e4',
            borderRadius: '14px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a3005c', margin: 0 }}>
                  🏃 Individual Programs
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Single student onstage & offstage competitions</span>
              </div>
              <span style={{ 
                background: '#ffffff', 
                border: '1px solid #f3d2e4', 
                color: '#a3005c', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                padding: '4px 8px', 
                borderRadius: '6px' 
              }}>
                Max: {maxIndivPoints} pts
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>
                  🥇 1st Rank
                </label>
                <input
                  type="number"
                  min="0"
                  value={individual.rank1}
                  onChange={(e) => setIndividual({ ...individual, rank1: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  🥈 2nd Rank
                </label>
                <input
                  type="number"
                  min="0"
                  value={individual.rank2}
                  onChange={(e) => setIndividual({ ...individual, rank2: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', marginBottom: '4px' }}>
                  🥉 3rd Rank
                </label>
                <input
                  type="number"
                  min="0"
                  value={individual.rank3}
                  onChange={(e) => setIndividual({ ...individual, rank3: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                  🅰️ Grade A
                </label>
                <input
                  type="number"
                  min="0"
                  value={individual.gradeA}
                  onChange={(e) => setIndividual({ ...individual, gradeA: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>
                  🅱️ Grade B
                </label>
                <input
                  type="number"
                  min="0"
                  value={individual.gradeB}
                  onChange={(e) => setIndividual({ ...individual, gradeB: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                  🅲 Grade C
                </label>
                <input
                  type="number"
                  min="0"
                  value={individual.gradeC}
                  onChange={(e) => setIndividual({ ...individual, gradeC: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
            </div>
          </div>

          {/* General / Group Programs Box */}
          <div style={{
            background: '#f4fbf7',
            border: '1.5px solid #d1fae5',
            borderRadius: '14px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065f46', margin: 0 }}>
                  👥 General / Group Programs
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Team & group competitions (Quiz, Burdha, Magazine, etc.)</span>
              </div>
              <span style={{ 
                background: '#ffffff', 
                border: '1px solid #d1fae5', 
                color: '#065f46', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                padding: '4px 8px', 
                borderRadius: '6px' 
              }}>
                Max: {maxGenPoints} pts
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>
                  🥇 1st Rank
                </label>
                <input
                  type="number"
                  min="0"
                  value={general.rank1}
                  onChange={(e) => setGeneral({ ...general, rank1: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  🥈 2nd Rank
                </label>
                <input
                  type="number"
                  min="0"
                  value={general.rank2}
                  onChange={(e) => setGeneral({ ...general, rank2: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', marginBottom: '4px' }}>
                  🥉 3rd Rank
                </label>
                <input
                  type="number"
                  min="0"
                  value={general.rank3}
                  onChange={(e) => setGeneral({ ...general, rank3: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                  🅰️ Grade A
                </label>
                <input
                  type="number"
                  min="0"
                  value={general.gradeA}
                  onChange={(e) => setGeneral({ ...general, gradeA: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>
                  🅱️ Grade B
                </label>
                <input
                  type="number"
                  min="0"
                  value={general.gradeB}
                  onChange={(e) => setGeneral({ ...general, gradeB: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                  🅲 Grade C
                </label>
                <input
                  type="number"
                  min="0"
                  value={general.gradeC}
                  onChange={(e) => setGeneral({ ...general, gradeC: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Options & Actions */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px', 
          borderTop: '1px solid #e2e8f0', 
          paddingTop: '16px' 
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: '#475569', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={recalcOnSave}
              onChange={(e) => setRecalcOnSave(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#e6007e' }}
            />
            <span>Auto-recalculate existing scores with new values upon saving</span>
          </label>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleRecalculateNow}
              disabled={loading || recalcLoading}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1.5px solid #cbd5e1',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {recalcLoading ? "⏳ Recalculating..." : "🔄 Recalculate Results Now"}
            </button>

            <button
              type="submit"
              disabled={loading || recalcLoading}
              style={{
                background: 'linear-gradient(135deg, #a3005c, #e6007e)',
                color: '#ffffff',
                border: 'none',
                padding: '9px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(230, 0, 126, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? "💾 Saving..." : "💾 Save Points Matrix"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
