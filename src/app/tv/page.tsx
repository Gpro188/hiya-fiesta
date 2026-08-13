import { prisma } from "@/lib/prisma";
import TVDisplayClient from "./TVDisplayClient";

export const revalidate = 10; // Auto-refresh TV standings every 10s

export default async function TVDisplayPage(props: { searchParams: Promise<{ eventId?: string }> }) {
  const searchParams = await props.searchParams;
  let activeEventId = searchParams.eventId;

  let eventObj: any = null;
  if (activeEventId) {
    eventObj = await prisma.event.findUnique({
      where: { id: activeEventId },
      include: { zone: true }
    });
  } else {
    // Default to State Event or First Zone Event
    eventObj = await prisma.event.findFirst({
      where: { type: 'STATE' },
      include: { zone: true }
    });
    if (!eventObj) {
      eventObj = await prisma.event.findFirst({
        include: { zone: true }
      });
    }
  }

  if (!eventObj) {
    return (
      <div style={{ backgroundColor: '#241B1B', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>No Active Festival Found for TV Broadcast</h2>
      </div>
    );
  }

  const [teams, results, recentWinners, totalStudents, totalPrograms, publishedProgramsCount] = await Promise.all([
    prisma.team.findMany({
      where: { eventId: eventObj.id },
      include: {
        results: {
          where: { isPublished: true },
          select: { points: true, rank: true }
        }
      }
    }),
    prisma.result.findMany({
      where: { program: { eventId: eventObj.id }, isPublished: true },
      select: { points: true, teamId: true }
    }),
    prisma.result.findMany({
      where: { program: { eventId: eventObj.id }, isPublished: true },
      include: {
        candidate: { include: { team: true } },
        team: true,
        program: { include: { category: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    prisma.candidate.count({ where: { team: { eventId: eventObj.id } } }),
    prisma.program.count({ where: { eventId: eventObj.id, type: { not: 'BREAK' } } }),
    prisma.program.count({ where: { eventId: eventObj.id, results: { some: { isPublished: true } } } })
  ]);

  // Calculate Live Scores
  const leaderboard = teams.map(t => {
    const totalPoints = t.results.reduce((sum, r) => sum + r.points, 0);
    const goldCount = t.results.filter(r => r.rank === 1).length;
    const silverCount = t.results.filter(r => r.rank === 2).length;
    const bronzeCount = t.results.filter(r => r.rank === 3).length;

    return {
      id: t.id,
      name: t.name,
      prefixCode: t.prefixCode,
      flagColor: t.flagColor || '#ec4899',
      points: totalPoints,
      gold: goldCount,
      silver: silverCount,
      bronze: bronzeCount,
      change: 0, // Hardcoded to 0 for now as we don't store historical points
      changeType: 'up'
    };
  }).sort((a, b) => b.points - a.points);

  const allEvents = await prisma.event.findMany({
    select: { id: true, name: true, type: true }
  });
  
  const stats = {
    institutions: teams.length,
    students: totalStudents,
    competitions: totalPrograms,
    resultsPublished: publishedProgramsCount
  };

  return (
    <TVDisplayClient 
      event={eventObj} 
      leaderboard={leaderboard} 
      recentWinners={recentWinners} 
      allEvents={allEvents}
      stats={stats}
    />
  );
}
