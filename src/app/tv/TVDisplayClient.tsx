"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInstitutionDisplay } from "@/lib/formatUtils";

interface TVDisplayClientProps {
  event: any;
  leaderboard: any[];
  fadhilaLeaderboard?: any[];
  fadheelaLeaderboard?: any[];
  zoneLeaderboard?: any[];
  fadhilaZoneLeaderboard?: any[];
  fadheelaZoneLeaderboard?: any[];
  champions?: {
    overallChampion?: any;
    overallRunnerUp?: any;
    overallSecondRunnerUp?: any;
    fadhilaTopInstitution?: any;
    fadhilaRunnerUpInstitution?: any;
    fadhilaTopInstitutions?: any[];
    fadheelaTopInstitution?: any;
    fadheelaRunnerUpInstitution?: any;
    fadheelaTopInstitutions?: any[];
    overallTopZone?: any;
    overallRunnerUpZone?: any;
    fadhilaTopZone?: any;
    fadhilaRunnerUpZone?: any;
    fadheelaTopZone?: any;
    fadheelaRunnerUpZone?: any;
    topZones?: any[];
    fadhilaTopZones?: any[];
    fadheelaTopZones?: any[];
  };
  isStateFest?: boolean;
  recentWinners: any[];
  allEvents: any[];
  stats: any;
}

