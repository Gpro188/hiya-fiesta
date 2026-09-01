"use client";

import { useState } from "react";
import { saveHomepageSettings } from "./actions";
import ImageUpload from "../../../components/ImageUpload";

export default function HomepageForm({ initialData, targetEventId }: { initialData: any, targetEventId?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || "#A5003A");
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondaryColor || "#0EA5E9");
  const [bgColor, setBgColor] = useState(initialData?.bgColor || "#0F172A");

  const [committee, setCommittee] = useState<any[]>(initialData?.committeeMembers || []);
  
  // Normalize gallery images to structured objects
  const [gallery, setGallery] = useState<Array<{ url: string; title: string; category: string; isHighlighted: boolean }>>(() => {
    const raw = initialData?.galleryImages || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => {
      if (typeof item === "string") {
        return { url: item, title: "", category: "Stage", isHighlighted: true };
      }
      return {
        url: item?.url || "",
        title: item?.title || "",
        category: item?.category || "Stage",
        isHighlighted: item?.isHighlighted !== false,
      };
    });
  });
  
  // New CMS Fields
  const [heroBgUrl, setHeroBgUrl] = useState(initialData?.heroBgUrl || "");
  const [tickerText, setTickerText] = useState(initialData?.tickerText || "");
  const [heroSlides, setHeroSlides] = useState<any[]>(initialData?.heroSlides || []);
  const [statsCounter, setStatsCounter] = useState(initialData?.statsCounter || {
    show_students: true,
    show_institutions: true,
    show_events: true,
    show_points: true
  });
  const [socialLinks, setSocialLinks] = useState(initialData?.socialLinks || {
    instagram: "",
    youtube: "",
    facebook: "",
    whatsapp_support: ""
  });

  const addCommitteeMember = () => setCommittee([...committee, { name: "", role: "", imageUrl: "" }]);
  const updateCommittee = (index: number, field: string, value: string) => {
    const newCommittee = [...committee];
    newCommittee[index][field] = value;
    setCommittee(newCommittee);
  };
  const removeCommittee = (index: number) => setCommittee(committee.filter((_, i) => i !== index));

  const addGalleryImage = () =>
    setGallery([...gallery, { url: "", title: "", category: "Stage", isHighlighted: true }]);
  
  const updateGallery = (index: number, field: string, value: any) => {
    const newGallery = [...gallery];
    newGallery[index] = { ...newGallery[index], [field]: value };
    setGallery(newGallery);
  };
  const removeGallery = (index: number) => setGallery(gallery.filter((_, i) => i !== index));

  const addHeroSlide = () => setHeroSlides([...heroSlides, { id: Date.now().toString(), image_url: "", title: "", subtitle: "", cta_text: "", cta_link: "", enable_countdown: false, target_date: "" }]);
  const updateHeroSlide = (index: number, field: string, value: any) => {
    const newSlides = [...heroSlides];
    newSlides[index][field] = value;
    setHeroSlides(newSlides);
  };
  const removeHeroSlide = (index: number) => setHeroSlides(heroSlides.filter((_, i) => i !== index));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Append extra state data
    data.heroBgUrl = heroBgUrl;
    data.committeeMembers = JSON.stringify(committee);
    data.galleryImages = JSON.stringify(gallery);
    data.heroSlides = JSON.stringify(heroSlides);
    data.statsCounter = JSON.stringify(statsCounter);
    data.socialLinks = JSON.stringify(socialLinks);

    const result = await saveHomepageSettings(data);
    
    setMessage(result.message);
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {message && (
        <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
          {message}
        </div>
      )}
      
      <input type="hidden" name="targetEventId" value={targetEventId || initialData?.targetEventId || ""} />

      {/* ── Hero Section ─────────────────────────────────── */}
      <details className="glass-panel" style={{ padding: 'var(--spacing-md)', cursor: 'pointer' }} open>
        <summary style={{ fontSize: '1.25rem', fontWeight: 600, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
          Hero Section (Banner) <span>▼</span>
        </summary>
        <div style={{ marginTop: 'var(--spacing-md)', cursor: 'default', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          <div className="form-group">
            <label className="form-label">Fest / Event Title</label>
            <input type="text" name="heroTitle" defaultValue={initialData?.heroTitle || "CSWC Hiya Fiesta 2026"} className="form-input" placeholder="CSWC Hiya Fiesta 2026" />
          </div>
          <div className="form-group">
            <label className="form-label">Hero Subtitle (one line tagline)</label>
            <input type="text" name="heroSubtitle" defaultValue={initialData?.heroSubtitle || "Centralized Multi-Zone Arts Festival Platform"} className="form-input" placeholder="Centralized Multi-Zone Arts Festival Platform" />
          </div>
          <div className="form-group">
            <label className="form-label">Eyebrow Badge Text</label>
            <input type="text" name="heroEyebrow" defaultValue={initialData?.heroEyebrow || "STATE FINAL · LIVE NOW"} className="form-input" placeholder="STATE FINAL · LIVE NOW" />
            <small style={{ color: 'var(--text-muted)' }}>The small blinking badge above the main title</small>
          </div>
          <div className="form-group">
            <label className="form-label">Banner / Ribbon Announcement Text</label>
            <input type="text" name="heroBannerText" defaultValue={initialData?.heroBannerText || ""} className="form-input" placeholder="Registration now open! Results at cswchiyafiesta.in …" />
            <small style={{ color: 'var(--text-muted)' }}>Scrolling pink ribbon below the hero (leave blank to hide)</small>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Hero Background Image</label>
            <ImageUpload 
              initialUrl={heroBgUrl} 
              onUploadComplete={(url: string) => setHeroBgUrl(url)} 
              folder="homepage" 
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Upload a high-quality background image for the hero banner</small>
          </div>
        </div>
      </details>

      {/* Global Ticker */}
      <details className="glass-panel" style={{ padding: 'var(--spacing-md)', cursor: 'pointer' }}>
        <summary style={{ fontSize: '1.25rem', fontWeight: 600, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
          Top Announcement Bar <span>▼</span>
        </summary>
        <div style={{ marginTop: 'var(--spacing-md)', cursor: 'default' }}>
          <div className="form-group">
            <label className="form-label">Ticker Text (Scrolling Banner)</label>
            <input 
              type="text" 
              name="tickerText" 
              value={tickerText} 
              onChange={e => setTickerText(e.target.value)} 
              className="form-input" 
              placeholder="e.g. Registration is now open! Deadline is..." 
            />
          </div>
        </div>
      </details>

      {/* Hero Carousel Section */}
      <details className="glass-panel" style={{ padding: 'var(--spacing-md)', cursor: 'pointer' }}>
        <summary style={{ fontSize: '1.25rem', fontWeight: 600, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
          Hero Carousel & Countdown <span>▼</span>
        </summary>
        <div style={{ marginTop: 'var(--spacing-md)', cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-md)' }}>
            <button type="button" onClick={addHeroSlide} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              + Add Slide
            </button>
          </div>
          
          {heroSlides.length === 0 ? (
            <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              No slides added yet. Click <strong>+ Add Slide</strong> above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {heroSlides.map((slide, idx) => (
                <div key={slide.id} style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color-strong)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 'var(--spacing-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <ImageUpload 
                    label="Slide Image" 
                    folder="homepage-hero" 
                    initialUrl={slide.image_url}
                    onUploadComplete={(url) => updateHeroSlide(idx, 'image_url', url)} 
                  />
                </div>
                
                <div style={{ display: 'grid', gap: '8px' }}>
                  <input type="text" placeholder="Title" value={slide.title} onChange={e => updateHeroSlide(idx, 'title', e.target.value)} className="form-input" />
                  <input type="text" placeholder="Subtitle" value={slide.subtitle} onChange={e => updateHeroSlide(idx, 'subtitle', e.target.value)} className="form-input" />
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="CTA Button Text" value={slide.cta_text} onChange={e => updateHeroSlide(idx, 'cta_text', e.target.value)} className="form-input" style={{ flex: 1 }} />
                    <input type="text" placeholder="CTA URL" value={slide.cta_link} onChange={e => updateHeroSlide(idx, 'cta_link', e.target.value)} className="form-input" style={{ flex: 1 }} />
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={slide.enable_countdown} 
                        onChange={e => updateHeroSlide(idx, 'enable_countdown', e.target.checked)} 
                      />
                      Enable Countdown Timer
                    </label>
                    {slide.enable_countdown && (
                      <input 
                        type="datetime-local" 
                        value={slide.target_date} 
                        onChange={e => updateHeroSlide(idx, 'target_date', e.target.value)} 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                      />
                    )}
                  </div>
                </div>

                <button type="button" onClick={() => removeHeroSlide(idx)} className="btn btn-danger" style={{ padding: '0.5rem 0.875rem', fontSize: '0.85rem', height: 'fit-content' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        </div>
      </details>

      {/* Real-time Live Stats */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem' }}>Real-time Live Stats</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)' }}>
          Toggle which animated counter cards appear on the homepage. Data is fetched automatically from the database.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          {Object.entries(statsCounter).map(([key, value]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <input 
                type="checkbox" 
                checked={value as boolean} 
                onChange={e => setStatsCounter({ ...statsCounter, [key]: e.target.checked })} 
              />
              Show {key.replace('show_', '').charAt(0).toUpperCase() + key.replace('show_', '').slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Theme Colors & Presets */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-xs)', fontSize: '1.25rem' }}>Theme Colors</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)' }}>
          <div className="form-group">
            <label className="form-label">Primary Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" name="primaryColor" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: '48px', height: '40px', padding: '2px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color-strong)', backgroundColor: 'transparent' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{primaryColor}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Secondary Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" name="secondaryColor" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} style={{ width: '48px', height: '40px', padding: '2px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color-strong)', backgroundColor: 'transparent' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{secondaryColor}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Background Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" name="bgColor" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: '48px', height: '40px', padding: '2px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color-strong)', backgroundColor: 'transparent' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{bgColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem' }}>About Section</h2>
        <div className="form-group">
          <label className="form-label">About Title</label>
          <input type="text" name="aboutTitle" defaultValue={initialData?.aboutTitle || "About The Fest"} className="form-input" />
        </div>
        <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
          <label className="form-label">About Text</label>
          <textarea name="aboutText" defaultValue={initialData?.aboutText || ""} className="form-input" rows={4}></textarea>
        </div>
      </div>

      {/* Program Committee */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Committee & Leaders Section</h2>
          </div>
          <button type="button" onClick={addCommitteeMember} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            + Add Member
          </button>
        </div>

        <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <label className="form-label">Section Heading Title</label>
          <input type="text" name="committeeTitle" defaultValue={initialData?.committeeTitle || "Program Committee"} className="form-input" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {committee.map((member, idx) => (
            <div key={idx} style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color-strong)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 2fr auto', gap: 'var(--spacing-md)', alignItems: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {member.imageUrl ? <img src={member.imageUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>👤</span>}
              </div>
              <input type="text" placeholder="Name" value={member.name} onChange={e => updateCommittee(idx, 'name', e.target.value)} className="form-input" />
              <input type="text" placeholder="Role" value={member.role} onChange={e => updateCommittee(idx, 'role', e.target.value)} className="form-input" />
              <ImageUpload label="Profile Photo" folder="committee" initialUrl={member.imageUrl} onUploadComplete={(url) => updateCommittee(idx, 'imageUrl', url)} />
              <button type="button" onClick={() => removeCommittee(idx)} className="btn btn-danger" style={{ padding: '0.5rem 0.875rem' }}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <details className="glass-panel" style={{ padding: 'var(--spacing-md)', cursor: 'pointer' }}>
        <summary style={{ fontSize: '1.25rem', fontWeight: 600, listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span>Festival Media & Photo Gallery</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '10px', fontWeight: 400 }}>
              ({gallery.length} Photos · {gallery.filter(g => g.isHighlighted).length} Highlighted on Homepage)
            </span>
          </div>
          <span>▼</span>
        </summary>
        <div style={{ marginTop: 'var(--spacing-md)', cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Manage all photos in the official gallery. Toggle <strong>Highlight on Homepage</strong> to display select photos in the homepage auto-scrolling strip.
            </p>
            <button type="button" onClick={addGalleryImage} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              + Add Image
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
            {gallery.map((img, idx) => (
              <div key={idx} style={{ position: 'relative', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated, rgba(255,255,255,0.03))' }}>
                <button
                  type="button"
                  onClick={() => removeGallery(idx)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    cursor: 'pointer',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                  title="Remove Photo"
                >
                  ✕
                </button>

                <ImageUpload 
                  label={`Photo ${idx + 1}`} 
                  folder="gallery" 
                  initialUrl={img.url}
                  onUploadComplete={(url) => updateGallery(idx, "url", url)} 
                />

                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      Photo Title / Caption
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stage Performance / Special Moment"
                      value={img.title || ""}
                      onChange={(e) => updateGallery(idx, "title", e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', marginTop: '4px', fontWeight: 600, color: img.isHighlighted ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={img.isHighlighted !== false}
                      onChange={(e) => updateGallery(idx, "isHighlighted", e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>⭐ Feature in Highlights & Homepage Strip</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Social Links & Contact */}
      <details className="glass-panel" style={{ padding: 'var(--spacing-md)', cursor: 'pointer' }}>
        <summary style={{ fontSize: '1.25rem', fontWeight: 600, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
          Social Media Links <span>▼</span>
        </summary>
        <div style={{ marginTop: 'var(--spacing-md)', cursor: 'default', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          <div className="form-group">
            <label className="form-label">Instagram URL</label>
            <input type="url" className="form-input" value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} placeholder="https://instagram.com/..." />
          </div>
          <div className="form-group">
            <label className="form-label">YouTube URL</label>
            <input type="url" className="form-input" value={socialLinks.youtube} onChange={e => setSocialLinks({...socialLinks, youtube: e.target.value})} placeholder="https://youtube.com/..." />
          </div>
          <div className="form-group">
            <label className="form-label">Facebook URL</label>
            <input type="url" className="form-input" value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} placeholder="https://facebook.com/..." />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp Support Group/Number</label>
            <input type="url" className="form-input" value={socialLinks.whatsapp_support} onChange={e => setSocialLinks({...socialLinks, whatsapp_support: e.target.value})} placeholder="https://wa.me/..." />
          </div>
        </div>
      </details>

      <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: '100%', padding: 'var(--spacing-md)', fontSize: '1.25rem', marginTop: 'var(--spacing-md)' }}>
        {isSubmitting ? "Saving..." : "Save Homepage Settings"}
      </button>
    </form>
  );
}
