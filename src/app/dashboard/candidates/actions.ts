"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getRegistrationLockStatus } from "@/lib/registrationLockUtils";

export async function addCandidate(data: { name: string, categoryId: string, teamId: string, photo?: string, uid?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    if (session.user.role === "ZONE_ADMIN") {
      return { success: false, error: "Zone Admins cannot manage candidates directly." };
    }

    let finalUid = data.uid;
    let institutionId = null;
    let teamInstitutionId: string | null = null;

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      const fullUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { institutionId: true, eventId: true } });
      institutionId = fullUser?.institutionId;
      const team = institutionId ? await prisma.team.findFirst({
        where: fullUser?.eventId 
          ? { institutionId, eventId: fullUser.eventId }
          : { institutionId },
        include: { event: { include: { parent: true } } }
      }) : null;
      if (!team) return { success: false, error: "Team not found" };
      teamInstitutionId = team.institutionId;
      
      const teamCandidatesForLock = await prisma.candidate.findMany({
        where: { teamId: team.id },
        select: {
          id: true,
          chestNumber: true,
          programs: {
            select: { program: { select: { stageType: true } } }
          }
        }
      });

      const lockStatus = getRegistrationLockStatus(team, null, teamCandidatesForLock, false);

      if (!lockStatus.isCandidateRegistrationOpen) {
        return { success: false, error: lockStatus.statusMessage || "Registration is currently locked. Contact your Zone Admin." };
      }

      // Verify UID belongs to their institution
      if (finalUid) {
         const masterStudent = await prisma.masterStudent.findFirst({
            where: { 
              uid: { equals: finalUid, mode: "insensitive" },
              ...(institutionId ? { institutionId } : {})
            },
            include: { institution: { select: { name: true } } }
         });
         if (!masterStudent) {
            const otherInstStudent = await prisma.masterStudent.findFirst({
               where: { uid: { equals: finalUid, mode: "insensitive" } },
               include: { institution: { select: { name: true } } }
            });
            if (otherInstStudent) {
               return { 
                  success: false, 
                  error: `This student (${finalUid} - ${otherInstStudent.name}) is registered under "${otherInstStudent.institution?.name}". If there is an issue in the institution portal (admission or promotion procedure not completed for this student), please contact the IT Cell of CSWC.` 
               };
            }
            return { 
               success: false, 
               error: "Student UID not found in institution directory. If there is an issue in the institution portal (admission or promotion procedure not completed for this student), please contact the IT Cell of CSWC." 
            };
         }
      }
    } else {
       // Admins can set any UID
       if (!["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
         finalUid = undefined;
       }
       const targetTeam = await prisma.team.findUnique({
         where: { id: data.teamId },
         select: { institutionId: true }
       });
       teamInstitutionId = targetTeam?.institutionId || null;
    }

    // BLOCK DUPLICATE: Check if student with same UID is already registered in this team
    if (finalUid) {
      const existingByUid = await prisma.candidate.findFirst({
        where: {
          teamId: data.teamId,
          uid: finalUid
        }
      });
      if (existingByUid) {
        return { success: false, error: `Duplicate registration: Student (${existingByUid.name} - UID: ${finalUid}) is already added to candidates!` };
      }
    } else {
      // Only block duplicate candidate name if NO UID is provided (manual candidate entry without UID)
      const existingByName = await prisma.candidate.findFirst({
        where: {
          teamId: data.teamId,
          name: { equals: data.name.trim(), mode: "insensitive" },
          uid: null
        }
      });
      if (existingByName) {
        return { success: false, error: `Duplicate registration: Candidate "${data.name.trim()}" without UID is already registered in this team!` };
      }
    }

    await prisma.candidate.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        teamId: data.teamId,
        institutionId: teamInstitutionId || institutionId || null,
        photoUrl: data.photo,
        uid: finalUid || null,
        isApproved: false,
        chestNumber: null
      }
    });

    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add candidate:", error);
    
    if (error.code === 'P2002') {
      return { success: false, error: "A unique constraint failed. This candidate or chest number might already exist." };
    }
    if (error.code === 'P2003') {
      return { success: false, error: "Foreign key constraint failed. Please check if the category or team exists." };
    }
    
    return { success: false, error: error.message || "Failed to add candidate. Please check all fields." };
  }
}

