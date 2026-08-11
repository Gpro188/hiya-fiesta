"use client";

import { useState } from "react";
import { editUser, deleteUser } from "./actions";

export default function UserActions({ userId, username }: { userId: string, username: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const res = await editUser(userId, newUsername, newPassword);
    
    if (res.success) {
      setSuccess(true);
      setNewPassword("");
      setTimeout(() => setIsOpen(false), 2000);
    } else {
      setError(res.error || "An error occurred");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete user ${username}?`)) {
      setLoading(true);
      const res = await deleteUser(userId);
      if (!res.success) {
        alert(res.error || "Failed to delete user");
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <button 
        onClick={() => { setIsOpen(true); setSuccess(false); setError(""); setNewUsername(username); setNewPassword(""); }}
        className="btn btn-sm btn-secondary"
      >
        Edit User
      </button>
      <button
        onClick={handleDelete}
        className="btn btn-sm"
        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderColor: 'var(--error)' }}
        disabled={loading}
      >
        Delete
      </button>

      {isOpen && (
        <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '400px', maxWidth: '90%', padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Edit User ({username})
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={3}
                />
              </div>

              {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}
              {success && <div style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem' }}>User updated successfully!</div>}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading || !newUsername}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
