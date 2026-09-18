"use client";

import { useState, useMemo } from "react";
import { promoteToState, autoPromoteZoneFirstPlaces } from "./actions";

interface PromotionsClientProps {
  zoneEvents: any[];
  masterPrograms: any[];
  categories?: any[];
  zonePrograms?: any[];
  isZoneAdmin: boolean;
  stateConfirmEndDate: Date | null | undefined;
}

export default function PromotionsClient({
  zoneEvents,
  masterPrograms,
  categories = [],
  zonePrograms = [],
  isZoneAdmin,
  stateConfirmEndDate,
}: PromotionsClientProps) {
  // Precompute program counts with results per zone
  const zoneStats = useMemo(() => {
    const map = new Map<string, { total: number; confirmed: number; pending: number; alternates: number }>();
    for (const z of zoneEvents) {
      const progs = masterPrograms.filter((prog: any) =>
        prog.results?.some(
          (r: any) => r.team?.eventId === z.id || r.candidate?.team?.eventId === z.id
        )
      );

      let confirmed = 0;
      let alternates = 0;
      let pending = 0;

      for (const p of progs) {
        const zoneResults = (p.results || []).filter(
          (r: any) => r.team?.eventId === z.id || r.candidate?.team?.eventId === z.id
        );
        const zoneAssignments = (p.assignments || []).filter(
          (a: any) => a.candidate?.team?.eventId === z.id
        );
        const isGroup =
          p.type === "GROUP" || (!zoneResults[0]?.candidateId && Boolean(zoneResults[0]?.teamId));

        let promotedResult: any = null;
        if (zoneAssignments.length > 0) {
          if (isGroup) {
            const assignedTeamId = zoneAssignments[0]?.candidate?.teamId;
            promotedResult = zoneResults.find((r: any) => r.teamId === assignedTeamId) || null;
          } else {
            const assignedCandidateId = zoneAssignments[0]?.candidateId;
            promotedResult = zoneResults.find((r: any) => r.candidateId === assignedCandidateId) || null;
          }
        }

        if (promotedResult) {
          confirmed++;
          if (promotedResult.rank > 1) alternates++;
        } else {
          pending++;
        }
      }

      map.set(z.id, { total: progs.length, confirmed, pending, alternates });
    }
    return map;
  }, [zoneEvents, masterPrograms]);

  // Default to the first zone with published results (e.g. Thrissur)
  const defaultZoneId = useMemo(() => {
    for (const z of zoneEvents) {
      if ((zoneStats.get(z.id)?.total || 0) > 0) return z.id;
    }
    return zoneEvents[0]?.id || "";
  }, [zoneEvents, zoneStats]);

  const [selectedZoneId, setSelectedZoneId] = useState<string>(defaultZoneId);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "PENDING" | "ALTERNATE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingResultId, setLoadingResultId] = useState<string | null>(null);
  const [bulkLoadingZoneId, setBulkLoadingZoneId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Modal for alternate selection confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    result: any;
    masterProg: any;
    title: string;
    message: string;
  } | null>(null);

  // Modal for inspecting group/general program members with photos
  const [teamMembersModal, setTeamMembersModal] = useState<{
    isOpen: boolean;
    programName: string;
    programCode?: string;
    teamName: string;
    rank?: number;
    candidates: any[];
  } | null>(null);

  const isLocked = Boolean(isZoneAdmin && stateConfirmEndDate && new Date() > new Date(stateConfirmEndDate));

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const handlePromote = async (result: any, masterProg: any) => {
    if (result.rank > 1) {
      setConfirmModal({
        isOpen: true,
        result,
        masterProg,
        title: `Confirm Rank ${result.rank} as State Representative`,
        message: `Are you sure you want to select Rank ${result.rank} (${
          result.candidate?.name || result.team?.name
        }) instead of 1st place for "${masterProg.name}"? This will represent the zone in the State Final.`,
      });
      return;
    }

    executePromote(result.id, masterProg.id);
  };

  const executePromote = async (resultId: string, masterProgId: string) => {
    setConfirmModal(null);
    setLoadingResultId(resultId);
    try {
      const res = await promoteToState(resultId, masterProgId);
      if (!res.success) {
        showToast("Failed to promote: " + res.error, "error");
      } else {
        showToast("State representative successfully updated!", "success");
        window.location.reload();
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update state participant", "error");
    } finally {
      setLoadingResultId(null);
    }
  };

  const handleBulkPromote1stPlaces = async (zoneEvent: any) => {
    const ok = window.confirm(
      `⚡ AUTO-CONFIRM 1ST PLACES TO STATE FINAL\n\nThis will automatically confirm all 1st place winners from ${zoneEvent.name} to participate in the State Final.\n\nAny existing non-1st place assignments from this zone will be replaced. You can still manually switch any program to 2nd or 3rd place anytime later.\n\nProceed?`
    );
    if (!ok) return;

    setBulkLoadingZoneId(zoneEvent.id);
    try {
      const res = await autoPromoteZoneFirstPlaces(zoneEvent.id);
      if (!res.success) {
        showToast("Failed to auto-promote: " + res.error, "error");
      } else {
        showToast(
          `🎉 Successfully confirmed ${res.promotedCount} 1st-place participants to State Final!`,
          "success"
        );
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err: any) {
      showToast(err.message || "Bulk auto-promotion failed", "error");
    } finally {
      setBulkLoadingZoneId(null);
    }
  };

  // Helper to open Team Members with Photos modal
  const openTeamMembers = (program: any, teamId: string, teamName: string, rank?: number) => {
    // 1. Look up candidates in zonePrograms for this program and team
    let candidatesList: any[] = [];
    const zp = zonePrograms.find((p: any) => p.programCode === program.programCode);
    if (zp) {
      candidatesList = zp.assignments
        .filter((a: any) => a.candidate?.teamId === teamId)
        .map((a: any) => a.candidate);
    }

    // 2. Fallback: look up in master program assignments
    if (candidatesList.length === 0) {
      candidatesList = (program.assignments || [])
        .filter((a: any) => a.candidate?.teamId === teamId)
        .map((a: any) => a.candidate);
    }

    // Deduplicate candidates
    const uniqueMap = new Map();
    for (const c of candidatesList) {
      if (c && !uniqueMap.has(c.id)) {
        uniqueMap.set(c.id, c);
      }
    }

    setTeamMembersModal({
      isOpen: true,
      programName: program.name,
      programCode: program.programCode,
      teamName: teamName || "Team Members",
      rank,
      candidates: Array.from(uniqueMap.values()),
    });
  };

  const activeZone = zoneEvents.find((z) => z.id === selectedZoneId) || zoneEvents[0];
  const activeZoneStats = activeZone ? zoneStats.get(activeZone.id) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "14px 20px",
            borderRadius: "12px",
            background:
              toast.type === "success"
                ? "linear-gradient(135deg, #059669, #10b981)"
                : toast.type === "error"
                ? "linear-gradient(135deg, #dc2626, #ef4444)"
                : "linear-gradient(135deg, #2563eb, #3b82f6)",
            color: "#ffffff",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "0.95rem",
            fontWeight: 600,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "⚠️" : "ℹ️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              borderRadius: "16px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <h3 style={{ margin: 0, color: "var(--warning)" }}>{confirmModal.title}</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
              {confirmModal.message}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="btn btn-secondary"
                style={{ padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executePromote(confirmModal.result.id, confirmModal.masterProg.id)}
                className="btn btn-primary"
                style={{
                  padding: "8px 18px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  borderColor: "#d97706",
                }}
              >
                Confirm State Representative
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Members & Candidate Photos Modal */}
      {teamMembersModal?.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: "760px",
              width: "100%",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "20px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {teamMembersModal.programCode && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: "var(--primary)",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                      }}
                    >
                      #{teamMembersModal.programCode}
                    </span>
                  )}
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
                    {teamMembersModal.programName}
                  </h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 700 }}>
                    👥 {teamMembersModal.teamName}
                  </span>
                  {teamMembersModal.rank && (
                    <span
                      style={{
                        padding: "1px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor:
                          teamMembersModal.rank === 1
                            ? "rgba(234, 179, 8, 0.2)"
                            : "rgba(148, 163, 184, 0.2)",
                        color: teamMembersModal.rank === 1 ? "#eab308" : "#94a3b8",
                      }}
                    >
                      Rank {teamMembersModal.rank}
                    </span>
                  )}
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    ({teamMembersModal.candidates.length} Registered Members)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTeamMembersModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "8px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Candidate Cards Grid */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {teamMembersModal.candidates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  No candidate photos registered for this team.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {teamMembersModal.candidates.map((c: any) => {
                    const photo = c.photoUrl || c.photo;
                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "14px",
                          borderRadius: "12px",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border-color)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          gap: "10px",
                          transition: "transform 0.15s ease",
                        }}
                      >
                        {/* Photo Container */}
                        <div
                          style={{
                            width: "84px",
                            height: "84px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            backgroundColor: "rgba(255,255,255,0.08)",
                            border: "2px solid var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                          }}
                        >
                          {photo ? (
                            <img
                              src={photo}
                              alt={c.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: "1.8rem", color: "var(--text-muted)" }}>👤</span>
                          )}
                        </div>

                        {/* Candidate Details */}
                        <div>
                          {c.chestNumber && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                backgroundColor: "rgba(236, 72, 153, 0.15)",
                                color: "var(--primary)",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                marginBottom: "4px",
                              }}
                            >
                              CHEST #{c.chestNumber}
                            </span>
                          )}
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.9rem",
                              color: "var(--text-primary)",
                              lineHeight: 1.3,
                            }}
                          >
                            {c.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              marginTop: "4px",
                            }}
                          >
                            {c.team?.name || teamMembersModal.teamName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "flex-end",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              <button
                type="button"
                onClick={() => setTeamMembersModal(null)}
                className="btn btn-primary"
                style={{ padding: "8px 20px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Lock Banner */}
      {isZoneAdmin && (
        <div
          className="glass-panel"
          style={{
            padding: "16px 20px",
            borderRadius: "12px",
            backgroundColor: isLocked ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
            border: `1px solid ${isLocked ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h4 style={{ margin: 0, color: isLocked ? "var(--error)" : "var(--success)" }}>
              {isLocked ? "🔒 State Advancements Locked" : "🔓 State Advancements Open"}
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {isLocked
                ? "The deadline to confirm advancements has passed. Please contact fest administration for changes."
                : `You can modify promotions until ${
                    stateConfirmEndDate ? new Date(stateConfirmEndDate).toLocaleString() : "the deadline"
                  }.`}
            </p>
          </div>
        </div>
      )}

      {/* TOP BAR: Zone / District Dropdown Selector & Quick Switcher */}
      <div
        className="glass-panel"
        style={{
          padding: "18px 24px",
          borderRadius: "16px",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <label style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>
            📍 Select Zone / District:
          </label>
          <select
            id="zone-select-dropdown"
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1.5px solid var(--primary)",
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              minWidth: "260px",
            }}
          >
            {zoneEvents.map((z) => {
              const count = zoneStats.get(z.id)?.total || 0;
              const conf = zoneStats.get(z.id)?.confirmed || 0;
              return (
                <option key={z.id} value={z.id}>
                  {z.name} ({count > 0 ? `${conf}/${count} Confirmed` : "0 Programs"})
                </option>
              );
            })}
          </select>
        </div>

        {/* Quick Zone Switcher Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {zoneEvents.map((z) => {
            const hasResults = (zoneStats.get(z.id)?.total || 0) > 0;
            const isSelected = selectedZoneId === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZoneId(z.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  fontWeight: isSelected ? 800 : 600,
                  cursor: "pointer",
                  border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                  backgroundColor: isSelected
                    ? "var(--primary)"
                    : hasResults
                    ? "rgba(16, 185, 129, 0.12)"
                    : "transparent",
                  color: isSelected ? "#ffffff" : hasResults ? "var(--success)" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                {z.name.replace(" Zone", "")}
                {hasResults && !isSelected && " ✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED ZONE DETAILS & PROGRAMS TABLE */}
      {!activeZone ? (
        <div className="glass-panel" style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
          No zone selected.
        </div>
      ) : (
        (() => {
          const event = activeZone;

          // Master programs that have published results for this zone
          const programsWithZoneResults = masterPrograms.filter((prog: any) =>
            prog.results?.some(
              (r: any) => r.team?.eventId === event.id || r.candidate?.team?.eventId === event.id
            )
          );

          // Calculate statistics for this zone
          let confirmedCount = 0;
          let alternateCount = 0;
          let pendingCount = 0;

          const analyzedPrograms = programsWithZoneResults.map((masterProg: any) => {
            const zoneResults = (masterProg.results || []).filter(
              (r: any) => r.team?.eventId === event.id || r.candidate?.team?.eventId === event.id
            );

            // Filter master program assignments belonging to this zone
            const zoneAssignments = (masterProg.assignments || []).filter(
              (a: any) => a.candidate?.team?.eventId === event.id
            );

            const isGroup =
              masterProg.type === "GROUP" ||
              (!zoneResults[0]?.candidateId && Boolean(zoneResults[0]?.teamId));

            // Determine which result is currently promoted
            let promotedResult: any = null;
            if (zoneAssignments.length > 0) {
              if (isGroup) {
                const assignedTeamId = zoneAssignments[0]?.candidate?.teamId;
                promotedResult = zoneResults.find((r: any) => r.teamId === assignedTeamId) || null;
              } else {
                const assignedCandidateId = zoneAssignments[0]?.candidateId;
                promotedResult = zoneResults.find((r: any) => r.candidateId === assignedCandidateId) || null;
              }
            }

            const isConfirmed = Boolean(promotedResult);
            const isAlternate = Boolean(promotedResult && promotedResult.rank > 1);

            if (isConfirmed) confirmedCount++;
            else pendingCount++;
            if (isAlternate) alternateCount++;

            return {
              masterProg,
              zoneResults,
              zoneAssignments,
              isGroup,
              promotedResult,
              isConfirmed,
              isAlternate,
            };
          });

          // Filter programs based on Search, Status, and Category/General
          const filteredPrograms = analyzedPrograms.filter(
            ({ masterProg, zoneResults, isGroup, isConfirmed, isAlternate }) => {
              // Status filter
              if (statusFilter === "CONFIRMED" && !isConfirmed) return false;
              if (statusFilter === "PENDING" && isConfirmed) return false;
              if (statusFilter === "ALTERNATE" && !isAlternate) return false;

              // Category & General filter
              if (selectedCategory === "GENERAL") {
                // Must be a general / group program
                if (!isGroup && masterProg.category && masterProg.category.name !== "GENERAL") {
                  return false;
                }
              } else if (selectedCategory !== "ALL") {
                if (masterProg.categoryId !== selectedCategory && masterProg.category?.name !== selectedCategory) {
                  return false;
                }
              }

              // Search query
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = masterProg.name?.toLowerCase().includes(q);
                const matchCode = masterProg.programCode?.toLowerCase().includes(q);
                const matchCategory = masterProg.category?.name?.toLowerCase().includes(q);
                const matchCandidate = zoneResults.some(
                  (r: any) =>
                    r.candidate?.name?.toLowerCase().includes(q) ||
                    r.candidate?.chestNumber?.toLowerCase().includes(q) ||
                    r.team?.name?.toLowerCase().includes(q) ||
                    r.candidate?.team?.name?.toLowerCase().includes(q)
                );
                return matchName || matchCode || matchCategory || matchCandidate;
              }
              return true;
            }
          );

          if (programsWithZoneResults.length === 0) {
            return (
              <div
                className="glass-panel"
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  borderRadius: "16px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⏳</div>
                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{event.name}</h3>
                <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No published results found for this zone yet. Results will appear here automatically once the zone
                  concludes.
                </p>
              </div>
            );
          }

          return (
            <div
              className="glass-panel"
              style={{
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}
            >
              {/* Zone Header with Stats and Bulk Action */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  paddingBottom: "20px",
                  borderBottom: "1px solid var(--border-color)",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{ margin: 0, fontSize: "1.6rem", color: "var(--primary)", fontWeight: 800 }}>
                      {event.name}
                    </h2>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: "rgba(99, 102, 241, 0.15)",
                        color: "#818cf8",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      ZONE CONCLUDED
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Total Programs: <strong>{programsWithZoneResults.length}</strong>
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>•</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--success)" }}>
                      Confirmed to State: <strong>{confirmedCount}</strong>
                    </span>
                    {pendingCount > 0 && (
                      <>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>•</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--warning)" }}>
                          Pending: <strong>{pendingCount}</strong>
                        </span>
                      </>
                    )}
                    {alternateCount > 0 && (
                      <>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>•</span>
                        <span style={{ fontSize: "0.85rem", color: "#f59e0b" }}>
                          Alternates: <strong>{alternateCount}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bulk Confirm 1st Place Button */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    disabled={Boolean(bulkLoadingZoneId || (isLocked && isZoneAdmin))}
                    onClick={() => handleBulkPromote1stPlaces(event)}
                    className="btn btn-primary"
                    style={{
                      background: "linear-gradient(135deg, #059669, #10b981)",
                      borderColor: "#059669",
                      padding: "10px 20px",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      borderRadius: "10px",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: bulkLoadingZoneId || (isLocked && isZoneAdmin) ? "not-allowed" : "pointer",
                      opacity: isLocked && isZoneAdmin ? 0.6 : 1,
                    }}
                  >
                    <span>{bulkLoadingZoneId === event.id ? "⏳" : "⚡"}</span>
                    <span>
                      {bulkLoadingZoneId === event.id
                        ? "Confirming All 1st Places..."
                        : "Auto-Confirm All 1st Places to State"}
                    </span>
                  </button>
                </div>
              </div>

              {/* FILTER & SEARCH TOOLBAR: Category, General, Status, Search */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  marginBottom: "20px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                }}
              >
                {/* Row 1: Search & Category Filter */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
                  {/* Search input */}
                  <div style={{ flex: "1 1 240px" }}>
                    <input
                      type="text"
                      placeholder="Search program, code, candidate, team..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>

                  {/* Category Filter Dropdown & Pills */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      Category:
                    </span>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {[
                        { id: "ALL", label: "All Categories" },
                        { id: "FADHILA", label: "Fadhila" },
                        { id: "FADHEELA", label: "Fadheela" },
                        { id: "GENERAL", label: "⭐ General & Group" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            border: "1px solid",
                            borderColor:
                              selectedCategory === cat.id ? "var(--primary)" : "var(--border-color)",
                            backgroundColor:
                              selectedCategory === cat.id ? "rgba(236, 72, 153, 0.15)" : "transparent",
                            color: selectedCategory === cat.id ? "var(--primary)" : "var(--text-secondary)",
                          }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Status Filter Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Status:
                  </span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {(
                      [
                        { id: "ALL", label: `All (${programsWithZoneResults.length})` },
                        { id: "CONFIRMED", label: `Confirmed (${confirmedCount})` },
                        { id: "PENDING", label: `Pending (${pendingCount})` },
                        { id: "ALTERNATE", label: `Alternates (${alternateCount})` },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "1px solid",
                          borderColor: statusFilter === f.id ? "var(--primary)" : "var(--border-color)",
                          backgroundColor:
                            statusFilter === f.id ? "rgba(236, 72, 153, 0.12)" : "transparent",
                          color: statusFilter === f.id ? "var(--primary)" : "var(--text-secondary)",
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Programs Table */}
              {filteredPrograms.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                  No programs match the selected category and filter.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "separate",
                      borderSpacing: "0 8px",
                      textAlign: "left",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        <th style={{ padding: "10px 14px", width: "26%" }}>Program</th>
                        <th style={{ padding: "10px 14px", width: "34%" }}>Zonal Results (Top 3)</th>
                        <th style={{ padding: "10px 14px", width: "24%" }}>Confirmed to State</th>
                        <th style={{ padding: "10px 14px", width: "16%", textAlign: "right" }}>
                          Selection / Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrograms.map(
                        ({ masterProg, zoneResults, isGroup, promotedResult, isConfirmed, isAlternate }) => {
                          return (
                            <tr
                              key={masterProg.id}
                              style={{
                                backgroundColor: isConfirmed
                                  ? "rgba(255, 255, 255, 0.02)"
                                  : "rgba(245, 158, 11, 0.03)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "10px",
                              }}
                            >
                              {/* 1. Program Details */}
                              <td style={{ padding: "14px", verticalAlign: "top" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                  {masterProg.programCode && (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "2px 6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        borderRadius: "4px",
                                        backgroundColor: "var(--primary)",
                                        color: "#ffffff",
                                      }}
                                    >
                                      #{masterProg.programCode}
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                                    {masterProg.name}
                                  </span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: "rgba(255,255,255,0.06)",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {masterProg.stageType}
                                  </span>
                                  {masterProg.category && (
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: "rgba(99, 102, 241, 0.12)",
                                        color: "#818cf8",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {masterProg.category.name}
                                    </span>
                                  )}
                                  {isGroup && (
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: "rgba(168, 85, 247, 0.12)",
                                        color: "#c084fc",
                                        fontWeight: 600,
                                      }}
                                    >
                                      👥 GROUP TEAM
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 2. Published Results (Top 3) */}
                              <td style={{ padding: "14px", verticalAlign: "top" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {zoneResults.map((r: any) => {
                                    const isSelected = promotedResult?.id === r.id;
                                    const rankBadgeColor =
                                      r.rank === 1 ? "#eab308" : r.rank === 2 ? "#94a3b8" : "#d97706";
                                    const rankBadgeBg =
                                      r.rank === 1
                                        ? "rgba(234, 179, 8, 0.15)"
                                        : r.rank === 2
                                        ? "rgba(148, 163, 184, 0.15)"
                                        : "rgba(217, 119, 6, 0.15)";

                                    const isTeamResult = isGroup || Boolean(r.teamId && !r.candidateId);
                                    const currentTeamId = r.teamId || r.candidate?.teamId;
                                    const currentTeamName = r.team?.name || r.candidate?.team?.name;

                                    return (
                                      <div
                                        key={r.id}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          padding: "6px 10px",
                                          borderRadius: "8px",
                                          backgroundColor: isSelected
                                            ? "rgba(16, 185, 129, 0.1)"
                                            : "rgba(255, 255, 255, 0.03)",
                                          border: isSelected
                                            ? "1px solid rgba(16, 185, 129, 0.4)"
                                            : "1px solid transparent",
                                        }}
                                      >
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                          <span
                                            style={{
                                              fontSize: "0.7rem",
                                              fontWeight: 800,
                                              padding: "2px 6px",
                                              borderRadius: "4px",
                                              backgroundColor: rankBadgeBg,
                                              color: rankBadgeColor,
                                            }}
                                          >
                                            {r.rank === 1 ? "1st" : r.rank === 2 ? "2nd" : "3rd"}
                                          </span>
                                          <div style={{ minWidth: 0 }}>
                                            <div
                                              style={{
                                                fontWeight: isSelected ? 700 : 500,
                                                fontSize: "0.85rem",
                                                color: isSelected ? "var(--success)" : "var(--text-primary)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                              }}
                                            >
                                              <span>{r.candidate?.name || r.team?.name}</span>
                                              {r.candidate?.chestNumber && (
                                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                  (#{r.candidate.chestNumber})
                                                </span>
                                              )}
                                              {/* Button to view photos for group/general program */}
                                              {isTeamResult && currentTeamId && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    openTeamMembers(
                                                      masterProg,
                                                      currentTeamId,
                                                      currentTeamName,
                                                      r.rank
                                                    )
                                                  }
                                                  style={{
                                                    padding: "1px 6px",
                                                    fontSize: "0.68rem",
                                                    fontWeight: 700,
                                                    borderRadius: "4px",
                                                    backgroundColor: "rgba(168, 85, 247, 0.15)",
                                                    color: "#c084fc",
                                                    border: "1px solid rgba(168, 85, 247, 0.3)",
                                                    cursor: "pointer",
                                                  }}
                                                  title="Click to view participating student members & photos"
                                                >
                                                  👥 View Photos
                                                </button>
                                              )}
                                            </div>
                                            <div
                                              style={{
                                                fontSize: "0.75rem",
                                                color: "var(--text-muted)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                              }}
                                            >
                                              {r.candidate?.team?.name || r.team?.name}
                                            </div>
                                          </div>
                                        </div>

                                        {isSelected && (
                                          <span
                                            style={{
                                              fontSize: "0.7rem",
                                              fontWeight: 700,
                                              color: "var(--success)",
                                              backgroundColor: "rgba(16, 185, 129, 0.15)",
                                              padding: "2px 6px",
                                              borderRadius: "4px",
                                              marginLeft: "6px",
                                            }}
                                          >
                                            ✓ Active
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* 3. Confirmed to State */}
                              <td style={{ padding: "14px", verticalAlign: "top" }}>
                                {promotedResult ? (
                                  <div
                                    style={{
                                      padding: "8px 12px",
                                      borderRadius: "8px",
                                      backgroundColor: isAlternate
                                        ? "rgba(245, 158, 11, 0.1)"
                                        : "rgba(16, 185, 129, 0.1)",
                                      border: `1px solid ${
                                        isAlternate ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"
                                      }`,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "0.9rem",
                                        color: isAlternate ? "#f59e0b" : "var(--success)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <span>✓</span>
                                      <span>{promotedResult.candidate?.name || promotedResult.team?.name}</span>
                                      {/* View photos button on confirmed column */}
                                      {isGroup && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openTeamMembers(
                                              masterProg,
                                              promotedResult.teamId || promotedResult.candidate?.teamId,
                                              promotedResult.team?.name || promotedResult.candidate?.team?.name,
                                              promotedResult.rank
                                            )
                                          }
                                          style={{
                                            padding: "1px 6px",
                                            fontSize: "0.68rem",
                                            fontWeight: 700,
                                            borderRadius: "4px",
                                            backgroundColor: "rgba(16, 185, 129, 0.2)",
                                            color: "var(--success)",
                                            border: "1px solid rgba(16, 185, 129, 0.4)",
                                            cursor: "pointer",
                                          }}
                                        >
                                          👥 View Team Photos
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                      {promotedResult.candidate?.chestNumber && (
                                        <strong>#{promotedResult.candidate.chestNumber} • </strong>
                                      )}
                                      {promotedResult.candidate?.team?.name || promotedResult.team?.name}
                                    </div>
                                    {isAlternate && (
                                      <div
                                        style={{
                                          marginTop: "6px",
                                          fontSize: "0.7rem",
                                          fontWeight: 700,
                                          color: "#d97706",
                                          display: "inline-block",
                                          padding: "2px 6px",
                                          borderRadius: "4px",
                                          backgroundColor: "rgba(217, 119, 6, 0.15)",
                                        }}
                                      >
                                        ⚠️ Alternate Selection (Rank {promotedResult.rank})
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      padding: "8px 12px",
                                      borderRadius: "8px",
                                      backgroundColor: "rgba(245, 158, 11, 0.08)",
                                      border: "1px dashed rgba(245, 158, 11, 0.3)",
                                      color: "var(--warning)",
                                      fontSize: "0.85rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    ⏳ Pending Confirmation
                                  </div>
                                )}
                              </td>

                              {/* 4. Action / Switch Selection */}
                              <td style={{ padding: "14px", verticalAlign: "top", textAlign: "right" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                                  {zoneResults.map((r: any) => {
                                    const isSelected = promotedResult?.id === r.id;
                                    const isLoading = loadingResultId === r.id;

                                    if (isSelected) {
                                      return (
                                        <div
                                          key={r.id}
                                          style={{
                                            padding: "4px 10px",
                                            borderRadius: "6px",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                                            color: "var(--success)",
                                            border: "1px solid rgba(16, 185, 129, 0.4)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          <span>✓</span>
                                          <span>Confirmed (Rank {r.rank})</span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <button
                                        key={r.id}
                                        type="button"
                                        disabled={Boolean(
                                          loadingResultId || bulkLoadingZoneId || (isLocked && isZoneAdmin)
                                        )}
                                        onClick={() => handlePromote(r, masterProg)}
                                        className="btn"
                                        style={{
                                          padding: "4px 10px",
                                          fontSize: "0.75rem",
                                          fontWeight: 600,
                                          borderRadius: "6px",
                                          cursor:
                                            loadingResultId || bulkLoadingZoneId || (isLocked && isZoneAdmin)
                                              ? "not-allowed"
                                              : "pointer",
                                          backgroundColor:
                                            r.rank === 1
                                              ? "var(--primary)"
                                              : "rgba(245, 158, 11, 0.12)",
                                          borderColor: r.rank === 1 ? "var(--primary)" : "#f59e0b",
                                          color: r.rank === 1 ? "#ffffff" : "#f59e0b",
                                          border: "1px solid",
                                        }}
                                      >
                                        {isLoading
                                          ? "Selecting..."
                                          : r.rank === 1
                                          ? "Select Rank 1"
                                          : `Select Rank ${r.rank} (Alternate)`}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
