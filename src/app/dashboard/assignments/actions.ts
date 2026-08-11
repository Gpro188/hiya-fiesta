"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function assignProgram(candidateId: string, programId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      const fullUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { institutionId: true, eventId: true } });
      if (!fullUser?.institutionId) return { success: false, error: "Institution not found" };

      // Find zone event via institution → zone → zone event
      const institution = await prisma.masterInstitution.findUnique({
        where: { id: fullUser.institutionId },
        include: { zone: true }
      });

      let teamForManager = null;
      if (institution?.zone) {
        const zoneEvent = await prisma.event.findFirst({
          where: { type: 'ZONE', zoneId: institution.zone.id, NOT: { parentId: null } }
        });
        if (zoneEvent) {
          teamForManager = await prisma.team.findFirst({
            where: { institutionId: fullUser.institutionId, eventId: zoneEvent.id },
            include: { event: true }
          });
          if (teamForManager) {
            if (teamForManager.isAssignmentsConfirmed) {
              return { success: false, error: "Program assignments have been submitted to the Zone and are now locked." };
            }
            const now = new Date();
            if (zoneEvent.registrationStart && now < zoneEvent.registrationStart) {
              return { success: false, error: `Program registration opens on ${zoneEvent.registrationStart.toLocaleString()}` };
            }
            if (zoneEvent.registrationEnd && now > zoneEvent.registrationEnd) {
              return { success: false, error: "Registration deadline has passed." };
            }
          }
        }
      }
    }
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { 
        programs: { include: { program: { include: { category: true } } } }, 
        category: true,
        masterStudent: true
      }
    });

    const program = await prisma.program.findUnique({ 
      where: { id: programId },
      include: { category: true }
    });

    if (!candidate || !program) return { success: false, error: "Candidate or Program not found" };

    const isGeneral = !program.category || program.category.name.toUpperCase() === "GENERAL";
    const programCatName = program.category?.name?.toUpperCase() || "GENERAL";
    const studentStream = candidate.masterStudent?.stream?.toUpperCase();

    // Validation 1: Stream Mismatch
    if (!isGeneral && studentStream) {
      if (studentStream === "FADHILA" && programCatName === "FADHEELA") {
        return { success: false, error: "Fadhila stream students cannot register for Fadheela programs." };
      }
      if (studentStream === "FADHEELA" && programCatName === "FADHILA") {
        return { success: false, error: "Fadheela stream students cannot register for Fadhila programs." };
      }
    }

    // Validation 2: Individual Registration Limits
    // Max 2 On-stage, 2 Off-stage, 1 General
    const currentOnStage = candidate.programs.filter(p => p.program.stageType === "ON_STAGE" && p.program.category?.name?.toUpperCase() !== "GENERAL").length;
    const currentOffStage = candidate.programs.filter(p => p.program.stageType === "OFF_STAGE" && p.program.category?.name?.toUpperCase() !== "GENERAL").length;
    const currentGeneral = candidate.programs.filter(p => !p.program.category || p.program.category.name.toUpperCase() === "GENERAL").length;

    if (isGeneral) {
      if (currentGeneral >= 1) return { success: false, error: "Exceeded max limit of 1 General program per candidate." };
    } else {
      if (program.stageType === "ON_STAGE" && currentOnStage >= 2) {
        return { success: false, error: "Exceeded max limit of 2 On-Stage programs per candidate." };
      }
      if (program.stageType === "OFF_STAGE" && currentOffStage >= 2) {
        return { success: false, error: "Exceeded max limit of 2 Off-Stage programs per candidate." };
      }
    }

    if (program.type === "INDIVIDUAL") {
      const currentIndividual = candidate.programs.filter(p => p.program.type === "INDIVIDUAL").length;
      if (currentIndividual >= 4) {
        return { success: false, error: "Exceeded max limit of 4 Individual programs per candidate." };
      }
    }

    // Validation 3: Per Team Limit
    const teamLimit = program.candidateLimitPerTeam || 1;
    const teamAssignmentsCount = await prisma.programAssignment.count({
      where: {
        programId: programId,
        candidate: {
          teamId: candidate.teamId
        }
      }
    });

    if (teamAssignmentsCount >= teamLimit) {
      return { success: false, error: `Your team has already assigned ${teamLimit} candidate(s) to this program (Max limit reached).` };
    }

    await prisma.programAssignment.create({
      data: {
        candidateId,
        programId
      }
    });

    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to assign program:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Candidate is already assigned to this program." };
    }
    return { success: false, error: error.message || "Failed to assign program." };
  }
}

export async function unassignProgram(candidateId: string, programId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, include: { team: true } });
      if (candidate?.team?.isAssignmentsConfirmed) {
        return { success: false, error: "Program assignments have been submitted to the Zone and are now locked." };
      }
      
      const fullUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { institutionId: true, eventId: true } });
      const team = fullUser?.institutionId ? await prisma.team.findFirst({
        where: fullUser.eventId 
          ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
          : { institutionId: fullUser.institutionId },
        include: { event: true }
      }) : null;
      if (team && team.event.registrationEnd && new Date() > team.event.registrationEnd) {
        return { success: false, error: "Registration deadline has passed. Cannot unassign program." };
      }
    }
    await prisma.programAssignment.delete({
      where: {
        candidateId_programId: {
          candidateId,
          programId
        }
      }
    });

    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to unassign program:", error);
    if (error.code === 'P2025') {
      return { success: false, error: "Assignment not found or already removed." };
    }
    return { success: false, error: error.message || "Failed to unassign program." };
  }
}


export async function confirmTeamAssignments(teamId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    await prisma.team.update({
      where: { id: teamId },
      data: { isAssignmentsConfirmed: true }
    });

    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to confirm assignments:", error);
    return { success: false, error: "Failed to confirm assignments." };
  }
}
