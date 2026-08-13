"use client";

import { useState } from "react";
import { createFest, createFestUser, deleteFest, deleteUser, resetUserPassword, updateFestDomain } from "../actions/superAdmin";

interface SuperAdminDashboarCSWCps {
  initialData: {
    totalVisits: number;
    totalEvents: number;
    events: any[];
    users: any[];
  };
}

export default function SuperAdminDashboard({ initialData }: SuperAdminDashboarCSWCps) {
  const [data, setData] = useState(initialData);
  const [festName, setFestName] = useState("");
  const [festLoading, setFestLoading] = useState(false);
  const [festMessage, setFestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "JUDGE">("ADMIN");
  const [eventId, setEventId] = useState(data.events[0]?.id || "");
  const [userLoading, setUserLoading] = useState(false);
  const [userMessage, setUserMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDeleteFest = async (eventId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the fest "${name}"? This will permanently delete all candidates, teams, programs, results, and page views associated with it. This action cannot be undone.`)) {
      return;
    }
    const res = await deleteFest(eventId);
    if (res.success) {
      alert(`Fest "${name}" deleted successfully.`);
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete fest.");
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete the user account "${username}"?`)) {
      return;
    }
    const res = await deleteUser(userId);
    if (res.success) {
      alert(`User "${username}" deleted successfully.`);
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete user.");
    }
  };

  const handleResetPassword = async (userId: string, username: string) => {
    const newPassword = prompt(`Enter new password for "${username}":`);
    if (newPassword === null) return; // User cancelled
    
    const passwordTrim = newPassword.trim();
    if (!passwordTrim) {
      alert("Password cannot be empty.");
      return;
    }

    const res = await resetUserPassword(userId, passwordTrim);
    if (res.success) {
      alert(`Password for "${username}" has been reset successfully.`);
    } else {
      alert(res.error || "Failed to reset password.");
    }
  };

  const handleSetDomain = async (eventId: string, currentDomain: string | null, name: string) => {
    const newDomain = prompt(`Enter custom domain for "${name}" (e.g. www.mehfil26.com) or leave empty to remove:`, currentDomain || "");
    if (newDomain === null) return; // User cancelled
    
    const domainTrim = newDomain.trim();

    const res = await updateFestDomain(eventId, domainTrim || null);
    if (res.success) {
      alert(`Domain for "${name}" updated successfully.`);
      window.location.reload();
    } else {
      alert(res.error || "Failed to update domain.");
    }
  };

  const handleCreateFest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFestLoading(true);
    setFestMessage(null);

    const res = await createFest(festName);
    if (res.success) {
      setFestMessage({ type: 'success', text: `Fest "${festName}" created successfully!` });
      setFestName("");
      // Reload page to refresh event dropdown and listings
      window.location.reload();
    } else {
      setFestMessage({ type: 'error', text: res.error || "Failed to create fest" });
    }
    setFestLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserLoading(true);
    setUserMessage(null);

    if (!eventId) {
      setUserMessage({ type: 'error', text: "Please create a Fest first before assigning users." });
      setUserLoading(false);
      return;
    }

    const res = await createFestUser({ username, password, role, eventId });
    if (res.success) {
      setUserMessage({ type: 'success', text: `User "${username}" registered successfully!` });
      setUsername("");
      setPassword("");
      // Reload page to refresh the user list
      window.location.reload();
    } else {
      setUserMessage({ type: 'error', text: res.error || "Failed to register user" });
    }
    setUserLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      
      {/* Analytics Overview Cards */}
      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderLeft: '4px solid #A5003A', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>{data.totalVisits}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Page Views</div>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', borderLeft: '4px solid #10b981', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>{data.totalEvents}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Registered Fests</div>
        </div>
      </div>

      {/* Forms Section */}
      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 'var(--spacing-lg)' }}>
        
        {/* Fest Creation Form */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: 'var(--spacing-md)' }}>🎭 Register New Main Event</h2>
          <form onSubmit={handleCreateFest} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {festMessage && (
              <div style={{ 
                color: festMessage.type === 'error' ? '#dc2626' : '#059669', 
                backgroundColor: festMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
                padding: '8px 12px', 
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}>
                {festMessage.text}
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Main Event Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={festName} 
                onChange={(e) => setFestName(e.target.value)} 
                placeholder="e.g. Arts Fest 2026" 
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={festLoading}>
              {festLoading ? "Creating..." : "Add Main Event"}
            </button>
          </form>
        </div>

        {/* User Provisioning Form */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <h2 style={{ color: 'white', fontSize: '1.25rem', marginBottom: 'var(--spacing-md)' }}>👤 Provision Scoped User</h2>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {userMessage && (
              <div style={{ 
                color: userMessage.type === 'error' ? '#dc2626' : '#059669', 
                backgroundColor: userMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
                padding: '8px 12px', 
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}>
                {userMessage.text}
              </div>
            )}
            
            <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="e.g. manager_arts" 
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </div>

            <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 'var(--spacing-sm)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <select className="form-input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="JUDGE">JUDGE</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assign to Fest</label>
                <select className="form-input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  <option value="">-- Choose Fest --</option>
                  {data.events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }} disabled={userLoading}>
              {userLoading ? "Registering..." : "Register Fest User"}
            </button>
          </form>
        </div>

      </div>

      {/* Events Table Listing */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: 'var(--spacing-md)' }}>🎭 Running Main Events Breakdown</h2>
        
        <div style={{ 
          marginBottom: 'var(--spacing-lg)', 
          padding: '12px 16px', 
          backgroundColor: 'rgba(59, 130, 246, 0.1)', 
          borderLeft: '4px solid #A5003A',
          borderRadius: '4px',
          fontSize: '0.85rem',
          lineHeight: '1.5'
        }}>
          <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '4px' }}>ℹ️ How Custom Domains Work</strong>
          <ol style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li>First, go to your <strong>Vercel Dashboard</strong> ({`->`} Settings {`->`} Domains).</li>
            <li>Add your domain there to get the <strong>DNS Records (A Record or CNAME)</strong>.</li>
            <li>Add those records to your domain provider (e.g., GoDaddy). Wait for Vercel to verify it (✅).</li>
            <li>Finally, click <strong>Set Domain</strong> below and type exactly what you added to Vercel.</li>
          </ol>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 'var(--spacing-sm)' }}>Main Event Name</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Custom Domain</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Public URL</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Page Views</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Teams</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Programs</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Staff Users</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Created At</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map(ev => {
                const festUrl = `/fest/${ev.id}`;
                return (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 'var(--spacing-sm)', color: 'white', fontWeight: 600 }}>{ev.name}</td>
                    <td style={{ padding: 'var(--spacing-sm)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        {ev.customDomain ? (
                          <a href={`https://${ev.customDomain}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline', fontSize: '0.85rem' }}>
                            {ev.customDomain}
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None</span>
                        )}
                        <button
                          onClick={() => handleSetDomain(ev.id, ev.customDomain, ev.name)}
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '4px',
                            color: '#a5b4fc',
                            cursor: 'pointer'
                          }}
                        >
                          {ev.customDomain ? 'Edit Domain' : 'Set Domain'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--spacing-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a 
                          href={festUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--secondary)', textDecoration: 'underline', fontSize: '0.8rem' }}
                        >
                          {festUrl}
                        </a>
                        <button
                          onClick={() => {
                            const fullUrl = `${window.location.origin}${festUrl}`;
                            navigator.clipboard.writeText(fullUrl);
                            alert(`Copied URL: ${fullUrl}`);
                          }}
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--spacing-sm)', color: 'var(--primary)', fontWeight: 700 }}>{ev._count.pageVisits} views</td>
                    <td style={{ padding: 'var(--spacing-sm)' }}>{ev._count.teams}</td>
                    <td style={{ padding: 'var(--spacing-sm)' }}>{ev._count.programs}</td>
                    <td style={{ padding: 'var(--spacing-sm)' }}>{ev._count.users}</td>
                    <td style={{ padding: 'var(--spacing-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ev.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: 'var(--spacing-sm)' }}>
                      <button 
                        onClick={() => handleDeleteFest(ev.id, ev.name)}
                        className="btn"
                        style={{ 
                          padding: '4px 10px', 
                          fontSize: '0.75rem', 
                          backgroundColor: '#dc2626', 
                          color: 'white', 
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {data.events.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>No Main Events created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table Listing */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: 'var(--spacing-md)' }}>👥 Scoped Users Accounts</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 'var(--spacing-sm)' }}>Username</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Role</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Assigned Fest</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Registered At</th>
                <th style={{ padding: 'var(--spacing-sm)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 'var(--spacing-sm)', color: 'white', fontWeight: 600 }}>{u.username}</td>
                  <td style={{ padding: 'var(--spacing-sm)' }}>
                    <span style={{ 
                      display: 'inline-block', 
                      padding: '2px 8px', 
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: u.role === 'ADMIN' ? '#a5b4fc' : '#fcd34d',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: 'var(--spacing-sm)' }}>{u.event?.name || 'N/A (Global)'}</td>
                  <td style={{ padding: 'var(--spacing-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: 'var(--spacing-sm)', display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleResetPassword(u.id, u.username)}
                      className="btn"
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '0.75rem', 
                        backgroundColor: '#f59e0b', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Reset Pass
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="btn"
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '0.75rem', 
                        backgroundColor: '#dc2626', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {data.users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>No local user accounts created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
