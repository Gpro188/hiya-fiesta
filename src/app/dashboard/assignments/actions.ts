"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isProgramGeneral, isInstitutionProgram } from "@/lib/programUtils";
import { getRegistrationLockStatus } from "@/lib/registrationLockUtils";

export async function assignProgram(candidateId: string, programId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { 
        programs: { include: { program: { include: { category: true } } } }, 
        category: true,
        masterStudent: true,
        team: {
          include: {
            event: {
              include: { parent: true }
            }
          }
        }
      }
    });

    const program = await prisma.program.findUnique({ 
      where: { id: programId },
      include: { category: true }
    });

    if (!candidate || !program) return { success: false, error: "Candidate or Program not found" };

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      const team = candidate.team;
      if (team) {
        const isOffStage = program.stageType === "OFF_STAGE";
        const isOnStage = program.stageType === "ON_STAGE";

        const teamCandidates = await prisma.candidate.findMany({
          where: { teamId: team.id },
          select: {
            id: true,
            chestNumber: true,
            programs: {
              select: {
                program: {
                  select: { stageType: true }
                }
              }
            }
          }
        });

        const lockStatus = getRegistrationLockStatus(team, null, teamCandidates, false);

        if (lockStatus.isNotStarted && lockStatus.startDate) {
          return { success: false, error: `Program registration opens on ${lockStatus.startDate.toLocaleString()}` };
        }

        if (isOffStage) {
          if (!lockStatus.isOffStageOpen) {
            if (team.isAssignmentsConfirmed) {
              return { success: false, error: "Off-Stage assignments have already been submitted and confirmed by your institution. Only On-Stage programs can be edited before Zone Admin confirms." };
            }
            if (lockStatus.isZoneConfirmedOffStage) {
              return { success: false, error: "Off-Stage assignments have been officially confirmed by the Zone Admin with Chest Numbers assigned. Contact your Zone Admin to request an unlock." };
            }
            if (lockStatus.isOffStageDeadlinePassed) {
              return { success: false, error: `Off-Stage registration closed on ${lockStatus.offDeadline?.toLocaleString()}. Contact your Zone Admin to request access.` };
            }
            return { success: false, error: "Off-Stage registration is currently locked." };
          }
        } else if (isOnStage) {
          if (!lockStatus.isOnStageOpen) {
            if (lockStatus.isZoneConfirmedOnStage) {
              return { success: false, error: "On-Stage assignments have been officially confirmed by the Zone Admin with Chest Numbers assigned. Contact your Zone Admin to request an unlock." };
            }
            if (lockStatus.isOnStageDeadlinePassed) {
              return { success: false, error: `On-Stage registration closed on ${lockStatus.onDeadline?.toLocaleString()}. Contact your Zone Admin to request access.` };
            }
            return { success: false, error: "On-Stage registration is currently locked." };
          }
        } else {
          if (!lockStatus.isOffStageOpen && !lockStatus.isOnStageOpen) {
            return { success: false, error: "Registration deadline has passed. Contact your Zone Admin to request an unlock." };
          }
        }
      }
    }

    if (isInstitutionProgram(program)) {
      return { success: false, error: "Institution-level programs (such as Magazine) are assigned directly to the Institution/Team, not to individual students." };
    }

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
      const candidate = await prisma.candidate.findUnique({ 
        where: { id: candidateId }, 
        include: { 
          team: { 
            include: { 
              event: { 
                include: { parent: true } 
              } 
            } 
          } 
        } 
      });

      const program = await prisma.program.findUnique({ where: { id: programId } });
      if (!candidate || !program) return { success: false, error: "Candidate or Program not found" };

      const team = candidate.team;
      if (team) {
        const isOffStage = program.stageType === "OFF_STAGE";
        const isOnStage = program.stageType === "ON_STAGE";

        const teamCandidates = await prisma.candidate.findMany({
          where: { teamId: team.id },
          select: {
            id: true,
            chestNumber: true,
            programs: {
              select: {
                program: {
                  select: { stageType: true }
                }
              }
            }
          }
        });

        const lockStatus = getRegistrationLockStatus(team, null, teamCandidates, false);

        if (isOffStage) {
          if (!lockStatus.isOffStageOpen) {
            if (team.isAssignmentsConfirmed) {
              return { success: false, error: "Off-Stage assignments have already been submitted and confirmed by your institution. Only On-Stage programs can be edited before Zone Admin confirms." };
            }
            if (lockStatus.isZoneConfirmedOffStage) {
              return { success: false, error: "Off-Stage assignments have been officially confirmed by the Zone Admin with Chest Numbers assigned. Cannot remove assignment without Zone Admin unlock." };
            }
            if (lockStatus.isOffStageDeadlinePassed) {
              return { success: false, error: `Off-Stage registration closed on ${lockStatus.offDeadline?.toLocaleString()}. Cannot remove assignment.` };
            }
            return { success: false, error: "Off-Stage registration is currently locked." };
          }
        } else if (isOnStage) {
          if (!lockStatus.isOnStageOpen) {
            if (lockStatus.isZoneConfirmedOnStage) {
              return { success: false, error: "On-Stage assignments have been officially confirmed by the Zone Admin with Chest Numbers assigned. Cannot remove assignment without Zone Admin unlock." };
            }
            if (lockStatus.isOnStageDeadlinePassed) {
              return { success: false, error: `On-Stage registration closed on ${lockStatus.onDeadline?.toLocaleString()}. Cannot remove assignment.` };
            }
            return { success: false, error: "On-Stage registration is currently locked." };
          }
        } else {
          if (!lockStatus.isOffStageOpen && !lockStatus.isOnStageOpen) {
            return { success: false, error: "Registration deadline has passed. Cannot remove assignment." };
          }
        }
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
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to unassign program:", error);
    return { success: false, error: error.message || "Failed to unassign program" };
  }
}


export async function confirmTeamAssignments(teamId: string, stageType?: 'OFF_STAGE' | 'ON_STAGE' | 'ALL') {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    const updateData: any = {};
    if (stageType === 'OFF_STAGE') {
      updateData.isAssignmentsConfirmed = true;
    } else if (stageType === 'ON_STAGE') {
      updateData.isOnStageConfirmed = true;
    } else {
      updateData.isAssignmentsConfirmed = true;
      updateData.isOnStageConfirmed = true;
    }

    await prisma.team.update({
      where: { id: teamId },
      data: updateData
    });

    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/teams");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to confirm assignments:", error);
    return { success: false, error: "Failed to confirm assignments." };
  }
}

export async function toggleMagazineParticipation(teamId: string, participating: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: {
          include: { parent: true }
        }
      }
    });

    if (!team) return { success: false, error: "Team not found" };

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      const teamCandidates = await prisma.candidate.findMany({
        where: { teamId: team.id },
        select: {
          id: true,
          chestNumber: true,
          programs: {
            select: { program: { select: { stageType: true } } }
          }
        }
      });
      const lockStatus = getRegistrationLockStatus(team, null, teamCandidates, false);
      if (!lockStatus.isOffStageOpen) {
        if (lockStatus.isZoneConfirmedOffStage) {
          return { success: false, error: "Magazine participation has already been confirmed by the Zone Admin with Chest Numbers / Magazine Code assigned." };
        }
        return { success: false, error: "Off-stage / Magazine registration deadline has passed. Contact your Zone Admin." };
      }
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { isMagazineParticipating: participating }
    });

    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to toggle magazine participation:", error);
    return { success: false, error: error.message || "Failed to update magazine participation" };
  }
}