export async function updateCandidate(id: string, data: { name: string, categoryId: string, photo?: string, chestNumber?: string | null, isApproved?: boolean }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) return { success: false, error: "Candidate not found" };

    if (session.user.role === "ZONE_ADMIN") {
      return { success: false, error: "Zone Admins cannot manage candidates directly." };
    }

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      const fullUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { institutionId: true, eventId: true } });
      const team = fullUser?.institutionId ? await prisma.team.findFirst({
        where: fullUser.eventId 
          ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
          : { institutionId: fullUser.institutionId },
        include: { event: { include: { parent: true } } }
      }) : null;

      if (team) {
        const teamCandidatesForLock = await prisma.candidate.findMany({
          where: { teamId: team.id },
          select: {
            id: true,
            chestNumber: true,
            programs: {
              select: { program: { select: { stageType: true } } }
            }
          }
        });

        const lockStatus = getRegistrationLockStatus(team, null, teamCandidatesForLock, false);

        if (!lockStatus.isCandidateRegistrationOpen) {
          return {
            success: false,
            error: lockStatus.statusMessage || "Registration is locked. Contact your Zone Admin or Super Admin to request an unlock."
          };
        }
      }
    }

    await prisma.candidate.update({
      where: { id },
      data: {
        name: data.name,
        categoryId: data.categoryId,
        photo: data.photo,
        chestNumber: data.chestNumber,
        isApproved: data.isApproved ?? candidate.isApproved,
      }
    });

    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update candidate:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "A unique constraint failed. Chest number might be already taken." };
    }
    return { success: false, error: error.message || "Failed to update candidate" };
  }
}

export async function deleteCandidate(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) return { success: false, error: "Candidate not found" };

    if (session.user.role === "ZONE_ADMIN") {
      return { success: false, error: "Zone Admins cannot manage candidates directly." };
    }

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      const fullUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { institutionId: true, eventId: true } });
      const team = fullUser?.institutionId ? await prisma.team.findFirst({
        where: fullUser.eventId 
          ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
          : { institutionId: fullUser.institutionId },
        include: { event: { include: { parent: true } } }
      }) : null;
      if (team) {
        const teamCandidatesForLock = await prisma.candidate.findMany({
          where: { teamId: team.id },
          select: {
            id: true,
            chestNumber: true,
            programs: {
              select: { program: { select: { stageType: true } } }
            }
          }
        });

        const lockStatus = getRegistrationLockStatus(team, null, teamCandidatesForLock, false);

        if (!lockStatus.isCandidateRegistrationOpen) {
          return { success: false, error: lockStatus.statusMessage || "Registration is closed. Cannot delete candidate." };
        }
      }

      if (candidate.isApproved) {
        return { success: false, error: "Cannot delete an approved candidate" };
      }
    }

    await prisma.candidate.delete({ where: { id } });

    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete candidate:", error);
    return { success: false, error: "Failed to delete candidate" };
  }
}

export async function approveCandidate(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const candidate = await prisma.candidate.findUnique({ 
      where: { id },
      include: { team: true, category: true }
    });
    if (!candidate) return { success: false, error: "Candidate not found" };
    if (candidate.isApproved && candidate.chestNumber) return { success: true };

    await prisma.$transaction(async (tx) => {
      const baseOffset = (candidate.category?.chestNumberOffset && candidate.category.chestNumberOffset > 0)
        ? candidate.category.chestNumberOffset
        : 100;

      const existingCandidates = await tx.candidate.findMany({
        where: {
          categoryId: candidate.categoryId,
          chestNumber: { not: null },
          team: { eventId: candidate.team.eventId }
        },
        select: { id: true, chestNumber: true }
      });

      const existingNumbers = existingCandidates
        .filter(c => c.id !== candidate.id)
        .map(c => parseInt(c.chestNumber!, 10))
        .filter(n => !isNaN(n) && n >= baseOffset);

      let nextNum = existingNumbers.length > 0 
        ? Math.max(...existingNumbers) + 1 
        : baseOffset + 1;

      const allUsed = await tx.candidate.findMany({
        where: { chestNumber: { not: null } },
        select: { chestNumber: true }
      });
      const usedSet = new Set(allUsed.map(c => c.chestNumber!).filter(Boolean));

      let newChestNumber = nextNum.toString();
      while (usedSet.has(newChestNumber)) {
        nextNum++;
        newChestNumber = nextNum.toString();
      }

      await tx.candidate.update({
        where: { id },
        data: {
          isApproved: true,
          chestNumber: newChestNumber
        }
      });
    });

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to approve candidate:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Approval failed: Chest number collision. Please try again." };
    }
    return { success: false, error: error.message || "Failed to approve candidate" };
  }
}

