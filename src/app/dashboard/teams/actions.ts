"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getZoneUnlockStatus } from "@/lib/zoneUnlockUtils";

export async function createTeam(data: any) {
  try {
    const existingPrefix = await prisma.team.findUnique({
      where: { prefixCode: data.prefixCode }
    });
    
    if (existingPrefix) return { success: false, error: "Prefix code already exists" };

    const existingManager = await prisma.user.findUnique({
      where: { username: data.managerUsername }
    });

    if (existingManager) return { success: false, error: "Manager username already exists" };

    const hashedPassword = await bcrypt.hash(data.managerPassword, 10);

    // Create Manager and Team in a transaction
    await prisma.$transaction(async (tx) => {
      const manager = await tx.user.create({
        data: {
          username: data.managerUsername,
          password: hashedPassword,
          role: "MANAGER"
        }
      });

      await tx.team.create({
        data: {
          name: data.name,
          prefixCode: data.prefixCode,
          eventId: data.eventId,
          institutionId: data.institutionId, // assuming we use institutionId now? Well, for now just remove managerId
          leaderName: data.leaderName,
          leaderPhoto: data.leaderPhoto,
          flagColor: data.flagColor,
        }
      });
    });

    revalidatePath("/dashboard/teams");
    return { success: true };
  } catch (error) {
    console.error("Failed to create team:", error);
    return { success: false, error: "Failed to create team. Ensure prefix is unique." };
  }
}

export async function updateTeam(id: string, data: any) {
  try {
    const updateData: any = {
      name: data.name,
      prefixCode: data.prefixCode,
      leaderName: data.leaderName,
      leaderPhoto: data.leaderPhoto,
      flagColor: data.flagColor,
    };

    if (data.managerUsername || data.managerPassword) {
      // In the new architecture, managers are linked via institutionId, not team.managerId.
      // So updating the manager directly from the team edit form is not supported here anymore.
    }

    await prisma.team.update({
      where: { id },
      data: updateData
    });

    revalidatePath("/dashboard/teams");
    return { success: true };
  } catch (error) {
    console.error("Failed to update team:", error);
    return { success: false, error: "Failed to update team" };
  }
}

