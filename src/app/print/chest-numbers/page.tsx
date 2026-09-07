import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import ChestNumbersMasterClient from "./ChestNumbersMasterClient";

export const dynamic = "force-dynamic";

export default async function ChestNumbersMasterPage(props: {
  searchParams: Promise<{
    tab?: string;
    zoneId?: string;
    institutionId?: string;
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

  // Fetch all Master Institutions
  const institutions = await prisma.masterInstitution.findMany({
    include: { zone: true },
    orderBy: [{ zone: { name: "asc" } }, { code: "asc" }],
  });

  // Fetch all Candidates with institution, team, category, programs
  const candidates = await prisma.candidate.findMany({
    include: {
      institution: {
        include: { zone: true },
      },
      category: true,
      team: {
        include: {
          institution: { include: { zone: true } },
          event: { include: { zone: true } },
        },
      },
      programs: {
        include: {
          program: true,
        },
      },
    },
    orderBy: [{ chestNumber: "asc" }, { name: "asc" }],
  });

  // Fetch all teams to know confirmation status
  const teams = await prisma.team.findMany({
    include: {
      institution: { include: { zone: true } },
      event: { include: { zone: true } },
    },
  });

  // Calculate live integrity statistics
  const totalCandidates = candidates.length;
  const withChest = candidates.filter((c) => Boolean(c.chestNumber));
  const pendingCandidates = candidates.filter((c) => !c.chestNumber);

  // Check for duplicate chest numbers in real-time
  const chestCounts: Record<string, number> = {};
  const duplicates: string[] = [];
  for (const c of withChest) {
    if (!c.chestNumber) continue;
    chestCounts[c.chestNumber] = (chestCounts[c.chestNumber] || 0) + 1;
    if (chestCounts[c.chestNumber] === 2) {
      duplicates.push(c.chestNumber);
    }
  }

  // Structure pending candidates by Zone and Institution
  type PendingInstitution = {
    institutionId: string;
    teamId: string;
    code: string;
    name: string;
    place: string | null;
    zoneId: string;
    zoneCode: string;
    zoneName: string;
    magazineCode: string | null;
    isOffConfirmed: boolean;
    isOnConfirmed: boolean;
    totalCandidates: number;
    pendingCount: number;
    confirmedCount: number;
    pendingList: {
      id: string;
      name: string;
      uid: string | null;
      photo: string | null;
      categoryName: string;
      programs: { code: string | null; name: string; stageType: string }[];
    }[];
  };

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const instPendingMap = new Map<string, PendingInstitution>();

  for (const c of candidates) {
    const inst = c.institution || c.team?.institution;
    const team = c.team;
    const instId = inst?.id || team?.id || "unknown";
    const zone = inst?.zone || team?.event?.zone;

    if (!instPendingMap.has(instId)) {
      instPendingMap.set(instId, {
        institutionId: inst?.id || "",
        teamId: team?.id || "",
        code: inst?.code || "—",
        name: inst?.name || team?.name || "Unknown Institution",
        place: inst?.place || null,
        zoneId: zone?.id || "",
        zoneCode: zone?.code || "—",
        zoneName: zone?.name || "General Zone",
        magazineCode: team?.magazineCode || null,
        isOffConfirmed: team?.isAssignmentsConfirmed || false,
        isOnConfirmed: team?.isOnStageConfirmed || false,
        totalCandidates: 0,
        pendingCount: 0,
        confirmedCount: 0,
        pendingList: [],
      });
    }

    const instEntry = instPendingMap.get(instId)!;
    instEntry.totalCandidates++;

    if (c.chestNumber) {
      instEntry.confirmedCount++;
    } else {
      instEntry.pendingCount++;
      instEntry.pendingList.push({
        id: c.id,
        name: c.name,
        uid: c.uid,
        photo: c.photo || c.photoUrl || null,
        categoryName: c.category?.name || "General",
        programs: (c.programs || []).map((p) => ({
          code: p.program?.programCode || null,
          name: p.program?.name || "",
          stageType: p.program?.stageType || "OFF_STAGE",
        })),
      });
    }
  }

  // Filter institutions that have pending candidates
  const pendingInstitutions = Array.from(instPendingMap.values())
    .filter((inst) => inst.pendingCount > 0)
    .sort((a, b) => {
      const zComp = a.zoneName.localeCompare(b.zoneName);
      if (zComp !== 0) return zComp;
      return a.name.localeCompare(b.name);
    });

  // Group pending by Zone
  const pendingByZone: Record<string, { zoneCode: string; zoneName: string; institutions: PendingInstitution[] }> = {};
  for (const inst of pendingInstitutions) {
    if (!pendingByZone[inst.zoneId]) {
      pendingByZone[inst.zoneId] = {
        zoneCode: inst.zoneCode,
        zoneName: inst.zoneName,
        institutions: [],
      };
    }
    pendingByZone[inst.zoneId].institutions.push(inst);
  }

  // Serialized candidate records for roster / identity printing
  const serializableCandidates = candidates.map((c) => {
    const inst = c.institution || c.team?.institution;
    const zone = inst?.zone || c.team?.event?.zone;
    return {
      id: c.id,
      name: c.name,
      uid: c.uid,
      chestNumber: c.chestNumber,
      photo: c.photo || c.photoUrl || null,
      categoryId: c.categoryId,
      categoryName: c.category?.name || "General",
      institutionId: inst?.id || "",
      institutionCode: inst?.code || null,
      institutionName: inst?.name || c.team?.name || "Unknown",
      institutionPlace: inst?.place || null,
      zoneId: zone?.id || "",
      zoneCode: zone?.code || "—",
      zoneName: zone?.name || "General Zone",
      teamId: c.teamId,
      isConfirmed: Boolean(c.chestNumber),
      programs: (c.programs || []).map((p) => ({
        id: p.program?.id,
        code: p.program?.programCode,
        name: p.program?.name,
        stageType: p.program?.stageType,
      })),
    };
  });

  return (
    <ChestNumbersMasterClient
      festName={settings.festName}
      festMoto={settings.festMoto}
      userRole={role}
      userZoneId={fullUser?.zoneId || null}
      totalCandidatesCount={totalCandidates}
      confirmedCount={withChest.length}
      pendingCount={pendingCandidates.length}
      duplicateCount={duplicates.length}
      duplicateNumbers={duplicates}
      pendingByZone={pendingByZone}
      pendingInstitutions={pendingInstitutions}
      allCandidates={serializableCandidates}
      zones={zones.map((z) => ({ id: z.id, code: z.code, name: z.name }))}
      institutions={institutions.map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        place: i.place,
        zoneId: i.zoneId,
        zoneCode: i.zone.code,
        zoneName: i.zone.name,
      }))}
      initialTab={searchParams.tab || (pendingCandidates.length > 0 ? "pending" : "institution")}
      initialZoneId={searchParams.zoneId || null}
      initialInstitutionId={searchParams.institutionId || null}
    />
  );
}
