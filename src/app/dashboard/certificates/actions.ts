"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { 
  CertificateLayoutConfig, 
  CertificateWinner, 
  DEFAULT_CERTIFICATE_LAYOUT 
} from "@/types/certificate";

const LAYOUTS_FILE_PATH = path.join(process.cwd(), "data", "certificate-layouts.json");

// Helper to read layouts file (fallback)
async function readLayoutsFile(): Promise<Record<string, CertificateLayoutConfig>> {
  try {
    const data = await fs.readFile(LAYOUTS_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Helper to write layouts file (local cache)
async function writeLayoutsFile(layouts: Record<string, CertificateLayoutConfig>) {
  try {
    await fs.mkdir(path.dirname(LAYOUTS_FILE_PATH), { recursive: true });
    await fs.writeFile(LAYOUTS_FILE_PATH, JSON.stringify(layouts, null, 2), "utf8");
  } catch (err) {
    // Non-fatal on serverless environments like Vercel
    console.warn("Notice: Local file system write omitted on read-only/ephemeral storage:", err);
  }
}

export async function getCertificateLayout(eventId?: string | null): Promise<CertificateLayoutConfig> {
  const targetKey = eventId || "default";

  // 1. Try reading from Database first (guarantees persistence on Vercel & PM2)
  try {
    const dbConfig = await prisma.systemAuditLog.findFirst({
      where: {
        action: "CERTIFICATE_LAYOUT",
        entityType: "EVENT",
        entityId: targetKey
      },
      orderBy: { timestamp: "desc" }
    });

    if (dbConfig?.newValue) {
      const parsed = JSON.parse(dbConfig.newValue) as CertificateLayoutConfig;
      // Ensure categoryName prefix is clean if user hasn't explicitly set another prefix
      if (parsed.fields?.categoryName && parsed.fields.categoryName.prefix === "Category: ") {
        parsed.fields.categoryName.prefix = "";
      }
      return parsed;
    }

    // Check if default layout exists in DB
    if (targetKey !== "default") {
      const dbDefault = await prisma.systemAuditLog.findFirst({
        where: {
          action: "CERTIFICATE_LAYOUT",
          entityType: "EVENT",
          entityId: "default"
        },
        orderBy: { timestamp: "desc" }
      });
      if (dbDefault?.newValue) {
        const parsed = JSON.parse(dbDefault.newValue) as CertificateLayoutConfig;
        if (parsed.fields?.categoryName && parsed.fields.categoryName.prefix === "Category: ") {
          parsed.fields.categoryName.prefix = "";
        }
        return parsed;
      }
    }
  } catch (dbErr) {
    console.error("Failed to read certificate layout from DB:", dbErr);
  }

  // 2. Fallback to local layouts file
  const layouts = await readLayoutsFile();
  if (eventId && layouts[eventId]) {
    const parsed = layouts[eventId];
    if (parsed.fields?.categoryName && parsed.fields.categoryName.prefix === "Category: ") {
      parsed.fields.categoryName.prefix = "";
    }
    return parsed;
  }
  if (layouts["default"]) {
    const parsed = layouts["default"];
    if (parsed.fields?.categoryName && parsed.fields.categoryName.prefix === "Category: ") {
      parsed.fields.categoryName.prefix = "";
    }
    return parsed;
  }

  return DEFAULT_CERTIFICATE_LAYOUT;
}

export async function saveCertificateLayout(eventId: string, config: CertificateLayoutConfig) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "MEDIA"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const targetKey = eventId || "default";
    const serializedConfig = JSON.stringify(config);

    // 1. Persist directly in Database (100% persistent across Vercel & Linux Server)
    // Clean existing entries for this targetKey to prevent unbounded log growth
    try {
      await prisma.systemAuditLog.deleteMany({
        where: {
          action: "CERTIFICATE_LAYOUT",
          entityType: "EVENT",
          entityId: targetKey
        }
      });

      await prisma.systemAuditLog.create({
        data: {
          userId: session.user.id || "admin",
          userName: session.user.name || "Administrator",
          action: "CERTIFICATE_LAYOUT",
          entityType: "EVENT",
          entityId: targetKey,
          newValue: serializedConfig,
          reason: "Certificate layout & calibration update"
        }
      });

      // Also set default if no default exists in DB
      const existingDefault = await prisma.systemAuditLog.findFirst({
        where: { action: "CERTIFICATE_LAYOUT", entityId: "default" }
      });
      if (!existingDefault) {
        await prisma.systemAuditLog.create({
          data: {
            userId: session.user.id || "admin",
            userName: session.user.name || "Administrator",
            action: "CERTIFICATE_LAYOUT",
            entityType: "EVENT",
            entityId: "default",
            newValue: serializedConfig,
            reason: "Default certificate layout"
          }
        });
      }
    } catch (dbSaveErr) {
      console.error("Database save error for certificate layout:", dbSaveErr);
    }

    // 2. Also write to local file system cache (if writable)
    try {
      const layouts = await readLayoutsFile();
      layouts[targetKey] = config;
      if (!layouts["default"]) {
        layouts["default"] = config;
      }
      await writeLayoutsFile(layouts);
    } catch (fileErr) {
      console.warn("File cache write warning:", fileErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save certificate layout:", error);
    return { success: false, error: error.message || "Failed to save layout" };
  }
}

export async function getCertificateEventsAndMetadata() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const role = session.user.role;
  const fullUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { eventId: true, zoneId: true }
  });
  const userZoneId = fullUser?.zoneId;
  const userEventId = fullUser?.eventId;

  let whereEvent: any = {};
  if (role === "ZONE_ADMIN") {
    if (userEventId) {
      whereEvent = { id: userEventId };
    } else if (userZoneId) {
      whereEvent = { zoneId: userZoneId };
    }
  }

  const rawEvents = await prisma.event.findMany({
    where: whereEvent,
    include: {
      zone: true,
      categories: { orderBy: { name: "asc" } },
      programs: {
        select: { id: true, name: true, programCode: true, categoryId: true, type: true, stageType: true },
        orderBy: [{ programCode: "asc" }, { name: "asc" }]
      }
    },
    orderBy: [{ type: "desc" }, { name: "asc" }]
  });

  // For any zonal events, also pull programs from parent event if direct programs don't cover all
  const events = await Promise.all(rawEvents.map(async (ev) => {
    if (ev.parentId) {
      const parentPrograms = await prisma.program.findMany({
        where: { eventId: ev.parentId },
        select: { id: true, name: true, programCode: true, categoryId: true, type: true, stageType: true },
        orderBy: [{ programCode: "asc" }, { name: "asc" }]
      });
      const existingIds = new Set(ev.programs.map(p => p.id));
      const combined = [...ev.programs];
      for (const pp of parentPrograms) {
        if (!existingIds.has(pp.id)) {
          combined.push(pp);
        }
      }
      return {
        ...ev,
        programs: combined
      };
    }
    return ev;
  }));

  const allZones = await prisma.zone.findMany({
    orderBy: { name: "asc" }
  });

  return {
    events,
    allZones,
    userRole: role,
    userZoneId,
    userEventId
  };
}

