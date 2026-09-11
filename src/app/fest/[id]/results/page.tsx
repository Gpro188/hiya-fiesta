import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PublicDashboard from "../../../components/PublicDashboard";
import VisitTracker from "../../../components/VisitTracker";
import { getSettings, getHomepageSettings } from "@/lib/settings";
import ThemeApplicator from "../../../components/ThemeApplicator";
import PublicNav from "../../../components/PublicNav";
import PublicFooter from "../../../components/PublicFooter";
import FestCountdownView from "../../../components/FestCountdownView";
import "@/app/homepage.css";

export const revalidate = 30; // Revalidate standings every 30 seconds

export default async function FestPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      parent: {
        include: { subEvents: true }
      },
      subEvents: true,
      zone: true,
    }
  });

  if (!event) {
    notFound();
  }

  // For zone and specific event results pages, display its own name and keep it dedicated
  const allEvents: any[] = [{ id: event.id, name: event.name }];
  let mainEventName = event.name;

  // Default active event is this event
  const initialActiveId = event.id;

  const settings = await getSettings(event.id);
  const homepageSettings = await getHomepageSettings(event.id);

  // Check if festival has started or is live/completed
  const now = new Date();
  const startTarget = event.zoneActiveStartTime || event.startDate || event.parent?.startDate;
  const endTarget = event.zoneActiveEndTime || event.endDate || event.parent?.endDate;

  const isExplicitLive = event.statusOverride === "LIVE";
  const isExplicitCompleted = event.statusOverride === "COMPLETED";
  const isSchedulePublished = 
    event.statusOverride === "SCHEDULE_PUBLISHED" || 
    isExplicitLive || 
    isExplicitCompleted;
  
  // Festival is completed if explicitly COMPLETED or if endTarget has passed
  const isCompleted = isExplicitCompleted || Boolean(event.statusOverride === "AUTO" && endTarget && now > endTarget);

  // Festival is started/live if explicitly LIVE or if startTarget has passed and not yet completed
  const isStarted = isExplicitLive || Boolean(event.statusOverride === "AUTO" && startTarget && now >= startTarget && !isCompleted);

  // Results & Standings Dashboard ONLY renders when festival is LIVE or COMPLETED
  const showResultsDashboard = isStarted || isCompleted;

  let preFestData = { teamsCount: 0, candidatesCount: 0, programsCount: 0, programsList: [] as any[] };
  if (!showResultsDashboard) {
    const [teamsCount, candidatesCount, programsList] = await Promise.all([
      prisma.team.count({ where: { eventId: event.id } }),
      prisma.candidate.count({ where: { team: { eventId: event.id } } }),
      prisma.program.findMany({
        where: { eventId: event.id, type: { not: 'BREAK' } },
        include: { category: { select: { name: true } } },
        orderBy: [{ startTime: "asc" }, { name: "asc" }],
      }),
    ]);

    preFestData = {
      teamsCount,
      candidatesCount,
      programsCount: programsList.length,
      programsList,
    };
  }

  return (
    <div 
      className="hf-root"
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        background: '#ffffff',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <VisitTracker eventId={event.id} />

      {/* Modern Public Navigation */}
      <PublicNav eventName={mainEventName} showSearch={true} showLogin={false} />

      {/* ── Official Title Band with Motion & Banner ── */}
      <div 
        className="title-band"
        style={{
          background: homepageSettings?.heroBgUrl 
            ? `linear-gradient(160deg, rgba(163, 0, 92, 0.88), rgba(26, 20, 32, 0.94)), url(${homepageSettings.heroBgUrl}) center/cover no-repeat`
            : 'linear-gradient(160deg, var(--maroon-deep, #a3005c), var(--ink, #1a1420) 85%)',
          color: '#ffffff',
          textAlign: 'center',
          padding: '54px 24px 44px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '1180px', margin: '0 auto' }}>
          <span 
            className="eyebrow" 
            style={{ 
              color: isCompleted ? '#34d399' : isStarted ? '#4ade80' : 'var(--gold-light, #ff8fc4)', 
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 700,
              display: 'block'
            }}
          >
            {isCompleted 
              ? "🏆 Festival Completed · Official Final Standings" 
              : isStarted 
              ? "🟢 Official Live Results Portal · Competitions Active" 
              : "⏳ Festival Scheduled & Upcoming Countdown"}
          </span>
          <h1 
            style={{ 
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(32px, 5.5vw, 54px)', 
              fontWeight: 800, 
              marginTop: '10px',
              marginBottom: '4px',
              letterSpacing: '-0.01em',
              color: '#ffffff'
            }}
          >
            {mainEventName}
          </h1>
          <p style={{ color: '#d8cdc2', margin: '8px 0 0', fontSize: '15px' }}>
            {isCompleted 
              ? "Official Final Scores & All Program Results Published" 
              : isStarted 
              ? "Live Real-Time Results & Current Standings" 
              : "Festival Schedule & Countdown"}
          </p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <main style={{ flex: 1, padding: '32px 0 3.5rem 0' }}>
        <div className="wrap" style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 24px' }}>
          {!showResultsDashboard ? (
            <FestCountdownView
              eventName={mainEventName}
              festName={homepageSettings?.heroTitle || settings.festName}
              festMoto={homepageSettings?.heroSubtitle || settings.festMoto}
              startDate={startTarget || ""}
              teamsCount={preFestData.teamsCount}
              candidatesCount={preFestData.candidatesCount}
              programsCount={preFestData.programsCount}
              isSchedulePublished={isSchedulePublished}
              programsList={preFestData.programsList as any}
            />
          ) : (
            <PublicDashboard initialEvents={allEvents} initialActiveId={initialActiveId} />
          )}
        </div>
      </main>

      {/* Shared Branded Footer */}
      <PublicFooter eventName={mainEventName} />
    </div>
  );
}
