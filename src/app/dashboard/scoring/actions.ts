"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Helper to determine Grade based on marks (supports 100-mark single scale and 200-mark consensus scale)
function calculateGrade(marks: number) {
  if (marks > 100) {
    if (marks >= 160) return "A";
    if (marks >= 120) return "B";
    if (marks >= 80) return "C";
    return null; // 118 & below is NO GRADE
  }
  if (marks >= 80) return "A";
  if (marks >= 60) return "B";
  if (marks >= 40) return "C";
  return null; // Below 40 is NO GRADE
}

// Helper to get active points matrix (from event point matrix or global default)
export async function getPointsConfigForProgram(programType: string, eventId?: string) {
  const defaultInd = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
  const defaultGen = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };

  try {
    const matrix = await prisma.pointMatrix.findFirst({
      where: eventId
        ? {
            OR: [
              { eventId },
              { event: { parentId: null } }
            ]
          }
        : { event: { parentId: null } },
      orderBy: { eventId: eventId ? 'asc' : 'desc' }
    });

    if (matrix) {
      if (programType === "INDIVIDUAL" && matrix.individualPoints) {
        return { ...defaultInd, ...JSON.parse(matrix.individualPoints) };
      } else {
        const rawGen = matrix.generalPoints || matrix.groupPoints;
        if (rawGen) return { ...defaultGen, ...JSON.parse(rawGen) };
      }
    }
  } catch (e) {
    console.error("Failed to load point matrix:", e);
  }

  return programType === "INDIVIDUAL" ? defaultInd : defaultGen;
}

// Helper to recalculate ranks and points for a specific program
async function recalculateProgramResults(programId: string, manualUpdateId?: string, eventId?: string) {
  const whereClause: any = { programId };
  if (eventId) {
    whereClause.OR = [
      { team: { eventId } },
      { candidate: { team: { eventId } } }
    ];
  }

  const results = await prisma.result.findMany({
    where: whereClause,
    orderBy: { marks: 'desc' },
    include: { 
      program: { 
        include: { 
          category: { include: { pointMatrix: true } },
          event: true
        } 
      } 
    }
  });

  if (results.length === 0) return;

  const program = results[0].program;
  const programType = program.type;
  
  let pointsConfig: any = await getPointsConfigForProgram(programType, eventId || program.eventId);
  if (program.category?.pointMatrix) {
    const matrix = program.category.pointMatrix;
    const str = programType === "INDIVIDUAL" ? matrix.individualPoints : (matrix.generalPoints || matrix.groupPoints);
    if (str) {
      try { pointsConfig = { ...pointsConfig, ...JSON.parse(str) }; } catch (e) {}
    }
  }

  // Assign ranks, handle ties
  let currentRank = 1;
  let currentMarks = results[0].marks;
  let sameRankCount = 0;

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    
    // If this result was manually updated, we might want to preserve its rank/grade
    // BUT usually points must match the rank. 
    // For now, auto-recalculate everything based on marks UNLESS we are in "Manual Entry" mode.
    
    if (res.marks < currentMarks) {
      currentRank += sameRankCount;
      currentMarks = res.marks;
      sameRankCount = 1;
    } else {
      sameRankCount++;
    }

    const rank = currentRank <= 3 ? currentRank : null;
    const grade = calculateGrade(res.marks);
    
    let points = 0;
    if (rank === 1) points += pointsConfig.rank1 || 0;
    else if (rank === 2) points += pointsConfig.rank2 || 0;
    else if (rank === 3) points += pointsConfig.rank3 || 0;

    if (grade === "A") points += pointsConfig.gradeA || 0;
    else if (grade === "B") points += pointsConfig.gradeB || 0;
    else if (grade === "C") points += pointsConfig.gradeC || 0;

    await prisma.result.update({
      where: { id: res.id },
      data: { rank, grade, points }
    });
  }
}

