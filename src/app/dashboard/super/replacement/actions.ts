"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { approveCandidate } from "@/app/dashboard/candidates/actions";

// ── Get all zones that have active events ─────────────────────────────────
export async function getZonesWithEvents() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized", zones: [] };
    }

    const zones = await prisma.zone.findMany({
      where: { events: { some: {} } },
      include: {
        events: {
          where: { parentId: null },
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { name: "asc" }
    });

    return { success: true, zones };
  } catch (e: any) {
    return { success: false, error: e.message, zones: [] };
  }
}

// ── Get institutions in a zone with their event team ─────────────────────
export async function getInstitutionsByZone(zoneId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized", institutions: [] };
    }

    // Get all teams in this zone's events
    const teams = await prisma.team.findMany({
      where: { event: { zoneId, parentId: null } },
      include: {
        institution: { select: { id: true, name: true, place: true } },
        event: { select: { id: true, name: true } }
      },
      orderBy: { name: "asc" }
    });

    // Group by institution
    const instMap: Record<string, { id: string; name: string; place: string | null; teamId: string; eventId: string }> = {};
    for (const t of teams) {
      if (!t.institution) continue;
      if (!instMap[t.institution.id]) {
        instMap[t.institution.id] = {
          id: t.institution.id,
          name: t.institution.name,
          place: t.institution.place || null,
          teamId: t.id,
          eventId: t.event.id
        };
      }
    }

    return { success: true, institutions: Object.values(instMap).sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (e: any) {
    return { success: false, error: e.message, institutions: [] };
  }
}

// ── Get all program assignments for an institution in an event ────────────
export async function getProgramAssignmentsByInstitution(teamId: string, eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized", programs: [] };
    }

    // Get all programs in the event
    const programs = await prisma.program.findMany({
      where: {
        eventId,
        type: { not: "BREAK" }
      },
      include: {
        category: { select: { id: true, name: true } },
        assignments: {
          where: {
            candidate: { teamId }
          },
          include: {
            candidate: {
              select: {
                id: true, name: true, uid: true, chestNumber: true,
                photoUrl: true, photo: true, isApproved: true,
                replacedFromChest: true, replacementNote: true
              }
            }
          }
        }
      },
      orderBy: [{ programCode: "asc" }, { name: "asc" }]
    });

    // Also get unassigned programs (limit is candidateLimitPerTeam)
    // and master students for this institution
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        institution: {
          include: {
            students: {
              select: { id: true, name: true, uid: true, stream: true }
            }
          }
        },
        candidates: {
          select: {
            id: true, name: true, uid: true, chestNumber: true,
            isApproved: true, photoUrl: true, photo: true,
            category: { select: { id: true, name: true } }
          },
          orderBy: { name: "asc" }
        }
      }
    });

    return {
      success: true,
      programs,
      team,
      masterStudents: team?.institution?.students || []
    };
  } catch (e: any) {
    return { success: false, error: e.message, programs: [] };
  }
}

