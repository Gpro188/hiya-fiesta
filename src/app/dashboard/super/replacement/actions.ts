"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { approveCandidate } from "@/app/dashboard/candidates/actions";

// ── Get all zones that have active events ─────────────────────────────────
// ── Get all zones that have active events ─────────────────────────────────
export async function getZonesWithEvents() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized", zones: [] };
    }

    const zones = await prisma.zone.findMany({
      include: {
        events: {
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

    // Get all teams in this zone
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { event: { zoneId } },
          { institution: { zoneId } }
        ]
      },
      include: {
        institution: { select: { id: true, name: true, place: true, code: true } },
        event: { select: { id: true, name: true } }
      },
      orderBy: { name: "asc" }
    });

    const instList = teams.map(t => ({
      id: t.institution?.id || t.id,
      name: t.institution?.name || t.name,
      place: t.institution?.place || null,
      teamId: t.id,
      eventId: t.eventId,
      prefixCode: t.prefixCode,
      isMagazineParticipating: t.isMagazineParticipating,
      magazineCode: t.magazineCode
    }));

    return { success: true, institutions: instList.sort((a, b) => a.name.localeCompare(b.name)) };
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

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: { include: { zone: true, parent: true } },
        institution: {
          include: {
            zone: true,
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

    if (!team) return { success: false, error: "Team not found", programs: [] };

    // Get all candidate assignments for this team across any event (State or Zone)
    const teamAssignments = await prisma.programAssignment.findMany({
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
        },
        program: {
          include: { category: true }
        }
      }
    });

    // Map assignments by programCode or name+category
    const assignmentsByProgKey = new Map<string, typeof teamAssignments>();
    for (const a of teamAssignments) {
      const codeKey = a.program.programCode ? `code_${a.program.programCode.trim()}` : null;
      const catName = a.program.category?.name?.trim().toUpperCase() || 'GENERAL';
      const nameKey = `name_${a.program.name.trim().toUpperCase()}_${catName}`;
      
      const keys = [codeKey, nameKey].filter(Boolean) as string[];
      for (const k of keys) {
        if (!assignmentsByProgKey.has(k)) assignmentsByProgKey.set(k, []);
        if (!assignmentsByProgKey.get(k)!.some(existing => existing.candidate.id === a.candidate.id)) {
          assignmentsByProgKey.get(k)!.push(a);
        }
      }
    }

    // Get all official competition programs from state event or zone event
    const targetEventId = team.event.parentId || team.eventId;
    const rawPrograms = await prisma.program.findMany({
      where: {
        OR: [
          { eventId: targetEventId },
          { eventId: team.eventId }
        ],
        type: { not: "BREAK" }
      },
      include: {
        category: { select: { id: true, name: true } }
      },
      orderBy: [{ programCode: "asc" }, { name: "asc" }]
    });

    // Deduplicate programs by programCode or name+category
    const programMap = new Map<string, any>();
    for (const p of rawPrograms) {
      const codeKey = p.programCode ? `code_${p.programCode.trim()}` : null;
      const catName = p.category?.name?.trim().toUpperCase() || 'GENERAL';
      const nameKey = `name_${p.name.trim().toUpperCase()}_${catName}`;
      const primaryKey = codeKey || nameKey;

      if (!programMap.has(primaryKey)) {
        const matchedAssignments = (codeKey && assignmentsByProgKey.get(codeKey)) || assignmentsByProgKey.get(nameKey) || [];
        programMap.set(primaryKey, {
          ...p,
          assignments: matchedAssignments
        });
      }
    }

    const programs = Array.from(programMap.values());

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