export async function bulkImportCandidates(candidatesList: Array<{ name: string, teamId: string, categoryId: string, chestNumber?: string }>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Unauthorized" };

    let count = 0;
    for (const c of candidatesList) {
      if (!c.name || !c.teamId || !c.categoryId) continue;

      await prisma.candidate.create({
        data: {
          name: c.name,
          teamId: c.teamId,
          categoryId: c.categoryId,
          chestNumber: c.chestNumber || null,
          isApproved: true,
        }
      });
      count++;
    }

    revalidatePath("/dashboard/candidates");
    return { success: true, count };
  } catch (error: any) {
    console.error("Failed to bulk import candidates:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Duplicate chest number or candidate constraint failed during import." };
    }
    return { success: false, error: error.message || "Failed to import candidates" };
  }
}

export async function generateChestNumbers(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const categories = await prisma.category.findMany({
      where: { eventId },
      orderBy: { name: 'asc' }
    });

    const allUsed = await prisma.candidate.findMany({
      where: { chestNumber: { not: null }, team: { NOT: { eventId } } },
      select: { chestNumber: true }
    });
    const globalUsedNumbers = new Set<string>(
      allUsed.map(c => c.chestNumber!).filter(Boolean)
    );

    let totalUpdated = 0;

    await prisma.$transaction(async (tx) => {
      for (const cat of categories) {
        const baseOffset = (cat.chestNumberOffset && cat.chestNumberOffset > 0)
          ? cat.chestNumberOffset
          : 100;
        let counter = baseOffset;

        // Group by team and then name so each institution's students have consecutive near numbers
        const candidates = await tx.candidate.findMany({
          where: { 
            categoryId: cat.id, 
            team: { eventId },
            programs: { some: {} } // candidates with assigned programs
          },
          include: { team: true },
          orderBy: [
            { team: { name: 'asc' } },
            { name: 'asc' }
          ]
        });

        for (const cand of candidates) {
          counter++;
          let newChest = counter.toString();
          while (globalUsedNumbers.has(newChest)) {
            counter++;
            newChest = counter.toString();
          }
          globalUsedNumbers.add(newChest);

          await tx.candidate.update({
            where: { id: cand.id },
            data: { 
              chestNumber: newChest,
              isApproved: true
            }
          });
          totalUpdated++;
        }
      }
    });

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/assignments");
    return { success: true, count: totalUpdated };
  } catch (error: any) {
    console.error("Failed to generate chest numbers:", error);
    return { success: false, error: error.message || "Failed to generate chest numbers" };
  }
}

