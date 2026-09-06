"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getZoneUnlockStatus } from "@/lib/zoneUnlockUtils";

export async function addZone(data: { name: string; code: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const zone = await prisma.zone.create({
      data: {
        name: data.name.trim().toUpperCase(),
        code: data.code.trim().toUpperCase(),
      }
    });

    revalidatePath("/dashboard/super/zones");
    return { success: true, zone };
  } catch (error: any) {
    console.error("Failed to add zone:", error);
    return { success: false, error: error.message || "Failed to add zone" };
  }
}

export async function updateZone(id: string, data: { name: string; code: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.zone.update({
      where: { id },
      data: {
        name: data.name.trim().toUpperCase(),
        code: data.code.trim().toUpperCase(),
      }
    });

    revalidatePath("/dashboard/super/zones");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update zone:", error);
    return { success: false, error: error.message || "Failed to update zone" };
  }
}

export async function deleteZone(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.zone.delete({ where: { id } });

    revalidatePath("/dashboard/super/zones");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete zone:", error);
    return { success: false, error: error.message || "Failed to delete zone" };
  }
}

export async function resetFestData(options: { 
  zoneId?: string; 
  clearResults?: boolean; 
  clearAssignments?: boolean; 
  clearCandidates?: boolean;
  unlockTeams?: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized: Super Admin permission required." };
    }

    const { zoneId, clearResults = true, clearAssignments = true, clearCandidates = true, unlockTeams = true } = options;

    let targetTeamIds: string[] = [];
    if (zoneId) {
      const institutions = await prisma.masterInstitution.findMany({
        where: { zoneId },
        select: { id: true }
      });
      const instIds = institutions.map(i => i.id);
      const teams = await prisma.team.findMany({
        where: { institutionId: { in: instIds } },
        select: { id: true }
      });
      targetTeamIds = teams.map(t => t.id);
    }

    const teamFilter = targetTeamIds.length > 0 ? { teamId: { in: targetTeamIds } } : {};

    // 1. Delete test results
    if (clearResults) {
      if (targetTeamIds.length > 0) {
        await prisma.result.deleteMany({
          where: {
            OR: [
              { teamId: { in: targetTeamIds } },
              { candidate: { teamId: { in: targetTeamIds } } }
            ]
          }
        });
      } else {
        await prisma.result.deleteMany({});
      }
    }

    // 2. Delete test program assignments
    if (clearAssignments) {
      if (targetTeamIds.length > 0) {
        await prisma.programAssignment.deleteMany({
          where: { candidate: { teamId: { in: targetTeamIds } } }
        });
      } else {
        await prisma.programAssignment.deleteMany({});
      }
    }

    // 3. Delete state qualifications if any
    if (clearCandidates) {
      if (targetTeamIds.length > 0) {
        await prisma.stateQualification.deleteMany({
          where: { candidate: { teamId: { in: targetTeamIds } } }
        });
        await prisma.candidate.deleteMany({
          where: { teamId: { in: targetTeamIds } }
        });
      } else {
        await prisma.stateQualification.deleteMany({});
        await prisma.candidate.deleteMany({});
      }
    }

    // 4. Unlock institution teams & reset confirmation
    if (unlockTeams) {
      if (targetTeamIds.length > 0) {
        await prisma.team.updateMany({
          where: { id: { in: targetTeamIds } },
          data: { isAssignmentsConfirmed: false }
        });
      } else {
        await prisma.team.updateMany({
          data: { isAssignmentsConfirmed: false }
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/super/zones");
    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to reset festival data:", error);
    return { success: false, error: error.message || "Failed to reset test data" };
  }
}

export async function unlockInstitutionTeam(teamId: string, reason?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: {
          include: { parent: true }
        }
      }
    });
    if (!team) return { success: false, error: "Team not found" };

    if (session.user.role === "ZONE_ADMIN") {
      const unlockStatus = getZoneUnlockStatus(team.event);
      if (!unlockStatus.isAllowed) {
        return {
          success: false,
          error: `Registration unlock is currently closed for Zone Admins. ${unlockStatus.message}`
        };
      }
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { isAssignmentsConfirmed: false }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/super/zones");
    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to unlock institution team:", error);
    return { success: false, error: error.message || "Failed to unlock institution registration" };
  }
}

export async function lockInstitutionTeam(teamId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { isAssignmentsConfirmed: true }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/super/zones");
    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to lock institution team:", error);
    return { success: false, error: error.message || "Failed to lock institution registration" };
  }
}