// ── Super Admin Toggle Magazine (#43) Participation ──────────────────────
export async function superAdminToggleMagazine(teamId: string, participating: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized — only Super Admin can execute this action" };
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: { include: { zone: true } },
        institution: true
      }
    });

    if (!team) return { success: false, error: "Team not found" };

    let magazineCode = team.magazineCode;
    if (participating && !magazineCode) {
      // Find or generate next magazine code for this zone
      const targetZoneId = team.institution?.zoneId || team.event?.zoneId;
      const zoneFilter = targetZoneId
        ? [{ institution: { zoneId: targetZoneId } }, { event: { zoneId: targetZoneId } }]
        : [];

      const existingTeamsWithCodes = await prisma.team.findMany({
        where: {
          ...(zoneFilter.length > 0 ? { OR: zoneFilter } : {}),
          magazineCode: { not: null }
        },
        select: { magazineCode: true }
      });

      const usedNums = existingTeamsWithCodes
        .map(t => {
          const match = t.magazineCode?.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(n => n > 0);

      const nextNum = usedNums.length > 0 ? Math.max(...usedNums) + 1 : 1;
      magazineCode = `MAG-${String(nextNum).padStart(2, "0")}`;
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        isMagazineParticipating: participating,
        magazineCode: participating ? magazineCode : team.magazineCode
      }
    });

    // Audit log
    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Super Admin",
        action: participating ? "SUPER_ADMIN_ENROLL_MAGAZINE" : "SUPER_ADMIN_WITHDRAW_MAGAZINE",
        entityType: "TEAM",
        entityId: teamId,
        reason: `Super Admin ${participating ? "enrolled" : "withdrew"} ${team.name} (${team.event?.zone?.name || "Zone"}) ${participating ? `for Magazine with Code ${magazineCode}` : "from Magazine"}.`
      }
    }).catch(() => {});

    revalidatePath("/dashboard/super/replacement");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/reports");
    revalidatePath("/print/zonal-offstage-valuation");
    revalidatePath("/print/institution-state-selected");

    return { success: true, team: updated };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to update magazine registration" };
  }
}

// ── Super Admin Assign Existing Candidate to Program ─────────────────────
export async function superAdminAssignExistingCandidate(data: {
  candidateId: string;
  programId: string;
  reason?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: data.candidateId },
      include: {
        team: { include: { event: { include: { zone: true } } } },
        programs: true
      }
    });

    if (!candidate) return { success: false, error: "Candidate not found" };

    const program = await prisma.program.findUnique({
      where: { id: data.programId }
    });

    if (!program) return { success: false, error: "Program not found" };

    // Resolve canonical programId if master exists
    let actualProgramId = data.programId;
    if (program.programCode) {
      const masterProg = await prisma.program.findFirst({
        where: {
          programCode: program.programCode,
          event: {
            OR: [
              { parentId: null },
              { type: "STATE" }
            ]
          }
        },
        select: { id: true }
      });
      if (masterProg) {
        actualProgramId = masterProg.id;
      }
    }

    // Check if already assigned
    const alreadyAssigned = candidate.programs.some(
      p => p.programId === actualProgramId || (program.programCode && p.programId === program.id)
    );
    if (alreadyAssigned) {
      return { success: false, error: "Candidate is already assigned to this program" };
    }

    await prisma.programAssignment.create({
      data: {
        candidateId: candidate.id,
        programId: actualProgramId
      }
    });

    // Audit log
    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Super Admin",
        action: "SUPER_ADMIN_ASSIGN_CANDIDATE",
        entityType: "CANDIDATE",
        entityId: candidate.id,
        reason: `Super Admin assigned ${candidate.name} (Chest #${candidate.chestNumber || "None"}) to program #${program.programCode || ""} ${program.name}. Reason: ${data.reason || "Manual enrollment"}`
      }
    }).catch(() => {});

    revalidatePath("/dashboard/super/replacement");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/print/stage-manager");
    revalidatePath("/print/tabulation");

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to assign candidate" };
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

          // Before assigning: delete any pre-existing duplicate for this candidate+program
          await tx.programAssignment.deleteMany({
            where: {
              candidateId,
              programId: data.programId,
              id: { not: data.programAssignmentId || undefined }
            }
          });
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

      // Before assigning: delete any pre-existing duplicate for this candidate+program
      await tx.programAssignment.deleteMany({
        where: {
          candidateId,
          programId: data.programId,
          id: { not: data.programAssignmentId || undefined }
        }
      });
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
