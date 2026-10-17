import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import StateMagazineValuationClient, { MagazineEntry } from "./StateMagazineValuationClient";

export const dynamic = "force-dynamic";

export default async function StateMagazineValuationPage(props: {
  searchParams: Promise<{
    filter?: string;
    scheme?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { role } = session.user;
  if (!["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "JURY"].includes(role)) {
    redirect("/dashboard");
  }

  const settings = await getSettings();

  // 1. Fetch State Event
  const stateEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
  });

  // 2. Fetch State Magazine Program
  const magProgram = await prisma.program.findFirst({
    where: {
      eventId: stateEvent?.id,
      OR: [
        { name: { contains: "magazine", mode: "insensitive" } },
        { programCode: "43" },
      ],
    },
    select: {
      id: true,
      programCode: true,
      name: true,
      description: true,
      evaluationCriteria: true,
    },
  });

  // 3. Fetch all teams participating in Magazine
  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { isMagazineParticipating: true },
        { magazineCode: { not: null } },
      ],
    },
    include: {
      institution: {
        include: { zone: true },
      },
      event: {
        include: { zone: true },
      },
      results: {
        where: {
          program: {
            OR: [
              { name: { contains: "magazine", mode: "insensitive" } },
              { programCode: "43" },
            ],
          },
        },
      },
    },
    orderBy: [
      { institution: { zone: { name: "asc" } } },
      { magazineCode: "asc" },
      { name: "asc" },
    ],
  });

  // Map into MagazineEntry
  const initialMagazines: MagazineEntry[] = teams.map((t) => {
    const inst = t.institution;
    const zone = inst?.zone || t.event?.zone;
    const isKarnataka =
      zone?.code === "KAR" ||
      zone?.name?.toLowerCase().includes("karnataka") ||
      false;

    // Check if team won rank 1 in their zone
    const rank1Result = t.results.find((r) => r.rank === 1);
    const bestResult = t.results.sort((a, b) => (a.rank || 99) - (b.rank || 99))[0];

    return {
      teamId: t.id,
      teamName: t.name,
      institutionId: inst?.id || null,
      institutionName: inst?.name || t.name,
      institutionCode: inst?.code || null,
      institutionPlace: inst?.place || null,
      zoneId: zone?.id || null,
      zoneName: zone?.name || "General",
      zoneCode: zone?.code || zone?.name?.substring(0, 3)?.toUpperCase() || "GEN",
      zonalMagazineCode: t.magazineCode || null,
      isZonalWinner: Boolean(rank1Result),
      zonalRank: bestResult?.rank || null,
      zonalGrade: bestResult?.grade || null,
      isKarnataka,
    };
  });

  return (
    <StateMagazineValuationClient
      initialMagazines={initialMagazines}
      festName={settings.festName || "CSWC State Festival 2026"}
      festMoto={settings.festMoto}
      programDetails={{
        id: magProgram?.id || "program-43",
        programCode: magProgram?.programCode || "43",
        name: magProgram?.name || "Magazine",
        description: magProgram?.description,
        evaluationCriteria: magProgram?.evaluationCriteria,
      }}
    />
  );
}