export async function deleteTeam(id: string) {
  try {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return { success: false, error: "Team not found" };

    // Delete Team
    await prisma.$transaction(async (tx) => {
      await tx.team.delete({ where: { id } });
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete team:", error);
    return { success: false, error: "Failed to delete team" };
  }
}

export async function confirmTeamRegistration(teamId: string, stageType?: 'OFF_STAGE' | 'ON_STAGE' | 'ALL') {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const team = await prisma.team.findUnique({ 
      where: { id: teamId },
      include: { event: true } 
    });
    if (!team) return { success: false, error: "Team not found" };

    let totalApproved = 0;
    let assignedMagazineCode = team.magazineCode;

    await prisma.$transaction(async (tx) => {
      // 1. Assign sequential Magazine Code if not already assigned
      if (!assignedMagazineCode) {
        const existingTeamsWithMag = await tx.team.findMany({
          where: {
            eventId: team.eventId,
            magazineCode: { not: null }
          },
          select: { magazineCode: true }
        });

        const existingNums = existingTeamsWithMag
          .map(t => {
            const match = t.magazineCode?.match(/MAG-(\d+)/i);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter((n): n is number => n !== null && !isNaN(n));

        const nextMagNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
        assignedMagazineCode = `MAG-${String(nextMagNum).padStart(2, '0')}`;
      }

      // Determine update fields based on stageType
      const updateTeamData: any = {
        isMagazineParticipating: true,
        magazineCode: assignedMagazineCode
      };

      if (stageType === 'OFF_STAGE') {
        updateTeamData.isAssignmentsConfirmed = true;
      } else if (stageType === 'ON_STAGE') {
        updateTeamData.isOnStageConfirmed = true;
        updateTeamData.isAssignmentsConfirmed = true;
      } else {
        updateTeamData.isAssignmentsConfirmed = true;
        updateTeamData.isOnStageConfirmed = true;
      }

      // When confirming OFF_STAGE, ONLY load candidates who are registered for OFF_STAGE programs!
      // When confirming ON_STAGE or ALL, load candidates registered for programs
      const programStageFilter = stageType === 'OFF_STAGE'
        ? { some: { program: { stageType: 'OFF_STAGE' } } }
        : { some: {} };

      const candidatesToApprove = await tx.candidate.findMany({
        where: {
          teamId,
          programs: programStageFilter
        },
        include: {
          category: true
        }
      });

      if (candidatesToApprove.length === 0) {
        await tx.team.update({
          where: { id: teamId },
          data: updateTeamData
        });
        return;
      }

      // Query all used chest numbers globally to avoid collisions
      const allUsed = await tx.candidate.findMany({
        where: { chestNumber: { not: null } },
        select: { id: true, chestNumber: true }
      });
      const globalUsedNumbers = new Set<string>(
        allUsed.map(c => c.chestNumber!).filter(Boolean)
      );

      // Group candidates by category
      const groupedByCategory = candidatesToApprove.reduce((acc, candidate) => {
        if (!acc[candidate.categoryId]) acc[candidate.categoryId] = [];
        acc[candidate.categoryId].push(candidate);
        return acc;
      }, {} as Record<string, typeof candidatesToApprove>);

      for (const [categoryId, candidates] of Object.entries(groupedByCategory)) {
        const cat = await tx.category.findUnique({ where: { id: categoryId } });
        if (!cat) continue;

        // Base offset (e.g., 100 for Fadhila, 200 for Fadheela, 300 for General)
        const baseOffset = (cat.chestNumberOffset && cat.chestNumberOffset > 0)
          ? cat.chestNumberOffset
          : 100;

        // Find existing assigned numeric chest numbers in this category within the same event
        const existingCategoryCandidates = await tx.candidate.findMany({
          where: {
            categoryId,
            chestNumber: { not: null },
            team: { eventId: team.eventId }
          },
          select: { id: true, chestNumber: true }
        });

        // Filter out candidates currently being processed
        const currentCandidateIds = new Set(candidates.map(c => c.id));
        const existingNumbers = existingCategoryCandidates
          .filter(c => !currentCandidateIds.has(c.id))
          .map(c => parseInt(c.chestNumber!, 10))
          .filter(n => !isNaN(n) && n >= baseOffset);

        let nextNum = existingNumbers.length > 0
          ? Math.max(...existingNumbers) + 1
          : baseOffset + 1; // e.g. 101, 201, 301

        // Sort candidates within this institution alphabetically by name for deterministic order
        candidates.sort((a, b) => a.name.localeCompare(b.name));

        // Assign consecutive numbers one by one: 301, 302, 303... or 340, 341, 342...
        for (const candidate of candidates) {
          if (candidate.chestNumber && !isNaN(parseInt(candidate.chestNumber, 10)) && candidate.isApproved) {
            totalApproved++;
            continue;
          }

          let candidateChestNumber = nextNum.toString();
          while (globalUsedNumbers.has(candidateChestNumber)) {
            nextNum++;
            candidateChestNumber = nextNum.toString();
          }

          globalUsedNumbers.add(candidateChestNumber);
          nextNum++;

          await tx.candidate.update({
            where: { id: candidate.id },
            data: {
              isApproved: true,
              chestNumber: candidateChestNumber
            }
          });
          totalApproved++;
        }
      }

      // Mark the team assignments confirmed
      await tx.team.update({
        where: { id: teamId },
        data: updateTeamData
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/reports");
    return { success: true, count: totalApproved, magazineCode: assignedMagazineCode };
  } catch (error: any) {
    console.error("Failed to confirm team registration:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Approval failed: Chest number collision." };
    }
    return { success: false, error: error.message || "Failed to confirm registration" };
  }
}

export async function updateTeamRegistrationAccess(
  teamId: string, 
  accessType: 'OFF_STAGE' | 'ON_STAGE' | 'BOTH' | 'LOCK',
  reason?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const team = await prisma.team.findUnique({ 
      where: { id: teamId },
      include: { 
        event: {
          include: {
            parent: true
          }
        }
      } 
    });
    if (!team) return { success: false, error: "Team not found" };

    // If ZONE_ADMIN, ensure team is within their zone
    if (session.user.role === "ZONE_ADMIN") {
      const fullUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { zoneId: true }
      });
      if (team.event.zoneId !== fullUser?.zoneId) {
        return { success: false, error: "Unauthorized: You can only manage teams in your assigned zone." };
      }

      // If opening/unlocking, check Super Admin fixed time window and visibility setting
      if (accessType !== 'LOCK') {
        const unlockStatus = getZoneUnlockStatus(team.event);
        if (!unlockStatus.isAllowed) {
          return {
            success: false,
            error: `Registration unlock is currently closed for Zone Admins. ${unlockStatus.message}`
          };
        }
      }
    }

    let updateData: any = {};
    if (accessType === 'OFF_STAGE') {
      updateData = {
        offStageUnlocked: true,
        onStageUnlocked: false,
        registrationUnlocked: true,
        isAssignmentsConfirmed: false,
      };
    } else if (accessType === 'ON_STAGE') {
      updateData = {
        offStageUnlocked: false,     // Off-Stage REMAINS 100% LOCKED!
        onStageUnlocked: true,       // On-Stage is unlocked!
        registrationUnlocked: true,
        isAssignmentsConfirmed: true, // Keep Off-Stage LOCKED!
        isOnStageConfirmed: false,   // Unlock On-Stage
      };
    } else if (accessType === 'BOTH') {
      updateData = {
        offStageUnlocked: true,
        onStageUnlocked: true,
        registrationUnlocked: true,
        isAssignmentsConfirmed: false,
        isOnStageConfirmed: false,
      };
    } else if (accessType === 'LOCK') {
      updateData = {
        offStageUnlocked: false,
        onStageUnlocked: false,
        registrationUnlocked: false,
        isAssignmentsConfirmed: true,
        isOnStageConfirmed: true,
      };
    }

    await prisma.team.update({
      where: { id: teamId },
      data: updateData
    });

    // Record audit log
    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Zone Admin",
        action: `SET_REGISTRATION_ACCESS_${accessType}`,
        entityType: "TEAM",
        entityId: teamId,
        reason: reason || `Registration access set to ${accessType} by ${session.user.role}`
      }
    }).catch(err => console.warn("Audit log creation non-fatal error:", err));

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update team registration access:", error);
    return { success: false, error: error.message || "Failed to update registration access" };
  }
}

