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

// Helper to read layouts file
async function readLayoutsFile(): Promise<Record<string, CertificateLayoutConfig>> {
  try {
    const data = await fs.readFile(LAYOUTS_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Helper to write layouts file
async function writeLayoutsFile(layouts: Record<string, CertificateLayoutConfig>) {
  try {
    await fs.mkdir(path.dirname(LAYOUTS_FILE_PATH), { recursive: true });
    await fs.writeFile(LAYOUTS_FILE_PATH, JSON.stringify(layouts, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write certificate layouts file:", err);
  }
}

export async function getCertificateLayout(eventId?: string | null): Promise<CertificateLayoutConfig> {
  const layouts = await readLayoutsFile();
  if (eventId && layouts[eventId]) {
    return layouts[eventId];
  }
  if (layouts["default"]) {
    return layouts["default"];
  }
  return DEFAULT_CERTIFICATE_LAYOUT;
}

export async function saveCertificateLayout(eventId: string, config: CertificateLayoutConfig) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "MEDIA"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" };
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { eventId: true, zoneId: true }
  });

  const layouts = await readLayoutsFile();
  layouts[eventId] = config;
  // Also save as default if none exists
  if (!layouts["default"]) {
    layouts["default"] = config;
  }
  await writeLayoutsFile(layouts);
  return { success: true };
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

  const events = await prisma.event.findMany({
    where: whereEvent,
    include: {
      zone: true,
      categories: { orderBy: { name: "asc" } },
      programs: {
        select: { id: true, name: true, programCode: true, categoryId: true, type: true, stageType: true },
        orderBy: { name: "asc" }
      }
    },
    orderBy: [{ type: "desc" }, { name: "asc" }]
  });

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

  const programWhere: any = {
    eventId: eventId,
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

  const results = await prisma.result.findMany({
    where: {
      ...rankCondition,
      program: programWhere,
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
      { program: { name: "asc" } },
      { rank: "asc" }
    ]
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
      stageType: prog.stageType || undefined
    };
  });

  // Apply optional search filter
  if (searchQuery && searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase().trim();
    return winners.filter(w => 
      w.candidateName.toLowerCase().includes(q) ||
      w.chestNumber.toLowerCase().includes(q) ||
      w.programName.toLowerCase().includes(q) ||
      w.institutionName.toLowerCase().includes(q)
    );
  }

  return winners;
}
