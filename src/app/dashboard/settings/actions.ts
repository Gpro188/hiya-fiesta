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

export async function updateEventDeadlines(eventId: string, data: {
  registrationStart: string | null;
  registrationEnd: string | null;
  assignmentStart: string | null;
  assignmentEnd: string | null;
  institutionRegistrationEndDate: string | null;
  offStageRegistrationEnd?: string | null;
  onStageRegistrationEnd?: string | null;
  zoneActiveStartTime: string | null;
  zoneActiveEndTime: string | null;
  stateConfirmEndDate: string | null;
  statusOverride?: string | null;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const startDateVal = data.zoneActiveStartTime ? new Date(data.zoneActiveStartTime) : null;
    const endDateVal = data.zoneActiveEndTime ? new Date(data.zoneActiveEndTime) : null;

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(isAdmin ? {
          registrationStart: data.registrationStart ? new Date(data.registrationStart) : null,
          registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : null,
          assignmentStart: data.assignmentStart ? new Date(data.assignmentStart) : null,
          assignmentEnd: data.assignmentEnd ? new Date(data.assignmentEnd) : null,
          startDate: startDateVal,
          endDate: endDateVal,
          zoneActiveStartTime: startDateVal,
          zoneActiveEndTime: endDateVal,
          stateConfirmEndDate: data.stateConfirmEndDate ? new Date(data.stateConfirmEndDate) : null,
        } : {}),
        institutionRegistrationEndDate: data.institutionRegistrationEndDate ? new Date(data.institutionRegistrationEndDate) : null,
        offStageRegistrationEnd: data.offStageRegistrationEnd ? new Date(data.offStageRegistrationEnd) : null,
        onStageRegistrationEnd: data.onStageRegistrationEnd ? new Date(data.onStageRegistrationEnd) : null,
        ...(data.statusOverride ? { statusOverride: data.statusOverride } : {})
      }
    });

    // If updated event is State Master Event, sync deadlines to all child Zone events
    if (isAdmin && (updatedEvent.type === "STATE" || !updatedEvent.parentId)) {
      await prisma.event.updateMany({
        where: { parentId: updatedEvent.id },
        data: {
          registrationStart: data.registrationStart ? new Date(data.registrationStart) : null,
          registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : null,
          assignmentStart: data.assignmentStart ? new Date(data.assignmentStart) : null,
          assignmentEnd: data.assignmentEnd ? new Date(data.assignmentEnd) : null,
          institutionRegistrationEndDate: data.institutionRegistrationEndDate ? new Date(data.institutionRegistrationEndDate) : null,
          offStageRegistrationEnd: data.offStageRegistrationEnd ? new Date(data.offStageRegistrationEnd) : null,
          onStageRegistrationEnd: data.onStageRegistrationEnd ? new Date(data.onStageRegistrationEnd) : null,
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
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/fest");
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
