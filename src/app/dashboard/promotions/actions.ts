"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function promoteToState(resultId: string, masterProgramId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        candidate: { include: { team: { include: { event: true } } } },
        team: { include: { event: true } },
        program: { include: { event: true } }
      }
    });

    if (!result) {
      return { success: false, error: "Result record not found." };
    }

    const zoneEventId = result.candidate?.team?.eventId || result.team?.eventId;
    if (!zoneEventId) {
      return { success: false, error: "Unable to determine zone for this result." };
    }

    // Check if state confirm deadline has passed for Zone Admins
    if (session.user.role === "ZONE_ADMIN") {
      const zoneEvent = await prisma.event.findUnique({ where: { id: zoneEventId } });
      const parentId = zoneEvent?.parentId || result.program.eventId;
      const parentEvent = await prisma.event.findUnique({ where: { id: parentId } });
      if (parentEvent?.stateConfirmEndDate && new Date() > parentEvent.stateConfirmEndDate) {
        return { success: false, error: "State confirmation deadline has passed. Please contact fest administration." };
      }
    }

    const masterProgram = await prisma.program.findUnique({
      where: { id: masterProgramId }
    });
    if (!masterProgram) {
      return { success: false, error: "Master program not found." };
    }

    // 1. Find all current assignments for this master program from this specific zone
    const existingZoneAssignments = await prisma.programAssignment.findMany({
      where: {
        programId: masterProgramId,
        candidate: {
          team: {
            eventId: zoneEventId
          }
        }
      },
      select: { id: true, candidateId: true }
    });

    // 2. Remove previous zone assignments from master program
    if (existingZoneAssignments.length > 0) {
      await prisma.programAssignment.deleteMany({
        where: {
          id: { in: existingZoneAssignments.map(a => a.id) }
        }
      });
    }

    // 3. Assign the new participant(s)
    const isGroup = !result.candidateId && Boolean(result.teamId);

    if (isGroup && result.teamId) {
      // Find team registered candidates from the zone program or database
      const zoneProgram = await prisma.program.findFirst({
        where: {
          eventId: zoneEventId,
          programCode: masterProgram.programCode
        }
      });

      let teamCandidateIds: string[] = [];
      if (zoneProgram) {
        const assigns = await prisma.programAssignment.findMany({
          where: {
            programId: zoneProgram.id,
            candidate: { teamId: result.teamId }
          },
          select: { candidateId: true }
        });
        teamCandidateIds = assigns.map(a => a.candidateId);
      }

      // Fallback if not found in zone program: find candidate belonging to that team (e.g. Magazine)
      if (teamCandidateIds.length === 0) {
        const teamCands = await prisma.candidate.findMany({
          where: { teamId: result.teamId },
          select: { id: true },
          take: 1
        });
        teamCandidateIds = teamCands.map(c => c.id);
      }

      for (const cid of teamCandidateIds) {
        await prisma.programAssignment.upsert({
          where: {
            candidateId_programId: {
              candidateId: cid,
              programId: masterProgramId
            }
          },
          create: {
            candidateId: cid,
            programId: masterProgramId
          },
          update: {}
        });

        await prisma.candidate.update({
          where: { id: cid },
          data: { isStateQualified: true }
        });
      }
    } else if (result.candidateId) {
      // Individual candidate assignment
      await prisma.programAssignment.upsert({
        where: {
          candidateId_programId: {
            candidateId: result.candidateId,
            programId: masterProgramId
          }
        },
        create: {
          candidateId: result.candidateId,
          programId: masterProgramId
        },
        update: {}
      });

      await prisma.candidate.update({
        where: { id: result.candidateId },
        data: { isStateQualified: true }
      });
    }

    // 4. Update qualification status for unpromoted candidates
    const removedCandidateIds = existingZoneAssignments.map(a => a.candidateId);
    if (removedCandidateIds.length > 0) {
      const activeStateAssignments = await prisma.programAssignment.findMany({
        where: {
          candidateId: { in: removedCandidateIds },
          program: { event: { type: "STATE" } }
        },
        select: { candidateId: true }
      });
      const stillActiveSet = new Set(activeStateAssignments.map(a => a.candidateId));
      const toDeactivate = removedCandidateIds.filter(id => !stillActiveSet.has(id));

      if (toDeactivate.length > 0) {
        await prisma.candidate.updateMany({
          where: { id: { in: toDeactivate } },
          data: { isStateQualified: false }
        });
      }
    }

    revalidatePath("/dashboard/promotions");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/scoring");
    revalidatePath("/print/venue-control");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to promote:", error);
    return { success: false, error: error.message || "Failed to promote to state" };
  }
}

