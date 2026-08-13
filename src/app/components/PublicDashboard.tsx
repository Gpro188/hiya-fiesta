"use client";

import { useState, useEffect } from "react";
import { getPublicEventData } from "../actions/public";
import Link from "next/link";

export default function PublicDashboard({ initialEvents, initialActiveId }: { initialEvents: any[], initialActiveId?: string }) {
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
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [activeEventId]);

  // Client-side filtering for simple search
  const filteredResults = data.latestResults.filter(res => 
    res.program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.candidate?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.candidate?.chestNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxPoints = Math.max(...data.leaderboard.map(t => t.points), 1);

  return (
    <div className="animate-fade-in">
      {/* Event & Search Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 'var(--spacing-lg)', 
        marginBottom: 'var(--spacing-xl)',
        alignItems: 'center' 
      }}>
        {/* Event Switcher */}
        <div style={{ display: 'flex', background: 'var(--surface-color)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          {initialEvents.map(event => (
            <button
              key={event.id}
              onClick={() => setActiveEventId(event.id)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: activeEventId === event.id ? 'var(--primary)' : 'transparent',
                color: activeEventId === event.id ? 'white' : 'var(--text-secondary)',
                fontWeight: activeEventId === event.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {event.name}
            </button>
          ))}
        </div>

        {/* Stats Ribbon */}
        {data.stats && (
            <div className="mobile-stats-list" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                gap: '15px', 
                width: '100%', 
                maxWidth: '1000px' 
            }}>
                {[
                    { label: 'Total Programs', value: data.stats.totalPrograms, icon: '📋', color: 'var(--primary)' },
                    { label: 'Results Published', value: data.stats.publisheCSWCgrams, icon: '✅', color: 'var(--success)' },
                    { label: 'Results Pending', value: data.stats.pendingPrograms, icon: '⏳', color: 'var(--warning)' },
                    { label: 'Total Candidates', value: data.stats.totalCandidates, icon: '👥', color: 'var(--secondary)' },
                    { label: 'Live Participants', value: data.stats.totalParticipants, icon: '🎭', color: 'var(--accent)' }
                ].map((stat, i) => (
                    <div key={i} className="stat-card" style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center', 
                        borderTop: `3px solid ${stat.color}`,
                        background: 'var(--surface-color)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div className="stat-icon" style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{stat.icon}</div>
                        <div className="stat-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
                        <div className="stat-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{stat.label}</div>
                    </div>
                ))}
            </div>
        )}

        <style jsx>{`
            @media (max-width: 768px) {
                .mobile-stats-list {
                    grid-template-columns: 1fr !important;
                    gap: 8px !important;
                }
                .stat-card {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 10px 15px !important;
                    text-align: left !important;
                    border-bottom: none !important;
                    border-left: 4px solid var(--primary) !important;
                }
                .stat-icon {
                    margin-bottom: 0 !important;
                    margin-right: 10px !important;
                    font-size: 1rem !important;
                }
                .stat-value {
                    font-size: 1.1rem !important;
                    order: 3;
                }
                .stat-label {
                    flex: 1;
                    font-size: 0.75rem !important;
                }
            }
        `}</style>

        {/* Search Input & Advanced Search Link */}
        <div style={{ display: 'flex', width: '100%', maxWidth: '680px', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
                <input 
                    type="text" 
                    placeholder="Quick search by Program or Chest Number..." 
                    className="form-input"
                    style={{ paddingLeft: '45px', borderRadius: 'var(--radius-full)', background: 'var(--surface-color)', borderColor: 'var(--border-color-strong)' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Link 
                href={`/search${activeEventId ? `?eventId=${activeEventId}` : ''}`} 
                className="btn btn-secondary"
                style={{ borderRadius: 'var(--radius-full)', padding: '0.625rem 1.25rem', fontSize: '0.85rem', whiteSpace: 'nowrap', textDecoration: 'none' }}
            >
                ⚙️ Advanced Search
            </Link>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: '10px', flexWrap: 'wrap' }}>
            {[
                { id: 'standings', label: '📊 Standings', color: '#D97706' },
                { id: 'hall', label: '⭐ Hall of Fame', color: '#E11D48' },
                { id: 'live', label: '🔥 Live Feed', color: '#059669' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{ 
                        padding: '10px 20px', 
                        borderRadius: 'var(--radius-md)', 
                        border: 'none',
                        background: activeTab === tab.id ? 'var(--surface-hover)' : 'transparent',
                        color: activeTab === tab.id ? tab.color : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent'
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
            <div className="animate-pulse">Analyzing live results...</div>
        </div>
      ) : (
        <>
            {/* SEARCH RESULTS VIEW (Overlays other tabs if searching) */}
            {searchQuery && (
                <section className="animate-fade-in" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Search Results ({filteredResults.length})</h3>
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        {filteredResults.length > 0 ? filteredResults.map((result, i) => (
                             <Link key={i} href={`/results/${result.program.id}?eventId=${activeEventId}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid var(--border-color)', color: 'inherit' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{result.candidate?.name || result.team?.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{result.program.name} • {result.candidate?.chestNumber}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{result.rank ? `${result.rank} Place` : result.grade || 'Result'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>+{result.points} pts</div>
                                </div>
                             </Link>
                        )) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No matches found.</div>
                        )}
                    </div>
                </section>
            )}

            {!searchQuery && activeTab === "standings" && (
                <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--spacing-xl)' }}>
                    {/* Visual Leaderboard */}
                    <div>
                        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>🏆 Team Leaderboard</h2>
                        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                            {data.leaderboard.map((team, index) => (
                                <div key={team.id} style={{ marginBottom: '25px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: index < 3 ? '#FCD34D' : 'var(--text-muted)', width: '30px' }}>
                                                {index + 1}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{team.name}</div>
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>{team.points} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>pts</span></div>
                                    </div>
                                    {/* Progress Bar Chart */}
                                    <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            height: '100%', 
                                            width: `${(team.points / maxPoints) * 100}%`, 
                                            background: `linear-gradient(90deg, ${team.flagColor || 'var(--primary)'}, var(--secondary))`,
                                            transition: 'width 1s ease-out'
                                        }}></div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                                        {team.leaderName && `Leader: ${team.leaderName}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Team List & Detail Mini Cards */}
                    <div>
                        <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>🚩 Team Detail</h3>
                        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            {data.leaderboard.map(team => (
                                <div key={team.id} className="glass-panel" style={{ padding: '15px', textAlign: 'center', borderTop: `4px solid ${team.flagColor}` }}>
                                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>🚩</div>
                                    <div style={{ fontWeight: 700 }}>{team.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.leaderName}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!searchQuery && activeTab === "hall" && (
                <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
                    <div>
                        <h2 style={{ marginBottom: 'var(--spacing-lg)', color: '#FCD34D' }}>👑 Overall Top 5 Stars</h2>
                        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                            {data.topStars.map((star, i) => (
                                <div key={star.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', padding: '15px', background: i === 0 ? 'rgba(252, 211, 77, 0.05)' : 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: i === 0 ? '1px solid #FCD34D' : '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: i === 0 ? '#FCD34D' : 'var(--text-muted)' }}>#{i+1}</div>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${star.teamColor}` }}>
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-color)', fontSize: '24px' }}>⭐</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{star.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: star.teamColor }}>{star.teamName} • {star.categoryName}</div>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>{star.points} pts</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}>🎖️ Category Champions</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {Object.entries(data.categoryStars).map(([name, stars]) => (
                                <div key={name} className="glass-panel" style={{ padding: '15px' }}>
                                    <h4 style={{ marginBottom: '10px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px' }}>{name}</h4>
                                    {stars.map((s, i) => (
                                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>{i+1}.</span>
                                                <span style={{ fontWeight: 600 }}>{s.name}</span>
                                            </div>
                                            <span style={{ fontWeight: 700 }}>{s.points} pts</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!searchQuery && activeTab === "live" && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="animate-pulse" style={{ width: '12px', height: '12px', backgroundColor: 'var(--error)', borderRadius: '50%' }}></span>
                        Recent Updates (Latest 10)
                    </h2>
                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        {data.latestResults.map((res, i) => (
                            <Link key={res.id} href={`/results/${res.program.id}?eventId=${activeEventId}`} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '20px', 
                                borderBottom: i < data.latestResults.length - 1 ? '1px solid var(--border-color)' : 'none',
                                color: 'inherit',
                                background: i === 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                            }}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${res.candidate?.team?.flagColor || res.team?.flagColor}` }}>
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-color)', fontSize: '20px' }}>🏆</div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{res.candidate?.name || res.team?.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{res.program.name} • {res.candidate?.team?.name || res.team?.name}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--primary)', fontWeight: 800 }}>{res.rank ? `${res.rank} Place` : res.grade || 'Result'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>+{res.points} pts</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
}
