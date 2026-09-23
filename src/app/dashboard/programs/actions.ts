"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function createProgram(data: { programCode?: string | null, name: string, type: string, categoryId: string | null, eventId: string, candidateLimitPerTeam?: number, duration?: number, durationMode?: string, description?: string | null, evaluationCriteria?: string | null, stageType?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized — only Admin can create programs" };
    }
    await prisma.program.create({
      data: {
        programCode: data.programCode,
        name: data.name,
        type: data.type,
        categoryId: data.categoryId,
        eventId: data.eventId,
        candidateLimitPerTeam: data.candidateLimitPerTeam || 1,
        duration: data.duration || 10,
        durationMode: data.durationMode || "AUTO",
        description: data.description,
        evaluationCriteria: data.evaluationCriteria,
        stageType: data.stageType || "ON_STAGE",
      }
    });

    revalidatePath("/dashboard/programs");
    return { success: true };
  } catch (error) {
    console.error("Failed to create program:", error);
    return { success: false, error: "Failed to create program" };
  }
}

export async function updateProgram(id: string, data: { programCode?: string | null, name: string, type: string, categoryId: string | null, candidateLimitPerTeam?: number, duration?: number, durationMode?: string, description?: string | null, evaluationCriteria?: string | null, stageType?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized — only Admin can edit programs" };
    }
    await prisma.program.update({
      where: { id },
      data: {
        programCode: data.programCode,
        name: data.name,
        type: data.type,
        categoryId: data.categoryId,
        candidateLimitPerTeam: data.candidateLimitPerTeam,
        duration: data.duration,
        durationMode: data.durationMode,
        description: data.description,
        evaluationCriteria: data.evaluationCriteria,
        stageType: data.stageType,
      }
    });

    revalidatePath("/dashboard/programs");
    return { success: true };
  } catch (error) {
    console.error("Failed to update program:", error);
    return { success: false, error: "Failed to update program" };
  }
}

export async function bulkImportPrograms(eventId: string, programs: any[]) {
  try {
    // We do this in a transaction or loop
    // To make it safer, we'll create them one by one or use createMany
    // Note: SQLite doesn't support nested createMany if we were doing that, but here it's flat.
    
    const results = await prisma.program.createMany({
      data: programs.map(p => ({
        programCode: p.programCode?.toString() || null,
        name: p.name,
        type: p.type || "INDIVIDUAL",
        categoryId: p.categoryId,
        eventId: eventId,
        candidateLimitPerTeam: parseInt(p.candidateLimitPerTeam) || 1,
        duration: parseInt(p.duration) || 10,
      }))
    });

    revalidatePath("/dashboard/programs");
    return { success: true, count: results.count };
  } catch (error) {
    console.error("Failed to bulk import programs:", error);
    return { success: false, error: "Failed to import programs. Check your Excel format." };
  }
}

export async function deleteProgram(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized — only Admin can delete programs" };
    }
    await prisma.program.delete({ where: { id } });
    revalidatePath("/dashboard/programs");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete program:", error);
    return { success: false, error: "Failed to delete program" };
  }
}

export async function assignJudgesToProgram(programId: string, judgeIds: string[]) {
  try {
    // We update the program to connect the specified judges (and disconnect all others)
    await prisma.program.update({
      where: { id: programId },
      data: {
        judges: {
          set: judgeIds.map(id => ({ id }))
        }
      }
    });
    
    revalidatePath("/dashboard/programs");
    return { success: true };
  } catch (error) {
    console.error("Failed to assign judges:", error);
    return { success: false, error: "Failed to assign judges" };
  }
}