// NEW VERSION: Supports direct rank/grade selection and Team-based scoring
export async function submitMarks(data: { 
  eventId: string, 
  programId: string, 
  chestNumber?: string, 
  teamId?: string,
  marks: number,
  manualRank?: number | null,
  manualGrade?: string | null
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "JUDGE"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const program = await prisma.program.findUnique({
      where: { id: data.programId },
      include: { 
        category: { include: { pointMatrix: true } }, 
        event: true 
      }
    });

    if (!program) return { success: false, error: "Program not found" };

    let candidateId: string | null = null;
    let teamId: string | null = data.teamId || null;

    if (data.chestNumber) {
      const candidate = await prisma.candidate.findUnique({
        where: { chestNumber: data.chestNumber }
      });
      if (!candidate) return { success: false, error: "Candidate not found" };
      candidateId = candidate.id;
    }

    if (!candidateId && !teamId) {
      return { success: false, error: "Candidate or Team must be specified" };
    }

    // If manual mode, we calculate points immediately
    let points = 0;
    let rank = data.manualRank || null;
    let grade = data.manualGrade || null;

    if (data.manualRank || data.manualGrade) {
       let pointsConfig: any = await getPointsConfigForProgram(program.type, program.eventId);
       if (program.category?.pointMatrix) {
         const matrix = program.category.pointMatrix;
         const str = program.type === "INDIVIDUAL" ? matrix.individualPoints : (matrix.generalPoints || matrix.groupPoints);
         if (str) {
           try { pointsConfig = { ...pointsConfig, ...JSON.parse(str) }; } catch (e) {}
         }
       }

       if (rank === 1) points += pointsConfig.rank1 || 0;
       else if (rank === 2) points += pointsConfig.rank2 || 0;
       else if (rank === 3) points += pointsConfig.rank3 || 0;

       if (grade === "A") points += pointsConfig.gradeA || 0;
       else if (grade === "B") points += pointsConfig.gradeB || 0;
       else if (grade === "C") points += pointsConfig.gradeC || 0;
    }

    if (candidateId) {
      await prisma.result.upsert({
        where: { candidateId_programId: { candidateId, programId: data.programId } },
        update: { 
          marks: data.marks, 
          rank: data.manualRank !== undefined ? data.manualRank : undefined, 
          grade: data.manualGrade !== undefined ? data.manualGrade : undefined,
          points: (data.manualRank || data.manualGrade) ? points : undefined
        },
        create: {
          candidateId,
          programId: data.programId,
          marks: data.marks,
          rank: data.manualRank || null,
          grade: data.manualGrade || null,
          points: points,
          isPublished: false
        }
      });
    } else if (teamId) {
      await prisma.result.upsert({
        where: { teamId_programId: { teamId, programId: data.programId } },
        update: { 
          marks: data.marks, 
          rank: data.manualRank !== undefined ? data.manualRank : undefined, 
          grade: data.manualGrade !== undefined ? data.manualGrade : undefined,
          points: (data.manualRank || data.manualGrade) ? points : undefined
        },
        create: {
          teamId,
          programId: data.programId,
          marks: data.marks,
          rank: data.manualRank || null,
          grade: data.manualGrade || null,
          points: points,
          isPublished: false
        }
      });
    }

    // If NOT manual mode, recalculate program
    if (data.manualRank === undefined && data.manualGrade === undefined) {
      await recalculateProgramResults(data.programId, undefined, data.eventId);
    }

    revalidatePath("/dashboard/scoring");
    return { success: true };
  } catch (error) {
    console.error("Submission failed:", error);
    return { success: false, error: "Failed to submit results" };
  }
}

