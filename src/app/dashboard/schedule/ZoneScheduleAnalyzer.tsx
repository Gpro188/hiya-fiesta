"use client";

import { useState, useEffect } from "react";
import { 
  getZoneScheduleAnalysis, 
  applyRegistrationBasedScheduleToZone, 
  applyRegistrationBasedScheduleToAllZones,
  getScheduleClashAnalysis,
  resolveManageableClashes
} from "./actions";
import { ScoredClash, formatTimeAmPm } from "@/lib/scheduleCalculator";

interface ProgramSlotReport {
  id: string;
  programCode?: string | null;
  name: string;
  type?: string;
  candidateCount: number;
  teamCount?: number;
  durationMode?: string | null;
  durationPerCandidate: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
}

interface VenueReport {
  venue: string;
  totalPrograms: number;
  totalCandidates: number;
  totalDurationMinutes: number;
  formattedDuration: string;
  startTime: string;
  endTime: string;
  status: "FEASIBLE" | "TIGHT" | "OVERRUN";
  statusText: string;
  statusColor: string;
  programs: ProgramSlotReport[];
}

interface ZoneReport {
  eventId: string;
  zoneName: string;
  zoneId?: string | null;
  venues: VenueReport[];
  totalVenues: number;
  totalPrograms: number;
  totalCandidates: number;
  overallFinishTime: string;
  zoneStatus: "FEASIBLE" | "TIGHT" | "OVERRUN";
  isOneDayFeasible: boolean;
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
  const [activeTab, setActiveTab] = useState<"CAPACITY" | "CLASHES">("CAPACITY");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneReport[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("ALL");
  const [expandedVenues, setExpandedVenues] = useState<Record<string, boolean>>({});
  const [bufferMinutes, setBufferMinutes] = useState<number>(2);

  // Clash Analysis State
  const [clashList, setClashList] = useState<ScoredClash[]>([]);
  const [clashesLoading, setClashesLoading] = useState(false);
  const [clashCounts, setClashCounts] = useState<{ critical: number; high: number; medium: number; manageable: number }>({ critical: 0, high: 0, medium: 0, manageable: 0 });
  const [clashFilterSeverity, setClashFilterSeverity] = useState<string>("ALL");
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [fixingClashes, setFixingClashes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAnalysis();
      loadClashes();
    }
  }, [isOpen]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const res = await getZoneScheduleAnalysis();
      if (res.success && res.zones) {
        setZones(res.zones);
      } else {
        alert("Failed to load zone analysis: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error loading analysis: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClashes = async (eventIdOverride?: string) => {
    setClashesLoading(true);
    setFixMessage(null);
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

  const handleFixManageableInAnalyzer = async () => {
    const targetId = selectedZoneId !== "ALL" ? selectedZoneId : activeEventId;
    if (!targetId) return;
    if (!confirm("Automatically resolve manageable candidate clashes?\n\nCandidate slots will be swapped so they are 1st in one venue and last in the conflicting venue. Fixed times and program types are never changed.")) return;
    setFixingClashes(true);
    setFixMessage(null);
    try {
      const res = await resolveManageableClashes(targetId);
      if (res.success) {
        setFixMessage(res.message || "Clashes resolved!");
        await loadClashes(targetId);
        if (onScheduleUpdated) onScheduleUpdated();
      } else {
        setFixMessage(`❌ ${res.error || "Failed to fix clashes"}`);
      }
    } catch (err: any) {
      setFixMessage(`❌ ${err.message || "Error"}`);
    } finally {
      setFixingClashes(false);
    }
  };

  const handleApplySingleZone = async (zone: ZoneReport) => {
    if (!confirm(`Apply candidate registration-based 1-day schedule to "${zone.zoneName}"?\n\nProgram durations will be calculated from actual registered candidates and scheduled sequentially starting strictly from 09:00 AM.`)) {
      return;
    }

    setActionLoading(`zone-${zone.eventId}`);
    try {
      const res = await applyRegistrationBasedScheduleToZone(zone.eventId, { bufferMinutes });
      if (res.success) {
        alert(`✅ Successfully updated "${zone.zoneName}"!\n• ${res.updatedProgramsCount} Programs scheduled\n• ${res.updatedSlotsCount} Candidate slots assigned`);
        await loadAnalysis();
        if (onScheduleUpdated) onScheduleUpdated();
      } else {
        alert("Failed: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyAllZones = async () => {
    if (!confirm(`Apply candidate registration-based 1-day schedule to ALL ${zones.length} Zones?\n\nEvery zone's program durations will be automatically computed from their candidate registrations and start at 09:00 AM.`)) {
      return;
    }

    setActionLoading("all-zones");
    try {
      const res = await applyRegistrationBasedScheduleToAllZones({ bufferMinutes });
      if (res.success) {
        alert(`🎉 Successfully synchronized 1-Day schedule across all ${res.zonesProcessed} Zones!\n• ${res.totalPrograms} Programs updated\n• ${res.totalSlots} Candidate slots sequenced`);
        await loadAnalysis();
        if (onScheduleUpdated) onScheduleUpdated();
      } else {
        alert("Failed: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleVenueExpand = (key: string) => {
    setExpandedVenues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredZones = selectedZoneId === "ALL" 
    ? zones 
    : zones.filter(z => z.eventId === selectedZoneId);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: "0.85rem",
          padding: "8px 16px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          border: "none",
          cursor: "pointer"
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>⏱️</span>
        <span>1-Day Zone Capacity & Auto-Scheduler</span>
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
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden"
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: "18px 24px",
              borderBottom: "1.5px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "linear-gradient(to right, #f8fafc, #f1f5f9)"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.5rem" }}>⏱️</span>
                  <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
                    1-Day Zonal Schedule & Venue Runtime Analyzer
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Auto-calculates exact program durations based on registered candidates in each zone. Zonal festivals strictly start at <strong>09:00 AM</strong> and must fit within 1 day.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={loadAnalysis}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span>🔄</span> {loading ? "Analyzing..." : "Refresh"}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
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

            {/* Modal Navigation Tabs */}
            <div style={{ display: "flex", borderBottom: "1.5px solid #e2e8f0", backgroundColor: "#ffffff", padding: "0 24px" }}>
              <button
                onClick={() => setActiveTab("CAPACITY")}
                style={{
                  padding: "12px 20px",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  border: "none",
                  background: "none",
                  borderBottom: activeTab === "CAPACITY" ? "3px solid #4f46e5" : "3px solid transparent",
                  color: activeTab === "CAPACITY" ? "#4f46e5" : "#64748b",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>⏱️</span>
                <span>1-Day Venue Feasibility</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("CLASHES");
                  loadClashes();
                }}
                style={{
                  padding: "12px 20px",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  border: "none",
                  background: "none",
                  borderBottom: activeTab === "CLASHES" ? "3px solid #ef4444" : "3px solid transparent",
                  color: activeTab === "CLASHES" ? "#dc2626" : "#64748b",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>⚡</span>
                <span>Clash Analysis & Auto-Fix</span>
                {clashCounts.critical > 0 ? (
                  <span style={{ backgroundColor: "#ef4444", color: "#fff", padding: "1px 7px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 800 }}>
                    {clashCounts.critical} Critical
                  </span>
                ) : clashCounts.manageable > 0 ? (
                  <span style={{ backgroundColor: "#22c55e", color: "#fff", padding: "1px 7px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 800 }}>
                    {clashCounts.manageable} Fixable
                  </span>
                ) : null}
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div style={{
              padding: "12px 24px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              {/* Zone Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>Filter Zone:</span>
                <select
                  value={selectedZoneId}
                  onChange={e => {
                    const zid = e.target.value;
                    setSelectedZoneId(zid);
                    if (activeTab === "CLASHES") {
                      loadClashes(zid !== "ALL" ? zid : activeEventId);
                    }
                  }}
                  className="form-input"
                  style={{ fontSize: "0.82rem", padding: "4px 10px", width: "220px" }}
                >
                  <option value="ALL">All Zones ({zones.length})</option>
                  {zones.map(z => (
                    <option key={z.eventId} value={z.eventId}>
                      {z.zoneName}
                    </option>
                  ))}
                </select>

                {/* Transition Buffer gap */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>Gap Buffer:</span>
                  <select
                    value={bufferMinutes}
                    onChange={e => setBufferMinutes(parseInt(e.target.value) || 0)}
                    className="form-input"
                    style={{ fontSize: "0.82rem", padding: "4px 8px", width: "110px" }}
                  >
                    <option value={0}>0 min (Direct)</option>
                    <option value={2}>2 mins gap</option>
                    <option value={5}>5 mins gap</option>
                  </select>
                </div>
              </div>

              {/* Master Sync Action */}
              {isSuperAdmin && (
                <button
                  onClick={handleApplyAllZones}
                  disabled={actionLoading !== null || loading || zones.length === 0}
                  className="btn"
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: actionLoading !== null ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(16, 185, 129, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>⚡</span>
                  <span>{actionLoading === "all-zones" ? "Calculating & Syncing All..." : "Auto-Calculate & Sync ALL Zones"}</span>
                </button>
              )}
            </div>

            {/* Modal Body: Active Tab Branching */}
            {activeTab === "CLASHES" ? (
              <div style={{
                padding: "20px 24px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}>
                {/* Clash Overview & Actions */}
                <div style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
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

                  {clashCounts.manageable > 0 && (
                    <button
                      onClick={handleFixManageableInAnalyzer}
                      disabled={fixingClashes}
                      className="btn"
                      style={{
                        background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        padding: "7px 16px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: fixingClashes ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 8px rgba(34, 197, 94, 0.35)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <span>🔧</span>
                      <span>{fixingClashes ? "Resolving..." : `Auto-Fix Manageable Clashes (${clashCounts.manageable})`}</span>
                    </button>
                  )}
                </div>

                {fixMessage && (
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    backgroundColor: fixMessage.startsWith("❌") ? "#fef2f2" : "#f0fdf4",
                    border: `1px solid ${fixMessage.startsWith("❌") ? "#fca5a5" : "#86efac"}`,
                    color: fixMessage.startsWith("❌") ? "#991b1b" : "#166534",
                    fontSize: "0.85rem",
                    fontWeight: 700
                  }}>
                    {fixMessage}
                  </div>
                )}

                {clashesLoading && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
                    <strong>Analyzing candidate schedules and calculating conflicts...</strong>
                  </div>
                )}

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
                            borderRadius: "12px",
                            padding: "14px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{
                              backgroundColor: `${c.severityColor}15`,
                              color: c.severityColor,
                              padding: "3px 10px",
                              borderRadius: "6px",
                              fontWeight: 800,
                              fontSize: "0.75rem",
                              border: `1px solid ${c.severityColor}35`
                            }}>
                              {c.severityLabel}
                            </span>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
                              {c.overlapMinutes} min overlap
                            </span>
                          </div>

                          <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a", marginBottom: "6px" }}>
                            👤 {c.candidateName}
                          </div>

                          <div style={{ fontSize: "0.8rem", color: "#334155", marginBottom: "3px" }}>
                            📍 <strong>{c.program1Venue}</strong>: {c.program1Name}
                            <span style={{ color: "#64748b", marginLeft: "6px" }}>
                              ({formatTimeAmPm(c.program1Start)} - {formatTimeAmPm(c.program1End)})
                            </span>
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#334155", marginBottom: "6px" }}>
                            📍 <strong>{c.program2Venue}</strong>: {c.program2Name}
                            <span style={{ color: "#64748b", marginLeft: "6px" }}>
                              ({formatTimeAmPm(c.program2Start)} - {formatTimeAmPm(c.program2End)})
                            </span>
                          </div>

                          <div style={{
                            fontSize: "0.75rem",
                            color: "#475569",
                            backgroundColor: "#f8fafc",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            borderLeft: `3px solid ${c.severityColor}`
                          }}>
                            {c.explanation}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              /* Modal Body: Zones Capacity List */
              <div style={{
                padding: "20px 24px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "20px"
              }}>
                {loading && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
                  <strong>Analyzing candidate registrations and building venue timelines...</strong>
                </div>
              )}

              {!loading && filteredZones.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  No zone schedules found. Ensure Master Schedule has assigned venues.
                </div>
              )}

              {!loading && filteredZones.map(zone => {
                const isOverrun = zone.zoneStatus === "OVERRUN";
                const isTight = zone.zoneStatus === "TIGHT";

                return (
                  <div 
                    key={zone.eventId}
                    style={{
                      border: `1.5px solid ${isOverrun ? "#fca5a5" : isTight ? "#fde68a" : "#e2e8f0"}`,
                      borderRadius: "14px",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      overflow: "hidden"
                    }}
                  >
                    {/* Zone Header Bar */}
                    <div style={{
                      padding: "14px 20px",
                      backgroundColor: isOverrun ? "#fef2f2" : isTight ? "#fffbeb" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
                          📍 {zone.zoneName}
                        </h3>
                        
                        {/* 1-Day Status Badge */}
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          backgroundColor: isOverrun ? "#fee2e2" : isTight ? "#fef3c7" : "#dcfce7",
                          color: isOverrun ? "#dc2626" : isTight ? "#d97706" : "#15803d",
                          border: `1px solid ${isOverrun ? "#fca5a5" : isTight ? "#fde68a" : "#86efac"}`
                        }}>
                          {isOverrun 
                            ? "🔴 Exceeds 1-Day (> 8:00 PM)" 
                            : isTight 
                            ? `🟡 Tight Evening Finish (Ends by ${zone.overallFinishTime})` 
                            : `🟢 Fits in 1-Day (Finished by ${zone.overallFinishTime})`}
                        </span>

                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          <strong>{zone.totalVenues}</strong> Stages • <strong>{zone.totalPrograms}</strong> Programs • <strong>{zone.totalCandidates}</strong> Registered Candidates
                        </span>
                      </div>

                      {/* Action to Apply Schedule to This Zone */}
                      <button
                        onClick={() => handleApplySingleZone(zone)}
                        disabled={actionLoading !== null}
                        className="btn btn-secondary"
                        style={{
                          padding: "6px 14px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          backgroundColor: "#ffffff",
                          borderColor: "#059669",
                          color: "#059669",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span>⚡</span>
                        <span>{actionLoading === `zone-${zone.eventId}` ? "Applying..." : "Apply 1-Day Schedule to This Zone"}</span>
                      </button>
                    </div>

                    {/* Venue Cards Grid */}
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                      {zone.venues.length === 0 ? (
                        <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>
                          No stages assigned for this zone.
                        </div>
                      ) : (
                        zone.venues.map((v, vIdx) => {
                          const vKey = `${zone.eventId}-${v.venue}`;
                          const isExpanded = expandedVenues[vKey];

                          return (
                            <div 
                              key={vIdx}
                              style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                backgroundColor: "#fbfcfd",
                                overflow: "hidden"
                              }}
                            >
                              {/* Venue Summary Line */}
                              <div style={{
                                padding: "10px 16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "10px"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                                    🏛️ {v.venue}
                                  </span>

                                  <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                                    {v.totalPrograms} Programs • {v.totalCandidates} Candidates
                                  </span>

                                  <span style={{
                                    fontSize: "0.8rem",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    backgroundColor: "#f1f5f9",
                                    color: "#334155",
                                    fontWeight: 700
                                  }}>
                                    Runtime: {v.formattedDuration}
                                  </span>

                                  <span style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 800,
                                    color: v.statusColor
                                  }}>
                                    ⏰ {v.startTime} &rarr; {v.endTime}
                                  </span>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    backgroundColor: v.status === "FEASIBLE" ? "#dcfce7" : v.status === "TIGHT" ? "#fef3c7" : "#fee2e2",
                                    color: v.statusColor
                                  }}>
                                    {v.statusText}
                                  </span>

                                  <button
                                    onClick={() => toggleVenueExpand(vKey)}
                                    style={{
                                      background: "none",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "6px",
                                      padding: "3px 8px",
                                      fontSize: "0.75rem",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      color: "#475569"
                                    }}
                                  >
                                    {isExpanded ? "Hide Details ▲" : "View Program Breakdown ▼"}
                                  </button>
                                </div>
                              </div>

                              {/* Program Detailed Breakdown Table */}
                              {isExpanded && (
                                <div style={{ borderTop: "1px solid #e2e8f0", padding: "10px 16px", backgroundColor: "#ffffff" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                                    <thead>
                                      <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                                        <th style={{ padding: "6px 8px" }}>#</th>
                                        <th style={{ padding: "6px 8px" }}>Program</th>
                                        <th style={{ padding: "6px 8px" }}>Type</th>
                                        <th style={{ padding: "6px 8px" }}>Zone Candidates</th>
                                        <th style={{ padding: "6px 8px" }}>Rate / Cand</th>
                                        <th style={{ padding: "6px 8px" }}>Calculated Duration</th>
                                        <th style={{ padding: "6px 8px" }}>Scheduled Time</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {v.programs.map((p, pIdx) => (
                                        <tr key={pIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                          <td style={{ padding: "6px 8px", fontWeight: 700, color: "#64748b" }}>{pIdx + 1}</td>
                                          <td style={{ padding: "6px 8px", fontWeight: 700, color: "#1e293b" }}>
                                            {p.programCode ? `[${p.programCode}] ` : ""}{p.name}
                                          </td>
                                          <td style={{ padding: "6px 8px" }}>
                                            <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#475569" }}>
                                              {p.type || "INDIVIDUAL"}
                                            </span>
                                          </td>
                                          <td style={{ padding: "6px 8px", fontWeight: 700, color: p.candidateCount > 0 ? "#059669" : "#94a3b8" }}>
                                            {p.durationMode === 'TOTAL_FIXED' ? (
                                              <span>⏱️ {p.candidateCount} cands</span>
                                            ) : (p.teamCount !== undefined && p.teamCount > 0 && (p.durationMode === 'PER_TEAM' || p.type === 'GROUP' || p.type === 'GENERAL')) ? (
                                              <span>👥 {p.teamCount} Teams ({p.candidateCount} cands)</span>
                                            ) : (
                                              <span>👥 {p.candidateCount}</span>
                                            )}
                                          </td>
                                          <td style={{ padding: "6px 8px", color: "#64748b" }}>
                                            {p.durationMode === 'TOTAL_FIXED' ? (
                                              <span style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 600 }}>Fixed Total</span>
                                            ) : (p.teamCount !== undefined && p.teamCount > 0 && (p.durationMode === 'PER_TEAM' || p.type === 'GROUP' || p.type === 'GENERAL')) ? (
                                              <span>{p.durationPerCandidate} min/team</span>
                                            ) : (
                                              <span>{p.durationPerCandidate} min/cand</span>
                                            )}
                                          </td>
                                          <td style={{ padding: "6px 8px", fontWeight: 700, color: "#0f172a" }}>
                                            {p.durationMinutes} mins
                                          </td>
                                          <td style={{ padding: "6px 8px", fontWeight: 700, color: "#4f46e5" }}>
                                            {p.startTime} &rarr; {p.endTime}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal Footer */}
            <div style={{
              padding: "14px 24px",
              borderTop: "1.5px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                💡 <em>Applying a schedule updates program start times, durations, and candidate timeslots in the database for that zone.</em>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary"
                style={{ padding: "6px 18px", fontSize: "0.85rem", fontWeight: 700 }}
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
