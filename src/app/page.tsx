import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VisitTracker from "./components/VisitTracker";
import { getHomepageSettings } from "@/lib/settings";
import HomeMarquee from "./components/HomeMarquee";
import { StatCard } from "./components/HomeStatCard";
import GalleryMarquee from "./components/GalleryMarquee";
import "./homepage.css";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let stateFest: any = null;
  let zoneEvents: any[] = [];
  let settings: any = null;
  let liveStats = { students: 0, institutions: 0, programs: 0, completedZones: 0 };
  let stateTeams: any[] = [];
  let isStateLive = false;

  try {
    stateFest = await prisma.event.findFirst({
      where: { type: 'STATE' },
      select: { 
        id: true, 
        name: true,
        startDate: true,
        endDate: true,
        statusOverride: true,
      }
    });

    if (stateFest) {
      const now = new Date();
      if (stateFest.statusOverride === 'LIVE' || stateFest.statusOverride === 'COMPLETED') {
        isStateLive = true;
      } else if (stateFest.statusOverride === 'AUTO' || !stateFest.statusOverride) {
        if (stateFest.startDate && now >= stateFest.startDate) {
          isStateLive = true;
        }
      }

      if (isStateLive) {
        const teamsRaw = await prisma.team.findMany({
          where: { eventId: stateFest.id },
          select: {
            id: true,
            name: true,
            flagColor: true,
            results: {
              where: { isPublished: true },
              select: { points: true }
            }
          }
        });
        
        stateTeams = teamsRaw.map(team => ({
          ...team,
          totalPoints: team.results.reduce((sum: number, r: any) => sum + r.points, 0)
        }));

        const karTeamIndex = stateTeams.findIndex(t => t.name.toUpperCase().includes('KARNATAKA'));
        if (karTeamIndex !== -1) {
          const karZone = await prisma.event.findFirst({
            where: { type: 'ZONE', name: { contains: 'KARNATAKA' } },
            select: { id: true }
          });
          
          if (karZone) {
            const karPoints = await prisma.result.aggregate({
              where: {
                isPublished: true,
                program: { eventId: karZone.id }
              },
              _sum: { points: true }
            });
            
            if (karPoints._sum.points) {
              stateTeams[karTeamIndex].totalPoints += karPoints._sum.points;
            }
          }
        }

        stateTeams = stateTeams.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);
      }
    }

    if (stateFest) {
      settings = await getHomepageSettings(stateFest.id);
    } else {
      const firstEvent = await prisma.event.findFirst();
      if (firstEvent) settings = await getHomepageSettings(firstEvent.id);
    }

    zoneEvents = await prisma.event.findMany({
      where: { 
        type: 'ZONE',
        statusOverride: { not: 'HIDDEN' }
      },
      select: {
        id: true,
        name: true,
        registrationStart: true,
        registrationEnd: true,
        startDate: true,
        endDate: true,
        statusOverride: true,
        zone: { select: { name: true, code: true } },
        _count: { select: { teams: true, programs: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    liveStats.institutions = await prisma.masterInstitution.count();
    liveStats.students = await prisma.candidate.count();
    liveStats.programs = await prisma.program.count({ where: { type: { not: 'BREAK' } } });
    
    const now = new Date();
    liveStats.completedZones = zoneEvents.filter(ev => {
      if (ev.statusOverride === 'COMPLETED') return true;
      if (ev.statusOverride === 'AUTO' && ev.endDate && now > ev.endDate) return true;
      return false;
    }).length;

  } catch (e) {
    console.error(e);
  }

  const primaryColor = settings?.primaryColor || "#D6165C";
  const tickerText = settings?.tickerText;
  const heroEyebrow = settings?.heroEyebrow || "STATE FINAL · LIVE NOW";
  const heroBannerText = settings?.heroBannerText || "";
  const heroTitle = settings?.heroTitle || "CSWC Hiya Fiesta 2026";
  const heroSubtitle = settings?.heroSubtitle || "Centralized Multi-Zone Arts Festival Platform";
  
  let heroSlides: any[] = [];
  let statsCounter = { show_students: true, show_institutions: true, show_events: true, show_points: true };
  let galleryImages: string[] = [];
  let socialLinks: any = {};
  let committeeMembers: any[] = [];
  let committeeTitle = settings?.committeeTitle || "Program Committee";

  try {
    if (settings?.heroSlides && typeof settings.heroSlides === 'object') heroSlides = settings.heroSlides;
    if (settings?.statsCounter && typeof settings.statsCounter === 'object') statsCounter = settings.statsCounter;
    if (settings?.galleryImages && typeof settings.galleryImages === 'object') galleryImages = settings.galleryImages;
    if (settings?.socialLinks && typeof settings.socialLinks === 'object') socialLinks = settings.socialLinks;
    if (settings?.committeeMembers && typeof settings.committeeMembers === 'object') committeeMembers = settings.committeeMembers;
  } catch(e) {}

  // ── Compute per-zone badge data (shared between marquee + zone grid) ──
  const now = new Date();
  const zonesWithStatus = zoneEvents.map(ev => {
    let badgeText = "PENDING";
    let badgeClass = "hf-badge-pending";

    if (ev.statusOverride && ev.statusOverride !== 'AUTO') {
      switch(ev.statusOverride) {
        case 'COMPLETED':  badgeText = "COMPLETED";    badgeClass = "hf-badge-completed";    break;
        case 'LIVE':       badgeText = "LIVE NOW";     badgeClass = "hf-badge-live";         break;
        case 'REGISTRATION': badgeText = "REGISTRATION"; badgeClass = "hf-badge-registration"; break;
        case 'PENDING':    badgeText = "PENDING";      badgeClass = "hf-badge-pending";      break;
      }
    } else {
      if (ev.endDate && now > ev.endDate) {
        badgeText = "COMPLETED"; badgeClass = "hf-badge-completed";
      } else if (ev.startDate && now >= ev.startDate) {
        badgeText = "LIVE NOW"; badgeClass = "hf-badge-live";
      } else if (ev.registrationStart && ev.registrationEnd &&
                 now >= ev.registrationStart && now <= ev.registrationEnd) {
        badgeText = "REGISTRATION"; badgeClass = "hf-badge-registration";
      }
    }

    return { ...ev, badgeText, badgeClass };
  });

  // ── Gallery tiles: use real images or 4 placeholder slots ──
  const galleryTiles: string[] = galleryImages.length > 0
    ? galleryImages
    : [];

  return (
    <div className="hf-root">
      <VisitTracker eventId={stateFest?.id || null} />

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="hf-nav">
        <div className="hf-nav-inner">
          <Link href="/" className="hf-nav-brand">
            <img src="/icon.png" alt="CSWC Logo" className="hf-nav-logomark" />
            <div>
              <div className="hf-nav-title">
                {settings?.heroTitle || "CSWC Hiya Fiesta 2026"}
              </div>
              <div className="hf-nav-sub">Council of Samastha Women's Colleges</div>
            </div>
          </Link>

          <div className="hf-nav-actions">
            <Link href="/tv" className="hf-btn-ghost">
              📺 TV Broadcast
            </Link>
            <Link href="/login" className="hf-btn-pill">
              Login Portal
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="hf-hero">
          {/* Background image (from admin settings) with slow-zoom animation */}
          {settings?.heroBgUrl && (
            <div
              className="hf-hero-bg-img"
              aria-hidden="true"
              style={{ backgroundImage: `url(${settings.heroBgUrl})` }}
            />
          )}

          {/* Animated floating orbs */}
          <div className="hf-hero-orb hf-hero-orb-1" aria-hidden="true" />
          <div className="hf-hero-orb hf-hero-orb-2" aria-hidden="true" />
          <div className="hf-hero-orb hf-hero-orb-3" aria-hidden="true" />

          {/* Diagonal hairline texture */}
          <div className="hf-hero-texture" aria-hidden="true" />

          <div className="hf-hero-content">
            <div className="hf-hero-eyebrow">
              <span className="hf-eyebrow-dot" aria-hidden="true" />
              {heroEyebrow}
            </div>

            <h1 className="hf-hero-title">
              {heroTitle}
            </h1>

            <p className="hf-hero-sub">
              {heroSubtitle}
            </p>
          </div>
        </section>

        {/* ── OPTIONAL BANNER RIBBON ──────────────────────── */}
        {heroBannerText && (
          <div style={{
            background: '#D6165C',
            color: '#fff',
            padding: '8px 0',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            borderBottom: '1px solid rgba(255,61,128,0.3)'
          }}>
            <div style={{
              display: 'inline-block',
              animation: 'hf-marquee-scroll 20s linear infinite',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.05em'
            }}>
              <span style={{ marginRight: 60 }}>📢 {heroBannerText}</span>
              <span style={{ marginRight: 60 }}>📢 {heroBannerText}</span>
            </div>
          </div>
        )}

        {/* ── MARQUEE TICKER ──────────────────────────────── */}
        <HomeMarquee zones={zonesWithStatus.map(z => ({ id: z.id, name: z.name, badgeText: z.badgeText }))} />

        {/* ── LIVE STATISTICS ─────────────────────────────── */}
        <section className="hf-section-light">
          <div className="hf-section-inner">
            <div className="hf-section-kicker">Real-time data</div>
            <h2 className="hf-section-title">Live Statistics</h2>
            <div className="hf-stats-grid">
              {statsCounter.show_institutions && (
                <StatCard value={liveStats.institutions} label="Institutions" />
              )}
              {statsCounter.show_students && (
                <StatCard value={liveStats.students} label="Students" />
              )}
              {statsCounter.show_events && (
                <StatCard value={liveStats.programs} label="Competitions" />
              )}
              {statsCounter.show_points && (
                <StatCard value={liveStats.completedZones} label="Zones Completed" isGold />
              )}
            </div>
          </div>
        </section>

        {/* ── STATE LEADERBOARD ────────────────────────────── */}
        {isStateLive && stateTeams.length > 0 && (
          <section className="hf-section-light" style={{ paddingTop: 0 }}>
            <div className="hf-section-inner">
              <div className="hf-section-kicker">
                {stateFest?.statusOverride === 'COMPLETED' ? 'Final Results' : 'Live Now'}
              </div>
              <h2 className="hf-section-title">State Fest Results</h2>
              <p style={{ color: 'var(--pending)', marginBottom: '2rem', fontFamily: 'Manrope, sans-serif', fontSize: '0.95rem' }}>
                Top Zones competing in the {stateFest?.name}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '820px' }}>
                {stateTeams.map((team, idx) => (
                  <div key={team.id} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '16px 24px',
                    backgroundColor: idx === 0 ? '#fffbeb' : '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    border: idx === 0 ? `2px solid ${primaryColor}` : '1px solid rgba(43,34,48,0.1)',
                    position: 'relative', overflow: 'hidden'
                  }}>
                    {idx === 0 && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: 'var(--gold)' }} />}
                    <div style={{ width: '40px', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.2rem', fontWeight: 700, color: idx === 0 ? 'var(--gold)' : 'var(--pending)' }}>
                      #{idx + 1}
                    </div>
                    <div style={{ flex: 1, paddingLeft: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: team.flagColor || primaryColor }} />
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: 'var(--graphite)' }}>{team.name}</h3>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.6rem', fontWeight: 700, color: 'var(--pink)', lineHeight: 1 }}>
                        {team.totalPoints}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--pending)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Points</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '2rem' }}>
                <Link href={`/hub?eventId=${stateFest.id}`} className="hf-btn-pill" style={{ fontSize: '0.9rem', height: '44px', padding: '0 1.75rem' }}>
                  View Full State Leaderboard
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── ZONE STATUS ──────────────────────────────────── */}
        <section className="hf-section-light" style={{ paddingTop: 0 }}>
          <div className="hf-section-inner">
            <div className="hf-section-kicker">Live tracking</div>
            <h2 className="hf-section-title">Zone Status</h2>
            <div className="hf-zone-grid">
              {zonesWithStatus.map(ev => (
                <Link href={`/hub?eventId=${ev.id}`} key={ev.id} className="hf-zone-card">
                  <h3 className="hf-zone-name">{ev.name}</h3>
                  <div>
                    <span className={`hf-zone-badge ${ev.badgeClass}`}>
                      <span className="hf-badge-dot" aria-hidden="true" />
                      {ev.badgeText}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── EVENT GALLERY ─────────────────────────────────── */}
        {galleryTiles.length > 0 && (
          <section className="hf-gallery-section">
            <div className="hf-gallery-title-wrap">
              <div className="hf-section-kicker">Moments</div>
              <h2 className="hf-section-title">Event Gallery</h2>
            </div>
            <GalleryMarquee images={galleryTiles} />
          </section>
        )}

        {/* ── COMMITTEE MEMBERS ─────────────────────────────── */}
        {committeeMembers.length > 0 && (
          <section className="hf-section-light">
            <div className="hf-section-inner">
              <div className="hf-section-kicker">Meet the team</div>
              <h2 className="hf-section-title">{committeeTitle}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                {committeeMembers.map((member: any, idx: number) => (
                  <div key={idx} style={{
                    backgroundColor: 'var(--paper)',
                    borderRadius: 'var(--hf-radius)',
                    boxShadow: '0 8px 24px rgba(43,34,48,0.08)',
                    overflow: 'hidden', textAlign: 'center',
                    padding: '2rem 1.25rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transition: 'transform 0.2s'
                  }}>
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: `3px solid var(--pink)`, marginBottom: '1.25rem' }} />
                    ) : (
                      <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--pink)', marginBottom: '1.25rem', fontSize: '2rem', fontWeight: 700, color: 'var(--pending)' }}>
                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: 'var(--graphite)' }}>{member.name}</h3>
                    <p style={{ margin: 0, color: 'var(--pink)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CONNECT / FOOTER ──────────────────────────────── */}
        <footer className="hf-connect">
          <h2 className="hf-connect-title">Connect With Us</h2>
          <div className="hf-socials">
            {socialLinks.instagram && (
              <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hf-social-btn hf-social-insta" title="Instagram" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            )}
            {socialLinks.facebook && (
              <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hf-social-btn hf-social-fb" title="Facebook" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {socialLinks.youtube && (
              <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hf-social-btn hf-social-yt" title="YouTube" aria-label="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
              </a>
            )}
            {socialLinks.whatsapp_support && (
              <a href={socialLinks.whatsapp_support} target="_blank" rel="noopener noreferrer" className="hf-social-btn hf-social-wa" title="WhatsApp" aria-label="WhatsApp Support">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </a>
            )}
            <Link href="/tv" className="hf-social-btn hf-social-tv" title="TV Broadcast" aria-label="TV Broadcast">
              📺
            </Link>
          </div>

          <p className="hf-footer-copy">
            © 2026 <span className="hf-footer-copy-accent">CSWC Hiya Fiesta</span> · Council of Samastha Women&apos;s Colleges, Chelari<br />
            Official Centralized ArtsFest Platform
          </p>
        </footer>
      </main>
    </div>
  );
}
