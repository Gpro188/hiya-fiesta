"use server";

import { prisma } from "@/lib/prisma";

import { unstable_cache } from 'next/cache';

const getCachedPublicEventData = unstable_cache(
  async (eventId: string) => {
    // Execute all independent database queries in a single parallel batch
    // This reduces cross-continent network roundtrips from 5 sequential trips to 1
    const [
      latestResults,
      teams,
      allPublishedResults,
      categories,
      totalPrograms,
      publisheCSWCgramsCount,
      totalCandidates,
      candidatesWithAssignments
    ] = await Promise.all([
      // 1. Get Latest Results
      prisma.result.findMany({
        where: { program: { eventId }, isPublished: true },
        select: {
          id: true, points: true, rank: true, grade: true, updatedAt: true,
          candidate: { select: { id: true, name: true, chestNumber: true, team: { select: { id: true, name: true, flagColor: true } } } },
          team: { select: { id: true, name: true, flagColor: true, leaderPhoto: true } },
          program: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      }),

      // 2. Get Teams
      prisma.team.findMany({
        where: { eventId },
        select: { id: true, name: true, flagColor: true, leaderName: true, leaderPhoto: true }
      }),

      // 3. Get All Published Results for Leaderboard
      prisma.result.findMany({
        where: { program: { eventId }, isPublished: true },
        select: {
          id: true, points: true, candidateId: true, teamId: true,
          candidate: { select: { id: true, name: true, teamId: true, team: { select: { id: true, name: true, flagColor: true } }, category: { select: { id: true, name: true } } } },
          team: { select: { id: true, name: true, flagColor: true } },
          program: { select: { type: true } }
        }
      }),

      // 4. Get Categories
      prisma.category.findMany({ 
        where: { eventId },
        select: { id: true, name: true }
      }),

      // 5. Stats
      prisma.program.count({ where: { eventId } }),
      prisma.program.count({ where: { eventId, results: { some: { isPublished: true } } } }),
      prisma.candidate.count({ where: { category: { eventId } } }),
      prisma.programAssignment.groupBy({ by: ['candidateId'], where: { program: { eventId } } })
    ]);

    // --- Team Leaderboard ---
    const teamScores: Record<string, { id: string, name: string, points: number, flagColor: string | null, leaderName: string | null, leaderPhoto: string | null }> = {};
    
    // Initialize all teams in scores to handle teams with 0 points
    teams.forEach(t => {
      teamScores[t.id] = {
        id: t.id,
        name: t.name,
        points: 0,
        flagColor: t.flagColor,
        leaderName: t.leaderName,
        leaderPhoto: t.leaderPhoto
      };
    });

    allPublishedResults.forEach(res => {
      let teamId = null;
      let teamName = "";
      let teamFlag = null;

      if (res.candidate) {
        teamId = res.candidate.team.id;
        teamName = res.candidate.team.name;
        teamFlag = res.candidate.team.flagColor;
      } else if (res.team) {
        teamId = res.team.id;
        teamName = res.team.name;
        teamFlag = res.team.flagColor;
      }

      if (teamId && teamScores[teamId]) {
        teamScores[teamId].points += res.points;
      } else if (teamId) {
         // Fallback if team wasn't in initial list for some reason
         const matchingTeam = teams.find(t => t.id === teamId);
         teamScores[teamId] = {
           id: teamId,
           name: teamName,
           points: res.points,
           flagColor: teamFlag,
           leaderName: matchingTeam?.leaderName || null,
           leaderPhoto: matchingTeam?.leaderPhoto || null
         };
      }
    });
    const leaderboard = Object.values(teamScores).sort((a, b) => b.points - a.points);

    // --- Individual Top 5 Stars (Overall) ---
    const candidateScores: Record<string, { id: string, name: string, teamName: string, teamColor: string | null, points: number, categoryName: string }> = {};
    allPublishedResults.forEach(res => {
      if (!res.candidate) return; // Only count individual stars
      if (res.program?.type !== "INDIVIDUAL") return; // Do not count group or general programs towards Kalathilakam
      
      const candId = res.candidate.id;
      if (!candidateScores[candId]) {
        candidateScores[candId] = {
          id: candId,
          name: res.candidate.name,
          teamName: res.candidate.team.name,
          teamColor: res.candidate.team.flagColor,
          categoryName: res.candidate.category.name,
          points: 0
        };
      }
      candidateScores[candId].points += res.points;
    });
    const topStars = Object.values(candidateScores).sort((a, b) => b.points - a.points).slice(0, 5);

    // --- Category Top 5 Stars ---
    const categoryStars: Record<string, any[]> = {};

    categories.forEach(cat => {
      const catScores = Object.values(candidateScores)
        .filter(c => c.categoryName === cat.name)
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
      
      if (catScores.length > 0) {
        categoryStars[cat.name] = catScores;
      }
    });

    const stats = {
        totalPrograms,
        publisheCSWCgrams: publisheCSWCgramsCount,
        pendingPrograms: totalPrograms - publisheCSWCgramsCount,
        totalCandidates,
        totalParticipants: candidatesWithAssignments.length
    };

    return { 
        latestResults, 
        leaderboard, 
        teams, 
        topStars, 
        categoryStars,
        stats
    };
  },
  ['public-event-data'],
  { revalidate: 30, tags: ['public-event-data'] }
);

export async function getPublicEventData(eventId: string) {
  try {
    const data = await getCachedPublicEventData(eventId);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch public data:", error);
    return { success: false, error: "Failed to fetch data" };
  }
}

const getCacheCSWCgramResults = unstable_cache(
  async (programId: string, eventId?: string) => {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        category: true,
        event: true,
        results: {
          where: { 
            isPublished: true,
            ...(eventId ? { OR: [{ team: { eventId } }, { candidate: { team: { eventId } } }] } : {})
          },
          include: {
            candidate: {
              include: {
                team: true,
                institution: { select: { name: true, place: true } }
              }
            },
            team: true
          },
          orderBy: { rank: 'asc' }
        }
      }
    });

    if (!program) return { program: null, settings: null };

    // Use provided eventId for settings if available, otherwise use program.eventId
    const settingsEventId = eventId || program.eventId;
    
    const settings = await prisma.globalSetting.findUnique({ 
      where: { id: settingsEventId } 
    }) || await prisma.globalSetting.findUnique({ 
      where: { id: "default" } 
    });

    // If eventId was passed (meaning it's a zone result view), override the program's event name to match the zone
    if (eventId && eventId !== program.eventId) {
        const zoneEvent = await prisma.event.findUnique({ where: { id: eventId } });
        if (zoneEvent) {
            program.event.name = zoneEvent.name;
        }
    }

    return { program, settings };
  },
  ['program-results'],
  { revalidate: 60, tags: ['results'] }
);

export async function getProgramResults(programId: string, eventId?: string) {
  try {
    const data = await getCacheCSWCgramResults(programId, eventId);
    if (!data.program) return { success: false, error: "Program not found" };
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch program results:", error);
    return { success: false, error: "Failed to fetch results" };
  }
}
