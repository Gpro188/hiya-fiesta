"use client";

import { useState, useEffect } from "react";
import { savePointMatrix } from "./actions";

export default function PointMatrixForm({ eventId, categories }: { eventId: string, categories: any[] }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [maxPrograms, setMaxPrograms] = useState(3);
  
  const defaultIndividualPoints = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
  const defaultGroupPoints = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };
  
  const [individual, setIndividual] = useState(defaultIndividualPoints);
  const [group, setGroup] = useState(defaultGroupPoints);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  // Load points when category changes
  useEffect(() => {
    if (!selectedCategoryId) return;
    
    const category = categories.find(c => c.id === selectedCategoryId);
    const matrix = category?.pointMatrix;
    
    if (matrix) {
      setMaxPrograms(matrix.maxIndividualPrograms);
      setIndividual(matrix.individualPoints ? { ...defaultIndividualPoints, ...JSON.parse(matrix.individualPoints) } : defaultIndividualPoints);
      setGroup(matrix.groupPoints ? { ...defaultGroupPoints, ...JSON.parse(matrix.groupPoints) } : defaultGroupPoints);
    } else {
      setMaxPrograms(3);
      setIndividual(defaultIndividualPoints);
      setGroup(defaultGroupPoints);
    }
  }, [selectedCategoryId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      setStatus({ type: 'error', message: 'Please select a category first' });
      return;
    }

    setLoading(true);
    setStatus(null);
    
    const result = await savePointMatrix(selectedCategoryId, eventId, {
      maxIndividualPrograms: parseInt(maxPrograms.toString()),
      individualPoints: JSON.stringify(individual),
      groupPoints: JSON.stringify(group),
    });
    
    if (result.success) {
      setStatus({ type: 'success', message: 'Settings saved successfully' });
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to save settings' });
    }
    setLoading(false);
  };

  const renderPointInputs = (title: string, state: any, setState: any) => (
    <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
      <h4 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--secondary)' }}>{title} Points</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--spacing-sm)' }}>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.8rem' }}>1st Rank</label>
          <input type="number" className="form-input" value={state.rank1} onChange={(e) => setState({...state, rank1: parseInt(e.target.value) || 0})} />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.8rem' }}>2nd Rank</label>
          <input type="number" className="form-input" value={state.rank2} onChange={(e) => setState({...state, rank2: parseInt(e.target.value) || 0})} />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.8rem' }}>3rd Rank</label>
          <input type="number" className="form-input" value={state.rank3} onChange={(e) => setState({...state, rank3: parseInt(e.target.value) || 0})} />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.8rem' }}>A Grade</label>
          <input type="number" className="form-input" value={state.gradeA} onChange={(e) => setState({...state, gradeA: parseInt(e.target.value) || 0})} />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.8rem' }}>B Grade</label>
          <input type="number" className="form-input" value={state.gradeB} onChange={(e) => setState({...state, gradeB: parseInt(e.target.value) || 0})} />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.8rem' }}>C Grade</label>
          <input type="number" className="form-input" value={state.gradeC !== undefined ? state.gradeC : 1} onChange={(e) => setState({...state, gradeC: parseInt(e.target.value) || 0})} />
        </div>
      </div>
    </div>
  );

  if (categories.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Add at least one category above to manage its specific points.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
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

      <div className="form-group">
        <label className="form-label">Select Category to Manage (Individual/Group)</label>
        <select 
          className="form-input" 
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          required
        >
          <option value="">-- Select Category --</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <span className="field-helper">Choose a category to configure its specific point scheme for individual and group programs.</span>
      </div>

      {selectedCategoryId && (
        <>
          <div className="form-group" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <label className="form-label">Max Individual Programs Limit (per Candidate)</label>
            <input 
              type="number" 
              className="form-input" 
              value={maxPrograms}
              onChange={(e) => setMaxPrograms(parseInt(e.target.value) || 0)}
              min={1}
              style={{ maxWidth: '200px' }}
            />
            <span className="field-helper">Maximum number of individual programs a single candidate can enter in this category.</span>
          </div>

          <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Scoring Matrix for Selected Category</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
            Set how many points each rank and grade awards. These values determine team championship standings.
          </p>
          {renderPointInputs("Individual", individual, setIndividual)}
          {renderPointInputs("Group", group, setGroup)}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }} disabled={loading}>
            {loading ? "Saving Category Points..." : "Save Category Points"}
          </button>
        </>
      )}
    </form>
  );
}
