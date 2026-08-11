"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { assignJudgesToProgram } from "./actions";

export default function AssignJudgesModal({ program, judges, onClose }: { program: any, judges: any[], onClose: () => void }) {
  // Initialize with currently assigned judges
  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>(
    program.judges?.map((j: any) => j.id) || []
  );
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleJudge = (id: string) => {
    setSelectedJudgeIds(prev => 
      prev.includes(id) ? prev.filter(jId => jId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await assignJudgesToProgram(program.id, selectedJudgeIds);
    if (result.success) {
      onClose();
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 10000, overflowY: 'auto', padding: '20px' }}>
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)', width: '100%', maxWidth: '500px', margin: '40px auto' }}>
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Assign Judges</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
          Select the judges that will evaluate <strong>{program.name}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {judges.length === 0 ? (
              <p style={{ color: 'var(--warning)' }}>No judges available. An Admin must create them first.</p>
            ) : (
              judges.map(judge => (
                <label key={judge.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedJudgeIds.includes(judge.id)}
                    onChange={() => toggleJudge(judge.id)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: 500 }}>{judge.username}</span>
                </label>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? "Saving..." : "Save Assignments"}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
