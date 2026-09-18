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

export async function saveCertificateLayout(
  eventId: string, 
  config: CertificateLayoutConfig,
  lockGlobally: boolean = true
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "MEDIA"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const targetKey = eventId || "default";
    const serializedConfig = JSON.stringify(config);

    // 1. Persist directly in Database (100% persistent across Vercel & Linux Server)
    try {
      // Clean existing entries for this targetKey
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
          reason: lockGlobally ? "Certificate layout locked globally" : "Certificate layout update"
        }
      });

      // If lockGlobally is true, also update "default" and all related events in the fest!
      if (lockGlobally) {
        // Always replace default
        await prisma.systemAuditLog.deleteMany({
          where: { action: "CERTIFICATE_LAYOUT", entityId: "default" }
        });
        await prisma.systemAuditLog.create({
          data: {
            userId: session.user.id || "admin",
            userName: session.user.name || "Administrator",
            action: "CERTIFICATE_LAYOUT",
            entityType: "EVENT",
            entityId: "default",
            newValue: serializedConfig,
            reason: "Default locked certificate layout for all logins"
          }
        });

        // Also propagate to all related events (parent and sibling zones)
        if (targetKey !== "default") {
          const currentEv = await prisma.event.findUnique({
            where: { id: targetKey },
            select: { id: true, parentId: true }
          });
          const relatedIds = new Set<string>();
          if (currentEv?.parentId) {
            relatedIds.add(currentEv.parentId);
            const siblings = await prisma.event.findMany({
              where: { parentId: currentEv.parentId },
              select: { id: true }
            });
            siblings.forEach(s => relatedIds.add(s.id));
          } else if (currentEv) {
            const children = await prisma.event.findMany({
              where: { parentId: currentEv.id },
              select: { id: true }
            });
            children.forEach(c => relatedIds.add(c.id));
          }

          for (const relId of Array.from(relatedIds)) {
            if (relId === targetKey) continue;
            await prisma.systemAuditLog.deleteMany({
              where: { action: "CERTIFICATE_LAYOUT", entityId: relId }
            });
            await prisma.systemAuditLog.create({
              data: {
                userId: session.user.id || "admin",
                userName: session.user.name || "Administrator",
                action: "CERTIFICATE_LAYOUT",
                entityType: "EVENT",
                entityId: relId,
                newValue: serializedConfig,
                reason: "Locked Global Certificate Layout for Fest"
              }
            });
          }
        }
      }
    } catch (dbSaveErr) {
      console.error("Database save error for certificate layout:", dbSaveErr);
    }

    // 2. Also write to local file system cache (if writable)
    try {
      const layouts = await readLayoutsFile();
      layouts[targetKey] = config;
      if (lockGlobally || !layouts["default"]) {
        layouts["default"] = config;
      }
      await writeLayoutsFile(layouts);
    } catch (fileErr) {
      console.warn("File cache write warning:", fileErr);
    }

    return { success: true, lockedGlobally: lockGlobally };
  } catch (error: any) {
    console.error("Failed to save certificate layout:", error);
    return { success: false, error: error.message || "Failed to save layout" };
  }
}

