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

export async function importData(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized: Super Admin access required" };
    }

    // Wipe previous data
    await resetSystem();

    // 1. Restore Zones
    if (data.zones && data.zones.length > 0) {
      for (const z of data.zones) {
        await prisma.zone.upsert({
          where: { id: z.id },
          update: { name: z.name, code: z.code },
          create: { id: z.id, name: z.name, code: z.code }
        });
      }
    }

    // 2. Restore Institutions
    if (data.institutions && data.institutions.length > 0) {
      for (const inst of data.institutions) {
        await prisma.masterInstitution.upsert({
          where: { id: inst.id },
          update: { name: inst.name, code: inst.code, zoneId: inst.zoneId, district: inst.district, stream: inst.stream, password: inst.password },
          create: { id: inst.id, name: inst.name, code: inst.code, zoneId: inst.zoneId, district: inst.district, stream: inst.stream, password: inst.password }
        });
      }
    }

    // 3. Restore Students
    if (data.students && data.students.length > 0) {
      for (const s of data.students) {
        await prisma.masterStudent.upsert({
          where: { uid: s.uid },
          update: { name: s.name, institutionId: s.institutionId, district: s.district, phone: s.phone, stream: s.stream },
          create: { id: s.id, uid: s.uid, name: s.name, institutionId: s.institutionId, district: s.district, phone: s.phone, stream: s.stream }
        });
      }
    }

    // 4. Restore Events & Categories
    if (data.events && data.events.length > 0) {
      for (const event of data.events) {
        await prisma.event.create({
          data: {
            id: event.id,
            name: event.name,
            type: event.type || "ZONE",
            zoneId: event.zoneId,
            parentId: event.parentId,
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
                chestNumberOffset: c.chestNumberOffset,
                posterBgUrl: c.posterBgUrl
              }))
            }
          }
        });
      }
    }

    // 5. Restore Users (Judges, Managers, Zone Admins)
    if (data.users && data.users.length > 0) {
      for (const u of data.users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: { username: u.username, role: u.role, phone: u.phone, place: u.place, zoneId: u.zoneId, institutionId: u.institutionId, eventId: u.eventId },
          create: { id: u.id, username: u.username, password: u.password, role: u.role, phone: u.phone, place: u.place, zoneId: u.zoneId, institutionId: u.institutionId, eventId: u.eventId }
        });
      }
    }

    // 6. Restore Teams
    if (data.teams && data.teams.length > 0) {
      await prisma.team.createMany({ data: data.teams });
    }

    // 7. Restore Programs
    if (data.programs && data.programs.length > 0) {
      for (const prog of data.programs) {
        const { judges, ...progData } = prog;
        await prisma.program.create({
          data: {
            ...progData,
            startTime: progData.startTime ? new Date(progData.startTime) : null,
            judges: judges && judges.length > 0 ? {
              connect: judges.map((j: any) => ({ id: j.id }))
            } : undefined
          }
        });
      }
    }

    // 8. Restore Candidates
    if (data.candidates && data.candidates.length > 0) {
      await prisma.candidate.createMany({ data: data.candidates });
    }

    // 9. Restore Program Assignments
    if (data.programAssignments && data.programAssignments.length > 0) {
      await prisma.programAssignment.createMany({
        data: data.programAssignments.map((pa: any) => ({
          ...pa,
          scheduledTime: pa.scheduledTime ? new Date(pa.scheduledTime) : null
        }))
      });
    }

    // 10. Restore Results
    if (data.results && data.results.length > 0) {
      await prisma.result.createMany({ data: data.results });
    }

    // 11. Restore Settings
    if (data.globalSettings && data.globalSettings.length > 0) {
      for (const gs of data.globalSettings) {
        await prisma.globalSetting.upsert({
          where: { id: gs.id },
          update: gs,
          create: gs
        });
      }
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Import failed:", error);
    return { success: false, error: error.message || "Import failed. File might be corrupted." };
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
