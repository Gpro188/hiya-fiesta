"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";

export default function ProgramResultsView({ program, settings, userRole, eventId }: { program: any, settings: any, userRole?: string, eventId?: string }) {
  const isAuthorizedMedia = userRole === 'ADMIN' || userRole === 'MEDIA';
  const [isGenerating, setIsGenerating] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const backUrl = eventId ? `/fest/${eventId}` : `/fest/${program.eventId}`;
  const backLabel = eventId ? `← Back to ${program.event?.name || 'Zone'}` : '← Back';

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

      const node = posterRef.current;
      const opts = {
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
        width: 1080,
        height: 1350,
        style: { transform: 'scale(1)', margin: '0', left: '0', top: '0' },
        // Skip cross-origin font sheets (Google Fonts) to avoid SecurityError.
        // We embed font-face rules ourselves below if possible.
        skipFonts: false,
        filter: (node: HTMLElement) => {
          // never filter out nodes – just here to satisfy the type
          return true;
        },
      };

      // ── 1st call: warm the image/font cache; ignore SecurityError from cross-origin sheets ──
      try {
        await toPng(node, opts);
      } catch (warmErr: any) {
        // Only suppress the known CORS/cssRules error; rethrow anything else
        if (!String(warmErr).includes('cssRules') && !String(warmErr).includes('SecurityError')) {
          throw warmErr;
        }
      }

      // ── Small extra delay so warmed images are definitely decoded ──
      await new Promise(resolve => setTimeout(resolve, 300));

      // ── 2nd call: actual capture – cross-origin sheets are now cached ──
      let dataUrl: string;
      try {
        dataUrl = await toPng(node, opts);
      } catch (captureErr: any) {
        // If still failing due to cross-origin CSS, retry with fonts skipped
        if (String(captureErr).includes('cssRules') || String(captureErr).includes('SecurityError')) {
          dataUrl = await toPng(node, { ...opts, skipFonts: true });
        } else {
          throw captureErr;
        }
      }

      const link = document.createElement('a');
      link.download = `${program.name}_Poster.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Poster generation failed:', err);
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
          <Link href={backUrl} style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
            {backLabel}
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

      <div className="mobile-grid-1" style={{ display: 'flex', flexWrap: 'wrap', gap: '28px' }}>
        <div style={{ flex: '1 1 540px', minWidth: 0 }}>
          <h2 style={{ 
            marginBottom: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            fontFamily: "'Fraunces', serif",
            fontWeight: 800,
            fontSize: '1.4rem',
            color: '#1a1420'
          }}>
            <span>🏆</span> Winner Board
          </h2>
          <div style={{ 
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #f2d9e6',
            padding: '32px 20px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '18px', 
            flexWrap: 'wrap',
            boxShadow: '0 6px 24px -4px rgba(230, 0, 126, 0.07)'
          }}>
             {rank2[0] && <WinnerDisplay result={rank2[0]} rank={2} />}
             {rank1[0] && <WinnerDisplay result={rank1[0]} rank={1} isMain />}
             {rank3[0] && <WinnerDisplay result={rank3[0]} rank={3} />}
             
             {winners.length === 0 && (
                <div style={{ textAlign: 'center', color: '#7a7480', padding: '40px' }}>
                    No ranked winners recorded for this program yet.
                </div>
             )}
          </div>

          <div style={{ 
            marginTop: '24px', 
            background: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #f2d9e6',
            overflow: 'hidden',
            boxShadow: '0 4px 18px -3px rgba(230, 0, 126, 0.05)'
          }}>
            {/* Desktop View Table */}
            <div className="hidden sm:block">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ backgroundColor: '#FFF8FA', borderBottom: '1.5px solid #f2d9e6' }}>
                  <tr style={{ color: '#7a7480', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 16px' }}>Rank/Grade</th>
                    <th style={{ padding: '14px 16px' }}>Participant</th>
                    <th style={{ padding: '14px 16px' }}>Team</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {[...winners, ...others].map((res: any) => (
                    <tr key={res.id} style={{ borderBottom: '1px solid #fbeff5' }}>
                      <td style={{ padding: '14px 16px' }}>
                          {res.rank ? (
                              <span style={{ 
                                  backgroundColor: res.rank === 1 ? '#F59E0B' : res.rank === 2 ? '#94A3B8' : '#D97706',
                                  color: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', fontWeight: 900, fontSize: '0.75rem'
                              }}>
                                  #{res.rank}
                              </span>
                          ) : res.grade ? (
                              <span style={{ color: '#e6007e', fontWeight: 800 }}>Grade {res.grade}</span>
                          ) : '-'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#1a1420' }}>
                              {res.candidate?.name || res.team?.name}
                          </div>
                          {res.candidate?.chestNumber && (
                            <div style={{ fontSize: '0.72rem', color: '#7a7480', fontFamily: "'IBM Plex Mono', monospace" }}>
                              Chest #{res.candidate.chestNumber}
                            </div>
                          )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: '#332938', fontWeight: 600 }}>
                             {res.candidate?.team?.name || res.team?.name || '-'}
                          </span>
                          {res.candidate?.institution?.name && (
                             <div style={{ fontSize: '0.75rem', color: '#7a7480' }}>{res.candidate.institution.name}</div>
                          )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: '#e6007e', fontFamily: "'IBM Plex Mono', monospace", fontSize: '1rem' }}>
                          {res.points} <span style={{ fontSize: '0.72rem', color: '#7a7480', fontWeight: 700 }}>pts</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="block sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[...winners, ...others].map((res: any, idx: number) => {
                const rankGold = res.rank === 1 ? '#F59E0B' : res.rank === 2 ? '#94A3B8' : res.rank === 3 ? '#D97706' : '#7a7480';
                return (
                  <div 
                    key={res.id} 
                    style={{ 
                      padding: '14px 16px', 
                      borderBottom: idx < [...winners, ...others].length - 1 ? '1px solid #fbeff5' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{ flexShrink: 0 }}>
                        {res.rank ? (
                          <span style={{ 
                            backgroundColor: rankGold,
                            color: '#FFFFFF', 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontWeight: 900, 
                            fontSize: '0.75rem'
                          }}>
                            #{res.rank}
                          </span>
                        ) : res.grade ? (
                          <span style={{ color: '#e6007e', fontWeight: 800, fontSize: '0.78rem' }}>Gr {res.grade}</span>
                        ) : (
                          <span style={{ color: '#a1a1aa' }}>-</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: '#1a1420', fontSize: '0.92rem', wordBreak: 'break-word' }}>
                          {res.candidate?.name || res.team?.name}
                        </div>
                        <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '2px', wordBreak: 'break-word' }}>
                          {res.candidate?.team?.name || res.team?.name || '-'}
                        </div>
                        {res.candidate?.chestNumber && (
                          <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontFamily: "'IBM Plex Mono', monospace" }}>
                            Chest #{res.candidate.chestNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, color: '#e6007e', fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.05rem' }}>
                        {res.points} <span style={{ fontSize: '0.7rem', color: '#7a7480', fontWeight: 700 }}>pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {results.length === 0 && (
              <div style={{ padding: '30px', textAlign: 'center', color: '#7a7480' }}>
                No results published yet.
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
           <div style={{ 
             background: '#FFFFFF',
             borderRadius: '18px',
             border: '1px solid #f2d9e6',
             padding: '24px 20px',
             boxShadow: '0 4px 18px -3px rgba(230, 0, 126, 0.05)'
           }}>
              <h3 style={{ margin: '0 0 16px 0', fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: '1.2rem', color: '#1a1420' }}>
                Program Info
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#7a7480' }}>Program Type</span>
                      <strong style={{ color: '#1a1420' }}>{program.type}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#7a7480' }}>Venue</span>
                      <strong style={{ color: '#1a1420' }}>{program.venue || '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#7a7480' }}>Stage</span>
                      <strong style={{ color: '#1a1420' }}>{program.stageType}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#7a7480' }}>Category</span>
                      <strong style={{ color: '#e6007e' }}>{program.category?.name || '-'}</strong>
                  </div>
              </div>
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
                  <div style={{ fontSize: '3.6rem', fontWeight: 900, color: '#241B1B', lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '-0.5px', maxWidth: '600px', marginBottom: '25px' }}>
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
                                          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#241B1B', lineHeight: 1.1, textTransform: 'uppercase' }}>
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
  const chest = result?.candidate?.chestNumber;
  const instName = result?.candidate?.institution?.name || result?.candidate?.team?.name;
  
  const rankColor = rank === 1 ? '#F59E0B' : rank === 2 ? '#94A3B8' : '#D97706';
  const gradientBg = rank === 1 
    ? 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' 
    : rank === 2 
    ? 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' 
    : 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)';

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      background: gradientBg,
      borderRadius: '20px',
      padding: isMain ? '28px 22px' : '22px 18px',
      border: `2px solid ${rankColor}`,
      boxShadow: isMain ? '0 10px 28px -4px rgba(245, 158, 11, 0.35)' : '0 6px 18px -4px rgba(0,0,0,0.08)',
      transform: isMain ? 'scale(1.05)' : 'scale(1)',
      minWidth: '200px',
      maxWidth: '260px',
      flex: 1,
      textAlign: 'center'
    }}>
      <div style={{ 
        width: isMain ? '80px' : '68px', 
        height: isMain ? '80px' : '68px', 
        borderRadius: '50%', 
        backgroundColor: '#FFFFFF',
        border: `3px solid ${rankColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMain ? '2.2rem' : '1.8rem',
        position: 'relative',
        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        marginBottom: '14px'
      }}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
        <div style={{
          position: 'absolute',
          bottom: '-6px',
          backgroundColor: rankColor,
          color: '#FFFFFF',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: '0.75rem',
          border: '2px solid #FFFFFF',
          fontFamily: "'IBM Plex Mono', monospace"
        }}>
          #{rank}
        </div>
      </div>
      
      <div style={{ width: '100%' }}>
        <div style={{ 
          fontWeight: 900, 
          fontSize: isMain ? '1.15rem' : '1.02rem', 
          color: '#1a1420',
          fontFamily: "'Fraunces', serif",
          lineHeight: 1.25,
          marginBottom: '4px'
        }}>
          {name}
        </div>
        {chest && (
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7a7480', fontFamily: "'IBM Plex Mono', monospace" }}>
            Chest #{chest}
          </div>
        )}
        <div style={{ 
          color: '#e6007e', 
          fontWeight: 900, 
          fontSize: '1.15rem', 
          fontFamily: "'IBM Plex Mono', monospace",
          marginTop: '6px'
        }}>
          {points} <span style={{ fontSize: '0.75rem', color: '#7a7480', fontWeight: 700 }}>PTS</span>
        </div>
        {instName && (
          <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '6px', fontWeight: 600, lineHeight: 1.3 }}>
            {instName}
          </div>
        )}
      </div>
    </div>
  );
}
