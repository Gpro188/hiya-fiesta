"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function updateSettings(data: { 
  festName: string, 
  festMoto: string, 
  festLogo: string,
  maxIndividualPrograms?: number,
  maxIndividualOnStage?: number,
  maxIndividualOffStage?: number,
  maxGeneralTotal?: number,
  maxGeneralOnStage?: number,
  maxGeneralOffStage?: number,
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { eventId } = session.user;

    const settingPayload: any = {
      festName: data.festName,
      festMoto: data.festMoto,
      festLogo: data.festLogo,
    };
    if (data.maxIndividualPrograms !== undefined) settingPayload.maxIndividualPrograms = data.maxIndividualPrograms;
    if (data.maxIndividualOnStage !== undefined) settingPayload.maxIndividualOnStage = data.maxIndividualOnStage;
    if (data.maxIndividualOffStage !== undefined) settingPayload.maxIndividualOffStage = data.maxIndividualOffStage;
    if (data.maxGeneralTotal !== undefined) settingPayload.maxGeneralTotal = data.maxGeneralTotal;
    if (data.maxGeneralOnStage !== undefined) settingPayload.maxGeneralOnStage = data.maxGeneralOnStage;
    if (data.maxGeneralOffStage !== undefined) settingPayload.maxGeneralOffStage = data.maxGeneralOffStage;

    if (eventId) {
      // Update the event name so it stays in sync
      await prisma.event.update({
        where: { id: eventId },
        data: { name: data.festName }
      });

      await prisma.globalSetting.upsert({
        where: { eventId },
        update: settingPayload,
        create: {
          eventId,
          id: `event-${eventId}`,
          ...settingPayload
        }
      });
    } else {
      await prisma.globalSetting.upsert({
        where: { id: "default" },
        update: settingPayload,
        create: {
          id: "default",
          ...settingPayload
        }
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error) {
    console.error("Failed to update settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function updateRegistrationLimits(data: {
  maxIndividualPrograms: number;
  maxIndividualOnStage: number;
  maxIndividualOffStage: number;
  maxGeneralTotal: number;
  maxGeneralOnStage: number;
  maxGeneralOffStage: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const { eventId } = session.user;

    const settingPayload = {
      maxIndividualPrograms: Number(data.maxIndividualPrograms) || 4,
      maxIndividualOnStage: Number(data.maxIndividualOnStage) || 2,
      maxIndividualOffStage: Number(data.maxIndividualOffStage) || 2,
      maxGeneralTotal: Number(data.maxGeneralTotal) || 2,
      maxGeneralOnStage: Number(data.maxGeneralOnStage) || 1,
      maxGeneralOffStage: Number(data.maxGeneralOffStage) || 1,
    };

    if (eventId) {
      await prisma.globalSetting.upsert({
        where: { eventId },
        update: settingPayload,
        create: {
          eventId,
          id: `event-${eventId}`,
          festName: "Arts Fest",
          festMoto: "Celebrating Creativity",
          festLogo: "",
          ...settingPayload,
        },
      });
    } else {
      await prisma.globalSetting.upsert({
        where: { id: "default" },
        update: settingPayload,
        create: {
          id: "default",
          festName: "Arts Fest",
          festMoto: "Celebrating Creativity",
          festLogo: "",
          ...settingPayload,
        },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error) {
    console.error("Failed to update registration limits:", error);
    return { success: false, error: "Failed to update registration limits" };
  }
}

export async function syncEventProgramDates(eventId: string, targetDate: Date) {
  try {
    const programs = await prisma.program.findMany({
      where: { eventId, startTime: { not: null } },
      select: { id: true, startTime: true }
    });

    for (const prog of programs) {
      if (!prog.startTime) continue;
      const oldD = new Date(prog.startTime);
      const newD = new Date(targetDate);
      newD.setHours(oldD.getHours(), oldD.getMinutes(), oldD.getSeconds(), oldD.getMilliseconds());

      if (newD.getTime() !== oldD.getTime()) {
        await prisma.program.update({
          where: { id: prog.id },
          data: { startTime: newD }
        });
      }
    }
  } catch (err) {
    console.error("Failed to sync event program dates:", err);
  }
}

export async function updateEventDeadlines(eventId: string, data: {
  registrationStart?: string | null;
  registrationEnd?: string | null;
  assignmentStart?: string | null;
  assignmentEnd?: string | null;
  institutionRegistrationEndDate?: string | null;
  offStageRegistrationEnd?: string | null;
  onStageRegistrationEnd?: string | null;
  zoneActiveStartTime?: string | null;
  zoneActiveEndTime?: string | null;
  stateConfirmEndDate?: string | null;
  statusOverride?: string | null;
  zoneUnlockWindowStart?: string | null;
  zoneUnlockWindowEnd?: string | null;
  zoneUnlockMode?: string | null;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const startDateVal = data.zoneActiveStartTime ? new Date(data.zoneActiveStartTime) : null;
    const endDateVal = data.zoneActiveEndTime ? new Date(data.zoneActiveEndTime) : null;

    const effectiveCutoff = data.onStageRegistrationEnd || data.offStageRegistrationEnd || data.institutionRegistrationEndDate;
    const effectiveCutoffDate = effectiveCutoff ? new Date(effectiveCutoff) : null;

    const zoneUnlockStartVal = data.zoneUnlockWindowStart ? new Date(data.zoneUnlockWindowStart) : null;
    const zoneUnlockEndVal = data.zoneUnlockWindowEnd ? new Date(data.zoneUnlockWindowEnd) : null;
    const zoneUnlockModeVal = data.zoneUnlockMode || "FIXED_TIME";

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        registrationStart: null,
        assignmentStart: null,
        registrationEnd: effectiveCutoffDate,
        assignmentEnd: effectiveCutoffDate,
        institutionRegistrationEndDate: effectiveCutoffDate,
        offStageRegistrationEnd: data.offStageRegistrationEnd ? new Date(data.offStageRegistrationEnd) : null,
        onStageRegistrationEnd: data.onStageRegistrationEnd ? new Date(data.onStageRegistrationEnd) : null,
        startDate: startDateVal,
        endDate: endDateVal,
        zoneActiveStartTime: startDateVal,
        zoneActiveEndTime: endDateVal,
        ...(isAdmin ? {
          stateConfirmEndDate: data.stateConfirmEndDate ? new Date(data.stateConfirmEndDate) : null,
          zoneUnlockWindowStart: zoneUnlockStartVal,
          zoneUnlockWindowEnd: zoneUnlockEndVal,
          zoneUnlockMode: zoneUnlockModeVal,
        } : {}),
        ...(data.statusOverride ? { statusOverride: data.statusOverride } : {})
      }
    });

    if (startDateVal) {
      await syncEventProgramDates(eventId, startDateVal);
    }

    // If updated event is State Master Event, sync deadlines to all child Zone events
    if (isAdmin && (updatedEvent.type === "STATE" || !updatedEvent.parentId)) {
      await prisma.event.updateMany({
        where: { parentId: updatedEvent.id },
        data: {
          registrationStart: null,
          assignmentStart: null,
          registrationEnd: effectiveCutoffDate,
          assignmentEnd: effectiveCutoffDate,
          institutionRegistrationEndDate: effectiveCutoffDate,
          offStageRegistrationEnd: data.offStageRegistrationEnd ? new Date(data.offStageRegistrationEnd) : null,
          onStageRegistrationEnd: data.onStageRegistrationEnd ? new Date(data.onStageRegistrationEnd) : null,
          zoneUnlockWindowStart: zoneUnlockStartVal,
          zoneUnlockWindowEnd: zoneUnlockEndVal,
          zoneUnlockMode: zoneUnlockModeVal,
        }
      });
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error) {
    console.error("Failed to update event deadlines:", error);
    return { success: false, error: "Failed to update event deadlines" };
  }
}

export async function updateZoneTimelines(zoneUpdates: Array<{
  id: string;
  zoneActiveStartTime?: string | null;
  zoneActiveEndTime?: string | null;
  statusOverride?: string | null;
}>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    for (const item of zoneUpdates) {
      const startVal = item.zoneActiveStartTime ? new Date(item.zoneActiveStartTime) : null;
      const endVal = item.zoneActiveEndTime ? new Date(item.zoneActiveEndTime) : null;

      await prisma.event.update({
        where: { id: item.id },
        data: {
          zoneActiveStartTime: startVal,
          zoneActiveEndTime: endVal,
          startDate: startVal,
          endDate: endVal,
          ...(item.statusOverride ? { statusOverride: item.statusOverride } : {})
        }
      });

      if (startVal) {
        await syncEventProgramDates(item.id, startVal);
      }
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/fest");
    revalidatePath("/fest", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update zone timelines:", error);
    return { success: false, error: "Failed to update zone timelines" };
  }
}

export async function exportAllData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized: Super Admin access required" };
    }

    const data = {
      timestamp: new Date().toISOString(),
      version: "2.0",
      zones: await prisma.zone.findMany(),
      institutions: await prisma.masterInstitution.findMany(),
      students: await prisma.masterStudent.findMany(),
      events: await prisma.event.findMany({
        include: { categories: true, selectedJudges: { select: { id: true } } }
      }),
      teams: await prisma.team.findMany(),
      programs: await prisma.program.findMany({
        include: { judges: { select: { id: true } } }
      }),
      candidates: await prisma.candidate.findMany(),
      programAssignments: await prisma.programAssignment.findMany(),
      results: await prisma.result.findMany(),
      pointMatrices: await prisma.pointMatrix.findMany(),
      stateQualifications: await prisma.stateQualification.findMany(),
      mediaTemplates: await prisma.mediaTemplate.findMany(),
      volunteers: await prisma.volunteer.findMany(),
      globalSettings: await prisma.globalSetting.findMany(),
      homepageSettings: await prisma.homepageSetting.findMany(),
      users: await prisma.user.findMany({
        where: { role: { notIn: ["SUPER_ADMIN"] } },
        select: {
          id: true,
          username: true,
          password: true,
          role: true,
          phone: true,
          place: true,
          zoneId: true,
          institutionId: true,
          eventId: true
        }
      })
    };
    return { success: true, data };
  } catch (error: any) {
    console.error("Export failed:", error);
    return { success: false, error: error.message || "Export failed" };
  }
}

export async function resetSystem() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized: Super Admin access required" };
    }

    // Order matters due to foreign keys
    await prisma.result.deleteMany({});
    await prisma.programAssignment.deleteMany({});
    await prisma.candidate.deleteMany({});
    await prisma.program.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({ where: { role: { notIn: ["SUPER_ADMIN", "ADMIN"] } } });
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Reset failed:", error);
    return { success: false, error: error.message || "Reset failed" };
  }
}

