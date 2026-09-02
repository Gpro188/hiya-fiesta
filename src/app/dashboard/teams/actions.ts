"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

export async function confirmTeamRegistration(teamId: string) {
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

    await prisma.$transaction(async (tx) => {
      // Find all candidates for this team that have at least one program assigned
      const candidatesToApprove = await tx.candidate.findMany({
        where: {
          teamId,
          programs: {
            some: {} // At least one program assigned
          }
        },
        include: {
          category: true
        }
      });

      if (candidatesToApprove.length === 0) {
        await tx.team.update({
          where: { id: teamId },
          data: { isAssignmentsConfirmed: true }
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
        data: { isAssignmentsConfirmed: true }
      });
    });

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    return { success: true, count: totalApproved };
  } catch (error: any) {
    console.error("Failed to confirm team registration:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Approval failed: Chest number collision." };
    }
    return { success: false, error: error.message || "Failed to confirm registration" };
  }
}

export async function unlockTeamAssignments(teamId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { isAssignmentsConfirmed: false }
    });
    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to unlock assignments" };
  }
}
