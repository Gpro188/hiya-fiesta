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
      <header style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '1rem', paddingTop: '1rem' }}>
        
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
          <div style={{ fontSize: '0.85rem', color: textSec, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
            {viewArea === 'FADHILA' 
              ? 'Fadhila Category Standings & Champions' 
              : viewArea === 'FADHEELA' 
              ? 'Fadheela Category Standings & Champions' 
              : 'Overall Institution Standings'}
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

      {/* ========================================================================= */}
      {/* CATEGORY & ZONE CHAMPIONS HERO BANNER                                     */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* CATEGORY CHAMPIONS & RUNNER-UPS HERO BANNER                               */}
      {/* ========================================================================= */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '12px', 
        marginBottom: '1rem' 
      }}>
        {/* 1. Overall Festival Standings (Total Points: Category + General) */}
        <div style={{
          backgroundColor: panelBg,
          borderRadius: '10px',
          border: '1.5px solid rgba(251, 191, 36, 0.4)',
          padding: '10px 14px',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(11,17,32,0.95) 100%)' 
            : 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
          boxShadow: '0 4px 12px rgba(251,191,36,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: gold, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🏆</span> OVERALL STANDINGS
            </div>
            <span style={{ fontSize: '0.6rem', color: textSec, backgroundColor: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
              Category + General
            </span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {champions?.overallChampion?.name || leaderboard[0]?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.62rem', color: gold, fontWeight: 700, letterSpacing: '0.5px' }}>
                CHAMPION
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: gold, fontFamily: 'monospace' }}>
                {champions?.overallChampion?.points ?? leaderboard[0]?.points ?? 0}
              </div>
              <div style={{ fontSize: '0.52rem', fontWeight: 700, color: textSec }}>PTS</div>
            </div>
          </div>

          {/* Runner-Up */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderCol}`, paddingTop: '5px', marginTop: '5px' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥈 {champions?.overallRunnerUp?.name || leaderboard[1]?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.58rem', color: silver, fontWeight: 600 }}>
                RUNNER-UP
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: silver, fontFamily: 'monospace' }}>
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
          padding: '10px 14px',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(11,17,32,0.95) 100%)' 
            : 'linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%)',
          boxShadow: '0 4px 12px rgba(236,72,153,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ec4899', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              FADHILA CATEGORY
            </div>
            <span style={{ fontSize: '0.6rem', color: '#ec4899', backgroundColor: 'rgba(236,72,153,0.12)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
              Indiv Only
            </span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {champions?.fadhilaTopInstitution?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#ec4899', fontWeight: 700, letterSpacing: '0.5px' }}>
                CHAMPION
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ec4899', fontFamily: 'monospace' }}>
                {champions?.fadhilaTopInstitution?.points || 0}
              </div>
              <div style={{ fontSize: '0.52rem', fontWeight: 700, color: textSec }}>PTS</div>
            </div>
          </div>

          {/* Runner-Up */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderCol}`, paddingTop: '5px', marginTop: '5px' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥈 {champions?.fadhilaRunnerUpInstitution?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.58rem', color: silver, fontWeight: 600 }}>
                RUNNER-UP
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: silver, fontFamily: 'monospace' }}>
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
          padding: '10px 14px',
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(11,17,32,0.95) 100%)' 
            : 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)',
          boxShadow: '0 4px 12px rgba(139,92,246,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a855f7', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              FADHEELA CATEGORY
            </div>
            <span style={{ fontSize: '0.6rem', color: '#a855f7', backgroundColor: 'rgba(139,92,246,0.12)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
              Indiv Only
            </span>
          </div>

          {/* Champion */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {champions?.fadheelaTopInstitution?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#a855f7', fontWeight: 700, letterSpacing: '0.5px' }}>
                CHAMPION
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#a855f7', fontFamily: 'monospace' }}>
                {champions?.fadheelaTopInstitution?.points || 0}
              </div>
              <div style={{ fontSize: '0.52rem', fontWeight: 700, color: textSec }}>PTS</div>
            </div>
          </div>

          {/* Runner-Up */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderCol}`, paddingTop: '5px', marginTop: '5px' }}>
            <div style={{ minWidth: 0, paddingRight: '6px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥈 {champions?.fadheelaRunnerUpInstitution?.name || 'Tallying...'}
              </div>
              <div style={{ fontSize: '0.58rem', color: silver, fontWeight: 600 }}>
                RUNNER-UP
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: silver, fontFamily: 'monospace' }}>
                {champions?.fadheelaRunnerUpInstitution?.points || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW AREA TYPE SWITCHER TOOLBAR                                           */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: panelBg,
        padding: '8px 14px',
        borderRadius: '10px',
        border: `1px solid ${borderCol}`,
        marginBottom: '1.2rem',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Left: View Area Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', color: textSec, textTransform: 'uppercase', marginRight: '6px' }}>
            VIEW AREA TYPE:
          </span>

          {[
            { id: 'OVERALL', label: '🏛️ Overall Standings', color: '#2563eb' },
            { id: 'FADHILA', label: 'Fadhila Champions', color: '#ec4899' },
            { id: 'FADHEELA', label: 'Fadheela Champions', color: '#8b5cf6' },
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
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${isActive ? tab.color : 'transparent'}`,
                  backgroundColor: isActive ? tab.color : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                  color: isActive ? '#ffffff' : textPri,
                  fontSize: '0.78rem',
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
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${autoCycleView ? '#10b981' : borderCol}`,
              backgroundColor: autoCycleView ? 'rgba(16,185,129,0.15)' : 'transparent',
              color: autoCycleView ? '#10b981' : textSec,
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{autoCycleView ? '🔄 AUTO-CYCLE (12s)' : '⏸️ AUTO-CYCLE PAUSED'}</span>
          </button>
        </div>
      </div>



      {/* MAIN CONTENT: SHOWCASE TV SPOTLIGHT OR STANDARD LEADERBOARD GRID */}
      {viewArea === 'SHOWCASE' ? (
        <section style={{
          backgroundColor: panelBg,
          borderRadius: '16px',
          border: `2px solid ${gold}66`,
          padding: '2rem',
          background: theme === 'dark'
            ? 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.18) 0%, rgba(11,17,32,0.98) 70%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.25) 0%, #ffffff 70%)',
          boxShadow: theme === 'dark' ? '0 0 50px rgba(251,191,36,0.15)' : '0 10px 40px rgba(251,191,36,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          flex: 1
        }}>
          {/* TV SHOW CEREMONY HEADER */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 16px', borderRadius: '20px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', marginBottom: '10px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
              CSWC OFFICIAL FESTIVAL BROADCAST · LIVE CHAMPIONS SPOTLIGHT
            </div>
            <h2 style={{ fontSize: '2.6rem', fontWeight: 900, letterSpacing: '2px', margin: '0 0 6px 0', textTransform: 'uppercase', color: gold, textShadow: '0 2px 25px rgba(251,191,36,0.5)' }}>
              🏆 Festival Champions & Runners-Up Spotlight
            </h2>
            <div style={{ fontSize: '0.95rem', color: textSec, letterSpacing: '1px', fontWeight: 600 }}>
              Category Champions Calculated <strong style={{ color: '#ec4899' }}>Strictly by Individual Programs</strong> • Overall Grand Champions By <strong style={{ color: gold }}>Total Points (Category + General)</strong>
            </div>
          </div>

          {/* 3-PILLAR BROADCAST CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.4rem' }}>
            
            {/* 1. OVERALL GRAND CHAMPION */}
            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : '#fffbeb',
              border: `2px solid ${gold}`,
              borderRadius: '16px',
              padding: '1.6rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 10px 35px rgba(251,191,36,0.2)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: gold, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    👑 GRAND OVERALL
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(251,191,36,0.15)', color: gold, fontWeight: 800 }}>
                    Category + General
                  </span>
                </div>

                <div style={{ textAlign: 'center', margin: '0.8rem 0' }}>
                  <div style={{ fontSize: '2.8rem', marginBottom: '6px' }}>🏆</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: textPri, lineHeight: 1.2, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {champions?.overallChampion?.name || leaderboard[0]?.name || 'Tallying...'}
                  </div>
                  {champions?.overallChampion?.place && (
                    <div style={{ fontSize: '0.78rem', color: textSec, marginTop: '4px' }}>
                      📍 {champions.overallChampion.place}
                    </div>
                  )}
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: gold, fontFamily: 'monospace', margin: '10px 0' }}>
                    {champions?.overallChampion?.points ?? leaderboard[0]?.points ?? 0}
                    <span style={{ fontSize: '0.9rem', color: textSec, marginLeft: '4px' }}>PTS</span>
                  </div>
                  <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '20px', backgroundColor: gold, color: '#000', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px' }}>
                    👑 GRAND CHAMPION
                  </div>
                </div>
              </div>

              {/* Runner-ups for Overall */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: textSec, fontWeight: 600 }}>🥈 Runner-Up:</span>
                  <strong style={{ color: silver }}>{champions?.overallRunnerUp?.name || leaderboard[1]?.name || 'Tallying...'} ({champions?.overallRunnerUp?.points ?? leaderboard[1]?.points ?? 0} pts)</strong>
                </div>
                {leaderboard[2] && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: textSec, fontWeight: 600 }}>🥉 2nd Runner-Up:</span>
                    <span style={{ color: bronze, fontWeight: 800 }}>{champions?.overallSecondRunnerUp?.name || leaderboard[2]?.name} ({champions?.overallSecondRunnerUp?.points ?? leaderboard[2]?.points ?? 0} pts)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. FADHILA CATEGORY CHAMPIONS */}
            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : '#fdf2f8',
              border: `2px solid #ec4899`,
              borderRadius: '16px',
              padding: '1.6rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 10px 35px rgba(236,72,153,0.2)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#ec4899', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    FADHILA CATEGORY
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(236,72,153,0.15)', color: '#ec4899', fontWeight: 800 }}>
                    Indiv Only
                  </span>
                </div>

                <div style={{ textAlign: 'center', margin: '0.8rem 0' }}>
                  <div style={{ fontSize: '2.8rem', marginBottom: '6px' }}>🥇</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: textPri, lineHeight: 1.2, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {champions?.fadhilaTopInstitution?.name || 'Tallying...'}
                  </div>
                  {champions?.fadhilaTopInstitution?.place && (
                    <div style={{ fontSize: '0.78rem', color: textSec, marginTop: '4px' }}>
                      📍 {champions.fadhilaTopInstitution.place}
                    </div>
                  )}
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ec4899', fontFamily: 'monospace', margin: '10px 0' }}>
                    {champions?.fadhilaTopInstitution?.points || 0}
                    <span style={{ fontSize: '0.9rem', color: textSec, marginLeft: '4px' }}>PTS</span>
                  </div>
                  <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '20px', backgroundColor: '#ec4899', color: '#fff', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px' }}>
                    👑 FADHILA CHAMPION
                  </div>
                </div>
              </div>

              {/* Runner-Up for Fadhila */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '12px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: textSec, fontWeight: 600 }}>🥈 Runner-Up:</span>
                  <strong style={{ color: silver }}>{champions?.fadhilaRunnerUpInstitution?.name || 'Tallying...'} ({champions?.fadhilaRunnerUpInstitution?.points || 0} pts)</strong>
                </div>
              </div>
            </div>

            {/* 3. FADHEELA CATEGORY CHAMPIONS */}
            <div style={{
              backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : '#f5f3ff',
              border: `2px solid #8b5cf6`,
              borderRadius: '16px',
              padding: '1.6rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 10px 35px rgba(139,92,246,0.2)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#8b5cf6', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    FADHEELA CATEGORY
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 800 }}>
                    Indiv Only
                  </span>
                </div>

                <div style={{ textAlign: 'center', margin: '0.8rem 0' }}>
                  <div style={{ fontSize: '2.8rem', marginBottom: '6px' }}>🥇</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: textPri, lineHeight: 1.2, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {champions?.fadheelaTopInstitution?.name || 'Tallying...'}
                  </div>
                  {champions?.fadheelaTopInstitution?.place && (
                    <div style={{ fontSize: '0.78rem', color: textSec, marginTop: '4px' }}>
                      📍 {champions.fadheelaTopInstitution.place}
                    </div>
                  )}
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: '#8b5cf6', fontFamily: 'monospace', margin: '10px 0' }}>
                    {champions?.fadheelaTopInstitution?.points || 0}
                    <span style={{ fontSize: '0.9rem', color: textSec, marginLeft: '4px' }}>PTS</span>
                  </div>
                  <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '20px', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px' }}>
                    👑 FADHEELA CHAMPION
                  </div>
                </div>
              </div>

              {/* Runner-Up for Fadheela */}
              <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: '12px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: textSec, fontWeight: 600 }}>🥈 Runner-Up:</span>
                  <strong style={{ color: silver }}>{champions?.fadheelaRunnerUpInstitution?.name || 'Tallying...'} ({champions?.fadheelaRunnerUpInstitution?.points || 0} pts)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* TICKER FOOTER */}
          <div style={{
            textAlign: 'center',
            borderTop: `1px solid ${borderCol}`,
            paddingTop: '1.2rem',
            fontSize: '0.78rem',
            color: textSec,
            letterSpacing: '2px',
            fontWeight: 800,
            textTransform: 'uppercase'
          }}>
            ✨ CSWC HIYA FIESTA 2026 • OFFICIAL FESTIVAL RESULTS VERIFIED & PUBLISHED LIVE • CONGRATULATIONS TO ALL TEAMS ✨
          </div>
        </section>
      ) : (
        <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1.5rem' }}>
        
        {/* LEFT COL: LEADERBOARD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* PODIUM */}
          <div style={{ backgroundColor: panelBg, borderRadius: '12px', border: `1px solid ${borderCol}`, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {viewArea === 'FADHILA' 
                  ? 'FADHILA CATEGORY TOP 3 INSTITUTIONS' 
                  : viewArea === 'FADHEELA' 
                  ? 'FADHEELA CATEGORY TOP 3 INSTITUTIONS' 
                  : '🏆 OVERALL TOP 3 INSTITUTIONS'}
              </div>
              <div style={{ fontSize: '0.7rem', color: textSec, letterSpacing: '1px' }}>
                AUTO-UPDATING LIVE SCORE MATRIX <span style={{ color: '#10b981' }}>●</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1.5rem', paddingBottom: '1rem' }}>
              
              {/* 2nd Place */}
              {activeTop3[1] && (
                <div style={{ flex: 1, backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.5)' : '#f1f5f9', border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '1.5rem 1rem 2rem 1rem', textAlign: 'center', position: 'relative' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: silver, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', margin: '-30px auto 10px auto', border: `4px solid ${panelBg}` }}>2</div>
                  {activeTop3[1].logoUrl ? (
                    <img src={activeTop3[1].logoUrl} alt={activeTop3[1].name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '50%', margin: '0 auto 6px auto', display: 'block', backgroundColor: 'white', padding: '2px' }} />
                  ) : (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: activeTop3[1].flagColor || silver, margin: '0 auto 6px auto' }} />
                  )}
                  <div style={{ minHeight: '44px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{activeTop3[1].name}</div>
                    {activeTop3[1].place && (
                      <div style={{ fontSize: '0.66rem', color: textSec, fontWeight: 500, marginTop: '2px' }}>
                        📍 {activeTop3[1].place}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: textPri, margin: '10px 0 0 0' }}>{activeTop3[1].points}</div>
                  <div style={{ fontSize: '0.7rem', color: textSec, letterSpacing: '1px' }}>POINTS</div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, marginTop: '5px' }}>↑ {activeTop3[1].change || 0}</div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${silver}25, transparent)`, height: '24px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', fontSize: '0.62rem', color: silver, fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>🥈 RUNNER-UP</div>
                </div>
              )}

              {/* 1st Place */}
              {activeTop3[0] && (
                <div style={{ flex: 1.2, backgroundColor: theme === 'dark' ? 'rgba(251,191,36,0.05)' : '#fffbeb', border: `1px solid ${gold}`, borderRadius: '12px', padding: '2rem 1rem 2.2rem 1rem', textAlign: 'center', position: 'relative', boxShadow: theme === 'dark' ? `0 0 30px rgba(251,191,36,0.1)` : `0 10px 30px rgba(251,191,36,0.2)` }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: gold, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', margin: '-40px auto 10px auto', border: `4px solid ${panelBg}` }}>1</div>
                  {activeTop3[0].logoUrl ? (
                    <img src={activeTop3[0].logoUrl} alt={activeTop3[0].name} style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '50%', margin: '0 auto 6px auto', display: 'block', backgroundColor: 'white', padding: '2px' }} />
                  ) : (
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: activeTop3[0].flagColor || gold, margin: '0 auto 6px auto' }} />
                  )}
                  <div style={{ minHeight: '44px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{activeTop3[0].name}</div>
                    {activeTop3[0].place && (
                      <div style={{ fontSize: '0.68rem', color: textSec, fontWeight: 500, marginTop: '2px' }}>
                        📍 {activeTop3[0].place}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: gold, margin: '10px 0 0 0' }}>{activeTop3[0].points}</div>
                  <div style={{ fontSize: '0.75rem', color: textSec, letterSpacing: '1px' }}>POINTS</div>
                  <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, marginTop: '5px' }}>↑ {activeTop3[0].change || 0}</div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${gold}40, transparent)`, height: '30px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', fontSize: '0.7rem', color: gold, fontWeight: 900, letterSpacing: '1.5px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '6px' }}>👑 CHAMPION</div>
                </div>
              )}

              {/* 3rd Place */}
              {activeTop3[2] && (
                <div style={{ flex: 1, backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.5)' : '#f1f5f9', border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '1.5rem 1rem 2rem 1rem', textAlign: 'center', position: 'relative' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: bronze, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', margin: '-30px auto 10px auto', border: `4px solid ${panelBg}` }}>3</div>
                  {activeTop3[2].logoUrl ? (
                    <img src={activeTop3[2].logoUrl} alt={activeTop3[2].name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '50%', margin: '0 auto 6px auto', display: 'block', backgroundColor: 'white', padding: '2px' }} />
                  ) : (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: activeTop3[2].flagColor || bronze, margin: '0 auto 6px auto' }} />
                  )}
                  <div style={{ minHeight: '44px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{activeTop3[2].name}</div>
                    {activeTop3[2].place && (
                      <div style={{ fontSize: '0.66rem', color: textSec, fontWeight: 500, marginTop: '2px' }}>
                        📍 {activeTop3[2].place}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: textPri, margin: '10px 0 0 0' }}>{activeTop3[2].points}</div>
                  <div style={{ fontSize: '0.7rem', color: textSec, letterSpacing: '1px' }}>POINTS</div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, marginTop: '5px' }}>↑ {activeTop3[2].change || 0}</div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${bronze}25, transparent)`, height: '24px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', fontSize: '0.62rem', color: bronze, fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>🥉 2ND RUNNER-UP</div>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC LEADERBOARD TABLE (OVERALL / FADHILA / FADHEELA) */}
          <div style={{ backgroundColor: panelBg, borderRadius: '12px', border: `1px solid ${borderCol}`, flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '0.8rem 1rem', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: textSec }}>
                {viewArea === 'FADHILA' 
                  ? `Fadhila Category (Individual Programs Only • ${currentLeaderboard.filter((t: any) => t.points > 0).length} Scored / ${currentLeaderboard.length} Total)` 
                  : viewArea === 'FADHEELA' 
                  ? `Fadheela Category (Individual Programs Only • ${currentLeaderboard.filter((t: any) => t.points > 0).length} Scored / ${currentLeaderboard.length} Total)` 
                  : `Overall Institutions Leaderboard (Category + General Included • ${currentLeaderboard.length} Total)`}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                ● LIVE TALLY
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ color: textSec, fontSize: '0.65rem', letterSpacing: '1px', borderBottom: `1px solid ${borderCol}`, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', width: '70px' }}>RANK</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>
                    INSTITUTION
                  </th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '100px' }}>CODE</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '130px', color: '#38bdf8' }}>TOTAL POINTS</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '130px' }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', width: '90px' }}>UPDATED</th>
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
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: idx === 0 ? gold : idx === 1 ? silver : idx === 2 ? bronze : textSec }}>
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t.logoUrl ? (
                          <img src={t.logoUrl} alt={t.name} style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '50%', backgroundColor: 'white', padding: '1px', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: t.flagColor || '#ec4899', display: 'inline-block', flexShrink: 0 }}></span>
                        )}
                        <div>
                          <div style={{ color: idx === 0 ? gold : textPri }}>{t.name}</div>
                          {t.place && (
                            <div style={{ fontSize: '0.68rem', color: textSec, fontWeight: 500, marginTop: '1px' }}>
                              📍 {t.place}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: textSec, fontWeight: 600 }}>{t.code || t.prefixCode}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 900, color: '#38bdf8', fontSize: '1.05rem', fontFamily: 'monospace' }}>
                      {t.points}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', color: idx === 0 ? gold : idx === 1 ? silver : idx === 2 ? bronze : textSec }}>
                      {idx === 0 ? '👑 CHAMPION' : idx === 1 ? '🥈 RUNNER-UP' : idx === 2 ? '🥉 2ND RUNNER-UP' : `RANK #${idx + 1}`}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: textSec, fontSize: '0.72rem', fontFamily: 'monospace' }}>
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
