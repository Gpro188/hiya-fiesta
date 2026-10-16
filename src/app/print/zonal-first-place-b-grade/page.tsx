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
  const stateAssignments = stateEvent
    ? await prisma.programAssignment.findMany({
        where: { program: { eventId: stateEvent.id } },
        select: { candidateId: true, program: { select: { programCode: true } } },
      })
    : [];

  const stateAssignedSet = new Set(
    stateAssignments.map((a) => `${a.program.programCode}_${a.candidateId}`)
  );
  const stateAssignedCandSet = new Set(
    stateAssignments.map((a) => a.candidateId).filter(Boolean)
  );

  // Fetch all 1st place results that did NOT get an "A" grade (B Grade, C Grade, No Grade)
  const results = await prisma.result.findMany({
    where: {
      rank: 1,
      isPublished: true,
      OR: [
        { grade: { not: "A" } },
        { grade: null },
      ],
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
          candidates: {
            include: {
              institution: { include: { zone: true } },
            },
          },
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
    gradeBCount: number;
    gradeCCount: number;
    noGradeCount: number;
    confirmedCount: number;
    pendingCount: number;
  }>();

  for (const r of results) {
    // Exclude State event results if any
    if (r.program?.event?.type === "STATE") continue;

    // Exclude Karnataka Zone
    const isKar =
      r.candidate?.team?.institution?.zone?.code === "KAR" ||
      r.candidate?.institution?.zone?.code === "KAR" ||
      r.team?.institution?.zone?.code === "KAR" ||
      r.program?.event?.zone?.code === "KAR" ||
      (r.program?.event?.zone?.name || "").toUpperCase().includes("KARNATAKA");
    if (isKar) continue;

    const zoneNameRaw =
      r.candidate?.team?.institution?.zone?.name ||
      r.candidate?.team?.event?.zone?.name ||
      r.candidate?.institution?.zone?.name ||
      r.team?.institution?.zone?.name ||
      r.team?.event?.zone?.name ||
      r.program?.event?.zone?.name ||
      r.program?.event?.name ||
      "Unknown Zone";

    const zoneName = zoneNameRaw.replace(/\s*Zone\s*$/i, "").trim() || "General";

    const zoneCode =
      r.candidate?.team?.institution?.zone?.code ||
      r.candidate?.team?.event?.zone?.code ||
      r.candidate?.institution?.zone?.code ||
      r.team?.institution?.zone?.code ||
      r.team?.event?.zone?.code ||
      r.program?.event?.zone?.code ||
      zoneName.substring(0, 3).toUpperCase();

    const candidateName = r.candidate?.name || r.team?.name || "Team";
    const chestNo = r.candidate?.chestNumber || r.team?.prefixCode || null;
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

    const targetCandId = r.candidateId || (r.team?.candidates && r.team.candidates[0]?.id) || null;
    const key = `${progCode}_${targetCandId}`;
    const isConfirmed = targetCandId
      ? stateAssignedSet.has(key) || stateAssignedCandSet.has(targetCandId)
      : false;

    const rawGrade = (r.grade || "").toUpperCase().trim();
    const grade = rawGrade === "B" ? "B" : rawGrade === "C" ? "C" : rawGrade || "NO GRADE";

    items.push({
      id: r.id,
      programId: r.programId,
      programCode: progCode,
      programName: progName,
      stageType,
      category,
      zoneName,
      zoneCode,
      candidateId: targetCandId,
      candidateName,
      chestNumber: chestNo,
      uid,
      photoUrl,
      institutionName: college,
      institutionCode: collegeCode,
      district,
      marks: (r as any).marks || (r as any).totalMarks || 0,
      grade,
      isConfirmed,
    });

    if (!zoneSummaryMap.has(zoneName)) {
      zoneSummaryMap.set(zoneName, {
        zoneName,
        zoneCode,
        totalCount: 0,
        gradeBCount: 0,
        gradeCCount: 0,
        noGradeCount: 0,
        confirmedCount: 0,
        pendingCount: 0,
      });
    }

    const zs = zoneSummaryMap.get(zoneName)!;
    zs.totalCount++;
    if (grade === "B") zs.gradeBCount++;
    else if (grade === "C") zs.gradeCCount++;
    else zs.noGradeCount++;

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
