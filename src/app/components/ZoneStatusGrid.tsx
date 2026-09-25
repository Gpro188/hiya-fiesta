"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export type ZoneEventData = {
  id: string;
  name: string;
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

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Find next upcoming zone fest that has not started yet
  const upcomingZones = zones
    .map((ev) => {
      const startTarget = ev.zoneActiveStartTime || ev.startDate;
      const startTime = startTarget ? new Date(startTarget).getTime() : null;
      const isCompleted = ev.statusOverride === "COMPLETED";
      const isLive = ev.statusOverride === "LIVE";
      const diff = startTime && !isCompleted && !isLive ? startTime - now : -1;
      return { ev, startTime, diff };
    })
    .filter((item) => item.diff > 0)
    .sort((a, b) => a.diff - b.diff);

  const nextUpcoming = upcomingZones[0] || null;

  let nextUpcomingCount: { days: number; hours: number; minutes: number; seconds: number } | null = null;
  if (nextUpcoming) {
    const diff = nextUpcoming.diff;
    nextUpcomingCount = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  }

  return (
    <div>
      {/* ── Prominent Featured Box: Next Upcoming Zone Fest Countdown ── */}
      {nextUpcoming && nextUpcomingCount && (
        <div
          style={{
            marginBottom: "28px",
            padding: "24px 28px",
            borderRadius: "22px",
            background: "linear-gradient(135deg, #1e1b4b 0%, #311029 55%, #4a0429 100%)",
            color: "#ffffff",
            boxShadow: "0 14px 35px rgba(142, 0, 51, 0.22)",
            border: "2px solid #8E0033",
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
                backgroundColor: "rgba(244, 63, 94, 0.18)",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                color: "#fbcfe8",
                fontSize: "0.76rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "10px",
              }}
            >
              <span>⏳ FESTIVAL BEGINS IN</span>
            </div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.5rem", fontWeight: 900, color: "#ffffff" }}>
              {nextUpcoming.ev.name}
            </h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#cbd5e1" }}>
              Regional Fest scheduled to commence on{" "}
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

      {/* ── Zone Status Cards Grid ── */}
      <div className="zone-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
        {zones.map((ev) => {
          const startTarget = ev.zoneActiveStartTime || ev.startDate;
          const endTarget = ev.zoneActiveEndTime || ev.endDate;
          const startTime = startTarget ? new Date(startTarget).getTime() : null;
          const endTime = endTarget ? new Date(endTarget).getTime() : null;

          let isLive = false;
          let isCompleted = false;
          let isUpcoming = false;

          if (ev.statusOverride && ev.statusOverride !== "AUTO") {
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

          // Calculate countdown object
          let countdownObj: { days: number; hours: number; minutes: number; seconds: number } | null = null;
          if (startTime && isUpcoming && !isLive && !isCompleted) {
            const diff = Math.max(0, startTime - now);
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
                  <span
                    className="go"
                    style={{
                      fontSize: "1.2rem",
                      color: isLive ? "#8E0033" : isCompleted ? "#059669" : "#94a3b8",
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
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.74rem", fontWeight: 700, color: "#475569" }}>
                    <span>🏁 All Results Finalized</span>
                  </div>
                ) : !countdownObj ? (
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Upcoming Festival</div>
                ) : <div />}

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
                    ? "rgba(100, 116, 139, 0.1)"
                    : "rgba(245, 158, 11, 0.1)",
                  color: isLive ? "#059669" : isCompleted ? "#475569" : "#d97706",
                  border: isLive
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : isCompleted
                    ? "1px solid rgba(100, 116, 139, 0.2)"
                    : "1px solid rgba(245, 158, 11, 0.3)",
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