export async function restoreStepWipe() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }
    return await resetSystem();
  } catch (error: any) {
    return { success: false, error: error.message || "Wipe failed" };
  }
}

export async function restoreStepZonesAndInstitutions(zones: any[] = [], institutions: any[] = [], students: any[] = []) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Bulk insert Zones
    if (zones && zones.length > 0) {
      await prisma.zone.createMany({
        data: zones.map(z => ({ id: z.id, name: z.name, code: z.code })),
        skipDuplicates: true
      });
    }

    // 2. Bulk insert Institutions
    if (institutions && institutions.length > 0) {
      // Ensure missing zones exist
      const existingZones = await prisma.zone.findMany({ select: { id: true } });
      const existingZoneIds = new Set(existingZones.map(z => z.id));
      const missingZones = institutions
        .filter(inst => inst.zoneId && !existingZoneIds.has(inst.zoneId))
        .map(inst => ({ id: inst.zoneId, name: `Zone ${inst.zoneId.slice(0, 4)}`, code: inst.zoneId.slice(0, 4).toUpperCase() }));

      if (missingZones.length > 0) {
        await prisma.zone.createMany({ data: missingZones, skipDuplicates: true });
      }

      await prisma.masterInstitution.createMany({
        data: institutions.map(inst => ({
          id: inst.id,
          name: inst.name,
          code: inst.code,
          zoneId: inst.zoneId,
          district: inst.district || null,
          stream: inst.stream || null,
          password: inst.password || "123"
        })),
        skipDuplicates: true
      });
    }

    // 3. Fast Bulk insert Students in 1,000 chunks
    if (students && students.length > 0) {
      const validStudents = students
        .filter(s => !!s.uid)
        .map(s => ({
          id: s.id,
          uid: s.uid.trim().toUpperCase(),
          name: s.name.trim(),
          institutionId: s.institutionId,
          district: s.district || null,
          phone: s.phone || null,
          stream: (s.stream || "FADHILA").trim().toUpperCase()
        }));

      for (let i = 0; i < validStudents.length; i += 1000) {
        await prisma.masterStudent.createMany({
          data: validStudents.slice(i, i + 1000),
          skipDuplicates: true
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Step 2 failed:", error);
    return { success: false, error: error.message || "Failed restoring zones & institutions" };
  }
}

export async function restoreStepEventsAndCategories(events: any[] = [], users: any[] = []) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    if (events && events.length > 0) {
      for (const event of events) {
        await prisma.event.create({
          data: {
            id: event.id,
            name: event.name,
            type: event.type || "ZONE",
            zoneId: event.zoneId || null,
            parentId: event.parentId || null,
            startDate: event.startDate ? new Date(event.startDate) : null,
            endDate: event.endDate ? new Date(event.endDate) : null,
            registrationStart: event.registrationStart ? new Date(event.registrationStart) : null,
            registrationEnd: event.registrationEnd ? new Date(event.registrationEnd) : null,
            assignmentStart: event.assignmentStart ? new Date(event.assignmentStart) : null,
            assignmentEnd: event.assignmentEnd ? new Date(event.assignmentEnd) : null,
            categories: {
              create: (event.categories || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                chestNumberOffset: c.chestNumberOffset || 0,
                posterBgUrl: c.posterBgUrl || null
              }))
            }
          }
        });
      }
    }

    if (users && users.length > 0) {
      await prisma.user.createMany({
        data: users.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password || "123",
          role: u.role,
          phone: u.phone || null,
          place: u.place || null,
          zoneId: u.zoneId || null,
          institutionId: u.institutionId || null,
          eventId: u.eventId || null
        })),
        skipDuplicates: true
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Step 3 failed:", error);
    return { success: false, error: error.message || "Failed restoring events & categories" };
  }
}

