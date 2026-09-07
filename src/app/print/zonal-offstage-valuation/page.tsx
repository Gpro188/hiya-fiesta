import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import ZonalOffstageValuationClient from "./ZonalOffstageValuationClient";

export const dynamic = "force-dynamic";

export default async function ZonalOffstageValuationPage(props: {
  searchParams: Promise<{
    zoneId?: string;
    programId?: string;
    eventId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { role, id: userId } = session.user;
  if (!["ZONE_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    redirect("/dashboard");
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { eventId: true, zoneId: true, institutionId: true },
  });

  const settings = await getSettings();

  // Fetch all Zones
  const zones = await prisma.zone.findMany({
    orderBy: { name: "asc" },
  });

  // Fetch all Off-Stage Programs
  const programs = await prisma.program.findMany({
    where: { stageType: "OFF_STAGE" },
    include: { category: true },
    orderBy: [
      { category: { name: "asc" } },
      { programCode: "asc" },
      { name: "asc" },
    ],
  });

  // Fetch all Off-stage assignments
  const assignments = await prisma.programAssignment.findMany({
    where: {
      program: { stageType: "OFF_STAGE" },
    },
    include: {
      program: {
        include: { category: true },
      },
      candidate: {
        include: {
          category: true,
          institution: {
            include: { zone: true },
          },
          team: {
            include: {
              institution: { include: { zone: true } },
              event: { include: { zone: true } },
            },
          },
        },
      },
    },
  });

  // Build structured data grouped by Zone and Program
  // A candidate's zone is determined by candidate.institution.zone or candidate.team.event.zone
  type CandidateEntry = {
    assignmentId: string;
    candidateId: string;
    candidateName: string;
    candidateUid: string | null;
    chestNumber: string | null;
    candidatePhoto: string | null;
    institutionCode: string | null;
    institutionName: string;
    institutionPlace: string | null;
    categoryName: string;
    isConfirmed: boolean;
  };

  type ProgramValuationSheet = {
    programId: string;
    programCode: string | null;
    programName: string;
    categoryName: string;
    duration: number;
    venue: string | null;
    candidates: CandidateEntry[];
  };

  type ZoneValuationData = {
    zoneId: string;
    zoneCode: string;
    zoneName: string;
    programs: ProgramValuationSheet[];
  };

  const zoneMap = new Map<string, {
    zone: typeof zones[0];
    programMap: Map<string, { program: typeof programs[0]; candidates: CandidateEntry[] }>;
  }>();

  // Initialize zones
  for (const z of zones) {
    zoneMap.set(z.id, {
      zone: z,
      programMap: new Map(),
    });
  }

  // Populate assignments
  for (const asgn of assignments) {
    const candidate = asgn.candidate;
    const program = asgn.program;
    if (!candidate || !program) continue;

    // Resolve zone ID
    const zoneId =
      candidate.institution?.zoneId ||
      candidate.institution?.zone?.id ||
      candidate.team?.institution?.zoneId ||
      candidate.team?.event?.zoneId ||
      null;

    if (!zoneId || !zoneMap.has(zoneId)) continue;

    const zEntry = zoneMap.get(zoneId)!;
    if (!zEntry.programMap.has(program.id)) {
      zEntry.programMap.set(program.id, {
        program,
        candidates: [],
      });
    }

    const inst = candidate.institution || candidate.team?.institution;

    zEntry.programMap.get(program.id)!.candidates.push({
      assignmentId: asgn.id,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateUid: candidate.uid,
      chestNumber: candidate.chestNumber,
      candidatePhoto: candidate.photo || candidate.photoUrl || null,
      institutionCode: inst?.code || null,
      institutionName: inst?.name || candidate.team?.name || "Unknown Institution",
      institutionPlace: inst?.place || null,
      categoryName: candidate.category?.name || program.category?.name || "General",
      isConfirmed: Boolean(candidate.chestNumber),
    });
  }

  // Convert to serializable format and sort
  const zonalData: ZoneValuationData[] = [];

  for (const [zId, entry] of zoneMap.entries()) {
    const programSheets: ProgramValuationSheet[] = [];

    for (const [pId, pData] of entry.programMap.entries()) {
      // Sort candidates: confirmed with numeric chest number first, then unconfirmed alphabetically
      pData.candidates.sort((a, b) => {
        if (a.chestNumber && b.chestNumber) {
          const numA = parseInt(a.chestNumber, 10);
          const numB = parseInt(b.chestNumber, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.chestNumber.localeCompare(b.chestNumber);
        }
        if (a.chestNumber) return -1;
        if (b.chestNumber) return 1;
        return a.candidateName.localeCompare(b.candidateName);
      });

      programSheets.push({
        programId: pData.program.id,
        programCode: pData.program.programCode,
        programName: pData.program.name,
        categoryName: pData.program.category?.name || "General",
        duration: pData.program.duration || 60,
        venue: pData.program.venue || "Zonal Valuation Center",
        candidates: pData.candidates,
      });
    }

    // Sort programs by category, then code/name
    programSheets.sort((a, b) => {
      const catComp = a.categoryName.localeCompare(b.categoryName);
      if (catComp !== 0) return catComp;
      return (a.programCode || a.programName).localeCompare(b.programCode || b.programName);
    });

    zonalData.push({
      zoneId: entry.zone.id,
      zoneCode: entry.zone.code,
      zoneName: entry.zone.name,
      programs: programSheets,
    });
  }

  // Pre-filter if user is ZONE_ADMIN
  const initialZoneId =
    role === "ZONE_ADMIN"
      ? fullUser?.zoneId || searchParams.zoneId || zonalData[0]?.zoneId
      : searchParams.zoneId || null;

  return (
    <ZonalOffstageValuationClient
      festName={settings.festName}
      festMoto={settings.festMoto}
      zonalData={zonalData}
      zones={zones.map((z) => ({ id: z.id, code: z.code, name: z.name }))}
      allPrograms={programs.map((p) => ({
        id: p.id,
        code: p.programCode,
        name: p.name,
        categoryName: p.category?.name || "General",
      }))}
      userRole={role}
      initialZoneId={initialZoneId}
      initialProgramId={searchParams.programId || null}
    />
  );
}
