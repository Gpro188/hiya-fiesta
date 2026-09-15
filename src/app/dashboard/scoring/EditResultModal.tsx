"use client";

import { useState, useMemo } from "react";
import { updateResultMark, deleteResult } from "./actions";

export default function EditResultModal({ result, onClose }: { result: any, onClose: () => void }) {
  const [marks, setMarks] = useState(result.marks !== undefined && result.marks !== null ? result.marks.toString() : "");
  const [rank, setRank] = useState(result.rank?.toString() || "");
  const [grade, setGrade] = useState(result.grade || "");
  const [customPoints, setCustomPoints] = useState<string>(result.points !== undefined && result.points !== null ? result.points.toString() : "");
  const [useCustomPoints, setUseCustomPoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isIndividual = result.program?.type === "INDIVIDUAL";

  const calculatedPoints = useMemo(() => {
    let pointsConfig: any = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
    if (!isIndividual) {
      pointsConfig = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };
    }

    let total = 0;
    if (rank === "1") total += pointsConfig.rank1 || 0;
    else if (rank === "2") total += pointsConfig.rank2 || 0;
    else if (rank === "3") total += pointsConfig.rank3 || 0;

    if (grade === "A") total += pointsConfig.gradeA || 0;
    else if (grade === "B") total += pointsConfig.gradeB || 0;
    else if (grade === "C") total += pointsConfig.gradeC || 0;

    return total;
  }, [rank, grade, isIndividual]);

  const activePoints = useCustomPoints ? (parseInt(customPoints) || 0) : calculatedPoints;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const parsedMarks = marks ? parseFloat(marks) : 0;
    const res = await updateResultMark(
      result.id, 
      parsedMarks,
      rank ? parseInt(rank) : null,
      grade || null,
      useCustomPoints ? (parseInt(customPoints) || 0) : null
    );
    if (res.success) {
      onClose();
    } else {
      alert(res.error || "Failed to update result");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    const participant = result.candidate?.name || result.team?.name || 'this participant';
    if (!confirm(`Are you sure you want to DELETE the result for ${participant}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    const res = await deleteResult(result.id);
    if (res.success) {
      onClose();
    } else {
      alert(res.error || "Failed to delete result");
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{ 
        width: '460px', 
        maxWidth: '95vw',
        padding: '1.8rem', 
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
        position: 'relative' 
      }}>
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '1.4rem',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          &times;
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.25rem' }}>✏️</span>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Edit Result Details</h3>
        </div>

        <div style={{ 
          padding: '10px 14px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '10px', 
          border: '1px solid #e2e8f0', 
          marginBottom: '1.4rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
            {result.candidate?.name || result.team?.name || 'Unknown Participant'}
          </div>
          <div style={{ color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>{result.program?.name}</span>
            <span>•</span>
            <span style={{ fontWeight: 600, color: '#2563eb' }}>{result.candidate?.team?.name || result.team?.name}</span>
            {result.candidate?.chestNumber && (
              <>
                <span>•</span>
                <span>Chest #{result.candidate.chestNumber}</span>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* PLACE / RANK */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              🏅 Place / Rank
            </label>
            <select
              className="form-input"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#0f172a',
                backgroundColor: rank ? '#fffbeb' : '#fff'
              }}
            >
              <option value="">-- No Place --</option>
              <option value="1">🥇 1st Place (Winner)</option>
              <option value="2">🥈 2nd Place (Runner-up)</option>
              <option value="3">🥉 3rd Place (Third)</option>
            </select>
          </div>

          {/* GRADE */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              ⭐ Grade
            </label>
            <select
              className="form-input"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#0f172a',
                backgroundColor: grade ? '#f0fdf4' : '#fff'
              }}
            >
              <option value="">-- No Grade --</option>
              <option value="A">⭐ Grade A</option>
              <option value="B">✨ Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </div>

          {/* TOTAL POINTS PREVIEW */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🏆 Result Total Points
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isIndividual ? 'Individual scale' : 'Group/General scale'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              {!useCustomPoints ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7', fontFamily: 'monospace' }}>
                    {calculatedPoints}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>PTS</span>
                </div>
              ) : (
                <input
                  type="number"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  style={{
                    width: '80px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1.5px solid #0284c7',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => setUseCustomPoints(!useCustomPoints)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.68rem',
                  color: '#0284c7',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  marginTop: '2px'
                }}
              >
                {useCustomPoints ? 'Auto-calculate' : 'Override points'}
              </button>
            </div>
          </div>

          {/* TABULATION TOTAL MARKS (OPTIONAL) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              📝 Marks (Optional Evaluator Total)
            </label>
            <input 
              type="number" 
              step="0.01"
              placeholder="e.g. 85.5 (optional)"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                color: '#0f172a'
              }}
            />
          </div>

          {/* BUTTONS */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={handleDelete} 
              disabled={deleting || loading}
              style={{ 
                padding: '0.65rem 1rem',
                backgroundColor: '#fee2e2',
                border: '1.5px solid #ef4444',
                color: '#b91c1c',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
              title="Delete this result entry"
            >
              {deleting ? 'Deleting...' : '🗑️ Delete'}
            </button>

            <button 
              type="button" 
              onClick={onClose} 
              style={{ 
                flex: 1,
                padding: '0.65rem 1rem',
                backgroundColor: '#f1f5f9',
                border: '1.5px solid #cbd5e1',
                color: '#334155',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button 
              type="submit" 
              disabled={loading || deleting}
              style={{ 
                flex: 1.2,
                padding: '0.65rem 1rem',
                backgroundColor: '#2563eb',
                border: '1.5px solid #1d4ed8',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              {loading ? "Updating..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
