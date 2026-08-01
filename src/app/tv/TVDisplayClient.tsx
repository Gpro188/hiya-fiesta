"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TVDisplayClient({ 
  event, 
  leaderboard, 
  recentWinners, 
  allEvents 
}: { 
  event: any, 
  leaderboard: any[], 
  recentWinners: any[], 
  allEvents: any[] 
}) {
  const [activeTab, setActiveTab] = useState<'standings' | 'winners'>('standings');
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll loop for TV stage displays
  useEffect(() => {
    const scrollInterval = setInterval(() => {
      setActiveTab(prev => prev === 'standings' ? 'winners' : 'standings');
    }, 15000); // Switch views every 15s
    return () => clearInterval(scrollInterval);
  }, []);

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', minHeight: '100vh', padding: '1.5rem', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      
      {/* TV Screen Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900 }}>
            📺
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ec4899', color: 'white', fontWeight: 800 }}>LIVE BROADCAST</span>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
              {event.name}
            </h1>
          </div>
        </div>

        {/* Live Event Switcher for TV Control */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            className="form-input" 
            value={event.id}
            onChange={(e) => window.location.href = `/tv?eventId=${e.target.value}`}
            style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', fontSize: '0.9rem' }}
          >
            {allEvents.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#ec4899', backgroundColor: 'rgba(236,72,153,0.1)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(236,72,153,0.2)' }}>
            ⏰ {currentTime || 'LIVE'}
          </div>
        </div>
      </header>

      {/* Grid Content Area */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Main Standings Leaderboard Column */}
        <div className="glass-panel" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🏆 Institution Standings Leaderboard
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Auto-updating live score matrix</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {leaderboard.map((team, idx) => (
              <div 
                key={team.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '1rem 1.25rem', 
                  backgroundColor: idx === 0 ? 'rgba(236, 72, 153, 0.15)' : idx === 1 ? 'rgba(59, 130, 246, 0.12)' : idx === 2 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(30, 41, 59, 0.4)',
                  borderRadius: '14px',
                  border: idx === 0 ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    backgroundColor: idx === 0 ? '#ec4899' : idx === 1 ? '#3b82f6' : idx === 2 ? '#f59e0b' : '#334155',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    #{idx + 1}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 800 }}>{team.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CODE: {team.prefixCode}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: idx === 0 ? '#ec4899' : '#38bdf8', fontFamily: 'monospace', lineHeight: 1 }}>
                    {team.points} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>PTS</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Results Winners Feed Column */}
        <div className="glass-panel" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#ec4899', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✨ Recent Winner Declarations
            </h2>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {recentWinners.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', marginTop: '2rem' }}>No results declared yet.</div>
            ) : (
              recentWinners.map((res) => (
                <div key={res.id} style={{ padding: '0.85rem', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '10px', borderLeft: '4px solid #ec4899' }}>
                  <div style={{ fontSize: '0.75rem', color: '#ec4899', fontWeight: 700, textTransform: 'uppercase' }}>
                    {res.program.name} ({res.program.category?.name})
                  </div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem', marginTop: '2px' }}>
                    {res.candidate?.name || res.team?.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                    <span>{res.candidate?.team?.name || res.team?.name}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                      {res.rank ? `Rank #${res.rank}` : ''} {res.grade ? `(Grade ${res.grade})` : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* TV Screen Footer */}
      <footer style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        ⚡ CSWC Hiya Fiesta 2026 • Live Stage TV Broadcast System • Council of Samastha Women's Colleges
      </footer>
    </div>
  );
}
