"use client";

import { useState } from "react";
import Link from "next/link";

export default function HubClient({ events }: { events: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (events.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No active events found. Create an event to see the hub.
      </div>
    );
  }

  const currentEvent = events[currentIndex];

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % events.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);

  return (
    <div className="hub-container" style={{ position: 'relative', overflow: 'hidden', paddingBottom: '50px' }}>
      {/* Slide Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
          <span style={{ color: 'var(--primary)' }}>Live</span> Results
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={prevSlide} className="btn btn-secondary" style={{ width: '40px', padding: 0 }}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 15px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
            {currentIndex + 1} / {events.length}
          </div>
          <button onClick={nextSlide} className="btn btn-secondary" style={{ width: '40px', padding: 0 }}>→</button>
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="animate-fade-in" key={currentEvent.id}>
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)', 
          borderRadius: 'var(--radius-xl)', 
          border: '1px solid var(--border-color)',
          padding: '40px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', fontWeight: 700 }}>Active Event</span>
              <h1 style={{ fontSize: '3rem', margin: '5px 0 0 0', fontWeight: 900 }}>{currentEvent.name}</h1>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <Link href={`/search?eventId=${currentEvent.id}&type=program`} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 View Board
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }} className="mobile-grid-1">
            {/* Team Competition Tracker */}
            <div>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🏆 Competition Progress
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)' }}>
                    {currentEvent.stats.publisheCSWCgrams}
                  </div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Completed Programmes</div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--warning)' }}>
                    {currentEvent.stats.pendingPrograms}
                  </div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Pending Results</div>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                  <span>Overall Progress</span>
                  <span>{Math.round((currentEvent.stats.publisheCSWCgrams / currentEvent.stats.totalPrograms) * 100)}%</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(currentEvent.stats.publisheCSWCgrams / currentEvent.stats.totalPrograms) * 100}%`,
                    background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                    transition: 'width 1s ease-in-out'
                  }}></div>
                </div>
              </div>
            </div>

            {/* Recent Results */}
            <div>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⏳ Recent Results
              </h3>
              <div className="glass-panel" style={{ maxHeight: '300px', overflowY: 'auto', padding: '10px' }}>
                {currentEvent.recentResults?.length > 0 ? (
                  currentEvent.recentResults.map((res: any) => (
                    <div key={res.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 15px', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.9rem'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{res.programName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.category}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{res.winnerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {res.rank ? `Rank: ${res.rank}` : (res.grade ? `Grade: ${res.grade}` : `Marks: ${res.marks}`)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No recent results found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px' }}>
        {events.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            style={{
              width: currentIndex === i ? '30px' : '10px',
              height: '10px',
              borderRadius: '5px',
              border: 'none',
              background: currentIndex === i ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .hub-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .mobile-grid-1 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
