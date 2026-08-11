"use client";

import { useState } from "react";
import { updatePosterSettings } from "./actions";
import ImageUpload from "../../components/ImageUpload";

export default function PosterSettingsForm({ initialSettings, compact, zoneName }: { initialSettings: any, compact?: boolean, zoneName?: string }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    posterHeaderUrl: initialSettings?.posterHeaderUrl || "",
    posterFooterUrl: initialSettings?.posterFooterUrl || "",
    posterCongratulationUrl: initialSettings?.posterCongratulationUrl || "",
    posterLogoUrl: initialSettings?.posterLogoUrl || "",
    posterBgUrl: initialSettings?.posterBgUrl || "",
    posterPrimaryColor: initialSettings?.posterPrimaryColor || "#1e293b",
    posterSecondaryColor: initialSettings?.posterSecondaryColor || "#f97316",
    posterTextColor: initialSettings?.posterTextColor || "#1e293b",
    targetEventId: initialSettings?.targetEventId || undefined
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updatePosterSettings(formData);
    if (res.success) {
      alert("Poster settings updated successfully!");
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
      {!compact && (
        <>
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Global Poster Template Settings</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', fontSize: '0.9rem' }}>
            Configure the official assets for the results announcement posters. These will be applied to all program result boards.
          </p>
          <div className="glass-panel" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💡</span>
              <strong>Manual Design Workflow:</strong> Download the &quot;Clean Body&quot; from any program results page, design your background manually, and upload the Final Poster.
            </p>
          </div>
        </>
      )}

      {/* Download Layout Guide Button */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <button 
          type="button" 
          className="btn btn-secondary" 
          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
          onClick={async () => {
            const htmlToImage = await import('html-to-image');
            const node = document.getElementById('poster-guide-template');
            if (node) {
              const dataUrl = await htmlToImage.toPng(node);
              const link = document.createElement('a');
              link.download = 'Poster_Layout_Guide_1080x1350.png';
              link.href = dataUrl;
              link.click();
            }
          }}
        >
          📥 Download Blank Poster Layout Guide
        </button>
      </div>

      {/* Hidden layout guide template */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="poster-guide-template" style={{
          width: '1080px', height: '1350px', backgroundColor: '#e2e8f0',
          position: 'relative', overflow: 'hidden',
          fontFamily: "'Outfit', sans-serif"
        }}>
          {/* Header area indicator */}
          <div style={{ position: 'absolute', top: '40px', left: '110px', right: '110px', height: '200px', border: '3px dashed #94a3b8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#64748b' }}>HEADER / LOGO AREA (OPTIONAL)</span>
          </div>
          
          {/* Text Safe Zone indicator */}
          <div style={{ position: 'absolute', top: '360px', left: '110px', width: '450px', height: '850px', border: '3px dashed #ef4444', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <h2 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '28px' }}>TEXT SAFE ZONE</h2>
              <p style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>Width: 450px</p>
              <p style={{ color: '#b91c1c', fontSize: '16px', marginTop: '30px', lineHeight: '1.5' }}>
                Program Name, Category, and<br/>Winners List will be printed exactly<br/>within this red bounded box.
              </p>
            </div>
          </div>

          {/* Background Art indicator */}
          <div style={{ position: 'absolute', top: '360px', left: '600px', right: '40px', height: '850px', border: '3px dashed #3b82f6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: '#3b82f6', margin: '0 0 10px 0', fontSize: '28px' }}>ARTWORK AREA</h2>
              <p style={{ color: '#1d4ed8', fontSize: '16px' }}>Place your illustrations or photos here.</p>
            </div>
          </div>

          {/* Global properties */}
          <div style={{ position: 'absolute', bottom: '40px', left: '0', width: '100%', textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: '#64748b' }}>
            Total Resolution: 1080 x 1350 pixels (4:5 Ratio)
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <ImageUpload
            label={compact ? `${zoneName} Poster Background` : "Default Poster Background (Global)"}
            folder="posters"
            initialUrl={formData.posterBgUrl}
            onUploadComplete={(url) => setFormData({...formData, posterBgUrl: url})}
          />
          <span className="field-helper">
            {compact
              ? `This background will be used for all posters from the ${zoneName} zone.`
              : "This image is used as the base background for all result announcement posters. Use a high-resolution PNG or JPG in A4 portrait ratio."}
          </span>
        </div>

        {!compact && (
          <>
            <div className="form-group">
              <label className="form-label">Primary Color (Program Name)</label>
              <span className="field-helper">Used for the program name heading on result posters.</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.posterPrimaryColor || "#1e293b"}
                  onChange={(e) => setFormData({...formData, posterPrimaryColor: e.target.value})}
                  style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={formData.posterPrimaryColor || "#1e293b"}
                  onChange={(e) => setFormData({...formData, posterPrimaryColor: e.target.value})}
                  placeholder="#1e293b"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Secondary Color (Category &amp; Prize)</label>
              <span className="field-helper">Applied to category labels, prize/rank badges, and decorative accents.</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.posterSecondaryColor || "#f97316"}
                  onChange={(e) => setFormData({...formData, posterSecondaryColor: e.target.value})}
                  style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={formData.posterSecondaryColor || "#f97316"}
                  onChange={(e) => setFormData({...formData, posterSecondaryColor: e.target.value})}
                  placeholder="#f97316"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Text Color (Participant Names)</label>
              <span className="field-helper">The color used for candidate/participant names in the results table on posters.</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.posterTextColor || "#1e293b"}
                  onChange={(e) => setFormData({...formData, posterTextColor: e.target.value})}
                  style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={formData.posterTextColor || "#1e293b"}
                  onChange={(e) => setFormData({...formData, posterTextColor: e.target.value})}
                  placeholder="#1e293b"
                />
              </div>
            </div>

            <div className="form-group">
              <ImageUpload
                label="Logo (Optional)"
                folder="logos"
                initialUrl={formData.posterLogoUrl}
                onUploadComplete={(url) => setFormData({...formData, posterLogoUrl: url})}
              />
            </div>

            <div className="form-group">
              <ImageUpload
                label="Congratulations PNG (Optional)"
                folder="posters"
                initialUrl={formData.posterCongratulationUrl}
                onUploadComplete={(url) => setFormData({...formData, posterCongratulationUrl: url})}
              />
              <span className="field-helper">An overlay image (e.g., confetti or banner) shown on top of the poster for winner celebrations.</span>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'none' }}>
              <input type="hidden" value={formData.posterHeaderUrl} />
              <input type="hidden" value={formData.posterFooterUrl} />
            </div>
          </>
        )}

        <div style={{ gridColumn: 'span 2' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? "Saving..." : (compact ? `Save ${zoneName} Background` : "Save Global Branding Settings")}
          </button>
        </div>
      </form>

      {!compact && (
        <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>🎨 Live Color Preview</h4>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              fontSize: '0.9rem',
              fontWeight: 900,
              color: formData.posterSecondaryColor || '#f97316',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '5px'
            }}>
              Category Name
            </div>
            <div style={{
              fontSize: '3.5rem',
              fontWeight: 900,
              color: formData.posterPrimaryColor || '#1e293b',
              letterSpacing: '-1px',
              margin: '0 0 30px 0',
              lineHeight: 1,
              textTransform: 'uppercase'
            }}>
              PROGRAM
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: `5px solid ${formData.posterSecondaryColor || '#f97316'}`,
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                color: '#cbd5e1'
              }}>
                👤
              </div>
              <div style={{
                marginTop: '-15px',
                backgroundColor: formData.posterSecondaryColor || '#f97316',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: 900,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                border: '2px solid white',
                zIndex: 2
              }}>
                1st Prize
              </div>
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: formData.posterTextColor || '#1e293b', textTransform: 'uppercase' }}>
                  PARTICIPANT
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: formData.posterTextColor || '#1e293b', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  TEAM NAME
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
