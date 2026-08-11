"use client";

import { useState } from "react";
import { createUser } from "./actions";

export default function CreateUserForm({ role, zones, institutions, userZoneId }: { 
  role: string, 
  zones: {id: string, name: string}[],
  institutions: {id: string, name: string, zoneId: string}[],
  userZoneId?: string | null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState(role === "ZONE_ADMIN" ? "INSTITUTION_MANAGER" : "JUDGE");
  const [zoneId, setZoneId] = useState(userZoneId || "");
  const [institutionId, setInstitutionId] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await createUser(username, password, userRole, zoneId || null, institutionId || null);
    if (res.success) {
      setIsOpen(false);
      setUsername("");
      setPassword("");
    } else {
      setError(res.error || "An error occurred");
    }
    setLoading(false);
  };

  const filteredInstitutions = institutions.filter(i => i.zoneId === zoneId || !zoneId);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        + Create User
      </button>

      {isOpen && (
        <div className="sidebar-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '90%', padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Create New User</h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  required
                />
              </div>

              {isAdmin ? (
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                    <option value="JUDGE">Judge</option>
                    <option value="ZONE_ADMIN">Zone Admin</option>
                    <option value="INSTITUTION_MANAGER">Institution Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              ) : (
                <input type="hidden" value="INSTITUTION_MANAGER" />
              )}

              {(userRole === "ZONE_ADMIN" || userRole === "INSTITUTION_MANAGER" || (isAdmin && userRole === "JUDGE")) && (
                <div className="form-group">
                  <label className="form-label">Zone</label>
                  <select className="form-input" value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={!isAdmin}>
                    <option value="">Select Zone (Optional for Judges)</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {userRole === "INSTITUTION_MANAGER" && (
                <div className="form-group">
                  <label className="form-label">Institution</label>
                  <select className="form-input" value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
                    <option value="">Select Institution (Optional)</option>
                    {filteredInstitutions.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary" disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
