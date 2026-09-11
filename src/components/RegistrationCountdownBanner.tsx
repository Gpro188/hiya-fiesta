"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RegistrationCountdownBannerProps {
  deadline: string | Date | null;
  onStageDeadline?: string | Date | null;
  offStageDeadline?: string | Date | null;
  isOffStageOpen?: boolean;
  isOnStageOpen?: boolean;
  isAssignmentsConfirmed?: boolean;
  isOnStageConfirmed?: boolean;
  isZoneConfirmedOnStage?: boolean;
  isZoneConfirmedOffStage?: boolean;
  teamName?: string;
  magazineCode?: string | null;
  showQuickLinks?: boolean;
}

export default function RegistrationCountdownBanner({
  deadline,
  onStageDeadline,
  offStageDeadline,
  isOffStageOpen = false,
  isOnStageOpen = true,
  isAssignmentsConfirmed = false,
  isOnStageConfirmed = false,
  isZoneConfirmedOnStage = false,
  isZoneConfirmedOffStage = false,
  teamName,
  magazineCode,
  showQuickLinks = true
}: RegistrationCountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  // Target deadline resolution
  const targetTime = deadline ? new Date(deadline).getTime() : null;

  useEffect(() => {
    if (!targetTime || isNaN(targetTime)) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      return;
    }

    const calculateTime = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  const formattedDeadline = targetTime
    ? new Date(targetTime).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : "Closing Today";

  const isCritical = timeLeft && !timeLeft.isExpired && timeLeft.days === 0 && timeLeft.hours < 12;

  return (
    <div
      style={{
        marginBottom: "1.75rem",
        borderRadius: "16px",
        background: timeLeft?.isExpired
          ? "linear-gradient(135deg, rgba(239, 68, 68, 0.07) 0%, rgba(185, 28, 28, 0.04) 100%)"
          : isCritical
            ? "linear-gradient(135deg, rgba(165, 0, 58, 0.10) 0%, rgba(245, 158, 11, 0.08) 100%)"
            : "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 165, 233, 0.05) 100%)",
        border: `2px solid ${
          timeLeft?.isExpired
            ? "#ef4444"
            : isCritical
              ? "#A5003A"
              : "#10b981"
        }`,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {/* Top Banner Header */}
      <div
        style={{
          padding: "12px 20px",
          background: timeLeft?.isExpired
            ? "#ef4444"
            : isCritical
              ? "linear-gradient(90deg, #A5003A 0%, #d97706 100%)"
              : "linear-gradient(90deg, #059669 0%, #0284c7 100%)",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>
            {timeLeft?.isExpired ? "🔒" : isCritical ? "⏰" : "⏳"}
          </span>
          <div>
            <strong style={{ fontSize: "0.95rem", letterSpacing: "0.02em", textTransform: "uppercase" }}>
              {timeLeft?.isExpired
                ? "Registration & Assignments Ended"
                : isCritical
                  ? "Final Hours: Registration & Assignments Closing Soon"
                  : "Registration & Assignment Window Active"}
            </strong>
            {teamName && (
              <span style={{ marginLeft: "8px", opacity: 0.9, fontSize: "0.82rem" }}>
                · {teamName}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 800,
              backgroundColor: "rgba(255, 255, 255, 0.25)",
              backdropFilter: "blur(4px)",
              letterSpacing: "0.03em"
            }}
          >
            {timeLeft?.isExpired ? "CLOSED" : isCritical ? "CLOSES TODAY (IST)" : "DEADLINE TODAY"}
          </span>
          <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
            {formattedDeadline}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}
      >
        {/* Left Side: Countdown Timer & Status Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: "280px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
              Time Remaining:
            </span>

            {/* Live Clock Units */}
            {timeLeft && !timeLeft.isExpired ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {timeLeft.days > 0 && (
                  <>
                    <div className="countdown-box">
                      <span className="countdown-num">{String(timeLeft.days).padStart(2, "0")}</span>
                      <span className="countdown-label">Days</span>
                    </div>
                    <span className="countdown-sep">:</span>
                  </>
                )}
                <div className="countdown-box">
                  <span className="countdown-num">{String(timeLeft.hours).padStart(2, "0")}</span>
                  <span className="countdown-label">Hours</span>
                </div>
                <span className="countdown-sep">:</span>
                <div className="countdown-box">
                  <span className="countdown-num">{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <span className="countdown-label">Minutes</span>
                </div>
                <span className="countdown-sep">:</span>
                <div className="countdown-box countdown-box-sec">
                  <span className="countdown-num">{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <span className="countdown-label">Seconds</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  color: "#dc2626",
                  fontWeight: 800,
                  fontSize: "0.95rem"
                }}
              >
                00h : 00m : 00s (Registration Window Ended)
              </div>
            )}
          </div>

          {/* Stage Editability Status Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Off-Stage Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                backgroundColor: isZoneConfirmedOffStage
                  ? "rgba(2, 132, 199, 0.12)"
                  : isAssignmentsConfirmed
                    ? "rgba(100, 116, 139, 0.12)"
                    : isOffStageOpen
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(239, 68, 68, 0.12)",
                color: isZoneConfirmedOffStage
                  ? "#0284c7"
                  : isAssignmentsConfirmed
                    ? "#475569"
                    : isOffStageOpen
                      ? "#059669"
                      : "#dc2626",
                border: `1px solid ${
                  isZoneConfirmedOffStage
                    ? "rgba(2, 132, 199, 0.3)"
                    : isAssignmentsConfirmed
                      ? "rgba(100, 116, 139, 0.3)"
                      : isOffStageOpen
                        ? "rgba(16, 185, 129, 0.3)"
                        : "rgba(239, 68, 68, 0.3)"
                }`
              }}
            >
              <span>🎨</span>
              <span>
                Off-Stage:{" "}
                {isZoneConfirmedOffStage
                  ? "Confirmed by Zone (Chest Nos Assigned)"
                  : isAssignmentsConfirmed
                    ? "Submitted & Locked"
                    : isOffStageOpen
                      ? "Open"
                      : "Closed"}
              </span>
            </div>

            {/* On-Stage Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                backgroundColor: isZoneConfirmedOnStage
                  ? "rgba(219, 39, 119, 0.12)"
                  : isOnStageOpen
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                color: isZoneConfirmedOnStage
                  ? "#db2777"
                  : isOnStageOpen
                    ? "#059669"
                    : "#dc2626",
                border: `1px solid ${
                  isZoneConfirmedOnStage
                    ? "rgba(219, 39, 119, 0.3)"
                    : isOnStageOpen
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(239, 68, 68, 0.3)"
                }`
              }}
            >
              <span>🎭</span>
              <span>
                On-Stage:{" "}
                {isOnStageOpen
                  ? "🟢 Open for Editing (Until Deadline Tonight)"
                  : "🔒 Closed (Deadline Passed)"}
              </span>
            </div>

            {magazineCode && (
              <span
                style={{
                  fontSize: "0.76rem",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(165, 0, 58, 0.1)",
                  color: "#A5003A",
                  fontWeight: 800,
                  border: "1px solid rgba(165, 0, 58, 0.2)"
                }}
              >
                📖 Magazine Code: {magazineCode}
              </span>
            )}
          </div>

          {/* User Guideline Reminder */}
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {isOnStageOpen
              ? "📢 Notice: Today is the final registration deadline. On-Stage program assignments remain fully editable until the countdown timer reaches zero tonight."
              : "🔒 Registration and program assignments for this event have concluded."}
          </p>
        </div>

        {/* Right Side: Quick Portal Actions */}
        {showQuickLinks && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/dashboard/assignments"
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: 700,
                backgroundColor: isOnStageOpen ? "#A5003A" : "#64748b",
                borderColor: isOnStageOpen ? "#A5003A" : "#64748b",
                color: "#ffffff"
              }}
            >
              <span>📜</span>
              {isOnStageOpen ? "Edit On-Stage Programs" : "View Program Assignments"}
            </Link>
            <Link
              href="/dashboard/candidates"
              className="btn btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              <span>👤</span> Candidate Roster
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .countdown-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.06);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          min-width: 48px;
          padding: 4px 8px;
        }
        .countdown-box-sec {
          background: rgba(165, 0, 58, 0.08);
          border-color: rgba(165, 0, 58, 0.2);
        }
        .countdown-num {
          font-family: var(--font-mono, monospace);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }
        .countdown-box-sec .countdown-num {
          color: #A5003A;
        }
        .countdown-label {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-secondary);
          letter-spacing: 0.04em;
        }
        .countdown-sep {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}
