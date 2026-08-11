import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VisitTracker from "./components/VisitTracker";
import { getHomepageSettings } from "@/lib/settings";
import HeroCarousel from "./components/HeroCarousel";
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
        // Fetch teams and their points for the State Fest
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

        // Special logic: Add internal Karnataka Zone points to the Karnataka Team
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

        // Sort and get top 5
        stateTeams = stateTeams.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);
      }
    }

    if (stateFest) {
      settings = await getHomepageSettings(stateFest.id);
    } else {
      // Fallback if no state fest exists
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

    // Calculate Live Stats
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

  const primaryColor = settings?.primaryColor || "#ec4899";
  const tickerText = settings?.tickerText;
  
  let heroSlides = [];
  let statsCounter = { show_students: true, show_institutions: true, show_events: true, show_points: true };
  let galleryImages = [];
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      <VisitTracker eventId={stateFest?.id || null} />

      {/* Ticker Bar */}
      {tickerText && (
        <div style={{ backgroundColor: primaryColor, color: 'white', padding: '8px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <div className="marquee-container" style={{ display: 'inline-block', animation: 'marquee 25s linear infinite' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', marginRight: '50px' }}>📢 ANNOUNCEMENT: {tickerText}</span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', marginRight: '50px' }}>📢 ANNOUNCEMENT: {tickerText}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--hero-glass-bg)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '45px', height: '45px', objectFit: 'contain' }} />
            <div>
              <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{settings?.heroTitle || "CSWC Hiya Fiesta 2026"}</h1>
              <div style={{ fontSize: '0.75rem', color: primaryColor, fontWeight: 600 }}>Council of Samastha Women's Colleges</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/tv" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderColor: '#3b82f6', color: '#3b82f6' }}>
              📺 TV Broadcast
            </Link>
            <Link href="/login" className="btn btn-primary" style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem', backgroundColor: primaryColor, borderColor: primaryColor, color: 'white' }}>
              Login Portal
            </Link>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {/* Hero Carousel */}
        <HeroCarousel 
          slides={heroSlides} 
          fallbackTitle={settings?.heroTitle || "CSWC Hiya Fiesta 2026"} 
          fallbackSubtitle={settings?.heroSubtitle || "Centralized Multi-Zone Arts Festival Portal."}
          primaryColor={primaryColor} 
        />

        {/* Live Stats */}
        <div className="container" style={{ padding: '4rem 0' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '2.5rem' }}>Live Statistics</h2>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
              <StatCard value={liveStats.completedZones} label="Zones Completed" />
            )}
          </div>
        </div>

        {/* State Fest Leaderboard Section */}
        {isStateLive && stateTeams.length > 0 && (
          <div className="container" style={{ paddingBottom: '4rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '10px', 
                backgroundColor: stateFest?.statusOverride === 'COMPLETED' ? '#ecfdf5' : '#fef2f2', 
                padding: '8px 16px', borderRadius: '30px', marginBottom: '12px', 
                border: stateFest?.statusOverride === 'COMPLETED' ? '1px solid #a7f3d0' : '1px solid #fee2e2' 
              }}>
                <span style={{ 
                  display: 'inline-block', width: '10px', height: '10px', 
                  backgroundColor: stateFest?.statusOverride === 'COMPLETED' ? '#10b981' : '#ef4444', 
                  borderRadius: '50%', 
                  animation: stateFest?.statusOverride === 'COMPLETED' ? 'none' : 'pulse 2s infinite' 
                }}></span>
                <span style={{ 
                  color: stateFest?.statusOverride === 'COMPLETED' ? '#10b981' : '#ef4444', 
                  fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1px' 
                }}>
                  {stateFest?.statusOverride === 'COMPLETED' ? 'COMPLETED' : 'LIVE NOW'}
                </span>
              </div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>State Fest Results</h2>
              <p style={{ color: 'var(--text-muted)' }}>Top Zones competing in the {stateFest?.name}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
              {stateTeams.map((team, idx) => (
                <div key={team.id} style={{ 
                  display: 'flex', alignItems: 'center', padding: '16px 24px', 
                  backgroundColor: idx === 0 ? '#fffbeb' : '#ffffff', 
                  borderRadius: '16px', 
                  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                  border: idx === 0 ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {idx === 0 && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: '#f59e0b' }}></div>}
                  <div style={{ width: '40px', fontSize: '1.5rem', fontWeight: 800, color: idx === 0 ? '#f59e0b' : '#94a3b8' }}>
                    #{idx + 1}
                  </div>
                  <div style={{ flex: 1, paddingLeft: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: team.flagColor || primaryColor }}></div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{team.name}</h3>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: primaryColor, lineHeight: 1 }}>
                      {team.totalPoints}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Points</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Link href={`/hub?eventId=${stateFest.id}`} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem', backgroundColor: primaryColor, borderColor: primaryColor }}>
                View Full State Leaderboard
              </Link>
            </div>
          </div>
        )}

        {/* Interactive Zone Indicator Section */}
        <div className="container" style={{ paddingBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Zone Status</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {zoneEvents.map(ev => {
              const now = new Date();
              let status = 'pending'; 
              let badgeColor = '#94a3b8';
              let badgeText = 'PENDING';

              if (ev.statusOverride && ev.statusOverride !== 'AUTO') {
                switch(ev.statusOverride) {
                  case 'COMPLETED':
                    badgeColor = '#10b981'; badgeText = 'COMPLETED';
                    break;
                  case 'LIVE':
                    badgeColor = '#ef4444'; badgeText = 'LIVE NOW';
                    break;
                  case 'REGISTRATION':
                    badgeColor = '#3b82f6'; badgeText = 'REGISTRATION';
                    break;
                  case 'PENDING':
                    badgeColor = '#94a3b8'; badgeText = 'PENDING';
                    break;
                }
              } else {
                if (ev.endDate && now > ev.endDate) {
                  badgeColor = '#10b981'; badgeText = 'COMPLETED';
                } else if (ev.startDate && now >= ev.startDate) {
                  badgeColor = '#ef4444'; badgeText = 'LIVE NOW';
                } else if (ev.registrationStart && ev.registrationEnd) {
                  if (now >= ev.registrationStart && now <= ev.registrationEnd) {
                    badgeColor = '#3b82f6'; badgeText = 'REGISTRATION';
                  }
                }
              }

              return (
                <Link href={`/hub?eventId=${ev.id}`} key={ev.id} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '1.5rem', 
                    backgroundColor: '#ffffff', 
                    borderRadius: '16px', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '120px',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}>
                    <h4 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 700 }}>{ev.name}</h4>
                    <div>
                      <div style={{ 
                        display: 'inline-block',
                        fontSize: '0.75rem', 
                        padding: '6px 14px', 
                        borderRadius: '20px', 
                        backgroundColor: badgeColor, 
                        color: 'white', 
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                      }}>
                        {badgeText}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Gallery Marquee */}
        {galleryImages.length > 0 && (
          <div style={{ margin: '4rem 0', overflow: 'hidden' }}>
            <h3 style={{ textAlign: 'center', fontSize: '2.25rem', fontWeight: 800, marginBottom: '2rem', color: '#0f172a' }}>Event Gallery</h3>
            <div className="gallery-marquee-container" style={{ display: 'flex', overflow: 'hidden', padding: '1rem 0' }}>
              <div className="gallery-marquee" style={{ display: 'flex', flexShrink: 0, gap: '1rem', paddingRight: '1rem', animation: 'marquee 25s linear infinite' }}>
                {[...galleryImages, ...galleryImages, ...galleryImages].map((url: string, idx: number) => (
                  <img key={idx} src={url} alt="Gallery" style={{ height: '220px', width: '320px', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }} />
                ))}
              </div>
              <div className="gallery-marquee" style={{ display: 'flex', flexShrink: 0, gap: '1rem', paddingRight: '1rem', animation: 'marquee 25s linear infinite' }}>
                {[...galleryImages, ...galleryImages, ...galleryImages].map((url: string, idx: number) => (
                  <img key={`dup-${idx}`} src={url} alt="Gallery" style={{ height: '220px', width: '320px', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Committee Members Section */}
        {committeeMembers.length > 0 && (
          <div className="container" style={{ padding: '4rem 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>{committeeTitle}</h2>
              <div style={{ width: '60px', height: '4px', backgroundColor: primaryColor, margin: '0 auto', borderRadius: '4px' }}></div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', justifyContent: 'center' }}>
              {committeeMembers.map((member: any, idx: number) => (
                <div key={idx} style={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '16px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'transform 0.3s'
                }} className="hover-lift">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${primaryColor}`, marginBottom: '1.5rem' }} />
                  ) : (
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid ${primaryColor}`, marginBottom: '1.5rem', fontSize: '2rem', fontWeight: 700, color: '#94a3b8' }}>
                      {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{member.name}</h3>
                  <p style={{ margin: 0, color: primaryColor, fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        <div style={{ backgroundColor: 'var(--hero-glass-bg)', padding: '4rem 0', borderTop: '1px solid var(--border-color)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Connect With Us</h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" className="social-btn" style={{ padding: '12px 24px', borderRadius: '30px', backgroundColor: '#e1306c', color: 'white', fontWeight: 600, textDecoration: 'none' }}>Instagram</a>
              )}
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" className="social-btn" style={{ padding: '12px 24px', borderRadius: '30px', backgroundColor: '#1877f2', color: 'white', fontWeight: 600, textDecoration: 'none' }}>Facebook</a>
              )}
              {socialLinks.youtube && (
                <a href={socialLinks.youtube} target="_blank" className="social-btn" style={{ padding: '12px 24px', borderRadius: '30px', backgroundColor: '#ff0000', color: 'white', fontWeight: 600, textDecoration: 'none' }}>YouTube</a>
              )}
              {socialLinks.whatsapp_support && (
                <a href={socialLinks.whatsapp_support} target="_blank" className="social-btn" style={{ padding: '12px 24px', borderRadius: '30px', backgroundColor: '#25d366', color: 'white', fontWeight: 600, textDecoration: 'none' }}>WhatsApp Support</a>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '2rem 0', backgroundColor: 'var(--bg-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <div className="container">
          <p style={{ margin: '0 0 6px 0' }}>&copy; 2026 CSWC Hiya Fiesta • Council of Samastha Women's Colleges, Chelari</p>
          <p style={{ margin: 0, fontSize: '0.75rem' }}>Official Centralized ArtsFest Platform</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ value, label }: { value: number, label: string }) {
  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      padding: '2rem 1.5rem', 
      borderRadius: '16px', 
      minWidth: '220px', 
      textAlign: 'center', 
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
      flex: 1
    }}>
      <div style={{ fontSize: '3rem', fontWeight: 800, color: '#6366f1', marginBottom: '0.5rem', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

