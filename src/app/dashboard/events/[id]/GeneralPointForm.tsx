"use client";

import { useState } from "react";
import { saveGeneralPointMatrix } from "./actions";

export default function GeneralPointForm({ eventId, initialData }: { eventId: string, initialData: any }) {
  const defaultPoints = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };
  const [general, setGeneral] = useState(initialData?.generalPoints ? { ...defaultPoints, ...JSON.parse(initialData.generalPoints) } : defaultPoints);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const result = await saveGeneralPointMatrix(eventId, JSON.stringify(general));
    if (result.success) {
      setStatus({ type: 'success', message: 'General points saved successfully' });
    } else {
      setStatus({ type: 'error', message: 'Failed to save general points' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--spacing-xl)' }}>
      <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>General / Group Program Points (Event Level)</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
        Define the default point values for "General" / Group type programs. These points contribute to overall team championship scoring.
      </p>
      {status && (
        <div style={{ 
          padding: 'var(--spacing-sm)', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: 'var(--spacing-md)',
          backgroundColor: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: status.type === 'error' ? 'var(--error)' : 'var(--success)',
          border: `1px solid ${status.type === 'error' ? 'var(--error)' : 'var(--success)'}`
        }}>
          {status.message}
        </div>
      )}
      
      <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--spacing-sm)' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem' }}>1st Rank</label>
            <input type="number" className="form-input" value={general.rank1} onChange={(e) => setGeneral({...general, rank1: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem' }}>2nd Rank</label>
            <input type="number" className="form-input" value={general.rank2} onChange={(e) => setGeneral({...general, rank2: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem' }}>3rd Rank</label>
            <input type="number" className="form-input" value={general.rank3} onChange={(e) => setGeneral({...general, rank3: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem' }}>A Grade</label>
            <input type="number" className="form-input" value={general.gradeA} onChange={(e) => setGeneral({...general, gradeA: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem' }}>B Grade</label>
            <input type="number" className="form-input" value={general.gradeB} onChange={(e) => setGeneral({...general, gradeB: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem' }}>C Grade</label>
            <input type="number" className="form-input" value={general.gradeC !== undefined ? general.gradeC : 1} onChange={(e) => setGeneral({...general, gradeC: parseInt(e.target.value) || 0})} />
          </div>
        </div>
      </div>
      
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
        {loading ? "Saving General Points..." : "Save General Points"}
      </button>
    </form>
  );
}
