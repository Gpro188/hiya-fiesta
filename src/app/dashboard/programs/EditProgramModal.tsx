"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateProgram } from "./actions";

export default function EditProgramModal({ program, categories, onClose }: { program: any, categories: any[], onClose: () => void }) {
  const [name, setName] = useState(program.name);
  const [programCode, setProgramCode] = useState(program.programCode || "");
  const [type, setType] = useState(program.type);
  const [stageType, setStageType] = useState(program.stageType || "ON_STAGE");
  const [categoryId, setCategoryId] = useState(program.categoryId || "");
  const [candidateLimitPerTeam, setCandidateLimitPerTeam] = useState(program.candidateLimitPerTeam || 1);
  const [duration, setDuration] = useState(program.duration || 10);
  const [description, setDescription] = useState(program.description || "");
  const [evaluationCriteria, setEvaluationCriteria] = useState(program.evaluationCriteria || "");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateProgram(program.id, { 
      programCode,
      name, 
      type, 
      categoryId: categoryId || null,
      candidateLimitPerTeam: parseInt(candidateLimitPerTeam.toString()) || 1,
      duration: parseInt(duration.toString()) || 10,
      description,
      evaluationCriteria,
      stageType,
    });
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
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Edit Program</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">Code</label>
              <input 
                type="text" 
                className="form-input" 
                value={programCode} 
                onChange={(e) => setProgramCode(e.target.value)} 
                placeholder="P101"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Program Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="INDIVIDUAL">INDIVIDUAL</option>
              <option value="GROUP">GROUP</option>
              <option value="GENERAL">GENERAL</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Stage Type</label>
            <select 
              className="form-input" 
              style={{ width: '100%', padding: '8px' }}
              value={stageType}
              onChange={(e) => setStageType(e.target.value)}
              required
            >
              <option value="ON_STAGE">On-Stage (Live Performance)</option>
              <option value="OFF_STAGE">Off-Stage (Written/Submission)</option>
            </select>
          </div>

          {type !== "GENERAL" && (
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">-- Select Category --</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Candidates Per Team Limit</label>
            <input 
              type="number" 
              className="form-input" 
              value={candidateLimitPerTeam} 
              onChange={(e) => setCandidateLimitPerTeam(parseInt(e.target.value))} 
              min="1"
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Total Duration (Minutes)</label>
            <input 
              type="number" 
              className="form-input" 
              value={duration} 
              onChange={(e) => setDuration(parseInt(e.target.value))} 
              min="1"
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (Topics etc.)</label>
            <textarea 
              className="form-input" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Evaluation Criteria</label>
            <textarea 
              className="form-input" 
              value={evaluationCriteria}
              onChange={(e) => setEvaluationCriteria(e.target.value)}
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
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
