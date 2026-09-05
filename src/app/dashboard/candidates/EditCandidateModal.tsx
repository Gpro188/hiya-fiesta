"use client";

import { useState } from "react";
import { updateCandidate } from "./actions";
import ImageUpload from "../../components/ImageUpload";

export default function EditCandidateModal({ candidate, categories, role, onClose }: { candidate: any, categories: any[], role: string, onClose: () => void }) {
  const [name, setName] = useState(candidate.name);
  const [categoryId, setCategoryId] = useState(candidate.categoryId);
  const [photo, setPhoto] = useState(candidate.photo || "");
  const [chestNumber, setChestNumber] = useState(candidate.chestNumber || "");
  const [isApproved, setIsApproved] = useState(candidate.isApproved);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateCandidate(candidate.id, { 
      name, 
      categoryId, 
      photo, 
      chestNumber: chestNumber || null,
      isApproved 
    });
    if (result.success) {
      onClose();
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset this candidate to Pending? This will clear their chest number.")) {
      setLoading(true);
      const result = await updateCandidate(candidate.id, { 
        name, 
        categoryId, 
        photo, 
        chestNumber: null,
        isApproved: false 
      });
      if (result.success) {
        onClose();
      } else {
        alert(result.error);
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Edit Candidate</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Candidate Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select 
              className="form-input" 
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {(candidate.isApproved || role === "ADMIN") && (
            <div className="form-group">
              <label className="form-label">Chest Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={chestNumber} 
                onChange={(e) => setChestNumber(e.target.value)} 
                placeholder="Auto-generated if empty"
              />
            </div>
          )}

          <ImageUpload 
            label="Candidate Photo" 
            folder="candidates" 
            initialUrl={photo}
            maxSizeKb={500}
            onUploadComplete={(url) => setPhoto(url)} 
          />

          {candidate.isApproved && (
            <button 
              type="button" 
              onClick={handleReset} 
              className="btn btn-secondary" 
              style={{ width: '100%', marginBottom: 'var(--spacing-md)', color: 'var(--warning)', borderColor: 'var(--warning)' }}
              disabled={loading}
            >
              Reset to Pending (Clear Chest No)
            </button>
          )}

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
    </div>
  );
}