export async function syncMasterPrograms(targetEventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const masterEvent = await prisma.event.findFirst({
      where: { parentId: null },
      include: { programs: true, categories: true }
    });

    if (!masterEvent) return { success: false, error: "Master Event not found." };
    if (masterEvent.programs.length === 0) return { success: false, error: "No programs found in Master Event to sync." };

    const targetEvent = await prisma.event.findUnique({
      where: { id: targetEventId },
      include: { categories: true, programs: true }
    });
    
    if (!targetEvent) return { success: false, error: "Target Event not found." };

    // Create a map of Master Category Name -> Target Category ID
    // If the target doesn't have the category, we'll have to create it.
    let targetCategoryMap = new Map();
    for (const cat of targetEvent.categories) {
      targetCategoryMap.set(cat.name.toUpperCase(), cat.id);
    }

    // Ensure all master categories exist in target event
    for (const mCat of masterEvent.categories) {
      if (!targetCategoryMap.has(mCat.name.toUpperCase())) {
        const newCat = await prisma.category.create({
          data: {
            name: mCat.name,
            chestNumberOffset: mCat.chestNumberOffset,
            eventId: targetEventId
          }
        });
        targetCategoryMap.set(newCat.name.toUpperCase(), newCat.id);
      }
    }

    // Now copy all programs that don't already exist in the target event (by programCode or name)
    const existingProgramKeys = new Set(targetEvent.programs.map(p => `${p.name}-${p.programCode || ''}`.toUpperCase()));
    const programsToCreate = [];

    for (const mProg of masterEvent.programs) {
      const key = `${mProg.name}-${mProg.programCode || ''}`.toUpperCase();
      if (!existingProgramKeys.has(key)) {
        const mCatName = masterEvent.categories.find(c => c.id === mProg.categoryId)?.name;
        const targetCatId = mCatName ? targetCategoryMap.get(mCatName.toUpperCase()) : null;

        programsToCreate.push({
          programCode: mProg.programCode,
          name: mProg.name,
          type: mProg.type,
          categoryId: targetCatId,
          eventId: targetEventId,
          venue: mProg.venue,
          duration: mProg.duration,
          durationMode: mProg.durationMode || "AUTO",
          description: mProg.description,
          evaluationCriteria: mProg.evaluationCriteria,
          stageType: mProg.stageType,
          candidateLimitPerTeam: mProg.candidateLimitPerTeam
        });
      }
    }

    if (programsToCreate.length > 0) {
      await prisma.program.createMany({
        data: programsToCreate
      });
      revalidatePath("/dashboard/programs");
      return { success: true, count: programsToCreate.length };
    } else {
      return { success: true, count: 0, message: "All Master programs are already synced to this Event." };
    }

  } catch (error: any) {
    console.error("Failed to sync master programs:", error);
    return { success: false, error: error.message || "Failed to sync programs." };
  }
}

export async function pushMasterProgramsToAllZones() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const masterEvent = await prisma.event.findFirst({
      where: { parentId: null },
      include: { programs: true, categories: true }
    });

    if (!masterEvent) return { success: false, error: "Master Event not found." };
    if (masterEvent.programs.length === 0) return { success: false, error: "No programs in Master Event to push." };

    const zones = await prisma.event.findMany({
      where: { parentId: masterEvent.id },
      include: { categories: true, programs: true }
    });

    let totalPushed = 0;

    for (const zone of zones) {
      let zoneCategoryMap = new Map();
      for (const cat of zone.categories) {
        zoneCategoryMap.set(cat.name.toUpperCase(), cat.id);
      }

      for (const mCat of masterEvent.categories) {
        if (!zoneCategoryMap.has(mCat.name.toUpperCase())) {
          const newCat = await prisma.category.create({
            data: {
              name: mCat.name,
              chestNumberOffset: mCat.chestNumberOffset,
              eventId: zone.id
            }
          });
          zoneCategoryMap.set(newCat.name.toUpperCase(), newCat.id);
        }
      }

      const existingProgramKeys = new Set(zone.programs.map(p => `${p.name}-${p.programCode || ''}`.toUpperCase()));
      const programsToCreate = [];

      for (const mProg of masterEvent.programs) {
        const key = `${mProg.name}-${mProg.programCode || ''}`.toUpperCase();
        
        // Find matching category ID in zone
        const mCatName = masterEvent.categories.find(c => c.id === mProg.categoryId)?.name;
        const targetCatId = mCatName ? zoneCategoryMap.get(mCatName.toUpperCase()) : null;

        if (!existingProgramKeys.has(key)) {
          // Create new program in zone
          programsToCreate.push({
            programCode: mProg.programCode,
            name: mProg.name,
            type: mProg.type,
            categoryId: targetCatId,
            eventId: zone.id,
            venue: mProg.venue,
            duration: mProg.duration,
            durationMode: mProg.durationMode || "AUTO",
            description: mProg.description,
            evaluationCriteria: mProg.evaluationCriteria,
            stageType: mProg.stageType,
            candidateLimitPerTeam: mProg.candidateLimitPerTeam
          });
        } else {
          // Update existing program with latest master details
          const existingProgram = zone.programs.find(p => `${p.name}-${p.programCode || ''}`.toUpperCase() === key);
          if (existingProgram) {
            await prisma.program.update({
              where: { id: existingProgram.id },
              data: {
                type: mProg.type,
                categoryId: targetCatId,
                duration: mProg.duration,
                durationMode: mProg.durationMode || "AUTO",
                description: mProg.description,
                evaluationCriteria: mProg.evaluationCriteria,
                stageType: mProg.stageType,
                candidateLimitPerTeam: mProg.candidateLimitPerTeam
              }
            });
          }
        }
      }

      if (programsToCreate.length > 0) {
        await prisma.program.createMany({ data: programsToCreate });
        totalPushed += programsToCreate.length;
      }
    }

    revalidatePath("/dashboard/programs");
    return { success: true, count: totalPushed };

  } catch (error: any) {
    console.error("Failed to push master programs:", error);
    return { success: false, error: error.message || "Failed to push programs." };
  }
}

