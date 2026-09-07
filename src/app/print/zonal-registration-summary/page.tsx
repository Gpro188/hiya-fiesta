import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ZonalRegistrationPackClient, {
  ZoneSummary,
  GrandTotals,
  InstitutionSummary,
} from "./ZonalRegistrationPackClient";

export const dynamic = "force-dynamic";

export default async function PrintZonalRegistrationSummaryPage(props: {
  searchParams: Promise<{ zoneId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { role, id: userId } = session.user;

  // Only SUPER_ADMIN, ADMIN, and ZONE_ADMIN can access this pack
  if (!["SUPER_ADMIN", "ADMIN", "ZONE_ADMIN"].includes(role)) {
    redirect("/dashboard");
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { zoneId: true, eventId: true },
  });

  // If ZONE_ADMIN, restrict to their assigned zone
  let targetZoneId = searchParams.zoneId || "ALL";
  if (role === "ZONE_ADMIN" && fullUser?.zoneId) {
    targetZoneId = fullUser.zoneId;
  }

  // Get festival name
  const stateEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
    select: { id: true },
  });
  const settings = await getSettings(stateEvent?.id);

  // Fetch all zones with institutions, teams, candidates, categories, and program assignments
  const rawZones = await prisma.zone.findMany({
    include: {
      institutions: {
        include: {
          teams: {
            include: {
              candidates: {
                include: {
                  category: { select: { name: true } },
                  programs: {
                    include: {
                      program: {
                        select: { id: true, name: true, type: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  let grandTotalInstitutions = 0;
  let grandRegisteredInstitutions = 0;
  let grandTotalCandidates = 0;
  let grandTotalIndivPrograms = 0;
  let grandTotalGeneralPrograms = 0;

  const zonesData: ZoneSummary[] = rawZones.map((zone) => {
    let zoneRegCount = 0;
    let zoneCandidatesCount = 0;
    let zoneIndivCount = 0;
    let zoneGeneralCount = 0;

    const institutionsList: InstitutionSummary[] = zone.institutions.map((inst) => {
      const allCandidates = inst.teams.flatMap((t) => t.candidates);
      const isRegistered = allCandidates.length > 0;
      const isConfirmed = inst.teams.some((t) => t.isAssignmentsConfirmed || t.isOnStageConfirmed);

      if (isRegistered) {
        zoneRegCount++;
      }

      zoneCandidatesCount += allCandidates.length;

      const distinctIndiv = new Set<string>();
      const distinctGeneral = new Set<string>();

      allCandidates.forEach((c) => {
        c.programs.forEach((p) => {
          if (p.program) {
            if (p.program.type === "GENERAL") {
              distinctGeneral.add(p.program.id);
            } else {
              distinctIndiv.add(p.program.id);
            }
          }
        });
      });

      zoneIndivCount += distinctIndiv.size;
      zoneGeneralCount += distinctGeneral.size;

      const candidateCategories = Array.from(
        new Set(allCandidates.map((c) => c.category?.name).filter(Boolean) as string[])
      );

      return {
        id: inst.id,
        code: inst.code,
        name: inst.name,
        place: inst.place,
        district: inst.district,
        stream: inst.stream,
        candidateCategories,
        isRegistered,
        isConfirmed,
        candidatesCount: allCandidates.length,
        indivProgramsCount: distinctIndiv.size,
        generalProgramsCount: distinctGeneral.size,
        totalProgramsCount: distinctIndiv.size + distinctGeneral.size,
        prefixCode: inst.teams[0]?.prefixCode,
      };
    });

    grandTotalInstitutions += zone.institutions.length;
    grandRegisteredInstitutions += zoneRegCount;
    grandTotalCandidates += zoneCandidatesCount;
    grandTotalIndivPrograms += zoneIndivCount;
    grandTotalGeneralPrograms += zoneGeneralCount;

    return {
      id: zone.id,
      name: zone.name,
      code: zone.code,
      totalInstitutions: zone.institutions.length,
      registeredInstitutions: zoneRegCount,
      unregisteredInstitutions: zone.institutions.length - zoneRegCount,
      totalCandidates: zoneCandidatesCount,
      totalIndivPrograms: zoneIndivCount,
      totalGeneralPrograms: zoneGeneralCount,
      totalPrograms: zoneIndivCount + zoneGeneralCount,
      institutions: institutionsList,
    };
  });

  const grandTotals: GrandTotals = {
    totalZones: zonesData.length,
    totalInstitutions: grandTotalInstitutions,
    registeredInstitutions: grandRegisteredInstitutions,
    unregisteredInstitutions: grandTotalInstitutions - grandRegisteredInstitutions,
    registrationPercentage:
      grandTotalInstitutions > 0
        ? Math.round((grandRegisteredInstitutions / grandTotalInstitutions) * 100)
        : 0,
    totalCandidates: grandTotalCandidates,
    totalIndivPrograms: grandTotalIndivPrograms,
    totalGeneralPrograms: grandTotalGeneralPrograms,
    totalPrograms: grandTotalIndivPrograms + grandTotalGeneralPrograms,
  };

  return (
    <ZonalRegistrationPackClient
      zones={zonesData}
      grandTotals={grandTotals}
      festName={settings.festName || "HIYA FIESTA 2026"}
      initialZoneId={targetZoneId}
    />
  );
}