// BATCH PROGRAM SCORING: Submit marks, places, and grades for all candidates/teams in a program in one click
export async function batchSubmitProgramMarks(data: {
  eventId: string;
  programId: string;
  venue?: string;
  assignToVenue?: boolean;
  publishImmediately?: boolean;
  evaluator1?: string;
  evaluator2?: string;
  entries: Array<{
    candidateId?: string;
    teamId?: string;
    marks: number;
    rank?: number | null;
    grade?: string | null;
    points?: number;
  }>;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "JUDGE"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const program = await prisma.program.findUnique({
      where: { id: data.programId },
      include: { category: { include: { pointMatrix: true } } }
    });

    if (!program) return { success: false, error: "Program not found" };

    // Judges can only submit to Pending state; only Zonal Admin / Super Admin can publish live
    const shouldPublish = session.user.role === "JUDGE" ? false : (data.publishImmediately ?? false);

    let pointsConfig: any = await getPointsConfigForProgram(program.type, program.eventId);
    if (program.category?.pointMatrix) {
      const matrix = program.category.pointMatrix;
      const str = program.type === "INDIVIDUAL" ? matrix.individualPoints : (matrix.generalPoints || matrix.groupPoints);
      if (str) {
        try { pointsConfig = { ...pointsConfig, ...JSON.parse(str) }; } catch (e) {}
      }
    }

    // Pre-fetch candidate teamIds to ensure teamId is saved on results for quick aggregation
    const candidateIds = data.entries.map(e => e.candidateId).filter(Boolean) as string[];
    const candidateTeamMap = new Map<string, string>();
    if (candidateIds.length > 0) {
      const candidates = await prisma.candidate.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, teamId: true }
      });
      candidates.forEach(c => {
        if (c.teamId) candidateTeamMap.set(c.id, c.teamId);
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of data.entries) {
        // Compute combined points if rank or grade provided
        let calcPoints = entry.points ?? 0;
        if (entry.rank || entry.grade) {
          calcPoints = 0;
          if (entry.rank === 1) calcPoints += pointsConfig.rank1 || 0;
          else if (entry.rank === 2) calcPoints += pointsConfig.rank2 || 0;
          else if (entry.rank === 3) calcPoints += pointsConfig.rank3 || 0;

          if (entry.grade === "A") calcPoints += pointsConfig.gradeA || 0;
          else if (entry.grade === "B") calcPoints += pointsConfig.gradeB || 0;
          else if (entry.grade === "C") calcPoints += pointsConfig.gradeC || 0;
        }

        if (entry.candidateId) {
          const candTeamId = entry.teamId || candidateTeamMap.get(entry.candidateId) || undefined;
          await tx.result.upsert({
            where: { candidateId_programId: { candidateId: entry.candidateId, programId: data.programId } },
            update: {
              marks: entry.marks,
              rank: entry.rank || null,
              grade: entry.grade || null,
              points: calcPoints,
              isPublished: shouldPublish,
              ...(candTeamId ? { teamId: candTeamId } : {})
            },
            create: {
              candidateId: entry.candidateId,
              programId: data.programId,
              teamId: candTeamId,
              marks: entry.marks,
              rank: entry.rank || null,
              grade: entry.grade || null,
              points: calcPoints,
              isPublished: shouldPublish
            }
          });
        } else if (entry.teamId) {
          await tx.result.upsert({
            where: { teamId_programId: { teamId: entry.teamId, programId: data.programId } },
            update: {
              marks: entry.marks,
              rank: entry.rank || null,
              grade: entry.grade || null,
              points: calcPoints,
              isPublished: shouldPublish
            },
            create: {
              teamId: entry.teamId,
              programId: data.programId,
              marks: entry.marks,
              rank: entry.rank || null,
              grade: entry.grade || null,
              points: calcPoints,
              isPublished: shouldPublish
            }
          });
        }
      }
    });

    if (data.evaluator1 || data.evaluator2) {
      const judgeNames = [data.evaluator1, data.evaluator2].filter(Boolean) as string[];
      const judges = await prisma.user.findMany({
        where: { username: { in: judgeNames, mode: "insensitive" } },
        select: { id: true }
      });
      if (judges.length > 0) {
        // Assign to current program
        await prisma.program.update({
          where: { id: data.programId },
          data: {
            judges: {
              set: judges.map(j => ({ id: j.id }))
            }
          }
        }).catch(() => {});

        // If assignToVenue is selected, also assign these juries to all programs in this venue!
        if (data.assignToVenue && (data.venue || program.venue)) {
          const v = data.venue || program.venue;
          const targetEvent = await prisma.event.findUnique({
            where: { id: data.eventId },
            select: { id: true, parentId: true }
          });
          const progEventId = targetEvent?.parentId || data.eventId;

          const venuePrograms = await prisma.program.findMany({
            where: {
              eventId: progEventId,
              venue: { equals: v, mode: "insensitive" }
            },
            select: { id: true }
          });

          for (const vp of venuePrograms) {
            await prisma.program.update({
              where: { id: vp.id },
              data: {
                judges: {
                  set: judges.map(j => ({ id: j.id }))
                }
              }
            }).catch(() => {});
          }
        }
      }
    }

    revalidatePath("/dashboard/scoring");
    revalidatePath("/tv");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Batch submission failed:", error);
    return { success: false, error: error.message || "Failed to save batch results" };
  }
}

