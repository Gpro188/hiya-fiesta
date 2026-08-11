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

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return { success: false, error: "Team not found" };

    let totalApproved = 0;

    await prisma.$transaction(async (tx) => {
      // Find all candidates for this team that are NOT approved yet, BUT have at least one program assigned
      const candidatesToApprove = await tx.candidate.findMany({
        where: {
          teamId,
          isApproved: false,
          programs: {
            some: {} // At least one program assigned
          }
        }
      });

      if (candidatesToApprove.length === 0) return;

      // Group by category to generate chest numbers sequentially per category
      const groupedByCategory = candidatesToApprove.reduce((acc, candidate) => {
        if (!acc[candidate.categoryId]) acc[candidate.categoryId] = [];
        acc[candidate.categoryId].push(candidate);
        return acc;
      }, {} as Record<string, typeof candidatesToApprove>);

      for (const [categoryId, candidates] of Object.entries(groupedByCategory)) {
        const cat = await tx.category.findUnique({ where: { id: categoryId } });
        if (!cat) continue;

        let prefixCode = "CH";
        const catNameUpper = cat.name.toUpperCase();
        if (catNameUpper.includes("FADHILA")) prefixCode = "FL";
        else if (catNameUpper.includes("FADHEELA")) prefixCode = "FD";
        else if (catNameUpper.includes("THANVIYYA")) prefixCode = "TN";
        else if (catNameUpper.includes("ALIA") || catNameUpper.includes("AALIA")) prefixCode = "AL";

        const offset = cat.chestNumberOffset || 0;

        // Find max sequence number currently approved in THIS category across ALL teams
        const existingCandidates = await tx.candidate.findMany({
          where: { categoryId: cat.id, isApproved: true, chestNumber: { not: null } },
          select: { chestNumber: true }
        });

        let nextSequence = 1;
        if (existingCandidates.length > 0) {
          const sequences = existingCandidates
            .map(c => c.chestNumber!)
            .map(cn => {
               const numPart = parseInt(cn.replace(prefixCode, ''), 10);
               return numPart - offset;
            })
            .filter(n => !isNaN(n));
            
          if (sequences.length > 0) {
            nextSequence = Math.max(...sequences) + 1;
          }
        }

        // Sort candidates alphabetically by name for deterministic ordering
        candidates.sort((a, b) => a.name.localeCompare(b.name));

        // Assign chest numbers
        for (let i = 0; i < candidates.length; i++) {
          const finalNum = offset + nextSequence + i;
          const formattedNum = finalNum.toString().padStart(4, '0');
          const newChestNumber = `${prefixCode}${formattedNum}`;

          await tx.candidate.update({
            where: { id: candidates[i].id },
            data: {
              isApproved: true,
              chestNumber: newChestNumber
            }
          });
          totalApproved++;
        }
      }
    });

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/candidates");
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
    await prisma.team.update({
      where: { id: teamId },
      data: { isAssignmentsConfirmed: false }
    });
    revalidatePath("/dashboard/teams");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to unlock assignments" };
  }
}
