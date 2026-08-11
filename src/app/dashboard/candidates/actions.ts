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

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      const fullUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { institutionId: true, eventId: true } });
      institutionId = fullUser?.institutionId;
      const team = institutionId ? await prisma.team.findFirst({
        where: fullUser?.eventId 
          ? { institutionId, eventId: fullUser.eventId }
          : { institutionId },
        include: { event: true }
      }) : null;
      if (!team) return { success: false, error: "Team not found" };
      
      const now = new Date();
      if (team.event.registrationStart && now < team.event.registrationStart) {
        return { success: false, error: `Registration opens on ${team.event.registrationStart.toLocaleString()}` };
      }
      if (team.event.registrationEnd && now > team.event.registrationEnd) {
        return { success: false, error: "Registration deadline has passed. Please contact Admin." };
      }

      // Verify UID belongs to their institution
      if (finalUid) {
         const masterStudent = await prisma.masterStudent.findUnique({
            where: { uid: finalUid }
         });
         if (!masterStudent || masterStudent.institutionId !== institutionId) {
            // Invalid UID or doesn't belong to them
            finalUid = undefined;
         }
      }
    } else {
       // Admins can set any UID
       if (!["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
         finalUid = undefined;
       }
    }

    await prisma.candidate.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        teamId: data.teamId,
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
        include: { event: true }
      }) : null;
      if (team && team.event.registrationEnd && new Date() > team.event.registrationEnd) {
        return { success: false, error: "Registration deadline has passed. Cannot delete candidate." };
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

export async function approveCandidate(id: string, prefixCode: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate || candidate.isApproved) return { success: false, error: "Candidate already approved or not found" };

    await prisma.$transaction(async (tx) => {
      const cat = await tx.category.findUnique({ where: { id: candidate.categoryId } });
      const offset = cat?.chestNumberOffset || 0;

      const existingCandidates = await tx.candidate.findMany({
        where: { teamId: candidate.teamId, categoryId: candidate.categoryId, isApproved: true, chestNumber: { not: null } },
        select: { chestNumber: true }
      });

      let nextSequence = 1;
      
      if (existingCandidates.length > 0) {
        const sequences = existingCandidates
          .map(c => c.chestNumber!)
          .map(cn => {
             const isNum = !isNaN(parseInt(prefixCode)) && /^\d+$/.test(prefixCode);
             if (isNum) {
               return parseInt(cn, 10) - parseInt(prefixCode, 10) - offset;
             }
             const numPart = parseInt(cn.replace(prefixCode, ''), 10);
             return numPart - offset + 1;
          })
          .filter(n => !isNaN(n));
          
        if (sequences.length > 0) {
          nextSequence = Math.max(...sequences) + 1;
        }
      }

      const isNumericPrefix = !isNaN(parseInt(prefixCode)) && /^\d+$/.test(prefixCode);
      let newChestNumber = "";

      if (isNumericPrefix) {
        newChestNumber = (parseInt(prefixCode, 10) + offset + nextSequence).toString();
      } else {
        const finalNum = offset + nextSequence - 1;
        const formattedNum = finalNum.toString().padStart(2, '0');
        newChestNumber = `${prefixCode}${formattedNum}`;
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
    return { success: true };
  } catch (error: any) {
    console.error("Failed to approve candidate:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Approval failed: Chest number collision. Please check prefix codes and category offsets." };
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

    let totalUpdated = 0;

    for (const cat of categories) {
      let counter = cat.chestNumberOffset || 100;
      
      const candidates = await prisma.candidate.findMany({
        where: { categoryId: cat.id, isApproved: true },
        orderBy: [
          { team: { name: 'asc' } },
          { name: 'asc' }
        ]
      });

      for (const cand of candidates) {
        counter++;
        await prisma.candidate.update({
          where: { id: cand.id },
          data: { chestNumber: counter.toString() }
        });
        totalUpdated++;
      }
    }

    revalidatePath("/dashboard/candidates");
    return { success: true, count: totalUpdated };
  } catch (error: any) {
    console.error("Failed to generate chest numbers:", error);
    return { success: false, error: error.message || "Failed to generate chest numbers" };
  }
}
