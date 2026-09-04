import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ScoringForm from "./ScoringForm";
import ResultList from "./ResultList";
import TeamScorePreview from "./TeamScorePreview";
import ExcelExport from "./ExcelExport";
import PendingProgramsList from "./PendingProgramsList";
import EventSwitcher from "@/app/components/EventSwitcher";

export default async function ScoringPage(props: {
  searchParams: Promise<{ eventId?: string, session?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  // Scope events strictly to logged in Admin's main event and its sub-events
  const userEventId = session.user.eventId;
  let eventWhere: any = userEventId ? {
    OR: [
      { id: userEventId },
      { parentId: userEventId }
    ]
  } : {};

  if (session.user.role === "SUPER_ADMIN") {
    if (searchParams.session === "state") {
      eventWhere = { type: "STATE" };
    } else if (searchParams.session === "zone") {
      eventWhere = { type: "ZONE" };
    }
  }

  const rawEvents = await prisma.event.findMany({
    where: eventWhere,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true }
  });

  // Deduplicate events by normalized name to prevent duplicate event switcher tabs
  const seenEventNames = new Set<string>();
  const events = rawEvents.filter(ev => {
    const key = ev.name.trim().toLowerCase();
    if (seenEventNames.has(key)) return false;
    seenEventNames.add(key);
    return true;
  });

  const activeEventId = (searchParams.eventId && events.some(e => e.id === searchParams.eventId)) 
    ? searchParams.eventId 
    : events[0]?.id;

  if (!activeEventId) {
    return (
        <div className="animate-fade-in" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
            <h2>No Events Found</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              Create an event and add programs with candidate assignments to begin scoring.
            </p>
            <a href="/dashboard/events" className="btn btn-primary">Go to Events</a>
        </div>
    );
  }

  const activeEvent = await prisma.event.findUnique({
    where: { id: activeEventId },
    select: {
      id: true,
      name: true,
      parentId: true,
      teams: {
        select: {
          id: true,
          name: true,
          flagColor: true,
          magazineCode: true
        }
      }
    }
  });

  if (!activeEvent) redirect("/dashboard/scoring");

  const programsEventId = activeEvent.parentId || activeEvent.id;

  const programsForScoring = await prisma.program.findMany({
    where: { eventId: programsEventId },
    select: {
      id: true,
      name: true,
      type: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          pointMatrix: true,
        }
      },
      results: {
        where: {
          OR: [
            { team: { eventId: activeEventId } },
            { candidate: { team: { eventId: activeEventId } } }
          ]
        },
        select: {
          id: true,
          marks: true,
          rank: true,
          grade: true,
          points: true,
          candidateId: true,
          teamId: true
        }
      },
      assignments: {
        where: {
          candidate: { team: { eventId: activeEventId } }
        },
        select: {
          id: true,
          candidate: {
            select: {
              id: true,
              name: true,
              chestNumber: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  flagColor: true
                }
              }
            }
          }
        }
      }
    }
  });

  const activeEventWithPrograms = {
    ...activeEvent,
    programs: programsForScoring
  };

  if (!activeEvent) redirect("/dashboard/scoring");

  // Fetch results, pending programs, and flat results for standings in PARALLEL
  const [results, allPrograms, allResultsForScore] = await Promise.all([
    prisma.result.findMany({
      where: { 
        OR: [
          { team: { eventId: activeEventId } },
          { candidate: { team: { eventId: activeEventId } } }
        ]
      },
      select: {
        id: true,
        marks: true,
        points: true,
        rank: true,
        grade: true,
        isPublished: true,
        candidateId: true,
        teamId: true,
        programId: true,
        createdAt: true,
        candidate: { select: { name: true, chestNumber: true, team: { select: { name: true, flagColor: true } }, category: { select: { name: true } } } },
        team: { select: { name: true, flagColor: true } },
        program: { select: { id: true, name: true, category: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Limit to 200 for speed
    }),
    prisma.program.findMany({
      where: { 
        eventId: programsEventId, 
        assignments: { some: { candidate: { team: { eventId: activeEventId } } } } 
      },
      select: {
        id: true,
        name: true,
        results: { 
          where: {
            OR: [
              { team: { eventId: activeEventId } },
              { candidate: { team: { eventId: activeEventId } } }
            ]
          },
          select: { id: true } 
        },
        category: { select: { name: true } },
        _count: { select: { assignments: { where: { candidate: { team: { eventId: activeEventId } } } } } }
      }
    }),
    prisma.result.findMany({
      where: { 
        OR: [
          { team: { eventId: activeEventId } },
          { candidate: { team: { eventId: activeEventId } } }
        ]
      },
      select: {
        points: true,
        isPublished: true,
        teamId: true,
        candidate: { select: { teamId: true } }
      }
    })
  ]);

  const pendingPrograms = allPrograms.filter(p => p.results.length === 0);

  const teamScoresMap: Record<string, { publishedPoints: number, totalPoints: number }> = {};
  const eventTeams = activeEvent.teams || [];
  eventTeams.forEach(team => {
    teamScoresMap[team.id] = { publishedPoints: 0, totalPoints: 0 };
  });

  allResultsForScore.forEach(result => {
    const teamId = result.teamId || result.candidate?.teamId;
    if (teamId && teamScoresMap[teamId]) {
      teamScoresMap[teamId].totalPoints += result.points;
      if (result.isPublished) {
        teamScoresMap[teamId].publishedPoints += result.points;
      }
    }
  });

  const teamScores = eventTeams.map(team => ({
    id: team.id,
    name: team.name,
    flagColor: team.flagColor,
    publishedPoints: teamScoresMap[team.id]?.publishedPoints || 0,
    totalPoints: teamScoresMap[team.id]?.totalPoints || 0
  }));

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ margin: '0 0 var(--spacing-xs) 0' }}>Live Scoring & Results Hub</h1>
          <p className="page-description" style={{ marginBottom: 0 }}>
            Enter marks, assign ranks and grades, calculate points, and publish results for live standings.
          </p>
        </div>
        <ExcelExport results={results} />
      </div>

      <div data-tour="scoring-switcher">
        <EventSwitcher events={events} activeEventId={activeEventId} />
      </div>
      
      {events.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
          <p style={{ color: 'var(--warning)', marginBottom: 'var(--spacing-sm)' }}>
            No events available.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2.8fr 1.2fr', gap: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Primary Entry Area */}
            <div data-tour="scoring-form" className="glass-panel" style={{ padding: 'var(--spacing-xl)', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--primary)' }}></div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 Rapid Result Entry
              </h2>
              <Suspense fallback={<div>Loading form...</div>}>
                <ScoringForm events={[activeEventWithPrograms]} />
              </Suspense>
            </div>

            {/* Results Management Section */}
            <div data-tour="scoring-results" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--secondary)' }}>Results Management Hub</h3>
              <ResultList results={results as any} role={session.user.role} />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div data-tour="scoring-teams">
              <TeamScorePreview scores={teamScores} />
            </div>

            <div data-tour="scoring-pending" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Pending Entries
                <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--error)', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>{pendingPrograms.length}</span>
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Programs with assignments but no results recorded for <strong>{activeEvent.name}</strong>.
              </p>
              <PendingProgramsList programs={pendingPrograms} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
