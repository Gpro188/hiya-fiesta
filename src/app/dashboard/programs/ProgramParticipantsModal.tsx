"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { getProgramParticipants } from "./actions";

interface ParticipantItem {
  assignmentId: string;
  candidateId: string;
  name: string;
  chestNumber: string | null;
  uid: string | null;
  photo: string | null;
  categoryName: string;
  teamName: string;
  institutionCode: string;
  institutionName: string;
  institutionPlace: string;
  zoneName: string;
  zoneCode: string;
  isApproved: boolean;
  replacedFromChest: string | null;
  replacementNote: string | null;
  hasIssue: boolean;
}

interface ModalProps {
  program: {
    id: string;
    name: string;
    programCode: string | null;
    type: string;
    stageType?: string | null;
    category?: { name: string } | null;
  };
  onClose: () => void;
  zoneId?: string;
}

export default function ProgramParticipantsModal({ program, onClose, zoneId }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    withChestNumber: 0,
    missingChestNumber: 0,
    missingPhoto: 0,
    missingUid: 0,
    institutionsCount: 0,
  });
  const [zoneTitle, setZoneTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "ISSUES" | "NO_CHEST" | "NO_PHOTO">("ALL");

  useEffect(() => {
    setMounted(true);
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      const res = await getProgramParticipants(program.id, zoneId);
      if (isCancelled) return;

      if (res.success && res.participants) {
        setParticipants(res.participants);
        if (res.stats) setStats(res.stats);
        if (res.program?.zoneTitle) setZoneTitle(res.program.zoneTitle);
      } else {
        setError(res.error || "Failed to load participants.");
      }
      setLoading(false);
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [program.id, zoneId]);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (filterMode === "ISSUES" && !p.hasIssue) return false;
      if (filterMode === "NO_CHEST" && p.chestNumber) return false;
      if (filterMode === "NO_PHOTO" && p.photo) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.chestNumber && p.chestNumber.toLowerCase().includes(q)) ||
        (p.uid && p.uid.toLowerCase().includes(q)) ||
        p.institutionName.toLowerCase().includes(q) ||
        p.institutionCode.toLowerCase().includes(q) ||
        p.institutionPlace.toLowerCase().includes(q)
      );
    });
  }, [participants, filterMode, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--card-bg, #ffffff)",
          overflow: "hidden",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
              {program.programCode && (
                <span
                  style={{
                    backgroundColor: "#8E0033",
                    color: "#ffffff",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                  }}
                >
                  {program.programCode}
                </span>
              )}
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                {program.name}
              </h2>

              <span
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  backgroundColor:
                    program.stageType === "OFF_STAGE" ? "rgba(14, 165, 233, 0.15)" : "rgba(236, 72, 153, 0.15)",
                  color: program.stageType === "OFF_STAGE" ? "#0284c7" : "#db2777",
                  border: `1px solid ${program.stageType === "OFF_STAGE" ? "#0284c7" : "#db2777"}`,
                }}
              >
                {program.stageType === "OFF_STAGE" ? "🎨 OFF STAGE" : "🎭 ON STAGE"}
              </span>

              {program.category && (
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "#059669",
                    border: "1px solid #059669",
                  }}
                >
                  {program.category.name}
                </span>
              )}

              {zoneTitle && (
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    border: "1px solid #f59e0b",
                  }}
                >
                  📍 {zoneTitle}
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-muted)" }}>
              Registered candidates verification roster. Inspect chest numbers, photos, and institutional submissions for issues.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.6rem",
              lineHeight: 1,
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px 8px",
              borderRadius: "8px",
            }}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Stats Summary Bar */}
        {!loading && !error && (
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "#ffffff",
              borderBottom: "1px solid var(--border-color)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "10px",
            }}
          >
            <div
              style={{
                backgroundColor: "#f1f5f9",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Total Candidates
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>{stats.total}</div>
            </div>

            <div
              style={{
                backgroundColor: "#f0fdf4",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                With Chest No
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#15803d" }}>
                {stats.withChestNumber}
              </div>
            </div>

            <div
              style={{
                backgroundColor: stats.missingChestNumber > 0 ? "#fef2f2" : "#f8fafc",
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${stats.missingChestNumber > 0 ? "#fecaca" : "#e2e8f0"}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  color: stats.missingChestNumber > 0 ? "#b91c1c" : "#64748b",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Missing Chest No
              </div>
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: stats.missingChestNumber > 0 ? "#dc2626" : "#64748b",
                }}
              >
                {stats.missingChestNumber > 0 ? `⚠️ ${stats.missingChestNumber}` : "0"}
              </div>
            </div>

            <div
              style={{
                backgroundColor: stats.missingPhoto > 0 ? "#fffbeb" : "#f8fafc",
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${stats.missingPhoto > 0 ? "#fde68a" : "#e2e8f0"}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  color: stats.missingPhoto > 0 ? "#b45309" : "#64748b",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Missing Photo
              </div>
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: stats.missingPhoto > 0 ? "#d97706" : "#64748b",
                }}
              >
                {stats.missingPhoto > 0 ? `📷 ${stats.missingPhoto}` : "0"}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Colleges
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>
                {stats.institutionsCount}
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        {!loading && !error && participants.length > 0 && (
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setFilterMode("ALL")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: filterMode === "ALL" ? "1px solid #8E0033" : "1px solid #cbd5e1",
                  backgroundColor: filterMode === "ALL" ? "#8E0033" : "#ffffff",
                  color: filterMode === "ALL" ? "#ffffff" : "#475569",
                  cursor: "pointer",
                }}
              >
                All ({participants.length})
              </button>

              {(stats.missingChestNumber > 0 || stats.missingPhoto > 0) && (
                <button
                  type="button"
                  onClick={() => setFilterMode("ISSUES")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    border: filterMode === "ISSUES" ? "1px solid #dc2626" : "1px solid #fca5a5",
                    backgroundColor: filterMode === "ISSUES" ? "#dc2626" : "#fef2f2",
                    color: filterMode === "ISSUES" ? "#ffffff" : "#dc2626",
                    cursor: "pointer",
                  }}
                >
                  ⚠️ Registration Issues ({stats.missingChestNumber + stats.missingPhoto})
                </button>
              )}

              {stats.missingChestNumber > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode("NO_CHEST")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    border: filterMode === "NO_CHEST" ? "1px solid #dc2626" : "1px solid #cbd5e1",
                    backgroundColor: filterMode === "NO_CHEST" ? "#dc2626" : "#ffffff",
                    color: filterMode === "NO_CHEST" ? "#ffffff" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  No Chest No ({stats.missingChestNumber})
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: "1 1 240px", maxWidth: "340px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, chest #, college..."
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  fontSize: "0.82rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  backgroundColor: "#ffffff",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body / Candidates List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", minHeight: "260px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "3px solid #f1f5f9",
                  borderTopColor: "#8E0033",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 600 }}>Loading registered candidates...</span>
            </div>
          ) : error ? (
            <div
              style={{
                padding: "20px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                color: "#b91c1c",
                textAlign: "center",
              }}
            >
              <p style={{ fontWeight: 700, margin: "0 0 6px 0" }}>⚠️ Error Loading Participants</p>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>{error}</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 16px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <span style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📋</span>
              <p style={{ fontWeight: 700, fontSize: "1rem", margin: "0 0 6px 0", color: "#1e293b" }}>
                {searchQuery || filterMode !== "ALL" ? "No candidates match the filter" : "No Registered Candidates Found"}
              </p>
              <p style={{ fontSize: "0.85rem", margin: 0, maxWidth: "420px" }}>
                {searchQuery || filterMode !== "ALL"
                  ? "Try adjusting your search terms or clearing the filter."
                  : "No students have been assigned to this program yet by institutions from this zone."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredParticipants.map((candidate, idx) => {
                return (
                  <div
                    key={candidate.assignmentId || candidate.candidateId}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: candidate.hasIssue ? "1.5px solid #fecaca" : "1px solid #e2e8f0",
                      backgroundColor: candidate.hasIssue ? "#fffbfb" : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Left: Avatar + Details */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          flexShrink: 0,
                          backgroundColor: "#f1f5f9",
                          border: candidate.photo ? "1px solid #cbd5e1" : "1.5px dashed #f59e0b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          color: "#64748b",
                        }}
                      >
                        {candidate.photo ? (
                          <img
                            src={candidate.photo}
                            alt={candidate.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span>📷</span>
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "2px" }}>
                          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                            {idx + 1}. {candidate.name}
                          </span>

                          {candidate.uid && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                              }}
                            >
                              UID: {candidate.uid}
                            </span>
                          )}

                          {candidate.replacedFromChest && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                              }}
                              title={candidate.replacementNote || "Replaced candidate"}
                            >
                              🔄 Replaced from #{candidate.replacedFromChest}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: "0.82rem", color: "#475569", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "#8E0033" }}>
                            [{candidate.institutionCode}]
                          </span>
                          <span>{candidate.institutionName}</span>
                          {candidate.institutionPlace && (
                            <span style={{ color: "#94a3b8" }}>({candidate.institutionPlace})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Chest Number + Issue Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                      {candidate.chestNumber ? (
                        <div
                          style={{
                            padding: "4px 12px",
                            borderRadius: "8px",
                            backgroundColor: "#8E0033",
                            color: "#ffffff",
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            boxShadow: "0 2px 4px rgba(142,0,51,0.2)",
                            textAlign: "center",
                          }}
                        >
                          #{candidate.chestNumber}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "4px 10px",
                            borderRadius: "8px",
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            border: "1.5px solid #fecaca",
                            fontSize: "0.76rem",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          ⚠️ Missing Chest No
                        </div>
                      )}

                      {!candidate.photo && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#fffbeb",
                            color: "#b45309",
                            border: "1px solid #fde68a",
                          }}
                          title="Candidate has no uploaded photo"
                        >
                          📷 No Photo
                        </span>
                      )}
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
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Showing <strong>{filteredParticipants.length}</strong> of <strong>{participants.length}</strong> candidates
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || participants.length === 0}
              className="btn btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0.45rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              <span>🖨️</span> Print Roster
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{
                padding: "0.45rem 1.25rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                backgroundColor: "#1e293b",
                color: "#ffffff",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
