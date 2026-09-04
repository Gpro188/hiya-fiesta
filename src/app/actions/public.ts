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
      // 1. Get Latest Published Results (Top 30 to aggregate by programs)
      prisma.result.findMany({
        where: {
          OR: [
            { program: { eventId } },
            { candidate: { team: { eventId } } },
            { team: { eventId } }
          ],
          isPublished: true
        },
        select: {
          id: true, points: true, rank: true, grade: true, updatedAt: true, programId: true,
          candidate: { 
            select: { 
              id: true, 
              name: true, 
              chestNumber: true, 
              category: { select: { id: true, name: true } },
              team: { select: { id: true, name: true, prefixCode: true, flagColor: true } } 
            } 
          },
          team: { select: { id: true, name: true, prefixCode: true, flagColor: true, leaderPhoto: true } },
          program: { select: { id: true, name: true, eventId: true, category: { select: { id: true, name: true } } } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 30
      }),

      // 2. Get Teams
      prisma.team.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          flagColor: true,
          leaderName: true,
          leaderPhoto: true,
          institution: { select: { logoUrl: true, name: true, code: true, place: true } }
        }
      }),

      // 3. Get All Published Results for Leaderboard
      prisma.result.findMany({
        where: {
          OR: [
            { program: { eventId } },
            { candidate: { team: { eventId } } },
            { team: { eventId } }
          ],
          isPublished: true
        },
        select: {
          id: true, points: true, candidateId: true, teamId: true,
          candidate: { select: { id: true, name: true, teamId: true, team: { select: { id: true, name: true, flagColor: true, institution: { select: { logoUrl: true } } } }, category: { select: { id: true, name: true } } } },
          team: { select: { id: true, name: true, flagColor: true, institution: { select: { logoUrl: true } } } },
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
    const teamScores: Record<string, { 
      id: string, 
      name: string, 
      place: string | null,
      points: number, 
      flagColor: string | null, 
      leaderName: string | null, 
      leaderPhoto: string | null, 
      logoUrl: string | null 
    }> = {};
    
    // Initialize all teams in scores to handle teams with 0 points
    teams.forEach(t => {
      let cleanName = (t.institution?.name || t.name || "").trim();
      let rawPlace = (t.institution?.place || "").trim();

      if (!rawPlace && cleanName.includes(",")) {
        const parts = cleanName.split(",");
        cleanName = parts[0].trim();
        rawPlace = parts.slice(1).join(",").trim();
      } else if (rawPlace && cleanName.toLowerCase().includes(rawPlace.toLowerCase())) {
        const escaped = rawPlace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleanName = cleanName.replace(new RegExp(`,\\s*${escaped}$`, 'i'), '').trim();
      }

      teamScores[t.id] = {
        id: t.id,
        name: cleanName,
        place: rawPlace || null,
        points: 0,
        flagColor: t.flagColor,
        leaderName: t.leaderName,
        leaderPhoto: t.leaderPhoto,
        logoUrl: t.institution?.logoUrl || null
      };
    });

    allPublishedResults.forEach(res => {
      let teamId: string | null = null;
      let teamName: string = "Unknown Team";
      let teamFlag: string | null = null;
      let teamLeaderPhoto: string | null = null;
      let matchingTeam: any = null;

      if (res.candidate) {
        teamId = res.candidate.team.id;
        teamName = res.candidate.team.name;
        teamFlag = res.candidate.team.flagColor;
        matchingTeam = teams.find(t => t.id === res.candidate?.team?.id);
        teamLeaderPhoto = matchingTeam?.leaderPhoto || null;
      } else if (res.team) {
        teamId = res.team.id;
        teamName = res.team.name;
        teamFlag = res.team.flagColor;
        matchingTeam = teams.find(t => t.id === res.team?.id);
        teamLeaderPhoto = matchingTeam?.leaderPhoto || null;
      }

      if (teamId) {
        if (!teamScores[teamId]) {
          let cleanName = (matchingTeam?.institution?.name || teamName).trim();
          let rawPlace = (matchingTeam?.institution?.place || "").trim();
          if (!rawPlace && cleanName.includes(",")) {
            const parts = cleanName.split(",");
            cleanName = parts[0].trim();
            rawPlace = parts.slice(1).join(",").trim();
          } else if (rawPlace && cleanName.toLowerCase().includes(rawPlace.toLowerCase())) {
            const escaped = rawPlace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanName = cleanName.replace(new RegExp(`,\\s*${escaped}$`, 'i'), '').trim();
          }

          teamScores[teamId] = {
            id: teamId,
            name: cleanName,
            place: rawPlace || null,
            points: 0,
            flagColor: teamFlag,
            leaderName: null,
            leaderPhoto: teamLeaderPhoto,
            logoUrl: matchingTeam?.institution?.logoUrl || null
          };
        }
        teamScores[teamId].points += res.points;
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

    // --- Group Latest Results by Program with Top 3 Winners ---
    const programMap: Record<string, {
      program: { id: string, name: string, categoryName?: string },
      winners: Array<{
        rank: number | null,
        grade: string | null,
        name: string,
        teamName: string,
        teamPrefix?: string,
        points: number
      }>
    }> = {};

    latestResults.forEach(res => {
      if (!res.program) return;
      const pid = res.program.id;
      if (!programMap[pid]) {
        programMap[pid] = {
          program: {
            id: pid,
            name: res.program.name,
            categoryName: res.program.category?.name || res.candidate?.category?.name
          },
          winners: []
        };
      }

      const teamName = res.candidate?.team?.name || res.team?.name || '';
      const teamPrefix = res.candidate?.team?.prefixCode || res.team?.prefixCode || '';
      const candidateName = res.candidate?.name || '';

      programMap[pid].winners.push({
        rank: res.rank,
        grade: res.grade,
        name: candidateName || teamName,
        teamName: teamName,
        teamPrefix: teamPrefix,
        points: res.points
      });
    });

    const latestPublishedPrograms = Object.values(programMap).map(p => ({
      ...p,
      winners: p.winners.sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 3)
    })).slice(0, 5);

    return { 
        latestResults,
        latestPublishedPrograms,
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
                team: {
                  include: {
                    institution: { select: { name: true, place: true } }
                  }
                },
                institution: { select: { name: true, place: true } }
              }
            },
            team: {
              include: {
                institution: { select: { name: true, place: true } }
              }
            }
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

        // Check if there is a zone-specific category with matching name that has a posterBgUrl
        if (program.category?.name) {
            const zoneCategory = await prisma.category.findFirst({
                where: {
                    eventId: eventId,
                    name: { equals: program.category.name, mode: 'insensitive' }
                }
            });
            if (zoneCategory?.posterBgUrl) {
                program.category.posterBgUrl = zoneCategory.posterBgUrl;
            }
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
