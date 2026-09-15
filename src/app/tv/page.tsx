import { prisma } from "@/lib/prisma";
import TVDisplayClient from "./TVDisplayClient";
import { isProgramGeneral } from "@/lib/programUtils";

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

  const isZone = !!eventObj.parentId;
  const isStateFest = eventObj.type === 'STATE' || !eventObj.parentId;
  const programsEventId = eventObj.parentId || eventObj.id;

  const [teams, allZones, allPublishedResults, recentWinners, totalStudents, totalPrograms, publishedProgramsCount] = await Promise.all([
    prisma.team.findMany({
      where: { eventId: eventObj.id },
      select: {
        id: true,
        name: true,
        prefixCode: true,
        flagColor: true,
        institution: {
          select: {
            code: true,
            logoUrl: true,
            place: true,
            zoneId: true,
            zone: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    }),
    prisma.zone.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' }
    }),
    prisma.result.findMany({
      where: { 
        isPublished: true,
        OR: [
          { program: { eventId: eventObj.id } },
          { team: { eventId: eventObj.id } },
          { candidate: { team: { eventId: eventObj.id } } }
        ]
      },
      select: { 
        points: true, 
        rank: true, 
        teamId: true,
        candidateId: true,
        candidate: { 
          select: { 
            teamId: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
            team: {
              select: {
                id: true,
                name: true,
                prefixCode: true,
                flagColor: true,
                institution: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    place: true,
                    logoUrl: true,
                    zoneId: true,
                    zone: { select: { id: true, name: true, code: true } }
                  }
                }
              }
            }
          } 
        },
        team: {
          select: {
            id: true,
            name: true,
            prefixCode: true,
            flagColor: true,
            institution: {
              select: {
                id: true,
                name: true,
                code: true,
                place: true,
                logoUrl: true,
                zoneId: true,
                zone: { select: { id: true, name: true, code: true } }
              }
            }
          }
        },
        program: {
          select: {
            id: true,
            type: true,
            categoryId: true,
            category: { select: { id: true, name: true } }
          }
        }
      }
    }),
    prisma.result.findMany({
      where: { 
        isPublished: true,
        OR: [
          { program: { eventId: eventObj.id } },
          { team: { eventId: eventObj.id } },
          { candidate: { team: { eventId: eventObj.id } } }
        ]
      },
      include: {
        candidate: { include: { team: { include: { institution: { include: { zone: true } }, event: { select: { name: true } } } } } },
        team: { include: { institution: { include: { zone: true } }, event: { select: { name: true } } } },
        program: { include: { category: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 30
    }),
    prisma.candidate.count({ where: { team: { eventId: eventObj.id } } }),
    prisma.program.count({ where: { eventId: programsEventId, type: { not: 'BREAK' } } }),
    prisma.program.count({ 
      where: { 
        eventId: programsEventId, 
        results: { 
          some: { 
            isPublished: true,
            OR: [
              { program: { eventId: eventObj.id } },
              { team: { eventId: eventObj.id } },
              { candidate: { team: { eventId: eventObj.id } } }
            ]
          } 
        } 
      } 
    })
  ]);

  // Maps for Institutions: Overall, Fadhila, Fadheela
  const allTeamsList = [...teams];
  const allTeamsById = new Map<string, any>(teams.map(t => [t.id, t]));

  const teamScoreMap = new Map<string, { points: number, gold: number, silver: number, bronze: number }>();
  const fadhilaTeamScoreMap = new Map<string, { points: number, gold: number, silver: number, bronze: number }>();
  const fadheelaTeamScoreMap = new Map<string, { points: number, gold: number, silver: number, bronze: number }>();

  teams.forEach(t => {
    teamScoreMap.set(t.id, { points: 0, gold: 0, silver: 0, bronze: 0 });
    fadhilaTeamScoreMap.set(t.id, { points: 0, gold: 0, silver: 0, bronze: 0 });
    fadheelaTeamScoreMap.set(t.id, { points: 0, gold: 0, silver: 0, bronze: 0 });
  });

  // Maps for Zones: Overall, Fadhila, Fadheela
  const zoneScoreMap = new Map<string, { points: number, gold: number, silver: number, bronze: number, name: string, code: string }>();
  const fadhilaZoneScoreMap = new Map<string, { points: number, gold: number, silver: number, bronze: number, name: string, code: string }>();
  const fadheelaZoneScoreMap = new Map<string, { points: number, gold: number, silver: number, bronze: number, name: string, code: string }>();

  allZones.forEach(z => {
    zoneScoreMap.set(z.id, { points: 0, gold: 0, silver: 0, bronze: 0, name: z.name, code: z.code });
    fadhilaZoneScoreMap.set(z.id, { points: 0, gold: 0, silver: 0, bronze: 0, name: z.name, code: z.code });
    fadheelaZoneScoreMap.set(z.id, { points: 0, gold: 0, silver: 0, bronze: 0, name: z.name, code: z.code });
  });

  // Helper to categorize result
  const detectCategory = (r: any): 'FADHILA' | 'FADHEELA' | 'OTHER' => {
    const progCat = (r.program?.category?.name || '').toUpperCase();
    if (progCat.includes('FADHILA')) return 'FADHILA';
    if (progCat.includes('FADHEELA')) return 'FADHEELA';

    const candCat = (r.candidate?.category?.name || '').toUpperCase();
    if (candCat.includes('FADHILA')) return 'FADHILA';
    if (candCat.includes('FADHEELA')) return 'FADHEELA';

    return 'OTHER';
  };

  // Helper to check if a result is for an individual program (Category Champions calculate ONLY by individual programs)
  const isIndividualProgram = (r: any): boolean => {
    if (!r.candidateId) return false;
    if (r.program?.type && r.program.type !== "INDIVIDUAL") return false;
    if (isProgramGeneral(r.program)) return false;
    return true;
  };

  allPublishedResults.forEach(r => {
    const tObj = r.candidate?.team || r.team;
    const tid = tObj?.id || r.teamId || r.candidate?.teamId;

    // Dynamically register team/institution if not already present
    if (tid && tObj && !allTeamsById.has(tid)) {
      allTeamsById.set(tid, tObj);
      allTeamsList.push(tObj);
      teamScoreMap.set(tid, { points: 0, gold: 0, silver: 0, bronze: 0 });
      fadhilaTeamScoreMap.set(tid, { points: 0, gold: 0, silver: 0, bronze: 0 });
      fadheelaTeamScoreMap.set(tid, { points: 0, gold: 0, silver: 0, bronze: 0 });
    }

    const cat = detectCategory(r);
    const pts = r.points || 0;
    const rank = r.rank;
    const isIndiv = isIndividualProgram(r);

    // 1. Institution Overall Points (Includes ALL: Category Individual + Category Group + General)
    if (tid && teamScoreMap.has(tid)) {
      const overall = teamScoreMap.get(tid)!;
      overall.points += pts;
      if (rank === 1) overall.gold += 1;
      else if (rank === 2) overall.silver += 1;
      else if (rank === 3) overall.bronze += 1;

      // 2. Category Champions (INDIVIDUAL PROGRAMS ONLY!)
      if (isIndiv) {
        if (cat === 'FADHILA') {
          const fadhila = fadhilaTeamScoreMap.get(tid)!;
          fadhila.points += pts;
          if (rank === 1) fadhila.gold += 1;
          else if (rank === 2) fadhila.silver += 1;
          else if (rank === 3) fadhila.bronze += 1;
        } else if (cat === 'FADHEELA') {
          const fadheela = fadheelaTeamScoreMap.get(tid)!;
          fadheela.points += pts;
          if (rank === 1) fadheela.gold += 1;
          else if (rank === 2) fadheela.silver += 1;
          else if (rank === 3) fadheela.bronze += 1;
        }
      }
    }

    // Zone Points (via institution's zone)
    const zone = r.team?.institution?.zone || r.candidate?.team?.institution?.zone;
    if (zone) {
      if (!zoneScoreMap.has(zone.id)) {
        zoneScoreMap.set(zone.id, { points: 0, gold: 0, silver: 0, bronze: 0, name: zone.name, code: zone.code });
        fadhilaZoneScoreMap.set(zone.id, { points: 0, gold: 0, silver: 0, bronze: 0, name: zone.name, code: zone.code });
        fadheelaZoneScoreMap.set(zone.id, { points: 0, gold: 0, silver: 0, bronze: 0, name: zone.name, code: zone.code });
      }

      // 1. Overall Zone Points (Includes ALL: Category Individual + Category Group + General)
      const zOverall = zoneScoreMap.get(zone.id)!;
      zOverall.points += pts;
      if (rank === 1) zOverall.gold += 1;
      else if (rank === 2) zOverall.silver += 1;
      else if (rank === 3) zOverall.bronze += 1;

      // 2. Category Zone Points (INDIVIDUAL PROGRAMS ONLY!)
      if (isIndiv) {
        if (cat === 'FADHILA') {
          const zFadhila = fadhilaZoneScoreMap.get(zone.id)!;
          zFadhila.points += pts;
          if (rank === 1) zFadhila.gold += 1;
          else if (rank === 2) zFadhila.silver += 1;
          else if (rank === 3) zFadhila.bronze += 1;
        } else if (cat === 'FADHEELA') {
          const zFadheela = fadheelaZoneScoreMap.get(zone.id)!;
          zFadheela.points += pts;
          if (rank === 1) zFadheela.gold += 1;
          else if (rank === 2) zFadheela.silver += 1;
          else if (rank === 3) zFadheela.bronze += 1;
        }
      }
    }
  });

  // Map Institution Leaderboard
  const mapTeamLeaderboard = (scoreMap: Map<string, { points: number, gold: number, silver: number, bronze: number }>) => {
    return allTeamsList.map(t => {
      const s = scoreMap.get(t.id) || { points: 0, gold: 0, silver: 0, bronze: 0 };
      return {
        id: t.id,
        name: t.name,
        code: t.institution?.code || t.prefixCode,
        place: t.institution?.place || null,
        zoneName: t.institution?.zone?.name || null,
        prefixCode: t.prefixCode,
        flagColor: t.flagColor || '#ec4899',
        logoUrl: t.institution?.logoUrl || null,
        points: s.points,
        gold: s.gold,
        silver: s.silver,
        bronze: s.bronze,
        change: 0,
        changeType: 'up'
      };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gold !== a.gold) return b.gold - a.gold;
      return a.name.localeCompare(b.name);
    });
  };

  const leaderboard = mapTeamLeaderboard(teamScoreMap);
  const fadhilaLeaderboard = mapTeamLeaderboard(fadhilaTeamScoreMap);
  const fadheelaLeaderboard = mapTeamLeaderboard(fadheelaTeamScoreMap);

  // Map Zone Leaderboard
  const mapZoneLeaderboard = (scoreMap: Map<string, { points: number, gold: number, silver: number, bronze: number, name: string, code: string }>) => {
    return Array.from(scoreMap.entries()).map(([id, s]) => ({
      id,
      name: s.name,
      code: s.code,
      points: s.points,
      gold: s.gold,
      silver: s.silver,
      bronze: s.bronze
    })).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gold !== a.gold) return b.gold - a.gold;
      return a.name.localeCompare(b.name);
    });
  };

  const zoneLeaderboard = mapZoneLeaderboard(zoneScoreMap);
  const fadhilaZoneLeaderboard = mapZoneLeaderboard(fadhilaZoneScoreMap);
  const fadheelaZoneLeaderboard = mapZoneLeaderboard(fadheelaZoneScoreMap);

  // Category & Total Champions Summary (with Champions and Runner-Ups)
  const champions = {
    overallChampion: leaderboard[0] || null,
    overallRunnerUp: leaderboard[1] || null,
    overallSecondRunnerUp: leaderboard[2] || null,

    fadhilaTopInstitution: fadhilaLeaderboard[0] || null,
    fadhilaRunnerUpInstitution: fadhilaLeaderboard[1] || null,
    fadhilaTopInstitutions: fadhilaLeaderboard.slice(0, 3),

    fadheelaTopInstitution: fadheelaLeaderboard[0] || null,
    fadheelaRunnerUpInstitution: fadheelaLeaderboard[1] || null,
    fadheelaTopInstitutions: fadheelaLeaderboard.slice(0, 3),

    overallTopZone: zoneLeaderboard[0] || null,
    overallRunnerUpZone: zoneLeaderboard[1] || null,
    fadhilaTopZone: fadhilaZoneLeaderboard[0] || null,
    fadhilaRunnerUpZone: fadhilaZoneLeaderboard[1] || null,
    fadheelaTopZone: fadheelaZoneLeaderboard[0] || null,
    fadheelaRunnerUpZone: fadheelaZoneLeaderboard[1] || null,
    topZones: zoneLeaderboard.slice(0, 5),
    fadhilaTopZones: fadhilaZoneLeaderboard.slice(0, 3),
    fadheelaTopZones: fadheelaZoneLeaderboard.slice(0, 3),
  };

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
      fadhilaLeaderboard={fadhilaLeaderboard}
      fadheelaLeaderboard={fadheelaLeaderboard}
      zoneLeaderboard={zoneLeaderboard}
      fadhilaZoneLeaderboard={fadhilaZoneLeaderboard}
      fadheelaZoneLeaderboard={fadheelaZoneLeaderboard}
      champions={champions}
      isStateFest={isStateFest}
      recentWinners={recentWinners} 
      allEvents={allEvents}
      stats={stats}
    />
  );
}