export async function bulkUnlockOnStageForZone(zoneIdOrEventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    let teamWhere: any = {
      OR: [
        { eventId: zoneIdOrEventId },
        { event: { zoneId: zoneIdOrEventId } },
        { event: { parentId: zoneIdOrEventId } }
      ]
    };

    if (session.user.role === "ZONE_ADMIN") {
      const fullUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { zoneId: true, eventId: true }
      });
      if (fullUser?.zoneId) {
        teamWhere = { event: { zoneId: fullUser.zoneId } };
      }
    }

    const teams = await prisma.team.findMany({
      where: teamWhere,
      select: { id: true, name: true, isAssignmentsConfirmed: true }
    });

    if (teams.length === 0) {
      return { success: false, error: "No teams found in this zone." };
    }

    await prisma.team.updateMany({
      where: {
        id: { in: teams.map(t => t.id) }
      },
      data: {
        onStageUnlocked: true,
        isOnStageConfirmed: false,
        offStageUnlocked: false, // Strictly keep Off-Stage locked
        registrationUnlocked: true
      }
    });

    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Zone Admin",
        action: "BULK_OPEN_ON_STAGE",
        entityType: "EVENT",
        entityId: zoneIdOrEventId,
        reason: `Bulk opened On-Stage registration for ${teams.length} teams while keeping Off-Stage strictly locked.`
      }
    }).catch(e => console.warn("Audit log non-fatal:", e));

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/candidates");
    return { success: true, count: teams.length };
  } catch (error: any) {
    console.error("Failed to bulk unlock On-Stage:", error);
    return { success: false, error: error.message || "Failed to bulk open On-Stage" };
  }
}

export async function unlockTeamAssignments(teamId: string) {
  return updateTeamRegistrationAccess(teamId, 'BOTH', 'Full unlock granted');
}

