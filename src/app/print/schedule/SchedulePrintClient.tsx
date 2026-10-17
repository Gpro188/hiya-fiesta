"use client";

import React, { useState } from "react";
import PrintButton from "@/components/PrintButton";

export interface ProgramItem {
  id: string;
  name: string;
  programCode?: string | null;
  duration?: number | null;
  type?: string | null;
  stageType?: string | null;
  startTime?: Date | string | null;
  festType?: string;
  festName?: string;
  category?: { name: string } | null;
  assignments?: any[];
}

interface SchedulePrintClientProps {
  isCollab: boolean;
  festName: string;
  festSubtitle: string;
  teamInfo?: {
    name: string;
    institutionName?: string;
    prefixCode?: string;
  } | null;
  collabNote?: string | null;
  festMoto?: string | null;
  zoneName?: string;
  venueGroups: Record<string, ProgramItem[]>;
  generatedDateStr: string;
}

export default function SchedulePrintClient({
  isCollab,
  festName,
  festSubtitle,
  teamInfo,
  collabNote,
  festMoto,
  venueGroups,
  generatedDateStr,
}: SchedulePrintClientProps) {
  // Store custom edits for breaks: { [breakKey]: { timeText: string; title: string } }
  const [breakOverrides, setBreakOverrides] = useState<
    Record<string, { timeText?: string; title?: string }>
  >({});

  // Store hidden break IDs
  const [hiddenBreaks, setHiddenBreaks] = useState<Set<string>>(new Set());

  const handleHideBreak = (key: string) => {
    setHiddenBreaks((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleRestoreAllBreaks = () => {
    setHiddenBreaks(new Set());
  };

  const updateBreakTime = (key: string, val: string) => {
    setBreakOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], timeText: val },
    }));
  };

  const updateBreakTitle = (key: string, val: string) => {
    setBreakOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], title: val },
    }));
  };

  function formatTimeAmPm(dateInput: Date | string | null | undefined): string {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  }

  const hiddenCount = hiddenBreaks.size;

  return (
    <div
      style={{
        padding: "30px 40px",
        backgroundColor: "white",
        color: "black",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── Screen Control & Editing Bar ── */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 10,
          zIndex: 100,
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          padding: "12px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.2rem" }}>✏️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#f8fafc" }}>
              Interactive Break Editor Enabled
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              Click on any break time or break name to edit it directly. Use <strong>[✕ Hide]</strong> to remove breaks from the printout.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={handleRestoreAllBreaks}
              style={{
                padding: "6px 12px",
                backgroundColor: "#d97706",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              👁️ Show {hiddenCount} Hidden Break{hiddenCount > 1 ? "s" : ""}
            </button>
          )}

          <PrintButton label="🖨️ Print Schedule" />

          <a
            href="/dashboard/schedule"
            style={{
              padding: "6px 12px",
              backgroundColor: "#334155",
              color: "#ffffff",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            ← Back to Schedule
          </a>
        </div>
      </div>

      {/* Official Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "24px",
          borderBottom: "2.5px solid #8E0033",
          paddingBottom: "16px",
        }}
      >
        <h1
          style={{
            margin: "0 0 4px 0",
            fontSize: "1.8rem",
            fontWeight: 900,
            color: "#8E0033",
          }}
        >
          {festName}
        </h1>
        <h2
          style={{
            margin: "0 0 6px 0",
            fontSize: "1.05rem",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "#1e293b",
          }}
        >
          {festSubtitle}
        </h2>
        {teamInfo ? (
          <p
            style={{
              margin: "4px 0 0 0",
              fontWeight: 700,
              color: "#475569",
              fontSize: "0.9rem",
            }}
          >
            Institution / Team: {teamInfo.institutionName || teamInfo.name} ({teamInfo.prefixCode})
          </p>
        ) : isCollab ? (
          <p
            style={{
              margin: "4px 0 0 0",
              fontWeight: 700,
              color: "#b45309",
              fontSize: "0.88rem",
            }}
          >
            {collabNote ||
              "🌟 Combined Timeline for State Fest & Fadheela PG Programs Across All Stages"}
          </p>
        ) : (
          <p
            style={{
              margin: "4px 0 0 0",
              fontStyle: "italic",
              fontSize: "0.85rem",
              color: "#64748b",
            }}
          >
            {festMoto || "Official Festival Timeline"}
          </p>
        )}
      </div>

      {/* Venues Schedule Sections */}
      {Object.keys(venueGroups).length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🗓️</div>
          <h3 style={{ margin: "0 0 6px 0", color: "#1e293b", fontSize: "1.2rem", fontWeight: 800 }}>
            No Programs Scheduled on Stages Yet
          </h3>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            Only programs with assigned venues and start times appear on this official schedule print.
          </p>
        </div>
      ) : (
        Object.entries(venueGroups).map(([venueName, venueProgs]) => (
          <div key={venueName} style={{ marginBottom: "28px", pageBreakInside: "avoid" }}>
            <div
              style={{
                backgroundColor: "#8E0033",
                color: "#ffffff",
                padding: "6px 14px",
                borderRadius: "4px 4px 0 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 800,
                fontSize: "0.95rem",
              }}
            >
              <span>📍 {venueName}</span>
              <span style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                {venueProgs.length} Program(s)
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
                  <th
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "8px 10px",
                      width: "50px",
                      textAlign: "center",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "8px 10px",
                      width: "145px",
                      textAlign: "center",
                    }}
                  >
                    Time (IST)
                  </th>
                  <th
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "8px 10px",
                      width: "85px",
                      textAlign: "center",
                    }}
                  >
                    Code
                  </th>
                  {isCollab && (
                    <th
                      style={{
                        border: "1px solid #cbd5e1",
                        padding: "8px 10px",
                        width: "125px",
                        textAlign: "center",
                      }}
                    >
                      Fest
                    </th>
                  )}
                  <th
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "8px 10px",
                      textAlign: "left",
                    }}
                  >
                    Program Name
                  </th>
                  <th
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "8px 10px",
                      width: "120px",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "8px 10px",
                      width: "75px",
                      textAlign: "center",
                    }}
                  >
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {venueProgs.map((p, idx) => {
                  const startTimeStr = formatTimeAmPm(p.startTime);
                  const endTimeStr =
                    p.startTime && p.duration
                      ? formatTimeAmPm(
                          new Date(new Date(p.startTime).getTime() + p.duration * 60000)
                        )
                      : null;

                  if (p.type === "BREAK") {
                    const breakKey = `break_explicit_${p.id}`;
                    if (hiddenBreaks.has(breakKey)) return null;

                    const initialTime = `${startTimeStr}${endTimeStr ? ` - ${endTimeStr}` : ""}`;
                    const currentBreakTime = breakOverrides[breakKey]?.timeText ?? initialTime;
                    const initialTitle = `🍽️ ${p.name?.toUpperCase() || "BREAK"} (${p.duration || 45} mins)`;
                    const currentBreakTitle = breakOverrides[breakKey]?.title ?? initialTitle;

                    return (
                      <tr
                        key={p.id}
                        className="break-row"
                        style={{ backgroundColor: "#fffbeb", color: "#b45309" }}
                      >
                        <td
                          style={{
                            border: "1px solid #fde68a",
                            padding: "6px 8px",
                            textAlign: "center",
                            fontWeight: 800,
                          }}
                        >
                          -
                        </td>
                        <td
                          style={{
                            border: "1px solid #fde68a",
                            padding: "4px 8px",
                            textAlign: "center",
                            fontFamily: "monospace",
                            fontWeight: 800,
                            color: "#b45309",
                          }}
                        >
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            title="Click to edit break time"
                            onBlur={(e) => updateBreakTime(breakKey, e.currentTarget.textContent || "")}
                            style={{
                              outline: "none",
                              display: "inline-block",
                              minWidth: "80px",
                              cursor: "text",
                              borderBottom: "1px dashed #d97706",
                              padding: "1px 4px",
                            }}
                          >
                            {currentBreakTime}
                          </span>
                        </td>
                        <td
                          colSpan={isCollab ? 5 : 4}
                          style={{
                            border: "1px solid #fde68a",
                            padding: "6px 12px",
                            fontWeight: 800,
                            letterSpacing: "0.5px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              title="Click to edit break title"
                              onBlur={(e) =>
                                updateBreakTitle(breakKey, e.currentTarget.textContent || "")
                              }
                              style={{
                                outline: "none",
                                cursor: "text",
                                borderBottom: "1px dashed #d97706",
                                padding: "1px 4px",
                              }}
                            >
                              {currentBreakTitle}
                            </span>

                            <div
                              className="no-print"
                              style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
                            >
                              <button
                                type="button"
                                onClick={() => handleHideBreak(breakKey)}
                                title="Remove/Hide this break from printout"
                                style={{
                                  padding: "2px 8px",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  backgroundColor: "#fee2e2",
                                  color: "#b91c1c",
                                  border: "1px solid #fca5a5",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                ✕ Hide
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const prevProg = idx > 0 ? venueProgs[idx - 1] : null;
                  const curDate = p.startTime ? new Date(p.startTime) : null;
                  const prevDate = prevProg?.startTime ? new Date(prevProg.startTime) : null;
                  const curDateStr = curDate
                    ? curDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
                    : "";
                  const prevDateStr = prevDate
                    ? prevDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
                    : "";
                  const isNewDay = curDateStr && (idx === 0 || curDateStr !== prevDateStr);
                  const dayDisplayLabel = curDate
                    ? curDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Kolkata",
                      })
                    : "";

                  let showBreakRow = false;
                  let gapStartStr = "";
                  let gapEndStr = "";
                  let gapMins = 0;
                  if (
                    prevProg &&
                    prevProg.startTime &&
                    prevProg.duration &&
                    p.startTime &&
                    prevProg.type !== "BREAK"
                  ) {
                    const prevEnd = new Date(
                      new Date(prevProg.startTime).getTime() + prevProg.duration * 60000
                    );
                    const curStart = new Date(p.startTime);
                    gapMins = Math.round((curStart.getTime() - prevEnd.getTime()) / 60000);
                    const istHour =
                      (prevEnd.getUTCHours() +
                        5 +
                        Math.floor((prevEnd.getUTCMinutes() + 30) / 60)) %
                      24;
                    if (gapMins >= 20 && istHour >= 11 && istHour <= 16) {
                      showBreakRow = true;
                      gapStartStr = formatTimeAmPm(prevEnd);
                      gapEndStr = formatTimeAmPm(curStart);
                    } else if (gapMins >= 30) {
                      showBreakRow = true;
                      gapStartStr = formatTimeAmPm(prevEnd);
                      gapEndStr = formatTimeAmPm(curStart);
                    }
                  }

                  const gapBreakKey = `break_auto_${venueName}_${prevProg?.id}_${p.id}`;
                  const isGapBreakHidden = hiddenBreaks.has(gapBreakKey);

                  const initialGapTime = `${gapStartStr} - ${gapEndStr}`;
                  const currentGapTime = breakOverrides[gapBreakKey]?.timeText ?? initialGapTime;
                  const initialGapTitle = `🍽️ LUNCH & PRAYER BREAK (${gapMins} mins)`;
                  const currentGapTitle = breakOverrides[gapBreakKey]?.title ?? initialGapTitle;

                  return (
                    <React.Fragment key={p.id}>
                      {isNewDay && (
                        <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
                          <td
                            colSpan={isCollab ? 7 : 6}
                            style={{
                              border: "1px solid #1e293b",
                              padding: "7px 12px",
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              letterSpacing: "0.5px",
                            }}
                          >
                            📅 {dayDisplayLabel ? dayDisplayLabel.toUpperCase() : "SCHEDULED DAY"}
                          </td>
                        </tr>
                      )}

                      {showBreakRow && !isGapBreakHidden && (
                        <tr
                          className="break-row"
                          style={{ backgroundColor: "#fffbeb", color: "#b45309" }}
                        >
                          <td
                            style={{
                              border: "1px solid #fde68a",
                              padding: "6px 8px",
                              textAlign: "center",
                              fontWeight: 800,
                            }}
                          >
                            -
                          </td>
                          <td
                            style={{
                              border: "1px solid #fde68a",
                              padding: "4px 8px",
                              textAlign: "center",
                              fontFamily: "monospace",
                              fontWeight: 800,
                              color: "#b45309",
                            }}
                          >
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              title="Click to edit break time"
                              onBlur={(e) =>
                                updateBreakTime(gapBreakKey, e.currentTarget.textContent || "")
                              }
                              style={{
                                outline: "none",
                                display: "inline-block",
                                minWidth: "80px",
                                cursor: "text",
                                borderBottom: "1px dashed #d97706",
                                padding: "1px 4px",
                              }}
                            >
                              {currentGapTime}
                            </span>
                          </td>
                          <td
                            colSpan={isCollab ? 5 : 4}
                            style={{
                              border: "1px solid #fde68a",
                              padding: "6px 12px",
                              fontWeight: 800,
                              letterSpacing: "0.5px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                title="Click to edit break title"
                                onBlur={(e) =>
                                  updateBreakTitle(gapBreakKey, e.currentTarget.textContent || "")
                                }
                                style={{
                                  outline: "none",
                                  cursor: "text",
                                  borderBottom: "1px dashed #d97706",
                                  padding: "1px 4px",
                                }}
                              >
                                {currentGapTitle}
                              </span>

                              <div
                                className="no-print"
                                style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleHideBreak(gapBreakKey)}
                                  title="Remove/Hide this break from printout"
                                  style={{
                                    padding: "2px 8px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    backgroundColor: "#fee2e2",
                                    color: "#b91c1c",
                                    border: "1px solid #fca5a5",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✕ Hide
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "6px 8px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "#64748b",
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "6px 8px",
                            textAlign: "center",
                            fontFamily: "monospace",
                            fontWeight: 800,
                            color: "#047857",
                          }}
                        >
                          {startTimeStr} {endTimeStr ? ` - ${endTimeStr}` : ""}
                        </td>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "6px 8px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "#475569",
                          }}
                        >
                          {p.programCode || "-"}
                        </td>
                        {isCollab && (
                          <td
                            style={{
                              border: "1px solid #cbd5e1",
                              padding: "6px 8px",
                              textAlign: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.70rem",
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                backgroundColor:
                                  p.festType === "PG"
                                    ? "rgba(168, 85, 247, 0.15)"
                                    : "rgba(37, 99, 235, 0.15)",
                                color: p.festType === "PG" ? "#7e22ce" : "#1d4ed8",
                                border: `1px solid ${
                                  p.festType === "PG" ? "#c084fc" : "#93c5fd"
                                }`,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.festType === "PG" ? "🎓 Fadheela PG" : "🏆 State Final"}
                            </span>
                          </td>
                        )}
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "6px 10px",
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                        >
                          {p.name}
                        </td>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "6px 8px",
                            color: "#475569",
                          }}
                        >
                          {p.category?.name || "General"}
                        </td>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "6px 8px",
                            textAlign: "center",
                            fontWeight: 600,
                          }}
                        >
                          {p.duration ? `${p.duration}m` : "-"}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: "0.85rem",
        }}
      >
        <div>{generatedDateStr}</div>
        <div
          style={{
            borderTop: "1.5px solid black",
            width: "220px",
            textAlign: "center",
            paddingTop: "6px",
            fontWeight: 700,
          }}
        >
          General Convener / Stage Manager
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
          span[contenteditable] {
            border-bottom: none !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
