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
    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const { eventId } = session.user;

    const data = {
      events: await prisma.event.findMany({
        where: eventId ? { id: eventId } : undefined,
        include: { categories: true }
      }),
      teams: await prisma.team.findMany({
        where: eventId ? { eventId } : undefined
      }),
      programs: await prisma.program.findMany({
        where: eventId ? { eventId } : undefined
      }),
      candidates: await prisma.candidate.findMany({
        where: eventId ? { team: { eventId } } : undefined
      }),
      programAssignments: await prisma.programAssignment.findMany({
        where: eventId ? { program: { eventId } } : undefined
      }),
      results: await prisma.result.findMany({
        where: eventId ? { program: { eventId } } : undefined
      }),
      settings: await prisma.globalSetting.findFirst({
        where: eventId ? { eventId } : { id: "default" }
      })
    };
    return { success: true, data };
  } catch (error) {
    console.error("Export failed:", error);
    return { success: false, error: "Export failed" };
  }
}

export async function resetSystem() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const { eventId } = session.user;

    if (eventId) {
      await prisma.result.deleteMany({ where: { program: { eventId } } });
      await prisma.programAssignment.deleteMany({ where: { program: { eventId } } });
      await prisma.candidate.deleteMany({ where: { team: { eventId } } });
      await prisma.program.deleteMany({ where: { eventId } });
      await prisma.category.deleteMany({ where: { eventId } });
      await prisma.team.deleteMany({ where: { eventId } });
    } else {
      // Order matters due to foreign keys
      await prisma.result.deleteMany({});
      await prisma.programAssignment.deleteMany({});
      await prisma.candidate.deleteMany({});
      await prisma.program.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.team.deleteMany({});
      await prisma.event.deleteMany({});
      await prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } });
    }
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Reset failed:", error);
    return { success: false, error: "Reset failed" };
  }
}

export async function importData(data: any) {
  try {
    // Wipe first
    await resetSystem();

    // Import Event & Categories
    for (const event of data.events) {
      await prisma.event.create({
        data: {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          categories: {
            create: event.categories.map((c: any) => ({
              id: c.id,
              name: c.name,
              chestNumberOffset: c.chestNumberOffset,
              posterBgUrl: c.posterBgUrl
            }))
          }
        }
      });
    }

    // Import Teams
    if (data.teams) {
      await prisma.team.createMany({ data: data.teams });
    }

    // Import Programs
    if (data.programs) {
      await prisma.program.createMany({ data: data.programs });
    }

    // Import Candidates
    if (data.candidates) {
      await prisma.candidate.createMany({ data: data.candidates });
    }

    // Import Assignments
    if (data.programAssignments) {
      await prisma.programAssignment.createMany({ data: data.programAssignments });
    }

    // Import Results
    if (data.results) {
      await prisma.result.createMany({ data: data.results });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Import failed:", error);
    return { success: false, error: "Import failed. File might be corrupted." };
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