export async function getCertificateWinners(params: {
  eventId: string;
  programId?: string;
  categoryId?: string;
  stageType?: string; // "ALL" | "ON_STAGE" | "OFF_STAGE"
  rankFilter?: number; // 1, 2, or 3
  searchQuery?: string;
}): Promise<CertificateWinner[]> {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const { eventId, programId, categoryId, stageType, rankFilter, searchQuery } = params;
  if (!eventId) return [];

  // Merit certificates are strictly for 1st, 2nd, and 3rd placed winners
  const rankCondition = rankFilter && [1, 2, 3].includes(rankFilter)
    ? { rank: rankFilter }
    : { rank: { in: [1, 2, 3] } };

  // Determine allowed event IDs for programs (handles zonal fests whose programs are created at parent level)
  const targetEvent = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, parentId: true }
  });
  const allowedEventIds = [eventId, targetEvent?.parentId].filter(Boolean) as string[];

  const programWhere: any = {
    eventId: { in: allowedEventIds },
  };
  if (programId && programId !== "ALL") {
    programWhere.id = programId;
  }
  if (categoryId && categoryId !== "ALL") {
    programWhere.categoryId = categoryId;
  }
  if (stageType && stageType !== "ALL") {
    programWhere.stageType = stageType;
  }

  // Find all uploaded / scored results without waiting for publication (isPublished is not restricted)
  const results = await prisma.result.findMany({
    where: {
      ...rankCondition,
      program: programWhere,
      OR: [
        { team: { eventId: eventId } },
        { candidate: { team: { eventId: eventId } } },
        { program: { eventId: eventId } }
      ]
    },
    include: {
      program: {
        include: {
          category: true,
          event: {
            include: {
              zone: true
            }
          }
        }
      },
      candidate: {
        include: {
          category: true,
          institution: {
            include: {
              zone: true
            }
          },
          team: {
            include: {
              institution: {
                include: {
                  zone: true
                }
              }
            }
          }
        }
      },
      team: {
        include: {
          institution: {
            include: {
              zone: true
            }
          }
        }
      }
    },
    orderBy: [
      { program: { programCode: "asc" } },
      { program: { name: "asc" } },
      { rank: "asc" }
    ]
  });

  // Query which certificates have been printed
  const resultIds = results.map(r => r.id);
  const printLogs = await prisma.systemAuditLog.findMany({
    where: {
      action: "CERTIFICATE_PRINTED",
      entityType: "RESULT",
      entityId: { in: resultIds }
    },
    orderBy: { timestamp: "desc" }
  });
  const printMap = new Map<string, Date>();
  printLogs.forEach(log => {
    if (!printMap.has(log.entityId)) {
      printMap.set(log.entityId, log.timestamp);
    }
  });

  const winners: CertificateWinner[] = results.map((res) => {
    const isTeam = !!res.teamId && !res.candidateId;
    const cand = res.candidate;
    const team = res.team;
    const prog = res.program;
    const event = prog.event;

    const candidateName = cand?.name || team?.name || "Participant";
    const chestNumber = cand?.chestNumber || cand?.team?.magazineCode || "-";
    const inst = cand?.institution || cand?.team?.institution || team?.institution;
    const institutionName = inst?.name || "Institution";
    const institutionPlace = inst?.place || "";

    const rank = res.rank || 1;
    const placeWord = rank === 1 ? "First Place" : rank === 2 ? "Second Place" : "Third Place";
    const placeOrdinal = rank === 1 ? "1st Place" : rank === 2 ? "2nd Place" : "3rd Place";

    // Grade handling: if no grade, grade is null so it's omitted
    const rawGrade = (res.grade || "").trim();
    const hasGrade = rawGrade !== "" && rawGrade !== "-";
    const grade = hasGrade ? rawGrade : null;
    const gradeText = hasGrade ? `${rawGrade} Grade` : null;

    const categoryName = prog.category?.name || cand?.category?.name || "General";
    const zoneName = event.zone?.name || inst?.zone?.name || "Zonal Fest";

    const isPrinted = printMap.has(res.id);
    const printedAt = printMap.get(res.id)?.toISOString() || null;
    const isPublished = Boolean(res.isPublished);
    const publishedAt = res.isPublished ? res.updatedAt.toISOString() : null;

    return {
      id: res.id,
      candidateName,
      chestNumber,
      institutionName,
      institutionPlace,
      programId: prog.id,
      programName: prog.name,
      programCode: prog.programCode || undefined,
      categoryId: prog.categoryId || undefined,
      categoryName,
      rank,
      placeText: placeOrdinal,
      grade,
      gradeText,
      zoneId: event.zoneId || undefined,
      zoneName,
      eventId: event.id,
      eventName: event.name,
      marks: res.marks,
      type: isTeam ? "GROUP" : "INDIVIDUAL",
      stageType: prog.stageType || undefined,
      isPublished,
      publishedAt,
      isPrinted,
      printedAt
    };
  });

  // Apply optional search filter: Candidate name, Chest #, Program name, Program code/number, Institution name
  if (searchQuery && searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase().trim();
    return winners.filter(w => 
      w.candidateName.toLowerCase().includes(q) ||
      w.chestNumber.toLowerCase().includes(q) ||
      w.programName.toLowerCase().includes(q) ||
      (w.programCode && w.programCode.toLowerCase().includes(q)) ||
      w.institutionName.toLowerCase().includes(q)
    );
  }

  return winners;
}

export async function markCertificatesPrinted(resultIds: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "MEDIA"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    if (!resultIds || resultIds.length === 0) return { success: true };

    const now = new Date();
    await Promise.all(resultIds.map(async (id) => {
      await prisma.systemAuditLog.create({
        data: {
          userId: session.user.id || "admin",
          userName: session.user.name || "Administrator",
          action: "CERTIFICATE_PRINTED",
          entityType: "RESULT",
          entityId: id,
          reason: "Certificate printed on-time",
          timestamp: now
        }
      });
    }));

    return { success: true };
  } catch (err: any) {
    console.error("Failed to mark certificates printed:", err);
    return { success: false, error: err.message || "Failed to mark printed" };
  }
}

export async function unmarkCertificatesPrinted(resultIds: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "MEDIA"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }
    if (!resultIds || resultIds.length === 0) return { success: true };

    await prisma.systemAuditLog.deleteMany({
      where: {
        action: "CERTIFICATE_PRINTED",
        entityType: "RESULT",
        entityId: { in: resultIds }
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to unmark certificates printed:", err);
    return { success: false, error: err.message || "Failed to unmark printed" };
  }
}