export async function autoPromoteZoneFirstPlaces(zoneEventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch all published Rank 1 results for this zone
    const rank1Results = await prisma.result.findMany({
      where: {
        isPublished: true,
        rank: 1,
        OR: [
          { candidate: { team: { eventId: zoneEventId } } },
          { team: { eventId: zoneEventId } }
        ]
      },
      include: {
        candidate: { include: { team: true } },
        team: true,
        program: { include: { event: true } }
      }
    });

    if (rank1Results.length === 0) {
      return { success: false, error: "No published Rank 1 results found for this zone." };
    }

    // 2. Fetch master event programs
    const masterEvent = await prisma.event.findFirst({
      where: { type: "STATE" },
      include: {
        programs: true
      }
    });

    if (!masterEvent) {
      return { success: false, error: "State Final master event not found." };
    }

    const masterProgByCode = new Map(masterEvent.programs.map(p => [p.programCode, p]));

    // Fetch zone programs to know registered candidates for group programs
    const zoneProgs = await prisma.program.findMany({
      where: { eventId: zoneEventId },
      include: {
        assignments: {
          include: { candidate: true }
        }
      }
    });
    const zoneProgByCode = new Map(zoneProgs.map(p => [p.programCode, p]));

    let promotedCount = 0;
    const errors: string[] = [];

    for (const r of rank1Results) {
      try {
        const masterProg = masterProgByCode.get(r.program.programCode) || r.program;
        if (!masterProg) continue;

        // Clear existing assignments in master program from this zone
        const existingZoneAssignments = await prisma.programAssignment.findMany({
          where: {
            programId: masterProg.id,
            candidate: {
              team: {
                eventId: zoneEventId
              }
            }
          },
          select: { id: true, candidateId: true }
        });

        if (existingZoneAssignments.length > 0) {
          await prisma.programAssignment.deleteMany({
            where: {
              id: { in: existingZoneAssignments.map(a => a.id) }
            }
          });
        }

        const isGroup = !r.candidateId && Boolean(r.teamId);

        if (isGroup && r.teamId) {
          const zp = zoneProgByCode.get(masterProg.programCode);
          let teamCands = zp ? zp.assignments.filter(a => a.candidate?.teamId === r.teamId).map(a => a.candidateId) : [];

          if (teamCands.length === 0) {
            const cands = await prisma.candidate.findMany({
              where: { teamId: r.teamId },
              select: { id: true },
              take: 1
            });
            teamCands = cands.map(c => c.id);
          }

          for (const cid of teamCands) {
            await prisma.programAssignment.upsert({
              where: {
                candidateId_programId: {
                  candidateId: cid,
                  programId: masterProg.id
                }
              },
              create: {
                candidateId: cid,
                programId: masterProg.id
              },
              update: {}
            });
            await prisma.candidate.update({
              where: { id: cid },
              data: { isStateQualified: true }
            });
          }
        } else if (r.candidateId) {
          await prisma.programAssignment.upsert({
            where: {
              candidateId_programId: {
                candidateId: r.candidateId,
                programId: masterProg.id
              }
            },
            create: {
              candidateId: r.candidateId,
              programId: masterProg.id
            },
            update: {}
          });

          await prisma.candidate.update({
            where: { id: r.candidateId },
            data: { isStateQualified: true }
          });
        }

        promotedCount++;
      } catch (err: any) {
        errors.push(`Program ${r.program.name}: ${err.message}`);
      }
    }

    revalidatePath("/dashboard/promotions");
    revalidatePath("/dashboard/schedule");
    revalidatePath("/dashboard/scoring");
    revalidatePath("/print/venue-control");

    return {
      success: true,
      promotedCount,
      total: rank1Results.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    console.error("Failed to auto-promote zone 1st places:", error);
    return { success: false, error: error.message || "Failed to auto-promote zone 1st places" };
  }
}
