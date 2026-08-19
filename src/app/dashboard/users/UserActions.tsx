"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { editUser, deleteUser } from "./actions";

export default function UserActions({ userId, username }: { userId: string, username: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const res = await editUser(userId, newUsername, newPassword);
    
    if (res.success) {
      setSuccess(true);
      setNewPassword("");
      setTimeout(() => setIsOpen(false), 1500);
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

  const modalContent = isOpen && (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', 
        backdropFilter: 'blur(8px)', 
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 999999,
        padding: '1.5rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
    >
      <div 
        className="glass-panel" 
        style={{ 
          width: '440px', 
          maxWidth: '92vw', 
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          background: '#FFFFFF',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35), 0 0 1px 1px rgba(0,0,0,0.05)',
          borderRadius: '16px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1.25rem', color: '#17111A', fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700 }}>
          Edit User ({username})
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
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

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">New Password (leave blank to keep current)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={3}
                style={{ paddingRight: '42px', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: 'var(--text-muted)',
                  padding: '4px 6px',
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}
          {success && <div style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 600 }}>User updated successfully!</div>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
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
  );

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <button 
        onClick={() => { setIsOpen(true); setSuccess(false); setError(""); setNewUsername(username); setNewPassword(""); setShowPassword(false); }}
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

      {mounted && isOpen && createPortal(modalContent, document.body)}
    </div>
  );
}