// ── Add a brand new candidate and assign to a program ────────────────────
export async function addAndAssignNewCandidate(data: {
  name: string;
  uid?: string;
  photo?: string;
  teamId: string;
  categoryId: string;
  programId: string;
  programAssignmentId?: string; // if replacing existing assignment
  fromCandidateId?: string;
  reason?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const name = data.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const team = await prisma.team.findUnique({
      where: { id: data.teamId },
      include: {
        event: { include: { zone: true } },
        institution: true
      }
    });
    if (!team) return { success: false, error: "Team not found" };

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true, name: true, chestNumberOffset: true }
    });
    if (!category) return { success: false, error: "Category not found" };

    const uid = data.uid ? data.uid.trim().toUpperCase() : null;

    let candidateId: string;
    let chestNumber: string | null = null;

    await prisma.$transaction(async (tx) => {
      // Check if candidate with this UID already exists in team
      if (uid) {
        const existing = await tx.candidate.findFirst({
          where: { teamId: data.teamId, uid }
        });
        if (existing) {
          // Reuse existing candidate
          candidateId = existing.id;
          chestNumber = existing.chestNumber;

          // Assign to program
          if (data.programAssignmentId) {
            await tx.programAssignment.update({
              where: { id: data.programAssignmentId },
              data: { candidateId }
            });
          } else {
            await tx.programAssignment.create({
              data: { candidateId, programId: data.programId }
            });
          }
          return;
        }
      }

      // Generate chest number
      const baseOffset = (category.chestNumberOffset && category.chestNumberOffset > 0)
        ? category.chestNumberOffset : 100;

      const existingInCategory = await tx.candidate.findMany({
        where: {
          categoryId: data.categoryId,
          chestNumber: { not: null },
          team: { eventId: team.eventId }
        },
        select: { chestNumber: true }
      });

      const usedNums = existingInCategory
        .map(c => parseInt(c.chestNumber!, 10))
        .filter(n => !isNaN(n));

      const allUsed = await tx.candidate.findMany({
        where: { chestNumber: { not: null } },
        select: { chestNumber: true }
      });
      const usedSet = new Set(allUsed.map(c => c.chestNumber!));

      let nextNum = usedNums.length > 0 ? Math.max(...usedNums) + 1 : baseOffset + 1;
      let newChest = nextNum.toString();
      while (usedSet.has(newChest)) {
        nextNum++;
        newChest = nextNum.toString();
      }
      chestNumber = newChest;

      // Create the candidate
      const instId = team.institutionId || null;
      const created = await tx.candidate.create({
        data: {
          name,
          uid,
          photo: data.photo || null,
          photoUrl: data.photo || null,
          teamId: data.teamId,
          categoryId: data.categoryId,
          institutionId: instId,
          isApproved: true,
          chestNumber: newChest,
          replacedFromChest: data.fromCandidateId ? undefined : undefined,
          replacementNote: data.reason || null
        }
      });
      candidateId = created.id;

      // Assign to program (replace or create)
      if (data.programAssignmentId) {
        await tx.programAssignment.update({
          where: { id: data.programAssignmentId },
          data: { candidateId }
        });
      } else {
        await tx.programAssignment.create({
          data: { candidateId, programId: data.programId }
        });
      }
    });

    // Audit log
    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Super Admin",
        action: "ZONAL_REPLACEMENT_ADD_CANDIDATE",
        entityType: "CANDIDATE",
        entityId: candidateId!,
        reason: `Zonal replacement: Added ${name}${uid ? ` (UID: ${uid})` : ''} to ${team.name} (${team.event?.zone?.name || "Zone"}) with Chest #${chestNumber}. Reason: ${data.reason || "Super Admin zonal replacement"}`
      }
    }).catch(() => {});

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/print/stage-manager");
    revalidatePath("/print/tabulation");
    revalidatePath("/print/assignments");
    revalidatePath("/print/chest-numbers");
    revalidatePath("/print/id-cards");
    revalidatePath("/dashboard/super/replacement");

    return { success: true, candidateId: candidateId!, chestNumber, name };
  } catch (e: any) {
    console.error("addAndAssignNewCandidate error:", e);
    return { success: false, error: e.message || "Failed to add candidate" };
  }
}

// ── Transfer a program assignment to an existing candidate ─────────────
export async function zonalTransferProgram(data: {
  programAssignmentId: string;
  fromCandidateId: string;
  toCandidateId: string;
  reason?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const assignment = await prisma.programAssignment.findUnique({
      where: { id: data.programAssignmentId },
      include: {
        program: true,
        candidate: { include: { team: { include: { event: { include: { zone: true } } } } } }
      }
    });
    if (!assignment) return { success: false, error: "Assignment not found" };

    // Check target isn't already assigned
    const already = await prisma.programAssignment.findUnique({
      where: { candidateId_programId: { candidateId: data.toCandidateId, programId: assignment.programId } }
    });
    if (already) return { success: false, error: "Target candidate is already assigned to this program" };

    await prisma.programAssignment.update({
      where: { id: data.programAssignmentId },
      data: { candidateId: data.toCandidateId }
    });

    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Super Admin",
        action: "ZONAL_REPLACEMENT_TRANSFER",
        entityType: "PROGRAM_ASSIGNMENT",
        entityId: data.programAssignmentId,
        reason: `Zonal: Transferred program "${assignment.program.name}" from candidate ${assignment.candidate.name} to another. Reason: ${data.reason || "Zonal replacement"}`
      }
    }).catch(() => {});

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/print/stage-manager");
    revalidatePath("/print/tabulation");
    revalidatePath("/print/assignments");
    revalidatePath("/dashboard/super/replacement");

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to transfer" };
  }
}
