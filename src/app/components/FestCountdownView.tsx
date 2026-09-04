"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FestCountdownViewProps {
  eventName: string;
  festName: string;
  festMoto: string;
  startDate: string | Date;
  teamsCount: number;
  programsCount: number;
  candidatesCount: number;
  isSchedulePublished?: boolean;
  programsList?: Array<{ 
    id: string; 
    name: string; 
    stageType?: string | null;
    type?: string | null;
    category?: { name: string } | null; 
    venue?: string | null; 
    startTime?: string | Date | null 
  }>;
}

export default function FestCountdownView({
  eventName,
  festName,
  festMoto,
  startDate,
  teamsCount,
  programsCount,
  candidatesCount,
  isSchedulePublished = false,
  programsList = [],
}: FestCountdownViewProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isStarted: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isStarted: false,
  });

  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    const targetTime = new Date(startDate).getTime();

    const calculateTime = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isStarted: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isStarted: false });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  const formattedDate = new Date(startDate).toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = new Date(startDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px 16px" }}>
      {/* ── COUNTDOWN HERO PANEL ── */}
      <div
        className="glass-panel"
        style={{
          borderRadius: "24px",
          padding: "48px 24px",
          textAlign: "center",
          backgroundColor: "#ffffff",
          boxShadow: "0 20px 50px rgba(142,0,51,0.08)",
          border: "1px solid rgba(142,0,51,0.15)",
          position: "relative",
          overflow: "hidden",
          marginBottom: "32px",
        }}
      >
        {/* Top Floating Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            padding: "6px 18px",
            borderRadius: "30px",
            fontSize: "0.82rem",
            fontWeight: 800,
            color: "#e11d48",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "18px",
          }}
        >
          <span>⏳ FESTIVAL BEGINS IN</span>
        </div>

        {/* Big Zone Name */}
        <h1
          style={{
            fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
            fontWeight: 900,
            color: "#1e1b4b",
            margin: "0 0 8px 0",
            lineHeight: 1.15,
          }}
        >
          {eventName}
        </h1>

        <p style={{ color: "#64748b", fontSize: "1.05rem", margin: "0 0 32px 0", fontWeight: 500 }}>
          {festMoto || "She Can. She Will."} · Council of Samastha Women&apos;s Colleges
        </p>

        {/* Big Countdown Units Grid */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            maxWidth: "680px",
            margin: "0 auto 32px",
          }}
        >
          {/* Days */}
          <div
            style={{
              flex: "1 1 120px",
              minWidth: "110px",
              maxWidth: "140px",
              backgroundColor: "#1e1b4b",
              color: "#ffffff",
              borderRadius: "18px",
              padding: "20px 10px",
              boxShadow: "0 10px 25px rgba(30,27,75,0.25)",
            }}
          >
            <div style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
              {timeLeft.days.toString().padStart(2, "0")}
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "1px", marginTop: "6px" }}>
              Days
            </div>
          </div>

          {/* Hours */}
          <div
            style={{
              flex: "1 1 120px",
              minWidth: "110px",
              maxWidth: "140px",
              backgroundColor: "#8E0033",
              color: "#ffffff",
              borderRadius: "18px",
              padding: "20px 10px",
              boxShadow: "0 10px 25px rgba(142,0,51,0.25)",
            }}
          >
            <div style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
              {timeLeft.hours.toString().padStart(2, "0")}
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fecdd3", textTransform: "uppercase", letterSpacing: "1px", marginTop: "6px" }}>
              Hours
            </div>
          </div>

          {/* Minutes */}
          <div
            style={{
              flex: "1 1 120px",
              minWidth: "110px",
              maxWidth: "140px",
              backgroundColor: "#1e1b4b",
              color: "#ffffff",
              borderRadius: "18px",
              padding: "20px 10px",
              boxShadow: "0 10px 25px rgba(30,27,75,0.25)",
            }}
          >
            <div style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
              {timeLeft.minutes.toString().padStart(2, "0")}
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "1px", marginTop: "6px" }}>
              Minutes
            </div>
          </div>

          {/* Seconds */}
          <div
            style={{
              flex: "1 1 120px",
              minWidth: "110px",
              maxWidth: "140px",
              backgroundColor: "#f43f5e",
              color: "#ffffff",
              borderRadius: "18px",
              padding: "20px 10px",
              boxShadow: "0 10px 25px rgba(244,63,94,0.25)",
            }}
          >
            <div style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
              {timeLeft.seconds.toString().padStart(2, "0")}
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ffe4e6", textTransform: "uppercase", letterSpacing: "1px", marginTop: "6px" }}>
              Seconds
            </div>
          </div>
        </div>

        {/* Date Time Badge Callout */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "10px 22px",
            borderRadius: "14px",
            color: "#334155",
            fontSize: "0.95rem",
            fontWeight: 700,
          }}
        >
          <span>📅</span>
          <span>
            Scheduled to Start: <strong>{formattedDate}</strong> at <strong>{formattedTime}</strong>
          </span>
        </div>

        {/* Auto Refresh note */}
        <p style={{ margin: "24px 0 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
          Live scores and results will publish automatically once the festival starts.
        </p>
      </div>

      {/* ── FESTIVAL HIGHLIGHT METRICS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: "20px",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "4px" }}>🏛️</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#8E0033" }}>{teamsCount}</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Participating Institutions
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "20px",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "4px" }}>👤</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#4f46e5" }}>{candidatesCount}</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Registered Candidates
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "20px",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "4px" }}>📜</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#059669" }}>{programsCount}</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Festival Competitions
          </div>
        </div>
      </div>

      {/* ── SCHEDULE / COMPETITIONS ── */}
      <div className="glass-panel" style={{ borderRadius: "18px", padding: "24px", backgroundColor: "#ffffff" }}>
        {!isSchedulePublished ? (
          <div style={{ textAlign: "center", padding: "28px 16px" }}>
            <div style={{ 
              width: "56px", 
              height: "56px", 
              borderRadius: "50%", 
              backgroundColor: "#fef2f2", 
              color: "#dc2626", 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: "1.8rem", 
              margin: "0 auto 14px auto",
              border: "2px dashed #fca5a5"
            }}>
              🔒
            </div>
            <h3 style={{ margin: "0 0 6px 0", color: "#1e1b4b", fontSize: "1.2rem", fontWeight: 800 }}>
              Competition Schedule Awaiting Publication
            </h3>
            <p style={{ margin: "0 auto", maxWidth: "520px", fontSize: "0.9rem", color: "#64748b", lineHeight: 1.5 }}>
              The official competition schedule for this zone will be displayed once published by the Zone Administration.
            </p>
            <div style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 16px", borderRadius: "999px", fontSize: "0.78rem", color: "#475569", fontWeight: 600 }}>
              <span>ℹ️</span> Program order and venues are being finalized by Zone Admin
            </div>
          </div>
        ) : programsList.length > 0 ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#1e1b4b" }}>📅 Published Schedule ({programsList.length})</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  Official stage and off-stage competition schedule for this zone
                </p>
              </div>
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: showSchedule ? "#e2e8f0" : "#8E0033",
                  color: showSchedule ? "#334155" : "#ffffff",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showSchedule ? "Hide Schedule ▲" : "View Schedule ▼"}
              </button>
            </div>

            {showSchedule && (
              <div style={{ marginTop: "20px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: 800 }}>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>Program Name</th>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>Stage / Type</th>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>Category</th>
                      <th style={{ padding: "10px 12px", textAlign: "left" }}>Venue / Stage</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Scheduled Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programsList.map((prog) => (
                      <tr key={prog.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>{prog.name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {prog.stageType === "OFF_STAGE" ? (
                            <span style={{ backgroundColor: "rgba(14, 165, 233, 0.14)", color: "#0284c7", border: "1px solid #7dd3fc", padding: "2px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                              🎨 OFF STAGE
                            </span>
                          ) : (
                            <span style={{ backgroundColor: "rgba(236, 72, 153, 0.14)", color: "#db2777", border: "1px solid #f472b6", padding: "2px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                              🎭 ON STAGE
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ backgroundColor: "rgba(79, 70, 229, 0.1)", color: "#4f46e5", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                            {prog.category?.name || "General"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>{prog.venue || "Stage 1"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#334155", fontWeight: 600 }}>
                          {prog.startTime
                            ? new Date(prog.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "As per schedule"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
