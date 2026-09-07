import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ProgramsRegistrationClient, {
  ProgramRegistrationItem,
  ProgramsOverview,
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

  // Fetch all programs with category and assignments
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
                      zone: { select: { name: true } },
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

  const items: ProgramRegistrationItem[] = programs.map((p) => {
    // If ZONE_ADMIN, filter participants to only candidates in that zone
    let participants = p.assignments
      .filter((a) => Boolean(a.candidate))
      .map((a) => {
        const c = a.candidate;
        return {
          candidateId: c.id,
          candidateName: c.name,
          chestNumber: c.chestNumber,
          institutionCode: c.team?.institution?.code || c.team?.prefixCode || "-",
          institutionName: c.team?.institution?.name || c.team?.name || "-",
          institutionPlace: c.team?.institution?.place || null,
          zoneName: c.team?.institution?.zone?.name || null,
        };
      });

    if (role === "ZONE_ADMIN" && fullUser?.zoneId) {
      // Find zone name
      participants = participants.filter((part) => {
        return part.zoneName?.toLowerCase().includes(session.user.name?.toLowerCase() || "");
      });
    }

    const distinctInstCodes = new Set(participants.map((part) => part.institutionCode).filter(Boolean));

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
  };

  return (
    <ProgramsRegistrationClient
      programs={items}
      overview={overview}
      festName={settings.festName || "HIYA FIESTA 2026"}
    />
  );
}
