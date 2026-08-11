"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";

export default function ProgramResultsView({ program, settings, userRole }: { program: any, settings: any, userRole?: string }) {
  const isAuthorizedMedia = userRole === 'ADMIN' || userRole === 'MEDIA';
  const [isGenerating, setIsGenerating] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const results = program.results || [];
  const winners = results.filter((r: any) => r.rank && r.rank <= 3).sort((a: any, b: any) => a.rank - b.rank);
  const others = results.filter((r: any) => !r.rank || r.rank > 3);
  const rank1 = winners.filter((w: any) => w.rank === 1);
  const rank2 = winners.filter((w: any) => w.rank === 2);
  const rank3 = winners.filter((w: any) => w.rank === 3);
  
  const finalPosterUrl = null;

  const proxyImage = (url: string | null | undefined) => {
      if (!url) return undefined;
      if (url.startsWith('data:') || url.startsWith('/')) return url;
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const handleGenerateAndDownload = async () => {
    if (!posterRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const dataUrl = await toPng(posterRef.current, { 
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
        width: 1080,
        height: 1350,
        style: { transform: 'scale(1)', margin: '0', left: '0', top: '0' }
      });
      
      const link = document.createElement('a');
      link.download = `${program.name}_Poster.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const winnersSummary = winners.map((w: any) => {
      const name = w.candidate?.name || w.team?.name;
      const rankText = w.rank === 1 ? '1st' : w.rank === 2 ? '2nd' : '3rd';
      return `${rankText}: ${name}`;
    }).join('\n');

    const shareText = `🏆 *${program.event.name}* 🏆\n\n*Category:* ${program.category?.name || 'General'}\n*Program:* ${program.name}\n\n*Results:*\n${winnersSummary}\n\nCongratulations to all winners! 🎉\n\nView full results here:\n${shareUrl}`;

    if (navigator.share) {
        try {
            await navigator.share({ title: `${program.name} Results`, text: shareText, url: shareUrl });
        } catch (err) {
            console.error("Error sharing:", err);
            const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
            window.open(waUrl, '_blank');
        }
    } else {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
        window.open(waUrl, '_blank');
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <Link href="/" style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ marginTop: 'var(--spacing-sm)' }}>{program.name} Results</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{program.event.name} • {program.category?.name || 'General'}</p>
        </div>
        
        {(finalPosterUrl || program.category?.posterBgUrl || settings?.posterBgUrl || isAuthorizedMedia) ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                  onClick={handleShare} 
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', backgroundColor: '#25D366', color: 'white', borderColor: '#25D366' }}
              >
                  📲 Share
              </button>
              <button 
                  onClick={handleGenerateAndDownload} 
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)' }}
                  disabled={isGenerating}
              >
                  {isGenerating ? '⌛ Generating...' : '📥 Download Poster'}
              </button>
            </div>
        ) : (
            <div style={{ padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border-color)' }}>
                ⏳ Poster being designed by Media Team
            </div>
        )}
      </div>

      <div className="mobile-grid-1" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xl)' }}>
        <div style={{ flex: '1 1 500px', minWidth: 0 }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#FCD34D' }}>🏆</span> Winner Board
          </h2>
          <div className="glass-panel" style={{ padding: 'var(--spacing-xl)', display: 'flex', justifyContent: 'center', gap: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
             {rank2[0] && <WinnerDisplay result={rank2[0]} rank={2} />}
             {rank1[0] && <WinnerDisplay result={rank1[0]} rank={1} isMain />}
             {rank3[0] && <WinnerDisplay result={rank3[0]} rank={3} />}
             
             {winners.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    No ranked winners recorded for this program yet.
                </div>
             )}
          </div>

          <div className="glass-panel" style={{ marginTop: 'var(--spacing-xl)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <tr>
                  <th style={{ padding: '15px' }}>Rank/Grade</th>
                  <th style={{ padding: '15px' }}>Participant</th>
                  <th style={{ padding: '15px' }}>Team</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {[...winners, ...others].map((res: any) => (
                  <tr key={res.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '15px' }}>
                        {res.rank ? (
                            <span style={{ 
                                backgroundColor: res.rank === 1 ? '#FCD34D' : res.rank === 2 ? '#E2E8F0' : '#CD7F32',
                                color: 'black', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem'
                            }}>
                                {res.rank === 1 ? '1ST' : res.rank === 2 ? '2ND' : '3RD'}
                            </span>
                        ) : res.grade ? (
                            <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Grade {res.grade}</span>
                        ) : '-'}
                    </td>
                    <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                             <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                             <strong>{res.candidate?.name || res.team?.name}</strong>
                        </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                           {res.candidate?.team?.name || res.team?.name || '-'}
                        </span>
                        {res.candidate?.institution?.name && (
                           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{res.candidate.institution.name}</div>
                        )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {res.points} pts
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                   <tr>
                     <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No results published yet.
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
           <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Program Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Program Type</span>
                      <strong>{program.type}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Venue</span>
                      <strong>{program.venue || '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Stage</span>
                      <strong>{program.stageType}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Category</span>
                      <strong>{program.category?.name || '-'}</strong>
                  </div>
              </div>
           </div>
           <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  This is a public result page. You can share this page link with participants and teams. 
                  Use the "Download Result Poster" button to generate a beautiful winner announcement.
              </p>
           </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={posterRef} className="printable-poster" style={{
              width: '1080px', height: '1350px', margin: '0', backgroundColor: '#ffffff',
              position: 'relative', overflow: 'hidden',
              fontFamily: "'Outfit', 'Arial', sans-serif"
          }}>
              {/* FULL BLEED BACKGROUND */}
              {(program.category?.posterBgUrl || settings?.posterBgUrl) && (
                  <img 
                      src={proxyImage(program.category?.posterBgUrl || settings.posterBgUrl)} 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} 
                      alt="Background" 
                      crossOrigin="anonymous" 
                  />
              )}

              {/* DYNAMIC TEXT OVERLAY */}
              <div style={{ position: 'relative', zIndex: 1, paddingTop: '360px', paddingLeft: '110px', paddingRight: '110px', width: '100%', height: '100%', boxSizing: 'border-box' }}>
                  
                  {/* Result Number / Subheading */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.8rem', fontStyle: 'italic', color: '#1e293b', fontFamily: 'Georgia, serif' }}>Result</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>{String(results.length).padStart(2, '0')}</span>
                  </div>

                  {/* Program Name */}
                  <div style={{ fontSize: '3.6rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '-0.5px', maxWidth: '600px', marginBottom: '25px' }}>
                      {program.name}
                  </div>

                  {/* Category Badge */}
                  <div style={{ marginBottom: '60px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#475569', color: 'white', padding: '8px 24px', borderRadius: '4px', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                          {program.category?.name || 'General'}
                      </div>
                  </div>

                  {/* Winners List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                      {results.slice(0, 4).map((result: any, idx: number) => {
                          const name = result.candidate?.name || result.team?.name || '';
                          const chest = result.candidate?.chestNumber || '';
                          const instName = result.candidate?.institution?.name || result.candidate?.team?.name || '';
                          const instPlace = result.candidate?.institution?.place || '';
                          const rankNum = result.rank || (idx + 1);
                          
                          // Match the green/orange/red colors from the reference design
                          const rankColor = rankNum === 1 ? '#4ade80' : rankNum === 2 ? '#fb923c' : rankNum === 3 ? '#ef4444' : '#94a3b8';
                          const textColor = rankNum === 1 ? '#14532d' : rankNum === 2 ? '#7c2d12' : rankNum === 3 ? '#7f1d1d' : '#334155';

                          return (
                              <div key={result.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                                  {/* Rank Circle */}
                                  <div style={{ 
                                      width: '56px', height: '56px', borderRadius: '50%', 
                                      backgroundColor: `${rankColor}30`, border: `2px solid ${rankColor}`, 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                      fontWeight: 800, fontSize: '1.4rem', color: textColor, 
                                      flexShrink: 0, marginTop: '2px' 
                                  }}>
                                      {String(rankNum).padStart(2, '0')}
                                  </div>
                                  
                                  {/* Participant Details */}
                                  <div style={{ maxWidth: '450px' }}>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                                          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, textTransform: 'uppercase' }}>
                                              {name}
                                          </div>
                                          {chest && (
                                              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155' }}>
                                                  ({chest})
                                              </div>
                                          )}
                                      </div>
                                      {(instName || instPlace) && (
                                          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px', lineHeight: 1.3 }}>
                                              {instName}{instPlace ? `, ${instPlace}` : ''}
                                          </div>
                                      )}
                                      {result.grade && (
                                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b91c1c', marginTop: '4px', textTransform: 'uppercase' }}>
                                              Grade {result.grade}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}

function WinnerDisplay({ result, rank, isMain = false }: { result: any, rank: number, isMain?: boolean }) {
  const name = result?.candidate?.name || result?.team?.name || 'TBA';
  const points = result?.points || 0;
  
  const colors = {
    1: 'var(--primary)',
    2: 'var(--text-secondary)', 
    3: 'var(--secondary)'
  };
  const color = colors[rank as keyof typeof colors];

  return (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        transform: isMain ? 'scale(1.1)' : 'scale(1)',
        marginTop: isMain ? '0' : '20px'
    }}>
      <div style={{ 
          width: isMain ? '100px' : '80px', 
          height: isMain ? '100px' : '80px', 
          borderRadius: '50%', 
          backgroundColor: 'var(--surface-color)',
          border: `3px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMain ? '3rem' : '2rem',
          position: 'relative',
          boxShadow: `0 10px 25px -5px ${color}40`
      }}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
        <div style={{
            position: 'absolute',
            bottom: '-10px',
            backgroundColor: color,
            color: 'white',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            border: '2px solid var(--bg-color)'
        }}>
            {rank}
        </div>
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: isMain ? '1.2rem' : '1rem' }}>{name}</div>
          <div style={{ color: color, fontWeight: 600, fontSize: '0.9rem' }}>{points} pts</div>
          {result?.candidate?.institution?.name && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '150px' }}>
                {result.candidate.institution.name}
            </div>
          )}
      </div>
    </div>
  );
}
