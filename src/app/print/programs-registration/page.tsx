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

export default async function ProgramsRegistrationReportPage() {
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

  // Get state event
  const stateEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
    select: { id: true },
  });
  const settings = await getSettings(stateEvent?.id);

  // Fetch all 8 regional zones
  const rawZones = await prisma.zone.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  // Define preferred regional sort order for festival:
  // North to South: Kasaragod -> Kannur -> Kozhikode -> Malappuram West -> Malappuram East -> Palakkad -> Thrissur -> Karnataka
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
    .map((z) => ({
      id: z.id,
      name: z.name,
      code: z.code,
    }))
    .sort((a, b) => (zoneOrder[a.code] || 99) - (zoneOrder[b.code] || 99));

  // Fetch all programs with category and candidate assignments
  const programs = await prisma.program.findMany({
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
              team: {
                select: {
                  id: true,
                  name: true,
                  prefixCode: true,
                  institution: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      place: true,
                      zone: { select: { id: true, name: true, code: true } },
                    },
                  },
                  event: {
                    select: {
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

    let participants = p.assignments
      .filter((a) => Boolean(a.candidate))
      .map((a) => {
        const c = a.candidate;
        const assignedZone =
          c.team?.institution?.zone || c.team?.event?.zone || null;

        const zoneId = assignedZone?.id || "UNKNOWN";
        const zoneName = assignedZone?.name || "Unknown Zone";
        const zoneCode = assignedZone?.code || "UNK";

        // Increment count for this zone
        if (assignedZone?.id && zoneCounts[assignedZone.id] !== undefined) {
          zoneCounts[assignedZone.id]++;
          zoneTotalRegistrations[assignedZone.id]++;
        }

        return {
          candidateId: c.id,
          candidateName: c.name,
          chestNumber: c.chestNumber,
          institutionCode: c.team?.institution?.code || c.team?.prefixCode || "-",
          institutionName: c.team?.institution?.name || c.team?.name || "-",
          institutionPlace: c.team?.institution?.place || null,
          zoneId,
          zoneName,
          zoneCode,
        };
      });

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
    />
  );
}
