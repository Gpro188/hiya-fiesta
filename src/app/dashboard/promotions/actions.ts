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
      include: { candidate: true, team: true, program: { include: { event: true } } }
    });

    if (!result || !result.program.event.parentId) {
      return { success: false, error: "Result not found or not from a Zone Event." };
    }

    // Check if state confirm deadline has passed for Zone Admins
    if (session.user.role === "ZONE_ADMIN") {
      const parentEvent = await prisma.event.findUnique({ where: { id: result.program.event.parentId } });
      if (parentEvent?.stateConfirmEndDate && new Date() > parentEvent.stateConfirmEndDate) {
        return { success: false, error: "State confirmation deadline has passed. Please contact Admin to make changes." };
      }
    }

    // Remove any existing promotions for this master program from this zone
    // This is complex because we only want to remove candidates from the SAME zone.
    // Easiest way: Find all candidates in the master program that belong to this zone's teams.
    const existingAssignments = await prisma.programAssignment.findMany({
      where: {
        programId: masterProgramId,
        candidate: {
          team: {
            eventId: result.program.eventId
          }
        }
      }
    });

    if (existingAssignments.length > 0) {
      await prisma.programAssignment.deleteMany({
        where: {
          id: { in: existingAssignments.map(a => a.id) }
        }
      });
    }

    // Assign the new candidate to the Master Program
    if (result.candidateId) {
      await prisma.programAssignment.create({
        data: {
          candidateId: result.candidateId,
          programId: masterProgramId
        }
      });
      await prisma.candidate.update({
        where: { id: result.candidateId },
        data: { isStateQualified: true }
      });
    }

    revalidatePath("/dashboard/promotions");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to promote:", error);
    return { success: false, error: error.message || "Failed to promote to state" };
  }
}
