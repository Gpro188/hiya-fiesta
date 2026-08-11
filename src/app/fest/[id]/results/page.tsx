import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PublicDashboard from "../../../components/PublicDashboard";
import VisitTracker from "../../../components/VisitTracker";
import { getSettings, getHomepageSettings } from "@/lib/settings";
import ThemeApplicator from "../../../components/ThemeApplicator";

export const revalidate = 30; // Revalidate standings every 30 seconds

export default async function FestPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      parent: {
        include: { subEvents: true }
      },
      subEvents: true
    }
  });

  if (!event) {
    notFound();
  }

  // Gather all related events for the dynamic tab switcher
  const allEvents: any[] = [];
  let mainEventName = event.name;

  if (event.parentId) {
    // It's a sub-event, so include sibling sub-events
    mainEventName = event.parent!.name;
    event.parent!.subEvents.forEach(sub => {
      allEvents.push({ id: sub.id, name: sub.name });
    });
  } else {
    // It's a main event, so include all its sub-events
    event.subEvents.forEach(sub => {
      allEvents.push({ id: sub.id, name: sub.name });
    });
  }

  // If the user landed on the main event page directly, default to showing the first sub-event instead of the empty main event
  const initialActiveId = event.parentId ? event.id : (allEvents[0]?.id || event.id);

  const settings = await getSettings(event.id);
  const homepageSettings = await getHomepageSettings(event.id);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ThemeApplicator 
        primaryColor={homepageSettings?.primaryColor}
        secondaryColor={homepageSettings?.secondaryColor}
        bgColor={homepageSettings?.bgColor}
      />
      <VisitTracker eventId={event.id} />

      {/* Header */}
      <header style={{ 
        padding: 'var(--spacing-md) 0', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)', 
              background: settings.festLogo ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              overflow: 'hidden'
            }}>
              {settings.festLogo ? (
                <img src={settings.festLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                mainEventName.charAt(0)
              )}
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', margin: 0, letterSpacing: '-0.5px', color: 'white' }}>{mainEventName}</h1>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{settings.festMoto}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <Link href={`/search?eventId=${event.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
              🔍 Search
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 'var(--spacing-xl) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
             <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>{mainEventName}</h2>
             <p style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>Live Results Dashboard</p>
          </div>
          
          <PublicDashboard initialEvents={allEvents} initialActiveId={initialActiveId} />
        </div>
      </main>

      {/* Brand Advertisement Footer */}
      <footer style={{ 
        padding: 'var(--spacing-xl) 0', 
        borderTop: '1px solid var(--border-color)', 
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        textAlign: 'center', 
        color: 'var(--text-muted)',
        marginTop: 'var(--spacing-xxl)'
      }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <p style={{ margin: 0 }}>&copy; 2026 {event.name} • Live Leaderboard Standings</p>
          
          {/* Brand Ad Link */}
          <div className="glass-panel" style={{ 
            padding: '12px 24px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid rgba(79, 70, 229, 0.15)',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(6, 182, 212, 0.05))',
            marginTop: '10px',
            maxWidth: '550px'
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
              ⚡ Powered by <strong>CSWC Hiya Fiesta_artsfest system</strong>.
            </p>
            <Link href="/" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Host your own arts fest on this system ➔
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
