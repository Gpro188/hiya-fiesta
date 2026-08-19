"use client";

import { useState, useRef } from "react";
import { updatePosterSettings } from "./actions";
import ImageUpload from "../../components/ImageUpload";

export default function InteractivePosterStudio({
  initialSettings,
  categories = [],
  zoneName,
  isCompact = false
}: {
  initialSettings: any;
  categories?: any[];
  zoneName?: string;
  isCompact?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'program' | 'category' | 'resultNo' | 'winners' | 'styles'>('program');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Selected Category for Preview
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || "");

  // Main Configurable Layout & Typography State
  const [config, setConfig] = useState({
    // Background & Event
    posterBgUrl: initialSettings?.posterBgUrl || "",
    targetEventId: initialSettings?.targetEventId || undefined,

    // Colors
    primaryColor: initialSettings?.posterPrimaryColor || "#1e293b", // Program Name Color
    secondaryColor: initialSettings?.posterSecondaryColor || "#e6007e", // Category & Accents
    textColor: initialSettings?.posterTextColor || "#241B1B", // Winner Names Color

    // 1. Program Name Typography & Position
    programTop: 27, // % from top
    programLeft: 10, // % from left
    programWidth: 65, // % max width
    programFontSize: 56, // px
    programAlign: 'left' as 'left' | 'center' | 'right',

    // 2. Category Badge Position & Size
    categoryTop: 36, // % from top
    categoryLeft: 10, // % from left
    categoryFontSize: 18, // px
    showCategoryBadge: true,

    // 3. Result No Subheading
    resultNoTop: 24, // % from top
    resultNoLeft: 10, // % from left
    resultNoFontSize: 28, // px
    showResultNo: true,

    // 4. Winners Box Position & Spacing
    winnersTop: 43, // % from top
    winnersLeft: 10, // % from left
    winnersWidth: 50, // % max width
    winnerItemGap: 36, // px gap between rows
    winnerNameSize: 26, // px
    winnerInstSize: 15, // px
    showGrade: true,
  });

  // Category specific backgrounds map
  const [categoryBgMap, setCategoryBgMap] = useState<Record<string, string>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.posterBgUrl || "" }), {})
  );

  // Get active background for the live preview
  const currentCategory = categories.find(c => c.id === selectedCategoryId);
  const activeBg = categoryBgMap[selectedCategoryId] || config.posterBgUrl || "";

  // Test Winner Sample Data for Live Preview
  const sampleWinners = [
    { rank: 1, name: "FATHIMA SHIFA M", chest: "104", inst: "MARKAZ GIRLS HIGHER ACADEMY", place: "KUNDOTTY", grade: "A+" },
    { rank: 2, name: "ALEEMA FIDA", chest: "108", inst: "BEELINE WOMEN'S COLLEGE", place: "SIDDAPURA", grade: "A" },
    { rank: 3, name: "AYISHA RIDHA K", chest: "112", inst: "SAJIPA USTHAD WOMEN'S SHAREEATH", place: "BANTWAL", grade: "B+" }
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updatePosterSettings({
        posterBgUrl: config.posterBgUrl,
        posterPrimaryColor: config.primaryColor,
        posterSecondaryColor: config.secondaryColor,
        posterTextColor: config.textColor,
        targetEventId: config.targetEventId
      });

      if (res.success) {
        alert("Poster Studio settings saved successfully!");
      } else {
        alert("Error: " + res.error);
      }
    } catch {
      alert("Failed to save settings.");
    }
    setLoading(false);
  };

  const handleDownloadTestPoster = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const htmlToImage = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true
      });
      const link = document.createElement("a");
      link.download = `Test_Poster_${currentCategory?.name || 'General'}_Preview.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Could not generate poster preview. Please verify image CORS permissions.");
    }
    setDownloading(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 390px) minmax(0, 1fr)', gap: '20px', alignItems: 'start', width: '100%' }}>
      
      {/* ── LEFT: LIVE POSTER PREVIEW ── */}
      <div className="glass-panel" style={{ padding: '16px', position: 'sticky', top: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎨</span> Live Poster Preview
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Real Fest Layout (1080x1350)</span>
          </div>

          <button 
            type="button"
            onClick={handleDownloadTestPoster}
            disabled={downloading}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: '#FFFFFF',
              color: '#e6007e',
              border: '1.5px solid #f2d9e6',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📥</span> {downloading ? "Rendering..." : "Download Test"}
          </button>
        </div>

        {/* Category Switcher for Live Preview */}
        {categories.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedCategoryId === cat.id ? '#e6007e' : 'var(--border-color)',
                  background: selectedCategoryId === cat.id ? 'rgba(230, 0, 126, 0.1)' : 'transparent',
                  color: selectedCategoryId === cat.id ? '#e6007e' : 'var(--text-primary)',
                  fontSize: '0.7rem',
                  fontWeight: selectedCategoryId === cat.id ? 800 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🏷️ {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── SCALED PREVIEW FRAME (1080x1350 scaled down accurately to 358px) ── */}
        <div style={{
          width: '100%',
          height: '447px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          border: '1px solid #f2d9e6'
        }}>
          {/* Inner 1080x1350 Virtual Canvas Container */}
          <div 
            ref={posterRef}
            style={{
              width: '1080px',
              height: '1350px',
              position: 'absolute',
              top: 0,
              left: 0,
              transformOrigin: 'top left',
              transform: 'scale(0.331)', // 1080 * 0.331 = ~358px, 1350 * 0.331 = ~447px
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
              fontFamily: "'Outfit', 'Inter', sans-serif"
            }}
          >
            {/* Background Image Layer */}
            {activeBg && (
              <img 
                src={activeBg} 
                alt="Poster Background"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '1350px',
                  objectFit: 'cover',
                  zIndex: 0
                }}
                crossOrigin="anonymous"
              />
            )}

            {/* 1. Result Number */}
            {config.showResultNo && (
              <div style={{
                position: 'absolute',
                top: `${config.resultNoTop}%`,
                left: `${config.resultNoLeft}%`,
                fontSize: `${config.resultNoFontSize}px`,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontStyle: 'italic', color: config.primaryColor, fontFamily: 'Georgia, serif' }}>Result</span>
                <span style={{ fontWeight: 800, color: config.secondaryColor }}>01</span>
              </div>
            )}

            {/* 2. Program Name */}
            <div style={{
              position: 'absolute',
              top: `${config.programTop}%`,
              left: `${config.programLeft}%`,
              width: `${config.programWidth}%`,
              fontSize: `${config.programFontSize}px`,
              fontWeight: 900,
              color: config.primaryColor,
              lineHeight: 1.1,
              textTransform: 'uppercase',
              letterSpacing: '-0.5px',
              textAlign: config.programAlign,
              zIndex: 2
            }}>
              QAWWALI ARABIC
            </div>

            {/* 3. Category Badge */}
            {config.showCategoryBadge && (
              <div style={{
                position: 'absolute',
                top: `${config.categoryTop}%`,
                left: `${config.categoryLeft}%`,
                zIndex: 2
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: config.secondaryColor,
                  color: '#FFFFFF',
                  padding: '6px 20px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: `${config.categoryFontSize}px`,
                  letterSpacing: '2px',
                  textTransform: 'uppercase'
                }}>
                  {currentCategory?.name || 'SUPER SENIOR'}
                </div>
              </div>
            )}

            {/* 4. Winners List */}
            <div style={{
              position: 'absolute',
              top: `${config.winnersTop}%`,
              left: `${config.winnersLeft}%`,
              width: `${config.winnersWidth}%`,
              display: 'flex',
              flexDirection: 'column',
              gap: `${config.winnerItemGap}px`,
              zIndex: 2
            }}>
              {sampleWinners.map((win, idx) => {
                const rankColor = win.rank === 1 ? '#F59E0B' : win.rank === 2 ? '#94A3B8' : '#D97706';
                const rankBadgeBg = win.rank === 1 ? '#FEF3C7' : win.rank === 2 ? '#F1F5F9' : '#FFEDD5';

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
                    {/* Rank Number Badge */}
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      backgroundColor: rankBadgeBg,
                      border: `2.5px solid ${rankColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.4rem',
                      color: config.textColor,
                      flexShrink: 0
                    }}>
                      0{win.rank}
                    </div>

                    {/* Candidate & Institution */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: `${config.winnerNameSize}px`,
                          fontWeight: 800,
                          color: config.textColor,
                          lineHeight: 1.1,
                          textTransform: 'uppercase'
                        }}>
                          {win.name}
                        </span>
                        <span style={{ fontSize: `${config.winnerNameSize * 0.8}px`, fontWeight: 700, color: '#64748B' }}>
                          ({win.chest})
                        </span>
                      </div>
                      <div style={{
                        fontSize: `${config.winnerInstSize}px`,
                        fontWeight: 600,
                        color: '#475569',
                        textTransform: 'uppercase',
                        marginTop: '4px',
                        lineHeight: 1.2
                      }}>
                        {win.inst}, {win.place}
                      </div>
                      {config.showGrade && (
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: config.secondaryColor, marginTop: '2px' }}>
                          Grade {win.grade}
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


      {/* ── RIGHT: CONTROLS & ADJUSTMENT TABS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Background Uploader Box */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem' }}>
            Official Poster Background (A4 Portrait Art)
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
            Upload your high-res background art for <strong>{zoneName || 'Global Poster Default'}</strong>.
          </p>
          <ImageUpload
            label="Upload Poster Background (A4 / 4:5 Portrait)"
            folder="posters"
            initialUrl={config.posterBgUrl}
            onUploadComplete={(url) => setConfig({ ...config, posterBgUrl: url })}
          />
        </div>

        {/* Adjustment Tabs Strip */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
            {[
              { id: 'program', label: 'T  Program Name' },
              { id: 'category', label: '🏷️ Category' },
              { id: 'resultNo', label: '# Result No' },
              { id: 'winners', label: '🏆 Winners Box' },
              { id: 'styles', label: '🎨 Colors & Align' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === tab.id ? '#e6007e' : 'rgba(255,255,255,0.06)',
                  color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 1. Program Name Adjustments */}
          {activeTab === 'program' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>T  Program Name Position & Size</h4>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Top Spacing (Y)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.programTop}%</span>
                </div>
                <input 
                  type="range" min="10" max="60" value={config.programTop}
                  onChange={(e) => setConfig({ ...config, programTop: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Left Spacing (X)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.programLeft}%</span>
                </div>
                <input 
                  type="range" min="5" max="50" value={config.programLeft}
                  onChange={(e) => setConfig({ ...config, programLeft: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Box Max Width (Text Wrap)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.programWidth}%</span>
                </div>
                <input 
                  type="range" min="30" max="90" value={config.programWidth}
                  onChange={(e) => setConfig({ ...config, programWidth: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Font Size</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.programFontSize}px</span>
                </div>
                <input 
                  type="range" min="28" max="72" value={config.programFontSize}
                  onChange={(e) => setConfig({ ...config, programFontSize: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* 2. Category Badge Adjustments */}
          {activeTab === 'category' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>🏷️ Category Badge Position & Size</h4>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Top Spacing (Y)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.categoryTop}%</span>
                </div>
                <input 
                  type="range" min="15" max="65" value={config.categoryTop}
                  onChange={(e) => setConfig({ ...config, categoryTop: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Left Spacing (X)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.categoryLeft}%</span>
                </div>
                <input 
                  type="range" min="5" max="50" value={config.categoryLeft}
                  onChange={(e) => setConfig({ ...config, categoryLeft: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Badge Text Font Size</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.categoryFontSize}px</span>
                </div>
                <input 
                  type="range" min="12" max="28" value={config.categoryFontSize}
                  onChange={(e) => setConfig({ ...config, categoryFontSize: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input 
                  type="checkbox" 
                  checked={config.showCategoryBadge} 
                  onChange={(e) => setConfig({ ...config, showCategoryBadge: e.target.checked })} 
                />
                Show Category Badge on Poster
              </label>
            </div>
          )}

          {/* 3. Result No Subheading */}
          {activeTab === 'resultNo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}># Result No Subheading</h4>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Top Spacing (Y)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.resultNoTop}%</span>
                </div>
                <input 
                  type="range" min="10" max="50" value={config.resultNoTop}
                  onChange={(e) => setConfig({ ...config, resultNoTop: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Left Spacing (X)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.resultNoLeft}%</span>
                </div>
                <input 
                  type="range" min="5" max="50" value={config.resultNoLeft}
                  onChange={(e) => setConfig({ ...config, resultNoLeft: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input 
                  type="checkbox" 
                  checked={config.showResultNo} 
                  onChange={(e) => setConfig({ ...config, showResultNo: e.target.checked })} 
                />
                Display Result Counter (#01)
              </label>
            </div>
          )}

          {/* 4. Winners Box Adjustments */}
          {activeTab === 'winners' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>🏆 Winners List Box &amp; Spacing</h4>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Top Starting Position (Y)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.winnersTop}%</span>
                </div>
                <input 
                  type="range" min="30" max="70" value={config.winnersTop}
                  onChange={(e) => setConfig({ ...config, winnersTop: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Left Spacing (X)</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.winnersLeft}%</span>
                </div>
                <input 
                  type="range" min="5" max="50" value={config.winnersLeft}
                  onChange={(e) => setConfig({ ...config, winnersLeft: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Winner Row Gap</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.winnerItemGap}px</span>
                </div>
                <input 
                  type="range" min="20" max="60" value={config.winnerItemGap}
                  onChange={(e) => setConfig({ ...config, winnerItemGap: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                  <span>Participant Name Font Size</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{config.winnerNameSize}px</span>
                </div>
                <input 
                  type="range" min="18" max="36" value={config.winnerNameSize}
                  onChange={(e) => setConfig({ ...config, winnerNameSize: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* 5. Colors & Alignments */}
          {activeTab === 'styles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>🎨 Colors &amp; Typography</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Program Heading Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <input 
                      type="color" value={config.primaryColor} 
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <input 
                      type="text" className="form-input" value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Badge &amp; Accent Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <input 
                      type="color" value={config.secondaryColor} 
                      onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                      style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <input 
                      type="text" className="form-input" value={config.secondaryColor}
                      onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Winner Participant Text Color</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <input 
                    type="color" value={config.textColor} 
                    onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                    style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" className="form-input" value={config.textColor}
                    onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1.5px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.92rem', fontWeight: 800 }}
            >
              {loading ? "Saving Poster Settings..." : "💾 Save Poster Settings"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