export default function TVDisplayClient({ 
  event, 
  leaderboard, 
  fadhilaLeaderboard = [],
  fadheelaLeaderboard = [],
  zoneLeaderboard = [],
  fadhilaZoneLeaderboard = [],
  fadheelaZoneLeaderboard = [],
  champions,
  isStateFest = false,
  recentWinners, 
  allEvents,
  stats
}: TVDisplayClientProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // View Area Mode: 'OVERALL', 'FADHILA', 'FADHEELA', 'ZONES', 'SHOWCASE'
  const [viewArea, setViewArea] = useState<'OVERALL' | 'FADHILA' | 'FADHEELA' | 'ZONES' | 'SHOWCASE'>('OVERALL');
  const [autoCycleView, setAutoCycleView] = useState(true);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // TV Auto-Refresh: Refresh server component data every 10 seconds to fetch new winner declarations live
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      router.refresh();
    }, 10000);
    return () => clearInterval(refreshInterval);
  }, [router]);

  // Auto-cycle through View Area Types every 12 seconds
  useEffect(() => {
    if (!autoCycleView) return;
    const views: Array<'OVERALL' | 'FADHILA' | 'FADHEELA' | 'SHOWCASE'> = 
      ['OVERALL', 'FADHILA', 'FADHEELA', 'SHOWCASE'];
    
    const timer = setInterval(() => {
      setViewArea(prev => {
        const nextIdx = (views.indexOf(prev as any) + 1) % views.length;
        return views[nextIdx];
      });
    }, 12000);
    return () => clearInterval(timer);
  }, [autoCycleView]);

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

  // Active dataset based on viewArea
  const currentLeaderboard = viewArea === 'FADHILA' 
    ? fadhilaLeaderboard 
    : viewArea === 'FADHEELA' 
    ? fadheelaLeaderboard 
    : leaderboard;

  const activeTop3 = currentLeaderboard.slice(0, 3);

  // Standings Tab specifically inside the Champions TV Spotlight view
  const [showcaseTab, setShowcaseTab] = useState<'OVERALL' | 'FADHILA' | 'FADHEELA'>('OVERALL');

  // Auto-cycle showcase leaderboard tab every 8 seconds when auto-cycle is enabled
  useEffect(() => {
    if (!autoCycleView || viewArea !== 'SHOWCASE') return;
    const tabs: Array<'OVERALL' | 'FADHILA' | 'FADHEELA'> = ['OVERALL', 'FADHILA', 'FADHEELA'];
    const timer = setInterval(() => {
      setShowcaseTab(prev => {
        const nextIdx = (tabs.indexOf(prev) + 1) % tabs.length;
        return tabs[nextIdx];
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [autoCycleView, viewArea]);

  const showcaseLeaderboard = showcaseTab === 'FADHILA'
    ? fadhilaLeaderboard
    : showcaseTab === 'FADHEELA'
    ? fadheelaLeaderboard
    : leaderboard;

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FADHILA' | 'FADHEELA'>('ALL');
  const [autoSlide, setAutoSlide] = useState(true);

  // Auto-slide between categories in Recent Winners (ALL -> FADHILA -> FADHEELA) every 8 seconds
  useEffect(() => {
    if (!autoSlide) return;
    const catOrder: Array<'ALL' | 'FADHILA' | 'FADHEELA'> = ['ALL', 'FADHILA', 'FADHEELA'];
    const timer = setInterval(() => {
      setCategoryFilter(prev => {
        const nextIdx = (catOrder.indexOf(prev) + 1) % catOrder.length;
        return catOrder[nextIdx];
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [autoSlide]);

  const filteredWinners = recentWinners.filter(res => {
    if (categoryFilter === 'ALL') return true;
    const catName = (res.program?.category?.name || '').toUpperCase();
    return catName.includes(categoryFilter);
  });

  return (
    <div style={{ backgroundColor: bg, color: textPri, minHeight: '100vh', padding: '0.6rem 1.4rem', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      
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
      <header style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '0.4rem', paddingTop: '0.2rem' }}>
        
        {/* Left: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '3px 8px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span> LIVE
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, letterSpacing: '0.5px', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>Hiya Fiesta</h1>
            <div style={{ fontSize: '0.62rem', color: textSec, fontWeight: 700, letterSpacing: '0.5px' }}>CSWC INTER COLLEGIATE CULTURAL FEST</div>
          </div>
        </div>

        {/* Center: Zone & Status */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 2px 0', letterSpacing: '1.5px', textTransform: 'uppercase', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>
            {event.name}
          </h2>
          <div style={{ fontSize: '0.75rem', color: textSec, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
            {viewArea === 'FADHILA' 
              ? 'Fadhila Category Standings & Champions' 
              : viewArea === 'FADHEELA' 
              ? 'Fadheela Category Standings & Champions' 
              : viewArea === 'SHOWCASE'
              ? 'Official Broadcast · Festival Champions Spotlight'
              : 'Overall Institution Standings'}
          </div>
        </div>

        {/* Right: Time & CSWC Logo */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'monospace', color: theme === 'dark' ? 'white' : '#1e3a8a', lineHeight: 1.1 }}>{currentTime || "00:00:00"}</div>
            <div style={{ fontSize: '0.65rem', color: textSec, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700 }}>{currentDate || "LOADING"}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '34px', height: '34px', margin: '0 auto 2px auto', borderRadius: '50%', border: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>🏛️</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.5px', color: theme === 'dark' ? 'white' : '#1e3a8a' }}>CSWC</div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CATEGORY & ZONE CHAMPIONS HERO BANNER (Hidden in SHOWCASE to save space)  */}
      {/* ========================================================================= */}
      {viewArea !== 'SHOWCASE' && (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '10px', 
        marginBottom: '0.6rem' 
      }}>
        {/* 1. Overall Festival Standings (Total Points: Category + General) */}
        <div style={{
          backgroundColor: panelBg,
          borderRadius: '10px',
          border: '1.5px solid rgba(251, 191, 36, 0.4)',
          padding: '8px 12px',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(11,17,32,0.95) 100%)' 
            : 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
          boxShadow: '0 4px 12px rgba(251,191,36,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: gold, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🏆</span> OVERALL STANDINGS
            </div>
            <span style={{ fontSize: '0.58rem', color: textSec, backgroundColor: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
              Category + General
            </span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {champions?.overallChampion?.name || leaderboard[0]?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.6rem', color: gold, fontWeight: 700, letterSpacing: '0.5px' }}>
                CHAMPION
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: gold, fontFamily: 'monospace' }}>
                {champions?.overallChampion?.points ?? leaderboard[0]?.points ?? 0}
              </div>
              <div style={{ fontSize: '0.5rem', fontWeight: 700, color: textSec }}>PTS</div>
            </div>
          </div>

          {/* Runner-Up */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderCol}`, paddingTop: '4px', marginTop: '4px' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥈 {champions?.overallRunnerUp?.name || leaderboard[1]?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.55rem', color: silver, fontWeight: 600 }}>
                RUNNER-UP
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: silver, fontFamily: 'monospace' }}>
                {champions?.overallRunnerUp?.points ?? leaderboard[1]?.points ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Fadhila Category Standings (Individual Programs Only) */}
        <div style={{
          backgroundColor: panelBg,
          borderRadius: '10px',
          border: '1.5px solid rgba(236, 72, 153, 0.4)',
          padding: '8px 12px',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(11,17,32,0.95) 100%)' 
            : 'linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%)',
          boxShadow: '0 4px 12px rgba(236,72,153,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#ec4899', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              FADHILA CATEGORY
            </div>
            <span style={{ fontSize: '0.58rem', color: '#ec4899', backgroundColor: 'rgba(236,72,153,0.12)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
              Indiv Only
            </span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {champions?.fadhilaTopInstitution?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#ec4899', fontWeight: 700, letterSpacing: '0.5px' }}>
                CHAMPION
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ec4899', fontFamily: 'monospace' }}>
                {champions?.fadhilaTopInstitution?.points || 0}
              </div>
              <div style={{ fontSize: '0.5rem', fontWeight: 700, color: textSec }}>PTS</div>
            </div>
          </div>

          {/* Runner-Up */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderCol}`, paddingTop: '4px', marginTop: '4px' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥈 {champions?.fadhilaRunnerUpInstitution?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.55rem', color: silver, fontWeight: 600 }}>
                RUNNER-UP
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: silver, fontFamily: 'monospace' }}>
                {champions?.fadhilaRunnerUpInstitution?.points || 0}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Fadheela Category Standings (Individual Programs Only) */}
        <div style={{
          backgroundColor: panelBg,
          borderRadius: '10px',
          border: '1.5px solid rgba(139, 92, 246, 0.4)',
          padding: '8px 12px',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(11,17,32,0.95) 100%)' 
            : 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)',
          boxShadow: '0 4px 12px rgba(139,92,246,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#a855f7', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              FADHEELA CATEGORY
            </div>
            <span style={{ fontSize: '0.58rem', color: '#a855f7', backgroundColor: 'rgba(139,92,246,0.12)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
              Indiv Only
            </span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {champions?.fadheelaTopInstitution?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#a855f7', fontWeight: 700, letterSpacing: '0.5px' }}>
                CHAMPION
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#a855f7', fontFamily: 'monospace' }}>
                {champions?.fadheelaTopInstitution?.points || 0}
              </div>
              <div style={{ fontSize: '0.5rem', fontWeight: 700, color: textSec }}>PTS</div>
            </div>
          </div>

          {/* Runner-Up */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderCol}`, paddingTop: '4px', marginTop: '4px' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥈 {champions?.fadheelaRunnerUpInstitution?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.55rem', color: silver, fontWeight: 600 }}>
                RUNNER-UP
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: silver, fontFamily: 'monospace' }}>
                {champions?.fadheelaRunnerUpInstitution?.points || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW AREA TYPE SWITCHER TOOLBAR                                           */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: panelBg,
        padding: '5px 12px',
        borderRadius: '8px',
        border: `1px solid ${borderCol}`,
        marginBottom: '0.6rem',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {/* Left: View Area Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px', color: textSec, textTransform: 'uppercase', marginRight: '4px' }}>
            VIEW AREA:
          </span>

          {[
            { id: 'OVERALL', label: '🏛️ Overall Standings', color: '#2563eb' },
            { id: 'FADHILA', label: '🌸 Fadhila Champions', color: '#ec4899' },
            { id: 'FADHEELA', label: '🌺 Fadheela Champions', color: '#8b5cf6' },
            { id: 'SHOWCASE', label: '✨ 🏆 Champions TV Show Spotlight', color: '#d97706' }
          ].map(tab => {
            const isActive = viewArea === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setViewArea(tab.id as any);
                  setAutoCycleView(false); // Pause auto-cycle on manual click
                }}
                style={{
                  padding: '4px 11px',
                  borderRadius: '6px',
                  border: `1px solid ${isActive ? tab.color : 'transparent'}`,
                  backgroundColor: isActive ? tab.color : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                  color: isActive ? '#ffffff' : textPri,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Auto Cycle Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setAutoCycleView(p => !p)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${autoCycleView ? '#10b981' : borderCol}`,
              backgroundColor: autoCycleView ? 'rgba(16,185,129,0.15)' : 'transparent',
              color: autoCycleView ? '#10b981' : textSec,
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>{autoCycleView ? '🔄 AUTO-CYCLE (12s)' : '⏸️ PAUSED'}</span>
          </button>
        </div>
      </div>



      {/* MAIN CONTENT: SHOWCASE TV SPOTLIGHT OR STANDARD LEADERBOARD GRID */}
      {viewArea === 'SHOWCASE' ? (
        <section style={{
          backgroundColor: panelBg,
          borderRadius: '14px',
          border: `1.5px solid ${gold}66`,
          padding: '0.9rem 1.2rem',
          background: theme === 'dark'
            ? 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.14) 0%, rgba(11,17,32,0.98) 70%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.18) 0%, #ffffff 70%)',
          boxShadow: theme === 'dark' ? '0 0 35px rgba(251,191,36,0.12)' : '0 8px 25px rgba(251,191,36,0.14)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          flex: 1
        }}>
          {/* TV SHOW CEREMONY HEADER */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 12px', borderRadius: '16px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '1px', marginBottom: '3px', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
              CSWC OFFICIAL FESTIVAL BROADCAST · LIVE CHAMPIONS SPOTLIGHT
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '1.5px', margin: '0 0 2px 0', textTransform: 'uppercase', color: gold, textShadow: '0 2px 15px rgba(251,191,36,0.4)' }}>
              🏆 Festival Champions & Runners-Up Spotlight
            </h2>
            <div style={{ fontSize: '0.72rem', color: textSec, letterSpacing: '0.5px', fontWeight: 600 }}>
              Category Champions Calculated <strong style={{ color: '#ec4899' }}>Strictly by Individual Programs</strong> • Overall Grand Champions By <strong style={{ color: gold }}>Total Points (Category + General)</strong>
            </div>
          </div>

          {/* 3-PILLAR BROADCAST CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
            
            {/* 1. OVERALL GRAND CHAMPION */}
            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.65)' : '#fffbeb',
              border: `1.5px solid ${gold}`,
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(251,191,36,0.15)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: gold, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    👑 GRAND OVERALL
                  </span>
                  <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(251,191,36,0.15)', color: gold, fontWeight: 800 }}>
                    Category + General
                  </span>
                </div>

                <div style={{ textAlign: 'center', margin: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🏆</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.98rem', fontWeight: 900, color: textPri, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                        {champions?.overallChampion?.name || leaderboard[0]?.name || 'Tallying...'}
                      </div>
                      {champions?.overallChampion?.place && (
                        <div style={{ fontSize: '0.66rem', color: textSec }}>
                          📍 {champions.overallChampion.place}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: gold, fontFamily: 'monospace', margin: '3px 0', lineHeight: 1 }}>
                    {champions?.overallChampion?.points ?? leaderboard[0]?.points ?? 0}
                    <span style={{ fontSize: '0.75rem', color: textSec, marginLeft: '4px' }}>PTS</span>
                  </div>
                  <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', backgroundColor: gold, color: '#000', fontWeight: 900, fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                    👑 GRAND CHAMPION
                  </div>
                </div>
              </div>

              {/* Runner-ups for Overall */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '6px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                  <span style={{ color: textSec, fontWeight: 600 }}>🥈 Runner-Up:</span>
                  <strong style={{ color: silver, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                    {champions?.overallRunnerUp?.name || leaderboard[1]?.name || 'Tallying...'} ({champions?.overallRunnerUp?.points ?? leaderboard[1]?.points ?? 0} pts)
                  </strong>
                </div>
                {leaderboard[2] && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                    <span style={{ color: textSec, fontWeight: 600 }}>🥉 2nd Runner-Up:</span>
                    <span style={{ color: bronze, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                      {champions?.overallSecondRunnerUp?.name || leaderboard[2]?.name} ({champions?.overallSecondRunnerUp?.points ?? leaderboard[2]?.points ?? 0} pts)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. FADHILA CATEGORY CHAMPIONS */}
            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.65)' : '#fdf2f8',
              border: `1.5px solid #ec4899`,
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(236,72,153,0.15)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ec4899', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    FADHILA CATEGORY
                  </span>
                  <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(236,72,153,0.15)', color: '#ec4899', fontWeight: 800 }}>
                    Indiv Only
                  </span>
                </div>

                <div style={{ textAlign: 'center', margin: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🥇</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.98rem', fontWeight: 900, color: textPri, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                        {champions?.fadhilaTopInstitution?.name || 'Tallying...'}
                      </div>
                      {champions?.fadhilaTopInstitution?.place && (
                        <div style={{ fontSize: '0.66rem', color: textSec }}>
                          📍 {champions.fadhilaTopInstitution.place}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ec4899', fontFamily: 'monospace', margin: '3px 0', lineHeight: 1 }}>
                    {champions?.fadhilaTopInstitution?.points || 0}
                    <span style={{ fontSize: '0.75rem', color: textSec, marginLeft: '4px' }}>PTS</span>
                  </div>
                  <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', backgroundColor: '#ec4899', color: '#fff', fontWeight: 900, fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                    👑 FADHILA CHAMPION
                  </div>
                </div>
              </div>

              {/* Runner-Up for Fadhila */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '6px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                  <span style={{ color: textSec, fontWeight: 600 }}>🥈 Runner-Up:</span>
                  <strong style={{ color: silver, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                    {champions?.fadhilaRunnerUpInstitution?.name || 'Tallying...'} ({champions?.fadhilaRunnerUpInstitution?.points || 0} pts)
                  </strong>
                </div>
              </div>
            </div>

            {/* 3. FADHEELA CATEGORY CHAMPIONS */}
            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.65)' : '#f5f3ff',
              border: `1.5px solid #8b5cf6`,
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(139,92,246,0.15)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#8b5cf6', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    FADHEELA CATEGORY
                  </span>
                  <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 800 }}>
                    Indiv Only
                  </span>
                </div>

                <div style={{ textAlign: 'center', margin: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🥇</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.98rem', fontWeight: 900, color: textPri, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                        {champions?.fadheelaTopInstitution?.name || 'Tallying...'}
                      </div>
                      {champions?.fadheelaTopInstitution?.place && (
                        <div style={{ fontSize: '0.66rem', color: textSec }}>
                          📍 {champions.fadheelaTopInstitution.place}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#8b5cf6', fontFamily: 'monospace', margin: '3px 0', lineHeight: 1 }}>
                    {champions?.fadheelaTopInstitution?.points || 0}
                    <span style={{ fontSize: '0.75rem', color: textSec, marginLeft: '4px' }}>PTS</span>
                  </div>
                  <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 900, fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                    👑 FADHEELA CHAMPION
                  </div>
                </div>
              </div>

              {/* Runner-Up for Fadheela */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '6px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                  <span style={{ color: textSec, fontWeight: 600 }}>🥈 Runner-Up:</span>
                  <strong style={{ color: silver, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                    {champions?.fadheelaRunnerUpInstitution?.name || 'Tallying...'} ({champions?.fadheelaRunnerUpInstitution?.points || 0} pts)
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BROADCAST LEADERBOARD TABLE EMBEDDED DIRECTLY UNDER CHAMPIONS              */}
          {/* ========================================================================= */}
          <div style={{
            backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
            borderRadius: '12px',
            border: `1.5px solid ${borderCol}`,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(8px)'
          }}>
            {/* Table Header Bar with Tabs */}
            <div style={{
              padding: '6px 12px',
              borderBottom: `1px solid ${borderCol}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {/* Left: Category Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: showcaseTab === 'FADHILA' ? '#ec4899' : showcaseTab === 'FADHEELA' ? '#a855f7' : gold
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  {showcaseTab === 'FADHILA'
                    ? `🌸 Fadhila Category Standings (${fadhilaLeaderboard.length} Institutions • Indiv Only)`
                    : showcaseTab === 'FADHEELA'
                    ? `🌺 Fadheela Category Standings (${fadheelaLeaderboard.length} Institutions • Indiv Only)`
                    : `🏛️ Overall Institution Standings (${leaderboard.length} Institutions • Category + General)`}
                </span>
              </div>

              {/* Right: Category Tabs for the Table */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: textSec, textTransform: 'uppercase', marginRight: '4px' }}>
                  SWITCH STANDINGS:
                </span>
                {[
                  { id: 'OVERALL', label: '👑 Overall', color: gold },
                  { id: 'FADHILA', label: '🌸 Fadhila', color: '#ec4899' },
                  { id: 'FADHEELA', label: '🌺 Fadheela', color: '#8b5cf6' }
                ].map(tab => {
                  const isActive = showcaseTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setShowcaseTab(tab.id as any)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${isActive ? tab.color : 'transparent'}`,
                        backgroundColor: isActive ? tab.color : (theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0'),
                        color: isActive ? (tab.id === 'OVERALL' ? '#000' : '#fff') : textPri,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Broadcast Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{
                  color: textSec,
                  fontSize: '0.64rem',
                  letterSpacing: '0.8px',
                  borderBottom: `1px solid ${borderCol}`,
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                }}>
                  <th style={{ padding: '6px 12px', textAlign: 'left', width: '65px' }}>RANK</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left' }}>INSTITUTION</th>
                  <th style={{ padding: '6px 12px', textAlign: 'center', width: '85px' }}>CODE</th>
                  <th style={{ padding: '6px 12px', textAlign: 'center', width: '120px', color: '#38bdf8' }}>TOTAL POINTS</th>
                  <th style={{ padding: '6px 12px', textAlign: 'center', width: '130px' }}>STATUS</th>
                  <th style={{ padding: '6px 12px', textAlign: 'right', width: '85px' }}>UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {showcaseLeaderboard.map((t: any, idx: number) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;
                  return (
                    <tr
                      key={t.id || idx}
                      style={{
                        borderBottom: `1px solid ${borderCol}`,
                        backgroundColor: isTop1
                          ? (theme === 'dark' ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.1)')
                          : isTop2
                          ? (theme === 'dark' ? 'rgba(148,163,184,0.04)' : 'rgba(148,163,184,0.08)')
                          : isTop3
                          ? (theme === 'dark' ? 'rgba(180,83,9,0.04)' : 'rgba(180,83,9,0.08)')
                          : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Rank */}
                      <td style={{
                        padding: '6px 12px',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        color: isTop1 ? gold : isTop2 ? silver : isTop3 ? bronze : textSec
                      }}>
                        {isTop1 ? '🥇 #1' : isTop2 ? '🥈 #2' : isTop3 ? '🥉 #3' : `#${idx + 1}`}
                      </td>

                      {/* Institution */}
                      <td style={{ padding: '6px 12px', fontWeight: 800 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {t.logoUrl ? (
                            <img
                              src={t.logoUrl}
                              alt={t.name}
                              style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '50%', backgroundColor: 'white', padding: '1px', flexShrink: 0 }}
                            />
                          ) : (
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: t.flagColor || (isTop1 ? gold : '#ec4899'),
                              display: 'inline-block',
                              flexShrink: 0
                            }}></span>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              color: isTop1 ? (theme === 'dark' ? gold : '#b45309') : textPri,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontSize: '0.84rem'
                            }}>
                              {t.name}
                            </div>
                            {t.place && (
                              <div style={{ fontSize: '0.64rem', color: textSec, fontWeight: 500 }}>
                                📍 {t.place}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td style={{ padding: '6px 12px', textAlign: 'center', color: textSec, fontWeight: 700, fontSize: '0.74rem' }}>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                          border: `1px solid ${borderCol}`
                        }}>
                          {t.code || t.prefixCode || '—'}
                        </span>
                      </td>

                      {/* Total Points */}
                      <td style={{
                        padding: '6px 12px',
                        textAlign: 'center',
                        fontWeight: 900,
                        color: isTop1 ? gold : '#38bdf8',
                        fontSize: '1.05rem',
                        fontFamily: 'monospace'
                      }}>
                        {t.points}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          backgroundColor: isTop1
                            ? 'rgba(251,191,36,0.18)'
                            : isTop2
                            ? 'rgba(148,163,184,0.18)'
                            : isTop3
                            ? 'rgba(180,83,9,0.18)'
                            : 'rgba(255,255,255,0.04)',
                          color: isTop1 ? gold : isTop2 ? silver : isTop3 ? bronze : textSec,
                          border: `1px solid ${isTop1 ? gold : isTop2 ? silver : isTop3 ? bronze : borderCol}`
                        }}>
                          {isTop1 ? '👑 CHAMPION' : isTop2 ? '🥈 RUNNER-UP' : isTop3 ? '🥉 2ND RUNNER-UP' : `RANK #${idx + 1}`}
                        </span>
                      </td>

                      {/* Updated */}
                      <td style={{ padding: '6px 12px', textAlign: 'right', color: textSec, fontSize: '0.68rem', fontFamily: 'monospace' }}>
                        {currentTime ? currentTime.substring(0, 5) : '--:--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TICKER FOOTER */}
          <div style={{
            textAlign: 'center',
            borderTop: `1px solid ${borderCol}`,
            paddingTop: '0.4rem',
            fontSize: '0.72rem',
            color: textSec,
            letterSpacing: '1.5px',
            fontWeight: 800,
            textTransform: 'uppercase'
          }}>
            ✨ CSWC HIYA FIESTA 2026 • OFFICIAL FESTIVAL RESULTS VERIFIED & PUBLISHED LIVE • CONGRATULATIONS TO ALL TEAMS ✨
          </div>
        </section>
      ) : (
        <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1rem' }}>
        
        {/* LEFT COL: LEADERBOARD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          
          {/* PODIUM */}
          <div style={{ backgroundColor: panelBg, borderRadius: '12px', border: `1px solid ${borderCol}`, padding: '0.8rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {viewArea === 'FADHILA' 
                  ? '🌸 FADHILA CATEGORY TOP 3 INSTITUTIONS' 
                  : viewArea === 'FADHEELA' 
                  ? '🌺 FADHEELA CATEGORY TOP 3 INSTITUTIONS' 
                  : '🏆 OVERALL TOP 3 INSTITUTIONS'}
              </div>
              <div style={{ fontSize: '0.68rem', color: textSec, letterSpacing: '0.5px' }}>
                AUTO-UPDATING LIVE SCORE MATRIX <span style={{ color: '#10b981' }}>●</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '0.8rem', paddingBottom: '0.4rem' }}>
              
              {/* 2nd Place */}
              {activeTop3[1] && (
                <div style={{ flex: 1, backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.5)' : '#f1f5f9', border: `1px solid ${borderCol}`, borderRadius: '10px', padding: '1rem 0.6rem 1.2rem 0.6rem', textAlign: 'center', position: 'relative' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: silver, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', margin: '-24px auto 6px auto', border: `3px solid ${panelBg}` }}>2</div>
                  {activeTop3[1].logoUrl ? (
                    <img src={activeTop3[1].logoUrl} alt={activeTop3[1].name} style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '50%', margin: '0 auto 4px auto', display: 'block', backgroundColor: 'white', padding: '1px' }} />
                  ) : (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: activeTop3[1].flagColor || silver, margin: '0 auto 4px auto' }} />
                  )}
                  <div style={{ minHeight: '34px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{activeTop3[1].name}</div>
                    {activeTop3[1].place && (
                      <div style={{ fontSize: '0.62rem', color: textSec, fontWeight: 500, marginTop: '1px' }}>
                        📍 {activeTop3[1].place}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: textPri, margin: '4px 0 0 0', lineHeight: 1 }}>{activeTop3[1].points}</div>
                  <div style={{ fontSize: '0.62rem', color: textSec, letterSpacing: '0.5px' }}>POINTS</div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginTop: '3px' }}>↑ {activeTop3[1].change || 0}</div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${silver}25, transparent)`, height: '20px', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', fontSize: '0.58rem', color: silver, fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px' }}>🥈 RUNNER-UP</div>
                </div>
              )}

              {/* 1st Place */}
              {activeTop3[0] && (
                <div style={{ flex: 1.15, backgroundColor: theme === 'dark' ? 'rgba(251,191,36,0.05)' : '#fffbeb', border: `1px solid ${gold}`, borderRadius: '10px', padding: '1.2rem 0.6rem 1.4rem 0.6rem', textAlign: 'center', position: 'relative', boxShadow: theme === 'dark' ? `0 0 25px rgba(251,191,36,0.1)` : `0 8px 25px rgba(251,191,36,0.15)` }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: gold, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', margin: '-32px auto 6px auto', border: `3px solid ${panelBg}` }}>1</div>
                  {activeTop3[0].logoUrl ? (
                    <img src={activeTop3[0].logoUrl} alt={activeTop3[0].name} style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '50%', margin: '0 auto 4px auto', display: 'block', backgroundColor: 'white', padding: '1px' }} />
                  ) : (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: activeTop3[0].flagColor || gold, margin: '0 auto 4px auto' }} />
                  )}
                  <div style={{ minHeight: '34px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{activeTop3[0].name}</div>
                    {activeTop3[0].place && (
                      <div style={{ fontSize: '0.64rem', color: textSec, fontWeight: 500, marginTop: '1px' }}>
                        📍 {activeTop3[0].place}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: gold, margin: '4px 0 0 0', lineHeight: 1 }}>{activeTop3[0].points}</div>
                  <div style={{ fontSize: '0.66rem', color: textSec, letterSpacing: '0.5px' }}>POINTS</div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '3px' }}>↑ {activeTop3[0].change || 0}</div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${gold}40, transparent)`, height: '24px', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', fontSize: '0.64rem', color: gold, fontWeight: 900, letterSpacing: '1px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>👑 CHAMPION</div>
                </div>
              )}

              {/* 3rd Place */}
              {activeTop3[2] && (
                <div style={{ flex: 1, backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.5)' : '#f1f5f9', border: `1px solid ${borderCol}`, borderRadius: '10px', padding: '1rem 0.6rem 1.2rem 0.6rem', textAlign: 'center', position: 'relative' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: bronze, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', margin: '-24px auto 6px auto', border: `3px solid ${panelBg}` }}>3</div>
                  {activeTop3[2].logoUrl ? (
                    <img src={activeTop3[2].logoUrl} alt={activeTop3[2].name} style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '50%', margin: '0 auto 4px auto', display: 'block', backgroundColor: 'white', padding: '1px' }} />
                  ) : (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: activeTop3[2].flagColor || bronze, margin: '0 auto 4px auto' }} />
                  )}
                  <div style={{ minHeight: '34px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{activeTop3[2].name}</div>
                    {activeTop3[2].place && (
                      <div style={{ fontSize: '0.62rem', color: textSec, fontWeight: 500, marginTop: '1px' }}>
                        📍 {activeTop3[2].place}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: textPri, margin: '4px 0 0 0', lineHeight: 1 }}>{activeTop3[2].points}</div>
                  <div style={{ fontSize: '0.62rem', color: textSec, letterSpacing: '0.5px' }}>POINTS</div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginTop: '3px' }}>↑ {activeTop3[2].change || 0}</div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${bronze}25, transparent)`, height: '20px', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', fontSize: '0.58rem', color: bronze, fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px' }}>🥉 2ND RUNNER-UP</div>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC LEADERBOARD TABLE (OVERALL / FADHILA / FADHEELA) */}
          <div style={{ backgroundColor: panelBg, borderRadius: '12px', border: `1px solid ${borderCol}`, flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: textSec }}>
                {viewArea === 'FADHILA' 
                  ? `Fadhila Category (Individual Programs Only • ${currentLeaderboard.filter((t: any) => t.points > 0).length} Scored / ${currentLeaderboard.length} Total)` 
                  : viewArea === 'FADHEELA' 
                  ? `Fadheela Category (Individual Programs Only • ${currentLeaderboard.filter((t: any) => t.points > 0).length} Scored / ${currentLeaderboard.length} Total)` 
                  : `Overall Institutions Leaderboard (Category + General Included • ${currentLeaderboard.length} Total)`}
              </span>
              <span style={{ fontSize: '0.66rem', color: '#10b981', fontWeight: 700 }}>
                ● LIVE TALLY
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ color: textSec, fontSize: '0.64rem', letterSpacing: '0.5px', borderBottom: `1px solid ${borderCol}`, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', width: '60px' }}>RANK</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>
                    INSTITUTION
                  </th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', width: '80px' }}>CODE</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', width: '110px', color: '#38bdf8' }}>TOTAL POINTS</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', width: '120px' }}>STATUS</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', width: '80px' }}>UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {currentLeaderboard.map((t: any, idx: number) => (
                  <tr key={t.id} style={{ 
                    borderBottom: `1px solid ${borderCol}`,
                    backgroundColor: idx === 0 
                      ? (theme === 'dark' ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.08)')
                      : 'transparent'
                  }}>
                    <td style={{ padding: '6px 10px', fontWeight: 800, color: idx === 0 ? gold : idx === 1 ? silver : idx === 2 ? bronze : textSec }}>
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t.logoUrl ? (
                          <img src={t.logoUrl} alt={t.name} style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '50%', backgroundColor: 'white', padding: '1px', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.flagColor || '#ec4899', display: 'inline-block', flexShrink: 0 }}></span>
                        )}
                        <div>
                          <div style={{ color: idx === 0 ? gold : textPri, fontSize: '0.82rem' }}>{t.name}</div>
                          {t.place && (
                            <div style={{ fontSize: '0.64rem', color: textSec, fontWeight: 500 }}>
                              📍 {t.place}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: textSec, fontWeight: 600, fontSize: '0.72rem' }}>{t.code || t.prefixCode}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 900, color: '#38bdf8', fontSize: '1rem', fontFamily: 'monospace' }}>
                      {t.points}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 800, fontSize: '0.68rem', color: idx === 0 ? gold : idx === 1 ? silver : idx === 2 ? bronze : textSec }}>
                      {idx === 0 ? '👑 CHAMPION' : idx === 1 ? '🥈 RUNNER-UP' : idx === 2 ? '🥉 2ND RUNNER-UP' : `RANK #${idx + 1}`}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: textSec, fontSize: '0.68rem', fontFamily: 'monospace' }}>
                      {currentTime ? currentTime.substring(0, 5) : '--:--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COL: RECENT RESULTS WITH FADHILA & FADHEELA CATEGORY SLIDING */}
        <div style={{ backgroundColor: panelBg, borderRadius: '12px', border: `1px solid ${borderCol}`, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📢 RECENT WINNERS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAutoSlide(p => !p)}
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: autoSlide ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                  color: autoSlide ? '#10b981' : textSec,
                  fontWeight: 700
                }}
                title="Toggle Auto-sliding category carousel"
              >
                {autoSlide ? '🔄 AUTO-SLIDING (8s)' : '⏸️ PAUSED'}
              </button>
              <Link 
                href={`/fest/${event.id}/results`}
                style={{ 
                  fontSize: '0.72rem', 
                  color: '#38bdf8', 
                  letterSpacing: '1px', 
                  textDecoration: 'none', 
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.2)'
                }}
              >
                VIEW ALL →
              </Link>
            </div>
          </div>

          {/* Category Tabs / Slide Bar (FADHILA & FADHEELA) */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.3)' : '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            {[
              { id: 'ALL', label: '🌐 All Results' },
              { id: 'FADHILA', label: 'Fadhila' },
              { id: 'FADHEELA', label: 'Fadheela' },
            ].map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat.id as any);
                    setAutoSlide(false); // user clicked, pause auto slide for a moment
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    transition: 'all 0.2s ease',
                    backgroundColor: isActive 
                      ? (cat.id === 'FADHILA' ? '#ec4899' : cat.id === 'FADHEELA' ? '#8b5cf6' : '#2563eb')
                      : 'transparent',
                    color: isActive ? '#ffffff' : textSec,
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '550px' }}>
            {filteredWinners.length === 0 ? (
              <div style={{ textAlign: 'center', color: textSec, padding: '3rem 1rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>⏳</div>
                <div style={{ fontWeight: 600 }}>No {categoryFilter === 'ALL' ? '' : categoryFilter} results declared yet.</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>New winners will appear here in real-time.</div>
              </div>
            ) : (
              filteredWinners.slice(0, 6).map((res) => {
                const isState = event.type === 'STATE';
                const inst = formatInstitutionDisplay(res.candidate ? res.candidate.team : res.team);
                const zoneName = res.candidate ? res.candidate.team?.event?.name : res.team?.event?.name;
                const displayName = res.candidate 
                  ? `${res.candidate.name} - ${inst.name}${isState && zoneName ? ` (${zoneName})` : ''}`
                  : `${inst.name}${isState && zoneName ? ` (${zoneName})` : ''}`;

                // Place styling
                const placeLabel = res.rank === 1 ? '1st Place' : res.rank === 2 ? '2nd Place' : res.rank === 3 ? '3rd Place' : res.rank ? `${res.rank}th Place` : null;
                const placeBg = res.rank === 1 ? 'rgba(251, 191, 36, 0.15)' : res.rank === 2 ? 'rgba(148, 163, 184, 0.15)' : res.rank === 3 ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255,255,255,0.05)';
                const placeColor = res.rank === 1 ? '#fbbf24' : res.rank === 2 ? '#cbd5e1' : res.rank === 3 ? '#f59e0b' : textSec;
                const placeBorder = res.rank === 1 ? 'rgba(251, 191, 36, 0.3)' : res.rank === 2 ? 'rgba(148, 163, 184, 0.3)' : res.rank === 3 ? 'rgba(217, 119, 6, 0.3)' : borderCol;

                const hasGrade = res.grade && res.grade.trim() !== '' && res.grade !== '-';

                return (
                  <div 
                    key={res.id} 
                    style={{ 
                      display: 'flex', 
                      gap: '14px', 
                      padding: '1.1rem', 
                      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.025)' : '#F8FAFC', 
                      borderRadius: '10px', 
                      border: `1px solid ${borderCol}`,
                      boxShadow: theme === 'dark' ? 'none' : '0 2px 8px rgba(0,0,0,0.03)',
                      alignItems: 'center'
                    }}
                  >
                    {/* Medal / Rank Icon */}
                    <div 
                      style={{ 
                        width: '46px', 
                        height: '46px', 
                        borderRadius: '10px', 
                        backgroundColor: placeBg,
                        border: `1px solid ${placeBorder}`,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1.4rem',
                        flexShrink: 0
                      }}
                    >
                      {res.rank === 1 ? '🥇' : res.rank === 2 ? '🥈' : res.rank === 3 ? '🥉' : '🎖️'}
                    </div>

                    {/* Middle: Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Program & Category Row */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '5px' }}>
                        {res.program?.category?.name && (
                          <span 
                            style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 800, 
                              padding: '2px 7px', 
                              borderRadius: '4px', 
                              backgroundColor: 'rgba(99, 102, 241, 0.15)', 
                              color: '#818cf8',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase'
                            }}
                          >
                            {res.program.category.name}
                          </span>
                        )}
                        <span 
                          style={{ 
                            fontSize: '0.72rem', 
                            color: textPri, 
                            letterSpacing: '0.5px', 
                            fontWeight: 700, 
                            textTransform: 'uppercase' 
                          }}
                        >
                          {res.program?.programCode ? `${res.program.programCode} - ` : ''}{res.program?.name}
                        </span>
                      </div>

                      {/* Winner Name & Institution */}
                      <div 
                        style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: 800, 
                          color: textPri,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} 
                        title={displayName}
                      >
                        {displayName}
                      </div>

                      {/* Meta badges: Place, Grade, Location */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {placeLabel && (
                          <span 
                            style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: 800, 
                              color: placeColor, 
                              backgroundColor: placeBg, 
                              border: `1px solid ${placeBorder}`, 
                              padding: '1px 7px', 
                              borderRadius: '4px' 
                            }}
                          >
                            {placeLabel}
                          </span>
                        )}
                        {hasGrade && (
                          <span 
                            style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: 800, 
                              color: '#34d399', 
                              backgroundColor: 'rgba(52, 211, 153, 0.12)', 
                              border: '1px solid rgba(52, 211, 153, 0.3)', 
                              padding: '1px 7px', 
                              borderRadius: '4px' 
                            }}
                          >
                            Grade {res.grade}
                          </span>
                        )}
                        {inst.place && (
                          <span style={{ fontSize: '0.7rem', color: textSec, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            📍 {inst.place}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Points */}
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>{res.points}</div>
                      <div style={{ fontSize: '0.62rem', color: textSec, letterSpacing: '1px', fontWeight: 700, marginTop: '2px' }}>POINTS</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>
      )}

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