export async function getProgramParticipants(programId: string, requestedZoneId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized — access restricted to Admin and Zone Admin" };
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { eventId: true, zoneId: true, role: true }
    });

    const activeZoneId = session.user.role === "ZONE_ADMIN" 
      ? (fullUser?.zoneId || (session.user as any).zoneId || null) 
      : (requestedZoneId || null);

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        category: { select: { id: true, name: true } },
        event: { select: { id: true, name: true, type: true, zoneId: true } },
      }
    });

    if (!program) {
      return { success: false, error: "Program not found" };
    }

    // Find all matching programs across events (State and Zonal) with the same name and category
    const matchingPrograms = await prisma.program.findMany({
      where: {
        OR: [
          { id: programId },
          { 
            name: { equals: program.name, mode: "insensitive" },
            ...(program.categoryId ? { categoryId: program.categoryId } : {})
          },
          ...(program.programCode ? [{ programCode: program.programCode }] : [])
        ]
      },
      select: { id: true }
    });

    const targetProgramIds = Array.from(new Set(matchingPrograms.map(p => p.id)));

    // Build assignment query
    const assignmentWhere: any = {
      programId: { in: targetProgramIds }
    };

    if (activeZoneId) {
      assignmentWhere.candidate = {
        OR: [
          { institution: { zoneId: activeZoneId } },
          { team: { institution: { zoneId: activeZoneId } } },
          { team: { event: { zoneId: activeZoneId } } }
        ]
      };
    }

    const assignments = await prisma.programAssignment.findMany({
      where: assignmentWhere,
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            chestNumber: true,
            uid: true,
            photoUrl: true,
            photo: true,
            isApproved: true,
            replacedFromChest: true,
            replacementNote: true,
            category: { select: { name: true } },
            institution: {
              select: {
                id: true,
                code: true,
                name: true,
                place: true,
                zone: { select: { id: true, name: true, code: true } }
              }
            },
            team: {
              select: {
                id: true,
                name: true,
                prefixCode: true,
                institution: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    place: true,
                    zone: { select: { id: true, name: true, code: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { candidate: { chestNumber: "asc" } },
        { candidate: { name: "asc" } }
      ]
    });

    // Deduplicate candidates in case an assignment exists on both state and zone level
    const seenCandidateIds = new Set<string>();
    const uniqueParticipants: any[] = [];

    for (const a of assignments) {
      if (!seenCandidateIds.has(a.candidate.id)) {
        seenCandidateIds.add(a.candidate.id);
        const inst = a.candidate.institution || a.candidate.team.institution;
        const zone = inst?.zone;
        uniqueParticipants.push({
          assignmentId: a.id,
          candidateId: a.candidate.id,
          name: a.candidate.name,
          chestNumber: a.candidate.chestNumber,
          uid: a.candidate.uid,
          photo: a.candidate.photoUrl || a.candidate.photo || null,
          categoryName: a.candidate.category?.name || program.category?.name || "General",
          teamName: a.candidate.team?.name || "N/A",
          institutionCode: inst?.code || "N/A",
          institutionName: inst?.name || "N/A",
          institutionPlace: inst?.place || "",
          zoneName: zone?.name || "",
          zoneCode: zone?.code || "",
          isApproved: a.candidate.isApproved,
          replacedFromChest: a.candidate.replacedFromChest,
          replacementNote: a.candidate.replacementNote,
          hasIssue: !a.candidate.chestNumber || (!a.candidate.photoUrl && !a.candidate.photo)
        });
      }
    }

    // Sort: candidates missing chest numbers or with issues can be inspected easily
    uniqueParticipants.sort((a, b) => {
      if (a.chestNumber && b.chestNumber) {
        const numA = parseInt(a.chestNumber);
        const numB = parseInt(b.chestNumber);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.chestNumber.localeCompare(b.chestNumber);
      }
      if (a.chestNumber && !b.chestNumber) return 1;
      if (!a.chestNumber && b.chestNumber) return -1;
      return a.name.localeCompare(b.name);
    });

    // Zone info if filtered
    let zoneTitle = "";
    if (activeZoneId) {
      const z = await prisma.zone.findUnique({
        where: { id: activeZoneId },
        select: { name: true, code: true }
      });
      if (z) zoneTitle = `${z.name} (${z.code})`;
    }

    return {
      success: true,
      program: {
        id: program.id,
        name: program.name,
        programCode: program.programCode,
        type: program.type,
        stageType: program.stageType,
        category: program.category?.name || "General",
        eventName: program.event.name,
        zoneTitle
      },
      stats: {
        total: uniqueParticipants.length,
        withChestNumber: uniqueParticipants.filter(p => p.chestNumber).length,
        missingChestNumber: uniqueParticipants.filter(p => !p.chestNumber).length,
        missingPhoto: uniqueParticipants.filter(p => !p.photo).length,
        missingUid: uniqueParticipants.filter(p => !p.uid).length,
        institutionsCount: new Set(uniqueParticipants.map(p => p.institutionCode)).size
      },
      participants: uniqueParticipants
    };
  } catch (error: any) {
    console.error("Failed to get program participants:", error);
    return { success: false, error: error.message || "Failed to load participants." };
  }
}

