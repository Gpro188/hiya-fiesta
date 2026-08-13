"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./FestHomepage.module.css";

export default function FestHomepage({ event, homepageSetting, globalSetting, baseResultUrl }: any) {
  const settings = homepageSetting || {};
  
  const heroTitle = settings.heroTitle || event.name;
  const heroSubtitle = settings.heroSubtitle || globalSetting?.festMoto || "Celebrating Creativity";
  const heroBgUrl = settings.heroBgUrl || globalSetting?.posterBgUrl || "";
  const heroLogo = globalSetting?.festLogo || null;
  
  const primaryColor = settings.primaryColor || "var(--primary)";
  const secondaryColor = settings.secondaryColor || "var(--secondary)";
  const bgColor = settings.bgColor || "var(--bg-color)";
  
  const aboutTitle = settings.aboutTitle || "About The Fest";
  const aboutText = settings.aboutText || `${event.name} is an intercollegiate arts fest conducted to support and promote the development of educational and extracurricular activities of concerned students.`;
  
  const stat1Label = settings.stat1Label || "Candidates";
  const stat1Value = settings.stat1Value || "4k+";
  const stat2Label = settings.stat2Label || "Institutions";
  const stat2Value = settings.stat2Value || "35+";
  const stat3Label = settings.stat3Label || "Programs";
  const stat3Value = settings.stat3Value || "400+";
  const stat4Label = settings.stat4Label || "States";
  const stat4Value = settings.stat4Value || "20+";

  const contactEmail = settings.contactEmail || "";
  const contactPhone = settings.contactPhone || "";
  const socialFacebook = settings.socialFacebook || "";
  const socialInstagram = settings.socialInstagram || "";
  const socialYoutube = settings.socialYoutube || "";

  const pinnedButtonText = settings.pinnedButtonText || "Live Results";
  const pinnedButtonLogoUrl = settings.pinnedButtonLogoUrl || "";
  
  const committeeMembers = Array.isArray(settings.committeeMembers) ? settings.committeeMembers : [];
  const galleryImages = Array.isArray(settings.galleryImages) ? settings.galleryImages : [];

  // Calculate luminance/brightness of chosen bgColor to ensure high contrast text & cards
  const isLightBg = (() => {
    if (!bgColor || bgColor.startsWith("var")) return false;
    const hex = bgColor.replace(/^#/, '');
    if (hex.length !== 6) return false;
    const rgb = parseInt(hex, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140;
  })();

  const textPrimary = isLightBg ? "#241B1B" : "#FAFAFA";
  const textSecondary = isLightBg ? "#475569" : "#94a3b8";
  const cardBg = isLightBg ? "#ffffff" : "rgba(30, 41, 59, 0.5)";
  const cardBorder = isLightBg ? "#e2e8f0" : "rgba(255, 255, 255, 0.08)";
  const cardShadow = isLightBg ? "0 4px 6px -1px rgba(0, 0, 0, 0.05)" : "none";

  const committeeTitle = settings.committeeTitle || "Program Committee";

  return (
    <div 
      style={{ 
        backgroundColor: bgColor, 
        color: textPrimary,
        minHeight: '100vh', 
        '--primary': primaryColor, 
        '--secondary': secondaryColor,
        '--fest-text-primary': textPrimary,
        '--fest-text-secondary': textSecondary,
        '--fest-card-bg': cardBg,
        '--fest-card-border': cardBorder,
        '--fest-card-shadow': cardShadow,
      } as React.CSSProperties}
    >
      
      {/* Hero Section */}
      <section 
        className={styles.heroSection} 
        style={{ backgroundImage: heroBgUrl ? `url(${heroBgUrl})` : 'none' }}
      >
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          {heroLogo && (
            <img 
              src={heroLogo} 
              alt="Fest Logo" 
              className={styles.heroLogo}
            />
          )}
          <h1 className={styles.heroTitle}>{heroTitle}</h1>
          <p className={styles.heroSubtitle}>{heroSubtitle}</p>
          <Link href={baseResultUrl} className={styles.actionButton} style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
            {pinnedButtonText}
          </Link>
        </div>
      </section>

      {/* Floating Pinned Button */}
      <Link href={baseResultUrl} className={styles.pinnedButton}>
        {pinnedButtonLogoUrl && (
          <img src={pinnedButtonLogoUrl} alt="Logo" style={{ width: 32, height: 32, marginRight: 10, objectFit: 'contain', borderRadius: '4px' }} />
        )}
        {pinnedButtonText}
      </Link>

      {/* About Section */}
      <section className={styles.section} id="about">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{aboutTitle}</h2>
        </div>
        <p className={styles.aboutText}>{aboutText}</p>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stat1Value}</div>
            <div className={styles.statLabel}>{stat1Label}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stat2Value}</div>
            <div className={styles.statLabel}>{stat2Label}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stat3Value}</div>
            <div className={styles.statLabel}>{stat3Label}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stat4Value}</div>
            <div className={styles.statLabel}>{stat4Label}</div>
          </div>
        </div>
      </section>

      {/* Committee Section */}
      {committeeMembers.length > 0 && (
        <section className={styles.section} id="committee" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{committeeTitle}</h2>
          </div>
          <div className={styles.committeeGrid}>
            {committeeMembers.map((member: any, idx: number) => (
              <div key={idx} className={styles.committeeCard}>
                {member.imageUrl ? (
                  <img src={member.imageUrl} alt={member.name} className={styles.committeeImage} />
                ) : (
                  <div className={styles.committeeImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-color)', fontSize: '2rem' }}>👤</div>
                )}
                <h3 className={styles.committeeName}>{member.name}</h3>
                <p className={styles.committeeRole}>{member.role}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <section className={styles.section} id="gallery">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Event Gallery</h2>
          </div>
          <div className={styles.gallerySliderContainer}>
            <div className={styles.galleryTrack}>
              {/* Duplicate the images to create a seamless infinite scroll loop */}
              {[...galleryImages, ...galleryImages].map((url: string, idx: number) => (
                <div key={idx} className={styles.galleryImageWrapper}>
                  <img src={url} alt={`Gallery ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className={styles.section} id="contact" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Contact Us</h2>
        </div>
        <div className={styles.contactGrid}>
          <form className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder="Your Name" className="form-input" required />
            <input type="email" placeholder="Your Email" className="form-input" required />
            <textarea placeholder="Your Message" className="form-input" rows={4} required></textarea>
            <button type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem' }}>Send Message</button>
          </form>

          <div className={styles.contactInfo}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Get in Touch</h3>
            {contactEmail && (
              <div className={styles.contactItem}>
                <span>📧</span>
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </div>
            )}
            {contactPhone && (
              <div className={styles.contactItem}>
                <span>📞</span>
                <a href={`tel:${contactPhone}`}>{contactPhone}</a>
              </div>
            )}
            
            <div className={styles.socialLinks}>
              {socialFacebook && (
                <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                  📘
                </a>
              )}
              {socialInstagram && (
                <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                  📸
                </a>
              )}
              {socialYoutube && (
                <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                  ▶️
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: 'var(--surface-color)', borderTop: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>{event.name}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Powered by CSWC Hiya Fiesta System.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>© {new Date().getFullYear()} {event.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