export async function restoreStepTeamsAndPrograms(teams: any[] = [], programs: any[] = []) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    if (teams && teams.length > 0) {
      await prisma.team.createMany({
        data: teams.map(t => ({
          id: t.id,
          name: t.name,
          prefixCode: t.prefixCode,
          eventId: t.eventId,
          institutionId: t.institutionId || null,
          flagColor: t.flagColor || "#EC4899",
          leaderName: t.leaderName || null,
          leaderPhoto: t.leaderPhoto || null,
          isAssignmentsConfirmed: t.isAssignmentsConfirmed || false
        })),
        skipDuplicates: true
      });
    }

    if (programs && programs.length > 0) {
      const programRows = programs.map(p => ({
        id: p.id,
        name: p.name,
        programCode: p.programCode || null,
        type: p.type || "INDIVIDUAL",
        categoryId: p.categoryId || null,
        eventId: p.eventId,
        venue: p.venue || null,
        startTime: p.startTime ? new Date(p.startTime) : null,
        duration: p.duration || 10,
        stageType: p.stageType || "ON_STAGE",
        candidateLimitPerTeam: p.candidateLimitPerTeam || 1,
        description: p.description || null,
        evaluationCriteria: p.evaluationCriteria || null
      }));

      await prisma.program.createMany({
        data: programRows,
        skipDuplicates: true
      });

      // Connect judges
      for (const p of programs) {
        if (p.judges && p.judges.length > 0) {
          await prisma.program.update({
            where: { id: p.id },
            data: {
              judges: { connect: p.judges.map((j: any) => ({ id: j.id })) }
            }
          }).catch(() => {});
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Step 4 failed:", error);
    return { success: false, error: error.message || "Failed restoring teams & programs" };
  }
}

export async function restoreStepCandidates(candidates: any[] = []) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    if (candidates && candidates.length > 0) {
      const candidateRows = candidates.map(c => ({
        id: c.id,
        name: c.name,
        uid: c.uid || null,
        chestNumber: c.chestNumber || null,
        photoUrl: c.photoUrl || null,
        photo: c.photo || null,
        categoryId: c.categoryId,
        teamId: c.teamId,
        institutionId: c.institutionId || null,
        isApproved: c.isApproved ?? true,
        isStateQualified: c.isStateQualified ?? false,
        stateQualificationStatus: c.stateQualificationStatus || "NONE"
      }));

      for (let i = 0; i < candidateRows.length; i += 1000) {
        await prisma.candidate.createMany({
          data: candidateRows.slice(i, i + 1000),
          skipDuplicates: true
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Step 5 failed:", error);
    return { success: false, error: error.message || "Failed restoring candidates" };
  }
}

export async function restoreStepAssignmentsAndResults(assignments: any[] = [], results: any[] = []) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    if (assignments && assignments.length > 0) {
      const assignmentRows = assignments.map(a => ({
        id: a.id,
        candidateId: a.candidateId,
        programId: a.programId,
        slotNumber: a.slotNumber || null,
        scheduledTime: a.scheduledTime ? new Date(a.scheduledTime) : null
      }));

      for (let i = 0; i < assignmentRows.length; i += 1000) {
        await prisma.programAssignment.createMany({
          data: assignmentRows.slice(i, i + 1000),
          skipDuplicates: true
        });
      }
    }

    if (results && results.length > 0) {
      const resultRows = results.map(r => ({
        id: r.id,
        candidateId: r.candidateId || null,
        teamId: r.teamId || null,
        programId: r.programId,
        marks: r.marks || 0,
        rank: r.rank || null,
        grade: r.grade || null,
        points: r.points || 0,
        isPublished: r.isPublished ?? true
      }));

      for (let i = 0; i < resultRows.length; i += 1000) {
        await prisma.result.createMany({
          data: resultRows.slice(i, i + 1000),
          skipDuplicates: true
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Step 6 failed:", error);
    return { success: false, error: error.message || "Failed restoring assignments & results" };
  }
}

export async function restoreStepFinalize(
  globalSettings: any[] = [], 
  homepageSettings: any[] = [],
  pointMatrices: any[] = [],
  stateQualifications: any[] = [],
  mediaTemplates: any[] = [],
  volunteers: any[] = []
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    if (globalSettings && globalSettings.length > 0) {
      for (const gs of globalSettings) {
        await prisma.globalSetting.upsert({
          where: { id: gs.id },
          update: gs,
          create: gs
        });
      }
    }

    if (homepageSettings && homepageSettings.length > 0) {
      for (const hs of homepageSettings) {
        await prisma.homepageSetting.upsert({
          where: { eventId: hs.eventId },
          update: hs,
          create: hs
        });
      }
    }

    if (pointMatrices && pointMatrices.length > 0) {
      for (const pm of pointMatrices) {
        await prisma.pointMatrix.upsert({
          where: { id: pm.id },
          update: pm,
          create: pm
        });
      }
    }

    if (mediaTemplates && mediaTemplates.length > 0) {
      for (const mt of mediaTemplates) {
        await prisma.mediaTemplate.upsert({
          where: { id: mt.id },
          update: mt,
          create: mt
        });
      }
    }

    if (volunteers && volunteers.length > 0) {
      await prisma.volunteer.createMany({
        data: volunteers,
        skipDuplicates: true
      });
    }

    if (stateQualifications && stateQualifications.length > 0) {
      await prisma.stateQualification.createMany({
        data: stateQualifications,
        skipDuplicates: true
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Step 7 finalize failed:", error);
    return { success: false, error: error.message || "Failed finalizing restore" };
  }
}

export async function updatePassword(userId: string, password: string) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update password:", error);
    return { success: false, error: "Failed to update password" };
  }
}

export async function toggleGuidelinesVisibility(hide: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.globalSetting.upsert({
      where: { id: "default" },
      update: {
        posterCongratulationUrl: hide ? "HIDE_GUIDELINES" : null
      },
      create: {
        id: "default",
        posterCongratulationUrl: hide ? "HIDE_GUIDELINES" : null
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to toggle guidelines visibility:", error);
    return { success: false, error: error.message || "Failed to update guidelines visibility" };
  }
}

export async function getPointMatrixSettings(eventId?: string) {
  try {
    let targetEventId = eventId;
    if (!targetEventId || targetEventId === "default") {
      const mainEvent = await prisma.event.findFirst({ where: { parentId: null } });
      targetEventId = mainEvent?.id;
    }

    const defaultIndividual = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
    const defaultGeneral = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };

    if (!targetEventId) {
      return {
        success: true,
        data: {
          individual: defaultIndividual,
          general: defaultGeneral,
          isCustom: false
        }
      };
    }

    const matrix = await prisma.pointMatrix.findFirst({
      where: { eventId: targetEventId }
    });

    if (!matrix) {
      return {
        success: true,
        data: {
          individual: defaultIndividual,
          general: defaultGeneral,
          isCustom: false
        }
      };
    }

    let individual = defaultIndividual;
    let general = defaultGeneral;

    try {
      if (matrix.individualPoints) individual = { ...defaultIndividual, ...JSON.parse(matrix.individualPoints) };
    } catch (e) {}

    try {
      const rawGen = matrix.generalPoints || matrix.groupPoints;
      if (rawGen) general = { ...defaultGeneral, ...JSON.parse(rawGen) };
    } catch (e) {}

    return {
      success: true,
      data: {
        individual,
        general,
        isCustom: true
      }
    };
  } catch (error: any) {
    console.error("Failed to get point matrix:", error);
    return { success: false, error: error.message || "Failed to get point matrix" };
  }
}

export async function savePointMatrixSettings(data: {
  eventId?: string;
  individual: { rank1: number; rank2: number; rank3: number; gradeA: number; gradeB: number; gradeC: number };
  general: { rank1: number; rank2: number; rank3: number; gradeA: number; gradeB: number; gradeC: number };
  recalculateExisting?: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized: Super Admin or Admin access required" };
    }

    let targetEventId = data.eventId;
    if (!targetEventId || targetEventId === "default") {
      const mainEvent = await prisma.event.findFirst({ where: { parentId: null } });
      if (!mainEvent) {
        return { success: false, error: "Main festival event not found" };
      }
      targetEventId = mainEvent.id;
    }

    const indStr = JSON.stringify(data.individual);
    const genStr = JSON.stringify(data.general);

    await prisma.pointMatrix.upsert({
      where: { eventId: targetEventId },
      update: {
        individualPoints: indStr,
        generalPoints: genStr,
        groupPoints: genStr
      },
      create: {
        eventId: targetEventId,
        individualPoints: indStr,
        generalPoints: genStr,
        groupPoints: genStr
      }
    });

    let recalculatedCount = 0;
    if (data.recalculateExisting) {
      const recalcRes = await recalculateAllResults(targetEventId);
      if (recalcRes.success) {
        recalculatedCount = recalcRes.count || 0;
      }
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/super-admin");
    revalidatePath("/dashboard/scoring");
    revalidatePath(`/dashboard/events/${targetEventId}`);
    revalidatePath("/fest");
    revalidatePath("/");

    return { 
      success: true, 
      message: `Points matrix saved successfully.${recalculatedCount > 0 ? ` Recalculated ${recalculatedCount} existing results.` : ''}`,
      recalculatedCount
    };
  } catch (error: any) {
    console.error("Failed to save point matrix settings:", error);
    return { success: false, error: error.message || "Failed to save points matrix" };
  }
}

export async function recalculateAllResults(eventId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    let targetEventId = eventId;
    if (!targetEventId || targetEventId === "default") {
      const mainEvent = await prisma.event.findFirst({ where: { parentId: null } });
      targetEventId = mainEvent?.id;
    }

    const matrixRes = await getPointMatrixSettings(targetEventId);
    const indConfig = matrixRes.data?.individual || { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
    const genConfig = matrixRes.data?.general || { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };

    const mainEvent = await prisma.event.findFirst({ where: { parentId: null } });
    const isGlobal = !eventId || eventId === "default" || eventId === mainEvent?.id;

    const results = await prisma.result.findMany({
      where: isGlobal
        ? undefined
        : {
            OR: [
              { program: { eventId: targetEventId } },
              { candidate: { team: { eventId: targetEventId } } },
              { team: { eventId: targetEventId } }
            ]
          },
      include: {
        program: { select: { id: true, type: true } }
      }
    });

    let updatedCount = 0;
    for (const res of results) {
      const isIndiv = res.program?.type === "INDIVIDUAL";
      const config = isIndiv ? indConfig : genConfig;

      let points = 0;
      if (res.rank === 1) points += config.rank1 || 0;
      else if (res.rank === 2) points += config.rank2 || 0;
      else if (res.rank === 3) points += config.rank3 || 0;

      if (res.grade === "A") points += config.gradeA || 0;
      else if (res.grade === "B") points += config.gradeB || 0;
      else if (res.grade === "C") points += config.gradeC || 0;

      if (res.points !== points) {
        await prisma.result.update({
          where: { id: res.id },
          data: { points }
        });
        updatedCount++;
      }
    }

    revalidatePath("/dashboard/scoring");
    revalidatePath("/fest");
    revalidatePath("/");

    return { success: true, count: updatedCount };
  } catch (error: any) {
    console.error("Failed to recalculate results:", error);
    return { success: false, error: error.message || "Failed to recalculate results" };
  }
}

