"use client";

import { useState } from "react";
import { updateTeam } from "./actions";
import ImageUpload from "../../components/ImageUpload";

export default function EditTeamModal({ team, onClose }: { team: any, onClose: () => void }) {
  const [name, setName] = useState(team.name);
  const [prefixCode, setPrefixCode] = useState(team.prefixCode);
  const [leaderName, setLeaderName] = useState(team.leaderName || "");
  const [leaderPhoto, setLeaderPhoto] = useState(team.leaderPhoto || "");
  const [flagColor, setFlagColor] = useState(team.flagColor || "#8E0033");
  const [managerUsername, setManagerUsername] = useState(team.manager?.username || "");
  const [managerPassword, setManagerPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateTeam(team.id, {
      name,
      prefixCode,
      leaderName,
      leaderPhoto,
      flagColor,
      managerUsername: managerUsername || undefined,
      managerPassword: managerPassword || undefined,
    });
    if (result.success) {
      onClose();
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }}>
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)', width: '100%', maxWidth: '500px' }}>
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Edit Team: {team.name}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">Team Name</label>
              <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Chest Prefix</label>
              <input type="text" className="form-input" value={prefixCode} onChange={(e) => setPrefixCode(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">Leader Name</label>
              <input type="text" className="form-input" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Flag Color</label>
              <input type="color" className="form-input" value={flagColor} onChange={(e) => setFlagColor(e.target.value)} style={{ height: '42px', padding: '2px' }} />
            </div>
          </div>

          <div className="form-group">
            <ImageUpload 
              label="Leader Photo (Optional)" 
              folder="teams" 
              initialUrl={leaderPhoto}
              onUploadComplete={(url) => setLeaderPhoto(url)} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">Manager Username</label>
              <input type="text" className="form-input" value={managerUsername} onChange={(e) => setManagerUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Manager Password</label>
              <input type="password" className="form-input" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} minLength={6} placeholder="Leave blank to keep current" />
            </div>
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
    </div>
  );
}
