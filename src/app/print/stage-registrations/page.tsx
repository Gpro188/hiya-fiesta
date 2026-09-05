import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import StageRegistrationClient from "./StageRegistrationClient";

export const dynamic = "force-dynamic";

export default async function StageRegistrationPrintPage(props: {
  searchParams: Promise<{ teamId?: string; eventId?: string; zoneId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { role, id: userId } = session.user;
  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { institutionId: true, eventId: true, zoneId: true }
  });

  let targetTeamId = searchParams.teamId;
  let allTeams: Array<{ id: string; name: string }> = [];
  const canSwitchTeams = ["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role);

  if (canSwitchTeams) {
    let teamWhere: any = {};
    if (role === "ZONE_ADMIN" && fullUser?.zoneId) {
      teamWhere = { institution: { zoneId: fullUser.zoneId } };
    } else if (searchParams.zoneId) {
      teamWhere = { institution: { zoneId: searchParams.zoneId } };
    } else if (searchParams.eventId) {
      teamWhere = { eventId: searchParams.eventId };
    }

    allTeams = await prisma.team.findMany({
      where: teamWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    });

    if (!targetTeamId && allTeams.length > 0) {
      targetTeamId = allTeams[0].id;
    }
  } else {
    // Institution Manager
    if (!fullUser?.institutionId) {
      return <div style={{ padding: "40px" }}>You are not assigned to any institution.</div>;
    }
    const myTeam = await prisma.team.findFirst({
      where: fullUser.eventId
        ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
        : { institutionId: fullUser.institutionId },
      select: { id: true }
    });
    if (!myTeam) {
      return <div style={{ padding: "40px" }}>No team found for your institution.</div>;
    }
    targetTeamId = myTeam.id;
  }

  if (!targetTeamId) {
    return <div style={{ padding: "40px" }}>No team selected or available.</div>;
  }

  const team = await prisma.team.findUnique({
    where: { id: targetTeamId },
    include: {
      institution: {
        include: {
          zone: { select: { id: true, name: true } }
        }
      },
      event: { select: { id: true, name: true } }
    }
  });

  if (!team) {
    return <div style={{ padding: "40px" }}>Team not found.</div>;
  }

  const settings = await getSettings(team.eventId);

  const candidates = await prisma.candidate.findMany({
    where: { teamId: targetTeamId },
    include: {
      category: true,
      programs: {
        include: { program: true },
        orderBy: { program: { name: "asc" } }
      }
    },
    orderBy: { name: "asc" }
  });

  const offStageItems: any[] = [];
  const onStageItems: any[] = [];

  candidates.forEach(candidate => {
    candidate.programs.forEach(pa => {
      const prog = pa.program;
      const item = {
        id: pa.id,
        candidateName: candidate.name,
        chestNumber: candidate.chestNumber,
        uid: candidate.uid,
        categoryName: candidate.category?.name || "General",
        programName: prog.name,
        programCode: prog.programCode,
        stageType: prog.stageType,
        type: prog.type
      };

      if (prog.stageType === "OFF_STAGE") {
        offStageItems.push(item);
      } else {
        onStageItems.push(item);
      }
    });
  });

  // Sort programs alphabetically
  offStageItems.sort((a, b) => a.programName.localeCompare(b.programName));
  onStageItems.sort((a, b) => a.programName.localeCompare(b.programName));

  return (
    <StageRegistrationClient
      festName={settings.festName}
      team={team}
      totalCandidates={candidates.length}
      offStageItems={offStageItems}
      onStageItems={onStageItems}
      allTeams={allTeams}
      canSwitchTeams={canSwitchTeams}
    />
  );
}
