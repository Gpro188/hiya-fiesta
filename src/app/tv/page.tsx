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
      <div style={{ backgroundColor: '#0f172a', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>No Active Festival Found for TV Broadcast</h2>
      </div>
    );
  }

  const [teams, results, recentWinners] = await Promise.all([
    prisma.team.findMany({
      where: { eventId: eventObj.id },
      include: {
        results: {
          where: { isPublished: true },
          select: { points: true }
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
      take: 10
    })
  ]);

  // Calculate Live Scores
  const leaderboard = teams.map(t => {
    const totalPoints = t.results.reduce((sum, r) => sum + r.points, 0);
    return {
      id: t.id,
      name: t.name,
      prefixCode: t.prefixCode,
      flagColor: t.flagColor || '#ec4899',
      points: totalPoints
    };
  }).sort((a, b) => b.points - a.points);

  const allEvents = await prisma.event.findMany({
    select: { id: true, name: true, type: true }
  });

  return (
    <TVDisplayClient 
      event={eventObj} 
      leaderboard={leaderboard} 
      recentWinners={recentWinners} 
      allEvents={allEvents} 
    />
  );
}
