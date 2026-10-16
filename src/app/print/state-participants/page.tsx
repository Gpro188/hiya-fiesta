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
    facilityScope?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // 1. Fetch State Event & PG Fest Event
  const stateEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
    include: { parent: true },
  });

  const pgEvent = await prisma.event.findFirst({
    where: { name: { contains: "PG", mode: "insensitive" } },
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

  // 2. Fetch all program assignments in the State event
  const stateAssignments = await prisma.programAssignment.findMany({
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

  // 3. Fetch PG Fest assignments (since PG off-stages and on-stages happen at the venue)
  const pgAssignments = pgEvent
    ? await prisma.programAssignment.findMany({
        where: {
          program: {
            eventId: pgEvent.id,
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
      })
    : [];

  // 4. Aggregate participants and zone-wise facilities summary
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
      venueFacilitiesCandidates: Set<string>;
      completedOffStageOnlyCandidates: Set<string>;
      assignmentsCount: number;
    }>;
    totalAssignments: number;
  }>();

  function processAssignment(a: any, isPg: boolean) {
    const c = a.candidate;
    if (!c) return;

    // Check Karnataka exclusion
    const instZone = c.institution?.zone || c.team?.institution?.zone;
    const eventZone = c.team?.event?.zone;
    const zoneCode = instZone?.code || eventZone?.code || "";
    const zoneNameRaw = isPg ? "FADHEELA PG" : (instZone?.name || eventZone?.name || c.team?.event?.name || "");

    const isKarnataka =
      zoneCode === "KAR" ||
      zoneNameRaw.toUpperCase().includes("KARNATAKA");
    if (isKarnataka) return;

    const zoneName = isPg ? "FADHEELA PG" : (zoneNameRaw.replace(/\s*Zone\s*$/i, "").trim() || "General");
    const zoneId = isPg ? "zone-fadheela-pg" : (instZone?.id || eventZone?.id || `zone-${zoneName}`);

    // Institution resolution
    const inst = c.institution || c.team?.institution;
    const instId = inst?.id || c.institutionId || c.team?.institutionId || "unknown-inst";
    const instName = inst?.name || c.team?.name || "Independent / General";
    const instCode = inst?.code || "";
    const instPlace = inst?.place || "";
    const instDistrict = inst?.district || "";

    const progStageType = a.program.stageType || "ON_STAGE";
    const progType = a.program.type || "INDIVIDUAL";

    // Candidate resolution
    if (!participantMap.has(c.id)) {
      participantMap.set(c.id, {
        id: c.id,
        name: c.name,
        chestNumber: c.chestNumber || null,
        uid: c.uid || null,
        photoUrl: c.photoUrl || c.photo || null,
        category: isPg ? "FADHEELA PG" : (c.category?.name || "GENERAL"),
        institutionId: instId,
        institutionName: instName,
        institutionCode: instCode,
        institutionPlace: instPlace,
        institutionDistrict: instDistrict,
        zoneId: zoneId,
        zoneName: zoneName,
        zoneCode: isPg ? "PG" : (zoneCode || zoneName.substring(0, 3).toUpperCase()),
        isPg,
        onStageCount: 0,
        offStageCount: 0,
        generalCount: 0,
        pgOnStageCount: 0,
        pgOffStageCount: 0,
        needsVenueFacilities: false,
        programs: [],
      });
    }

    const participant = participantMap.get(c.id)!;

    if (!isPg) {
      if (progStageType === "ON_STAGE") participant.onStageCount++;
      if (progStageType === "OFF_STAGE") participant.offStageCount++;
      if (progType === "GENERAL") participant.generalCount++;
    } else {
      if (progStageType === "ON_STAGE") participant.pgOnStageCount++;
      if (progStageType === "OFF_STAGE") participant.pgOffStageCount++;
    }

    participant.programs.push({
      id: a.program.id,
      code: a.program.programCode || "",
      name: a.program.name,
      stageType: progStageType,
      type: progType,
      slotNumber: a.slotNumber,
      isPg,
    });

    // Venue Facilities Logic:
    // Regular state off-stage programs are already completed.
    // Only State ON-STAGE programs and PG programs (off-stage + on-stage) require facilities at the venue!
    if (participant.onStageCount > 0 || participant.pgOffStageCount > 0 || participant.pgOnStageCount > 0) {
      participant.needsVenueFacilities = true;
    }

    // Zone aggregation
    if (!zoneMap.has(zoneName)) {
      zoneMap.set(zoneName, {
        id: zoneId,
        name: zoneName,
        code: isPg ? "PG" : (zoneCode || zoneName.substring(0, 3).toUpperCase()),
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
        venueFacilitiesCandidates: new Set(),
        completedOffStageOnlyCandidates: new Set(),
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

  stateAssignments.forEach((a) => processAssignment(a, false));
  pgAssignments.forEach((a) => processAssignment(a, true));

  // Update needsVenueFacilities on all candidates
  for (const p of participantMap.values()) {
    if (p.onStageCount > 0 || p.pgOffStageCount > 0 || p.pgOnStageCount > 0) {
      p.needsVenueFacilities = true;
    } else {
      p.needsVenueFacilities = false;
    }

    // Update institution breakdown
    const z = zoneMap.get(p.zoneName);
    if (z) {
      const instEntry = z.institutions.get(p.institutionId);
      if (instEntry) {
        if (p.needsVenueFacilities) {
          instEntry.venueFacilitiesCandidates.add(p.id);
        } else {
          instEntry.completedOffStageOnlyCandidates.add(p.id);
        }
      }
    }
  }

  // Convert zoneMap to sorted array
  const zonesSummary: ZoneFacilitiesSummary[] = Array.from(zoneMap.values())
    .map((z) => {
      let onStageCount = 0;
      let offStageCount = 0;
      let bothStageCount = 0;
      let generalCount = 0;
      let venueFacilitiesCount = 0;
      let completedOffStageOnlyCount = 0;

      let fadhilaCount = 0;
      let fadheelaCount = 0;
      let pgCategoryCount = 0;
      let generalCategoryCount = 0;

      for (const cand of z.candidates.values()) {
        if (cand.needsVenueFacilities) {
          venueFacilitiesCount++;
        } else {
          completedOffStageOnlyCount++;
        }

        if (cand.onStageCount > 0 && cand.offStageCount > 0) {
          bothStageCount++;
        }
        if (cand.onStageCount > 0 || cand.pgOnStageCount > 0) onStageCount++;
        if (cand.offStageCount > 0 || cand.pgOffStageCount > 0) offStageCount++;
        if (cand.generalCount > 0) generalCount++;

        const catUpper = cand.category.toUpperCase();
        if (cand.isPg) {
          pgCategoryCount++;
        } else if (catUpper.includes("FADHILA") && !catUpper.includes("FADHEELA")) {
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
          venueFacilitiesCount: inst.venueFacilitiesCandidates.size,
          completedOffStageOnlyCount: inst.completedOffStageOnlyCandidates.size,
          totalAssignmentsCount: inst.assignmentsCount,
        }))
        .sort((a, b) => b.venueFacilitiesCount - a.venueFacilitiesCount || a.name.localeCompare(b.name));

      return {
        id: z.id,
        name: z.name,
        code: z.code,
        isPgZone: z.name.includes("PG"),
        totalInstitutions: instList.length,
        totalCandidates: totalCandCount,
        venueFacilitiesCandidates: venueFacilitiesCount,
        completedOffStageOnlyCandidates: completedOffStageOnlyCount,
        onStageCandidates: onStageCount,
        offStageCandidates: offStageCount,
        bothStageCandidates: bothStageCount,
        generalCandidates: generalCount,
        categoryBreakdown: {
          fadhila: fadhilaCount,
          fadheela: fadheelaCount,
          pg: pgCategoryCount,
          general: generalCategoryCount,
        },
        totalAssignments: z.totalAssignments,
        institutions: instList,
        facilities: {
          // FACILITIES ARE STRICTLY FOR PHYSICAL VENUE ATTENDEES (State On-Stage + PG Fest)
          recommendedBeds: venueFacilitiesCount,
          dailyMealsEstimate: venueFacilitiesCount * 3,
          idBadgesCount: venueFacilitiesCount,
          kitBagsCount: venueFacilitiesCount,
        },
      };
    })
    .sort((a, b) => {
      // Put regular zones first, then PG zone
      if (a.isPgZone && !b.isPgZone) return 1;
      if (!a.isPgZone && b.isPgZone) return -1;
      return a.name.localeCompare(b.name);
    });

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

  const totalVenueAttendees = allParticipantsList.filter((p) => p.needsVenueFacilities).length;
  const totalCompletedOffStageOnly = allParticipantsList.filter((p) => !p.needsVenueFacilities).length;

  const grandTotals: GrandFacilitiesTotals = {
    totalZones: zonesSummary.length,
    totalInstitutions: zonesSummary.reduce((acc, z) => acc + z.totalInstitutions, 0),
    totalCandidates: allParticipantsList.length,
    totalVenueFacilitiesCandidates: totalVenueAttendees,
    totalCompletedOffStageOnlyCandidates: totalCompletedOffStageOnly,
    totalOnStageCandidates: allParticipantsList.filter((p) => p.onStageCount > 0 || p.pgOnStageCount > 0).length,
    totalOffStageCandidates: allParticipantsList.filter((p) => p.offStageCount > 0 || p.pgOffStageCount > 0).length,
    totalBothStageCandidates: allParticipantsList.filter((p) => (p.onStageCount > 0 || p.pgOnStageCount > 0) && (p.offStageCount > 0 || p.pgOffStageCount > 0)).length,
    totalGeneralCandidates: allParticipantsList.filter((p) => p.generalCount > 0).length,
    totalAssignments: zonesSummary.reduce((acc, z) => acc + z.totalAssignments, 0),
    totalFadhilaCandidates: zonesSummary.reduce((acc, z) => acc + z.categoryBreakdown.fadhila, 0),
    totalFadheelaCandidates: zonesSummary.reduce((acc, z) => acc + z.categoryBreakdown.fadheela, 0),
    totalPgCandidates: zonesSummary.reduce((acc, z) => acc + (z.categoryBreakdown.pg || 0), 0),
    totalGeneralCategoryCandidates: zonesSummary.reduce((acc, z) => acc + z.categoryBreakdown.general, 0),
    facilities: {
      // STRICTLY FOR VENUE ATTENDEES (238 BEDS)
      recommendedBeds: totalVenueAttendees,
      dailyMealsEstimate: totalVenueAttendees * 3,
      idBadgesCount: totalVenueAttendees,
      kitBagsCount: totalVenueAttendees,
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
      initialFacilityScope={searchParams.facilityScope || "VENUE_ATTENDEES"}
    />
  );
}
