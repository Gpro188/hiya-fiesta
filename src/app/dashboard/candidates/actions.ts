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

    const teamCandidates = (candidate.team.candidates || [])
      .filter(c => c.id !== candidate.id)
      .map(c => ({
        id: c.id,
        name: c.name,
        uid: c.uid,
        chestNumber: c.chestNumber,
      }));

    return {
      success: true,
      candidate,
      availableStudents,
      teamCandidates,
    };
  } catch (error: any) {
    console.error("getReplacementCandidateDetails error:", error);
    return { success: false, error: error.message || "Failed to get candidate details" };
  }
}

export interface ProgramAssignmentReplacementItem {
  programAssignmentId: string;
  programId: string;
  programName?: string;
  action: "PRIMARY_CANDIDATE" | "EXISTING_CANDIDATE" | "NEW_OR_DIRECTORY_STUDENT";
  studentUid?: string;
  studentName?: string;
  studentPhoto?: string;
  existingCandidateId?: string;
}

export async function directProgramWiseCandidateReplacement(data: {
  candidateId: string;
  primaryReplacement: {
    studentUid?: string;
    studentName: string;
    studentPhoto?: string;
  };
  programAssignments: ProgramAssignmentReplacementItem[];
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
        category: true,
        team: {
          include: {
            institution: true,
            event: { include: { zone: true } },
            candidates: { select: { id: true, uid: true, name: true, chestNumber: true } }
          }
        },
        programs: { include: { program: true } }
      }
    });

    if (!candidate) return { success: false, error: "Candidate not found" };

    const primaryName = data.primaryReplacement.studentName.trim();
    const primaryUid = data.primaryReplacement.studentUid ? data.primaryReplacement.studentUid.trim().toUpperCase() : null;

    if (!primaryName) {
      return { success: false, error: "Primary replacement candidate name is required." };
    }

    const oldName = candidate.name;
    const oldUid = candidate.uid;
    const originalChestNumber = candidate.chestNumber;
    const teamName = candidate.team.name;
    const zoneName = candidate.team.event?.zone?.name || "Zone";

    const changesSummary: string[] = [];

    await prisma.$transaction(async (tx) => {
      // 1. Update candidate with primary replacement info (keeps chestNumber)
      await tx.candidate.update({
        where: { id: data.candidateId },
        data: {
          name: primaryName,
          uid: primaryUid,
          ...(data.primaryReplacement.studentPhoto ? { photo: data.primaryReplacement.studentPhoto, photoUrl: data.primaryReplacement.studentPhoto } : {}),
          isApproved: true,
        }
      });

      // Prepare chest number allocation pool if new candidate needs to be created
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
        .map(c => parseInt(c.chestNumber!, 10))
        .filter(n => !isNaN(n) && n >= baseOffset);

      let nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : baseOffset + 1;

      const allUsed = await tx.candidate.findMany({
        where: { chestNumber: { not: null } },
        select: { chestNumber: true }
      });
      const usedSet = new Set(allUsed.map(c => c.chestNumber!).filter(Boolean));

      const allocateNextChestNumber = () => {
        let candidateNum = nextNum.toString();
        while (usedSet.has(candidateNum)) {
          nextNum++;
          candidateNum = nextNum.toString();
        }
        usedSet.add(candidateNum);
        nextNum++;
        return candidateNum;
      };

      // 2. Process each program assignment
      for (const item of data.programAssignments) {
        const progName = item.programName || "Program";

        if (item.action === "PRIMARY_CANDIDATE") {
          // Stays with primary candidate (who now has primaryName and originalChestNumber)
          changesSummary.push(`[${progName}] assigned to primary candidate ${primaryName} (Chest #${originalChestNumber || 'None'})`);
        } else if (item.action === "EXISTING_CANDIDATE" && item.existingCandidateId) {
          // Reassign to another candidate already in the team
          const targetCand = candidate.team.candidates.find(c => c.id === item.existingCandidateId);
          await tx.programAssignment.update({
            where: { id: item.programAssignmentId },
            data: { candidateId: item.existingCandidateId }
          });
          changesSummary.push(`[${progName}] transferred to existing candidate ${targetCand?.name || 'Candidate'} (Chest #${targetCand?.chestNumber || 'None'})`);
        } else if (item.action === "NEW_OR_DIRECTORY_STUDENT") {
          const sName = (item.studentName || "").trim();
          const sUid = item.studentUid ? item.studentUid.trim().toUpperCase() : null;

          if (!sName) {
            throw new Error(`Replacement name is missing for program "${progName}"`);
          }

          // Check if candidate with this UID already exists in the team
          let targetCandidateId: string | null = null;
          let targetChestNumber: string | null = null;

          if (sUid) {
            const existingInTeam = await tx.candidate.findFirst({
              where: {
                teamId: candidate.teamId,
                uid: sUid
              }
            });
            if (existingInTeam) {
              targetCandidateId = existingInTeam.id;
              targetChestNumber = existingInTeam.chestNumber;
            }
          }

          if (!targetCandidateId) {
            // Create a brand new candidate in the team with next chest number
            const allocatedChest = allocateNextChestNumber();
            const created = await tx.candidate.create({
              data: {
                name: sName,
                uid: sUid,
                photo: item.studentPhoto || null,
                photoUrl: item.studentPhoto || null,
                teamId: candidate.teamId,
                categoryId: candidate.categoryId,
                institutionId: candidate.institutionId || candidate.team.institutionId,
                isApproved: true,
                chestNumber: allocatedChest
              }
            });
            targetCandidateId = created.id;
            targetChestNumber = allocatedChest;
          }

          // Move the program assignment to the target candidate
          await tx.programAssignment.update({
            where: { id: item.programAssignmentId },
            data: { candidateId: targetCandidateId }
          });

          changesSummary.push(`[${progName}] assigned to ${sName}${sUid ? ` (${sUid})` : ''} (Chest #${targetChestNumber || 'None'})`);
        }
      }
    });

    const auditReason = `Super Admin Program-Wise Replacement in ${teamName} (${zoneName}): Replaced [${oldName}${oldUid ? ` (UID: ${oldUid})` : ''}] (Chest #${originalChestNumber || 'None'}). Breakdown: ${changesSummary.join("; ")}. Reason: ${data.reason || 'Program-wise direct replacement'}`;

    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Super Admin",
        action: "SUPER_ADMIN_PROGRAM_WISE_CANDIDATE_REPLACEMENT",
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
    revalidatePath("/print/programs");

    return {
      success: true,
      oldName,
      primaryName,
      originalChestNumber,
      teamName,
      zoneName,
      changesSummary
    };
  } catch (error: any) {
    console.error("directProgramWiseCandidateReplacement error:", error);
    return { success: false, error: error.message || "Failed to execute program-wise replacement" };
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

export async function removeProgramFromCandidate(data: {
  candidateId: string;
  programAssignmentId: string;
  reason?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized: Super Admin permissions required." };
    }

    const assignment = await prisma.programAssignment.findUnique({
      where: { id: data.programAssignmentId },
      include: {
        candidate: {
          include: {
            team: {
              include: {
                event: { include: { zone: true } }
              }
            }
          }
        },
        program: true
      }
    });

    if (!assignment || assignment.candidateId !== data.candidateId) {
      return { success: false, error: "Program assignment not found for this candidate." };
    }

    // Delete the program assignment
    await prisma.programAssignment.delete({
      where: { id: data.programAssignmentId }
    });

    // Audit log
    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Super Admin",
        action: "REMOVE_PROGRAM_ASSIGNMENT",
        entityType: "PROGRAM_ASSIGNMENT",
        entityId: data.programAssignmentId,
        reason: `Removed program "${assignment.program.name}" from ${assignment.candidate.name} (Chest #${assignment.candidate.chestNumber || "None"}). Reason: ${data.reason || "Super Admin program removal"}`
      }
    }).catch(err => console.warn("Audit log non-fatal error:", err));

    // Revalidate paths
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/print/id-cards");
    revalidatePath("/print/programs-registration");
    revalidatePath("/print/assignments");

    return {
      success: true,
      programName: assignment.program.name,
      candidateName: assignment.candidate.name,
      chestNumber: assignment.candidate.chestNumber,
    };
  } catch (error: any) {
    console.error("removeProgramFromCandidate error:", error);
    return { success: false, error: error.message || "Failed to remove program" };
  }
}

