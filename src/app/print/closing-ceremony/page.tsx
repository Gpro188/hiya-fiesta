import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClosingCeremonyAnnouncementPage(props: {
  searchParams: Promise<{
    eventId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  // 1. Resolve active user and allowed events
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
    orderBy: { updatedAt: "desc" }
  });

  // 2. Select target event
  let targetEventId = searchParams.eventId || null;
  if (!targetEventId) {
    const liveOrDone = allAvailableEvents.find(
      (e) => e.statusOverride === "LIVE" || e.statusOverride === "COMPLETED"
    );
    targetEventId = liveOrDone?.id || allAvailableEvents[0]?.id || null;
  }

  if (!targetEventId) {
    const firstEv = await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });
    targetEventId = firstEv?.id || null;
  }

  if (!targetEventId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>No event found</h2>
        <p>Please configure an event in the system first.</p>
      </div>
    );
  }

  // 3. Fetch Event, Teams, and Category definitions
  const targetEvent = await prisma.event.findUnique({
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
  });

  if (!targetEvent) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Event not found</h2>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  const zoneTitle = targetEvent.zone?.name || targetEvent.name.replace(/Zone/i, "").trim() + " ZONE";
  const festName = "CSWC HIYA FIESTA 2026";

  // 4. Fetch ALL Results (Both published AND unpublished/pending results)
  // Per user instruction: "the total point is the all resluts not need publish only need enter the total summury is on based it"
  const allResults = await prisma.result.findMany({
    where: {
      OR: [
        { candidate: { team: { eventId: targetEventId } } },
        { team: { eventId: targetEventId } }
      ]
    },
    include: {
      candidate: {
        include: {
          team: { include: { institution: true } },
          category: true
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
    }
  });

  // Helper to categorize programs
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
  interface TeamAnnounceScore {
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
  }

  const teamScoresMap: Record<string, TeamAnnounceScore> = {};

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
      bronze: 0
    };
  }

  // Candidate scores for Kalathilakam
  interface CandidateAnnounceScore {
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
    results: Array<{
      programName: string;
      programCode: string | null;
      stageType: string | null;
      rank: number | null;
      grade: string | null;
      points: number;
    }>;
  }

  const candidateScoresMap: Record<string, CandidateAnnounceScore> = {};

  for (const r of allResults) {
    const teamId = r.candidate?.teamId || r.teamId;
    if (teamId && teamScoresMap[teamId]) {
      const pts = r.points || 0;
      teamScoresMap[teamId].points += pts;
      if (r.rank === 1) teamScoresMap[teamId].gold++;
      if (r.rank === 2) teamScoresMap[teamId].silver++;
      if (r.rank === 3) teamScoresMap[teamId].bronze++;

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
          results: []
        };
      }

      candidateScoresMap[candId].points += r.points || 0;
      if (r.rank === 1) candidateScoresMap[candId].gold++;
      if (r.rank === 2) candidateScoresMap[candId].silver++;
      if (r.rank === 3) candidateScoresMap[candId].bronze++;

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

  // 6. Overall Champions (Page 1)
  const overallLeaderboard = Object.values(teamScoresMap).sort(
    (a, b) => b.points - a.points || b.gold - a.gold || b.silver - a.silver
  );

  const overallChampion = overallLeaderboard[0] || null;
  const firstRunnerUp = overallLeaderboard[1] || null;
  const secondRunnerUp = overallLeaderboard[2] || null;

  // 7. Category Champions (Page 2) - Fadhila & Fadheela only (no General per instruction)
  const fadhilaLeaderboard = Object.values(teamScoresMap)
    .filter((t) => t.fadhilaPoints > 0)
    .sort((a, b) => b.fadhilaPoints - a.fadhilaPoints || b.gold - a.gold);

  const fadheelaLeaderboard = Object.values(teamScoresMap)
    .filter((t) => t.fadheelaPoints > 0)
    .sort((a, b) => b.fadheelaPoints - a.fadheelaPoints || b.gold - a.gold);

  const fadhilaChampion = fadhilaLeaderboard[0] || null;
  const fadhilaFirstRunnerUp = fadhilaLeaderboard[1] || null;

  const fadheelaChampion = fadheelaLeaderboard[0] || null;
  const fadheelaFirstRunnerUp = fadheelaLeaderboard[1] || null;

  // 8. Magazine Result (Page 3)
  const magazineResults = allResults
    .filter((r) => r.program?.programCode === "43" || r.program?.name?.toLowerCase().includes("magazine"))
    .sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.points - a.points);

  const magRank1 = magazineResults.find((r) => r.rank === 1) || null;
  const magRank2 = magazineResults.find((r) => r.rank === 2) || null;
  const magRank3 = magazineResults.find((r) => r.rank === 3) || null;
  const otherMagResults = magazineResults.filter(
    (r) => r !== magRank1 && r !== magRank2 && r !== magRank3 && (r.grade || r.marks > 0)
  );

  // 9. Kalathilakam (Page 4) - 1st only; if tied at top score, ALL are joint Kalathilakam!
  const allCandidatesList = Object.values(candidateScoresMap);

  // Fadhila Kalathilakam
  const fadhilaCandidates = allCandidatesList
    .filter((c) => c.category === "FADHILA")
    .sort((a, b) => b.points - a.points);

  const maxFadhilaPoints = fadhilaCandidates[0]?.points || 0;
  const fadhilaKalathilakams =
    maxFadhilaPoints > 0 ? fadhilaCandidates.filter((c) => c.points === maxFadhilaPoints) : [];

  // Fadheela Kalathilakam
  const fadheelaCandidates = allCandidatesList
    .filter((c) => c.category === "FADHEELA")
    .sort((a, b) => b.points - a.points);

  const maxFadheelaPoints = fadheelaCandidates[0]?.points || 0;
  const fadheelaKalathilakams =
    maxFadheelaPoints > 0 ? fadheelaCandidates.filter((c) => c.points === maxFadheelaPoints) : [];

  const totalResultsEntered = allResults.length;
  const pendingPublishCount = allResults.filter((r) => !r.isPublished).length;

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", padding: "20px 0" }}>
      {/* Top Floating Control Bar (Hidden during Print) */}
      <div className="no-print" style={{
        maxWidth: "960px",
        margin: "0 auto 20px auto",
        padding: "14px 22px",
        backgroundColor: "#1e293b",
        borderRadius: "14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        color: "#ffffff"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>
            🎙️ Closing Ceremony Declaration Sheet
          </span>
          <span style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            padding: "3px 9px",
            borderRadius: "9999px",
            backgroundColor: pendingPublishCount > 0 ? "#b45309" : "#065f46",
            color: "#ffffff"
          }}>
            {pendingPublishCount > 0
              ? `⚡ Includes ${pendingPublishCount} pending publish`
              : "✓ 100% Final Entered Scores"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Event Switcher */}
          {allAvailableEvents.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {allAvailableEvents.map((ev) => {
                const isActive = ev.id === targetEventId;
                return (
                  <Link
                    key={ev.id}
                    href={`/print/closing-ceremony?eventId=${ev.id}`}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      backgroundColor: isActive ? "#e11d48" : "#1e293b",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      border: isActive ? "1px solid #f43f5e" : "1px solid #334155"
                    }}
                  >
                    {ev.name}
                  </Link>
                );
              })}
            </div>
          )}

          <PrintButton label="Print 4-Page Announcement (A4)" color="#e11d48" />
        </div>
      </div>

      {/* STYLES FOR SCREEN & PRINT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Fraunces:opsz,wght@9..144,700;800;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@700;800&display=swap');

        .ceremony-container {
          max-width: 210mm;
          margin: 0 auto;
        }

        .a4-page {
          background-color: #ffffff;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 30px auto;
          padding: 16mm 18mm 14mm 18mm;
          box-sizing: border-box;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          color: #0f172a;
          font-family: 'Inter', sans-serif;
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
          .ceremony-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 292mm !important;
            height: 292mm !important;
            padding: 12mm 15mm 10mm 15mm !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .a4-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      ` }} />

      <div className="ceremony-container">
        {/* ========================================================================= */}
        {/* PAGE 1: OVERALL CHAMPIONS & ZONE TITLE */}
        {/* ========================================================================= */}
        <div className="a4-page">
          {/* Header */}
          <div>
            <div style={{ textAlign: "center", borderBottom: "3px double #0f172a", paddingBottom: "14px", marginBottom: "22px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", color: "#64748b" }}>
                STATE WOMEN&apos;S SHARI&apos;ATH CAMPUS &bull; CSWC
              </div>
              <h1 style={{
                margin: "4px 0",
                fontSize: "1.75rem",
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                color: "#881337",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}>
                {festName}
              </h1>
              <div style={{
                display: "inline-block",
                backgroundColor: "#0f172a",
                color: "#f8fafc",
                fontSize: "1.05rem",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "4px 20px",
                borderRadius: "4px",
                margin: "6px 0 4px 0"
              }}>
                {zoneTitle}
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#b45309", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "4px" }}>
                🎙️ GRAND CLOSING CEREMONY &bull; OFFICIAL RESULTS DECLARATION
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "18px" }}>
              <span style={{
                backgroundColor: "#fef3c7",
                border: "1.5px solid #f59e0b",
                color: "#92400e",
                padding: "4px 16px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}>
                Official Championship Declaration &bull; Page 1 of 4
              </span>
            </div>

            {/* Overall Champion (Winner) Card */}
            {overallChampion ? (
              <div style={{
                border: "3px solid #b45309",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "16px",
                backgroundColor: "#fffbeb",
                boxShadow: "0 6px 18px rgba(180, 83, 9, 0.12)",
                position: "relative",
                textAlign: "center"
              }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#b45309",
                  color: "#ffffff",
                  padding: "5px 18px",
                  borderRadius: "9999px",
                  fontSize: "0.88rem",
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "10px"
                }}>
                  🏆 OVERALL CHAMPION (WINNER)
                </div>

                <h2 style={{
                  margin: "8px 0 6px 0",
                  fontSize: "1.65rem",
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 900,
                  color: "#78350f",
                  lineHeight: 1.2
                }}>
                  {overallChampion.name}
                </h2>
                {overallChampion.place && (
                  <div style={{ fontSize: "0.95rem", color: "#92400e", fontWeight: 700, marginBottom: "12px" }}>
                    📍 {overallChampion.place}
                  </div>
                )}

                <div style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: "10px",
                  backgroundColor: "#fef3c7",
                  border: "2px solid #d97706",
                  padding: "8px 26px",
                  borderRadius: "12px"
                }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#b45309", lineHeight: 1 }}>
                    {overallChampion.points}
                  </span>
                  <span style={{ fontSize: "1.05rem", fontWeight: 900, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    TOTAL POINTS
                  </span>
                </div>

                <div style={{ fontSize: "0.82rem", color: "#78350f", fontWeight: 700, marginTop: "10px" }}>
                  🥇 {overallChampion.gold} Golds &bull; 🥈 {overallChampion.silver} Silvers &bull; 🥉 {overallChampion.bronze} Bronzes
                </div>
              </div>
            ) : (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>No champion data recorded yet.</div>
            )}

            {/* 1st Runner Up Card */}
            {firstRunnerUp && (
              <div style={{
                border: "2px solid #64748b",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "14px",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#475569",
                    color: "#ffffff",
                    padding: "3px 12px",
                    borderRadius: "9999px",
                    fontSize: "0.76rem",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "6px"
                  }}>
                    🥈 1ST RUNNER UP
                  </div>
                  <h3 style={{ margin: "2px 0 4px 0", fontSize: "1.25rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#1e293b" }}>
                    {firstRunnerUp.name}
                  </h3>
                  {firstRunnerUp.place && (
                    <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 700 }}>
                      📍 {firstRunnerUp.place}
                    </div>
                  )}
                </div>

                <div style={{
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  padding: "8px 18px",
                  borderRadius: "10px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#334155", lineHeight: 1 }}>
                    {firstRunnerUp.points}
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    POINTS
                  </div>
                </div>
              </div>
            )}

            {/* 2nd Runner Up Card */}
            {secondRunnerUp && (
              <div style={{
                border: "2px solid #b45309",
                borderRadius: "12px",
                padding: "16px 20px",
                backgroundColor: "#fffbeb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#92400e",
                    color: "#ffffff",
                    padding: "3px 12px",
                    borderRadius: "9999px",
                    fontSize: "0.76rem",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "6px"
                  }}>
                    🥉 2ND RUNNER UP
                  </div>
                  <h3 style={{ margin: "2px 0 4px 0", fontSize: "1.25rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#78350f" }}>
                    {secondRunnerUp.name}
                  </h3>
                  {secondRunnerUp.place && (
                    <div style={{ fontSize: "0.85rem", color: "#92400e", fontWeight: 700 }}>
                      📍 {secondRunnerUp.place}
                    </div>
                  )}
                </div>

                <div style={{
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #fde68a",
                  padding: "8px 18px",
                  borderRadius: "10px",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#92400e", lineHeight: 1 }}>
                    {secondRunnerUp.points}
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#b45309", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    POINTS
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with verification signatures */}
          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "12px", marginTop: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", textAlign: "center", marginBottom: "10px" }}>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Jury Board Chairman
                </div>
              </div>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  General Convener
                </div>
              </div>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Steering Committee
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700 }}>
              <span>Certified Official Result Sheet &bull; {targetEvent.name}</span>
              <span>All {totalResultsEntered} entered results computed &bull; Page 1 of 4</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 2: CATEGORY CHAMPIONS (FADHILA & FADHEELA ONLY) */}
        {/* ========================================================================= */}
        <div className="a4-page">
          <div>
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "3px double #0f172a", paddingBottom: "14px", marginBottom: "22px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", color: "#64748b" }}>
                {festName} &bull; {zoneTitle}
              </div>
              <h1 style={{
                margin: "4px 0",
                fontSize: "1.75rem",
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                color: "#1e1b4b",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}>
                CATEGORY CHAMPIONSHIPS
              </h1>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#4338ca", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                FADHILA &amp; FADHEELA CATEGORY TITLES
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{
                backgroundColor: "#e0e7ff",
                border: "1.5px solid #6366f1",
                color: "#3730a3",
                padding: "4px 16px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}>
                Category Titles &bull; Page 2 of 4
              </span>
            </div>

            {/* BLOCK 1: FADHILA CATEGORY */}
            <div style={{
              border: "2px solid #0284c7",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "24px",
              backgroundColor: "#f0f9ff"
            }}>
              <div style={{
                display: "inline-block",
                backgroundColor: "#0284c7",
                color: "#ffffff",
                padding: "4px 16px",
                borderRadius: "6px",
                fontSize: "0.84rem",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "14px"
              }}>
                FADHILA CATEGORY (JUNIOR)
              </div>

              {/* Fadhila Champion */}
              {fadhilaChampion ? (
                <div style={{
                  border: "2px solid #0369a1",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  backgroundColor: "#ffffff",
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}>
                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "#0369a1",
                      color: "#ffffff",
                      padding: "2px 10px",
                      borderRadius: "9999px",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: "4px"
                    }}>
                      🥇 CATEGORY CHAMPION
                    </div>
                    <h3 style={{ margin: "2px 0 2px 0", fontSize: "1.25rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#0c4a6e" }}>
                      {fadhilaChampion.name}
                    </h3>
                    {fadhilaChampion.place && (
                      <div style={{ fontSize: "0.82rem", color: "#0369a1", fontWeight: 700 }}>
                        📍 {fadhilaChampion.place}
                      </div>
                    )}
                  </div>
                  <div style={{
                    backgroundColor: "#e0f2fe",
                    border: "1.5px solid #7dd3fc",
                    padding: "6px 16px",
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#0369a1", lineHeight: 1 }}>
                      {fadhilaChampion.fadhilaPoints}
                    </div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 900, color: "#0284c7", textTransform: "uppercase" }}>
                      POINTS
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#64748b" }}>No results recorded in Fadhila category yet.</div>
              )}

              {/* Fadhila 1st Runner Up */}
              {fadhilaFirstRunnerUp && (
                <div style={{
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}>
                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "#475569",
                      color: "#ffffff",
                      padding: "2px 10px",
                      borderRadius: "9999px",
                      fontSize: "0.70rem",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: "4px"
                    }}>
                      🥈 1ST RUNNER UP
                    </div>
                    <h4 style={{ margin: "2px 0 2px 0", fontSize: "1.1rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#1e293b" }}>
                      {fadhilaFirstRunnerUp.name}
                    </h4>
                    {fadhilaFirstRunnerUp.place && (
                      <div style={{ fontSize: "0.80rem", color: "#64748b", fontWeight: 700 }}>
                        📍 {fadhilaFirstRunnerUp.place}
                      </div>
                    )}
                  </div>
                  <div style={{
                    backgroundColor: "#f8fafc",
                    border: "1.5px solid #cbd5e1",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#334155", lineHeight: 1 }}>
                      {fadhilaFirstRunnerUp.fadhilaPoints}
                    </div>
                    <div style={{ fontSize: "0.66rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>
                      POINTS
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BLOCK 2: FADHEELA CATEGORY */}
            <div style={{
              border: "2px solid #9d174d",
              borderRadius: "14px",
              padding: "16px 20px",
              backgroundColor: "#fdf2f8"
            }}>
              <div style={{
                display: "inline-block",
                backgroundColor: "#9d174d",
                color: "#ffffff",
                padding: "4px 16px",
                borderRadius: "6px",
                fontSize: "0.84rem",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "14px"
              }}>
                FADHEELA CATEGORY (SENIOR)
              </div>

              {/* Fadheela Champion */}
              {fadheelaChampion ? (
                <div style={{
                  border: "2px solid #831843",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  backgroundColor: "#ffffff",
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}>
                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "#831843",
                      color: "#ffffff",
                      padding: "2px 10px",
                      borderRadius: "9999px",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: "4px"
                    }}>
                      🥇 CATEGORY CHAMPION
                    </div>
                    <h3 style={{ margin: "2px 0 2px 0", fontSize: "1.25rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#831843" }}>
                      {fadheelaChampion.name}
                    </h3>
                    {fadheelaChampion.place && (
                      <div style={{ fontSize: "0.82rem", color: "#9d174d", fontWeight: 700 }}>
                        📍 {fadheelaChampion.place}
                      </div>
                    )}
                  </div>
                  <div style={{
                    backgroundColor: "#fce7f3",
                    border: "1.5px solid #f472b6",
                    padding: "6px 16px",
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#831843", lineHeight: 1 }}>
                      {fadheelaChampion.fadheelaPoints}
                    </div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 900, color: "#9d174d", textTransform: "uppercase" }}>
                      POINTS
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#64748b" }}>No results recorded in Fadheela category yet.</div>
              )}

              {/* Fadheela 1st Runner Up */}
              {fadheelaFirstRunnerUp && (
                <div style={{
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}>
                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "#475569",
                      color: "#ffffff",
                      padding: "2px 10px",
                      borderRadius: "9999px",
                      fontSize: "0.70rem",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: "4px"
                    }}>
                      🥈 1ST RUNNER UP
                    </div>
                    <h4 style={{ margin: "2px 0 2px 0", fontSize: "1.1rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#1e293b" }}>
                      {fadheelaFirstRunnerUp.name}
                    </h4>
                    {fadheelaFirstRunnerUp.place && (
                      <div style={{ fontSize: "0.80rem", color: "#64748b", fontWeight: 700 }}>
                        📍 {fadheelaFirstRunnerUp.place}
                      </div>
                    )}
                  </div>
                  <div style={{
                    backgroundColor: "#f8fafc",
                    border: "1.5px solid #cbd5e1",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#334155", lineHeight: 1 }}>
                      {fadheelaFirstRunnerUp.fadheelaPoints}
                    </div>
                    <div style={{ fontSize: "0.66rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>
                      POINTS
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "12px", marginTop: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", textAlign: "center", marginBottom: "10px" }}>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Jury Board Chairman
                </div>
              </div>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  General Convener
                </div>
              </div>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Steering Committee
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700 }}>
              <span>Certified Official Result Sheet &bull; {targetEvent.name}</span>
              <span>Individual Category Points Only (General excluded) &bull; Page 2 of 4</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 3: COLLEGE MAGAZINE COMPETITION RESULTS */}
        {/* ========================================================================= */}
        <div className="a4-page">
          <div>
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "3px double #0f172a", paddingBottom: "14px", marginBottom: "22px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", color: "#64748b" }}>
                {festName} &bull; {zoneTitle}
              </div>
              <h1 style={{
                margin: "4px 0",
                fontSize: "1.75rem",
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                color: "#0f766e",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}>
                COLLEGE MAGAZINE RESULTS
              </h1>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0d9488", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                PROGRAM 43 &bull; INSTITUTION COMPETITION
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{
                backgroundColor: "#ccfbf1",
                border: "1.5px solid #14b8a6",
                color: "#0f766e",
                padding: "4px 16px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}>
                Magazine Declaration &bull; Page 3 of 4
              </span>
            </div>

            {/* 1st Place Magazine */}
            {magRank1 ? (
              <div style={{
                border: "3px solid #b45309",
                borderRadius: "14px",
                padding: "20px 24px",
                marginBottom: "16px",
                backgroundColor: "#fffbeb",
                boxShadow: "0 6px 18px rgba(180, 83, 9, 0.12)",
                textAlign: "center"
              }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#b45309",
                  color: "#ffffff",
                  padding: "4px 18px",
                  borderRadius: "9999px",
                  fontSize: "0.84rem",
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "8px"
                }}>
                  🥇 1ST PLACE &bull; BEST COLLEGE MAGAZINE
                </div>

                <h2 style={{
                  margin: "8px 0 4px 0",
                  fontSize: "1.65rem",
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 900,
                  color: "#78350f",
                  lineHeight: 1.2
                }}>
                  {magRank1.team?.institution?.name || magRank1.team?.name}
                </h2>

                <div style={{ fontSize: "0.95rem", color: "#92400e", fontWeight: 800, marginBottom: "12px" }}>
                  Magazine Code: <span style={{ fontFamily: "'JetBrains Mono', monospace", backgroundColor: "#fef3c7", padding: "2px 8px", borderRadius: "4px" }}>{magRank1.team?.magazineCode || "MAG"}</span>
                  {magRank1.team?.institution?.place && ` • 📍 ${magRank1.team.institution.place}`}
                </div>

                <div style={{ display: "inline-flex", gap: "14px", alignItems: "center" }}>
                  {magRank1.grade && (
                    <div style={{
                      backgroundColor: "#ffffff",
                      border: "2px solid #b45309",
                      padding: "6px 18px",
                      borderRadius: "8px",
                      fontWeight: 900,
                      fontSize: "1.1rem",
                      color: "#b45309"
                    }}>
                      Grade {magRank1.grade}
                    </div>
                  )}
                  <div style={{
                    backgroundColor: "#b45309",
                    color: "#ffffff",
                    padding: "6px 20px",
                    borderRadius: "8px",
                    fontWeight: 900,
                    fontSize: "1.15rem",
                    letterSpacing: "0.06em"
                  }}>
                    {magRank1.points} POINTS
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                1st place magazine result not entered yet.
              </div>
            )}

            {/* 2nd Place Magazine */}
            {magRank2 && (
              <div style={{
                border: "2px solid #64748b",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "14px",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#475569",
                    color: "#ffffff",
                    padding: "3px 12px",
                    borderRadius: "9999px",
                    fontSize: "0.76rem",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "6px"
                  }}>
                    🥈 2ND PLACE
                  </div>
                  <h3 style={{ margin: "2px 0 4px 0", fontSize: "1.25rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#1e293b" }}>
                    {magRank2.team?.institution?.name || magRank2.team?.name}
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 700 }}>
                    Magazine Code: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{magRank2.team?.magazineCode || "MAG"}</span>
                    {magRank2.team?.institution?.place && ` • 📍 ${magRank2.team.institution.place}`}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {magRank2.grade && (
                    <div style={{
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #94a3b8",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontWeight: 900,
                      fontSize: "0.95rem",
                      color: "#334155"
                    }}>
                      Grade {magRank2.grade}
                    </div>
                  )}
                  <div style={{
                    backgroundColor: "#334155",
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: "8px",
                    fontWeight: 900,
                    fontSize: "1.05rem"
                  }}>
                    {magRank2.points} PTS
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place Magazine (if exists) */}
            {magRank3 && (
              <div style={{
                border: "2px solid #b45309",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "14px",
                backgroundColor: "#fffbeb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#92400e",
                    color: "#ffffff",
                    padding: "3px 12px",
                    borderRadius: "9999px",
                    fontSize: "0.76rem",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "6px"
                  }}>
                    🥉 3RD PLACE
                  </div>
                  <h3 style={{ margin: "2px 0 4px 0", fontSize: "1.25rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#78350f" }}>
                    {magRank3.team?.institution?.name || magRank3.team?.name}
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "#92400e", fontWeight: 700 }}>
                    Magazine Code: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{magRank3.team?.magazineCode || "MAG"}</span>
                    {magRank3.team?.institution?.place && ` • 📍 ${magRank3.team.institution.place}`}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {magRank3.grade && (
                    <div style={{
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #d97706",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontWeight: 900,
                      fontSize: "0.95rem",
                      color: "#b45309"
                    }}>
                      Grade {magRank3.grade}
                    </div>
                  )}
                  <div style={{
                    backgroundColor: "#b45309",
                    color: "#ffffff",
                    padding: "6px 16px",
                    borderRadius: "8px",
                    fontWeight: 900,
                    fontSize: "1.05rem"
                  }}>
                    {magRank3.points} PTS
                  </div>
                </div>
              </div>
            )}

            {/* Other Participating Colleges with Grades */}
            {otherMagResults.length > 0 && (
              <div style={{ marginTop: "18px", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px 16px", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 900, textTransform: "uppercase", color: "#64748b", marginBottom: "8px" }}>
                  Other Evaluated Magazine Submissions
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {otherMagResults.map((mr, idx) => (
                    <div key={idx} style={{ fontSize: "0.82rem", display: "flex", justifyContent: "space-between", padding: "4px 8px", backgroundColor: "#ffffff", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {mr.team?.institution?.name || mr.team?.name}
                      </span>
                      <span style={{ fontWeight: 900, color: "#0f766e", flexShrink: 0, marginLeft: "6px" }}>
                        {mr.grade ? `Grade ${mr.grade}` : ""} {mr.points > 0 ? `(${mr.points}p)` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "12px", marginTop: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", textAlign: "center", marginBottom: "10px" }}>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Jury Board Chairman
                </div>
              </div>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  General Convener
                </div>
              </div>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Steering Committee
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700 }}>
              <span>Certified Official Result Sheet &bull; {targetEvent.name}</span>
              <span>Program 43 College Magazine Competition &bull; Page 3 of 4</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 4: KALATHILAKAM (FADHILA & FADHEELA INDIVIDUAL CHAMPIONS) */}
        {/* ========================================================================= */}
        <div className="a4-page">
          <div>
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "3px double #0f172a", paddingBottom: "14px", marginBottom: "22px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", color: "#64748b" }}>
                {festName} &bull; {zoneTitle}
              </div>
              <h1 style={{
                margin: "4px 0",
                fontSize: "1.75rem",
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                color: "#701a75",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}>
                👑 KALATHILAKAM TITLES 👑
              </h1>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#a21caf", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                HIGHEST INDIVIDUAL POINT SCORERS
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{
                backgroundColor: "#fdf4ff",
                border: "1.5px solid #d946ef",
                color: "#86198f",
                padding: "4px 16px",
                borderRadius: "9999px",
                fontSize: "0.82rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}>
                Kalathilakam Declaration &bull; Page 4 of 4
              </span>
            </div>

            {/* SECTION 1: FADHILA KALATHILAKAM */}
            <div style={{
              border: "2.5px solid #0284c7",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "22px",
              backgroundColor: "#f0f9ff"
            }}>
              <div style={{
                display: "inline-block",
                backgroundColor: "#0284c7",
                color: "#ffffff",
                padding: "4px 16px",
                borderRadius: "6px",
                fontSize: "0.84rem",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "12px"
              }}>
                👑 FADHILA KALATHILAKAM (JUNIOR INDIVIDUAL CHAMPION)
              </div>

              {fadhilaKalathilakams.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {fadhilaKalathilakams.length > 1 && (
                    <div style={{
                      backgroundColor: "#e0f2fe",
                      border: "1px solid #7dd3fc",
                      color: "#0369a1",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 800
                    }}>
                      🤝 JOINT KALATHILAKAM: {fadhilaKalathilakams.length} candidates shared the exact same top score!
                    </div>
                  )}

                  {fadhilaKalathilakams.map((cand, idx) => (
                    <div key={cand.id || idx} style={{
                      border: "2px solid #0369a1",
                      borderRadius: "10px",
                      padding: "14px 18px",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px"
                    }}>
                      <div style={{ flex: 1, minWidth: "260px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{
                            backgroundColor: "#0284c7",
                            color: "#ffffff",
                            padding: "2px 10px",
                            borderRadius: "9999px",
                            fontSize: "0.74rem",
                            fontWeight: 900,
                            fontFamily: "'JetBrains Mono', monospace"
                          }}>
                            CHEST NO: {cand.chestNumber || "—"}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>
                            {cand.gold} Golds &bull; {cand.silver} Silvers
                          </span>
                        </div>

                        <h3 style={{ margin: "2px 0 4px 0", fontSize: "1.35rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#0c4a6e" }}>
                          {cand.name}
                        </h3>

                        <div style={{ fontSize: "0.85rem", color: "#0369a1", fontWeight: 700 }}>
                          🏫 {cand.teamName}
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: "#e0f2fe",
                        border: "2px solid #0284c7",
                        padding: "8px 20px",
                        borderRadius: "10px",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#0369a1", lineHeight: 1 }}>
                          {cand.points}
                        </div>
                        <div style={{ fontSize: "0.70rem", fontWeight: 900, color: "#0284c7", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          TOTAL POINTS
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#64748b" }}>No candidate scores recorded in Fadhila category yet.</div>
              )}
            </div>

            {/* SECTION 2: FADHEELA KALATHILAKAM */}
            <div style={{
              border: "2.5px solid #9d174d",
              borderRadius: "14px",
              padding: "16px 20px",
              backgroundColor: "#fdf2f8"
            }}>
              <div style={{
                display: "inline-block",
                backgroundColor: "#9d174d",
                color: "#ffffff",
                padding: "4px 16px",
                borderRadius: "6px",
                fontSize: "0.84rem",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "12px"
              }}>
                👑 FADHEELA KALATHILAKAM (SENIOR INDIVIDUAL CHAMPION)
              </div>

              {fadheelaKalathilakams.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {fadheelaKalathilakams.length > 1 && (
                    <div style={{
                      backgroundColor: "#fce7f3",
                      border: "1px solid #f472b6",
                      color: "#831843",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 800
                    }}>
                      🤝 JOINT KALATHILAKAM: {fadheelaKalathilakams.length} candidates shared the exact same top score!
                    </div>
                  )}

                  {fadheelaKalathilakams.map((cand, idx) => (
                    <div key={cand.id || idx} style={{
                      border: "2px solid #831843",
                      borderRadius: "10px",
                      padding: "14px 18px",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px"
                    }}>
                      <div style={{ flex: 1, minWidth: "260px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{
                            backgroundColor: "#9d174d",
                            color: "#ffffff",
                            padding: "2px 10px",
                            borderRadius: "9999px",
                            fontSize: "0.74rem",
                            fontWeight: 900,
                            fontFamily: "'JetBrains Mono', monospace"
                          }}>
                            CHEST NO: {cand.chestNumber || "—"}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>
                            {cand.gold} Golds &bull; {cand.silver} Silvers
                          </span>
                        </div>

                        <h3 style={{ margin: "2px 0 4px 0", fontSize: "1.35rem", fontFamily: "'Fraunces', serif", fontWeight: 900, color: "#831843" }}>
                          {cand.name}
                        </h3>

                        <div style={{ fontSize: "0.85rem", color: "#9d174d", fontWeight: 700 }}>
                          🏫 {cand.teamName}
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: "#fce7f3",
                        border: "2px solid #9d174d",
                        padding: "8px 20px",
                        borderRadius: "10px",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#831843", lineHeight: 1 }}>
                          {cand.points}
                        </div>
                        <div style={{ fontSize: "0.70rem", fontWeight: 900, color: "#9d174d", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          TOTAL POINTS
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#64748b" }}>No candidate scores recorded in Fadheela category yet.</div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "12px", marginTop: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", textAlign: "center", marginBottom: "10px" }}>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Jury Board Chairman
                </div>
              </div>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  General Convener
                </div>
              </div>
              <div>
                <div style={{ height: "30px", borderBottom: "1px dashed #94a3b8", marginBottom: "4px" }}></div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Steering Committee
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700 }}>
              <span>Certified Official Result Sheet &bull; {targetEvent.name}</span>
              <span>Individual Competitions Only &bull; Page 4 of 4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
