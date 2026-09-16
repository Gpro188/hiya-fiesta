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

      {/* ── Printable Official Document Sheet ── */}
      <div className="results-summary-page" style={{
        backgroundColor: "#ffffff",
        border: "2px solid #0f172a",
        padding: "24px 28px",
        borderRadius: "4px"
      }}>
        
        {/* Official Header */}
        <div style={{ textAlign: "center", borderBottom: "2.5px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, textTransform: "uppercase", color: "#8E0033", letterSpacing: "1px" }}>
            {settings.festName}
          </div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#475569", marginTop: "2px" }}>
            {settings.festMoto || "Annual Arts & Cultural Festival"}
          </div>
          <div style={{
            display: "inline-block",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "4px 16px",
            borderRadius: "4px",
            fontSize: "0.95rem",
            fontWeight: 900,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginTop: "6px"
          }}>
            OFFICIAL RESULTS &amp; CHAMPIONSHIP DECLARATION
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", marginTop: "6px" }}>
            <span>ZONE: <strong>{activeEv?.zone?.name || activeEv?.name || "ALL ZONES"}</strong></span>
            <span>•</span>
            <span>DATE: <strong>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</strong></span>
            <span>•</span>
            <span>STATUS: <strong>FINAL PUBLISHED</strong></span>
          </div>
        </div>

        {/* ── PART 1: OVERALL GRAND CHAMPIONS ── */}
        <div style={{ marginBottom: "18px" }}>
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
            <span style={{ fontSize: "0.88rem", fontWeight: 900, color: "#92400e", textTransform: "uppercase" }}>
              🏆 PART I: OVERALL GRAND CHAMPIONSHIP
            </span>
            <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#b45309" }}>
              CUMULATIVE FESTIVAL POINTS
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" }}>
            
            {/* 1st Place Champion */}
            <div style={{
              border: "2px solid #f59e0b",
              backgroundColor: "#fffbeb",
              borderRadius: "6px",
              padding: "12px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#b45309", textTransform: "uppercase" }}>
                🥇 GRAND CHAMPION (1ST PLACE)
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", marginTop: "4px", lineHeight: 1.2 }}>
                {champions.overallChampion?.name || "—"}
              </div>
              {champions.overallChampion?.place && (
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                  📍 {champions.overallChampion.place}
                </div>
              )}
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#b45309", marginTop: "6px", fontFamily: "monospace" }}>
                {champions.overallChampion?.points || 0} <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>PTS</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "2px" }}>
                🥇 {champions.overallChampion?.gold || 0} Gold • 🥈 {champions.overallChampion?.silver || 0} Silver • 🥉 {champions.overallChampion?.bronze || 0} Bronze
              </div>
            </div>

            {/* 2nd Place Runner Up */}
            <div style={{
              border: "1.5px solid #94a3b8",
              backgroundColor: "#f8fafc",
              borderRadius: "6px",
              padding: "12px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#475569", textTransform: "uppercase" }}>
                🥈 1ST RUNNER UP (2ND PLACE)
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "#0f172a", marginTop: "4px", lineHeight: 1.2 }}>
                {champions.overallRunnerUp?.name || "—"}
              </div>
              {champions.overallRunnerUp?.place && (
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                  📍 {champions.overallRunnerUp.place}
                </div>
              )}
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#334155", marginTop: "6px", fontFamily: "monospace" }}>
                {champions.overallRunnerUp?.points || 0} <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>PTS</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "2px" }}>
                🥇 {champions.overallRunnerUp?.gold || 0} Gold • 🥈 {champions.overallRunnerUp?.silver || 0} Silver • 🥉 {champions.overallRunnerUp?.bronze || 0} Bronze
              </div>
            </div>

            {/* 3rd Place 2nd Runner Up */}
            <div style={{
              border: "1.5px solid #f97316",
              backgroundColor: "#fff7ed",
              borderRadius: "6px",
              padding: "12px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#c2410c", textTransform: "uppercase" }}>
                🥉 2ND RUNNER UP (3RD PLACE)
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "#0f172a", marginTop: "4px", lineHeight: 1.2 }}>
                {champions.overallSecondRunnerUp?.name || "—"}
              </div>
              {champions.overallSecondRunnerUp?.place && (
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                  📍 {champions.overallSecondRunnerUp.place}
                </div>
              )}
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#c2410c", marginTop: "6px", fontFamily: "monospace" }}>
                {champions.overallSecondRunnerUp?.points || 0} <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>PTS</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "2px" }}>
                🥇 {champions.overallSecondRunnerUp?.gold || 0} Gold • 🥈 {champions.overallSecondRunnerUp?.silver || 0} Silver • 🥉 {champions.overallSecondRunnerUp?.bronze || 0} Bronze
              </div>
            </div>

          </div>
        </div>

        {/* ── PART II: CATEGORY CHAMPIONSHIPS (INSTITUTIONS) ── */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            backgroundColor: "#fdf2f8",
            border: "1.5px solid #f472b6",
            borderLeft: "6px solid #e6007e",
            padding: "5px 12px",
            marginBottom: "8px"
          }}>
            <span style={{ fontSize: "0.84rem", fontWeight: 900, color: "#9d174d", textTransform: "uppercase" }}>
              🌺 PART II: CATEGORY CHAMPIONSHIPS (INSTITUTIONS)
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Fadhila Category Box */}
            <div style={{ border: "1.2px solid #fbcfe8", backgroundColor: "#fff1f2", padding: "10px 14px", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.82rem", color: "#e11d48", textTransform: "uppercase" }}>🌺 FADHILA CATEGORY CHAMPION</strong>
                <span style={{ fontSize: "0.92rem", fontWeight: 900, color: "#e11d48", fontFamily: "monospace" }}>
                  {champions.fadhilaTopInstitution?.fadhilaPoints || 0} PTS
                </span>
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 900, color: "#0f172a", marginTop: "3px" }}>
                🥇 1st: {champions.fadhilaTopInstitution?.name || "—"}
              </div>
              {champions.fadhilaTopInstitution?.place && (
                <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "1px" }}>
                  📍 {champions.fadhilaTopInstitution.place}
                </div>
              )}
              {champions.fadhilaRunnerUpInstitution && (
                <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "5px", borderTop: "1px dashed #fecdd3", paddingTop: "4px" }}>
                  🥈 2nd: <strong>{champions.fadhilaRunnerUpInstitution.name}</strong> ({champions.fadhilaRunnerUpInstitution.fadhilaPoints} PTS)
                  {champions.fadhilaSecondRunnerUpInstitution && (
                    <span> • 🥉 3rd: <strong>{champions.fadhilaSecondRunnerUpInstitution.name}</strong> ({champions.fadhilaSecondRunnerUpInstitution.fadhilaPoints} PTS)</span>
                  )}
                </div>
              )}
            </div>

            {/* Fadheela Category Box */}
            <div style={{ border: "1.2px solid #e9d5ff", backgroundColor: "#faf5ff", padding: "10px 14px", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.82rem", color: "#7c3aed", textTransform: "uppercase" }}>🌸 FADHEELA CATEGORY CHAMPION</strong>
                <span style={{ fontSize: "0.92rem", fontWeight: 900, color: "#7c3aed", fontFamily: "monospace" }}>
                  {champions.fadheelaTopInstitution?.fadheelaPoints || 0} PTS
                </span>
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 900, color: "#0f172a", marginTop: "3px" }}>
                🥇 1st: {champions.fadheelaTopInstitution?.name || "—"}
              </div>
              {champions.fadheelaTopInstitution?.place && (
                <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "1px" }}>
                  📍 {champions.fadheelaTopInstitution.place}
                </div>
              )}
              {champions.fadheelaRunnerUpInstitution && (
                <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "5px", borderTop: "1px dashed #e9d5ff", paddingTop: "4px" }}>
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
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            backgroundColor: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderLeft: "6px solid #16a34a",
            padding: "5px 12px",
            marginBottom: "8px"
          }}>
            <span style={{ fontSize: "0.84rem", fontWeight: 900, color: "#166534", textTransform: "uppercase" }}>
              👑 PART III: KALAATHILAKAM (INDIVIDUAL CATEGORY CHAMPIONS)
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            
            {/* FADHILA KALAATHILAKAM CARD */}
            <div style={{
              border: "1.5px solid #f43f5e",
              backgroundColor: "#fff1f2",
              borderRadius: "6px",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #fecdd3", paddingBottom: "4px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.80rem", fontWeight: 900, color: "#be123c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    🌺 FADHILA KALAATHILAKAM
                  </span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 900, backgroundColor: "#f43f5e", color: "#ffffff", padding: "1px 7px", borderRadius: "10px" }}>
                    TOP PERFORMER
                  </span>
                </div>

                {fadhilaStar ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.70rem", fontWeight: 800, color: "#e11d48", textTransform: "uppercase" }}>
                          🥇 1st Rank • Chest #{fadhilaStar.chestNumber || "—"}
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a", marginTop: "2px", lineHeight: 1.2 }}>
                          {fadhilaStar.name}
                        </div>
                        <div style={{ fontSize: "0.80rem", fontWeight: 800, color: "#334155", marginTop: "3px" }}>
                          🏛️ {fadhilaStar.institutionName || fadhilaStar.teamName}
                          {fadhilaStar.institutionPlace && (
                            <span style={{ fontWeight: 600, color: "#64748b" }}> ({fadhilaStar.institutionPlace})</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#e11d48", fontFamily: "monospace" }}>
                          {fadhilaStar.totalPoints || fadhilaStar.points} <span style={{ fontSize: "0.70rem", fontWeight: 700 }}>PTS</span>
                        </div>
                      </div>
                    </div>

                    {/* Fadhila Runners-up */}
                    {fadhilaRunnersUp.length > 0 && (
                      <div style={{ borderTop: "1px dashed #fda4af", marginTop: "8px", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {fadhilaRunnersUp.map((ru: any, idx: number) => (
                          <div key={ru.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.73rem" }}>
                            <div style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "6px" }}>
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
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>
                    Awaiting Fadhila category results
                  </div>
                )}
              </div>
            </div>

            {/* FADHEELA KALAATHILAKAM CARD */}
            <div style={{
              border: "1.5px solid #8b5cf6",
              backgroundColor: "#faf5ff",
              borderRadius: "6px",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #ddd6fe", paddingBottom: "4px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.80rem", fontWeight: 900, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    🌸 FADHEELA KALAATHILAKAM
                  </span>
                  <span style={{ fontSize: "0.68rem", fontWeight: 900, backgroundColor: "#8b5cf6", color: "#ffffff", padding: "1px 7px", borderRadius: "10px" }}>
                    TOP PERFORMER
                  </span>
                </div>

                {fadheelaStar ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.70rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase" }}>
                          🥇 1st Rank • Chest #{fadheelaStar.chestNumber || "—"}
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a", marginTop: "2px", lineHeight: 1.2 }}>
                          {fadheelaStar.name}
                        </div>
                        <div style={{ fontSize: "0.80rem", fontWeight: 800, color: "#334155", marginTop: "3px" }}>
                          🏛️ {fadheelaStar.institutionName || fadheelaStar.teamName}
                          {fadheelaStar.institutionPlace && (
                            <span style={{ fontWeight: 600, color: "#64748b" }}> ({fadheelaStar.institutionPlace})</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#7c3aed", fontFamily: "monospace" }}>
                          {fadheelaStar.totalPoints || fadheelaStar.points} <span style={{ fontSize: "0.70rem", fontWeight: 700 }}>PTS</span>
                        </div>
                      </div>
                    </div>

                    {/* Fadheela Runners-up */}
                    {fadheelaRunnersUp.length > 0 && (
                      <div style={{ borderTop: "1px dashed #c4b5fd", marginTop: "8px", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {fadheelaRunnersUp.map((ru: any, idx: number) => (
                          <div key={ru.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.73rem" }}>
                            <div style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "6px" }}>
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
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>
                    Awaiting Fadheela category results
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── PART 4: COMPLETE INSTITUTION STANDINGS TABLE ── */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "5px 12px",
            fontSize: "0.84rem",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            📊 PART IV: COMPLETE INSTITUTION STANDINGS (TABULATION SUMMARY)
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", border: "1.5px solid #0f172a" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e293b", color: "#ffffff", textAlign: "center" }}>
                <th style={{ border: "1px solid #475569", padding: "5px 4px", width: "40px" }}>Rank</th>
                <th style={{ border: "1px solid #475569", padding: "5px 8px", textAlign: "left" }}>Institution Name</th>
                <th style={{ border: "1px solid #475569", padding: "5px 6px", width: "100px" }}>Place</th>
                <th style={{ border: "1px solid #475569", padding: "5px 4px", width: "80px", backgroundColor: "#334155" }}>Fadhila</th>
                <th style={{ border: "1px solid #475569", padding: "5px 4px", width: "80px", backgroundColor: "#334155" }}>Fadheela</th>
                <th style={{ border: "1px solid #475569", padding: "5px 4px", width: "75px" }}>General</th>
                <th style={{ border: "1px solid #475569", padding: "5px 4px", width: "45px" }}>🥇 1st</th>
                <th style={{ border: "1px solid #475569", padding: "5px 4px", width: "45px" }}>🥈 2nd</th>
                <th style={{ border: "1px solid #475569", padding: "5px 4px", width: "45px" }}>🥉 3rd</th>
                <th style={{ border: "1px solid #475569", padding: "5px 4px", width: "90px", backgroundColor: "#8E0033", color: "#ffffff" }}>TOTAL</th>
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
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 2px", textAlign: "center", fontWeight: 900 }}>
                      {rank === 1 ? "🥇 1" : rank === 2 ? "🥈 2" : rank === 3 ? "🥉 3" : rank}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 8px", textAlign: "left" }}>
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>{team.name}</span>
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "center", color: "#64748b" }}>
                      {team.place || "—"}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", fontFamily: "monospace", color: "#e11d48", fontWeight: 700 }}>
                      {team.fadhilaPoints || 0}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>
                      {team.fadheelaPoints || 0}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", fontFamily: "monospace", color: "#475569" }}>
                      {team.generalPoints || 0}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#b45309", fontWeight: 800 }}>
                      {team.gold || 0}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#475569", fontWeight: 800 }}>
                      {team.silver || 0}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", color: "#c2410c", fontWeight: 800 }}>
                      {team.bronze || 0}
                    </td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center", fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 900, color: "#8E0033", backgroundColor: isChampion ? "#fef3c7" : "transparent" }}>
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
          marginTop: "16px",
          border: "1.5px solid #0f172a",
          borderRadius: "4px",
          padding: "10px 14px",
          backgroundColor: "#fafafa",
          pageBreakInside: "avoid"
        }}>
          <div style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "8px", fontStyle: "italic", textAlign: "center" }}>
            We hereby certify that the above results and championship declarations have been duly tabulated, audited, and approved in accordance with festival by-laws.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", textAlign: "center", marginTop: "14px" }}>
            <div>
              <div style={{ borderBottom: "1.5px solid #0f172a", height: "24px", marginBottom: "4px" }}></div>
              <div style={{ fontWeight: 800, fontSize: "0.74rem" }}>Chief Tabulator</div>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Result Audit &amp; Scrutiny</div>
            </div>
            <div>
              <div style={{ borderBottom: "1.5px solid #0f172a", height: "24px", marginBottom: "4px" }}></div>
              <div style={{ fontWeight: 800, fontSize: "0.74rem" }}>Program Convener</div>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Event Management Committee</div>
            </div>
            <div>
              <div style={{ borderBottom: "1.5px solid #0f172a", height: "24px", marginBottom: "4px" }}></div>
              <div style={{ fontWeight: 800, fontSize: "0.74rem" }}>Zonal General Secretary</div>
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Executive Declaration</div>
            </div>
            <div>
              <div style={{
                border: "1.5px dashed #475569",
                height: "44px",
                margin: "0 auto 4px",
                width: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.62rem",
                color: "#64748b",
                fontWeight: 700
              }}>
                OFFICIAL SEAL
              </div>
              <div style={{ fontWeight: 800, fontSize: "0.74rem" }}>Zonal President</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Print Styles ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .results-summary-page {
              box-shadow: none !important;
              border: 1.5px solid #000000 !important;
              padding: 4mm 6mm !important;
              margin: 0 !important;
            }
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
          }
        `
      }} />
    </div>
  );
}
