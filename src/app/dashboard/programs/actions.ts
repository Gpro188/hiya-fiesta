"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function createProgram(data: { programCode?: string | null, name: string, type: string, categoryId: string | null, eventId: string, candidateLimitPerTeam?: number, duration?: number, description?: string | null, evaluationCriteria?: string | null, stageType?: string }) {
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

export async function updateProgram(id: string, data: { programCode?: string | null, name: string, type: string, categoryId: string | null, candidateLimitPerTeam?: number, duration?: number, description?: string | null, evaluationCriteria?: string | null, stageType?: string }) {
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
