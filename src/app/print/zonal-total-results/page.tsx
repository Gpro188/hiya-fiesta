import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ZonalTotalResultsPage(props: {
  searchParams: Promise<{
    eventId?: string;
    publishedOnly?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  // 1. Resolve user and available events
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

  let eventWhere: any = {};
  if (userRole === "ZONE_ADMIN" && userZoneId) {
    eventWhere = { zoneId: userZoneId };
  } else if (userRole === "ZONE_ADMIN" && userEventId) {
    eventWhere = { OR: [{ id: userEventId }, { parentId: userEventId }] };
  }

  const allAvailableEvents = await prisma.event.findMany({
    where: eventWhere,
    include: { zone: true },
    orderBy: { createdAt: "asc" }
  });

  // 2. Select target event
  let targetEventId = searchParams.eventId || null;
  if (!targetEventId) {
    const defaultEv = allAvailableEvents.find(
      (e) => e.statusOverride === "COMPLETED" || e.statusOverride === "LIVE"
    );
    targetEventId = defaultEv?.id || allAvailableEvents[0]?.id || null;
  }

  if (!targetEventId) {
    const firstEv = await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });
    targetEventId = firstEv?.id || null;
  }

  if (!targetEventId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>No Event Found</h2>
        <p>Please configure an event in the system first.</p>
      </div>
    );
  }

  // 3. Fetch Event, Teams, and Category definitions
  const [targetEvent, settings] = await Promise.all([
    prisma.event.findUnique({
      where: { id: targetEventId },
      include: {
        zone: true,
        parent: true,
        categories: true,
        teams: {
          include: {
            institution: { include: { zone: true } }
          }
        }
      }
    }),
    getSettings(targetEventId)
  ]);

  if (!targetEvent) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Event Not Found</h2>
        <Link href="/dashboard/reports">Back to Reports</Link>
      </div>
    );
  }

  const zoneTitle = targetEvent.zone?.name || targetEvent.name.replace(/Zone/i, "").trim() + " ZONE";
  const festName = settings?.festName || "CSWC HIYA FIESTA 2026";
  const festMoto = settings?.festMoto || "Council of Samastha Women's Colleges";

  const isPublishedOnly = searchParams.publishedOnly === "true";

  // 4. Fetch Results
  const resultWhere: any = {
    OR: [
      { candidate: { team: { eventId: targetEventId } } },
      { team: { eventId: targetEventId } },
      { program: { eventId: targetEventId } }
    ]
  };

  if (isPublishedOnly) {
    resultWhere.isPublished = true;
  }

  const allResults = await prisma.result.findMany({
    where: resultWhere,
    include: {
      candidate: {
        include: {
          team: { include: { institution: true } },
          category: true,
          masterStudent: true
        }
      },
      team: {
        include: { institution: true }
      },
      program: {
        include: {
          category: true
        }
      }
    },
    orderBy: [
      { rank: "asc" },
      { points: "desc" }
    ]
  });

  // Helper to categorize
  const detectCategory = (r: any): "FADHILA" | "FADHEELA" | "GENERAL" => {
    const progCat = (r.program?.category?.name || "").toUpperCase();
    if (progCat.includes("FADHILA")) return "FADHILA";
    if (progCat.includes("FADHEELA")) return "FADHEELA";

    const candCat = (r.candidate?.category?.name || "").toUpperCase();
    if (candCat.includes("FADHILA")) return "FADHILA";
    if (candCat.includes("FADHEELA")) return "FADHEELA";

    return "GENERAL";
  };

  // 5. Compute Team Scores & Category Subtotals
  interface TeamScoreRecord {
    id: string;
    name: string;
    place: string | null;
    prefixCode: string;
    flagColor: string | null;
    points: number;
    fadhilaPoints: number;
    fadheelaPoints: number;
    generalPoints: number;
    gold: number;
    silver: number;
    bronze: number;
    gradeA: number;
    gradeB: number;
  }

  const teamScoresMap: Record<string, TeamScoreRecord> = {};

  for (const t of targetEvent.teams) {
    let cleanName = (t.institution?.name || t.name || "").trim();
    let rawPlace = (t.institution?.place || "").trim();

    if (!rawPlace && cleanName.includes(",")) {
      const parts = cleanName.split(",");
      cleanName = parts[0].trim();
      rawPlace = parts.slice(1).join(",").trim();
    } else if (rawPlace && cleanName.toLowerCase().includes(rawPlace.toLowerCase())) {
      const escaped = rawPlace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanName = cleanName.replace(new RegExp(`,\\s*${escaped}$`, "i"), "").trim();
    }

    teamScoresMap[t.id] = {
      id: t.id,
      name: cleanName,
      place: rawPlace || null,
      prefixCode: t.prefixCode,
      flagColor: t.flagColor || null,
      points: 0,
      fadhilaPoints: 0,
      fadheelaPoints: 0,
      generalPoints: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      gradeA: 0,
      gradeB: 0
    };
  }

  // 6. Compute Individual Candidate Scores for Kalaathilakam
  interface CandidateScoreRecord {
    id: string;
    name: string;
    chestNumber: string | null;
    category: "FADHILA" | "FADHEELA" | "GENERAL";
    teamName: string;
    institutionPlace: string | null;
    points: number;
    gold: number;
    silver: number;
    bronze: number;
    gradeA: number;
    gradeB: number;
    results: Array<{
      programName: string;
      programCode: string | null;
      stageType: string | null;
      rank: number | null;
      grade: string | null;
      points: number;
    }>;
  }

  const candidateScoresMap: Record<string, CandidateScoreRecord> = {};

  for (const r of allResults) {
    const teamId = r.candidate?.teamId || r.teamId;
    if (teamId && teamScoresMap[teamId]) {
      const pts = r.points || 0;
      teamScoresMap[teamId].points += pts;
      if (r.rank === 1) teamScoresMap[teamId].gold++;
      if (r.rank === 2) teamScoresMap[teamId].silver++;
      if (r.rank === 3) teamScoresMap[teamId].bronze++;

      if (r.grade === "A") teamScoresMap[teamId].gradeA++;
      if (r.grade === "B") teamScoresMap[teamId].gradeB++;

      const cat = detectCategory(r);
      const isIndiv = r.program?.type === "INDIVIDUAL";
      if (cat === "FADHILA" && isIndiv) {
        teamScoresMap[teamId].fadhilaPoints += pts;
      } else if (cat === "FADHEELA" && isIndiv) {
        teamScoresMap[teamId].fadheelaPoints += pts;
      } else {
        teamScoresMap[teamId].generalPoints += pts;
      }
    }

    // Accumulate individual points for Kalathilakam
    if (r.candidate && r.program?.type === "INDIVIDUAL") {
      const c = r.candidate;
      const candId = c.id;
      const cat = detectCategory(r);

      if (!candidateScoresMap[candId]) {
        const candInst = c.team?.institution;
        let cleanInstName = (candInst?.name || c.team?.name || "").trim();
        let rawInstPlace = (candInst?.place || "").trim();

        if (!rawInstPlace && cleanInstName.includes(",")) {
          const parts = cleanInstName.split(",");
          cleanInstName = parts[0].trim();
          rawInstPlace = parts.slice(1).join(",").trim();
        }

        candidateScoresMap[candId] = {
          id: candId,
          name: c.name,
          chestNumber: c.chestNumber || null,
          category: cat,
          teamName: cleanInstName || c.team?.name || "Institution",
          institutionPlace: rawInstPlace || null,
          points: 0,
          gold: 0,
          silver: 0,
          bronze: 0,
          gradeA: 0,
          gradeB: 0,
          results: []
        };
      }

      candidateScoresMap[candId].points += r.points || 0;
      if (r.rank === 1) candidateScoresMap[candId].gold++;
      if (r.rank === 2) candidateScoresMap[candId].silver++;
      if (r.rank === 3) candidateScoresMap[candId].bronze++;
      if (r.grade === "A") candidateScoresMap[candId].gradeA++;
      if (r.grade === "B") candidateScoresMap[candId].gradeB++;

      candidateScoresMap[candId].results.push({
        programName: r.program?.name || "Program",
        programCode: r.program?.programCode || null,
        stageType: r.program?.stageType || null,
        rank: r.rank,
        grade: r.grade,
        points: r.points || 0
      });
    }
  }

  // 7. Overall Championship Standings
  const overallLeaderboard = Object.values(teamScoresMap).sort(
    (a, b) => b.points - a.points || b.gold - a.gold || b.silver - a.silver
  );

  const grandChampion = overallLeaderboard[0] || null;
  const firstRunnerUp = overallLeaderboard[1] || null;
  const secondRunnerUp = overallLeaderboard[2] || null;

  // 8. Category Championships
  const fadhilaLeaderboard = Object.values(teamScoresMap)
    .filter((t) => t.fadhilaPoints > 0)
    .sort((a, b) => b.fadhilaPoints - a.fadhilaPoints || b.gold - a.gold);

  const fadheelaLeaderboard = Object.values(teamScoresMap)
    .filter((t) => t.fadheelaPoints > 0)
    .sort((a, b) => b.fadheelaPoints - a.fadheelaPoints || b.gold - a.gold);

  const generalLeaderboard = Object.values(teamScoresMap)
    .filter((t) => t.generalPoints > 0)
    .sort((a, b) => b.generalPoints - a.generalPoints || b.gold - a.gold);

  // 9. Kalaathilakam (Individual Champions)
  const allCandidatesList = Object.values(candidateScoresMap);

  const fadhilaCandidates = allCandidatesList
    .filter((c) => c.category === "FADHILA")
    .sort((a, b) => b.points - a.points || b.gold - a.gold);

  const maxFadhilaPoints = fadhilaCandidates[0]?.points || 0;
  const fadhilaKalathilakams =
    maxFadhilaPoints > 0 ? fadhilaCandidates.filter((c) => c.points === maxFadhilaPoints) : [];

  const fadheelaCandidates = allCandidatesList
    .filter((c) => c.category === "FADHEELA")
    .sort((a, b) => b.points - a.points || b.gold - a.gold);

  const maxFadheelaPoints = fadheelaCandidates[0]?.points || 0;
  const fadheelaKalathilakams =
    maxFadheelaPoints > 0 ? fadheelaCandidates.filter((c) => c.points === maxFadheelaPoints) : [];

  // 10. Programs & Their Announced Results Grouped by Program & Sorted in Natural Order of Program Code
  const parseProgramCode = (code: string | null) => {
    if (!code) return { prefix: "ZZZ", num: 999999 };
    const match = code.trim().match(/^([A-Za-z]*)(\d+)(.*)$/);
    if (match) {
      return {
        prefix: match[1] || "",
        num: parseInt(match[2], 10),
        suffix: match[3] || ""
      };
    }
    return { prefix: code, num: 0, suffix: "" };
  };

  // Group all results by programId
  interface ProgramResultGroup {
    programId: string;
    programCode: string;
    programName: string;
    categoryName: string;
    stageType: string;
    type: string;
    results: any[];
  }

  const programGroupsMap: Record<string, ProgramResultGroup> = {};

  for (const r of allResults) {
    if (!r.program) continue;
    const pId = r.program.id;

    if (!programGroupsMap[pId]) {
      programGroupsMap[pId] = {
        programId: pId,
        programCode: r.program.programCode || "—",
        programName: r.program.name,
        categoryName: r.program.category?.name || "General",
        stageType: r.program.stageType || "ON_STAGE",
        type: r.program.type || "INDIVIDUAL",
        results: []
      };
    }

    programGroupsMap[pId].results.push(r);
  }

  // Sort programs in natural order of program code
  const sortedProgramGroups = Object.values(programGroupsMap).sort((a, b) => {
    const codeA = parseProgramCode(a.programCode);
    const codeB = parseProgramCode(b.programCode);
    if (codeA.prefix !== codeB.prefix) {
      return codeA.prefix.localeCompare(codeB.prefix);
    }
    if (codeA.num !== codeB.num) {
      return codeA.num - codeB.num;
    }
    return a.programName.localeCompare(b.programName);
  });

  // Sort results within each program: Rank 1 -> 2 -> 3 -> Grade A -> Grade B -> Points desc
  for (const group of sortedProgramGroups) {
    group.results.sort((a, b) => {
      const rankA = a.rank ?? 999;
      const rankB = b.rank ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      return (b.points || 0) - (a.points || 0);
    });
  }

  const totalProgramsAnnounced = sortedProgramGroups.length;
  const totalResultsEntered = allResults.length;
  const pendingPublishCount = allResults.filter((r) => !r.isPublished).length;

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", padding: "20px 0" }}>
      {/* ── Screen Control & Action Bar (Hidden during Print) ── */}
      <div className="no-print" style={{
        maxWidth: "1100px",
        margin: "0 auto 20px auto",
        padding: "16px 24px",
        backgroundColor: "#1e293b",
        borderRadius: "14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "14px",
        color: "#ffffff"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href={`/dashboard/reports?eventId=${targetEventId}`}
              style={{
                color: "#94a3b8",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              ← Reports Hub
            </Link>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              padding: "3px 10px",
              borderRadius: "9999px",
              backgroundColor: "#f59e0b",
              color: "#78350f"
            }}>
              🏆 TOTAL ZONAL RESULT GAZETTE
            </span>
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: "1.25rem", fontWeight: 800, color: "#f8fafc" }}>
            {zoneTitle} &mdash; Complete Results Compendium
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
            {totalProgramsAnnounced} Programs Announced &bull; {totalResultsEntered} Result Records &bull; In Natural Order of Program Code
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Quick Filter: All vs Published Only */}
          <div style={{ display: "inline-flex", borderRadius: "6px", overflow: "hidden", border: "1px solid #334155", fontSize: "0.75rem" }}>
            <Link
              href={`/print/zonal-total-results?eventId=${targetEventId}&publishedOnly=false`}
              style={{
                padding: "6px 12px",
                backgroundColor: !isPublishedOnly ? "#0284c7" : "#1e293b",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700
              }}
            >
              All Entered ({allResults.length})
            </Link>
            <Link
              href={`/print/zonal-total-results?eventId=${targetEventId}&publishedOnly=true`}
              style={{
                padding: "6px 12px",
                backgroundColor: isPublishedOnly ? "#0284c7" : "#1e293b",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 700,
                borderLeft: "1px solid #334155"
              }}
            >
              Published Only
            </Link>
          </div>

          <PrintButton label="Print Complete Compendium" color="#8E0033" />
        </div>

        {/* Zone Switcher Bar */}
        {allAvailableEvents.length > 1 && (
          <div style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "8px",
            paddingTop: "12px",
            borderTop: "1px solid #334155",
            overflowX: "auto"
          }}>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700, whiteSpace: "nowrap" }}>
              Select Zone:
            </span>
            {allAvailableEvents.map((ev) => {
              const isSelected = ev.id === targetEventId;
              return (
                <Link
                  key={ev.id}
                  href={`/print/zonal-total-results?eventId=${ev.id}${isPublishedOnly ? "&publishedOnly=true" : ""}`}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: isSelected ? 800 : 600,
                    textDecoration: "none",
                    backgroundColor: isSelected ? "#8E0033" : "#334155",
                    color: "#ffffff",
                    border: isSelected ? "1px solid #f43f5e" : "1px solid transparent",
                    whiteSpace: "nowrap"
                  }}
                >
                  {ev.name.replace(/Zone/i, "").trim()}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── STYLES FOR SCREEN & PRINT ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap');

        .compendium-container {
          max-width: 215mm;
          margin: 0 auto;
          font-family: 'Inter', -apple-system, sans-serif;
          color: #0f172a;
        }

        .compendium-sheet {
          background-color: #ffffff;
          padding: 16mm 18mm;
          box-shadow: 0 12px 35px rgba(0,0,0,0.4);
          margin-bottom: 25px;
          border-radius: 4px;
          box-sizing: border-box;
        }

        .program-card {
          border: 1.2px solid #cbd5e1;
          border-radius: 6px;
          margin-bottom: 14px;
          background-color: #ffffff;
          overflow: hidden;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .section-box {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 22px;
        }

        @media print {
          body {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .compendium-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .compendium-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            page-break-after: always;
            break-after: page;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          .program-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border-color: #94a3b8 !important;
          }
        }
      ` }} />

      <div className="compendium-container">
        
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SHEET 1: EXECUTIVE SUMMARY, CHAMPIONSHIP STANDINGS & KALAATHILAKAM   */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="compendium-sheet">
          
          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: "2.5px solid #0f172a", paddingBottom: "10px", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", color: "#64748b" }}>
              COUNCIL OF SAMASTHA WOMEN&apos;S COLLEGES (CSWC)
            </div>
            <h1 style={{
              margin: "4px 0",
              fontSize: "1.7rem",
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              color: "#881337",
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            }}>
              {festName}
            </h1>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
              {festMoto}
            </div>

            <div style={{
              display: "inline-block",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              padding: "4px 18px",
              borderRadius: "4px",
              fontSize: "0.88rem",
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase"
            }}>
              {zoneTitle} &mdash; TOTAL FESTIVAL RESULTS GAZETTE
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", fontSize: "0.74rem", fontWeight: 700, color: "#334155", marginTop: "8px" }}>
              <span>ZONE: <strong>{zoneTitle}</strong></span>
              <span>•</span>
              <span>DATE: <strong>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong></span>
              <span>•</span>
              <span>STATUS: <strong>OFFICIAL ATTESTED RESULTS</strong></span>
            </div>
          </div>

          {/* ── SECTION 1: OVERALL CHAMPIONSHIP PODIUM ── */}
          <div className="section-box">
            <div style={{
              backgroundColor: "#fef3c7",
              border: "1.5px solid #f59e0b",
              borderLeft: "6px solid #d97706",
              padding: "6px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px"
            }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 900, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🏆 SECTION 1: OVERALL FESTIVAL CHAMPIONSHIP PODIUM
              </span>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#b45309" }}>
                CUMULATIVE INSTITUTION POINTS
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
              
              {/* Grand Champion */}
              <div style={{
                border: "2.5px solid #f59e0b",
                backgroundColor: "#fffbeb",
                borderRadius: "8px",
                padding: "10px 12px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(245,158,11,0.15)"
              }}>
                <div style={{
                  display: "inline-block",
                  backgroundColor: "#f59e0b",
                  color: "#78350f",
                  padding: "2px 10px",
                  borderRadius: "9999px",
                  fontSize: "0.72rem",
                  fontWeight: 900,
                  textTransform: "uppercase"
                }}>
                  🥇 GRAND CHAMPION (1ST PLACE)
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a", marginTop: "6px", lineHeight: 1.2 }}>
                  {grandChampion?.name || "—"}
                </div>
                {grandChampion?.place && (
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginTop: "2px" }}>
                    📍 {grandChampion.place}
                  </div>
                )}
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#b45309", marginTop: "4px", fontFamily: "monospace" }}>
                  {grandChampion?.points || 0} <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>POINTS</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "3px", fontWeight: 700 }}>
                  🥇 {grandChampion?.gold || 0} Gold &bull; 🥈 {grandChampion?.silver || 0} Silver &bull; 🥉 {grandChampion?.bronze || 0} Bronze
                </div>
              </div>

              {/* 1st Runner Up */}
              <div style={{
                border: "2px solid #94a3b8",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                padding: "10px 12px",
                textAlign: "center"
              }}>
                <div style={{
                  display: "inline-block",
                  backgroundColor: "#e2e8f0",
                  color: "#334155",
                  padding: "2px 10px",
                  borderRadius: "9999px",
                  fontSize: "0.72rem",
                  fontWeight: 900,
                  textTransform: "uppercase"
                }}>
                  🥈 1ST RUNNER UP (2ND PLACE)
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: "6px", lineHeight: 1.2 }}>
                  {firstRunnerUp?.name || "—"}
                </div>
                {firstRunnerUp?.place && (
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginTop: "2px" }}>
                    📍 {firstRunnerUp.place}
                  </div>
                )}
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#334155", marginTop: "4px", fontFamily: "monospace" }}>
                  {firstRunnerUp?.points || 0} <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>POINTS</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "3px", fontWeight: 700 }}>
                  🥇 {firstRunnerUp?.gold || 0} Gold &bull; 🥈 {firstRunnerUp?.silver || 0} Silver &bull; 🥉 {firstRunnerUp?.bronze || 0} Bronze
                </div>
              </div>

              {/* 2nd Runner Up */}
              <div style={{
                border: "2px solid #f97316",
                backgroundColor: "#fff7ed",
                borderRadius: "8px",
                padding: "10px 12px",
                textAlign: "center"
              }}>
                <div style={{
                  display: "inline-block",
                  backgroundColor: "#ffedd5",
                  color: "#c2410c",
                  padding: "2px 10px",
                  borderRadius: "9999px",
                  fontSize: "0.72rem",
                  fontWeight: 900,
                  textTransform: "uppercase"
                }}>
                  🥉 2ND RUNNER UP (3RD PLACE)
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: "6px", lineHeight: 1.2 }}>
                  {secondRunnerUp?.name || "—"}
                </div>
                {secondRunnerUp?.place && (
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginTop: "2px" }}>
                    📍 {secondRunnerUp.place}
                  </div>
                )}
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#c2410c", marginTop: "4px", fontFamily: "monospace" }}>
                  {secondRunnerUp?.points || 0} <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>POINTS</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "3px", fontWeight: 700 }}>
                  🥇 {secondRunnerUp?.gold || 0} Gold &bull; 🥈 {secondRunnerUp?.silver || 0} Silver &bull; 🥉 {secondRunnerUp?.bronze || 0} Bronze
                </div>
              </div>

            </div>

            {/* Complete Institution Standings Table */}
            <div style={{ border: "1.5px solid #0f172a", borderRadius: "4px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                    <th style={{ padding: "6px 4px", width: "7%", borderRight: "1px solid #334155" }}>Rank</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: "38%", borderRight: "1px solid #334155" }}>Institution Name &amp; Place</th>
                    <th style={{ padding: "6px 4px", width: "10%", borderRight: "1px solid #334155" }}>Code</th>
                    <th style={{ padding: "6px 4px", width: "9%", borderRight: "1px solid #334155", backgroundColor: "#831843" }}>Fadhila</th>
                    <th style={{ padding: "6px 4px", width: "9%", borderRight: "1px solid #334155", backgroundColor: "#581c87" }}>Fadheela</th>
                    <th style={{ padding: "6px 4px", width: "9%", borderRight: "1px solid #334155", backgroundColor: "#1e3a8a" }}>General</th>
                    <th style={{ padding: "6px 4px", width: "10%", borderRight: "1px solid #334155" }}>Medals</th>
                    <th style={{ padding: "6px 4px", width: "8%", backgroundColor: "#8E0033", color: "#ffffff" }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {overallLeaderboard.map((team, idx) => {
                    const rank = idx + 1;
                    const isChampion = rank === 1;
                    const isRunnerUp = rank === 2;
                    const isSecondRunnerUp = rank === 3;

                    return (
                      <tr
                        key={team.id}
                        style={{
                          backgroundColor: isChampion ? "#fffbeb" : isRunnerUp ? "#f8fafc" : isSecondRunnerUp ? "#fff7ed" : idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                          borderBottom: "1px solid #cbd5e1"
                        }}
                      >
                        <td style={{ padding: "5px 4px", textAlign: "center", fontWeight: 900, borderRight: "1px solid #e2e8f0" }}>
                          {rank === 1 ? "🥇 1" : rank === 2 ? "🥈 2" : rank === 3 ? "🥉 3" : rank}
                        </td>
                        <td style={{ padding: "5px 8px", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>{team.name}</div>
                          {team.place && (
                            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>📍 {team.place}</div>
                          )}
                        </td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: "#475569", borderRight: "1px solid #e2e8f0" }}>
                          {team.prefixCode}
                        </td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#9f1239", borderRight: "1px solid #e2e8f0" }}>
                          {team.fadhilaPoints}
                        </td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#6b21a8", borderRight: "1px solid #e2e8f0" }}>
                          {team.fadheelaPoints}
                        </td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#1e40af", borderRight: "1px solid #e2e8f0" }}>
                          {team.generalPoints}
                        </td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontSize: "0.68rem", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>
                          🥇{team.gold} 🥈{team.silver} 🥉{team.bronze}
                        </td>
                        <td style={{ padding: "5px 4px", textAlign: "center", fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 900, color: "#8E0033", backgroundColor: isChampion ? "#fef3c7" : "transparent" }}>
                          {team.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SECTION 2 & 3: CATEGORY CHAMPIONS & KALAATHILAKAM ── */}
          <div className="section-box" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            
            {/* Category Champions Box */}
            <div style={{ border: "1.5px solid #0f172a", borderRadius: "6px", overflow: "hidden" }}>
              <div style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "6px 10px", fontSize: "0.80rem", fontWeight: 900, textTransform: "uppercase" }}>
                🌟 SECTION 2: CATEGORY-WISE CHAMPIONS
              </div>
              <div style={{ padding: "10px" }}>
                {/* Fadhila */}
                <div style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px dashed #cbd5e1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#9f1239" }}>
                      📖 FADHILA CATEGORY CHAMPION
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#9f1239", fontFamily: "monospace" }}>
                      {fadhilaLeaderboard[0]?.fadhilaPoints || 0} PTS
                    </span>
                  </div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                    {fadhilaLeaderboard[0]?.name || "—"}
                  </div>
                  {fadhilaLeaderboard[1] && (
                    <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "3px" }}>
                      🥈 Runner-Up: <strong>{fadhilaLeaderboard[1].name}</strong> ({fadhilaLeaderboard[1].fadhilaPoints} pts)
                    </div>
                  )}
                </div>

                {/* Fadheela */}
                <div style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px dashed #cbd5e1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#6b21a8" }}>
                      🎓 FADHEELA CATEGORY CHAMPION
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#6b21a8", fontFamily: "monospace" }}>
                      {fadheelaLeaderboard[0]?.fadheelaPoints || 0} PTS
                    </span>
                  </div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                    {fadheelaLeaderboard[0]?.name || "—"}
                  </div>
                  {fadheelaLeaderboard[1] && (
                    <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "3px" }}>
                      🥈 Runner-Up: <strong>{fadheelaLeaderboard[1].name}</strong> ({fadheelaLeaderboard[1].fadheelaPoints} pts)
                    </div>
                  )}
                </div>

                {/* General */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#1e40af" }}>
                      ⭐ GENERAL &amp; GROUP CHAMPION
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#1e40af", fontFamily: "monospace" }}>
                      {generalLeaderboard[0]?.generalPoints || 0} PTS
                    </span>
                  </div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                    {generalLeaderboard[0]?.name || "—"}
                  </div>
                  {generalLeaderboard[1] && (
                    <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "3px" }}>
                      🥈 Runner-Up: <strong>{generalLeaderboard[1].name}</strong> ({generalLeaderboard[1].generalPoints} pts)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Kalaathilakam Box */}
            <div style={{ border: "1.5px solid #0f172a", borderRadius: "6px", overflow: "hidden" }}>
              <div style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "6px 10px", fontSize: "0.80rem", fontWeight: 900, textTransform: "uppercase" }}>
                👑 SECTION 3: KALAATHILAKAM (INDIVIDUAL STARS)
              </div>
              <div style={{ padding: "10px" }}>
                
                {/* Fadhila Kalathilakam */}
                <div style={{ marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px dashed #cbd5e1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontSize: "0.70rem",
                      fontWeight: 900,
                      backgroundColor: "#fce7f3",
                      color: "#9f1239",
                      padding: "2px 8px",
                      borderRadius: "4px"
                    }}>
                      📖 FADHILA KALAATHILAKAM
                    </span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 900, color: "#9f1239", fontFamily: "monospace" }}>
                      {maxFadhilaPoints} PTS
                    </span>
                  </div>
                  {fadhilaKalathilakams.length > 0 ? (
                    fadhilaKalathilakams.map((k) => (
                      <div key={k.id} style={{ marginTop: "4px" }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#0f172a" }}>
                          {k.name} <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>({k.chestNumber || "CH"})</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#475569" }}>
                          🏫 {k.teamName} {k.institutionPlace ? `(${k.institutionPlace})` : ""}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#059669", fontWeight: 700, marginTop: "1px" }}>
                          🥇 {k.gold} Gold &bull; 🥈 {k.silver} Silver &bull; 🥉 {k.bronze} Bronze
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic", marginTop: "4px" }}>No Individual Results Yet</div>
                  )}
                </div>

                {/* Fadheela Kalathilakam */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontSize: "0.70rem",
                      fontWeight: 900,
                      backgroundColor: "#f3e8ff",
                      color: "#6b21a8",
                      padding: "2px 8px",
                      borderRadius: "4px"
                    }}>
                      🎓 FADHEELA KALAATHILAKAM
                    </span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 900, color: "#6b21a8", fontFamily: "monospace" }}>
                      {maxFadheelaPoints} PTS
                    </span>
                  </div>
                  {fadheelaKalathilakams.length > 0 ? (
                    fadheelaKalathilakams.map((k) => (
                      <div key={k.id} style={{ marginTop: "4px" }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#0f172a" }}>
                          {k.name} <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>({k.chestNumber || "CH"})</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#475569" }}>
                          🏫 {k.teamName} {k.institutionPlace ? `(${k.institutionPlace})` : ""}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#059669", fontWeight: 700, marginTop: "1px" }}>
                          🥇 {k.gold} Gold &bull; 🥈 {k.silver} Silver &bull; 🥉 {k.bronze} Bronze
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic", marginTop: "4px" }}>No Individual Results Yet</div>
                  )}
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SHEET 2+: ALL ANNOUNCED PROGRAM RESULTS IN ORDER OF PROGRAM CODE     */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="compendium-sheet page-break">
          
          <div style={{
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "8px 14px",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}>
            <div>
              <span style={{ fontSize: "0.92rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                📋 SECTION 4: ALL ANNOUNCED PROGRAM RESULTS
              </span>
              <div style={{ fontSize: "0.70rem", color: "#cbd5e1" }}>
                ARRANGED IN NATURAL ORDER OF PROGRAM CODE (TOTAL: {totalProgramsAnnounced} PROGRAMS)
              </div>
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#fef08a" }}>
              {zoneTitle} OFFICIAL GAZETTE
            </div>
          </div>

          {sortedProgramGroups.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <h3>No Program Results Announced Yet</h3>
              <p>Results will populate here in order of program code as soon as they are entered.</p>
            </div>
          ) : (
            <div>
              {sortedProgramGroups.map((group) => {
                const isFadhila = group.categoryName.toUpperCase().includes("FADHILA");
                const isFadheela = group.categoryName.toUpperCase().includes("FADHEELA");

                return (
                  <div key={group.programId} className="program-card">
                    {/* Program Header */}
                    <div style={{
                      backgroundColor: "#f8fafc",
                      borderBottom: "1.5px solid #cbd5e1",
                      padding: "8px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "6px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          fontSize: "0.75rem",
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: "3px",
                          fontFamily: "monospace"
                        }}>
                          CODE: {group.programCode}
                        </span>
                        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                          {group.programName}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          backgroundColor: isFadhila ? "#fce7f3" : isFadheela ? "#f3e8ff" : "#e0f2fe",
                          color: isFadhila ? "#9f1239" : isFadheela ? "#6b21a8" : "#0369a1"
                        }}>
                          {group.categoryName}
                        </span>
                        <span style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "#f1f5f9",
                          color: "#475569"
                        }}>
                          {group.stageType === "ON_STAGE" ? "🎭 On-Stage" : "📝 Off-Stage"} &bull; {group.type}
                        </span>
                      </div>
                    </div>

                    {/* Results Table for this Program */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1f5f9", color: "#475569", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
                          <th style={{ padding: "4px 6px", width: "12%", borderRight: "1px solid #e2e8f0" }}>Position / Rank</th>
                          <th style={{ padding: "4px 6px", width: "10%", borderRight: "1px solid #e2e8f0" }}>Chest No</th>
                          <th style={{ padding: "4px 8px", textAlign: "left", width: "32%", borderRight: "1px solid #e2e8f0" }}>Candidate / Participant</th>
                          <th style={{ padding: "4px 8px", textAlign: "left", width: "32%", borderRight: "1px solid #e2e8f0" }}>Institution Name &amp; Place</th>
                          <th style={{ padding: "4px 6px", width: "7%", borderRight: "1px solid #e2e8f0" }}>Grade</th>
                          <th style={{ padding: "4px 6px", width: "7%", backgroundColor: "#f8fafc" }}>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.results.map((r, rIdx) => {
                          const isRank1 = r.rank === 1;
                          const isRank2 = r.rank === 2;
                          const isRank3 = r.rank === 3;

                          const candName = r.candidate?.name || (r.program?.type !== "INDIVIDUAL" ? r.team?.name : "Candidate");
                          const chestNo = r.candidate?.chestNumber || "—";
                          
                          const inst = r.candidate?.team?.institution || r.team?.institution;
                          const instName = inst?.name || r.candidate?.team?.name || r.team?.name || "—";
                          const instPlace = inst?.place || null;

                          return (
                            <tr
                              key={r.id || rIdx}
                              style={{
                                backgroundColor: isRank1 ? "#fffbeb" : isRank2 ? "#f8fafc" : isRank3 ? "#fff7ed" : rIdx % 2 === 0 ? "#ffffff" : "#f8fafc",
                                borderBottom: "1px solid #e2e8f0"
                              }}
                            >
                              <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 800, borderRight: "1px solid #e2e8f0" }}>
                                {isRank1 ? (
                                  <span style={{ color: "#b45309" }}>🥇 1st Place</span>
                                ) : isRank2 ? (
                                  <span style={{ color: "#334155" }}>🥈 2nd Place</span>
                                ) : isRank3 ? (
                                  <span style={{ color: "#c2410c" }}>🥉 3rd Place</span>
                                ) : (
                                  <span style={{ color: "#64748b" }}>Grade Honor</span>
                                )}
                              </td>
                              <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>
                                {chestNo}
                              </td>
                              <td style={{ padding: "5px 8px", textAlign: "left", fontWeight: 800, color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>
                                {candName}
                              </td>
                              <td style={{ padding: "5px 8px", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
                                <div style={{ fontWeight: 700, color: "#334155" }}>{instName}</div>
                                {instPlace && (
                                  <div style={{ fontSize: "0.66rem", color: "#64748b" }}>📍 {instPlace}</div>
                                )}
                              </td>
                              <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 900, color: r.grade === "A" ? "#047857" : r.grade === "B" ? "#0284c7" : "#475569", borderRight: "1px solid #e2e8f0" }}>
                                {r.grade ? `Gr. ${r.grade}` : "—"}
                              </td>
                              <td style={{ padding: "5px 6px", textAlign: "center", fontFamily: "monospace", fontWeight: 900, color: "#8E0033" }}>
                                {r.points || 0}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}

          {/* Official Attestation & Signatures Footer */}
          <div style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "2px solid #0f172a",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "20px",
            textAlign: "center",
            pageBreakInside: "avoid",
            breakInside: "avoid"
          }}>
            <div>
              <div style={{ height: "45px" }}></div>
              <div style={{ borderTop: "1px solid #475569", paddingTop: "5px", fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>
                General Convener
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{zoneTitle} Festival Committee</div>
            </div>

            <div>
              <div style={{ height: "45px" }}></div>
              <div style={{ borderTop: "1px solid #475569", paddingTop: "5px", fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>
                Tabulation Controller
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Official Results Scrutiny</div>
            </div>

            <div>
              <div style={{ height: "45px" }}></div>
              <div style={{ borderTop: "1px solid #475569", paddingTop: "5px", fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>
                Jury Chairman
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Central Evaluation Council</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
