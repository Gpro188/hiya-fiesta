import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getPublicEventData } from "@/app/actions/public";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ZonalResultsSummaryPage(props: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  let eventId = searchParams.eventId;

  // Find active event or first event if not provided
  if (!eventId) {
    const defaultEv = await prisma.event.findFirst({
      where: {
        statusOverride: { in: ["LIVE", "COMPLETED", "SCHEDULE_PUBLISHED"] }
      },
      orderBy: { updatedAt: "desc" }
    }) || await prisma.event.findFirst({ orderBy: { updatedAt: "desc" } });
    eventId = defaultEv?.id;
  }

  if (!eventId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>No event found</h2>
        <p>Please create an event first.</p>
      </div>
    );
  }

  const [activeEv, allEvents, settings, publicRes] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true }
    }),
    prisma.event.findMany({
      where: { parentId: null },
      include: { subEvents: true, zone: true },
      orderBy: { name: "asc" }
    }),
    getSettings(eventId),
    getPublicEventData(eventId)
  ]);

  const data = publicRes.data || {
    leaderboard: [],
    teams: [],
    topStars: [],
    categoryStars: {},
    champions: null,
    stats: null
  };

  const champions: any = (data as any).champions || {
    overallChampion: data.leaderboard[0] || null,
    overallRunnerUp: data.leaderboard[1] || null,
    overallSecondRunnerUp: data.leaderboard[2] || null,
    fadhilaTopInstitution: null,
    fadhilaRunnerUpInstitution: null,
    fadhilaSecondRunnerUpInstitution: null,
    fadheelaTopInstitution: null,
    fadheelaRunnerUpInstitution: null,
    fadheelaSecondRunnerUpInstitution: null,
    overallTopStar: data.topStars[0] || null,
    fadhilaTopStar: null,
    fadheelaTopStar: null,
    fadhilaCategoryStars: [],
    fadheelaCategoryStars: [],
    fadhilaLeaderboard: [],
    fadheelaLeaderboard: []
  };

  const leaderboard: any[] = data.leaderboard || [];

  const catStarsMap: Record<string, any[]> = (data?.categoryStars as any) || {};
  const fadhilaStarsList: any[] = (champions.fadhilaCategoryStars && champions.fadhilaCategoryStars.length > 0)
    ? champions.fadhilaCategoryStars
    : (catStarsMap["FADHILA"] || Object.entries(catStarsMap).find(([k]) => k.toUpperCase().includes("FADHILA"))?.[1] || []);

  const fadheelaStarsList: any[] = (champions.fadheelaCategoryStars && champions.fadheelaCategoryStars.length > 0)
    ? champions.fadheelaCategoryStars
    : (catStarsMap["FADHEELA"] || Object.entries(catStarsMap).find(([k]) => k.toUpperCase().includes("FADHEELA"))?.[1] || []);

  const fadhilaStar = champions.fadhilaTopStar || fadhilaStarsList[0] || null;
  const fadhilaRunnersUp = fadhilaStarsList.slice(1, 3);

  const fadheelaStar = champions.fadheelaTopStar || fadheelaStarsList[0] || null;
  const fadheelaRunnersUp = fadheelaStarsList.slice(1, 3);

  return (
    <div style={{
      maxWidth: "1000px",
      margin: "0 auto",
      padding: "24px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#0f172a",
      backgroundColor: "#ffffff",
      minHeight: "100vh"
    }}>
      {/* ── Screen Action & Filter Toolbar (No-Print) ── */}
      <div className="no-print" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        padding: "14px 20px",
        borderRadius: "10px",
        marginBottom: "24px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px"
        }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#f59e0b", color: "#78350f", padding: "2px 8px", borderRadius: "9999px", fontSize: "0.70rem", fontWeight: 900, textTransform: "uppercase" }}>
              🏆 OFFICIAL FINAL ANNOUNCEMENT
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
              ZONAL RESULTS &amp; CHAMPIONSHIP SUMMARY
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              {activeEv?.name} {activeEv?.zone ? `(${activeEv.zone.name})` : ""} • Total Institutions: {leaderboard.length}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <PrintButton label="🖨️ Print Final Announcement Sheet" />
            <Link
              href="/dashboard/reports"
              style={{
                padding: "8px 14px",
                backgroundColor: "#334155",
                color: "#ffffff",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 700
              }}
            >
              Back to Reports
            </Link>
          </div>
        </div>

        {/* Sub-Events / Zone Switcher */}
        {allEvents.length > 1 && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #1e293b", overflowX: "auto" }}>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>Select Zone/Event:</span>
            {allEvents.map((ev) => {
              const isSelected = ev.id === eventId;
              return (
                <a
                  key={ev.id}
                  href={`/print/results-summary?eventId=${ev.id}`}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.76rem",
                    fontWeight: isSelected ? 800 : 600,
                    textDecoration: "none",
                    backgroundColor: isSelected ? "#0284c7" : "#1e293b",
                    color: "#ffffff",
                    whiteSpace: "nowrap"
                  }}
                >
                  {ev.name} {ev.zone ? `(${ev.zone.name})` : ""}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Page Indicator Toolbar for Screen View ── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", color: "#64748b", fontSize: "0.78rem" }}>
        <span>📄 Sheet 1 of 2: Executive Championship &amp; Kalaathilakam Declaration</span>
        <span>Standard A4 Portrait Print Ready (210mm × 297mm)</span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── PAGE 1: EXECUTIVE CHAMPIONSHIPS & KALAATHILAKAM DECLARATION ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <div className="results-summary-page print-page page-sheet-1" style={{
        backgroundColor: "#ffffff",
        border: "1.5px solid #0f172a",
        padding: "18px 20px",
        borderRadius: "4px",
        marginBottom: "24px",
        boxSizing: "border-box"
      }}>
        
        <div>
          {/* Official Header */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "8px", marginBottom: "10px" }}>
            <div style={{ fontSize: "1.28rem", fontWeight: 900, textTransform: "uppercase", color: "#8E0033", letterSpacing: "0.5px", lineHeight: 1.15 }}>
              {settings.festName}
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginTop: "1px" }}>
              {settings.festMoto || "Annual Arts & Cultural Festival"}
            </div>
            <div style={{
              display: "inline-block",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              padding: "2px 14px",
              borderRadius: "3px",
              fontSize: "0.85rem",
              fontWeight: 900,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginTop: "4px"
            }}>
              OFFICIAL RESULTS &amp; CHAMPIONSHIP DECLARATION
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", fontSize: "0.76rem", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>
              <span>ZONE: <strong>{activeEv?.zone?.name || activeEv?.name || "ALL ZONES"}</strong></span>
              <span>•</span>
              <span>DATE: <strong>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong></span>
              <span>•</span>
              <span>STATUS: <strong>FINAL PUBLISHED</strong></span>
            </div>
          </div>

          {/* ── PART 1: OVERALL GRAND CHAMPIONS ── */}
          <div style={{ marginBottom: "10px" }}>
            <div style={{
              backgroundColor: "#fef3c7",
              border: "1.2px solid #f59e0b",
              borderLeft: "5px solid #d97706",
              padding: "4px 8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px"
            }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "#92400e", textTransform: "uppercase" }}>
                🏆 PART I: OVERALL GRAND CHAMPIONSHIP
              </span>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#b45309" }}>
                CUMULATIVE FESTIVAL POINTS
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "8px" }}>
              
              {/* 1st Place Champion */}
              <div style={{
                border: "1.8px solid #f59e0b",
                backgroundColor: "#fffbeb",
                borderRadius: "5px",
                padding: "8px 6px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 900, color: "#b45309", textTransform: "uppercase" }}>
                  🥇 GRAND CHAMPION (1ST)
                </div>
                <div style={{ fontSize: "1.02rem", fontWeight: 900, color: "#0f172a", marginTop: "2px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {champions.overallChampion?.name || "—"}
                </div>
                {champions.overallChampion?.place && (
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📍 {champions.overallChampion.place}
                  </div>
                )}
                <div style={{ fontSize: "1.28rem", fontWeight: 900, color: "#b45309", marginTop: "3px", fontFamily: "monospace", lineHeight: 1 }}>
                  {champions.overallChampion?.points || 0} <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>PTS</span>
                </div>
                <div style={{ fontSize: "0.66rem", color: "#475569", marginTop: "2px" }}>
                  🥇 {champions.overallChampion?.gold || 0} • 🥈 {champions.overallChampion?.silver || 0} • 🥉 {champions.overallChampion?.bronze || 0}
                </div>
              </div>

              {/* 2nd Place Runner Up */}
              <div style={{
                border: "1.2px solid #94a3b8",
                backgroundColor: "#f8fafc",
                borderRadius: "5px",
                padding: "8px 6px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 900, color: "#475569", textTransform: "uppercase" }}>
                  🥈 1ST RUNNER UP (2ND)
                </div>
                <div style={{ fontSize: "0.96rem", fontWeight: 800, color: "#0f172a", marginTop: "2px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {champions.overallRunnerUp?.name || "—"}
                </div>
                {champions.overallRunnerUp?.place && (
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📍 {champions.overallRunnerUp.place}
                  </div>
                )}
                <div style={{ fontSize: "1.20rem", fontWeight: 900, color: "#334155", marginTop: "3px", fontFamily: "monospace", lineHeight: 1 }}>
                  {champions.overallRunnerUp?.points || 0} <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>PTS</span>
                </div>
                <div style={{ fontSize: "0.66rem", color: "#475569", marginTop: "2px" }}>
                  🥇 {champions.overallRunnerUp?.gold || 0} • 🥈 {champions.overallRunnerUp?.silver || 0} • 🥉 {champions.overallRunnerUp?.bronze || 0}
                </div>
              </div>

              {/* 3rd Place 2nd Runner Up */}
              <div style={{
                border: "1.2px solid #f97316",
                backgroundColor: "#fff7ed",
                borderRadius: "5px",
                padding: "8px 6px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 900, color: "#c2410c", textTransform: "uppercase" }}>
                  🥉 2ND RUNNER UP (3RD)
                </div>
                <div style={{ fontSize: "0.96rem", fontWeight: 800, color: "#0f172a", marginTop: "2px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {champions.overallSecondRunnerUp?.name || "—"}
                </div>
                {champions.overallSecondRunnerUp?.place && (
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📍 {champions.overallSecondRunnerUp.place}
                  </div>
                )}
                <div style={{ fontSize: "1.20rem", fontWeight: 900, color: "#c2410c", marginTop: "3px", fontFamily: "monospace", lineHeight: 1 }}>
                  {champions.overallSecondRunnerUp?.points || 0} <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>PTS</span>
                </div>
                <div style={{ fontSize: "0.66rem", color: "#475569", marginTop: "2px" }}>
                  🥇 {champions.overallSecondRunnerUp?.gold || 0} • 🥈 {champions.overallSecondRunnerUp?.silver || 0} • 🥉 {champions.overallSecondRunnerUp?.bronze || 0}
                </div>
              </div>

            </div>
          </div>

          {/* ── PART II: CATEGORY CHAMPIONSHIPS (INSTITUTIONS) ── */}
          <div style={{ marginBottom: "10px" }}>
            <div style={{
              backgroundColor: "#fdf2f8",
              border: "1.2px solid #f472b6",
              borderLeft: "5px solid #e6007e",
              padding: "4px 8px",
              marginBottom: "6px"
            }}>
              <span style={{ fontSize: "0.80rem", fontWeight: 900, color: "#9d174d", textTransform: "uppercase" }}>
                🌺 PART II: CATEGORY CHAMPIONSHIPS (INSTITUTIONS)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {/* Fadhila Category Box */}
              <div style={{ border: "1.2px solid #fbcfe8", backgroundColor: "#fff1f2", padding: "8px 10px", borderRadius: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "0.76rem", color: "#e11d48", textTransform: "uppercase" }}>🌺 FADHILA CHAMPION</strong>
                  <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#e11d48", fontFamily: "monospace" }}>
                    {champions.fadhilaTopInstitution?.fadhilaPoints || 0} PTS
                  </span>
                </div>
                <div style={{ fontSize: "0.96rem", fontWeight: 900, color: "#0f172a", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  🥇 1st: {champions.fadhilaTopInstitution?.name || "—"}
                </div>
                {champions.fadhilaTopInstitution?.place && (
                  <div style={{ fontSize: "0.70rem", fontWeight: 600, color: "#64748b" }}>
                    📍 {champions.fadhilaTopInstitution.place}
                  </div>
                )}
                {champions.fadhilaRunnerUpInstitution && (
                  <div style={{ fontSize: "0.70rem", color: "#475569", marginTop: "4px", borderTop: "1px dashed #fecdd3", paddingTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🥈 2nd: <strong>{champions.fadhilaRunnerUpInstitution.name}</strong> ({champions.fadhilaRunnerUpInstitution.fadhilaPoints} PTS)
                    {champions.fadhilaSecondRunnerUpInstitution && (
                      <span> • 🥉 3rd: <strong>{champions.fadhilaSecondRunnerUpInstitution.name}</strong> ({champions.fadhilaSecondRunnerUpInstitution.fadhilaPoints} PTS)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Fadheela Category Box */}
              <div style={{ border: "1.2px solid #e9d5ff", backgroundColor: "#faf5ff", padding: "8px 10px", borderRadius: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "0.76rem", color: "#7c3aed", textTransform: "uppercase" }}>🌸 FADHEELA CHAMPION</strong>
                  <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#7c3aed", fontFamily: "monospace" }}>
                    {champions.fadheelaTopInstitution?.fadheelaPoints || 0} PTS
                  </span>
                </div>
                <div style={{ fontSize: "0.96rem", fontWeight: 900, color: "#0f172a", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  🥇 1st: {champions.fadheelaTopInstitution?.name || "—"}
                </div>
                {champions.fadheelaTopInstitution?.place && (
                  <div style={{ fontSize: "0.70rem", fontWeight: 600, color: "#64748b" }}>
                    📍 {champions.fadheelaTopInstitution.place}
                  </div>
                )}
                {champions.fadheelaRunnerUpInstitution && (
                  <div style={{ fontSize: "0.70rem", color: "#475569", marginTop: "4px", borderTop: "1px dashed #e9d5ff", paddingTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🥈 2nd: <strong>{champions.fadheelaRunnerUpInstitution.name}</strong> ({champions.fadheelaRunnerUpInstitution.fadheelaPoints} PTS)
                    {champions.fadheelaSecondRunnerUpInstitution && (
                      <span> • 🥉 3rd: <strong>{champions.fadheelaSecondRunnerUpInstitution.name}</strong> ({champions.fadheelaSecondRunnerUpInstitution.fadheelaPoints} PTS)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── PART III: KALAATHILAKAM (INDIVIDUAL CATEGORY CHAMPIONS) ── */}
          <div style={{ marginBottom: "6px" }}>
            <div style={{
              backgroundColor: "#f0fdf4",
              border: "1.2px solid #86efac",
              borderLeft: "5px solid #16a34a",
              padding: "4px 8px",
              marginBottom: "6px"
            }}>
              <span style={{ fontSize: "0.80rem", fontWeight: 900, color: "#166534", textTransform: "uppercase" }}>
                👑 PART III: KALAATHILAKAM (INDIVIDUAL CATEGORY CHAMPIONS)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              
              {/* FADHILA KALAATHILAKAM CARD */}
              <div style={{
                border: "1.5px solid #f43f5e",
                backgroundColor: "#fff1f2",
                borderRadius: "5px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #fecdd3", paddingBottom: "3px", marginBottom: "5px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#be123c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      🌺 FADHILA KALAATHILAKAM
                    </span>
                    <span style={{ fontSize: "0.64rem", fontWeight: 900, backgroundColor: "#f43f5e", color: "#ffffff", padding: "1px 6px", borderRadius: "8px" }}>
                      TOP PERFORMER
                    </span>
                  </div>

                  {fadhilaStar ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#e11d48", textTransform: "uppercase" }}>
                            🥇 1st Rank • Chest #{fadhilaStar.chestNumber || "—"}
                          </div>
                          <div style={{ fontSize: "1.02rem", fontWeight: 900, color: "#0f172a", marginTop: "1px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {fadhilaStar.name}
                          </div>
                          <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#334155", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            🏛️ {fadhilaStar.institutionName || fadhilaStar.teamName}
                            {fadhilaStar.institutionPlace && (
                              <span style={{ fontWeight: 600, color: "#64748b" }}> ({fadhilaStar.institutionPlace})</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "1.30rem", fontWeight: 900, color: "#e11d48", fontFamily: "monospace", lineHeight: 1 }}>
                            {fadhilaStar.totalPoints || fadhilaStar.points} <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>PTS</span>
                          </div>
                        </div>
                      </div>

                      {/* Fadhila Runners-up */}
                      {fadhilaRunnersUp.length > 0 && (
                        <div style={{ borderTop: "1px dashed #fda4af", marginTop: "6px", paddingTop: "5px", display: "flex", flexDirection: "column", gap: "3px" }}>
                          {fadhilaRunnersUp.map((ru: any, idx: number) => (
                            <div key={ru.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.70rem" }}>
                              <div style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "4px" }}>
                                <span style={{ fontWeight: 800 }}>{idx === 0 ? "🥈 2nd:" : "🥉 3rd:"}</span>{" "}
                                <strong>{ru.name}</strong> #{ru.chestNumber || "—"} — {ru.institutionName || ru.teamName}
                                {ru.institutionPlace && <span style={{ color: "#64748b" }}> ({ru.institutionPlace})</span>}
                              </div>
                              <span style={{ fontWeight: 800, color: "#be123c", fontFamily: "monospace", flexShrink: 0 }}>
                                {ru.totalPoints || ru.points} PTS
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.74rem", color: "#94a3b8", fontStyle: "italic", padding: "6px 0" }}>
                      Awaiting Fadhila category results
                    </div>
                  )}
                </div>
              </div>

              {/* FADHEELA KALAATHILAKAM CARD */}
              <div style={{
                border: "1.5px solid #8b5cf6",
                backgroundColor: "#faf5ff",
                borderRadius: "5px",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd6fe", paddingBottom: "3px", marginBottom: "5px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      🌸 FADHEELA KALAATHILAKAM
                    </span>
                    <span style={{ fontSize: "0.64rem", fontWeight: 900, backgroundColor: "#8b5cf6", color: "#ffffff", padding: "1px 6px", borderRadius: "8px" }}>
                      TOP PERFORMER
                    </span>
                  </div>

                  {fadheelaStar ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase" }}>
                            🥇 1st Rank • Chest #{fadheelaStar.chestNumber || "—"}
                          </div>
                          <div style={{ fontSize: "1.02rem", fontWeight: 900, color: "#0f172a", marginTop: "1px", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {fadheelaStar.name}
                          </div>
                          <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#334155", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            🏛️ {fadheelaStar.institutionName || fadheelaStar.teamName}
                            {fadheelaStar.institutionPlace && (
                              <span style={{ fontWeight: 600, color: "#64748b" }}> ({fadheelaStar.institutionPlace})</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "1.30rem", fontWeight: 900, color: "#7c3aed", fontFamily: "monospace", lineHeight: 1 }}>
                            {fadheelaStar.totalPoints || fadheelaStar.points} <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>PTS</span>
                          </div>
                        </div>
                      </div>

                      {/* Fadheela Runners-up */}
                      {fadheelaRunnersUp.length > 0 && (
                        <div style={{ borderTop: "1px dashed #c4b5fd", marginTop: "6px", paddingTop: "5px", display: "flex", flexDirection: "column", gap: "3px" }}>
                          {fadheelaRunnersUp.map((ru: any, idx: number) => (
                            <div key={ru.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.70rem" }}>
                              <div style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "4px" }}>
                                <span style={{ fontWeight: 800 }}>{idx === 0 ? "🥈 2nd:" : "🥉 3rd:"}</span>{" "}
                                <strong>{ru.name}</strong> #{ru.chestNumber || "—"} — {ru.institutionName || ru.teamName}
                                {ru.institutionPlace && <span style={{ color: "#64748b" }}> ({ru.institutionPlace})</span>}
                              </div>
                              <span style={{ fontWeight: 800, color: "#6d28d9", fontFamily: "monospace", flexShrink: 0 }}>
                                {ru.totalPoints || ru.points} PTS
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.74rem", color: "#94a3b8", fontStyle: "italic", padding: "6px 0" }}>
                      Awaiting Fadheela category results
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Page 1 Footer Note */}
        <div style={{
          marginTop: "auto",
          paddingTop: "6px",
          borderTop: "1.2px solid #0f172a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "#475569"
        }}>
          <span>{settings.festName} • OFFICIAL CHAMPIONSHIP DECLARATION</span>
          <span style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "1px 7px", borderRadius: "3px", fontSize: "0.64rem" }}>
            PAGE 1 OF 2 • OVERALL TABULATION ON SHEET 2 ⏩
          </span>
        </div>

      </div>

      {/* ── Page Indicator Toolbar for Screen View ── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", color: "#64748b", fontSize: "0.78rem" }}>
        <span>📄 Sheet 2 of 2: Tabulation Standings &amp; Official Attestation</span>
        <span>Standard A4 Portrait Print Ready (210mm × 297mm)</span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── PAGE 2: COMPLETE INSTITUTION STANDINGS & OFFICIAL ATTESTATION ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <div className="results-summary-page print-page page-sheet-2" style={{
        backgroundColor: "#ffffff",
        border: "1.5px solid #0f172a",
        padding: "18px 20px",
        borderRadius: "4px",
        boxSizing: "border-box"
      }}>
        
        <div>
          {/* Page 2 Mini Header */}
          <div style={{ textAlign: "center", borderBottom: "1.5px solid #0f172a", paddingBottom: "6px", marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#8E0033", textTransform: "uppercase", lineHeight: 1.15 }}>
                  {settings.festName}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700 }}>
                  ZONE: {activeEv?.zone?.name || activeEv?.name || "ALL ZONES"} • DATE: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
              <div style={{
                backgroundColor: "#0f172a",
                color: "#ffffff",
                padding: "3px 10px",
                borderRadius: "3px",
                fontSize: "0.76rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                TABULATION SUMMARY &amp; AUDIT
              </div>
            </div>
          </div>

          {/* ── PART 4: COMPLETE INSTITUTION STANDINGS TABLE ── */}
          <div style={{ marginBottom: "10px" }}>
            <div style={{
              backgroundColor: "#0f172a",
              color: "#ffffff",
              padding: "4px 8px",
              fontSize: "0.80rem",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "5px"
            }}>
              📊 PART IV: COMPLETE INSTITUTION STANDINGS (TABULATION SUMMARY)
            </div>

            <table style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse",
              fontSize: "0.72rem",
              border: "1.2px solid #0f172a"
            }}>
              <thead>
                <tr style={{ backgroundColor: "#1e293b", color: "#ffffff", textAlign: "center" }}>
                  <th style={{ border: "1px solid #475569", padding: "4px 2px", width: "6%" }}>Rank</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 6px", textAlign: "left", width: "36%" }}>Institution Name</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 4px", width: "14%" }}>Place</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 2px", width: "8%", backgroundColor: "#334155" }}>Fadhila</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 2px", width: "8%", backgroundColor: "#334155" }}>Fadheela</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 2px", width: "7%" }}>General</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 2px", width: "5%" }}>🥇</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 2px", width: "5%" }}>🥈</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 2px", width: "5%" }}>🥉</th>
                  <th style={{ border: "1px solid #475569", padding: "4px 2px", width: "9%", backgroundColor: "#8E0033", color: "#ffffff" }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((team: any, index: number) => {
                  const rank = index + 1;
                  const isChampion = rank === 1;
                  const isRunnerUp = rank === 2;
                  const isSecondRunnerUp = rank === 3;

                  return (
                    <tr
                      key={team.id}
                      style={{
                        backgroundColor: isChampion ? "#fffbeb" : isRunnerUp ? "#f8fafc" : isSecondRunnerUp ? "#fff7ed" : index % 2 === 0 ? "#ffffff" : "#f8fafc",
                        fontWeight: rank <= 3 ? 700 : 500
                      }}
                    >
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 1px", textAlign: "center", fontWeight: 900 }}>
                        {rank === 1 ? "🥇 1" : rank === 2 ? "🥈 2" : rank === 3 ? "🥉 3" : rank}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 6px", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 800, color: "#0f172a" }}>{team.name}</span>
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 4px", textAlign: "center", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {team.place || "—"}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 2px", textAlign: "center", fontFamily: "monospace", color: "#e11d48", fontWeight: 700 }}>
                        {team.fadhilaPoints || 0}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 2px", textAlign: "center", fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>
                        {team.fadheelaPoints || 0}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 2px", textAlign: "center", fontFamily: "monospace", color: "#475569" }}>
                        {team.generalPoints || 0}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 2px", textAlign: "center", color: "#b45309", fontWeight: 800 }}>
                        {team.gold || 0}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 2px", textAlign: "center", color: "#475569", fontWeight: 800 }}>
                        {team.silver || 0}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 2px", textAlign: "center", color: "#c2410c", fontWeight: 800 }}>
                        {team.bronze || 0}
                      </td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "3.5px 2px", textAlign: "center", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 900, color: "#8E0033", backgroundColor: isChampion ? "#fef3c7" : "transparent" }}>
                        {team.points || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── PART 5: OFFICIAL ATTESTATION & SIGNATORIES ── */}
          <div style={{
            marginTop: "10px",
            border: "1.2px solid #0f172a",
            borderRadius: "4px",
            padding: "8px 12px",
            backgroundColor: "#fafafa",
            pageBreakInside: "avoid"
          }}>
            <div style={{ fontSize: "0.68rem", color: "#475569", marginBottom: "8px", fontStyle: "italic", textAlign: "center" }}>
              We hereby certify that the above results, individual awards, and championship declarations have been duly tabulated, audited, and approved in accordance with official festival regulations and by-laws.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", textAlign: "center", marginTop: "10px" }}>
              <div>
                <div style={{ borderBottom: "1.2px solid #0f172a", height: "22px", marginBottom: "4px" }}></div>
                <div style={{ fontWeight: 800, fontSize: "0.72rem" }}>Chief Tabulator</div>
                <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Result Audit &amp; Scrutiny</div>
              </div>
              <div>
                <div style={{ borderBottom: "1.2px solid #0f172a", height: "22px", marginBottom: "4px" }}></div>
                <div style={{ fontWeight: 800, fontSize: "0.72rem" }}>Program Convener</div>
                <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Event Committee</div>
              </div>
              <div>
                <div style={{ borderBottom: "1.2px solid #0f172a", height: "22px", marginBottom: "4px" }}></div>
                <div style={{ fontWeight: 800, fontSize: "0.72rem" }}>Zonal Gen. Secretary</div>
                <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Executive Declaration</div>
              </div>
              <div>
                <div style={{
                  border: "1.2px dashed #475569",
                  height: "38px",
                  margin: "0 auto 4px",
                  width: "75px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.60rem",
                  color: "#64748b",
                  fontWeight: 700
                }}>
                  OFFICIAL SEAL
                </div>
                <div style={{ fontWeight: 800, fontSize: "0.72rem" }}>Zonal President</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div style={{
          marginTop: "auto",
          paddingTop: "6px",
          borderTop: "1.2px solid #0f172a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "#475569"
        }}>
          <span>{settings.festName} • OFFICIAL TABULATION SUMMARY</span>
          <span style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "1px 7px", borderRadius: "3px", fontSize: "0.64rem" }}>
            PAGE 2 OF 2 • COMPLETE AUDIT RECORD
          </span>
        </div>

      </div>

      {/* ── Print Styles ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            html, body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .results-summary-page {
              box-shadow: none !important;
              border: 1.2px solid #000000 !important;
              padding: 5mm 6mm !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
            }
            .print-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              height: 284mm !important;
              max-height: 284mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              justifyContent: space-between !important;
            }
            .print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            @page {
              size: A4 portrait;
              margin: 6mm 7mm 6mm 7mm;
            }
          }
        `
      }} />
    </div>
  );
}
