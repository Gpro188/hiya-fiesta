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
                              {top2.leaderPhoto ? (
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
                              {top1.leaderPhoto ? (
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
                              {top3.leaderPhoto ? (
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

          {/* HALL OF FAME TAB */}
          {!searchQuery && activeTab === "hall" && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', 
              gap: '28px' 
            }} className="dashboard-grid">
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.25rem' }}>👑</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Overall Top 5 Stars
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data.topStars.map((star, i) => (
                    <div 
                      key={star.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px', 
                        padding: '16px 20px', 
                        background: '#FFFFFF', 
                        borderRadius: '16px', 
                        border: i === 0 ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ 
                        fontSize: '1.3rem', 
                        fontWeight: 900, 
                        color: i === 0 ? '#F59E0B' : '#64748B', 
                        width: '32px',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        #{i+1}
                      </div>
                      <div style={{ 
                        width: '46px', 
                        height: '46px', 
                        borderRadius: '50%', 
                        border: `2px solid ${star.teamColor || '#881337'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#F8FAFC',
                        fontSize: '1.2rem'
                      }}>
                        ⭐
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>{star.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                          <span style={{ color: star.teamColor || '#881337', fontWeight: 700 }}>{star.teamName}</span> • {star.categoryName}
                        </div>
                      </div>
                      <div style={{ 
                        fontWeight: 900, 
                        fontSize: '1.2rem', 
                        color: '#0F172A',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        {star.points} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎖️</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Category Champions
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {Object.entries(data.categoryStars).map(([name, stars]) => (
                    <div 
                      key={name} 
                      style={{ 
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '18px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <h4 style={{ 
                        margin: '0 0 12px 0', 
                        color: '#881337', 
                        borderBottom: '1px solid #F1F5F9', 
                        paddingBottom: '8px',
                        fontSize: '0.95rem',
                        fontWeight: 800
                      }}>
                        {name}
                      </h4>
                      {stars.map((s, i) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', padding: '4px 0' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>{i+1}.</span>
                            <span style={{ fontWeight: 700, color: '#1E293B' }}>{s.name}</span>
                          </div>
                          <span style={{ fontWeight: 800, color: '#0F172A' }}>{s.points} pts</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

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

      {/* Responsive Breakpoint Styles */}
      <style jsx>{`
        @media (max-width: 840px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
}

