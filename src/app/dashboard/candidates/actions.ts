"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
      
      const isUnlocked = team.registrationUnlocked || team.offStageUnlocked || team.onStageUnlocked;
      
      const now = new Date();
      const start = team.event.registrationStart || team.event.parent?.registrationStart;
      const offEnd = team.event.offStageRegistrationEnd || team.event.parent?.offStageRegistrationEnd;
      const onEnd = team.event.onStageRegistrationEnd || team.event.parent?.onStageRegistrationEnd;
      const generalEnd = team.event.institutionRegistrationEndDate || team.event.registrationEnd || team.event.parent?.institutionRegistrationEndDate || team.event.parent?.registrationEnd;
      const isOffStageOpen = !offEnd || now <= offEnd;
      const isOnStageOpen = (!onEnd || now <= onEnd) && !team.isOnStageConfirmed;
      const isGeneralOpen = !generalEnd || now <= generalEnd;
      const isAnyStageOpen = isOffStageOpen || isOnStageOpen || isGeneralOpen;

      const isBothConfirmed = team.isAssignmentsConfirmed && (team.isOnStageConfirmed || !isOnStageOpen);
      if (isBothConfirmed && !isUnlocked) {
        return { success: false, error: "All registrations are confirmed and locked by the Zone Admin. Contact the Zone Admin to request an edit unlock." };
      }

      if (start && now < start) {
        return { success: false, error: `Registration opens on ${start.toLocaleString()}` };
      }
      if (!isUnlocked && !isAnyStageOpen) {
        return { success: false, error: "Registration deadlines for Off-Stage and On-Stage programs have passed. Please contact your Zone Admin." };
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
        include: { event: true }
      }) : null;
      if (team && team.isAssignmentsConfirmed) {
        return { success: false, error: "Registration is confirmed and locked by the Zone Admin. Contact the Zone Admin to request an edit unlock." };
      }
      if (team && team.event.registrationEnd && new Date() > team.event.registrationEnd) {
        return { success: false, error: "Registration deadline has passed. Cannot edit candidate." };
      }
      
      if (candidate.isApproved && data.isApproved !== false) {
        return { success: false, error: "Cannot edit an approved candidate" };
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
        const isUnlocked = team.registrationUnlocked || team.offStageUnlocked || team.onStageUnlocked;
        const now = new Date();
        const offEnd = team.event.offStageRegistrationEnd || team.event.parent?.offStageRegistrationEnd;
        const onEnd = team.event.onStageRegistrationEnd || team.event.parent?.onStageRegistrationEnd;
        const generalEnd = team.event.institutionRegistrationEndDate || team.event.registrationEnd || team.event.parent?.institutionRegistrationEndDate || team.event.parent?.registrationEnd;
        const isOffStageOpen = !offEnd || now <= offEnd;
        const isOnStageOpen = (!onEnd || now <= onEnd) && !team.isOnStageConfirmed;
        const isGeneralOpen = !generalEnd || now <= generalEnd;
        const isAnyStageOpen = isOffStageOpen || isOnStageOpen || isGeneralOpen;

        const isBothConfirmed = team.isAssignmentsConfirmed && (team.isOnStageConfirmed || !isOnStageOpen);
        if (isBothConfirmed && !isUnlocked) {
          return { success: false, error: "All registrations are confirmed and locked by the Zone Admin. Contact the Zone Admin to request an edit unlock." };
        }
        if (!isUnlocked && !isAnyStageOpen) {
          return { success: false, error: "Registration deadline has passed. Cannot delete candidate." };
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
