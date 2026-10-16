import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import StateParticipantsClient, {
  StateParticipant,
  ZoneFacilitiesSummary,
  GrandFacilitiesTotals,
} from "./StateParticipantsClient";

export const dynamic = "force-dynamic";

export default async function StateParticipantsPage(props: {
  searchParams: Promise<{
    zoneId?: string;
    stageType?: string;
    categoryId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // 1. Fetch State Event
  const stateEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
    include: { parent: true },
  });

  if (!stateEvent) {
    return (
      <div style={{ padding: "50px", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h2>State Festival Event Not Found</h2>
        <p>No event of type STATE is configured in the database.</p>
      </div>
    );
  }

  const settings = await getSettings(stateEvent.id);
  const festName = settings.festName || stateEvent.name || "CSWC Hiya Fiesta 2026 - State Final";

  // 2. Fetch all program assignments in the State event with all relations
  const assignments = await prisma.programAssignment.findMany({
    where: {
      program: {
        eventId: stateEvent.id,
      },
    },
    include: {
      candidate: {
        include: {
          category: true,
          institution: {
            include: {
              zone: true,
            },
          },
          team: {
            include: {
              institution: {
                include: {
                  zone: true,
                },
              },
              event: {
                include: {
                  zone: true,
                },
              },
            },
          },
        },
      },
      program: {
        include: {
          category: true,
        },
      },
    },
    orderBy: [
      { program: { programCode: "asc" } },
      { slotNumber: "asc" },
    ],
  });

  // 3. Aggregate participants and zone-wise facilities summary
  // RULE: Exclude Karnataka Zone (code === 'KAR' or name includes 'KARNATAKA')
  const participantMap = new Map<string, StateParticipant>();
  const zoneMap = new Map<string, {
    id: string;
    name: string;
    code: string;
    candidates: Map<string, StateParticipant>;
    institutions: Map<string, {
      id: string;
      name: string;
      code: string;
      place: string;
      district: string;
      candidates: Set<string>;
      onStageCandidates: Set<string>;
      offStageCandidates: Set<string>;
      generalCandidates: Set<string>;
      assignmentsCount: number;
    }>;
    totalAssignments: number;
  }>();

  for (const a of assignments) {
    const c = a.candidate;
    if (!c) continue;

    // Check Karnataka exclusion
    const instZone = c.institution?.zone || c.team?.institution?.zone;
    const eventZone = c.team?.event?.zone;
    const zoneCode = instZone?.code || eventZone?.code || "";
    const zoneNameRaw = instZone?.name || eventZone?.name || c.team?.event?.name || "";

    const isKarnataka =
      zoneCode === "KAR" ||
      zoneNameRaw.toUpperCase().includes("KARNATAKA");
    if (isKarnataka) continue;

    const zoneName = zoneNameRaw.replace(/\s*Zone\s*$/i, "").trim() || "General";
    const zoneId = instZone?.id || eventZone?.id || `zone-${zoneName}`;

    // Institution resolution
    const inst = c.institution || c.team?.institution;
    const instId = inst?.id || c.institutionId || c.team?.institutionId || "unknown-inst";
    const instName = inst?.name || c.team?.name || "Independent / General";
    const instCode = inst?.code || "";
    const instPlace = inst?.place || "";
    const instDistrict = inst?.district || "";

    // Candidate resolution
    if (!participantMap.has(c.id)) {
      participantMap.set(c.id, {
        id: c.id,
        name: c.name,
        chestNumber: c.chestNumber || null,
        uid: c.uid || null,
        photoUrl: c.photoUrl || c.photo || null,
        category: c.category?.name || "GENERAL",
        institutionId: instId,
        institutionName: instName,
        institutionCode: instCode,
        institutionPlace: instPlace,
        institutionDistrict: instDistrict,
        zoneId: zoneId,
        zoneName: zoneName,
        zoneCode: zoneCode || zoneName.substring(0, 3).toUpperCase(),
        onStageCount: 0,
        offStageCount: 0,
        generalCount: 0,
        programs: [],
      });
    }

    const participant = participantMap.get(c.id)!;
    const progStageType = a.program.stageType || "ON_STAGE";
    const progType = a.program.type || "INDIVIDUAL";

    if (progStageType === "ON_STAGE") participant.onStageCount++;
    if (progStageType === "OFF_STAGE") participant.offStageCount++;
    if (progType === "GENERAL") participant.generalCount++;

    participant.programs.push({
      id: a.program.id,
      code: a.program.programCode || "",
      name: a.program.name,
      stageType: progStageType,
      type: progType,
      slotNumber: a.slotNumber,
    });

    // Zone aggregation
    if (!zoneMap.has(zoneName)) {
      zoneMap.set(zoneName, {
        id: zoneId,
        name: zoneName,
        code: zoneCode || zoneName.substring(0, 3).toUpperCase(),
        candidates: new Map(),
        institutions: new Map(),
        totalAssignments: 0,
      });
    }

    const z = zoneMap.get(zoneName)!;
    z.totalAssignments++;
    z.candidates.set(c.id, participant);

    if (!z.institutions.has(instId)) {
      z.institutions.set(instId, {
        id: instId,
        name: instName,
        code: instCode,
        place: instPlace,
        district: instDistrict,
        candidates: new Set(),
        onStageCandidates: new Set(),
        offStageCandidates: new Set(),
        generalCandidates: new Set(),
        assignmentsCount: 0,
      });
    }

    const instEntry = z.institutions.get(instId)!;
    instEntry.assignmentsCount++;
    instEntry.candidates.add(c.id);
    if (progStageType === "ON_STAGE") instEntry.onStageCandidates.add(c.id);
    if (progStageType === "OFF_STAGE") instEntry.offStageCandidates.add(c.id);
    if (progType === "GENERAL") instEntry.generalCandidates.add(c.id);
  }

  // Convert zoneMap to sorted array
  const zonesSummary: ZoneFacilitiesSummary[] = Array.from(zoneMap.values())
    .map((z) => {
      let onStageCount = 0;
      let offStageCount = 0;
      let bothStageCount = 0;
      let generalCount = 0;

      let fadhilaCount = 0;
      let fadheelaCount = 0;
      let generalCategoryCount = 0;

      for (const cand of z.candidates.values()) {
        if (cand.onStageCount > 0 && cand.offStageCount > 0) {
          bothStageCount++;
        }
        if (cand.onStageCount > 0) onStageCount++;
        if (cand.offStageCount > 0) offStageCount++;
        if (cand.generalCount > 0) generalCount++;

        const catUpper = cand.category.toUpperCase();
        if (catUpper.includes("FADHILA") && !catUpper.includes("FADHEELA")) {
          fadhilaCount++;
        } else if (catUpper.includes("FADHEELA")) {
          fadheelaCount++;
        } else {
          generalCategoryCount++;
        }
      }

      const totalCandCount = z.candidates.size;

      const instList = Array.from(z.institutions.values())
        .map((inst) => ({
          id: inst.id,
          name: inst.name,
          code: inst.code,
          place: inst.place,
          district: inst.district,
          candidatesCount: inst.candidates.size,
          onStageCount: inst.onStageCandidates.size,
          offStageCount: inst.offStageCandidates.size,
          generalCount: inst.generalCandidates.size,
          totalAssignmentsCount: inst.assignmentsCount,
        }))
        .sort((a, b) => b.candidatesCount - a.candidatesCount || a.name.localeCompare(b.name));

      return {
        id: z.id,
        name: z.name,
        code: z.code,
        totalInstitutions: instList.length,
        totalCandidates: totalCandCount,
        onStageCandidates: onStageCount,
        offStageCandidates: offStageCount,
        bothStageCandidates: bothStageCount,
        generalCandidates: generalCount,
        categoryBreakdown: {
          fadhila: fadhilaCount,
          fadheela: fadheelaCount,
          general: generalCategoryCount,
        },
        totalAssignments: z.totalAssignments,
        institutions: instList,
        facilities: {
          recommendedBeds: totalCandCount,
          dailyMealsEstimate: totalCandCount * 3,
          idBadgesCount: totalCandCount,
          kitBagsCount: totalCandCount,
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Compute Grand Totals across all participating zones
  const allParticipantsList = Array.from(participantMap.values()).sort((a, b) => {
    // Sort by Zone, then Institution, then Chest Number/Name
    if (a.zoneName !== b.zoneName) return a.zoneName.localeCompare(b.zoneName);
    if (a.institutionName !== b.institutionName) return a.institutionName.localeCompare(b.institutionName);
    const chestA = parseInt(a.chestNumber || "99999", 10);
    const chestB = parseInt(b.chestNumber || "99999", 10);
    if (!isNaN(chestA) && !isNaN(chestB) && chestA !== chestB) return chestA - chestB;
    return a.name.localeCompare(b.name);
  });

  const grandTotals: GrandFacilitiesTotals = {
    totalZones: zonesSummary.length,
    totalInstitutions: zonesSummary.reduce((acc, z) => acc + z.totalInstitutions, 0),
    totalCandidates: allParticipantsList.length,
    totalOnStageCandidates: allParticipantsList.filter((p) => p.onStageCount > 0).length,
    totalOffStageCandidates: allParticipantsList.filter((p) => p.offStageCount > 0).length,
    totalBothStageCandidates: allParticipantsList.filter((p) => p.onStageCount > 0 && p.offStageCount > 0).length,
    totalGeneralCandidates: allParticipantsList.filter((p) => p.generalCount > 0).length,
    totalAssignments: zonesSummary.reduce((acc, z) => acc + z.totalAssignments, 0),
    totalFadhilaCandidates: zonesSummary.reduce((acc, z) => acc + z.categoryBreakdown.fadhila, 0),
    totalFadheelaCandidates: zonesSummary.reduce((acc, z) => acc + z.categoryBreakdown.fadheela, 0),
    totalGeneralCategoryCandidates: zonesSummary.reduce((acc, z) => acc + z.categoryBreakdown.general, 0),
    facilities: {
      recommendedBeds: allParticipantsList.length,
      dailyMealsEstimate: allParticipantsList.length * 3,
      idBadgesCount: allParticipantsList.length,
      kitBagsCount: allParticipantsList.length,
    },
  };

  return (
    <StateParticipantsClient
      festName={festName}
      zones={zonesSummary}
      grandTotals={grandTotals}
      participants={allParticipantsList}
      initialZoneId={searchParams.zoneId || "ALL"}
      initialStageType={searchParams.stageType || "ALL"}
    />
  );
}
