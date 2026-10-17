import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ProgramsRegistrationClient, {
  ProgramRegistrationItem,
  ProgramsOverview,
  ZoneItem,
} from "./ProgramsRegistrationClient";

export const dynamic = "force-dynamic";

export default async function ProgramsRegistrationReportPage(props: {
  searchParams?: Promise<{ eventId?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { role, id: userId } = session.user;

  if (!["SUPER_ADMIN", "ADMIN", "ZONE_ADMIN"].includes(role)) {
    redirect("/dashboard");
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { zoneId: true, eventId: true },
  });

  // Target event: prioritize searchParams.eventId, then user eventId (for ZONE_ADMIN), then state event
  let targetEventId = searchParams.eventId;
  if (!targetEventId && role === "ZONE_ADMIN" && fullUser?.eventId) {
    targetEventId = fullUser.eventId;
  }
  if (!targetEventId) {
    const stateEvent = await prisma.event.findFirst({
      where: { type: "STATE" },
      select: { id: true },
    });
    targetEventId = stateEvent?.id;
  }

  const settings = await getSettings(targetEventId);

  // Fetch all regional zones with their institutions
  const rawZones = await prisma.zone.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      institutions: {
        select: {
          id: true,
          code: true,
          name: true,
          place: true,
        },
        orderBy: { code: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Preferred regional sort order (North to South, excluding Karnataka)
  const zoneOrder: Record<string, number> = {
    KSG: 1,
    KNR: 2,
    KKD: 3,
    MPW: 4,
    MPE: 5,
    PLK: 6,
    TCR: 7,
    KAR: 8,
  };

  const allZones: ZoneItem[] = rawZones
    .filter((z) => z.code !== "KAR" && !z.name.toUpperCase().includes("KARNATAKA"))
    .map((z) => ({
      id: z.id,
      name: z.name,
      code: z.code,
      institutions: z.institutions.map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        place: i.place,
      })),
    }))
    .sort((a, b) => (zoneOrder[a.code] || 99) - (zoneOrder[b.code] || 99));

  // Fetch all programs for target event with category and candidate assignments
  const programs = await prisma.program.findMany({
    where: targetEventId ? { eventId: targetEventId } : {},
    include: {
      category: { select: { name: true } },
      event: { select: { id: true, name: true, type: true } },
      assignments: {
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              chestNumber: true,
              institutionId: true,
              institution: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  place: true,
                  zoneId: true,
                  zone: { select: { id: true, name: true, code: true } },
                },
              },
              team: {
                select: {
                  id: true,
                  name: true,
                  prefixCode: true,
                  institutionId: true,
                  institution: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      place: true,
                      zoneId: true,
                      zone: { select: { id: true, name: true, code: true } },
                    },
                  },
                  event: {
                    select: {
                      zoneId: true,
                      zone: { select: { id: true, name: true, code: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let totalCandidateRegistrations = 0;
  let totalIndivPrograms = 0;
  let totalGeneralPrograms = 0;
  let totalOnStage = 0;
  let totalOffStage = 0;

  const zoneTotalRegistrations: Record<string, number> = {};
  allZones.forEach((z) => {
    zoneTotalRegistrations[z.id] = 0;
  });

  const items: ProgramRegistrationItem[] = programs.map((p) => {
    const zoneCounts: Record<string, number> = {};
    allZones.forEach((z) => {
      zoneCounts[z.id] = 0;
    });

    const institutionCounts: Record<string, number> = {};

    let participants = p.assignments
      .map((a) => {
        const c = a.candidate;
        if (!c) return null;

        const assignedZone =
          c.institution?.zone ||
          c.team?.institution?.zone ||
          c.team?.event?.zone ||
          null;

        // Skip Karnataka participants
        if (
          assignedZone?.code === "KAR" ||
          assignedZone?.name?.toUpperCase().includes("KARNATAKA")
        ) {
          return null;
        }

        const zoneId = assignedZone?.id || "UNKNOWN";
        const zoneName = assignedZone?.name || "Unknown Zone";
        const zoneCode = assignedZone?.code || "UNK";

        const inst = c.institution || c.team?.institution || null;
        const instId = inst?.id || c.team?.institutionId || c.institutionId || "UNKNOWN";
        const instCode = inst?.code || c.team?.prefixCode || "-";
        const instName = inst?.name || c.team?.name || "-";
        const instPlace = inst?.place || null;

        // Increment count for this zone
        if (assignedZone?.id && zoneCounts[assignedZone.id] !== undefined) {
          zoneCounts[assignedZone.id]++;
          zoneTotalRegistrations[assignedZone.id]++;
        }

        // Increment count for this institution
        if (instId && instId !== "UNKNOWN") {
          institutionCounts[instId] = (institutionCounts[instId] || 0) + 1;
        }

        return {
          candidateId: c.id,
          candidateName: c.name,
          chestNumber: c.chestNumber,
          institutionId: instId,
          institutionCode: instCode,
          institutionName: instName,
          institutionPlace: instPlace,
          zoneId,
          zoneName,
          zoneCode,
        };
      })
      .filter((part): part is NonNullable<typeof part> => part !== null);

    if (role === "ZONE_ADMIN" && fullUser?.zoneId) {
      participants = participants.filter((part) => part.zoneId === fullUser.zoneId);
    }

    const distinctInstCodes = new Set(
      participants.map((part) => part.institutionCode).filter(Boolean)
    );

    totalCandidateRegistrations += participants.length;
    if (p.type === "GENERAL") {
      totalGeneralPrograms++;
    } else {
      totalIndivPrograms++;
    }

    if (p.stageType === "ON_STAGE") {
      totalOnStage++;
    } else {
      totalOffStage++;
    }

    return {
      id: p.id,
      programCode: p.programCode,
      name: p.name,
      type: p.type,
      stageType: p.stageType,
      categoryName: p.category?.name || "General",
      duration: p.duration,
      candidatesCount: participants.length,
      institutionsCount: distinctInstCodes.size,
      zoneCounts,
      institutionCounts,
      participants,
    };
  });

  const overview: ProgramsOverview = {
    totalPrograms: items.length,
    totalCandidateRegistrations,
    totalIndivPrograms,
    totalGeneralPrograms,
    totalOnStagePrograms: totalOnStage,
    totalOffStagePrograms: totalOffStage,
    zoneTotalRegistrations,
  };

  return (
    <ProgramsRegistrationClient
      programs={items}
      zones={allZones}
      overview={overview}
      festName={settings.festName || "HIYA FIESTA 2026"}
      userZoneId={role === "ZONE_ADMIN" && fullUser?.zoneId ? fullUser.zoneId : undefined}
    />
  );
}
