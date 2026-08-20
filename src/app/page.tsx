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

  const galleryTiles: string[] = galleryImages.length > 0 ? galleryImages : [];

  return (
    <div className="hf-root">
      <VisitTracker eventId={stateFest?.id || null} />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="brand">
            <div className="seal-box">
              <img src="/icon.png" alt="CSWC Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div className="brand-text">
              <div className="name">{settings?.heroTitle || "Hiya Fiesta 2026"}</div>
              <div className="sub">Council of Samastha Women&apos;s Colleges</div>
            </div>
          </Link>
          <div className="nav-actions">
            <Link className="btn btn-ghost btn-tv-broadcast" href="/tv">
              ▣ TV Broadcast
            </Link>
            <Link className="btn btn-solid" href="/login">
              Login Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO & MOTION BANNER ─────────────────────────────────── */}
      <section className="hero">
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />
        
        {settings?.heroBgUrl && (
          <div
            className="hero-bg-custom"
            style={{
              backgroundImage: `url(${settings.heroBgUrl})`,
            }}
          />
        )}

        <div className="wrap hero-inner">
          <span className="pill">
            <span className="live-dot"></span> 
            {isStateLive ? "State Fest · Live Now" : "Zone Fest · Live Now"}
          </span>
          <h1>
            Hiya Fiesta<br />
            <em>2026</em>
          </h1>
          <p className="lede">
            {heroSubtitle || "A celebration of innovation and creativity, across every zone of the Council of Samastha Women's Colleges."}
          </p>
          <div className="hero-actions">
            {isStateLive && stateFest ? (
              <Link className="btn btn-solid" href={`/fest/${stateFest.id}/results`}>
                View State Status
              </Link>
            ) : (
              <a className="btn btn-solid" href="#zones">
                View Zone Status
              </a>
            )}
            <a className="btn btn-ghost" href="#gallery">
              Browse Gallery
            </a>
          </div>
        </div>
      </section>

      {/* ── TICKER ──────────────────────────────────────────────── */}
      <div className="ticker" aria-hidden="false">
        <div className="ticker-track">
          {[...zonesWithStatus, ...zonesWithStatus].map((z, idx) => (
            <div className="tick-item" key={idx}>
              <span className={`status-dot ${z.badgeText === 'LIVE NOW' ? 'live' : z.badgeText === 'COMPLETED' ? 'done' : 'pending'}`}></span>
              <span className="zname">{z.name.toUpperCase()} ZONE</span>
              <span className="zstatus">— {z.badgeText}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── LIVE STATISTICS ─────────────────────────────────────── */}
      <section id="stats">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Real-Time Data</span>
            <div className="finial"></div>
            <h2>Live Statistics</h2>
          </div>
          <div className="stats-grid">
            {statsCounter.show_institutions && (
              <div className="stat-card">
                <div className="num mono">{liveStats.institutions}</div>
                <div className="label">Institutions</div>
              </div>
            )}
            {statsCounter.show_students && (
              <div className="stat-card">
                <div className="num mono">{liveStats.students}</div>
                <div className="label">Students</div>
              </div>
            )}
            {statsCounter.show_events && (
              <div className="stat-card">
                <div className="num mono">{liveStats.programs}</div>
                <div className="label">Competitions</div>
              </div>
            )}
            {statsCounter.show_points && (
              <div className="stat-card gold">
                <div className="num mono">{liveStats.completedZones}</div>
                <div className="label">Zones Completed</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── STATE LEADERBOARD (WHEN STATE IS LIVE) ────────────────── */}
      {isStateLive && stateTeams.length > 0 && (
        <section style={{ background: '#FFF8FA', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">
                {stateFest?.statusOverride === 'COMPLETED' ? 'Final Standings' : 'State Final Live'}
              </span>
              <div className="finial"></div>
              <h2>State Fest Results</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '840px', margin: '0 auto' }}>
              {stateTeams.map((team, idx) => (
                <div key={team.id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '18px 24px',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow)',
                  border: idx === 0 ? '2px solid var(--maroon)' : '1px solid var(--line)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  {idx === 0 && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '6px', background: 'var(--gold)' }} />}
                  <div className="mono" style={{ width: '44px', fontSize: '1.3rem', fontWeight: 700, color: idx === 0 ? 'var(--maroon)' : 'var(--slate)' }}>
                    #{idx + 1}
                  </div>
                  <div style={{ flex: 1, paddingLeft: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: team.flagColor || 'var(--maroon)' }} />
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)' }}>{team.name}</h3>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--maroon)', lineHeight: 1 }}>
                      {team.totalPoints}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Points</div>
                  </div>
                </div>
              ))}
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <Link href={`/fest/${stateFest.id}/results`} className="btn btn-solid" style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
                  View Full State Leaderboard →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── ZONE STATUS ─────────────────────────────────────────── */}
      <section id="zones" style={{ background: 'var(--card)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Live Tracking</span>
            <div className="finial"></div>
            <h2>Zone Status</h2>
          </div>
          <div className="zone-grid">
            {zonesWithStatus.map(ev => (
              <Link className="zone-card" href={`/fest/${ev.id}/results`} key={ev.id}>
                <span className="go">→</span>
                <h3>{ev.name}</h3>
                <span className="zone-status-tag">
                  <span className={`status-dot ${ev.badgeText === 'LIVE NOW' ? 'live' : ev.badgeText === 'COMPLETED' ? 'done' : 'pending'}`}></span>
                  {ev.badgeText}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENT GALLERY ───────────────────────────────────────── */}
      <section id="gallery">
        <div className="wrap">
          <div className="section-head" style={{ textAlign: 'left', marginBottom: '26px' }}>
            <span className="eyebrow">Moments</span>
            <div className="finial left"></div>
            <h2>Event Gallery</h2>
          </div>
          <div className="gallery-viewport">
            <div className="gallery-track">
              {(galleryTiles.length > 0 ? [...galleryTiles, ...galleryTiles, ...galleryTiles] : [
                { bg: "linear-gradient(155deg,#7a1f3d,#4e1327)", cap: "Inaugural Ceremony" },
                { bg: "linear-gradient(155deg,#c9a227,#8a6d16)", cap: "Certificate Distribution" },
                { bg: "linear-gradient(155deg,#1f6d5a,#123f34)", cap: "Faculty Address" },
                { bg: "linear-gradient(155deg,#4e1327,#1c1420)", cap: "Opening Session" },
                { bg: "linear-gradient(155deg,#8a6d16,#c9a227)", cap: "Group Recognition" },
                { bg: "linear-gradient(155deg,#3a2e3d,#1c1420)", cap: "Chelari Campus" }
              ]).map((item, idx) => {
                if (typeof item === 'string') {
                  return (
                    <div className="tile" key={idx}>
                      <img 
                        src={item} 
                        alt={`Hiya Fiesta Moment ${(idx % (galleryTiles.length || 1)) + 1}`} 
                        className="tile-img" 
                        loading="lazy"
                      />
                      <div className="tile-cam">▣</div>
                      <div className="cap">Hiya Fiesta Moments</div>
                    </div>
                  );
                }
                return (
                  <div className="tile" key={idx} style={{ background: item.bg }}>
                    <div className="tile-cam">▣</div>
                    <div className="cap">{item.cap}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="seal-box" style={{ margin: '0 auto 18px' }}>
            <img src="/icon.png" alt="CSWC Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <h2>Connect With Us</h2>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '22px 0 26px' }}>
            {socialLinks.instagram && (
              <a className="contact-icon" href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
                📸
              </a>
            )}
            {socialLinks.youtube && (
              <a className="contact-icon" href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" title="YouTube">
                ▶
              </a>
            )}
            {socialLinks.whatsapp_support && (
              <a className="contact-icon" href={socialLinks.whatsapp_support} target="_blank" rel="noopener noreferrer" title="WhatsApp Support">
                💬
              </a>
            )}
            <Link className="contact-icon" href="/tv" title="TV Broadcast">
              📺
            </Link>
          </div>

          <hr />
          <p className="fine">
            © 2026 <b>CSWC Hiya Fiesta</b> · Council of Samastha Women&apos;s Colleges, Chelari<br />
            Official Centralized ArtsFest Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
