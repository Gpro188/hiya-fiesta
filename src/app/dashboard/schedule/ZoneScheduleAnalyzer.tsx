"use client";

import { useState, useEffect } from "react";
import { 
  getScheduleClashAnalysis,
  resolveClashesSafe,
  testCrossVenueTransfers,
  applyCrossVenueTransfers,
  resolveManageableClashes
} from "./actions";
import { ScoredClash, formatTimeAmPm } from "@/lib/scheduleCalculator";

interface ZoneItem {
  id: string;
  name: string;
}

export default function ZoneScheduleAnalyzer({
  isSuperAdmin = false,
  activeEventId = "",
  onScheduleUpdated
}: {
  isSuperAdmin?: boolean;
  activeEventId?: string;
  onScheduleUpdated?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("ALL");
  const [availableZones, setAvailableZones] = useState<ZoneItem[]>([]);

  // Clash Analysis State
  const [clashList, setClashList] = useState<ScoredClash[]>([]);
  const [clashesLoading, setClashesLoading] = useState(false);
  const [clashCounts, setClashCounts] = useState<{ critical: number; high: number; medium: number; manageable: number }>({ 
    critical: 0, high: 0, medium: 0, manageable: 0 
  });
  const [clashFilterSeverity, setClashFilterSeverity] = useState<string>("ALL");
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [fixingClashes, setFixingClashes] = useState(false);

  // Timing & Constraints Configuration State
  const [startTimeMode, setStartTimeMode] = useState<"SAVED" | "FIXED_930">("SAVED");
  const [maxBuffer, setMaxBuffer] = useState<number>(60);
  const [enableBreak, setEnableBreak] = useState<boolean>(true);
  const [breakWindow, setBreakWindow] = useState<string>("13:00-13:45");

  // Type 2: Venue Transfer Simulation State
  const [testingTransfers, setTestingTransfers] = useState(false);
  const [transferReport, setTransferReport] = useState<any | null>(null);
  const [applyingTransfer, setApplyingTransfer] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClashes();
      loadZonesList();
    }
  }, [isOpen]);

  const loadZonesList = async () => {
    try {
      const res = await fetch("/api/events?type=ZONAL").then(r => r.json()).catch(() => null);
      if (res && Array.isArray(res)) {
        setAvailableZones(res.map((e: any) => ({ id: e.id, name: e.name })));
      }
    } catch (e) {
      // Non-critical fallback
    }
  };

  const loadClashes = async (eventIdOverride?: string) => {
    setClashesLoading(true);
    setFixMessage(null);
    setTransferReport(null);
    try {
      const targetId = eventIdOverride || (selectedZoneId !== "ALL" ? selectedZoneId : activeEventId);
      if (!targetId) {
        setClashesLoading(false);
        return;
      }
      const res: any = await getScheduleClashAnalysis(targetId);
      if (res && res.success) {
        setClashList(res.scoredClashes || []);
        setClashCounts({
          critical: res.criticalCount || 0,
          high: res.highCount || 0,
          medium: res.mediumCount || 0,
          manageable: res.manageableCount || 0
        });
      } else {
        setClashList([]);
      }
    } catch (err: any) {
      console.error("Error loading clashes:", err);
    } finally {
      setClashesLoading(false);
    }
  };

  // Helper to extract break hours
  const getBreakHours = () => {
    const [bStartH, bStartM] = [13, 0];
    const [bEndH, bEndM] = breakWindow === "13:00-14:00" ? [14, 0] : [13, 45];
    return { bStartH, bStartM, bEndH, bEndM };
  };

  // TYPE 1: Safe Auto-Fix (Order Change & Buffer up to 60m - Same Venue)
  const handleSafeAutoFix = async () => {
    const targetId = selectedZoneId !== "ALL" ? selectedZoneId : activeEventId;
    if (!targetId) return;

    const { bStartH, bStartM, bEndH, bEndM } = getBreakHours();

    if (!confirm(
      "Run Auto-Clash Resolver (Same Venue)?\n\n" +
      `• Preserves Venue Start Time (${startTimeMode === "SAVED" ? "Saved Start / 9:30 AM" : "Fixed 9:30 AM"})\n` +
      "• Reorders candidate slots (1st vs Last) across venues\n" +
      `• Tunes buffer gaps up to ${maxBuffer} minutes\n` +
      (enableBreak ? `• Honors Break (${breakWindow === "13:00-14:00" ? "01:00 PM – 02:00 PM" : "01:00 PM – 01:45 PM"})\n` : "") +
      "• Closes by 5:00 PM (Hard Limit: 6:00 PM)\n\n" +
      "🛡️ GUARANTEE: Program durations and assigned venues are 100% PRESERVED."
    )) return;

    setFixingClashes(true);
    setFixMessage(null);
    try {
      const res = await resolveClashesSafe(targetId, {
        minBuffer: 5,
        maxBuffer,
        startTimeMode,
        startHour: 9,
        startMinute: 30,
        enableBreak,
        breakStartHour: bStartH,
        breakStartMinute: bStartM,
        breakEndHour: bEndH,
        breakEndMinute: bEndM,
        maxCloseHour: 18,
      });
      if (res.success) {
        setFixMessage(res.message || "Clashes resolved successfully!");
        await loadClashes(targetId);
        if (onScheduleUpdated) onScheduleUpdated();
      } else {
        setFixMessage(`❌ ${res.error || "Failed to fix clashes"}`);
      }
    } catch (err: any) {
      setFixMessage(`❌ ${err.message || "Error resolving clashes"}`);
    } finally {
      setFixingClashes(false);
    }
  };

  // TYPE 2: Test Cross-Venue Transfer for Severe Clashes
  const handleTestVenueTransfers = async () => {
    const targetId = selectedZoneId !== "ALL" ? selectedZoneId : activeEventId;
    if (!targetId) return;

    const { bStartH, bStartM, bEndH, bEndM } = getBreakHours();

    setTestingTransfers(true);
    setFixMessage(null);
    try {
      const res = await testCrossVenueTransfers(targetId, {
        minBuffer: 5,
        maxBuffer,
        startTimeMode,
        startHour: 9,
        startMinute: 30,
        enableBreak,
        breakStartHour: bStartH,
        breakStartMinute: bStartM,
        breakEndHour: bEndH,
        breakEndMinute: bEndM,
        maxCloseHour: 18,
      });
      if (res.success) {
        setTransferReport(res);
        if (!res.proposals || res.proposals.length === 0) {
          setFixMessage("ℹ️ Simulation complete: No beneficial cross-venue moves found that keep destinations within 6:00 PM. Use Mode 1 (Slot & Buffer) to resolve conflicts.");
        }
      } else {
        setFixMessage(`❌ ${res.error || "Failed to simulate venue transfers"}`);
      }
    } catch (err: any) {
      setFixMessage(`❌ ${err.message || "Error simulating venue transfers"}`);
    } finally {
      setTestingTransfers(false);
    }
  };

  // Confirm and Apply Cross-Venue Transfer
  const handleApplyTransfers = async () => {
    const targetId = selectedZoneId !== "ALL" ? selectedZoneId : activeEventId;
    if (!targetId || !transferReport?.proposals || transferReport.proposals.length === 0) return;

    const { bStartH, bStartM, bEndH, bEndM } = getBreakHours();

    if (!confirm(
      "⚠️ JURY SITTING & VALUATION VERIFICATION:\n\n" +
      "Are you sure judges, juries, and valuation sheets can be accommodated at the destination venue(s)?\n\n" +
      "Click OK to confirm and transfer the proposed programs to their new venues."
    )) {
      return;
    }

    setApplyingTransfer(true);
    try {
      const transfers = transferReport.proposals.map((p: any) => ({
        programId: p.programId,
        toVenue: p.proposedVenue
      }));
      const res = await applyCrossVenueTransfers(targetId, transfers, {
        startTimeMode,
        startHour: 9,
        startMinute: 30,
        enableBreak,
        breakStartHour: bStartH,
        breakStartMinute: bStartM,
        breakEndHour: bEndH,
        breakEndMinute: bEndM,
        maxCloseHour: 18,
      });
      if (res.success) {
        setFixMessage(`🎉 ${res.message}`);
        setTransferReport(null);
        await loadClashes(targetId);
        if (onScheduleUpdated) onScheduleUpdated();
      } else {
        setFixMessage(`❌ ${res.error || "Failed to apply venue transfers"}`);
      }
    } catch (err: any) {
      setFixMessage(`❌ ${err.message || "Error applying transfers"}`);
    } finally {
      setApplyingTransfer(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn"
        style={{
          background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: "0.85rem",
          padding: "8px 16px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(13, 148, 136, 0.35)",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          border: "none",
          cursor: "pointer"
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>🛡️</span>
        <span>Clash Assistant & Auto-Fix</span>
        {clashList.length > 0 && (
          <span style={{
            backgroundColor: clashCounts.critical > 0 ? "#ef4444" : "#f59e0b",
            color: "#ffffff",
            padding: "1px 7px",
            borderRadius: "10px",
            fontSize: "0.72rem",
            fontWeight: 800
          }}>
            {clashList.length}
          </span>
        )}
      </button>

      {/* Modal / Overlay */}
      {isOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "1150px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
            overflow: "hidden"
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: "18px 24px",
              borderBottom: "1.5px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.5rem" }}>🛡️</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                      Schedule Clash Assistant & Safe Resolver
                    </h2>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                      Eliminates candidate conflicts without altering program durations, mins/candidate, or fixed times.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {isSuperAdmin && availableZones.length > 0 && (
                  <select
                    value={selectedZoneId}
                    onChange={(e) => {
                      setSelectedZoneId(e.target.value);
                      loadClashes(e.target.value !== "ALL" ? e.target.value : activeEventId);
                    }}
                    className="form-input"
                    style={{ fontSize: "0.82rem", padding: "6px 12px", width: "190px", fontWeight: 700 }}
                  >
                    <option value="ALL">🏛️ Active Event / Zone</option>
                    {availableZones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    border: "none",
                    background: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: "4px"
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: "20px 24px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              
              {/* PRIMARY ACTION BAR */}
              <div style={{
                padding: "16px 20px",
                borderRadius: "12px",
                backgroundColor: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                {/* Severity Filter Pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginRight: "4px" }}>Filter:</span>
                  <button
                    onClick={() => setClashFilterSeverity("ALL")}
                    className={`btn ${clashFilterSeverity === "ALL" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "4px 10px", fontSize: "0.78rem", fontWeight: 700, borderRadius: "6px" }}
                  >
                    All ({clashList.length})
                  </button>
                  <button
                    onClick={() => setClashFilterSeverity("CRITICAL")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "1px solid #fca5a5",
                      backgroundColor: clashFilterSeverity === "CRITICAL" ? "#ef4444" : "#fef2f2",
                      color: clashFilterSeverity === "CRITICAL" ? "#ffffff" : "#dc2626",
                      cursor: "pointer"
                    }}
                  >
                    🔴 Critical ({clashCounts.critical})
                  </button>
                  <button
                    onClick={() => setClashFilterSeverity("HIGH")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "1px solid #fdba74",
                      backgroundColor: clashFilterSeverity === "HIGH" ? "#f97316" : "#fff7ed",
                      color: clashFilterSeverity === "HIGH" ? "#ffffff" : "#ea580c",
                      cursor: "pointer"
                    }}
                  >
                    🟠 High ({clashCounts.high})
                  </button>
                  <button
                    onClick={() => setClashFilterSeverity("MEDIUM")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "1px solid #fde047",
                      backgroundColor: clashFilterSeverity === "MEDIUM" ? "#ca8a04" : "#fefce8",
                      color: clashFilterSeverity === "MEDIUM" ? "#ffffff" : "#854d0e",
                      cursor: "pointer"
                    }}
                  >
                    🟡 Medium ({clashCounts.medium})
                  </button>
                  <button
                    onClick={() => setClashFilterSeverity("MANAGEABLE")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "1px solid #86efac",
                      backgroundColor: clashFilterSeverity === "MANAGEABLE" ? "#16a34a" : "#f0fdf4",
                      color: clashFilterSeverity === "MANAGEABLE" ? "#ffffff" : "#166534",
                      cursor: "pointer"
                    }}
                  >
                    🟢 Manageable ({clashCounts.manageable})
                  </button>
                </div>

                {/* TIMING, BUFFER & BREAK CONSTRAINTS BAR */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  backgroundColor: "#f8fafc",
                  border: "1.5px solid #cbd5e1"
                }}>
                  {/* Option 1: Start Time */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      🚩 Venue Start Time
                    </label>
                    <select
                      value={startTimeMode}
                      onChange={e => setStartTimeMode(e.target.value as any)}
                      className="form-input"
                      style={{ fontSize: "0.8rem", padding: "4px 8px", width: "100%", fontWeight: 600 }}
                    >
                      <option value="SAVED">Preserve Saved Start Time (or 09:30 AM)</option>
                      <option value="FIXED_930">Fixed 09:30 AM (Standard Start)</option>
                    </select>
                  </div>

                  {/* Option 2: Max Buffer Gap */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      ⏱️ Max Buffer Gap
                    </label>
                    <select
                      value={maxBuffer}
                      onChange={e => setMaxBuffer(Number(e.target.value))}
                      className="form-input"
                      style={{ fontSize: "0.8rem", padding: "4px 8px", width: "100%", fontWeight: 600 }}
                    >
                      <option value={60}>Up to 60 mins (Max clash separation)</option>
                      <option value={45}>Up to 45 mins</option>
                      <option value={30}>Up to 30 mins</option>
                      <option value={15}>Up to 15 mins (Standard)</option>
                    </select>
                  </div>

                  {/* Option 3: Lunch/Prayer Break */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={enableBreak}
                          onChange={e => setEnableBreak(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        🍽️ Break Option
                      </label>
                    </div>
                    <select
                      value={breakWindow}
                      disabled={!enableBreak}
                      onChange={e => setBreakWindow(e.target.value)}
                      className="form-input"
                      style={{
                        fontSize: "0.8rem",
                        padding: "4px 8px",
                        width: "100%",
                        fontWeight: 600,
                        opacity: enableBreak ? 1 : 0.5
                      }}
                    >
                      <option value="13:00-13:45">01:00 PM – 01:45 PM (45m Break)</option>
                      <option value="13:00-14:00">01:00 PM – 02:00 PM (60m Break)</option>
                    </select>
                  </div>

                  {/* Option 4: Close Time Window */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      🏁 Close Window
                    </label>
                    <div style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#0f766e",
                      backgroundColor: "#ccfbf1",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #99f6e4"
                    }}>
                      Recommended 5:00 PM <span style={{ color: "#b91c1c", marginLeft: "4px" }}>(Hard Limit: 6:00 PM)</span>
                    </div>
                  </div>
                </div>

                {/* Clash Solver Buttons */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  {/* Mode 1: Safe Auto-Fix (Order & Buffer up to 60m - Same Venue) */}
                  <button
                    onClick={handleSafeAutoFix}
                    disabled={fixingClashes || clashList.length === 0}
                    className="btn"
                    style={{
                      background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: fixingClashes || clashList.length === 0 ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 8px rgba(34, 197, 94, 0.35)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    title={`Safely reorders slots & tunes buffer gap up to ${maxBuffer}m between 9:30 AM and 5:00–6:00 PM. NEVER touches program durations or venues.`}
                  >
                    <span>🔄</span>
                    <span>{fixingClashes ? "Optimizing..." : `Auto-Fix Clashes (Slot Order & 5–${maxBuffer}m Buffer | Same Venue)`}</span>
                  </button>

                  {/* Mode 2: Test Venue Transfer for Severe Clashes */}
                  <button
                    onClick={handleTestVenueTransfers}
                    disabled={testingTransfers || clashList.length === 0}
                    className="btn"
                    style={{
                      background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: testingTransfers || clashList.length === 0 ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    title="Simulate moving stubborn programs to another venue to eliminate critical clashes while respecting the 6:00 PM close window"
                  >
                    <span>⚡</span>
                    <span>{testingTransfers ? "Simulating..." : "Mode 2: Test Venue Transfer for Severe Clashes"}</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {fixMessage && (
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: fixMessage.startsWith("❌") ? "#fef2f2" : "#f0fdf4",
                  border: `1.5px solid ${fixMessage.startsWith("❌") ? "#fca5a5" : "#86efac"}`,
                  color: fixMessage.startsWith("❌") ? "#991b1b" : "#166534",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}>
                  <div>{fixMessage}</div>
                  {!fixMessage.startsWith("❌") && (
                    <a
                      href={`/print/schedule?eventId=${selectedZoneId !== "ALL" ? selectedZoneId : activeEventId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{
                        backgroundColor: "#166534",
                        color: "#ffffff",
                        padding: "6px 14px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        borderRadius: "6px",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <span>🖨️</span>
                      <span>View & Print Updated Schedule</span>
                    </a>
                  )}
                </div>
              )}

              {/* TYPE 2: PROPOSED VENUE TRANSFERS REVIEW MODAL/CARD */}
              {transferReport && transferReport.proposals && transferReport.proposals.length > 0 && (
                <div style={{
                  padding: "18px 22px",
                  borderRadius: "12px",
                  backgroundColor: "#fffbeb",
                  border: "2px solid #f59e0b",
                  boxShadow: "0 8px 24px rgba(245, 158, 11, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "1.4rem" }}>🧪</span>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#92400e" }}>
                          Proposed Cross-Venue Transfers ({transferReport.proposals.length} Recommended Moves)
                        </h3>
                      </div>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#78350f" }}>
                        Moving these programs reduces total clashes from <strong>{transferReport.currentClashCount}</strong> down to <strong>{transferReport.proposals[0]?.projectedTotalClashes ?? 0}</strong>!
                      </p>
                    </div>

                    <span style={{
                      backgroundColor: "#fef3c7",
                      color: "#b45309",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      border: "1px solid #fde68a"
                    }}>
                      ⚡ Reduces Clashes
                    </span>
                  </div>

                  {/* Warning Notice About Jury Sitting and Valuation */}
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    backgroundColor: "#fef2f2",
                    border: "1.5px solid #ef4444",
                    color: "#991b1b",
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <span style={{ fontSize: "1.3rem" }}>⚠️</span>
                    <div>
                      <strong>JURY SITTING & VALUATION VERIFICATION REQUIRED:</strong>
                      <div style={{ fontSize: "0.78rem", marginTop: "2px" }}>
                        Moving a program to another venue requires judges, judging tables, and valuation criteria to be accommodated in the destination venue. Please confirm if jury sitting and valuation is possible at the destination venue before applying.
                      </div>
                    </div>
                  </div>

                  {/* Proposed Transfers Table */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    padding: "12px",
                    border: "1px solid #fde68a"
                  }}>
                    {transferReport.proposals.map((p: any, pIdx: number) => (
                      <div
                        key={pIdx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          flexWrap: "wrap",
                          gap: "8px"
                        }}
                      >
                        <div>
                          <strong style={{ color: "#0f172a" }}>
                            {p.programCode ? `#${p.programCode} ` : ""}{p.programName}
                          </strong>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "6px" }}>
                            ({p.categoryName})
                          </span>
                          <div style={{ fontSize: "0.78rem", color: "#059669", marginTop: "2px" }}>
                            {p.reason}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            fontSize: "0.8rem",
                            fontWeight: 700
                          }}>
                            {p.currentVenue}
                          </span>
                          <span style={{ fontSize: "1rem" }}>➔</span>
                          <span style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#ecfdf5",
                            color: "#059669",
                            border: "1px solid #a7f3d0",
                            fontSize: "0.8rem",
                            fontWeight: 800
                          }}>
                            📍 {p.proposedVenue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Confirmation Decision Buttons */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
                    <button
                      onClick={() => setTransferReport(null)}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.82rem", fontWeight: 700 }}
                    >
                      ❌ Keep Original Venues (First Type Change Only)
                    </button>

                    <button
                      onClick={handleApplyTransfers}
                      disabled={applyingTransfer}
                      className="btn btn-primary"
                      style={{
                        background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
                        borderColor: "#b45309",
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        padding: "8px 20px"
                      }}
                    >
                      {applyingTransfer ? "Applying..." : "✅ Confirm Jury & Apply Venue Transfer"}
                    </button>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {clashesLoading && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
                  <strong>Analyzing candidate schedules and calculating conflicts...</strong>
                </div>
              )}

              {/* Zero Clashes Success Banner */}
              {!clashesLoading && clashList.length === 0 && (
                <div style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "12px",
                  border: "1.5px solid #86efac"
                }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🎉</div>
                  <h3 style={{ margin: "0 0 6px 0", color: "#166534", fontWeight: 800 }}>Zero Clashes Detected!</h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#15803d" }}>
                    All candidates have conflict-free schedules in this zone. No candidate is scheduled in 2 places simultaneously.
                  </p>
                </div>
              )}

              {/* Clashes Cards Grid */}
              {!clashesLoading && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "12px" }}>
                  {clashList
                    .filter(c => clashFilterSeverity === "ALL" || c.severity === clashFilterSeverity)
                    .map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "#ffffff",
                          border: `1.5px solid ${c.severityColor}`,
                          borderRadius: "10px",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                        }}
                      >
                        {/* Clash Card Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{
                            backgroundColor: `${c.severityColor}18`,
                            color: c.severityColor,
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: `1px solid ${c.severityColor}40`
                          }}>
                            {c.severityIcon} {c.severityLabel}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 800 }}>
                            {c.overlapMinutes}m overlap
                          </span>
                        </div>

                        {/* Candidate Identity */}
                        <div>
                          <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>
                            👤 {c.candidateName}
                            {c.chestNumber && (
                              <span style={{
                                marginLeft: "6px",
                                fontSize: "0.75rem",
                                color: "#475569",
                                backgroundColor: "#f1f5f9",
                                padding: "1px 6px",
                                borderRadius: "4px"
                              }}>
                                #{c.chestNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Conflict Pair Visualizer */}
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          backgroundColor: "#f8fafc",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                            <span><strong>1:</strong> {c.program1Name}</span>
                            <span style={{ color: "#475569" }}>
                              {c.program1Venue} ({formatTimeAmPm(c.program1Start)} - {formatTimeAmPm(c.program1End)})
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                            <span><strong>2:</strong> {c.program2Name}</span>
                            <span style={{ color: "#475569" }}>
                              {c.program2Venue} ({formatTimeAmPm(c.program2Start)} - {formatTimeAmPm(c.program2End)})
                            </span>
                          </div>
                        </div>

                        {/* Explanation Note */}
                        <div style={{ fontSize: "0.76rem", color: "#64748b", fontStyle: "italic" }}>
                          {c.explanation}
                        </div>
                      </div>
                    ))}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "14px 24px",
              borderTop: "1.5px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Total Clashes: <strong>{clashList.length}</strong> (Critical: {clashCounts.critical}, High: {clashCounts.high}, Medium: {clashCounts.medium}, Manageable: {clashCounts.manageable})
              </span>

              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", padding: "6px 18px", fontWeight: 700 }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