export async function searchCandidatesForReplacement(query: string, zoneId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, candidates: [], error: "Unauthorized" };
    }

    const q = query.trim();
    const where: any = {};

    if (zoneId && zoneId !== "ALL") {
      where.team = {
        event: { zoneId }
      };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { uid: { contains: q, mode: "insensitive" } },
        { chestNumber: { contains: q, mode: "insensitive" } },
        { team: { name: { contains: q, mode: "insensitive" } } },
        { team: { prefixCode: { contains: q, mode: "insensitive" } } },
        { team: { institution: { name: { contains: q, mode: "insensitive" } } } },
        { team: { institution: { code: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const candidates = await prisma.candidate.findMany({
      where,
      select: {
        id: true,
        name: true,
        uid: true,
        chestNumber: true,
        photo: true,
        photoUrl: true,
        isApproved: true,
        category: { select: { id: true, name: true } },
        team: {
          select: {
            id: true,
            name: true,
            prefixCode: true,
            institutionId: true,
            institution: { select: { id: true, name: true, code: true, place: true } },
            event: {
              select: {
                id: true,
                name: true,
                zone: { select: { id: true, name: true, code: true } }
              }
            }
          }
        },
        programs: {
          select: {
            id: true,
            program: {
              select: { id: true, name: true, stageType: true, programCode: true }
            }
          }
        }
      },
      take: 60,
      orderBy: { name: "asc" }
    });

    return { success: true, candidates };
  } catch (error: any) {
    console.error("searchCandidatesForReplacement error:", error);
    return { success: false, candidates: [], error: error.message || "Failed to search candidates" };
  }
}

export async function getReplacementCandidateDetails(candidateId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        category: true,
        team: {
          include: {
            institution: true,
            event: { include: { zone: true } },
            candidates: {
              select: { id: true, uid: true, name: true, chestNumber: true }
            }
          }
        },
        programs: {
          include: { program: true }
        }
      }
    });

    if (!candidate) return { success: false, error: "Candidate not found" };

    const institutionId = candidate.institutionId || candidate.team.institutionId;

    let availableStudents: any[] = [];
    if (institutionId) {
      const registeredUids = new Set(
        candidate.team.candidates
          .map(c => c.uid?.trim().toUpperCase())
          .filter(Boolean)
      );

      const allMasterStudents = await prisma.masterStudent.findMany({
        where: { institutionId },
        orderBy: { name: "asc" }
      });

      availableStudents = allMasterStudents.filter(
        s => !registeredUids.has(s.uid.trim().toUpperCase()) || s.uid.trim().toUpperCase() === candidate.uid?.trim().toUpperCase()
      );
    }

    return {
      success: true,
      candidate,
      availableStudents,
    };
  } catch (error: any) {
    console.error("getReplacementCandidateDetails error:", error);
    return { success: false, error: error.message || "Failed to get candidate details" };
  }
}

export async function directReplaceCandidate(data: {
  candidateId: string;
  newStudentUid?: string;
  newName: string;
  newPhoto?: string;
  reason?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized: Super Admin permissions required." };
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: data.candidateId },
      include: {
        team: {
          include: {
            institution: true,
            event: { include: { zone: true } },
            candidates: { select: { id: true, uid: true, name: true } }
          }
        },
        programs: { include: { program: true } }
      }
    });

    if (!candidate) return { success: false, error: "Candidate not found" };

    const finalUid = data.newStudentUid ? data.newStudentUid.trim().toUpperCase() : null;
    const finalName = data.newName.trim();

    if (!finalName) {
      return { success: false, error: "Replacement candidate name is required." };
    }

    if (finalUid) {
      const existingInTeam = candidate.team.candidates.find(
        c => c.id !== candidate.id && c.uid?.trim().toUpperCase() === finalUid
      );
      if (existingInTeam) {
        return {
          success: false,
          error: `Student UID ${finalUid} is already registered as candidate "${existingInTeam.name}" in this team.`
        };
      }
    }

    const oldName = candidate.name;
    const oldUid = candidate.uid;
    const chestNumber = candidate.chestNumber;
    const teamName = candidate.team.name;
    const zoneName = candidate.team.event?.zone?.name || "Zone";

    const updated = await prisma.candidate.update({
      where: { id: data.candidateId },
      data: {
        name: finalName,
        uid: finalUid,
        ...(data.newPhoto ? { photo: data.newPhoto, photoUrl: data.newPhoto } : {}),
        isApproved: true,
      }
    });

    const auditReason = `Super Admin direct replacement in ${teamName} (${zoneName}): Replaced [${oldName}${oldUid ? ` (UID: ${oldUid})` : ''}] with [${finalName}${finalUid ? ` (UID: ${finalUid})` : ''}] (Chest #${chestNumber || 'None'}). Reason: ${data.reason || 'Direct Super Admin replacement'}`;

    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Super Admin",
        action: "SUPER_ADMIN_DIRECT_CANDIDATE_REPLACEMENT",
        entityType: "CANDIDATE",
        entityId: candidate.id,
        reason: auditReason
      }
    }).catch(err => console.warn("Audit log non-fatal error:", err));

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/super/zones");
    revalidatePath("/dashboard/teams");
    revalidatePath("/print/id-cards");
    revalidatePath("/print/assignments");
    revalidatePath("/print/chest-numbers");

    return {
      success: true,
      candidate: updated,
      oldName,
      newName: finalName,
      chestNumber,
      teamName,
      zoneName
    };
  } catch (error: any) {
    console.error("directReplaceCandidate error:", error);
    return { success: false, error: error.message || "Failed to replace candidate" };
  }
}