export async function fetchLockedCertificateLayout(eventId?: string | null): Promise<CertificateLayoutConfig> {
  return await getCertificateLayout(eventId);
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
      const filteredProgs = combined.filter(p => {
        const name = (p.name || "").toLowerCase();
        return !name.includes("magazine") && p.programCode !== "43" && (p.type || "").toUpperCase() !== "INSTITUTION";
      });
      return {
        ...ev,
        programs: filteredProgs
      };
    }
    const filteredProgs = ev.programs.filter(p => {
      const name = (p.name || "").toLowerCase();
      return !name.includes("magazine") && p.programCode !== "43" && (p.type || "").toUpperCase() !== "INSTITUTION";
    });
    return {
      ...ev,
      programs: filteredProgs
    };
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

  // Filter out Magazine programs ("BUT IN MAGAZIN NO NEED CERTIFICATE")
  const filteredResults = results.filter(res => {
    const prog = res.program;
    const name = (prog.name || "").toLowerCase();
    const isMag = name.includes("magazine") || prog.programCode === "43" || (prog.type || "").toUpperCase() === "INSTITUTION";
    return !isMag;
  });

  // Query candidate assignments for General/Group programs and team results
  const teamResults = filteredResults.filter(r => (r.teamId && !r.candidateId) || r.program.type === "GENERAL" || r.program.type === "GROUP");
  const teamProgramIds = Array.from(new Set(teamResults.map(r => r.programId)));
  const teamProgramCodes = Array.from(new Set(teamResults.map(r => r.program.programCode).filter(Boolean))) as string[];
  const teamIds = Array.from(new Set(teamResults.map(r => r.teamId).filter(Boolean))) as string[];

  let teamAssignments: any[] = [];
  if ((teamProgramIds.length > 0 || teamProgramCodes.length > 0) && teamIds.length > 0) {
    teamAssignments = await prisma.programAssignment.findMany({
      where: {
        OR: [
          { programId: { in: teamProgramIds } },
          { program: { programCode: { in: teamProgramCodes } } }
        ],
        candidate: {
          teamId: { in: teamIds }
        }
      },
      include: {
        program: { select: { id: true, programCode: true } },
        candidate: {
          include: {
            category: true,
            institution: { include: { zone: true } },
            team: {
              include: {
                institution: { include: { zone: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { slotNumber: "asc" },
        { candidate: { chestNumber: "asc" } },
        { candidate: { name: "asc" } }
      ]
    });
  }

  const assignmentsByProgramAndTeam = new Map<string, any[]>();
  for (const a of teamAssignments) {
    const key = `${a.programId}_${a.candidate.teamId}`;
    if (!assignmentsByProgramAndTeam.has(key)) {
      assignmentsByProgramAndTeam.set(key, []);
    }
    assignmentsByProgramAndTeam.get(key)!.push(a.candidate);

    if (a.program?.programCode) {
      const codeKey = `${a.program.programCode}_${a.candidate.teamId}`;
      if (!assignmentsByProgramAndTeam.has(codeKey)) {
        assignmentsByProgramAndTeam.set(codeKey, []);
      }
      const existingInCodeKey = assignmentsByProgramAndTeam.get(codeKey)!;
      if (!existingInCodeKey.some((c: any) => c.id === a.candidate.id)) {
        existingInCodeKey.push(a.candidate);
      }
    }
  }

  // Query which certificates have been printed
  const printLogs = await prisma.systemAuditLog.findMany({
    where: {
      action: "CERTIFICATE_PRINTED",
      entityType: "RESULT"
    },
    orderBy: { timestamp: "desc" }
  });
  const printMap = new Map<string, Date>();
  printLogs.forEach(log => {
    if (!printMap.has(log.entityId)) {
      printMap.set(log.entityId, log.timestamp);
    }
  });

  const winners: CertificateWinner[] = [];

  for (const res of filteredResults) {
    const isTeam = !!res.teamId && !res.candidateId;
    const cand = res.candidate;
    const team = res.team;
    const prog = res.program;
    const event = prog.event;

    const rank = res.rank || 1;
    const placeOrdinal = rank === 1 ? "1st Place" : rank === 2 ? "2nd Place" : "3rd Place";

    // Grade handling: if no grade, grade is null so it's omitted
    const rawGrade = (res.grade || "").trim();
    const hasGrade = rawGrade !== "" && rawGrade !== "-";
    const grade = hasGrade ? rawGrade : null;
    const gradeText = hasGrade ? `${rawGrade} Grade` : null;

    const categoryName = prog.category?.name || cand?.category?.name || "General";
    const zoneName = event.zone?.name || cand?.institution?.zone?.name || team?.institution?.zone?.name || "Zonal Fest";

    const isPublished = Boolean(res.isPublished);
    const publishedAt = res.isPublished ? res.updatedAt.toISOString() : null;

    // Check if this is a Team/General program with registered participants
    if (res.teamId && (!res.candidateId || prog.type === "GENERAL" || prog.type === "GROUP")) {
      const key = `${res.programId}_${res.teamId}`;
      let candidates = assignmentsByProgramAndTeam.get(key) || [];
      if (candidates.length === 0 && prog.programCode) {
        candidates = assignmentsByProgramAndTeam.get(`${prog.programCode}_${res.teamId}`) || [];
      }

      if (candidates.length > 0) {
        for (const assignedCand of candidates) {
          const compId = `${res.id}_${assignedCand.id}`;
          const isPrinted = printMap.has(compId) || printMap.has(res.id);
          const printedAt = printMap.get(compId)?.toISOString() || printMap.get(res.id)?.toISOString() || null;
          const inst = assignedCand.institution || assignedCand.team?.institution || team?.institution;
          const institutionName = inst?.name || team?.name || "Institution";
          const institutionPlace = inst?.place || "";

          winners.push({
            id: compId,
            resultId: res.id,
            candidateId: assignedCand.id,
            candidateName: assignedCand.name,
            chestNumber: assignedCand.chestNumber || "-",
            institutionName,
            institutionPlace,
            teamName: team?.name,
            programId: prog.id,
            programName: prog.name,
            programCode: prog.programCode || undefined,
            categoryId: prog.categoryId || undefined,
            categoryName: prog.category?.name || assignedCand.category?.name || "General",
            rank,
            placeText: placeOrdinal,
            grade,
            gradeText,
            zoneId: event.zoneId || undefined,
            zoneName: event.zone?.name || inst?.zone?.name || "Zonal Fest",
            eventId: event.id,
            eventName: event.name,
            marks: res.marks,
            type: "GROUP",
            stageType: prog.stageType || undefined,
            isPublished,
            publishedAt,
            isPrinted,
            printedAt
          });
        }
        continue;
      }
    }

    // Individual Candidate or Fallback Team Winner
    const candidateName = cand?.name || team?.name || "Participant";
    const chestNumber = cand?.chestNumber || "-";
    const inst = cand?.institution || cand?.team?.institution || team?.institution;
    const institutionName = inst?.name || team?.name || "Institution";
    const institutionPlace = inst?.place || "";

    const isPrinted = printMap.has(res.id);
    const printedAt = printMap.get(res.id)?.toISOString() || null;

    winners.push({
      id: res.id,
      resultId: res.id,
      candidateId: cand?.id,
      candidateName,
      chestNumber,
      institutionName,
      institutionPlace,
      teamName: team?.name,
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
    });
  }

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
      if (id.includes("_")) {
        const baseResultId = id.split("_")[0];
        await prisma.systemAuditLog.create({
          data: {
            userId: session.user.id || "admin",
            userName: session.user.name || "Administrator",
            action: "CERTIFICATE_PRINTED",
            entityType: "RESULT",
            entityId: baseResultId,
            reason: "Team result certificate printed",
            timestamp: now
          }
        });
      }
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

    const allIdsToDelete = new Set<string>();
    for (const id of resultIds) {
      allIdsToDelete.add(id);
      if (id.includes("_")) {
        allIdsToDelete.add(id.split("_")[0]);
      }
    }

    await prisma.systemAuditLog.deleteMany({
      where: {
        action: "CERTIFICATE_PRINTED",
        entityType: "RESULT",
        entityId: { in: Array.from(allIdsToDelete) }
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to unmark certificates printed:", err);
    return { success: false, error: err.message || "Failed to unmark printed" };
  }
}

