import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DistributionSheetPage(props: {
  searchParams: Promise<{
    eventId?: string;
    zoneId?: string;
    mode?: "program" | "student" | "institution";
    place?: string; // "all" | "1" | "2" | "3"
    category?: string; // "ALL" | "FADHILA" | "FADHEELA" | "GENERAL"
    stageType?: string; // "ALL" | "ON_STAGE" | "OFF_STAGE"
    orientation?: string; // "landscape" | "portrait"
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  const orientation = searchParams.orientation === "portrait" ? "portrait" : "landscape";
  const viewMode = searchParams.mode || "program"; // "program" | "student" | "institution"
  const placeFilter = searchParams.place || "all"; // "all" | "1" | "2" | "3"
  const categoryFilter = searchParams.category || "ALL";
  const stageTypeFilter = searchParams.stageType || "ALL";

  // 1. Resolve full user details
  const user = session?.user;
  const fullUser = user?.id
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { eventId: true, zoneId: true, role: true }
      })
    : null;

  const userRole = fullUser?.role || user?.role || "GUEST";
  const userZoneId = fullUser?.zoneId || (user as any)?.zoneId || null;
  const userEventId = fullUser?.eventId || user?.eventId || null;

  // 2. Fetch available events for switcher
  let eventWhere: any = {};
  if (userRole === "ZONE_ADMIN" && userZoneId) {
    eventWhere = { zoneId: userZoneId };
  } else if (userRole === "ZONE_ADMIN" && userEventId) {
    eventWhere = { OR: [{ id: userEventId }, { parentId: userEventId }] };
  }

  const allAvailableEvents = await prisma.event.findMany({
    where: eventWhere,
    include: { zone: true },
    orderBy: { updatedAt: "desc" }
  });

  // 3. Determine target event
  let targetEventId = searchParams.eventId || null;
  if (!targetEventId) {
    if (allAvailableEvents.length > 0) {
      // Prioritize zone event with completed or live status
      const completedOrLive = allAvailableEvents.find(e =>
        ["COMPLETED", "LIVE", "SCHEDULE_PUBLISHED"].includes(e.statusOverride || "")
      );
      targetEventId = completedOrLive ? completedOrLive.id : allAvailableEvents[0].id;
    } else {
      const defaultEv = await prisma.event.findFirst({
        where: { type: "ZONE" },
        include: { zone: true },
        orderBy: { updatedAt: "desc" }
      });
      targetEventId = defaultEv?.id || null;
    }
  }

  if (!targetEventId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>No Zone Event Found</h2>
        <p>Please select an active zone event to print the distribution marking list.</p>
        <Link href="/dashboard/reports" className="btn btn-primary">Go to Reports</Link>
      </div>
    );
  }

  const [targetEvent, settings, allCategories] = await Promise.all([
    prisma.event.findUnique({
      where: { id: targetEventId },
      include: {
        zone: true,
        parent: true
      }
    }),
    getSettings(targetEventId),
    prisma.category.findMany({ orderBy: { name: "asc" } })
  ]);

  if (!targetEvent) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Event not found</h2>
        <Link href="/dashboard/reports">Back to Reports</Link>
      </div>
    );
  }

  // 4. Determine rank filter condition
  const allowedRanks = placeFilter === "1" ? [1] : placeFilter === "2" ? [2] : placeFilter === "3" ? [3] : [1, 2, 3];

  // 5. Query results for target event
  const rawResults = await prisma.result.findMany({
    where: {
      rank: { in: allowedRanks },
      OR: [
        { team: { eventId: targetEvent.id } },
        { candidate: { team: { eventId: targetEvent.id } } },
        { program: { eventId: targetEvent.id } }
      ]
    },
    include: {
      program: {
        include: { category: true }
      },
      candidate: {
        include: {
          institution: true,
          team: { include: { institution: true } }
        }
      },
      team: {
        include: {
          institution: true
        }
      }
    },
    orderBy: [
      { program: { programCode: "asc" } },
      { program: { name: "asc" } },
      { rank: "asc" }
    ]
  });

  // Filter by category or stageType if specified
  const filteredResults = rawResults.filter((res) => {
    const prog = res.program;
    if (!prog) return false;
    if (stageTypeFilter !== "ALL" && prog.stageType !== stageTypeFilter) return false;
    if (categoryFilter !== "ALL") {
      const catName = prog.category?.name?.toUpperCase() || "GENERAL";
      if (categoryFilter === "FADHILA" && !catName.includes("FADHILA")) return false;
      if (categoryFilter === "FADHEELA" && !catName.includes("FADHEELA")) return false;
      if (categoryFilter === "GENERAL" && (catName.includes("FADHILA") || catName.includes("FADHEELA"))) return false;
    }
    return true;
  });

  // 6. Pre-fetch group team candidates to list students for Group / General programs
  const teamResults = filteredResults.filter(
    (r) => (r.teamId && !r.candidateId) || r.program.type === "GENERAL" || r.program.type === "GROUP"
  );
  const teamProgramIds = Array.from(new Set(teamResults.map((r) => r.programId)));
  const teamProgramCodes = Array.from(
    new Set(teamResults.map((r) => r.program.programCode).filter(Boolean))
  ) as string[];
  const teamIds = Array.from(new Set(teamResults.map((r) => r.teamId).filter(Boolean))) as string[];

  let teamAssignments: any[] = [];
  if ((teamProgramIds.length > 0 || teamProgramCodes.length > 0) && teamIds.length > 0) {
    teamAssignments = await prisma.programAssignment.findMany({
      where: {
        OR: [
          { programId: { in: teamProgramIds } },
          { program: { programCode: { in: teamProgramCodes } } }
        ],
        candidate: {
          teamId: { in: teamIds }
        }
      },
      include: {
        program: { select: { id: true, programCode: true } },
        candidate: {
          include: {
            institution: true
          }
        }
      },
      orderBy: [
        { slotNumber: "asc" },
        { candidate: { chestNumber: "asc" } },
        { candidate: { name: "asc" } }
      ]
    });
  }

  // Helper map: key `${programId}_${teamId}` -> Candidate[]
  const teamCandidatesMap = new Map<string, any[]>();
  for (const ta of teamAssignments) {
    const key1 = `${ta.programId}_${ta.candidate.teamId}`;
    const key2 = `${ta.program?.programCode}_${ta.candidate.teamId}`;
    if (!teamCandidatesMap.has(key1)) teamCandidatesMap.set(key1, []);
    teamCandidatesMap.get(key1)!.push(ta.candidate);
    if (!teamCandidatesMap.has(key2)) teamCandidatesMap.set(key2, []);
    teamCandidatesMap.get(key2)!.push(ta.candidate);
  }

  // 7. Group Results by Program for Program Gazette view
  interface ProgramGroup {
    program: any;
    winners: Array<{
      resultId: string;
      rank: number;
      grade: string | null;
      marks: number | null;
      points: number | null;
      isGroupOrGeneral: boolean;
      isMagazine: boolean;
      participantName: string;
      chestNumber: string;
      institutionName: string;
      institutionCode?: string;
      groupMembers: Array<{ id: string; name: string; chestNumber: string }>;
    }>;
  }

  const programMap = new Map<string, ProgramGroup>();

  for (const r of filteredResults) {
    const prog = r.program;
    if (!prog) continue;

    if (!programMap.has(prog.id)) {
      programMap.set(prog.id, {
        program: prog,
        winners: []
      });
    }

    const isMag =
      (prog.name || "").toLowerCase().includes("magazine") ||
      prog.programCode === "43" ||
      (prog.type || "").toUpperCase() === "INSTITUTION";

    const isGroupOrGeneral =
      !r.candidateId ||
      prog.type === "GENERAL" ||
      prog.type === "GROUP";

    let participantName = r.candidate?.name || r.team?.name || "Participant";
    let chestNumber = r.candidate?.chestNumber || "-";
    let institutionName =
      r.candidate?.institution?.name ||
      r.candidate?.team?.institution?.name ||
      r.team?.institution?.name ||
      r.team?.name ||
      "-";
    let institutionCode =
      r.candidate?.institution?.code ||
      r.candidate?.team?.institution?.code ||
      r.team?.institution?.code ||
      "";

    let groupMembers: Array<{ id: string; name: string; chestNumber: string }> = [];

    if (isGroupOrGeneral && r.teamId) {
      const candidates =
        teamCandidatesMap.get(`${prog.id}_${r.teamId}`) ||
        teamCandidatesMap.get(`${prog.programCode}_${r.teamId}`) ||
        [];
      groupMembers = candidates.map((c) => ({
        id: c.id,
        name: c.name,
        chestNumber: c.chestNumber || "-"
      }));
      if (groupMembers.length > 0 && (!chestNumber || chestNumber === "-")) {
        chestNumber = groupMembers.map((m) => m.chestNumber).join(", ");
      }
    }

    programMap.get(prog.id)!.winners.push({
      resultId: r.id,
      rank: r.rank || 0,
      grade: r.grade || null,
      marks: r.marks || null,
      points: r.points || null,
      isGroupOrGeneral,
      isMagazine: isMag,
      participantName,
      chestNumber,
      institutionName,
      institutionCode,
      groupMembers
    });
  }

  // Sort winners inside each program by rank
  const programGroups = Array.from(programMap.values()).map((pg) => ({
    ...pg,
    winners: pg.winners.sort((a, b) => a.rank - b.rank)
  }));

  // Sort programs by programCode numerical/alphabetical
  programGroups.sort((a, b) => {
    const codeA = parseInt(a.program.programCode || "999", 10);
    const codeB = parseInt(b.program.programCode || "999", 10);
    if (!isNaN(codeA) && !isNaN(codeB) && codeA !== codeB) return codeA - codeB;
    return (a.program.name || "").localeCompare(b.program.name || "");
  });

  // 8. Generate Flat List of All Student Winners for Student-by-Student View
  interface StudentRow {
    slNo: number;
    resultId: string;
    programCode: string;
    programName: string;
    category: string;
    stageType: string;
    rank: number;
    grade: string | null;
    studentName: string;
    chestNumber: string;
    institutionName: string;
    isGroupMember: boolean;
    isMagazine: boolean;
    isTeamLeaderRow?: boolean;
    trophyCount: number;
    certCount: number;
  }

  const allStudentRows: StudentRow[] = [];
  let studentSl = 1;

  for (const pg of programGroups) {
    for (const w of pg.winners) {
      if (w.isMagazine) {
        allStudentRows.push({
          slNo: studentSl++,
          resultId: w.resultId,
          programCode: pg.program.programCode || "-",
          programName: pg.program.name,
          category: pg.program.category?.name || "General",
          stageType: pg.program.stageType || "OFF_STAGE",
          rank: w.rank,
          grade: w.grade,
          studentName: `🏛️ ${w.institutionName} (Magazine Entry)`,
          chestNumber: w.chestNumber !== "-" ? w.chestNumber : "INST-MAG",
          institutionName: w.institutionName,
          isGroupMember: false,
          isMagazine: true,
          trophyCount: 1,
          certCount: 0
        });
      } else if (w.groupMembers && w.groupMembers.length > 0) {
        let first = true;
        for (const gm of w.groupMembers) {
          allStudentRows.push({
            slNo: studentSl++,
            resultId: `${w.resultId}_${gm.id}`,
            programCode: pg.program.programCode || "-",
            programName: pg.program.name,
            category: pg.program.category?.name || "General",
            stageType: pg.program.stageType || "ON_STAGE",
            rank: w.rank,
            grade: w.grade,
            studentName: gm.name,
            chestNumber: gm.chestNumber,
            institutionName: w.institutionName,
            isGroupMember: true,
            isMagazine: false,
            isTeamLeaderRow: first,
            trophyCount: first ? 1 : 0,
            certCount: 1
          });
          first = false;
        }
      } else {
        allStudentRows.push({
          slNo: studentSl++,
          resultId: w.resultId,
          programCode: pg.program.programCode || "-",
          programName: pg.program.name,
          category: pg.program.category?.name || "General",
          stageType: pg.program.stageType || "ON_STAGE",
          rank: w.rank,
          grade: w.grade,
          studentName: w.participantName,
          chestNumber: w.chestNumber,
          institutionName: w.institutionName,
          isGroupMember: false,
          isMagazine: false,
          trophyCount: 1,
          certCount: 1
        });
      }
    }
  }

  // 9. Generate Institution-wise Handover Groups
  interface InstitutionHandoverGroup {
    institutionName: string;
    institutionCode?: string;
    items: StudentRow[];
    total1stTrophies: number;
    total2ndTrophies: number;
    total3rdTrophies: number;
    totalTrophies: number;
    totalCertificates: number;
  }

  const instMap = new Map<string, InstitutionHandoverGroup>();
  for (const row of allStudentRows) {
    const instName = row.institutionName;
    if (!instMap.has(instName)) {
      instMap.set(instName, {
        institutionName: instName,
        items: [],
        total1stTrophies: 0,
        total2ndTrophies: 0,
        total3rdTrophies: 0,
        totalTrophies: 0,
        totalCertificates: 0
      });
    }
    const group = instMap.get(instName)!;
    group.items.push(row);
    if (row.trophyCount > 0) {
      group.totalTrophies += row.trophyCount;
      if (row.rank === 1) group.total1stTrophies += row.trophyCount;
      else if (row.rank === 2) group.total2ndTrophies += row.trophyCount;
      else if (row.rank === 3) group.total3rdTrophies += row.trophyCount;
    }
    group.totalCertificates += row.certCount;
  }

  const institutionGroups = Array.from(instMap.values()).sort((a, b) =>
    a.institutionName.localeCompare(b.institutionName)
  );

  // 10. Audit Totals
  let total1stTrophies = 0;
  let total2ndTrophies = 0;
  let total3rdTrophies = 0;
  let grandTotalTrophies = 0;
  let grandTotalCertificates = 0;

  for (const row of allStudentRows) {
    if (row.trophyCount > 0) {
      grandTotalTrophies += row.trophyCount;
      if (row.rank === 1) total1stTrophies += row.trophyCount;
      else if (row.rank === 2) total2ndTrophies += row.trophyCount;
      else if (row.rank === 3) total3rdTrophies += row.trophyCount;
    }
    grandTotalCertificates += row.certCount;
  }

  const zoneDisplayName = targetEvent.zone?.name || targetEvent.name;
  const zoneDisplayCode = targetEvent.zone?.code ? `[${targetEvent.zone.code}]` : "";

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", padding: "16px" }}>
      {/* Print-specific style definitions */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: ${orientation};
              margin: 8mm 8mm 10mm 8mm;
            }
            @media print {
              body {
                background: #ffffff !important;
                color: #000000 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .print-container {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                background: #ffffff !important;
              }
              .page-break-avoid {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              .page-break-after {
                break-after: page !important;
                page-break-after: always !important;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid !important;
                page-break-after: auto;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
              .print-border {
                border-color: #000000 !important;
              }
            }
          `
        }}
      />

      {/* SCREEN CONTROLS BAR (.no-print) */}
      <div
        className="no-print"
        style={{
          maxWidth: "1350px",
          margin: "0 auto 16px auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          border: "1px solid #e2e8f0"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.6rem" }}>🏆</span>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
                Prize, Trophy &amp; Certificate Distribution Sheet
              </h2>
              <span style={{ padding: "3px 9px", borderRadius: "6px", backgroundColor: "#fef3c7", color: "#b45309", fontSize: "0.75rem", fontWeight: 800, border: "1px solid #fde68a" }}>
                {zoneDisplayName} {zoneDisplayCode}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Official verification &amp; physical handover register with student chest numbers, checkboxes (Trophy &bull; Certificate), and signature column.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <PrintButton label="Print Distribution Sheet (PDF)" color="#2563eb" />
            <Link
              href={`/api/reports/trophy-audit-excel?eventId=${targetEventId}`}
              download="Trophy_Certificate_Distribution_Audit.xlsx"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontWeight: 700,
                borderRadius: "6px",
                fontSize: "0.88rem",
                textDecoration: "none"
              }}
              title="Download Excel Sheet for Tabulation Room"
            >
              📊 Audit Excel (.xlsx)
            </Link>
            <Link
              href="/dashboard/reports"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 14px",
                backgroundColor: "#f1f5f9",
                color: "#334155",
                fontWeight: 700,
                borderRadius: "6px",
                fontSize: "0.88rem",
                textDecoration: "none",
                border: "1px solid #cbd5e1"
              }}
            >
              ← Back to Hub
            </Link>
          </div>
        </div>

        {/* View Mode Tabs & Filter Controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
          {/* Mode Switcher */}
          <div style={{ display: "inline-flex", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "8px", gap: "3px" }}>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=program&place=${placeFilter}&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=${orientation}`}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: viewMode === "program" ? "#ffffff" : "transparent",
                color: viewMode === "program" ? "#0f172a" : "#64748b",
                boxShadow: viewMode === "program" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              📋 By Program (1st, 2nd, 3rd)
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=student&place=${placeFilter}&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=${orientation}`}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: viewMode === "student" ? "#ffffff" : "transparent",
                color: viewMode === "student" ? "#0f172a" : "#64748b",
                boxShadow: viewMode === "student" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              👤 Student Master Roster ({allStudentRows.length})
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=institution&place=${placeFilter}&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=${orientation}`}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: viewMode === "institution" ? "#ffffff" : "transparent",
                color: viewMode === "institution" ? "#0f172a" : "#64748b",
                boxShadow: viewMode === "institution" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              🏛️ College Handover Pack ({institutionGroups.length})
            </Link>
          </div>

          {/* Place Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
            <span>Position:</span>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${viewMode}&place=all&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=${orientation}`}
              style={{
                padding: "4px 8px",
                borderRadius: "5px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: placeFilter === "all" ? "#0f172a" : "#f1f5f9",
                color: placeFilter === "all" ? "#fff" : "#475569"
              }}
            >
              All 3 Places
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${viewMode}&place=1&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=${orientation}`}
              style={{
                padding: "4px 8px",
                borderRadius: "5px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: placeFilter === "1" ? "#b45309" : "#f1f5f9",
                color: placeFilter === "1" ? "#fff" : "#475569"
              }}
            >
              🥇 1st Only
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${viewMode}&place=2&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=${orientation}`}
              style={{
                padding: "4px 8px",
                borderRadius: "5px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: placeFilter === "2" ? "#475569" : "#f1f5f9",
                color: placeFilter === "2" ? "#fff" : "#475569"
              }}
            >
              🥈 2nd Only
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${viewMode}&place=3&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=${orientation}`}
              style={{
                padding: "4px 8px",
                borderRadius: "5px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: placeFilter === "3" ? "#c2410c" : "#f1f5f9",
                color: placeFilter === "3" ? "#fff" : "#475569"
              }}
            >
              🥉 3rd Only
            </Link>
          </div>

          {/* Orientation Switcher */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
            <span>Page Layout:</span>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${viewMode}&place=${placeFilter}&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=landscape`}
              style={{
                padding: "4px 10px",
                borderRadius: "5px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: orientation === "landscape" ? "#2563eb" : "#f1f5f9",
                color: orientation === "landscape" ? "#fff" : "#475569"
              }}
            >
              Landscape (Wide)
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${viewMode}&place=${placeFilter}&category=${categoryFilter}&stageType=${stageTypeFilter}&orientation=portrait`}
              style={{
                padding: "4px 10px",
                borderRadius: "5px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: orientation === "portrait" ? "#2563eb" : "#f1f5f9",
                color: orientation === "portrait" ? "#fff" : "#475569"
              }}
            >
              Portrait
            </Link>
          </div>
        </div>
      </div>

      {/* PRINT CONTAINER (A4 PRINT READY) */}
      <div
        className="print-container"
        style={{
          maxWidth: orientation === "landscape" ? "1350px" : "900px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#0f172a"
        }}
      >
        {/* OFFICIAL FESTIVAL HEADER */}
        <div style={{ borderBottom: "2.5px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {settings?.festLogo && (
                <img
                  src={settings.festLogo}
                  alt="Fest Logo"
                  style={{ width: "52px", height: "52px", objectFit: "contain" }}
                />
              )}
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
                  COUNCIL OF SAMASTHA WOMEN'S COLLEGES (CSWC)
                </div>
                <h1 style={{ margin: "2px 0 0 0", fontSize: "1.45rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em" }}>
                  HIYA FIESTA 2026 &bull; {zoneDisplayName.toUpperCase()} {zoneDisplayCode}
                </h1>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#b45309", marginTop: "2px" }}>
                  PRIZE, TROPHY &amp; CERTIFICATE DISTRIBUTION MARKING REGISTER
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#475569", lineHeight: 1.4 }}>
              <div><strong>Document:</strong> Prize Distribution Roster</div>
              <div><strong>Date:</strong> {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
              <div><strong>Status:</strong> {targetEvent.statusOverride === "COMPLETED" ? "🔒 Fest Concluded" : "🟢 Official Active"}</div>
            </div>
          </div>

          {/* AUDIT SUMMARY STATS STRIP */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "12px",
              padding: "8px 12px",
              backgroundColor: "#f8fafc",
              border: "1.5px solid #0f172a",
              borderRadius: "6px",
              fontSize: "0.78rem"
            }}
          >
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
              <span>Programs Evaluated: <strong>{programGroups.length}</strong></span>
              <span>&bull;</span>
              <span>🥇 1st Place: <strong>{total1stTrophies}</strong></span>
              <span>&bull;</span>
              <span>🥈 2nd Place: <strong>{total2ndTrophies}</strong></span>
              <span>&bull;</span>
              <span>🥉 3rd Place: <strong>{total3rdTrophies}</strong></span>
            </div>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", fontWeight: 800 }}>
              <span style={{ color: "#b45309" }}>🏆 Trophies: {grandTotalTrophies}</span>
              <span>&bull;</span>
              <span style={{ color: "#4338ca" }}>📜 Certificates: {grandTotalCertificates}</span>
              <span>&bull;</span>
              <span style={{ color: "#047857" }}>👥 Recipients: {allStudentRows.length}</span>
            </div>
          </div>
        </div>

        {/* VIEW MODE A: BY PROGRAM (1ST, 2ND, 3RD GAZETTE - DEFAULT) */}
        {viewMode === "program" && (
          <div>
            <div style={{ marginBottom: "10px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
              Showing {programGroups.length} programs with 1st, 2nd &amp; 3rd place winners in sequential award ceremony order:
            </div>

            {programGroups.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1" }}>
                No published or recorded results found for the selected filter criteria.
              </div>
            ) : (
              programGroups.map((pg, pIdx) => (
                <div
                  key={pg.program.id}
                  className="page-break-avoid"
                  style={{
                    marginBottom: "16px",
                    border: "1.5px solid #0f172a",
                    borderRadius: "6px",
                    overflow: "hidden"
                  }}
                >
                  {/* Program Header */}
                  <div
                    style={{
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      padding: "6px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          backgroundColor: "#f59e0b",
                          color: "#0f172a",
                          padding: "1px 7px",
                          borderRadius: "4px",
                          fontWeight: 900,
                          fontSize: "0.82rem",
                          fontFamily: "monospace"
                        }}
                      >
                        #{pg.program.programCode || pIdx + 1}
                      </span>
                      <strong style={{ fontSize: "0.95rem" }}>{pg.program.name}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.74rem" }}>
                      <span style={{ backgroundColor: "#334155", padding: "2px 8px", borderRadius: "4px" }}>
                        Category: <strong>{pg.program.category?.name || "General"}</strong>
                      </span>
                      <span style={{ backgroundColor: "#334155", padding: "2px 8px", borderRadius: "4px" }}>
                        Stage: <strong>{pg.program.stageType}</strong>
                      </span>
                      <span style={{ backgroundColor: "#334155", padding: "2px 8px", borderRadius: "4px" }}>
                        Type: <strong>{pg.program.type}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Winners Table */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.78rem",
                      textAlign: "left"
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", color: "#334155", borderBottom: "1.5px solid #0f172a" }}>
                        <th style={{ padding: "6px 8px", width: "95px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>Position</th>
                        <th style={{ padding: "6px 8px", width: "95px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>Chest No.</th>
                        <th style={{ padding: "6px 10px", width: "240px", borderRight: "1px solid #cbd5e1" }}>Winner / Student Name</th>
                        <th style={{ padding: "6px 10px", borderRight: "1px solid #cbd5e1" }}>College / Institution</th>
                        <th style={{ padding: "6px 8px", width: "75px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>Grade</th>
                        <th style={{ padding: "6px 8px", width: "85px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>Trophy</th>
                        <th style={{ padding: "6px 8px", width: "95px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>Certificate</th>
                        <th style={{ padding: "6px 12px", width: "160px", textAlign: "center" }}>Recipient Signature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pg.winners.map((w, wIdx) => {
                        const rankLabel = w.rank === 1 ? "🥇 1st Place" : w.rank === 2 ? "🥈 2nd Place" : w.rank === 3 ? "🥉 3rd Place" : `Rank ${w.rank}`;
                        const rankBg = w.rank === 1 ? "#fef3c7" : w.rank === 2 ? "#f1f5f9" : "#ffedd5";
                        const rankColor = w.rank === 1 ? "#92400e" : w.rank === 2 ? "#334155" : "#9a3412";

                        return (
                          <tr
                            key={w.resultId}
                            style={{
                              borderBottom: wIdx === pg.winners.length - 1 ? "none" : "1px solid #cbd5e1",
                              backgroundColor: wIdx % 2 === 0 ? "#ffffff" : "#fafafa"
                            }}
                          >
                            {/* Position */}
                            <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: rankBg,
                                  color: rankColor,
                                  fontWeight: 800,
                                  fontSize: "0.76rem",
                                  border: "1px solid rgba(0,0,0,0.1)"
                                }}
                              >
                                {rankLabel}
                              </span>
                            </td>

                            {/* Chest No */}
                            <td
                              style={{
                                padding: "8px",
                                textAlign: "center",
                                fontWeight: 900,
                                fontFamily: "monospace",
                                fontSize: "0.82rem",
                                color: "#0f172a",
                                borderRight: "1px solid #cbd5e1"
                              }}
                            >
                              {w.chestNumber}
                            </td>

                            {/* Winner Name */}
                            <td style={{ padding: "8px 10px", borderRight: "1px solid #cbd5e1" }}>
                              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.84rem" }}>
                                {w.participantName}
                              </div>
                              {w.groupMembers && w.groupMembers.length > 0 && (
                                <div style={{ fontSize: "0.70rem", color: "#64748b", marginTop: "3px", lineHeight: 1.3 }}>
                                  <strong>Team Members ({w.groupMembers.length}):</strong>{" "}
                                  {w.groupMembers.map((m) => `${m.name} (#${m.chestNumber})`).join(", ")}
                                </div>
                              )}
                            </td>

                            {/* College */}
                            <td style={{ padding: "8px 10px", borderRight: "1px solid #cbd5e1" }}>
                              <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.8rem" }}>
                                {w.institutionName}
                              </div>
                            </td>

                            {/* Grade */}
                            <td style={{ padding: "8px", textAlign: "center", fontWeight: 800, borderRight: "1px solid #cbd5e1" }}>
                              {w.grade ? (
                                <span
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: w.grade === "A" ? "#dcfce7" : w.grade === "B" ? "#eff6ff" : "#fef3c7",
                                    color: w.grade === "A" ? "#166534" : w.grade === "B" ? "#1e40af" : "#854d0e",
                                    fontSize: "0.74rem"
                                  }}
                                >
                                  {w.grade === "A" ? "⭐ Grade A" : w.grade === "B" ? "Grade B" : `Grade ${w.grade}`}
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>—</span>
                              )}
                            </td>

                            {/* Checkbox: Trophy */}
                            <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "4px 8px",
                                  border: "1.2px solid #0f172a",
                                  borderRadius: "4px",
                                  backgroundColor: "#ffffff",
                                  fontWeight: 700,
                                  fontSize: "0.72rem"
                                }}
                              >
                                <span style={{ display: "inline-block", width: "12px", height: "12px", border: "1.5px solid #000", borderRadius: "2px" }}></span>
                                <span>Trophy</span>
                              </div>
                            </td>

                            {/* Checkbox: Certificate */}
                            <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                              {w.isMagazine ? (
                                <span style={{ fontSize: "0.68rem", color: "#64748b", fontStyle: "italic" }}>
                                  Inst Only
                                </span>
                              ) : (
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "4px 8px",
                                    border: "1.2px solid #0f172a",
                                    borderRadius: "4px",
                                    backgroundColor: "#ffffff",
                                    fontWeight: 700,
                                    fontSize: "0.72rem"
                                  }}
                                >
                                  <span style={{ display: "inline-block", width: "12px", height: "12px", border: "1.5px solid #000", borderRadius: "2px" }}></span>
                                  <span>{w.groupMembers?.length > 1 ? `Cert (${w.groupMembers.length})` : "Cert"}</span>
                                </div>
                              )}
                            </td>

                            {/* Recipient Signature Line */}
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <div style={{ height: "26px", borderBottom: "1.2px solid #334155", margin: "0 auto", width: "90%" }}></div>
                              <div style={{ fontSize: "0.62rem", color: "#64748b", marginTop: "2px" }}>(Sign / Date)</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW MODE B: STUDENT-BY-STUDENT ROSTER */}
        {viewMode === "student" && (
          <div>
            <div style={{ marginBottom: "10px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
              Complete roster of all {allStudentRows.length} certificate &amp; trophy recipients:
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.76rem",
                border: "1.5px solid #0f172a"
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                  <th style={{ padding: "6px 4px", width: "35px" }}>Sl</th>
                  <th style={{ padding: "6px 6px", width: "85px" }}>Chest No.</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "190px" }}>Student Winner Name</th>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>College / Institution</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", width: "180px" }}>Program</th>
                  <th style={{ padding: "6px 6px", width: "85px" }}>Place</th>
                  <th style={{ padding: "6px 6px", width: "65px" }}>Grade</th>
                  <th style={{ padding: "6px 6px", width: "75px" }}>Trophy</th>
                  <th style={{ padding: "6px 6px", width: "80px" }}>Cert</th>
                  <th style={{ padding: "6px 8px", width: "145px" }}>Recipient Sign</th>
                </tr>
              </thead>
              <tbody>
                {allStudentRows.map((sr, idx) => {
                  const rankLabel = sr.rank === 1 ? "🥇 1st" : sr.rank === 2 ? "🥈 2nd" : sr.rank === 3 ? "🥉 3rd" : `#${sr.rank}`;
                  const rankBg = sr.rank === 1 ? "#fef3c7" : sr.rank === 2 ? "#f1f5f9" : "#ffedd5";

                  return (
                    <tr
                      key={sr.resultId}
                      style={{
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                        borderBottom: "1px solid #cbd5e1"
                      }}
                    >
                      <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #cbd5e1" }}>
                        {sr.slNo}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 900, fontFamily: "monospace", color: "#0f172a", borderRight: "1px solid #cbd5e1" }}>
                        {sr.chestNumber}
                      </td>
                      <td style={{ padding: "5px 8px", fontWeight: 800, color: "#0f172a", borderRight: "1px solid #cbd5e1" }}>
                        {sr.studentName}
                        {sr.isGroupMember && (
                          <span style={{ fontSize: "0.65rem", color: "#64748b", marginLeft: "4px", fontWeight: 600 }}>
                            (Group)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "5px 8px", color: "#1e3a8a", fontWeight: 600, borderRight: "1px solid #cbd5e1" }}>
                        {sr.institutionName}
                      </td>
                      <td style={{ padding: "5px 8px", borderRight: "1px solid #cbd5e1" }}>
                        <span style={{ fontWeight: 800, color: "#b45309" }}>#{sr.programCode}</span> {sr.programName}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                        <span style={{ padding: "2px 6px", borderRadius: "3px", backgroundColor: rankBg, fontWeight: 800, fontSize: "0.72rem" }}>
                          {rankLabel}
                        </span>
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 800, borderRight: "1px solid #cbd5e1" }}>
                        {sr.grade || "—"}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                        {sr.trophyCount > 0 ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.7rem", fontWeight: 700 }}>
                            <span style={{ width: "11px", height: "11px", border: "1.2px solid #000", display: "inline-block" }}></span>
                            <span>Trophy</span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.68rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "5px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                        {sr.certCount > 0 ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.7rem", fontWeight: 700 }}>
                            <span style={{ width: "11px", height: "11px", border: "1.2px solid #000", display: "inline-block" }}></span>
                            <span>Cert</span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.68rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "center" }}>
                        <div style={{ height: "20px", borderBottom: "1px solid #475569", width: "90%", margin: "0 auto" }}></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW MODE C: BY INSTITUTION (COLLEGE BUNDLE HANDOVER) */}
        {viewMode === "institution" && (
          <div>
            <div style={{ marginBottom: "10px", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
              Grouped by College/Institution for bulk handover to College Principals &amp; Staff In-charges:
            </div>

            {institutionGroups.map((inst) => (
              <div
                key={inst.institutionName}
                className="page-break-avoid"
                style={{
                  marginBottom: "16px",
                  border: "1.5px solid #0f172a",
                  borderRadius: "6px",
                  overflow: "hidden"
                }}
              >
                {/* Institution Bar */}
                <div
                  style={{
                    backgroundColor: "#1e293b",
                    color: "#ffffff",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🏛️</span>
                    <strong style={{ fontSize: "0.95rem" }}>{inst.institutionName}</strong>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "0.78rem" }}>
                    <span style={{ backgroundColor: "#334155", padding: "2px 8px", borderRadius: "4px" }}>
                      🥇 1st: <strong>{inst.total1stTrophies}</strong>
                    </span>
                    <span style={{ backgroundColor: "#334155", padding: "2px 8px", borderRadius: "4px" }}>
                      🥈 2nd: <strong>{inst.total2ndTrophies}</strong>
                    </span>
                    <span style={{ backgroundColor: "#334155", padding: "2px 8px", borderRadius: "4px" }}>
                      🥉 3rd: <strong>{inst.total3rdTrophies}</strong>
                    </span>
                    <span style={{ backgroundColor: "#b45309", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontWeight: 800 }}>
                      🏆 Trophies: {inst.totalTrophies}
                    </span>
                    <span style={{ backgroundColor: "#4338ca", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontWeight: 800 }}>
                      📜 Certificates: {inst.totalCertificates}
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", color: "#334155", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "5px 6px", width: "35px", textAlign: "center" }}>#</th>
                      <th style={{ padding: "5px 8px", width: "90px", textAlign: "center" }}>Chest No</th>
                      <th style={{ padding: "5px 8px", textAlign: "left" }}>Winning Student / Entry</th>
                      <th style={{ padding: "5px 8px", textAlign: "left" }}>Program Name</th>
                      <th style={{ padding: "5px 6px", width: "85px", textAlign: "center" }}>Position</th>
                      <th style={{ padding: "5px 6px", width: "65px", textAlign: "center" }}>Grade</th>
                      <th style={{ padding: "5px 6px", width: "75px", textAlign: "center" }}>Trophy</th>
                      <th style={{ padding: "5px 6px", width: "75px", textAlign: "center" }}>Cert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inst.items.map((it, idx) => (
                      <tr key={it.resultId} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                        <td style={{ padding: "5px 6px", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: 900, fontFamily: "monospace" }}>{it.chestNumber}</td>
                        <td style={{ padding: "5px 8px", fontWeight: 800, color: "#0f172a" }}>{it.studentName}</td>
                        <td style={{ padding: "5px 8px" }}><span style={{ fontWeight: 800, color: "#b45309" }}>#{it.programCode}</span> {it.programName}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 800 }}>
                          {it.rank === 1 ? "🥇 1st" : it.rank === 2 ? "🥈 2nd" : it.rank === 3 ? "🥉 3rd" : `#${it.rank}`}
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 800 }}>{it.grade || "—"}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>
                          {it.trophyCount > 0 ? (
                            <span style={{ display: "inline-block", width: "12px", height: "12px", border: "1.2px solid #000" }}></span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>
                          {it.certCount > 0 ? (
                            <span style={{ display: "inline-block", width: "12px", height: "12px", border: "1.2px solid #000" }}></span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* College Handover Sign-off Strip */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderTop: "1px dashed #cbd5e1",
                    padding: "8px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.74rem"
                  }}
                >
                  <div>
                    I hereby acknowledge receipt of all <strong>{inst.totalTrophies} Trophies</strong> and <strong>{inst.totalCertificates} Certificates</strong> for <strong>{inst.institutionName}</strong>:
                  </div>
                  <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                    <div>College In-Charge Name: _____________________</div>
                    <div>Signature: _____________________</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OFFICIAL FOOTER SIGNATURE BLOCK */}
        <div
          className="page-break-avoid"
          style={{
            marginTop: "24px",
            borderTop: "2px solid #0f172a",
            paddingTop: "16px"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", textAlign: "center" }}>
            <div>
              <div style={{ height: "35px", borderBottom: "1.5px dashed #475569", margin: "0 auto 6px auto", width: "80%" }}></div>
              <strong style={{ fontSize: "0.78rem", color: "#0f172a", display: "block" }}>Prize Distribution In-Charge</strong>
              <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Counter Verification</span>
            </div>

            <div>
              <div style={{ height: "35px", borderBottom: "1.5px dashed #475569", margin: "0 auto 6px auto", width: "80%" }}></div>
              <strong style={{ fontSize: "0.78rem", color: "#0f172a", display: "block" }}>Scoring &amp; Tabulation Officer</strong>
              <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Result Gazette Verification</span>
            </div>

            <div>
              <div style={{ height: "35px", borderBottom: "1.5px dashed #475569", margin: "0 auto 6px auto", width: "80%" }}></div>
              <strong style={{ fontSize: "0.78rem", color: "#0f172a", display: "block" }}>Zonal General Convener</strong>
              <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{zoneDisplayName}</span>
            </div>

            <div>
              <div style={{ height: "35px", borderBottom: "1.5px dashed #475569", margin: "0 auto 6px auto", width: "80%" }}></div>
              <strong style={{ fontSize: "0.78rem", color: "#0f172a", display: "block" }}>Zonal President / Secretary</strong>
              <span style={{ fontSize: "0.68rem", color: "#64748b" }}>CSWC Official Seal</span>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "14px", fontSize: "0.66rem", color: "#94a3b8" }}>
            Generated electronically via Council of Samastha Women's Colleges (CSWC) Fest Management System &bull; Hiya Fiesta 2026 Official Prize Distribution Register
          </div>
        </div>
      </div>
    </div>
  );
}
