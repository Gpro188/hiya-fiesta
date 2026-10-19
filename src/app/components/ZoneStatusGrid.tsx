"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export type ZoneEventData = {
  id: string;
  name: string;
  type?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  zoneActiveStartTime?: string | Date | null;
  zoneActiveEndTime?: string | Date | null;
  registrationStart?: string | Date | null;
  registrationEnd?: string | Date | null;
  statusOverride?: string;
  badgeText: string;
  badgeClass: string;
  zone?: { name: string; code?: string } | null;
  _count?: { teams: number; programs: number };
};

export default function ZoneStatusGrid({ zones }: { zones: ZoneEventData[] }) {
  const [now, setNow] = useState<number>(Date.now());
  const [filterTab, setFilterTab] = useState<"ALL" | "UPCOMING" | "COMPLETED">("ALL");

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pre-calculate status for each event
  const processedZones = zones.map((ev) => {
    const startTarget = ev.zoneActiveStartTime || ev.startDate;
    const endTarget = ev.zoneActiveEndTime || ev.endDate;
    const startTime = startTarget ? new Date(startTarget).getTime() : null;
    const endTime = endTarget ? new Date(endTarget).getTime() : null;

    let isLive = false;
    let isCompleted = false;
    let isUpcoming = false;

    if (ev.statusOverride && ev.statusOverride !== "AUTO" && ev.statusOverride !== "SCHEDULE_PUBLISHED") {
      isLive = ev.statusOverride === "LIVE";
      isCompleted = ev.statusOverride === "COMPLETED";
      isUpcoming = ev.statusOverride === "REGISTRATION" || ev.statusOverride === "PENDING";
    } else {
      if (endTime && now > endTime) {
        isCompleted = true;
      } else if (startTime && now >= startTime) {
        isLive = true;
      } else if (startTime && now < startTime) {
        isUpcoming = true;
      }
    }

    // Safety fallback: if explicitly marked COMPLETED in database
    if (ev.statusOverride === "COMPLETED") {
      isCompleted = true;
      isLive = false;
      isUpcoming = false;
    }

    // If it's State Final or PG Fest and not completed/live, it is Upcoming
    if (!isCompleted && !isLive && ((ev as any).type === "STATE" || ev.zone?.code === "FPG")) {
      isUpcoming = true;
    }

    const diff = startTime && isUpcoming && !isCompleted && !isLive ? Math.max(0, startTime - now) : -1;

    let countdownObj: { days: number; hours: number; minutes: number; seconds: number } | null = null;
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      countdownObj = { days, hours, minutes, seconds };
    }

    const formatDt = (d: any) => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return dt.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const formattedStart = formatDt(startTarget);
    const formattedEnd = formatDt(endTarget);

    const currentBadgeText = isCompleted
      ? "COMPLETED"
      : isLive
      ? "LIVE NOW"
      : isUpcoming
      ? "STARTS SOON"
      : ev.badgeText || "PENDING";

    return {
      ev,
      startTime,
      endTime,
      diff,
      isLive,
      isCompleted,
      isUpcoming,
      countdownObj,
      formattedStart,
      formattedEnd,
      currentBadgeText
    };
  });

  // Find next upcoming zone fest that has not started yet
  const upcomingZones = processedZones
    .filter((item) => item.diff > 0 && !item.isCompleted && !item.isLive)
    .sort((a, b) => a.diff - b.diff);

  const nextUpcoming = upcomingZones[0] || null;

  // Check if both State Fest and PG Fest are upcoming at the same time
  const stateUpcoming = upcomingZones.find(u => (u.ev as any).type === "STATE" || u.ev.name.includes("State"));
  const pgUpcoming = upcomingZones.find(u => u.ev.zone?.code === "FPG" || u.ev.name.includes("Fadheela"));
  const isCollabFinale = Boolean(stateUpcoming && pgUpcoming && Math.abs(stateUpcoming.diff - pgUpcoming.diff) < 3600000 * 24);

  let nextUpcomingCount = nextUpcoming?.countdownObj || null;

  // Sort cards: Live first, Upcoming second (State Final & PG Fest), Completed last (8 regional zones)
  const sortedZones = [...processedZones].sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    if (a.isUpcoming && !b.isUpcoming) return -1;
    if (!a.isUpcoming && b.isUpcoming) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    if (a.isCompleted && !b.isCompleted) return 1;
    return 0;
  });

  const upcomingCount = processedZones.filter(z => z.isUpcoming || z.isLive).length;
  const completedCount = processedZones.filter(z => z.isCompleted).length;

  const displayZones = sortedZones.filter(item => {
    if (filterTab === "UPCOMING") return item.isUpcoming || item.isLive;
    if (filterTab === "COMPLETED") return item.isCompleted;
    return true;
  });

  return (
    <div>
      {/* ── Prominent Featured Box: Next Upcoming Zone Fest Countdown ── */}
      {nextUpcoming && nextUpcomingCount && (
        <div
          style={{
            marginBottom: "28px",
            padding: "24px 28px",
            borderRadius: "22px",
            background: isCollabFinale 
              ? "linear-gradient(135deg, #1e1b4b 0%, #2a0845 50%, #4a0429 100%)" 
              : "linear-gradient(135deg, #1e1b4b 0%, #311029 55%, #4a0429 100%)",
            color: "#ffffff",
            boxShadow: "0 14px 35px rgba(142, 0, 51, 0.22)",
            border: isCollabFinale ? "2px solid #a855f7" : "2px solid #8E0033",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 14px",
                borderRadius: "9999px",
                backgroundColor: isCollabFinale ? "rgba(234, 179, 8, 0.18)" : "rgba(244, 63, 94, 0.18)",
                border: isCollabFinale ? "1px solid rgba(234, 179, 8, 0.4)" : "1px solid rgba(244, 63, 94, 0.4)",
                color: isCollabFinale ? "#fef08a" : "#fbcfe8",
                fontSize: "0.76rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "10px",
              }}
            >
              <span>{isCollabFinale ? "🌟 GRAND FINALE · SIMULTANEOUS COUNTDOWN" : "⏳ FESTIVAL BEGINS IN"}</span>
            </div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.5rem", fontWeight: 900, color: "#ffffff" }}>
              {isCollabFinale ? "State Final & Fadheela PG Fest 2026" : nextUpcoming.ev.name}
            </h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#cbd5e1" }}>
              {isCollabFinale 
                ? "State Grand Finale & Fadheela PG Festival scheduled to commence on "
                : "Regional Fest scheduled to commence on "}
              <strong style={{ color: "#fecdd3" }}>
                {new Date(nextUpcoming.startTime!).toLocaleDateString([], {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </p>
            {isCollabFinale && (
              <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                <Link
                  href={`/fest/${stateUpcoming!.ev.id}/results`}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "6px 14px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    textDecoration: "none",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  🏆 State Final Portal →
                </Link>
                <Link
                  href={`/fest/${pgUpcoming!.ev.id}/results`}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "6px 14px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(168, 85, 247, 0.2)",
                    color: "#f3e8ff",
                    textDecoration: "none",
                    border: "1px solid rgba(168, 85, 247, 0.4)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  🎓 Fadheela PG Portal →
                </Link>
              </div>
            )}
          </div>

          {/* 4-Box Digital Countdown Tiles */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "64px",
                padding: "10px 14px",
                borderRadius: "14px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <span style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", lineHeight: 1 }}>
                {String(nextUpcomingCount.days).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginTop: "4px" }}>
                Days
              </span>
            </div>

            <span style={{ color: "#f43f5e", fontWeight: 900, fontSize: "1.3rem" }}>:</span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "64px",
                padding: "10px 14px",
                borderRadius: "14px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <span style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", lineHeight: 1 }}>
                {String(nextUpcomingCount.hours).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginTop: "4px" }}>
                Hours
              </span>
            </div>

            <span style={{ color: "#f43f5e", fontWeight: 900, fontSize: "1.3rem" }}>:</span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "64px",
                padding: "10px 14px",
                borderRadius: "14px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <span style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", lineHeight: 1 }}>
                {String(nextUpcomingCount.minutes).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", marginTop: "4px" }}>
                Mins
              </span>
            </div>

            <span style={{ color: "#f43f5e", fontWeight: 900, fontSize: "1.3rem" }}>:</span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "64px",
                padding: "10px 14px",
                borderRadius: "14px",
                backgroundColor: "rgba(142, 0, 51, 0.45)",
                border: "1.5px solid #8E0033",
                boxShadow: "0 4px 14px rgba(142, 0, 51, 0.4)",
              }}
            >
              <span style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "monospace", color: "#fecdd3", lineHeight: 1 }}>
                {String(nextUpcomingCount.seconds).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#fbcfe8", textTransform: "uppercase", marginTop: "4px" }}>
                Secs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Filter Tabs ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "22px"
      }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterTab("ALL")}
            style={{
              padding: "7px 16px",
              borderRadius: "30px",
              border: filterTab === "ALL" ? "2px solid #8E0033" : "1px solid #cbd5e1",
              backgroundColor: filterTab === "ALL" ? "#8E0033" : "#ffffff",
              color: filterTab === "ALL" ? "#ffffff" : "#475569",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            All Festivals ({zones.length})
          </button>
          <button
            onClick={() => setFilterTab("UPCOMING")}
            style={{
              padding: "7px 16px",
              borderRadius: "30px",
              border: filterTab === "UPCOMING" ? "2px solid #8E0033" : "1px solid #cbd5e1",
              backgroundColor: filterTab === "UPCOMING" ? "#8E0033" : "#ffffff",
              color: filterTab === "UPCOMING" ? "#ffffff" : "#475569",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            <span>⏳ Upcoming Grand Finales ({upcomingCount})</span>
            {upcomingCount > 0 && (
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: filterTab === "UPCOMING" ? "#fecdd3" : "#e11d48",
                display: "inline-block"
              }} />
            )}
          </button>
          <button
            onClick={() => setFilterTab("COMPLETED")}
            style={{
              padding: "7px 16px",
              borderRadius: "30px",
              border: filterTab === "COMPLETED" ? "2px solid #059669" : "1px solid #cbd5e1",
              backgroundColor: filterTab === "COMPLETED" ? "#059669" : "#ffffff",
              color: filterTab === "COMPLETED" ? "#ffffff" : "#475569",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            <span>🏁 Completed Zones ({completedCount})</span>
          </button>
        </div>

        <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
          Showing <strong>{displayZones.length}</strong> of {zones.length} festivals
        </div>
      </div>

      {/* ── Zone Status Cards Grid ── */}
      <div className="zone-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
        {displayZones.map(({ ev, isLive, isCompleted, isUpcoming, countdownObj, formattedStart, formattedEnd, currentBadgeText }) => {
          return (
            <Link
              className="zone-card"
              href={`/fest/${ev.id}/results`}
              key={ev.id}
              style={{
                padding: "20px 22px",
                borderRadius: "18px",
                backgroundColor: "#ffffff",
                border: isLive
                  ? "2px solid #8E0033"
                  : isCompleted
                  ? "1px solid #cbd5e1"
                  : "1px solid var(--line, #e2e8f0)",
                boxShadow: isLive
                  ? "0 10px 25px rgba(142,0,51,0.15)"
                  : "0 4px 15px rgba(0,0,0,0.04)",
                position: "relative",
                overflow: "hidden",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "175px",
                transition: "all 0.25s ease",
              }}
            >
              {/* Top Row: Zone Name & Arrow */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    {(ev as any).type === "STATE" && (
                      <div style={{
                        display: "inline-block",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        backgroundColor: "#8E0033",
                        color: "#ffffff",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        marginBottom: "5px",
                        letterSpacing: "0.5px"
                      }}>
                        🏆 STATE GRAND FINALE
                      </div>
                    )}
                    {ev.zone?.code === "FPG" && (
                      <div style={{
                        display: "inline-block",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        backgroundColor: "#4f46e5",
                        color: "#ffffff",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        marginBottom: "5px",
                        letterSpacing: "0.5px"
                      }}>
                        🎓 PG FEST (2-TEAM BATTLE)
                      </div>
                    )}
                    {isCompleted && (ev as any).type !== "STATE" && ev.zone?.code !== "FPG" && (
                      <div style={{
                        display: "inline-block",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        marginBottom: "5px",
                        letterSpacing: "0.5px"
                      }}>
                        🏁 ZONAL FINALE COMPLETED
                      </div>
                    )}
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        color: "var(--ink, #1e293b)",
                        lineHeight: 1.25,
                        paddingRight: "10px",
                      }}
                    >
                      {ev.name}
                    </h3>
                  </div>
                  <span
                    className="go"
                    style={{
                      fontSize: "1.2rem",
                      color: isLive ? "#8E0033" : isCompleted ? "#059669" : "#be123c",
                      fontWeight: 700,
                    }}
                  >
                    →
                  </span>
                </div>

                {/* Start & End Time info */}
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "#475569",
                    marginTop: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600,
                  }}
                >
                  <span>📅</span>
                  <span>
                    {formattedStart && formattedEnd ? (
                      <>
                        <strong>{formattedStart}</strong> – <strong>{formattedEnd}</strong>
                      </>
                    ) : formattedStart ? (
                      <>
                        Starts: <strong>{formattedStart}</strong>
                      </>
                    ) : (
                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Schedule & Dates Announcing</span>
                    )}
                  </span>
                </div>

                {/* Prominent Box Countdown for Starting Fest */}
                {countdownObj && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "8px 12px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #1e1b4b, #3b0720)",
                      border: "1.5px solid #8E0033",
                      boxShadow: "0 4px 14px rgba(142,0,51,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.68rem", fontWeight: 800, color: "#fbcfe8", textTransform: "uppercase" }}>
                      <span>⏳</span> Starts In
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {countdownObj.days > 0 && (
                        <div style={{ background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "6px", textAlign: "center" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#ffffff", fontFamily: "monospace" }}>
                            {String(countdownObj.days).padStart(2, "0")}d
                          </span>
                        </div>
                      )}
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "6px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#ffffff", fontFamily: "monospace" }}>
                          {String(countdownObj.hours).padStart(2, "0")}h
                        </span>
                      </div>
                      <span style={{ color: "#f43f5e", fontWeight: 900, fontSize: "0.85rem" }}>:</span>
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "6px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#ffffff", fontFamily: "monospace" }}>
                          {String(countdownObj.minutes).padStart(2, "0")}m
                        </span>
                      </div>
                      <span style={{ color: "#f43f5e", fontWeight: 900, fontSize: "0.85rem" }}>:</span>
                      <div style={{ background: "rgba(142,0,51,0.5)", padding: "2px 6px", borderRadius: "6px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#fecdd3", fontFamily: "monospace" }}>
                          {String(countdownObj.seconds).padStart(2, "0")}s
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Row: Status badge */}
              <div
                style={{
                  marginTop: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {isLive ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.74rem", fontWeight: 700, color: "#059669" }}>
                    <span className="status-dot live" style={{ width: "8px", height: "8px" }} />
                    <span>Competitions In Progress</span>
                  </div>
                ) : isCompleted ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.74rem", fontWeight: 700, color: "#059669" }}>
                    <span>🏁 All Results Finalized</span>
                  </div>
                ) : countdownObj ? (
                  <div style={{ fontSize: "0.74rem", color: "#8E0033", fontWeight: 700 }}>
                    ⏳ Grand Finale Countdown
                  </div>
                ) : (
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Upcoming Festival</div>
                )}

              <span
                className="zone-status-tag"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: "20px",
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  backgroundColor: isLive
                    ? "rgba(16, 185, 129, 0.12)"
                    : isCompleted
                    ? "rgba(5, 150, 105, 0.12)"
                    : "rgba(244, 63, 94, 0.12)",
                  color: isLive ? "#059669" : isCompleted ? "#059669" : "#be123c",
                  border: isLive
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : isCompleted
                    ? "1px solid rgba(5, 150, 105, 0.3)"
                    : "1px solid rgba(244, 63, 94, 0.3)",
                }}
              >
                <span
                  className={`status-dot ${
                    isLive ? "live" : isCompleted ? "done" : "pending"
                  }`}
                />
                {currentBadgeText}
              </span>
            </div>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
