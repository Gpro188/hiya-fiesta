import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ProgramStateSelectedView, { StateProgram, StateWinner } from "./ProgramStateSelectedView";

export const dynamic = 'force-dynamic';

export default async function InstitutionStateSelectedPage(props: {
  searchParams: Promise<{ teamId?: string; institutionId?: string; eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  let eventId = searchParams.eventId;
  const teamId = searchParams.teamId;
  const institutionId = searchParams.institutionId;

  // Resolve eventId from team if not provided directly
  if (!eventId && teamId) {
    const t = await prisma.team.findUnique({
      where: { id: teamId },
      select: { eventId: true }
    });
    if (t) eventId = t.eventId;
  }

  if (!eventId && institutionId) {
    const t = await prisma.team.findFirst({
      where: { institutionId },
      select: { eventId: true }
    });
    if (t) eventId = t.eventId;
  }

  // Fallback to latest zonal event if eventId still missing
  if (!eventId) {
    const defaultEv = await prisma.event.findFirst({
      where: { parentId: { not: null } },
      orderBy: { createdAt: 'desc' }
    });
    eventId = defaultEv?.id;
  }

  let activeEv: any = null;
  if (eventId) {
    activeEv = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true }
    });
  }

  if (!activeEv) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h2>Event / Zone not found</h2>
        <p>Please select an active event from the festival dashboard.</p>
      </div>
    );
  }

  const settings = await getSettings(eventId);
  const zoneName = activeEv.zone?.name || activeEv.name || "Zonal Festival";
  const festName = settings.festName || activeEv.parent?.name || "CSWC Hiya Fiesta 2026";
  const festLogo = settings.festLogo || null;

  // 1. Fetch all teams in this event for the institution filter dropdown
  const teams = await prisma.team.findMany({
    where: { eventId: activeEv.id },
    include: { institution: true },
    orderBy: { name: "asc" }
  });

  const institutionsList = teams.map(t => ({
    id: t.id,
    name: t.institution?.name || t.name,
    code: t.institution?.code || t.prefixCode
  }));

  // 2. Fetch all raw results associated with this event's teams/candidates OR event programs
  const rawResults = await prisma.result.findMany({
    where: {
      OR: [
        { team: { eventId: activeEv.id } },
        { candidate: { team: { eventId: activeEv.id } } },
        { program: { eventId: activeEv.id } }
      ],
      rank: { not: null }
    },
    include: {
      program: {
        include: { category: true }
      },
      candidate: {
        include: {
          team: { include: { institution: true } },
          category: true,
          masterStudent: true
        }
      },
      team: {
        include: { institution: true }
      }
    },
    orderBy: [
      { rank: "asc" },
      { marks: "desc" }
    ]
  });

  // 3. Fetch explicit StateQualification entries if any exist
  const explicitStateQuals = await prisma.stateQualification.findMany({
    where: {
      OR: [
        { candidate: { team: { eventId: activeEv.id } } },
        { program: { eventId: activeEv.id } }
      ]
    },
    include: {
      candidate: {
        include: {
          team: { include: { institution: true } },
          category: true,
          masterStudent: true
        }
      },
      program: {
        include: { category: true }
      }
    }
  });

  // 4. Fetch group program participants from ProgramAssignment for this event's teams
  const groupAssignments = await prisma.programAssignment.findMany({
    where: {
      candidate: {
        team: { eventId: activeEv.id }
      }
    },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          chestNumber: true,
          teamId: true
        }
      },
      program: {
        select: {
          id: true,
          programCode: true,
          name: true
        }
      }
    }
  });

  // Map participants by programCode/Name + teamId
  const participantsMap = new Map<string, { name: string; chestNumber: string }[]>();
  for (const a of groupAssignments) {
    const code = a.program.programCode ? a.program.programCode.trim() : "";
    const name = a.program.name.trim().toLowerCase();
    const teamId = a.candidate.teamId;

    if (code) {
      const key = `${code}_${teamId}`;
      if (!participantsMap.has(key)) participantsMap.set(key, []);
      participantsMap.get(key)!.push({
        name: a.candidate.name,
        chestNumber: a.candidate.chestNumber || "-"
      });
    }
    const nameKey = `${name}_${teamId}`;
    if (!participantsMap.has(nameKey)) participantsMap.set(nameKey, []);
    participantsMap.get(nameKey)!.push({
      name: a.candidate.name,
      chestNumber: a.candidate.chestNumber || "-"
    });
  }

  // 5. Build program-based qualification map
  // Rules:
  // - Category (FADHILA / FADHEELA): Rank 1 & 2 are State Qualified
  // - General Programs: ONLY 1st Place (Rank 1) is State Qualified
  // - Magazine (Code 43 / name contains magazine): Show ONLY Institution, no candidate list!
  // - General Group Programs: Show 1st Place with Institution name AND participants candidate list!
  const programsMap = new Map<string, StateProgram>();

  function normalizeCategory(catName?: string | null): "FADHILA" | "FADHEELA" | "GENERAL" {
    if (!catName) return "GENERAL";
    const u = catName.toUpperCase();
    if (u.includes("FADHEELA")) return "FADHEELA";
    if (u.includes("FADHILA")) return "FADHILA";
    return "GENERAL";
  }

  function getProgramKey(code: string | null, name: string, category: string): string {
    return `${code || ""}_${name.trim().toLowerCase()}_${category}`;
  }

  for (const res of rawResults) {
    const p = res.program;
    const catName = p.category?.name || "";
    let normalizedCat = normalizeCategory(catName);
    if (p.type === "GENERAL" || !p.categoryId) {
      normalizedCat = "GENERAL";
    }

    const isGeneral = normalizedCat === "GENERAL";
    const isMagazine = (p.programCode === "43") || p.name.toLowerCase().includes("magaz");
    const maxRank = isGeneral ? 1 : 2;

    if (!res.rank || res.rank > maxRank) continue;

    const progCode = p.programCode ? p.programCode.trim() : "-";
    const progKey = getProgramKey(p.programCode, p.name, normalizedCat);

    if (!programsMap.has(progKey)) {
      programsMap.set(progKey, {
        id: p.id,
        code: progCode,
        name: p.name,
        category: normalizedCat,
        type: p.type || "INDIVIDUAL",
        stageType: p.stageType || "ON_STAGE",
        isGeneral,
        isMagazine,
        qualificationRule: isGeneral 
          ? (isMagazine ? "1st Place Only (Institution)" : "1st Place Only") 
          : "Top 2 (1st & 2nd Place)",
        winners: []
      });
    }

    const team = res.team || res.candidate?.team;
    const currentTeamId = team?.id || "";
    const teamName = team?.name || "General Team";
    const instName = team?.institution?.name || teamName;
    const instCode = team?.institution?.code || team?.prefixCode || "-";

    // Lookup participants for group programs
    let participants: { name: string; chestNumber: string }[] | undefined = undefined;
    if (!isMagazine && currentTeamId) {
      const byCodeKey = `${progCode}_${currentTeamId}`;
      const byNameKey = `${p.name.trim().toLowerCase()}_${currentTeamId}`;
      const found = participantsMap.get(byCodeKey) || participantsMap.get(byNameKey);
      if (found && found.length > 0) {
        participants = found;
      }
    }

    const winner: StateWinner = {
      rank: res.rank,
      grade: res.grade,
      marks: res.marks || 0,
      candidateName: isMagazine ? null : (res.candidate?.name || null),
      chestNumber: res.candidate?.chestNumber || "-",
      uid: res.candidate?.uid || res.candidate?.masterStudent?.uid || null,
      institutionName: instName,
      institutionCode: instCode,
      teamId: currentTeamId,
      teamName,
      participants
    };

    // Avoid duplicate winner records for the same team / candidate in this program
    const existing = programsMap.get(progKey)!.winners;
    const isDup = existing.some(w => 
      w.rank === winner.rank && 
      (isMagazine 
        ? w.institutionCode === winner.institutionCode 
        : (winner.candidateName ? w.candidateName === winner.candidateName : w.teamId === winner.teamId))
    );

    if (!isDup) {
      existing.push(winner);
    }
  }

  // Also include any explicit state qualifications not captured above
  for (const sq of explicitStateQuals) {
    const p = sq.program;
    const c = sq.candidate;
    const catName = p.category?.name || c.category?.name || "";
    const normalizedCat = normalizeCategory(catName);
    const isGeneral = normalizedCat === "GENERAL";
    const isMagazine = (p.programCode === "43") || p.name.toLowerCase().includes("magaz");
    const progCode = p.programCode ? p.programCode.trim() : "-";
    const progKey = getProgramKey(p.programCode, p.name, normalizedCat);

    if (!programsMap.has(progKey)) {
      programsMap.set(progKey, {
        id: p.id,
        code: progCode,
        name: p.name,
        category: normalizedCat,
        type: p.type || "INDIVIDUAL",
        stageType: p.stageType || "ON_STAGE",
        isGeneral,
        isMagazine,
        qualificationRule: isGeneral ? "1st Place Only" : "Top 2 (1st & 2nd Place)",
        winners: []
      });
    }

    const team = c.team;
    const currentTeamId = team?.id || "";
    const teamName = team?.name || "General Team";
    const instName = team?.institution?.name || teamName;
    const instCode = team?.institution?.code || team?.prefixCode || "-";

    const winner: StateWinner = {
      rank: sq.originalRank || 1,
      grade: null,
      marks: 0,
      candidateName: isMagazine ? null : c.name,
      chestNumber: c.chestNumber || "-",
      uid: c.uid || c.masterStudent?.uid || null,
      institutionName: instName,
      institutionCode: instCode,
      teamId: currentTeamId,
      teamName
    };

    const existing = programsMap.get(progKey)!.winners;
    const isDup = existing.some(w => w.candidateName === winner.candidateName && w.rank === winner.rank);
    if (!isDup) {
      existing.push(winner);
    }
  }

  // Sort winners inside each program by rank (1st place first)
  for (const [_, prog] of programsMap) {
    prog.winners.sort((a, b) => a.rank - b.rank);
  }

  // Convert to array and sort programs:
  // 1. By Category order: FADHILA -> FADHEELA -> GENERAL
  // 2. By numeric Program Code (1, 2, 3...)
  // 3. By Name
  const categoryPriority: Record<string, number> = {
    FADHILA: 1,
    FADHEELA: 2,
    GENERAL: 3
  };

  const sortedPrograms: StateProgram[] = Array.from(programsMap.values()).sort((a, b) => {
    const catDiff = (categoryPriority[a.category] || 99) - (categoryPriority[b.category] || 99);
    if (catDiff !== 0) return catDiff;

    const numA = parseInt(a.code, 10);
    const numB = parseInt(b.code, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <ProgramStateSelectedView
      programs={sortedPrograms}
      zoneName={zoneName}
      eventName={activeEv.name}
      festName={festName}
      festLogo={festLogo}
      institutions={institutionsList}
      initialTeamId={teamId}
    />
  );
}
