"use client";

import { useState, useEffect } from "react";
import { getPublicEventData } from "../actions/public";
import Link from "next/link";

export default function PublicDashboard({ 
  initialEvents, 
  initialActiveId 
}: { 
  initialEvents: any[], 
  initialActiveId?: string 
}) {
  const [activeEventId, setActiveEventId] = useState(initialActiveId || initialEvents[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"standings" | "hall" | "live">("standings");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<{ 
    latestResults: any[], 
    leaderboard: any[], 
    teams: any[],
    topStars: any[],
    categoryStars: Record<string, any[]>,
    stats?: {
        totalPrograms: number,
        publisheCSWCgrams: number,
        pendingPrograms: number,
        totalCandidates: number,
        totalParticipants: number
    }
  }>({ latestResults: [], leaderboard: [], teams: [], topStars: [], categoryStars: {} });
  const [loading, setLoading] = useState(true);
  const [selectedChampion, setSelectedChampion] = useState<any | null>(null);

  useEffect(() => {
    if (!activeEventId) return;

    const fetchData = async () => {
      setLoading(true);
      const res = await getPublicEventData(activeEventId);
      if (res.success && res.data) {
        setData(res.data);
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, [activeEventId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedChampion(null);
    };
    if (selectedChampion) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedChampion]);

  // Client-side filtering for simple search
  const filteredResults = data.latestResults.filter(res => 
    res.program?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.candidate?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.candidate?.chestNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [publishedIndex, setPublishedIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  const publishedPrograms = (data as any).latestPublishedPrograms || [];

  // Auto rotate through published results every 5 seconds with smooth fade out -> in
  useEffect(() => {
    if (publishedPrograms.length <= 1) return;

    const timer = setInterval(() => {
      setFadeState('out');
      setTimeout(() => {
        setPublishedIndex(prev => (prev + 1) % publishedPrograms.length);
        setFadeState('in');
      }, 350); // 350ms fade out transition
    }, 5000); // changes every 5 seconds

    return () => clearInterval(timer);
  }, [publishedPrograms.length]);

  const maxPoints = Math.max(...data.leaderboard.map(t => t.points), 1);
  const top1 = data.leaderboard[0];
  const top2 = data.leaderboard[1];
  const top3 = data.leaderboard[2];

  // Latest published highlight banner
  const latestPublished = data.latestResults[0];

  return (
    <div style={{ width: '100%', maxWidth: '1180px', margin: '0 auto' }}>
      
      {/* ── Sub-Event Switcher Pills (If multiple sub-events exist) ── */}
      {initialEvents && initialEvents.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ 
            display: 'inline-flex', 
            background: '#E2E8F0', 
            padding: '4px', 
            borderRadius: '9999px',
            gap: '4px',
            maxWidth: '100%',
            overflowX: 'auto'
          }}>
            {initialEvents.map(event => {
              const isActive = activeEventId === event.id;
              return (
                <button
                  key={event.id}
                  onClick={() => setActiveEventId(event.id)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isActive ? '#881337' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 2px 8px rgba(136, 19, 55, 0.25)' : 'none'
                  }}
                >
                  {event.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top 5 Statistics Ribbon (Hidden on mobile for ultra clean header) ── */}
      {data.stats && (
        <div 
          className="zone-stats-ribbon"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '4px',
            marginBottom: '32px',
          }}
        >
          {[
            { label: 'Total Programs', value: data.stats.totalPrograms, color: '#e6007e' },
            { label: 'Results Published', value: data.stats.publisheCSWCgrams, color: '#1f6d5a' },
            { label: 'Results Pending', value: data.stats.pendingPrograms, color: '#d97706' },
            { label: 'Total Candidates', value: data.stats.totalCandidates, color: '#e6007e' },
            { label: 'Live Participants', value: data.stats.totalParticipants, color: '#1a1420' }
          ].map((stat, i) => (
            <div 
              key={i} 
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px 12px',
                textAlign: 'center',
                boxShadow: '0 4px 15px -3px rgba(230, 0, 126, 0.08)',
                border: '1px solid #f2d9e6',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <div style={{ 
                fontSize: '1.75rem', 
                fontWeight: 700, 
                color: stat.color,
                lineHeight: 1.1,
                marginBottom: '4px',
                fontFamily: "'IBM Plex Mono', monospace"
              }}>
                {stat.value}
              </div>
              <div style={{ 
                fontSize: '0.68rem', 
                color: '#7a7480', 
                textTransform: 'uppercase', 
                fontWeight: 700, 
                letterSpacing: '0.08em',
                fontFamily: "'Inter', sans-serif"
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search Bar & Advanced Search ── */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '24px',
        width: '100%'
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
          <span style={{ 
            position: 'absolute', 
            left: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#94A3B8',
            fontSize: '0.95rem'
          }}>
            🔍
          </span>
          <input 
            type="text" 
            placeholder="Quick search by Programme or Chest Number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%',
              padding: '12px 18px 12px 44px', 
              borderRadius: '9999px', 
              background: '#FFFFFF', 
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 8px -1px rgba(0,0,0,0.04)',
              fontSize: '0.9rem',
              color: '#0F172A',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
          />
        </div>
        <Link 
          href={`/search${activeEventId ? `?eventId=${activeEventId}` : ''}`} 
          style={{ 
            borderRadius: '9999px', 
            padding: '11px 18px', 
            fontSize: '0.82rem', 
            whiteSpace: 'nowrap', 
            textDecoration: 'none',
            background: '#FFFFFF',
            color: '#334155',
            fontWeight: 700,
            border: '1px solid #CBD5E1',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px -1px rgba(0,0,0,0.04)'
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>⚙️</span> Advanced
        </Link>
      </div>

      {/* ── Just Published Result Animated Highlight Card with Fade Transitions ── */}
      {(() => {
        const programsList = publishedPrograms.length > 0 ? publishedPrograms : (latestPublished ? [{
          program: { id: latestPublished.program?.id, name: latestPublished.program?.name, categoryName: latestPublished.candidate?.category?.name },
          winners: [{
            rank: latestPublished.rank,
            grade: latestPublished.grade,
            name: latestPublished.candidate?.name || latestPublished.team?.name,
            teamName: latestPublished.candidate?.team?.name || latestPublished.team?.name,
            teamPrefix: (latestPublished.candidate?.team as any)?.prefixCode || (latestPublished.team as any)?.prefixCode,
            points: latestPublished.points
          }]
        }] : []);

        if (programsList.length === 0) return null;

        const currentProg = programsList[publishedIndex % programsList.length];

        return (
          <div 
            style={{
              background: 'linear-gradient(135deg, #e6007e 0%, #a3005c 60%, #5b0033 100%)',
              borderRadius: '20px',
              padding: '20px 22px',
              color: '#FFFFFF',
              marginBottom: '28px',
              boxShadow: '0 12px 32px -4px rgba(230, 0, 126, 0.4), 0 0 16px rgba(255, 79, 163, 0.25)',
              position: 'relative',
              overflow: 'hidden',
              border: '1.5px solid rgba(255, 255, 255, 0.22)'
            }}
          >
            {/* Shimmer Ambient Glow Overlay */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(ellipse at 80% 20%, rgba(255, 255, 255, 0.18) 0%, transparent 60%)',
                pointerEvents: 'none'
              }} 
            />

            {/* Smooth Fade Transition Container */}
            <div 
              style={{ 
                position: 'relative', 
                zIndex: 1,
                opacity: fadeState === 'in' ? 1 : 0,
                transform: fadeState === 'in' ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.99)',
                transition: 'opacity 0.35s ease-in-out, transform 0.35s ease-in-out'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#FFFFFF',
                    color: '#e6007e',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    ⚡ JUST PUBLISHED
                  </span>

                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.15rem', 
                    fontFamily: "'Fraunces', serif", 
                    fontWeight: 800, 
                    color: '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {currentProg.program.name}
                    {currentProg.program.categoryName && (
                      <span style={{
                        fontSize: '0.72rem',
                        color: '#FFFFFF',
                        background: 'rgba(255, 255, 255, 0.25)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontFamily: "'Inter', sans-serif"
                      }}>
                        {currentProg.program.categoryName}
                      </span>
                    )}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {programsList.length > 1 && (
                    <span style={{ 
                      fontSize: '0.72rem', 
                      color: 'rgba(255,255,255,0.75)', 
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontWeight: 700
                    }}>
                      {(publishedIndex % programsList.length) + 1} / {programsList.length}
                    </span>
                  )}
                  <Link 
                    href={`/results/${currentProg.program.id}?eventId=${activeEventId}`}
                    style={{
                      color: '#e6007e',
                      background: '#FFFFFF',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    Winner Board →
                  </Link>
                </div>
              </div>

              {/* 3 Places Horizontal Cards / Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
                marginTop: '10px'
              }}>
                {currentProg.winners.slice(0, 3).map((w: any, idx: number) => {
                  const rankNum = w.rank || (idx + 1);
                  const medal = rankNum === 1 ? '🥇 1st' : rankNum === 2 ? '🥈 2nd' : '🥉 3rd';
                  const rankBadgeBg = rankNum === 1 
                    ? 'linear-gradient(135deg, #FDE68A, #F59E0B)' 
                    : rankNum === 2 
                    ? 'linear-gradient(135deg, #F1F5F9, #CBD5E1)' 
                    : 'linear-gradient(135deg, #FFEDD5, #D97706)';
                  
                  // Short institution name
                  const rawTeam = w.teamName || '';
                  const shortTeam = rawTeam.length > 24 ? rawTeam.slice(0, 22) + '…' : rawTeam;

                  return (
                    <div 
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.14)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <span style={{
                        background: rankBadgeBg,
                        color: '#1a1420',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }}>
                        {medal}
                      </span>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ 
                          fontWeight: 800, 
                          color: '#FFFFFF', 
                          fontSize: '0.88rem', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }}>
                          {w.name}
                        </div>
                        <div style={{ 
                          fontSize: '0.72rem', 
                          color: 'rgba(255, 255, 255, 0.82)', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }} title={rawTeam}>
                          {w.teamPrefix ? `${w.teamPrefix} • ` : ''}{shortTeam}
                        </div>
                      </div>

                      {w.points > 0 && (
                        <div style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: 900, 
                          color: '#FDE68A', 
                          fontFamily: "'IBM Plex Mono', monospace",
                          flexShrink: 0 
                        }}>
                          {w.points}p
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Sub Navigation Tabs ── */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '18px', 
        borderBottom: '2px solid #f2d9e6',
        paddingBottom: '2px',
        marginBottom: '28px'
      }}>
        {[
          { id: 'standings', label: '🏆 Standings' },
          { id: 'hall', label: '⭐ Hall of Fame' },
          { id: 'live', label: '📡 Live Feed' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                color: isActive ? '#e6007e' : '#7a7480',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.92rem',
                cursor: 'pointer',
                borderBottom: isActive ? '3px solid #e6007e' : '3px solid transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
            Loading Live Results...
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Fetching realtime standings and points</div>
        </div>
      ) : (
        <>
          {/* SEARCH RESULTS VIEW (Overlays other tabs if searching) */}
          {searchQuery && (
            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
                Search Results ({filteredResults.length})
              </h3>
              <div style={{ 
                background: '#FFFFFF', 
                borderRadius: '16px', 
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 4px 15px -2px rgba(0,0,0,0.05)'
              }}>
                {filteredResults.length > 0 ? filteredResults.map((result, i) => (
                  <Link 
                    key={i} 
                    href={`/results/${result.program.id}?eventId=${activeEventId}`} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px 20px', 
                      borderBottom: i < filteredResults.length - 1 ? '1px solid #F1F5F9' : 'none', 
                      color: 'inherit',
                      textDecoration: 'none'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                        {result.candidate?.name || result.team?.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                        {result.program?.name} {result.candidate?.chestNumber ? `• Chest #${result.candidate.chestNumber}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#881337', fontWeight: 800, fontSize: '0.95rem' }}>
                        {result.rank ? `${result.rank}${result.rank === 1 ? 'st' : result.rank === 2 ? 'nd' : 'rd'} Place` : result.grade || 'Result'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                        +{result.points} pts
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                    No programmes or candidates matched &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* STANDINGS TAB */}
          {!searchQuery && activeTab === "standings" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              
              {/* Full Width Section: Team Leaderboard & Podium */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🏆</span>
                  <div>
                    <h2 style={{ 
                      fontSize: '1.35rem', 
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 800, 
                      color: '#1a1420', 
                      margin: 0 
                    }}>
                      Team Leaderboard
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#7a7480', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                      Live cumulative standings across all events
                    </p>
                  </div>
                </div>

                {/* Top 3 Leaderboard: Desktop Step Podium & Mobile Compact Horizontal Ribbon Strip */}
                {data.leaderboard.length > 0 && (
                  <div>
                    {/* DESKTOP / TABLET: 3D Step Podium View */}
                    <div 
                      className="desktop-podium-view"
                      style={{
                        width: '100%',
                        background: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '36px 28px 24px 28px',
                        border: '1px solid #f2d9e6',
                        boxShadow: '0 8px 30px -4px rgba(230, 0, 126, 0.08)',
                        marginBottom: '24px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: 'clamp(16px, 4vw, 40px)',
                        minHeight: '240px',
                        paddingBottom: '8px',
                        maxWidth: '100%'
                      }}>
                        
                        {/* 2nd Place Podium */}
                        {top2 && (
                          <div style={{ flex: 1, maxWidth: '280px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '50%',
                              background: top2.flagColor || 'linear-gradient(135deg, #e6007e, #a3005c)',
                              color: '#FFFFFF',
                              fontWeight: 900,
                              fontSize: '1.05rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(230, 0, 126, 0.25)',
                              position: 'relative',
                              marginBottom: '8px',
                              overflow: 'visible'
                            }}>
                              {top2.logoUrl ? (
                                <img 
                                  src={top2.logoUrl} 
                                  alt={top2.name} 
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain', backgroundColor: '#ffffff', padding: '3px' }} 
                                />
                              ) : top2.leaderPhoto ? (
                                <img 
                                  src={top2.leaderPhoto} 
                                  alt={top2.name} 
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                                />
                              ) : (
                                top2.name?.substring(0, 2).toUpperCase() || '2'
                              )}
                              <span style={{
                                position: 'absolute',
                                bottom: '-4px',
                                right: '-4px',
                                background: '#94A3B8',
                                color: '#FFFFFF',
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #FFFFFF'
                              }}>
                                #2
                              </span>
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1420', lineHeight: 1.2, fontFamily: "'Fraunces', serif" }}>
                              {top2.name}
                            </div>
                            {top2.place && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                📍 {top2.place}
                              </div>
                            )}
                            {top2.leaderName && (
                              <div style={{ fontSize: '0.72rem', color: '#7a7480', marginTop: '2px', fontFamily: "'Inter', sans-serif" }}>
                                Leader: {top2.leaderName}
                              </div>
                            )}
                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#e6007e', marginTop: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
                              {top2.points} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7a7480' }}>PTS</span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '90px',
                              background: 'linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 100%)',
                              borderRadius: '14px 14px 0 0',
                              marginTop: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.6rem',
                              fontWeight: 900,
                              color: '#475569',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                            }}>
                              2
                            </div>
                          </div>
                        )}

                        {/* 1st Place Podium (Elevated in Center) */}
                        {top1 && (
                          <div style={{ flex: 1.2, maxWidth: '320px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              background: top1.flagColor || 'linear-gradient(135deg, #ff4fa3, #e6007e)',
                              color: '#FFFFFF',
                              fontWeight: 900,
                              fontSize: '1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 6px 18px rgba(230, 0, 126, 0.4)',
                              position: 'relative',
                              marginBottom: '8px',
                              overflow: 'visible'
                            }}>
                              {top1.logoUrl ? (
                                <img 
                                  src={top1.logoUrl} 
                                  alt={top1.name} 
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain', backgroundColor: '#ffffff', padding: '4px' }} 
                                />
                              ) : top1.leaderPhoto ? (
                                <img 
                                  src={top1.leaderPhoto} 
                                  alt={top1.name} 
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                                />
                              ) : (
                                top1.name?.substring(0, 2).toUpperCase() || '1'
                              )}
                              <span style={{
                                position: 'absolute',
                                bottom: '-4px',
                                right: '-4px',
                                background: '#F59E0B',
                                color: '#FFFFFF',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #FFFFFF'
                              }}>
                                #1
                              </span>
                            </div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1a1420', lineHeight: 1.2, fontFamily: "'Fraunces', serif" }}>
                              {top1.name}
                            </div>
                            {top1.place && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                📍 {top1.place}
                              </div>
                            )}
                            {top1.leaderName && (
                              <div style={{ fontSize: '0.75rem', color: '#7a7480', marginTop: '2px', fontFamily: "'Inter', sans-serif" }}>
                                Leader: {top1.leaderName}
                              </div>
                            )}
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#e6007e', marginTop: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
                              {top1.points} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7a7480' }}>PTS</span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '130px',
                              background: 'linear-gradient(180deg, #FDE68A 0%, #F59E0B 100%)',
                              borderRadius: '16px 16px 0 0',
                              marginTop: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '2rem',
                              fontWeight: 900,
                              color: '#78350F',
                              boxShadow: '0 6px 16px rgba(245, 158, 11, 0.3)'
                            }}>
                              <span style={{ fontSize: '1.25rem' }}>👑</span>
                              1
                            </div>
                          </div>
                        )}

                        {/* 3rd Place Podium */}
                        {top3 && (
                          <div style={{ flex: 1, maxWidth: '280px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '50%',
                              background: top3.flagColor || 'linear-gradient(135deg, #c9a227, #8a6d16)',
                              color: '#FFFFFF',
                              fontWeight: 900,
                              fontSize: '1.05rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(201, 162, 39, 0.25)',
                              position: 'relative',
                              marginBottom: '8px',
                              overflow: 'visible'
                            }}>
                              {top3.logoUrl ? (
                                <img 
                                  src={top3.logoUrl} 
                                  alt={top3.name} 
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain', backgroundColor: '#ffffff', padding: '3px' }} 
                                />
                              ) : top3.leaderPhoto ? (
                                <img 
                                  src={top3.leaderPhoto} 
                                  alt={top3.name} 
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                                />
                              ) : (
                                top3.name?.substring(0, 2).toUpperCase() || '3'
                              )}
                              <span style={{
                                position: 'absolute',
                                bottom: '-4px',
                                right: '-4px',
                                background: '#D97706',
                                color: '#FFFFFF',
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #FFFFFF'
                              }}>
                                #3
                              </span>
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1420', lineHeight: 1.2, fontFamily: "'Fraunces', serif" }}>
                              {top3.name}
                            </div>
                            {top3.place && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                📍 {top3.place}
                              </div>
                            )}
                            {top3.leaderName && (
                              <div style={{ fontSize: '0.72rem', color: '#7a7480', marginTop: '2px', fontFamily: "'Inter', sans-serif" }}>
                                Leader: {top3.leaderName}
                              </div>
                            )}
                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#e6007e', marginTop: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
                              {top3.points} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7a7480' }}>PTS</span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '70px',
                              background: 'linear-gradient(180deg, #FED7AA 0%, #F97316 100%)',
                              borderRadius: '14px 14px 0 0',
                              marginTop: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.6rem',
                              fontWeight: 900,
                              color: '#7C2D12',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                            }}>
                              3
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* MOBILE ONLY: Big Gradient Highlight Cards with Full Names */}
                    <div className="mobile-ribbon-view" style={{ flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
                      
                      {/* #1 Champion Big Gradient Card */}
                      {top1 && (
                        <div style={{
                          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FFFFFF 100%)',
                          borderRadius: '18px',
                          padding: '18px 18px',
                          border: '2px solid #F59E0B',
                          boxShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.28), 0 0 16px rgba(230, 0, 126, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                              color: '#78350F',
                              fontWeight: 900,
                              fontSize: '1.1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                              flexShrink: 0,
                              border: '2.5px solid #FFFFFF'
                            }}>
                              <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>👑</span>
                              <span style={{ fontSize: '0.95rem', lineHeight: 1, fontWeight: 900 }}>#1</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 900,
                                fontSize: '1.02rem',
                                color: '#1a1420',
                                fontFamily: "'Fraunces', serif",
                                lineHeight: 1.3,
                                wordBreak: 'break-word'
                              }}>
                                {top1.name}
                              </div>
                              {top1.place && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                  📍 {top1.place}
                                </div>
                              )}
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#B45309', 
                                marginTop: '3px', 
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 700
                              }}>
                                {top1.leaderName ? `Leader: ${top1.leaderName}` : '1st Place Champion'}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '6px' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#e6007e', fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                              {top1.points}
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginTop: '4px' }}>
                              Points
                            </div>
                          </div>
                        </div>
                      )}

                      {/* #2 Runner Up Gradient Card */}
                      {top2 && (
                        <div style={{
                          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #FFFFFF 100%)',
                          borderRadius: '16px',
                          padding: '16px 16px',
                          border: '1.5px solid #94A3B8',
                          boxShadow: '0 4px 16px -2px rgba(148, 163, 184, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #F1F5F9 0%, #94A3B8 100%)',
                              color: '#1E293B',
                              fontWeight: 900,
                              fontSize: '0.95rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
                              flexShrink: 0,
                              border: '2px solid #FFFFFF'
                            }}>
                              #2
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 800,
                                fontSize: '0.96rem',
                                color: '#1a1420',
                                fontFamily: "'Fraunces', serif",
                                lineHeight: 1.3,
                                wordBreak: 'break-word'
                              }}>
                                {top2.name}
                              </div>
                              {top2.place && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                  📍 {top2.place}
                                </div>
                              )}
                              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '3px', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                                {top2.leaderName ? `Leader: ${top2.leaderName}` : '2nd Place Runner Up'}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '6px' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#e6007e', fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                              {top2.points}
                            </div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginTop: '4px' }}>
                              PTS
                            </div>
                          </div>
                        </div>
                      )}

                      {/* #3 2nd Runner Up Gradient Card */}
                      {top3 && (
                        <div style={{
                          background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FFFFFF 100%)',
                          borderRadius: '16px',
                          padding: '16px 16px',
                          border: '1.5px solid #F97316',
                          boxShadow: '0 4px 16px -2px rgba(249, 115, 22, 0.18)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #FED7AA 0%, #F97316 100%)',
                              color: '#7C2D12',
                              fontWeight: 900,
                              fontSize: '0.95rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 3px 8px rgba(249, 115, 22, 0.25)',
                              flexShrink: 0,
                              border: '2px solid #FFFFFF'
                            }}>
                              #3
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 800,
                                fontSize: '0.96rem',
                                color: '#1a1420',
                                fontFamily: "'Fraunces', serif",
                                lineHeight: 1.3,
                                wordBreak: 'break-word'
                              }}>
                                {top3.name}
                              </div>
                              {top3.place && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                  📍 {top3.place}
                                </div>
                              )}
                              <div style={{ fontSize: '0.72rem', color: '#C2410C', marginTop: '3px', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                                {top3.leaderName ? `Leader: ${top3.leaderName}` : '3rd Place Runner Up'}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '6px' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#e6007e', fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                              {top3.points}
                            </div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', marginTop: '4px' }}>
                              PTS
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* Ranked List of Remaining Teams (Starting from 4th Position) */}
                {data.leaderboard.length > 3 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.leaderboard.slice(3).map((team, index) => {
                      const rank = index + 4;
                      const rankColor = '#7a7480';
                      return (
                        <div 
                          key={team.id}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: '14px',
                            padding: '16px 20px',
                            border: '1px solid #f2d9e6',
                            borderLeft: `4px solid ${team.flagColor || rankColor}`,
                            boxShadow: '0 2px 10px -2px rgba(230, 0, 126, 0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <span style={{
                                background: rankColor,
                                color: '#FFFFFF',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontFamily: "'IBM Plex Mono', monospace",
                                flexShrink: 0
                              }}>
                                #{rank}
                              </span>
                              {team.logoUrl && (
                                <img 
                                  src={team.logoUrl} 
                                  alt="" 
                                  style={{ 
                                    width: '26px', 
                                    height: '26px', 
                                    borderRadius: '50%', 
                                    objectFit: 'contain', 
                                    backgroundColor: '#ffffff', 
                                    border: '1px solid #e2e8f0', 
                                    padding: '2px',
                                    flexShrink: 0 
                                  }} 
                                />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ 
                                  fontWeight: 800, 
                                  fontSize: 'clamp(0.85rem, 3.2vw, 0.98rem)', 
                                  color: '#1a1420', 
                                  fontFamily: "'Fraunces', serif",
                                  lineHeight: 1.2
                                }}>
                                  {team.name}
                                </div>
                                {team.place && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                    📍 {team.place}
                                  </div>
                                )}
                                {team.leaderName && (
                                  <div style={{ fontSize: '0.7rem', color: '#7a7480', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
                                    Leader: {team.leaderName}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
                              <div style={{ 
                                fontSize: 'clamp(1.1rem, 4vw, 1.25rem)', 
                                fontWeight: 700, 
                                color: '#e6007e',
                                fontFamily: "'IBM Plex Mono', monospace"
                              }}>
                                {team.points} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7a7480' }}>pts</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div style={{ 
                            height: '6px', 
                            background: '#fcebf3', 
                            borderRadius: '9999px', 
                            overflow: 'hidden' 
                          }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${Math.max((team.points / maxPoints) * 100, 2)}%`, 
                              background: team.flagColor || rankColor,
                              borderRadius: '9999px',
                              transition: 'width 0.8s ease-out'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* Lower Section: Team Details Cards Grid */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🚩</span>
                  <h3 style={{ 
                    fontSize: '1.35rem', 
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 800, 
                    color: '#1a1420', 
                    margin: 0 
                  }}>
                    Team Details
                  </h3>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '20px' 
                }}>
                  {data.leaderboard.map((team, idx) => {
                    const topBorderColor = idx === 0 ? '#e6007e' : idx === 1 ? '#1f6d5a' : idx === 2 ? '#d97706' : '#f2d9e6';
                    return (
                      <div 
                        key={team.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '18px',
                          padding: '26px 20px',
                          border: '1px solid #f2d9e6',
                          borderTop: `4px solid ${team.flagColor || topBorderColor}`,
                          boxShadow: '0 6px 20px -3px rgba(230, 0, 126, 0.06)',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: team.flagColor || 'linear-gradient(135deg, #e6007e, #a3005c)',
                          color: '#FFFFFF',
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '4px',
                          overflow: 'hidden'
                        }}>
                          {team.leaderPhoto ? (
                            <img 
                              src={team.leaderPhoto} 
                              alt={team.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            team.name ? team.name.substring(0, 2).toUpperCase() : 'TM'
                          )}
                        </div>

                        <div style={{ fontWeight: 800, fontSize: '1.08rem', color: '#1a1420', fontFamily: "'Fraunces', serif" }}>
                          {team.name}
                        </div>
                        
                        {team.leaderName && (
                          <div style={{ fontSize: '0.8rem', color: '#7a7480', fontFamily: "'Inter', sans-serif" }}>
                            Leader: {team.leaderName}
                          </div>
                        )}

                        <div style={{ 
                          fontSize: '1.4rem', 
                          fontWeight: 700, 
                          color: '#e6007e', 
                          marginTop: '6px',
                          fontFamily: "'IBM Plex Mono', monospace"
                        }}>
                          {team.points} <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7a7480' }}>PTS</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* HALL OF FAME TAB - CATEGORY CHAMPIONS (TOP 3) */}
          {!searchQuery && activeTab === "hall" && (
            <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: '12px', 
                marginBottom: '24px',
                background: 'linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%)',
                padding: '20px 24px',
                borderRadius: '16px',
                border: '1px solid #fbcfe8'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🏆</span>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#881337', margin: 0, fontFamily: "'Fraunces', serif" }}>
                      Category Champions
                    </h2>
                  </div>
                  <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                    Top 3 stars in each category. Click any champion to view their complete results and point calculation breakdown.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#be185d', background: '#ffffff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #fbcfe8' }}>
                  <span>✨ Top 3 Ranked per Category</span>
                </div>
              </div>

              {Object.keys(data.categoryStars).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#64748B' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎖️</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E293B' }}>No Published Results Yet</div>
                  <div style={{ fontSize: '0.88rem', marginTop: '6px' }}>Category champions will appear here once competition results are officially published.</div>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                  gap: '24px' 
                }}>
                  {Object.entries(data.categoryStars).map(([catName, stars]) => (
                    <div 
                      key={catName} 
                      style={{ 
                        background: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '22px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.1rem' }}>🎓</span>
                          <h3 style={{ 
                            margin: 0, 
                            color: '#881337', 
                            fontSize: '1.12rem',
                            fontWeight: 800,
                            letterSpacing: '0.02em',
                            fontFamily: "'Fraunces', serif"
                          }}>
                            {catName}
                          </h3>
                        </div>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          color: '#475569', 
                          background: '#f8fafc', 
                          border: '1px solid #cbd5e1', 
                          padding: '3px 9px', 
                          borderRadius: '12px' 
                        }}>
                          Top 3 Stars
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                        {stars.map((s, i) => {
                          const medalIcons = ['🥇', '🥈', '🥉'];
                          const medalBorder = i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : '#D97706';
                          const medalBg = i === 0 ? '#FEF3C7' : i === 1 ? '#F1F5F9' : '#FFEDD5';

                          return (
                            <div 
                              key={s.id} 
                              onClick={() => setSelectedChampion(s)}
                              role="button"
                              tabIndex={0}
                              title="Click to view all results and point breakdown"
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                gap: '12px',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: i === 0 ? 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)' : '#f8fafc',
                                border: `1.5px solid ${i === 0 ? '#fde68a' : '#e2e8f0'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              className="category-champion-row"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  background: medalBg,
                                  border: `1px solid ${medalBorder}`,
                                  fontSize: '1rem',
                                  flexShrink: 0
                                }}>
                                  {medalIcons[i]}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ 
                                    fontWeight: 700, 
                                    color: '#0f172a', 
                                    fontSize: '0.92rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {s.name}
                                  </div>
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#64748b', 
                                    marginTop: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flexWrap: 'wrap'
                                  }}>
                                    {s.chestNumber && (
                                      <span style={{ 
                                        fontWeight: 700, 
                                        background: '#e2e8f0', 
                                        color: '#334155', 
                                        padding: '1px 5px', 
                                        borderRadius: '4px',
                                        fontSize: '0.7rem' 
                                      }}>
                                        #{s.chestNumber}
                                      </span>
                                    )}
                                    <span style={{ 
                                      color: s.teamColor || '#881337', 
                                      fontWeight: 600,
                                      maxWidth: '160px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {s.teamName}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ 
                                  fontWeight: 800, 
                                  color: '#0f172a', 
                                  fontSize: '1.05rem',
                                  fontFamily: "'IBM Plex Mono', monospace"
                                }}>
                                  {s.points} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>pts</span>
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                                  View breakdown ➔
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LIVE FEED TAB */}
          {!searchQuery && activeTab === "live" && (
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#10B981', borderRadius: '50%' }}></span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Recent Updates (Latest 10)
                </h2>
              </div>

              <div style={{ 
                background: '#FFFFFF', 
                borderRadius: '16px', 
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 4px 15px -2px rgba(0,0,0,0.05)'
              }}>
                {data.latestResults.map((res, i) => (
                  <Link 
                    key={res.id} 
                    href={`/results/${res.program.id}?eventId=${activeEventId}`} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '18px 22px', 
                      borderBottom: i < data.latestResults.length - 1 ? '1px solid #F1F5F9' : 'none', 
                      color: 'inherit',
                      textDecoration: 'none',
                      background: i === 0 ? 'rgba(16, 185, 129, 0.04)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '50%', 
                        border: `2px solid ${res.candidate?.team?.flagColor || res.team?.flagColor || '#881337'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#F8FAFC',
                        fontSize: '1.2rem'
                      }}>
                        🏆
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A' }}>
                          {res.candidate?.name || res.team?.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                          {res.program?.name} • <span style={{ fontWeight: 700 }}>{res.candidate?.team?.name || res.team?.name}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#881337', fontWeight: 800, fontSize: '0.95rem' }}>
                        {res.rank ? `${res.rank}${res.rank === 1 ? 'st' : res.rank === 2 ? 'nd' : 'rd'} Place` : res.grade || 'Result'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                        +{res.points} pts
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </>
      )}

      {/* ── Champion Detailed Results & Point Breakdown Modal ── */}
      {selectedChampion && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedChampion(null);
          }}
        >
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'fadeSlideUp 0.25s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)',
              color: '#FFFFFF',
              padding: '24px 28px',
              position: 'relative'
            }}>
              <button 
                onClick={() => setSelectedChampion(null)}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: '#ffffff',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  padding: '3px 10px', 
                  borderRadius: '20px', 
                  fontSize: '0.78rem', 
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}>
                  🏆 CATEGORY CHAMPION
                </span>
                <span style={{ 
                  background: '#F59E0B', 
                  color: '#78350F', 
                  padding: '3px 10px', 
                  borderRadius: '20px', 
                  fontSize: '0.78rem', 
                  fontWeight: 800 
                }}>
                  {selectedChampion.categoryName}
                </span>
              </div>

              <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: 800, fontFamily: "'Fraunces', serif" }}>
                {selectedChampion.name}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.88rem', opacity: 0.95 }}>
                {selectedChampion.chestNumber && (
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    Chest #{selectedChampion.chestNumber}
                  </span>
                )}
                <span>🏛️ {selectedChampion.teamName}</span>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
              
              {/* Summary Score Ribbon */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: '12px', 
                marginBottom: '24px' 
              }}>
                <div style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#be185d', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {selectedChampion.points}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#881337', textTransform: 'uppercase', marginTop: '2px' }}>
                    Total Points
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#15803d', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {selectedChampion.results?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginTop: '2px' }}>
                    Programs Won
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#1d4ed8', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {selectedChampion.results?.filter((r: any) => r.rank === 1).length || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginTop: '2px' }}>
                    1st Positions
                  </div>
                </div>
              </div>

              {/* Point Type Rule Guide */}
              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px', 
                padding: '10px 16px', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#475569'
              }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>📊 Point Types:</span>
                <span><strong>Rank:</strong> 1st=5 pts, 2nd=3 pts, 3rd=1 pt</span>
                <span>•</span>
                <span><strong>Grade:</strong> A=5 pts, B=3 pts, C=1 pt</span>
              </div>

              {/* Program Results List */}
              <h4 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> All Results & Point Breakdown
              </h4>

              {(!selectedChampion.results || selectedChampion.results.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No published individual results recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedChampion.results.map((res: any, idx: number) => {
                    const rankBadge = res.rank === 1 ? '🥇 1st Rank' : res.rank === 2 ? '🥈 2nd Rank' : res.rank === 3 ? '🥉 3rd Rank' : null;
                    const stageLabel = res.stageType === 'OFF_STAGE' ? '🎨 Off-Stage' : '🎭 On-Stage';

                    return (
                      <div 
                        key={res.id || idx}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '16px 18px',
                          background: '#FFFFFF',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                              {res.programCode && <span style={{ color: '#881337', marginRight: '6px' }}>[{res.programCode}]</span>}
                              {res.programName}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                {stageLabel}
                              </span>
                              {rankBadge && (
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  background: res.rank === 1 ? '#fef3c7' : res.rank === 2 ? '#f1f5f9' : '#ffedd5', 
                                  color: res.rank === 1 ? '#92400e' : res.rank === 2 ? '#334155' : '#9a3412', 
                                  padding: '2px 8px', 
                                  borderRadius: '6px', 
                                  fontWeight: 800 
                                }}>
                                  {rankBadge}
                                </span>
                              )}
                              {res.grade && (
                                <span style={{ 
                                  fontSize: '0.75rem', 
                                  background: '#dcfce7', 
                                  color: '#166534', 
                                  padding: '2px 8px', 
                                  borderRadius: '6px', 
                                  fontWeight: 800 
                                }}>
                                  Grade {res.grade}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ 
                            background: '#fdf2f8', 
                            border: '1px solid #fbcfe8', 
                            padding: '6px 12px', 
                            borderRadius: '10px', 
                            textAlign: 'right' 
                          }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#be185d', fontFamily: "'IBM Plex Mono', monospace" }}>
                              +{res.points} <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#881337' }}>PTS</span>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Point Type Formula */}
                        <div style={{ 
                          background: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          padding: '8px 12px', 
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>
                            Point Type: <strong style={{ color: '#0f172a' }}>{res.pointType}</strong>
                          </span>
                          <span style={{ color: '#0369a1', fontWeight: 700 }}>
                            {res.rankPoints > 0 ? `Rank: ${res.rankPoints} pts` : ''} 
                            {res.rankPoints > 0 && res.gradePoints > 0 ? ' + ' : ''}
                            {res.gradePoints > 0 ? `Grade: ${res.gradePoints} pts` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#fafafa'
            }}>
              <button 
                onClick={() => setSelectedChampion(null)}
                style={{
                  background: '#881337',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 22px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Breakpoint Styles */}
      <style jsx>{`
        .category-champion-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -2px rgba(136, 19, 55, 0.12) !important;
          border-color: #f472b6 !important;
        }
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 840px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
}