// Standalone action to assign juries directly to a venue
export async function assignJudgesToVenueAction(eventId: string, venue: string, judgeUsernames: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    const cleanNames = judgeUsernames.map(u => u.trim()).filter(Boolean);
    if (cleanNames.length === 0) {
      return { success: false, error: "Please select at least one evaluator / jury." };
    }

    const judges = await prisma.user.findMany({
      where: { username: { in: cleanNames, mode: "insensitive" } },
      select: { id: true }
    });

    if (judges.length === 0) {
      return { success: false, error: "Selected juries were not found in user database." };
    }

    const targetEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, parentId: true }
    });
    const progEventId = targetEvent?.parentId || eventId;

    const venuePrograms = await prisma.program.findMany({
      where: {
        eventId: progEventId,
        venue: { equals: venue, mode: "insensitive" }
      },
      select: { id: true }
    });

    for (const vp of venuePrograms) {
      await prisma.program.update({
        where: { id: vp.id },
        data: {
          judges: {
            set: judges.map(j => ({ id: j.id }))
          }
        }
      }).catch(() => {});
    }

    revalidatePath("/dashboard/scoring");
    revalidatePath("/dashboard/juries");
    return { success: true, count: venuePrograms.length };
  } catch (error: any) {
    console.error("assignJudgesToVenueAction error:", error);
    return { success: false, error: error.message || "Failed to assign juries to venue" };
  }
}

export async function togglePublishResult(id: string, isPublished: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    await prisma.result.update({ where: { id }, data: { isPublished } });
    revalidatePath("/dashboard/scoring");
    revalidatePath("/tv");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update publication status" };
  }
}

export async function publishProgramResults(programId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    await prisma.result.updateMany({
      where: { programId },
      data: { isPublished: true }
    });
    revalidatePath("/dashboard/scoring");
    revalidatePath("/tv");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to publish program results" };
  }
}

export async function unpublishProgramResults(programId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    await prisma.result.updateMany({
      where: { programId },
      data: { isPublished: false }
    });
    revalidatePath("/dashboard/scoring");
    revalidatePath("/tv");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to unpublish program results" };
  }
}

export async function deleteResult(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "JUDGE"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    const result = await prisma.result.findUnique({ where: { id }, include: { program: true } });
    if (!result) return { success: false, error: "Result not found" };
    await prisma.result.delete({ where: { id } });
    await recalculateProgramResults(result.programId);
    revalidatePath("/dashboard/scoring");
    revalidatePath("/tv");
    revalidatePath("/dashboard/certificates");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete result" };
  }
}

export async function deleteProgramResults(programId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "JUDGE"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.result.deleteMany({
      where: { programId }
    });

    revalidatePath("/dashboard/scoring");
    revalidatePath("/tv");
    revalidatePath("/dashboard/certificates");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete program results" };
  }
}

export async function updateResultMark(
  id: string, 
  marks: number, 
  manualRank?: number | null, 
  manualGrade?: string | null,
  customPoints?: number | null
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "JUDGE"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    
    const result = await prisma.result.findUnique({ 
      where: { id }, 
      include: { 
        program: {
          include: { category: { include: { pointMatrix: true } } }
        } 
      } 
    });
    if (!result) return { success: false, error: "Result not found" };

    if (customPoints !== undefined && customPoints !== null) {
      await prisma.result.update({
        where: { id },
        data: { marks: marks || 0, rank: manualRank || null, grade: manualGrade || null, points: customPoints }
      });
    } else if (manualRank !== undefined && manualRank !== null || manualGrade !== undefined && manualGrade !== null) {
      let pointsConfig: any = await getPointsConfigForProgram(result.program.type, result.program.eventId);
      if (result.program.category?.pointMatrix) {
        const matrix = result.program.category.pointMatrix;
        const str = result.program.type === "INDIVIDUAL" ? matrix.individualPoints : (matrix.generalPoints || matrix.groupPoints);
        if (str) {
          try { pointsConfig = { ...pointsConfig, ...JSON.parse(str) }; } catch (e) {}
        }
      }

      let points = 0;
      if (manualRank === 1) points += pointsConfig.rank1 || 0;
      else if (manualRank === 2) points += pointsConfig.rank2 || 0;
      else if (manualRank === 3) points += pointsConfig.rank3 || 0;

      if (manualGrade === "A") points += pointsConfig.gradeA || 0;
      else if (manualGrade === "B") points += pointsConfig.gradeB || 0;
      else if (manualGrade === "C") points += pointsConfig.gradeC || 0;

      await prisma.result.update({ 
        where: { id }, 
        data: { marks: marks || 0, rank: manualRank, grade: manualGrade, points } 
      });
    } else {
      await prisma.result.update({ where: { id }, data: { marks: marks || 0, rank: null, grade: null, points: 0 } });
      await recalculateProgramResults(result.programId);
    }
    
    revalidatePath("/dashboard/scoring");
    revalidatePath("/tv");
    revalidatePath("/dashboard/certificates");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update result" };
  }
}
