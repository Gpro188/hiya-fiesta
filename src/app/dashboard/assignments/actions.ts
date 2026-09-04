"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isProgramGeneral } from "@/lib/programUtils";

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
          where: { type: 'ZONE', zoneId: institution.zone.id, NOT: { parentId: null } },
          include: { parent: true }
        });
        if (zoneEvent) {
          teamForManager = await prisma.team.findFirst({
            where: { institutionId: fullUser.institutionId, eventId: zoneEvent.id },
            include: { event: { include: { parent: true } } }
          });
          if (teamForManager) {
            if (teamForManager.isAssignmentsConfirmed) {
              return { success: false, error: "Program assignments have been submitted to the Zone and are now locked." };
            }
            const now = new Date();
            const start = zoneEvent.assignmentStart || zoneEvent.parent?.assignmentStart;
            const end = zoneEvent.assignmentEnd || zoneEvent.parent?.assignmentEnd || zoneEvent.institutionRegistrationEndDate || zoneEvent.parent?.institutionRegistrationEndDate || zoneEvent.registrationEnd || zoneEvent.parent?.registrationEnd;
            
            if (start && now < start) {
              return { success: false, error: `Program registration opens on ${start.toLocaleString()}` };
            }
            if (end && now > end) {
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
        masterStudent: true,
        team: true
      }
    });

    const program = await prisma.program.findUnique({ 
      where: { id: programId },
      include: { category: true }
    });

    if (!candidate || !program) return { success: false, error: "Candidate or Program not found" };

    const isGeneral = isProgramGeneral(program);
    const programCatName = program.category?.name?.toUpperCase() || "GENERAL";
    const studentStream = candidate.masterStudent?.stream?.toUpperCase();

    // Validation 1: Stream & Category Mismatch
    if (!isGeneral) {
      // Check candidate's assigned category
      const candidateCatName = candidate.category?.name?.toUpperCase() || "";
      if (candidateCatName && candidateCatName !== "GENERAL" && programCatName !== candidateCatName) {
        return { success: false, error: `Candidate is registered under ${candidate.category.name} and cannot register for ${program.category?.name} programs.` };
      }
    }

    // Validation 2: Individual and General Registration Limits
    // Fetch dynamic limits from Settings (falls back to 4 individual, 2 on-stage, 2 off-stage, 2 general total, 1 general on-stage, 1 general off-stage)
    const settings = await getSettings(candidate.team?.eventId || session.user.eventId);
    const maxIndivTotal = settings?.maxIndividualPrograms ?? 4;
    const maxIndivOnStage = settings?.maxIndividualOnStage ?? 2;
    const maxIndivOffStage = settings?.maxIndividualOffStage ?? 2;
    const maxGenTotal = settings?.maxGeneralTotal ?? 2;
    const maxGenOnStage = settings?.maxGeneralOnStage ?? 1;
    const maxGenOffStage = settings?.maxGeneralOffStage ?? 1;

    // Separate counts cleanly using isProgramGeneral
    const currentOnStageIndividual = candidate.programs.filter(p => !isProgramGeneral(p.program) && p.program.stageType === "ON_STAGE").length;
    const currentOffStageIndividual = candidate.programs.filter(p => !isProgramGeneral(p.program) && p.program.stageType === "OFF_STAGE").length;
    const currentIndividualTotal = candidate.programs.filter(p => !isProgramGeneral(p.program) && p.program.type === "INDIVIDUAL").length;

    const currentOnStageGeneral = candidate.programs.filter(p => isProgramGeneral(p.program) && p.program.stageType === "ON_STAGE").length;
    const currentOffStageGeneral = candidate.programs.filter(p => isProgramGeneral(p.program) && p.program.stageType === "OFF_STAGE").length;
    const currentGeneralTotal = candidate.programs.filter(p => isProgramGeneral(p.program)).length;

    if (isGeneral) {
      if (program.stageType === "ON_STAGE" && currentOnStageGeneral >= maxGenOnStage) {
        return { success: false, error: `Exceeded max limit of ${maxGenOnStage} On-Stage General program(s) per candidate.` };
      }
      if (program.stageType === "OFF_STAGE" && currentOffStageGeneral >= maxGenOffStage) {
        return { success: false, error: `Exceeded max limit of ${maxGenOffStage} Off-Stage General program(s) per candidate.` };
      }
      if (currentGeneralTotal >= maxGenTotal) {
        return { success: false, error: `Exceeded max limit of ${maxGenTotal} General program(s) per candidate.` };
      }
    } else {
      if (program.stageType === "ON_STAGE" && currentOnStageIndividual >= maxIndivOnStage) {
        return { success: false, error: `Exceeded max limit of ${maxIndivOnStage} On-Stage programs per candidate.` };
      }
      if (program.stageType === "OFF_STAGE" && currentOffStageIndividual >= maxIndivOffStage) {
        return { success: false, error: `Exceeded max limit of ${maxIndivOffStage} Off-Stage programs per candidate.` };
      }
      if (program.type === "INDIVIDUAL" && currentIndividualTotal >= maxIndivTotal) {
        return { success: false, error: `Exceeded max limit of ${maxIndivTotal} Individual programs per candidate.` };
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
