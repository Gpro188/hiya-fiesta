"use server";

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export async function getHubData(eventId?: string) {
  try {
    const fetcher = unstable_cache(
      async () => {
        const events = await prisma.event.findMany({
          where: eventId ? { id: eventId } : undefined,
          select: {
            id: true,
            name: true,
            parentId: true,
            categories: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                teams: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        const hubEvents = await Promise.all(events.map(async (event) => {
          const targetEventId = event.parentId || event.id;

          const programs = await prisma.program.findMany({
            where: { eventId: targetEventId },
            select: {
              id: true,
              name: true,
              categoryId: true,
              _count: {
                select: {
                  results: { 
                    where: { 
                      isPublished: true,
                      OR: [
                        { team: { eventId: event.id } },
                        { candidate: { team: { eventId: event.id } } }
                      ]
                    } 
                  },
                  assignments: {
                    where: {
                      candidate: { team: { eventId: event.id } }
                    }
                  }
                }
              }
            }
          });

          // A program is "published" if it has at least one published result for this zone
          const publisheCSWCgramsCount = programs.filter(p => p._count.results > 0).length;
          
          // A program is "pending" if it has assignments from this zone but NO results published
          const pendingProgramsCount = programs.filter(
            p => p._count.assignments > 0 && p._count.results === 0
          ).length;

          // Only count programs that have candidates from this zone as "totalPrograms"
          const totalProgramsInZone = programs.filter(p => p._count.assignments > 0).length;

          const stats = {
            totalPrograms: totalProgramsInZone,
            publisheCSWCgrams: publisheCSWCgramsCount,
            pendingPrograms: pendingProgramsCount,
            totalTeams: event._count.teams,
            totalCandidates: 0 // Could be fetched if needed
          };

          const recentResultsRaw = await prisma.result.findMany({
            where: {
              isPublished: true,
              OR: [
                { team: { eventId: event.id } },
                { candidate: { team: { eventId: event.id } } }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              program: { select: { name: true, category: { select: { name: true } } } },
              candidate: { select: { name: true } },
              team: { select: { name: true } }
            }
          });

          const recentResults = recentResultsRaw.map(r => ({
            id: r.id,
            programName: r.program.name,
            category: r.program.category?.name || 'General',
            winnerName: r.candidate?.name || r.team?.name || 'Unknown',
            rank: r.rank,
            grade: r.grade,
            marks: r.marks
          }));

          return {
            id: event.id,
            name: event.name,
            stats,
            recentResults
          };
        }));

        return hubEvents || [];
      },
      [`hub-data-${eventId || 'all'}`],
      { revalidate: 15, tags: ['hub-data'] }
    );

    const data = await fetcher();
    return { success: true, data };
  } catch (error) {
    console.error("Hub data fetch failed:", error);
    return { success: false, error: "Failed to load hub data" };
  }
}