export async function transferProgramToAnotherCandidate(data: {
  fromCandidateId: string;
  programAssignmentId: string;
  targetType: "DIRECTORY_STUDENT" | "EXISTING_CANDIDATE" | "MANUAL_STUDENT";
  studentUid?: string;
  studentName?: string;
  studentPhoto?: string;
  existingCandidateId?: string;
  reason?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized: Super Admin permissions required." };
    }

    const assignment = await prisma.programAssignment.findUnique({
      where: { id: data.programAssignmentId },
      include: {
        candidate: {
          include: {
            category: true,
            team: {
              include: {
                institution: true,
                event: { include: { zone: true } },
                candidates: true
              }
            }
          }
        },
        program: {
          include: {
            category: true
          }
        }
      }
    });

    if (!assignment || assignment.candidateId !== data.fromCandidateId) {
      return { success: false, error: "Program assignment not found for this candidate." };
    }

    const fromCandidate = assignment.candidate;
    const oldChestNumber = fromCandidate.chestNumber || "N/A";
    const oldCandidateName = fromCandidate.name;
    const programName = assignment.program.name;

    const result = await prisma.$transaction(async (tx) => {
      let targetCandidateId: string;
      let targetChestNumber: string | null = null;
      let targetName: string = "";

      if (data.targetType === "EXISTING_CANDIDATE") {
        if (!data.existingCandidateId) {
          throw new Error("Please select an existing candidate.");
        }
        const existing = await tx.candidate.findUnique({
          where: { id: data.existingCandidateId }
        });
        if (!existing) throw new Error("Selected existing candidate not found.");
        
        targetCandidateId = existing.id;
        targetChestNumber = existing.chestNumber;
        targetName = existing.name;

        // Check if already assigned to this program
        const already = await tx.programAssignment.findUnique({
          where: {
            candidateId_programId: {
              candidateId: targetCandidateId,
              programId: assignment.programId
            }
          }
        });
        if (already) {
          throw new Error(`${existing.name} is already assigned to ${programName}.`);
        }
      } else {
        // DIRECTORY_STUDENT or MANUAL_STUDENT
        const name = (data.studentName || "").trim();
        if (!name) throw new Error("Recipient student name is required.");
        targetName = name;
        const uid = data.studentUid ? data.studentUid.trim().toUpperCase() : null;

        // Check if a candidate with this UID already exists in the team
        let matchedCandidate = uid ? await tx.candidate.findFirst({
          where: {
            teamId: fromCandidate.teamId,
            uid: uid
          }
        }) : null;

        if (matchedCandidate) {
          targetCandidateId = matchedCandidate.id;
          targetChestNumber = matchedCandidate.chestNumber;
        } else {
          // Allocate chest number
          const offset = fromCandidate.category.chestNumberOffset || 100;
          const assignedCandidates = await tx.candidate.findMany({
            where: {
              chestNumber: { not: null },
              category: { eventId: fromCandidate.category.eventId }
            },
            select: { chestNumber: true }
          });
          const usedChests = new Set(assignedCandidates.map(c => c.chestNumber));
          let currentNum = offset;
          while (usedChests.has(currentNum.toString())) {
            currentNum++;
          }
          targetChestNumber = currentNum.toString();

          const newCandidate = await tx.candidate.create({
            data: {
              name: targetName,
              uid: uid,
              chestNumber: targetChestNumber,
              photo: data.studentPhoto || null,
              photoUrl: data.studentPhoto || null,
              categoryId: fromCandidate.categoryId,
              teamId: fromCandidate.teamId,
              institutionId: fromCandidate.institutionId,
              isApproved: true,
              replacedFromChest: oldChestNumber,
              replacementNote: `Replaced from Chest #${oldChestNumber} (${oldCandidateName}) for program ${programName}. Reason: ${data.reason || "Program Transfer"}`,
            }
          });
          targetCandidateId = newCandidate.id;
        }
      }

      // Delete the assignment from original candidate
      await tx.programAssignment.delete({
        where: { id: assignment.id }
      });

      // Create new assignment for target candidate with replacedFromChest note
      await tx.programAssignment.create({
        data: {
          candidateId: targetCandidateId,
          programId: assignment.programId,
          replacedFromChest: oldChestNumber,
          replacementNote: `Replaced from Chest #${oldChestNumber} (${oldCandidateName})`,
        }
      });

      // Also ensure target candidate has replacedFromChest recorded
      await tx.candidate.update({
        where: { id: targetCandidateId },
        data: {
          replacedFromChest: oldChestNumber,
          replacementNote: `Replaced from Chest #${oldChestNumber} (${oldCandidateName}) for program ${programName}`,
        }
      });

      return {
        targetCandidateId,
        targetName,
        targetChestNumber,
      };
    });

    // Audit log
    await prisma.systemAuditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username || "Super Admin",
        action: "TRANSFER_PROGRAM_ASSIGNMENT",
        entityType: "PROGRAM_ASSIGNMENT",
        entityId: assignment.programId,
        reason: `Transferred "${programName}" from ${oldCandidateName} (Chest #${oldChestNumber}) to ${result.targetName} (Chest #${result.targetChestNumber || "None"}). Reason: ${data.reason || "Program Transfer"}`
      }
    }).catch(err => console.warn("Audit log non-fatal error:", err));

    // Revalidate paths
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/print/id-cards");
    revalidatePath("/print/programs-registration");
    revalidatePath("/print/assignments");

    return {
      success: true,
      programName,
      fromCandidateName: oldCandidateName,
      fromChestNumber: oldChestNumber,
      toCandidateName: result.targetName,
      toChestNumber: result.targetChestNumber,
    };
  } catch (error: any) {
    console.error("transferProgramToAnotherCandidate error:", error);
    return { success: false, error: error.message || "Failed to transfer program" };
  }
}


