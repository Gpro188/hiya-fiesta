"use client";

import { useState } from "react";
import { saveHomepageSettings } from "./actions";
import ImageUpload from "../../../components/ImageUpload";

export default function HomepageForm({ initialData }: { initialData: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  
  const [primaryColor, setPrimaryColor] = useState(initialData?.primaryColor || "#6366F1");
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondaryColor || "#0EA5E9");
  const [bgColor, setBgColor] = useState(initialData?.bgColor || "#0F172A");

  const [committee, setCommittee] = useState<any[]>(initialData?.committeeMembers || []);
  const [gallery, setGallery] = useState<string[]>(initialData?.galleryImages || []);
  
  // New CMS Fields
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

  const addGalleryImage = () => setGallery([...gallery, ""]);
  const updateGallery = (index: number, value: string) => {
    const newGallery = [...gallery];
    newGallery[index] = value;
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
    
    // Append JSON data
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
      
      <input type="hidden" name="targetEventId" value={initialData?.targetEventId || ""} />

      {/* Global Ticker */}
      <details className="glass-panel" style={{ padding: 'var(--spacing-md)', cursor: 'pointer' }} open>
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
        <summary style={{ fontSize: '1.25rem', fontWeight: 600, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
          Image Gallery Marquee <span>▼</span>
        </summary>
        <div style={{ marginTop: 'var(--spacing-md)', cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-md)' }}>
            <button type="button" onClick={addGalleryImage} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              + Add Image
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
            {gallery.map((img, idx) => (
              <div key={idx} style={{ position: 'relative', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm)' }}>
                <ImageUpload 
                  label={`Image ${idx + 1}`} 
                  folder="gallery" 
                  initialUrl={img}
                  onUploadComplete={(url) => updateGallery(idx, url)} 
                />
                <button type="button" onClick={() => removeGallery(idx)} style={{ position: 'absolute', top: 4, right: 4, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}>✕</button>
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
