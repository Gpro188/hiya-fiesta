import { prisma } from "@/lib/prisma";
import Link from "next/link";
import VisitTracker from "./components/VisitTracker";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let stateFest: any = null;
  let zoneEvents: any[] = [];

  try {
    stateFest = await prisma.event.findFirst({
      where: { type: 'STATE' },
      select: { id: true, name: true }
    });

    zoneEvents = await prisma.event.findMany({
      where: { type: 'ZONE' },
      select: {
        id: true,
        name: true,
        zone: { select: { name: true, code: true } },
        _count: { select: { teams: true, programs: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
  } catch (e) {
    console.error(e);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <VisitTracker />

      {/* CSWC Official Header */}
      <header style={{ padding: '1rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem' }}>
              CS
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>CSWC Hiya Fiesta 2026</h1>
              <div style={{ fontSize: '0.75rem', color: '#ec4899', fontWeight: 600 }}>Council of Samastha Women's Colleges</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/tv" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderColor: '#3b82f6', color: '#3b82f6' }}>
              📺 TV Broadcast
            </Link>
            <Link href="/search" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
              🔍 Search Results
            </Link>
            <Link href="/login" className="btn btn-primary" style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem', backgroundColor: '#ec4899', borderColor: '#ec4899', color: 'white' }}>
              Login Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <main style={{ flex: 1, padding: '3rem 0' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '850px', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', backgroundColor: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', color: '#ec4899', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            • She Can. She Will. •
          </div>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem', color: 'white', lineHeight: 1.15 }}>
            CSWC Hiya Fiesta 2026
          </h2>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', marginBottom: '2rem' }}>
            Centralized Multi-Zone Arts Festival Portal. Supporting 80+ Women's Colleges across 8 Regional Zones.
          </p>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {stateFest && (
              <Link href={`/fest/${stateFest.id}/results`} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', backgroundColor: '#ec4899', borderColor: '#ec4899', color: 'white', borderRadius: '30px' }}>
                🏆 State Final Leaderboard
              </Link>
            )}
            <Link href="/tv" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', borderRadius: '30px' }}>
              📺 Live TV Screen Display
            </Link>
          </div>
        </div>

        {/* 8 Regional Zone Fests */}
        <div className="container">
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'white' }}>Regional Zone Festivals</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Select your regional zone festival to view live standings, schedules, and college leaderboards:</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {zoneEvents.map(ev => (
                <div key={ev.id} className="glass-panel" style={{ padding: '1.25rem', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700 }}>
                      ZONE #{ev.zone?.code}
                    </span>
                    <h4 style={{ color: 'white', margin: '8px 0 4px 0', fontSize: '1.1rem' }}>{ev.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>{ev._count.teams} Colleges Participating</p>
                  </div>
                  <div style={{ marginTop: '1.25rem', display: 'flex', gap: '8px' }}>
                    <Link href={`/fest/${ev.id}/results`} className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center' }}>
                      Results
                    </Link>
                    <Link href={`/tv?eventId=${ev.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderColor: '#3b82f6', color: '#60a5fa' }}>
                      📺 TV
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '2rem 0', backgroundColor: 'rgba(15, 23, 42, 0.9)', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        <div className="container">
          <p style={{ margin: '0 0 6px 0' }}>&copy; 2026 CSWC Hiya Fiesta • Council of Samastha Women's Colleges, Chelari</p>
          <p style={{ margin: 0, fontSize: '0.75rem' }}>Official Centralized ArtsFest Platform</p>
        </div>
      </footer>
    </div>
  );
}
