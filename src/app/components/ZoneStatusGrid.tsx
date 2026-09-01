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

  return (
    <div className="zone-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
      {zones.map((ev) => {
        const startTarget = ev.startDate || ev.zoneActiveStartTime;
        const startTime = startTarget ? new Date(startTarget).getTime() : null;
        const isUpcoming = startTime ? startTime > now : false;
        const isLive = ev.badgeText === "LIVE NOW";
        const isCompleted = ev.badgeText === "COMPLETED";

        // Calculate countdown
        let countdownStr = "";
        if (startTime && isUpcoming && !isLive && !isCompleted) {
          const diff = Math.max(0, startTime - now);
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (days > 0) {
            countdownStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
          } else {
            countdownStr = `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
          }
        }

        const formattedStartDate = startTarget
          ? new Date(startTarget).toLocaleDateString([], {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;

        return (
          <Link
            className="zone-card"
            href={`/fest/${ev.id}/results`}
            key={ev.id}
            style={{
              padding: "20px 22px",
              borderRadius: "18px",
              backgroundColor: "#ffffff",
              border: isLive ? "2px solid #8E0033" : "1px solid var(--line, #e2e8f0)",
              boxShadow: isLive
                ? "0 10px 25px rgba(142,0,51,0.15)"
                : "0 4px 15px rgba(0,0,0,0.04)",
              position: "relative",
              overflow: "hidden",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "155px",
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
                    color: isLive ? "#8E0033" : "#94a3b8",
                    fontWeight: 700,
                  }}
                >
                  →
                </span>
              </div>

              {/* Start Time info */}
              {formattedStartDate && (
                <div
                  style={{
                    fontSize: "0.76rem",
                    color: "#64748b",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontWeight: 600,
                  }}
                >
                  <span>📅</span>
                  <span>Starts: {formattedStartDate}</span>
                </div>
              )}
            </div>

            {/* Bottom Row: Countdown / Status badge */}
            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              {countdownStr ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    backgroundColor: "rgba(142,0,51,0.08)",
                    border: "1px solid rgba(142,0,51,0.2)",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    fontSize: "0.74rem",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "#8E0033",
                  }}
                >
                  <span>⏳</span>
                  <span>{countdownStr}</span>
                </div>
              ) : (
                <div />
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
                {ev.badgeText}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
