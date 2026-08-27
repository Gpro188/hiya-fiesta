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
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const { eventId } = session.user;

    if (eventId) {
      // Update the event name so it stays in sync
      await prisma.event.update({
        where: { id: eventId },
        data: { name: data.festName }
      });

      await prisma.globalSetting.upsert({
        where: { eventId },
        update: {
          festName: data.festName,
          festMoto: data.festMoto,
          festLogo: data.festLogo,
        },
        create: {
          eventId,
          id: `event-${eventId}`,
          festName: data.festName,
          festMoto: data.festMoto,
          festLogo: data.festLogo,
        }
      });
    } else {
      await prisma.globalSetting.upsert({
        where: { id: "default" },
        update: {
          festName: data.festName,
          festMoto: data.festMoto,
          festLogo: data.festLogo,
        },
        create: {
          id: "default",
          festName: data.festName,
          festMoto: data.festMoto,
          festLogo: data.festLogo,
        }
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to update settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function updateEventDeadlines(eventId: string, data: {
  registrationStart: string | null;
  registrationEnd: string | null;
  assignmentStart: string | null;
  assignmentEnd: string | null;
  institutionRegistrationEndDate: string | null;
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

    await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(isAdmin ? {
          registrationStart: data.registrationStart ? new Date(data.registrationStart) : null,
          registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : null,
          assignmentStart: data.assignmentStart ? new Date(data.assignmentStart) : null,
          assignmentEnd: data.assignmentEnd ? new Date(data.assignmentEnd) : null,
          zoneActiveStartTime: data.zoneActiveStartTime ? new Date(data.zoneActiveStartTime) : null,
          zoneActiveEndTime: data.zoneActiveEndTime ? new Date(data.zoneActiveEndTime) : null,
          stateConfirmEndDate: data.stateConfirmEndDate ? new Date(data.stateConfirmEndDate) : null,
        } : {}),
        institutionRegistrationEndDate: data.institutionRegistrationEndDate ? new Date(data.institutionRegistrationEndDate) : null,
        ...(data.statusOverride ? { statusOverride: data.statusOverride } : {})
      }
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to update event deadlines:", error);
    return { success: false, error: "Failed to update event deadlines" };
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

    if (zones && zones.length > 0) {
      for (const z of zones) {
        await prisma.zone.upsert({
          where: { id: z.id },
          update: { name: z.name, code: z.code },
          create: { id: z.id, name: z.name, code: z.code }
        });
      }
    }

    if (institutions && institutions.length > 0) {
      for (const inst of institutions) {
        // Ensure zone exists
        if (inst.zoneId) {
          const zoneExists = await prisma.zone.findUnique({ where: { id: inst.zoneId } });
          if (!zoneExists) {
            await prisma.zone.create({
              data: { id: inst.zoneId, name: `Zone ${inst.zoneId.slice(0, 4)}`, code: inst.zoneId.slice(0, 4).toUpperCase() }
            });
          }
        }
        await prisma.masterInstitution.upsert({
          where: { id: inst.id },
          update: { name: inst.name, code: inst.code, zoneId: inst.zoneId, district: inst.district, stream: inst.stream, password: inst.password || "123" },
          create: { id: inst.id, name: inst.name, code: inst.code, zoneId: inst.zoneId, district: inst.district, stream: inst.stream, password: inst.password || "123" }
        });
      }
    }

    if (students && students.length > 0) {
      for (const s of students) {
        if (!s.uid) continue;
        await prisma.masterStudent.upsert({
          where: { uid: s.uid },
          update: { name: s.name, institutionId: s.institutionId, district: s.district, phone: s.phone, stream: s.stream || "FADHILA" },
          create: { id: s.id, uid: s.uid, name: s.name, institutionId: s.institutionId, district: s.district, phone: s.phone, stream: s.stream || "FADHILA" }
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
      for (const u of users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: { username: u.username, role: u.role, phone: u.phone, place: u.place, zoneId: u.zoneId, institutionId: u.institutionId, eventId: u.eventId },
          create: { id: u.id, username: u.username, password: u.password || "123", role: u.role, phone: u.phone, place: u.place, zoneId: u.zoneId, institutionId: u.institutionId, eventId: u.eventId }
        });
      }
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
      for (const t of teams) {
        await prisma.team.create({
          data: {
            id: t.id,
            name: t.name,
            prefixCode: t.prefixCode,
            eventId: t.eventId,
            institutionId: t.institutionId || null,
            flagColor: t.flagColor || "#EC4899",
            leaderName: t.leaderName || null,
            leaderPhoto: t.leaderPhoto || null,
            isAssignmentsConfirmed: t.isAssignmentsConfirmed || false
          }
        });
      }
    }

    if (programs && programs.length > 0) {
      for (const p of programs) {
        const { judges, ...pData } = p;
        await prisma.program.create({
          data: {
            id: pData.id,
            name: pData.name,
            programCode: pData.programCode || null,
            type: pData.type || "INDIVIDUAL",
            categoryId: pData.categoryId || null,
            eventId: pData.eventId,
            venue: pData.venue || null,
            startTime: pData.startTime ? new Date(pData.startTime) : null,
            duration: pData.duration || 10,
            stageType: pData.stageType || "ON_STAGE",
            candidateLimitPerTeam: pData.candidateLimitPerTeam || 1,
            description: pData.description || null,
            evaluationCriteria: pData.evaluationCriteria || null,
            judges: judges && judges.length > 0 ? {
              connect: judges.map((j: any) => ({ id: j.id }))
            } : undefined
          }
        });
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
      for (const c of candidates) {
        await prisma.candidate.create({
          data: {
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
          }
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
      for (const a of assignments) {
        await prisma.programAssignment.create({
          data: {
            id: a.id,
            candidateId: a.candidateId,
            programId: a.programId,
            slotNumber: a.slotNumber || null,
            scheduledTime: a.scheduledTime ? new Date(a.scheduledTime) : null
          }
        });
      }
    }

    if (results && results.length > 0) {
      for (const r of results) {
        await prisma.result.create({
          data: {
            id: r.id,
            candidateId: r.candidateId || null,
            teamId: r.teamId || null,
            programId: r.programId,
            marks: r.marks || 0,
            rank: r.rank || null,
            grade: r.grade || null,
            points: r.points || 0,
            isPublished: r.isPublished ?? true
          }
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Step 6 failed:", error);
    return { success: false, error: error.message || "Failed restoring assignments & results" };
  }
}

export async function restoreStepFinalize(globalSettings: any[] = [], homepageSettings: any[] = []) {
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
