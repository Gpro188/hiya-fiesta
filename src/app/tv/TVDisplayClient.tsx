"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TVDisplayClient({ 
  event, 
  leaderboard, 
  recentWinners, 
  allEvents,
  stats
}: { 
  event: any, 
  leaderboard: any[], 
  recentWinners: any[], 
  allEvents: any[],
  stats: any
}) {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Colors based on theme
  const bg = theme === 'dark' ? '#090d16' : '#FAFAFA';
  const panelBg = theme === 'dark' ? '#0b1120' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textPri = theme === 'dark' ? '#ffffff' : '#241B1B';
  const textSec = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gold = '#fbbf24';
  const silver = '#94a3b8';
  const bronze = '#b45309';

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 8);

  return (
    <div style={{ backgroundColor: bg, color: textPri, minHeight: '100vh', padding: '1rem 2rem', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Absolute Controls for Demo/Setup */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100, display: 'flex', gap: '10px' }}>
        <button onClick={toggleTheme} style={{ background: theme === 'dark' ? 'white' : 'black', color: theme === 'dark' ? 'black' : 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
          Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </button>
        <select 
          value={event.id}
          onChange={(e) => window.location.href = `/tv?eventId=${e.target.value}`}
          style={{ background: theme === 'dark' ? '#1e293b' : '#e2e8f0', color: textPri, border: `1px solid ${borderCol}`, padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
        >
          {allEvents.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      {/* HEADER SECTION */}
      <header style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
        
        {/* Left: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '4px 10px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span> LIVE
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700, letterSpacing: '1px', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>Hiya Fiesta</h1>
            <div style={{ fontSize: '0.65rem', color: textSec, fontWeight: 700, letterSpacing: '1px' }}>CSWC INTER COLLEGIATE<br/>CULTURAL FEST</div>
          </div>
        </div>

        {/* Center: Zone & Status */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '2px', textTransform: 'uppercase', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>
            {event.name}
          </h2>
          <div style={{ fontSize: '0.85rem', color: textSec, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>
            Real-Time Institution Standings
          </div>
          <div style={{ display: 'inline-block', color: theme === 'dark' ? '#38bdf8' : '#A5003A', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>
            CURRENT COMPETITION: <span style={{ color: textPri }}>AWAITING NEXT</span>
          </div>
        </div>

        {/* Right: Time & CSWC Logo */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'monospace', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>{currentTime || "00:00:00"}</div>
            <div style={{ fontSize: '0.7rem', color: textSec, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700 }}>{currentDate || "LOADING"}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', margin: '0 auto 4px auto', borderRadius: '50%', border: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>🏛️</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '1px', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>CSWC</div>
          </div>
        </div>
      </header>

      {/* STATS BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: panelBg, padding: '1rem 2rem', borderRadius: '12px', border: `1px solid ${borderCol}`, marginBottom: '1.5rem', boxShadow: theme === 'dark' ? 'none' : '0 4px 15px rgba(0,0,0,0.02)' }}>
        {[
          { icon: '🏛️', value: stats.institutions, label: 'INSTITUTIONS' },
          { icon: '👥', value: stats.students, label: 'STUDENTS' },
          { icon: '🏆', value: stats.competitions, label: 'COMPETITIONS' },
          { icon: '📋', value: stats.resultsPublished, label: 'RESULTS PUBLISHED' },
          { icon: '🎤', value: 'STAGE 5', label: 'RUNNING' },
          { icon: '📡', value: 'LIVE', label: 'BROADCAST' },
        ].map((stat, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: idx !== 5 ? '2rem' : 0, borderRight: idx !== 5 ? `1px solid ${borderCol}` : 'none' }}>
            <div style={{ fontSize: '1.5rem', filter: theme === 'dark' ? 'none' : 'hue-rotate(240deg) saturate(300%)' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme === 'dark' ? 'white' : '#1e293b' }}>{stat.value}</div>
              <div style={{ fontSize: '0.65rem', color: textSec, letterSpacing: '1px', fontWeight: 700 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT GRID */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1.5rem' }}>
        
        {/* LEFT COL: LEADERBOARD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* PODIUM */}
          <div style={{ backgroundColor: panelBg, borderRadius: '12px', border: `1px solid ${borderCol}`, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏆 TOP INSTITUTIONS
              </div>
              <div style={{ fontSize: '0.7rem', color: textSec, letterSpacing: '1px' }}>
                AUTO-UPDATING LIVE SCORE MATRIX <span style={{ color: '#10b981' }}>●</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1.5rem', paddingBottom: '1rem' }}>
              
              {/* 2nd Place */}
              {top3[1] && (
                <div style={{ flex: 1, backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.5)' : '#f1f5f9', border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '1.5rem 1rem', textAlign: 'center', position: 'relative' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: silver, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', margin: '-30px auto 10px auto', border: `4px solid ${panelBg}` }}>2</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{top3[1].name}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: textPri, margin: '10px 0 0 0' }}>{top3[1].points}</div>
                  <div style={{ fontSize: '0.7rem', color: textSec, letterSpacing: '1px' }}>POINTS</div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, marginTop: '5px' }}>↑ {top3[1].change}</div>
                </div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <div style={{ flex: 1.2, backgroundColor: theme === 'dark' ? 'rgba(251,191,36,0.05)' : '#fffbeb', border: `1px solid ${gold}`, borderRadius: '12px', padding: '2rem 1rem', textAlign: 'center', position: 'relative', boxShadow: theme === 'dark' ? `0 0 30px rgba(251,191,36,0.1)` : `0 10px 30px rgba(251,191,36,0.2)` }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: gold, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', margin: '-40px auto 10px auto', border: `4px solid ${panelBg}` }}>1</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{top3[0].name}</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: gold, margin: '10px 0 0 0' }}>{top3[0].points}</div>
                  <div style={{ fontSize: '0.75rem', color: textSec, letterSpacing: '1px' }}>POINTS</div>
                  <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, marginTop: '5px' }}>↑ {top3[0].change}</div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${gold}40, transparent)`, height: '30px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', fontSize: '0.7rem', color: gold, fontWeight: 800, letterSpacing: '2px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '6px' }}>LEADING</div>
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div style={{ flex: 1, backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.5)' : '#f1f5f9', border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '1.5rem 1rem', textAlign: 'center', position: 'relative' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: bronze, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', margin: '-30px auto 10px auto', border: `4px solid ${panelBg}` }}>3</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{top3[2].name}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: textPri, margin: '10px 0 0 0' }}>{top3[2].points}</div>
                  <div style={{ fontSize: '0.7rem', color: textSec, letterSpacing: '1px' }}>POINTS</div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, marginTop: '5px' }}>↑ {top3[2].change}</div>
                </div>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div style={{ backgroundColor: panelBg, borderRadius: '12px', border: `1px solid ${borderCol}`, flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ color: textSec, fontSize: '0.65rem', letterSpacing: '1px', borderBottom: `1px solid ${borderCol}` }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>RANK</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>INSTITUTION</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>CODE</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>POINTS</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>GOLD</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>SILVER</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>BRONZE</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>CHANGE</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((t, idx) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${borderCol}` }}>
                    <td style={{ padding: '0.85rem 1rem', color: textSec }}>#{idx + 4}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{t.name}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: textSec }}>{t.prefixCode}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: '#38bdf8', fontSize: '0.9rem' }}>{t.points}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{t.gold}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{t.silver}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{t.bronze}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: t.changeType === 'up' ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '0.7rem' }}>
                      {t.changeType === 'up' ? '↑' : '↓'} {String(t.change).padStart(2, '0')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: textSec, fontSize: '0.7rem' }}>{currentTime.substring(0, 5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COL: RECENT RESULTS */}
        <div style={{ backgroundColor: panelBg, borderRadius: '12px', border: `1px solid ${borderCol}`, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📢 RECENT WINNER DECLARATIONS
            </div>
            <div style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '1px' }}>VIEW ALL</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentWinners.length === 0 ? (
              <div style={{ textAlign: 'center', color: textSec, padding: '2rem' }}>No recent results.</div>
            ) : (
              recentWinners.map((res, idx) => (
                <div key={res.id} style={{ display: 'flex', gap: '15px', padding: '1rem', backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA', borderRadius: '8px', border: `1px solid ${borderCol}` }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    {res.rank === 1 ? '🥇' : res.rank === 2 ? '🥈' : res.rank === 3 ? '🥉' : '🎖️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: textSec, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                      {res.program?.name} ({res.program?.category?.name})
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      {(() => {
                        const isState = event.type === 'STATE';
                        if (res.candidate) {
                          const instName = res.candidate.team?.institution?.name || res.candidate.team?.name;
                          const zoneName = res.candidate.team?.event?.name;
                          if (isState && zoneName) return `${res.candidate.name} - ${instName} (${zoneName})`;
                          return `${res.candidate.name} - ${instName}`;
                        } else {
                          const instName = res.team?.institution?.name || res.team?.name;
                          const zoneName = res.team?.event?.name;
                          if (isState && zoneName) return `${instName} (${zoneName})`;
                          return instName;
                        }
                      })()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: textPri }}>{res.points}</div>
                    <div style={{ fontSize: '0.6rem', color: textSec, letterSpacing: '1px' }}>POINTS</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* FOOTER TICKER */}
      <footer style={{ marginTop: '1.5rem', backgroundColor: panelBg, borderRadius: '8px', border: `1px solid ${borderCol}`, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 12px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px', whiteSpace: 'nowrap' }}>
          LIVE UPDATES
        </div>
        <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.75rem', color: textSec, fontWeight: 600, letterSpacing: '1px' }}>
          • SENIOR DUFF COMPETITION RESULT PUBLISHED • MALAYALAM SPEECH COMING NEXT • PHOTOGRAPHY COMPETITION LIVE • {event.name} LEADING THE CHARTS!
        </div>
        <div style={{ fontSize: '0.65rem', color: textSec, letterSpacing: '2px', whiteSpace: 'nowrap' }}>
          POWERED BY CSWC
        </div>
      </footer>
    </div>
  );
}
