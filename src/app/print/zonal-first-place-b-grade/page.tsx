import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ZonalFirstPlaceBGradeClient, {
  FirstPlaceBGradeItem,
  ZoneBGradeSummary,
} from "./ZonalFirstPlaceBGradeClient";

export const dynamic = "force-dynamic";

export default async function ZonalFirstPlaceBGradePage() {
  const stateEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
  });

  const settings = await getSettings(stateEvent?.id);
  const festName = settings.festName || stateEvent?.name || "CSWC Hiya Fiesta 2026";

  // Fetch state program assignments to check confirmation status
  const stateAssignments = await prisma.programAssignment.findMany({
    where: { program: { eventId: stateEvent?.id } },
    select: { candidateId: true, program: { select: { programCode: true } } },
  });

  const stateAssignedSet = new Set(
    stateAssignments.map((a) => `${a.program.programCode}_${a.candidateId}`)
  );
  const stateAssignedCandSet = new Set(
    stateAssignments.map((a) => a.candidateId).filter(Boolean)
  );

  // Fetch all 1st place with Grade B results
  const results = await prisma.result.findMany({
    where: {
      rank: 1,
      grade: "B",
      isPublished: true,
    },
    include: {
      program: {
        include: {
          event: { include: { zone: true } },
          category: true,
        },
      },
      candidate: {
        include: {
          institution: { include: { zone: true } },
          team: {
            include: {
              institution: { include: { zone: true } },
              event: { include: { zone: true } },
            },
          },
        },
      },
      team: {
        include: {
          institution: { include: { zone: true } },
          event: { include: { zone: true } },
        },
      },
    },
    orderBy: [
      { program: { programCode: "asc" } },
    ],
  });

  const items: FirstPlaceBGradeItem[] = [];
  const zoneSummaryMap = new Map<string, {
    zoneName: string;
    zoneCode: string;
    totalCount: number;
    confirmedCount: number;
    pendingCount: number;
  }>();

  for (const r of results) {
    const isKar =
      r.candidate?.team?.institution?.zone?.code === "KAR" ||
      r.team?.institution?.zone?.code === "KAR" ||
      r.program?.event?.zone?.code === "KAR";
    if (isKar) continue;

    const zoneNameRaw =
      r.candidate?.team?.institution?.zone?.name ||
      r.candidate?.team?.event?.zone?.name ||
      r.team?.institution?.zone?.name ||
      r.team?.event?.zone?.name ||
      r.program?.event?.zone?.name ||
      r.program?.event?.name ||
      "Unknown Zone";

    const zoneName = zoneNameRaw.replace(/\s*Zone\s*$/i, "").trim() || "General";

    const zoneCode =
      r.candidate?.team?.institution?.zone?.code ||
      r.candidate?.team?.event?.zone?.code ||
      r.team?.institution?.zone?.code ||
      r.team?.event?.zone?.code ||
      r.program?.event?.zone?.code ||
      zoneName.substring(0, 3).toUpperCase();

    const candidateName = r.candidate?.name || r.team?.name || "Team";
    const chestNo = r.candidate?.chestNumber || null;
    const uid = r.candidate?.uid || null;
    const photoUrl = r.candidate?.photoUrl || r.candidate?.photo || null;

    const inst = r.candidate?.institution || r.candidate?.team?.institution || r.team?.institution;
    const college = inst?.name || "-";
    const collegeCode = inst?.code || "-";
    const district = inst?.district || "-";

    const progCode = r.program?.programCode || "-";
    const progName = r.program?.name || "-";
    const stageType = r.program?.stageType || "ON_STAGE";
    const category = r.program?.category?.name || "GENERAL";

    const key = `${progCode}_${r.candidateId}`;
    const isConfirmed = r.candidateId
      ? stateAssignedSet.has(key) || stateAssignedCandSet.has(r.candidateId)
      : false;

    items.push({
      id: r.id,
      programId: r.programId,
      programCode: progCode,
      programName: progName,
      stageType,
      category,
      zoneName,
      zoneCode,
      candidateId: r.candidateId,
      candidateName,
      chestNumber: chestNo,
      uid,
      photoUrl,
      institutionName: college,
      institutionCode: collegeCode,
      district,
      marks: r.marks || 0,
      grade: "B",
      isConfirmed,
    });

    if (!zoneSummaryMap.has(zoneName)) {
      zoneSummaryMap.set(zoneName, {
        zoneName,
        zoneCode,
        totalCount: 0,
        confirmedCount: 0,
        pendingCount: 0,
      });
    }

    const zs = zoneSummaryMap.get(zoneName)!;
    zs.totalCount++;
    if (isConfirmed) zs.confirmedCount++;
    else zs.pendingCount++;
  }

  // Sort items by Zone then Program Code
  items.sort((a, b) => {
    if (a.zoneName !== b.zoneName) return a.zoneName.localeCompare(b.zoneName);
    return (parseInt(a.programCode) || 0) - (parseInt(b.programCode) || 0);
  });

  const zoneSummaries: ZoneBGradeSummary[] = Array.from(zoneSummaryMap.values()).sort((a, b) =>
    a.zoneName.localeCompare(b.zoneName)
  );

  return (
    <ZonalFirstPlaceBGradeClient
      festName={festName}
      items={items}
      zoneSummaries={zoneSummaries}
    />
  );
}
