"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Helper to determine Grade based on marks
function calculateGrade(marks: number) {
  if (marks >= 80) return "A";
  if (marks >= 60) return "B";
  if (marks > 0) return "C";
  return null;
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
          category: true,
          event: true
        } 
      } 
    }
  });

  if (results.length === 0) return;

  const program = results[0].program;
  const programType = program.type;
  
  let pointsConfig: any = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
  if (programType !== "INDIVIDUAL") {
    pointsConfig = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };
  }

  if (programType === "GENERAL") {
    // General points no longer parsed from matrix, using default
  } else {
    // Category points no longer parsed from matrix, using default
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
        category: true, 
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
       let pointsConfig: any = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
       if (program.type !== "INDIVIDUAL") {
         pointsConfig = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };
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

export async function togglePublishResult(id: string, isPublished: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    await prisma.result.update({ where: { id }, data: { isPublished } });
    revalidatePath("/dashboard/scoring");
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
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to publish program results" };
  }
}

export async function deleteResult(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    const result = await prisma.result.findUnique({ where: { id }, include: { program: true } });
    if (!result) return { success: false, error: "Result not found" };
    await prisma.result.delete({ where: { id } });
    await recalculateProgramResults(result.programId);
    revalidatePath("/dashboard/scoring");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete result" };
  }
}

export async function updateResultMark(id: string, marks: number, manualRank?: number | null, manualGrade?: string | null) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    
    const result = await prisma.result.findUnique({ where: { id }, include: { program: true } });
    if (!result) return { success: false, error: "Result not found" };

    if (manualRank !== undefined && manualRank !== null || manualGrade !== undefined && manualGrade !== null) {
      let pointsConfig: any = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
      if (result.program.type !== "INDIVIDUAL") {
        pointsConfig = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };
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
        data: { marks, rank: manualRank, grade: manualGrade, points } 
      });
    } else {
      await prisma.result.update({ where: { id }, data: { marks, rank: null, grade: null, points: 0 } });
      await recalculateProgramResults(result.programId);
    }
    
    revalidatePath("/dashboard/scoring");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update result" };
  }
}
