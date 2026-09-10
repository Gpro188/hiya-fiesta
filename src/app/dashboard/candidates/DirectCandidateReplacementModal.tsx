"use client";

import { useState, useEffect } from "react";
import {
  searchCandidatesForReplacement,
  getReplacementCandidateDetails,
  directReplaceCandidate,
  directProgramWiseCandidateReplacement,
  ProgramAssignmentReplacementItem,
} from "./actions";
import ImageUpload from "@/app/components/ImageUpload";

export interface ZoneOption {
  id: string;
  name: string;
  code: string;
}

interface ProgramConfigItem {
  action: "PRIMARY_CANDIDATE" | "DIRECTORY_STUDENT" | "EXISTING_CANDIDATE" | "MANUAL_STUDENT";
  studentUid?: string;
  studentName?: string;
  studentPhoto?: string;
  existingCandidateId?: string;
  searchFilter?: string;
}

export default function DirectCandidateReplacementModal({
  initialCandidateId,
  initialZoneId = "ALL",
  zones = [],
  onClose,
  onReplaced,
}: {
  initialCandidateId?: string | null;
  initialZoneId?: string;
  zones?: ZoneOption[];
  onClose: () => void;
  onReplaced?: () => void;
}) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialZoneId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Selected candidate state
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(initialCandidateId || null);
  const [candidateDetails, setCandidateDetails] = useState<any | null>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [teamCandidates, setTeamCandidates] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Replacement Strategy: all programs to single candidate vs program-wise
  const [assignmentStrategy, setAssignmentStrategy] = useState<"ALL_TOGETHER" | "PROGRAM_WISE">("PROGRAM_WISE");
  const [programConfigs, setProgramConfigs] = useState<Record<string, ProgramConfigItem>>({});

  // Primary Replacement Form State
  const [replacementMode, setReplacementMode] = useState<"DIRECTORY" | "MANUAL">("DIRECTORY");
  const [selectedStudentUid, setSelectedStudentUid] = useState<string>("");
  const [replacementName, setReplacementName] = useState<string>("");
  const [replacementPhoto, setReplacementPhoto] = useState<string>("");
  const [reason, setReason] = useState<string>("Medical dropout replacement approved by Super Admin");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Search when query changes
  useEffect(() => {
    if (activeCandidateId) return;

    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 1 || selectedZoneId !== "ALL") {
        setSearching(true);
        const res = await searchCandidatesForReplacement(searchQuery, selectedZoneId);
        if (res.success) {
          setSearchResults(res.candidates || []);
        }
        setSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedZoneId, activeCandidateId]);

  // Load candidate details when activeCandidateId is set
  useEffect(() => {
    if (!activeCandidateId) {
      setCandidateDetails(null);
      setAvailableStudents([]);
      setTeamCandidates([]);
      setProgramConfigs({});
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setLoadingDetails(true);
      setError(null);
      const res = await getReplacementCandidateDetails(activeCandidateId);
      if (isMounted) {
        if (res.success && res.candidate) {
          setCandidateDetails(res.candidate);
          setAvailableStudents(res.availableStudents || []);
          setTeamCandidates(res.teamCandidates || []);
          setReplacementPhoto(res.candidate.photo || res.candidate.photoUrl || "");

          const progs = res.candidate.programs || [];
          if (progs.length > 1) {
            setAssignmentStrategy("PROGRAM_WISE");
          } else {
            setAssignmentStrategy("ALL_TOGETHER");
          }

          const initConfigs: Record<string, ProgramConfigItem> = {};
          progs.forEach((p: any) => {
            initConfigs[p.id] = {
              action: "PRIMARY_CANDIDATE",
              studentUid: "",
              studentName: "",
              studentPhoto: "",
              existingCandidateId: "",
              searchFilter: "",
            };
          });
          setProgramConfigs(initConfigs);

          if (res.availableStudents && res.availableStudents.length > 0) {
            setReplacementMode("DIRECTORY");
          } else {
            setReplacementMode("MANUAL");
          }
        } else {
          setError(res.error || "Failed to load candidate details.");
        }
        setLoadingDetails(false);
      }
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [activeCandidateId]);

  // Handle student selection from directory
  const handleSelectStudent = (student: any) => {
    setSelectedStudentUid(student.uid);
    setReplacementName(student.name);
  };

  const handleProgramConfigChange = (programAssignmentId: string, updates: Partial<ProgramConfigItem>) => {
    setProgramConfigs((prev) => ({
      ...prev,
      [programAssignmentId]: {
        ...(prev[programAssignmentId] || { action: "PRIMARY_CANDIDATE" }),
        ...updates,
      },
    }));
  };

  const handleExecuteReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidateId || !candidateDetails) return;

    if (!replacementName.trim()) {
      setError("Primary replacement candidate name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const progs = candidateDetails.programs || [];

    if (assignmentStrategy === "PROGRAM_WISE" && progs.length > 1) {
      // Validate program-wise configs
      const programAssignmentsPayload: ProgramAssignmentReplacementItem[] = [];

      for (const p of progs) {
        const cfg = programConfigs[p.id] || { action: "PRIMARY_CANDIDATE" };
        if (cfg.action === "PRIMARY_CANDIDATE") {
          programAssignmentsPayload.push({
            programAssignmentId: p.id,
            programId: p.program.id,
            programName: p.program.name,
            action: "PRIMARY_CANDIDATE",
          });
        } else if (cfg.action === "EXISTING_CANDIDATE") {
          if (!cfg.existingCandidateId) {
            setError(`Please select an existing candidate for program "${p.program.name}".`);
            setSubmitting(false);
            return;
          }
          programAssignmentsPayload.push({
            programAssignmentId: p.id,
            programId: p.program.id,
            programName: p.program.name,
            action: "EXISTING_CANDIDATE",
            existingCandidateId: cfg.existingCandidateId,
          });
        } else {
          const sName = (cfg.studentName || "").trim();
          if (!sName) {
            setError(`Please specify contestant name for program "${p.program.name}".`);
            setSubmitting(false);
            return;
          }
          programAssignmentsPayload.push({
            programAssignmentId: p.id,
            programId: p.program.id,
            programName: p.program.name,
            action: "NEW_OR_DIRECTORY_STUDENT",
            studentName: sName,
            studentUid: cfg.studentUid ? cfg.studentUid.trim().toUpperCase() : undefined,
            studentPhoto: cfg.studentPhoto || undefined,
          });
        }
      }

      const res = await directProgramWiseCandidateReplacement({
        candidateId: activeCandidateId,
        primaryReplacement: {
          studentName: replacementName,
          studentUid: selectedStudentUid || undefined,
          studentPhoto: replacementPhoto || undefined,
        },
        programAssignments: programAssignmentsPayload,
        reason,
      });

      if (res.success) {
        alert(
          `✅ Program-Wise Replacement Successful!\n\nReplaced: ${res.oldName}\nChest #${res.originalChestNumber || "None"}\nTeam: ${res.teamName} (${res.zoneName})\n\nProgram Breakdown:\n${(res.changesSummary || []).join("\n")}`
        );
        if (onReplaced) onReplaced();
        onClose();
        window.location.reload();
      } else {
        setError(res.error || "Failed to execute program-wise replacement.");
        setSubmitting(false);
      }
    } else {
      // Single replacement for all programs
      const res = await directReplaceCandidate({
        candidateId: activeCandidateId,
        newStudentUid: selectedStudentUid || undefined,
        newName: replacementName,
        newPhoto: replacementPhoto || undefined,
        reason,
      });

      if (res.success) {
        alert(`✅ Candidate replaced successfully!\n\n${res.oldName} ➔ ${res.newName}\nChest Number: ${res.chestNumber || "None"}\nTeam: ${res.teamName}\nZone: ${res.zoneName}`);
        if (onReplaced) onReplaced();
        onClose();
        window.location.reload();
      } else {
        setError(res.error || "Failed to replace candidate.");
        setSubmitting(false);
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#111827",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: activeCandidateId ? "720px" : "640px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          color: "#fff",
          transition: "max-width 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.4rem" }}>🔄</span>
              <h3 style={{ margin: 0, color: "#f59e0b", fontSize: "1.2rem", fontWeight: 800 }}>
                Super Admin Direct Candidate Replacement
              </h3>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#9ca3af" }}>
              Directly replace or swap any candidate across any regional zone while keeping chest numbers and programs intact.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              fontSize: "1.4rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "1rem",
              color: "#fca5a5",
              fontSize: "0.85rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Search & Pick Candidate (if not pre-selected) */}
        {!activeCandidateId ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: zones.length > 0 ? "1fr 2fr" : "1fr", gap: "10px", marginBottom: "1rem" }}>
              {zones.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#9ca3af", marginBottom: "4px" }}>
                    Filter by Zone:
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      backgroundColor: "#1f2937",
                      border: "1px solid #4b5563",
                      color: "#fff",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    <option value="ALL">🌐 All Zones</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#9ca3af", marginBottom: "4px" }}>
                  Search Candidate to Replace:
                </label>
                <input
                  type="text"
                  placeholder="Enter Chest No (e.g. 101), Candidate Name, UID, or College..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: "#1f2937",
                    border: "1.5px solid #3b82f6",
                    color: "#fff",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            </div>

            {/* Search Results List */}
            <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {searching ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                  Searching candidates...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280", fontSize: "0.88rem" }}>
                  {searchQuery ? "No candidates matching your search." : "Type a chest number, candidate name, or college name to begin search."}
                </div>
              ) : (
                searchResults.map((c) => {
                  const photoSrc = c.photo || c.photoUrl;
                  const zoneName = c.team?.event?.zone?.name || "";
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveCandidateId(c.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
                        e.currentTarget.style.borderColor = "#3b82f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={c.name}
                            style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.2)" }}
                          />
                        ) : (
                          <div style={{ width: "38px", height: "38px", borderRadius: "50%", backgroundColor: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                            👤
                          </div>
                        )}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 800, color: "#fff", fontSize: "0.92rem" }}>{c.name}</span>
                            {c.uid && <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "monospace" }}>({c.uid})</span>}
                            {c.chestNumber && (
                              <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                                #{c.chestNumber}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>🏛️ {c.team?.name}</span>
                            {zoneName && <span style={{ color: "#38bdf8", fontWeight: 600 }}>• {zoneName}</span>}
                            <span style={{ color: "#f472b6" }}>• {c.programs?.length || 0} programs</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "4px 12px", fontSize: "0.78rem", backgroundColor: "#f59e0b", borderColor: "#f59e0b", color: "#000", fontWeight: 700 }}
                      >
                        Select ➔
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* STEP 2: Candidate Details & Replacement Form */
          <div>
            {loadingDetails ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                Loading candidate and college directory...
              </div>
            ) : candidateDetails ? (
              <form onSubmit={handleExecuteReplacement} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {/* Back button */}
                {!initialCandidateId && (
                  <button
                    type="button"
                    onClick={() => { setActiveCandidateId(null); setCandidateDetails(null); }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38bdf8",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      alignSelf: "flex-start",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ← Search another candidate
                  </button>
                )}

                {/* Candidate Overview Card */}
                <div
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.06)",
                    border: "1.5px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#ef4444", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🔴</span> CURRENT CANDIDATE BEING REPLACED:
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                    {candidateDetails.photo || candidateDetails.photoUrl ? (
                      <img
                        src={candidateDetails.photo || candidateDetails.photoUrl}
                        alt={candidateDetails.name}
                        style={{ width: "54px", height: "54px", borderRadius: "8px", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.2)" }}
                      />
                    ) : (
                      <div style={{ width: "54px", height: "54px", borderRadius: "8px", backgroundColor: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                        👤
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: "220px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>{candidateDetails.name}</span>
                        {candidateDetails.uid && <span style={{ fontSize: "0.8rem", color: "#9ca3af", fontFamily: "monospace" }}>UID: {candidateDetails.uid}</span>}
                        {candidateDetails.chestNumber && (
                          <span style={{ fontSize: "0.82rem", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                            Chest #{candidateDetails.chestNumber}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "3px" }}>
                        🏛️ {candidateDetails.team?.name} &bull; Zone: <strong style={{ color: "#38bdf8" }}>{candidateDetails.team?.event?.zone?.name || "N/A"}</strong>
                      </div>

                      {/* Assigned Programs */}
                      <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {candidateDetails.programs?.length > 0 ? (
                          candidateDetails.programs.map((p: any) => (
                            <span
                              key={p.id}
                              style={{
                                fontSize: "0.72rem",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                backgroundColor: p.program?.stageType === "OFF_STAGE" ? "rgba(14, 165, 233, 0.15)" : "rgba(236, 72, 153, 0.15)",
                                color: p.program?.stageType === "OFF_STAGE" ? "#38bdf8" : "#f472b6",
                                border: `1px solid ${p.program?.stageType === "OFF_STAGE" ? "rgba(14, 165, 233, 0.3)" : "rgba(236, 72, 153, 0.3)"}`,
                              }}
                            >
                              {p.program?.stageType === "OFF_STAGE" ? "🎨" : "🎭"} {p.program?.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "0.74rem", color: "#6b7280" }}>No program assignments yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Program Strategy Selector */}
                {candidateDetails.programs?.length > 1 && (
                  <div style={{ backgroundColor: "rgba(31, 41, 55, 0.6)", borderRadius: "10px", padding: "10px 12px", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#9ca3af", marginBottom: "6px", textTransform: "uppercase" }}>
                      Replacement Strategy for Multi-Program Candidate:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setAssignmentStrategy("PROGRAM_WISE")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          border: assignmentStrategy === "PROGRAM_WISE" ? "1.5px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
                          backgroundColor: assignmentStrategy === "PROGRAM_WISE" ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          color: assignmentStrategy === "PROGRAM_WISE" ? "#38bdf8" : "#9ca3af",
                          textAlign: "left",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>📋</span> <strong>Program-Wise Assignment</strong>
                          <span style={{ fontSize: "0.62rem", padding: "1px 5px", borderRadius: "4px", backgroundColor: "#0284c7", color: "#fff" }}>Recommended</span>
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          Different students contest different programs
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignmentStrategy("ALL_TOGETHER")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          border: assignmentStrategy === "ALL_TOGETHER" ? "1.5px solid #10b981" : "1px solid rgba(255,255,255,0.08)",
                          backgroundColor: assignmentStrategy === "ALL_TOGETHER" ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          color: assignmentStrategy === "ALL_TOGETHER" ? "#34d399" : "#9ca3af",
                          textAlign: "left",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>👥</span> <strong>Single Candidate</strong>
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                          Same student takes over all programs (Chest #{candidateDetails.chestNumber || "..."})
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Replacement Student */}
                <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🟢</span> {assignmentStrategy === "PROGRAM_WISE" && candidateDetails.programs?.length > 1
                        ? `PRIMARY REPLACEMENT STUDENT (Keeps Chest #${candidateDetails.chestNumber || "None"}):`
                        : `SELECT REPLACEMENT STUDENT (Takes Chest #${candidateDetails.chestNumber || "None"}):`}
                    </label>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setReplacementMode("DIRECTORY")}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          border: "none",
                          backgroundColor: replacementMode === "DIRECTORY" ? "#10b981" : "rgba(255,255,255,0.06)",
                          color: replacementMode === "DIRECTORY" ? "#000" : "#9ca3af",
                        }}
                      >
                        🏛️ College Directory ({availableStudents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplacementMode("MANUAL")}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          border: "none",
                          backgroundColor: replacementMode === "MANUAL" ? "#10b981" : "rgba(255,255,255,0.06)",
                          color: replacementMode === "MANUAL" ? "#000" : "#9ca3af",
                        }}
                      >
                        ✏️ Manual Entry
                      </button>
                    </div>
                  </div>

                  {/* Mode A: From College Directory */}
                  {replacementMode === "DIRECTORY" && (
                    <div style={{ backgroundColor: "rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
                      {availableStudents.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "0.75rem", color: "#9ca3af", fontSize: "0.8rem" }}>
                          No unassigned students in this college's directory. Use Manual Entry.
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            placeholder="Filter college students by name or UID..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#1f2937",
                              border: "1px solid #4b5563",
                              color: "#fff",
                              fontSize: "0.82rem",
                              marginBottom: "6px",
                            }}
                          />

                          <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {availableStudents
                              .filter((s) => {
                                if (!studentSearch) return true;
                                const q = studentSearch.toLowerCase();
                                return s.name.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q);
                              })
                              .map((s) => {
                                const isSelected = selectedStudentUid === s.uid;
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => handleSelectStudent(s)}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      backgroundColor: isSelected ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.02)",
                                      border: `1px solid ${isSelected ? "#10b981" : "rgba(255, 255, 255, 0.06)"}`,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <div>
                                      <strong style={{ fontSize: "0.84rem", color: isSelected ? "#34d399" : "#fff" }}>{s.name}</strong>
                                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "6px", fontFamily: "monospace" }}>({s.uid})</span>
                                      {s.stream && <span style={{ fontSize: "0.7rem", color: "#6b7280", marginLeft: "6px" }}>&bull; {s.stream}</span>}
                                    </div>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "#10b981" : "#6b7280" }}>
                                      {isSelected ? "✓ Selected" : "Select"}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Form fields for Replacement Name & UID */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", marginBottom: "4px" }}>
                        Replacement Student Full Name *
                      </label>
                      <input
                        type="text"
                        value={replacementName}
                        onChange={(e) => setReplacementName(e.target.value)}
                        placeholder="e.g. Muhammed Bilal"
                        required
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#1f2937",
                          border: "1.5px solid #10b981",
                          color: "#fff",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", marginBottom: "4px" }}>
                        Student UID (Optional)
                      </label>
                      <input
                        type="text"
                        value={selectedStudentUid}
                        onChange={(e) => setSelectedStudentUid(e.target.value)}
                        placeholder="e.g. U1045"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#1f2937",
                          border: "1px solid #4b5563",
                          color: "#fff",
                          fontSize: "0.85rem",
                          fontFamily: "monospace",
                        }}
                      />
                    </div>
                  </div>

                  {/* Photo Upload (Optional) */}
                  <div style={{ marginTop: "10px" }}>
                    <ImageUpload
                      label="Candidate Photo (Optional - upload to replace image on ID card):"
                      folder="candidates"
                      initialUrl={replacementPhoto}
                      maxSizeKb={800}
                      onUploadComplete={(url) => setReplacementPhoto(url)}
                    />
                  </div>
                </div>

                {/* Section 2: Program-Wise Assignment Cards (Only if PROGRAM_WISE and >1 programs) */}
                {assignmentStrategy === "PROGRAM_WISE" && (candidateDetails.programs?.length || 0) > 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📋</span> PROGRAM-WISE CONTESTANT ASSIGNMENT:
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                        Assign who contests each program below
                      </span>
                    </div>

                    {candidateDetails.programs.map((p: any) => {
                      const cfg = programConfigs[p.id] || { action: "PRIMARY_CANDIDATE" };
                      const isOffStage = p.program?.stageType === "OFF_STAGE";

                      return (
                        <div
                          key={p.id}
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.03)",
                            border: `1.5px solid ${cfg.action === "PRIMARY_CANDIDATE" ? "#38bdf8" : "#a855f7"}`,
                            borderRadius: "10px",
                            padding: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {/* Program Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "1.1rem" }}>{isOffStage ? "🎨" : "🎭"}</span>
                              <div>
                                <strong style={{ fontSize: "0.88rem", color: "#fff" }}>{p.program?.name}</strong>
                                <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                                  Category: <span style={{ color: "#38bdf8" }}>{p.program?.category?.name || candidateDetails.category?.name || "General"}</span> &bull; Stage: <span style={{ color: isOffStage ? "#38bdf8" : "#f472b6" }}>{p.program?.stageType}</span>
                                </div>
                              </div>
                            </div>

                            {/* Contestant Mode Selector */}
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => handleProgramConfigChange(p.id, { action: "PRIMARY_CANDIDATE" })}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: "none",
                                  backgroundColor: cfg.action === "PRIMARY_CANDIDATE" ? "#38bdf8" : "rgba(255,255,255,0.06)",
                                  color: cfg.action === "PRIMARY_CANDIDATE" ? "#000" : "#9ca3af",
                                }}
                              >
                                👤 Primary Candidate
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProgramConfigChange(p.id, { action: "DIRECTORY_STUDENT" })}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: "none",
                                  backgroundColor: cfg.action === "DIRECTORY_STUDENT" ? "#a855f7" : "rgba(255,255,255,0.06)",
                                  color: cfg.action === "DIRECTORY_STUDENT" ? "#fff" : "#9ca3af",
                                }}
                              >
                                🏛️ College Directory Student
                              </button>
                              {teamCandidates.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleProgramConfigChange(p.id, { action: "EXISTING_CANDIDATE" })}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    border: "none",
                                    backgroundColor: cfg.action === "EXISTING_CANDIDATE" ? "#f59e0b" : "rgba(255,255,255,0.06)",
                                    color: cfg.action === "EXISTING_CANDIDATE" ? "#000" : "#9ca3af",
                                  }}
                                >
                                  👥 Team Candidate ({teamCandidates.length})
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleProgramConfigChange(p.id, { action: "MANUAL_STUDENT" })}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: "none",
                                  backgroundColor: cfg.action === "MANUAL_STUDENT" ? "#10b981" : "rgba(255,255,255,0.06)",
                                  color: cfg.action === "MANUAL_STUDENT" ? "#000" : "#9ca3af",
                                }}
                              >
                                ✏️ Manual Entry
                              </button>
                            </div>
                          </div>

                          {/* Action Details */}
                          {cfg.action === "PRIMARY_CANDIDATE" && (
                            <div style={{ backgroundColor: "rgba(56, 189, 248, 0.08)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.78rem", color: "#bae6fd" }}>
                              Contested by <strong>{replacementName || "[Primary Student]"}</strong> retaining <strong>Chest #{candidateDetails.chestNumber || "None"}</strong>.
                            </div>
                          )}

                          {cfg.action === "DIRECTORY_STUDENT" && (
                            <div style={{ backgroundColor: "rgba(168, 85, 247, 0.08)", padding: "8px 10px", borderRadius: "6px" }}>
                              <div style={{ fontSize: "0.75rem", color: "#d8b4fe", marginBottom: "6px" }}>
                                Select student from college directory (will be registered as a candidate and assigned a new chest number):
                              </div>
                              <input
                                type="text"
                                placeholder="Search college student for this program..."
                                value={cfg.searchFilter || ""}
                                onChange={(e) => handleProgramConfigChange(p.id, { searchFilter: e.target.value })}
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: "5px",
                                  backgroundColor: "#1f2937",
                                  border: "1px solid #4b5563",
                                  color: "#fff",
                                  fontSize: "0.78rem",
                                  marginBottom: "6px",
                                }}
                              />
                              <div style={{ maxHeight: "110px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "3px" }}>
                                {availableStudents
                                  .filter((s) => {
                                    if (s.uid === selectedStudentUid) return false; // don't pick primary student
                                    if (!cfg.searchFilter) return true;
                                    const q = (cfg.searchFilter || "").toLowerCase();
                                    return s.name.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q);
                                  })
                                  .map((s) => {
                                    const isSel = cfg.studentUid === s.uid;
                                    return (
                                      <div
                                        key={s.id}
                                        onClick={() => handleProgramConfigChange(p.id, {
                                          studentUid: s.uid,
                                          studentName: s.name,
                                          studentPhoto: s.photo || "",
                                        })}
                                        style={{
                                          padding: "5px 8px",
                                          borderRadius: "5px",
                                          backgroundColor: isSel ? "rgba(168, 85, 247, 0.25)" : "rgba(255, 255, 255, 0.02)",
                                          border: `1px solid ${isSel ? "#a855f7" : "rgba(255, 255, 255, 0.06)"}`,
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <span style={{ fontSize: "0.78rem", color: isSel ? "#e9d5ff" : "#fff" }}>
                                          <strong>{s.name}</strong> ({s.uid})
                                        </span>
                                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isSel ? "#c084fc" : "#6b7280" }}>
                                          {isSel ? "✓ Selected" : "Select"}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                              {cfg.studentName && (
                                <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#34d399" }}>
                                  ✓ Assigned: <strong>{cfg.studentName}</strong> ({cfg.studentUid}) &bull; <span style={{ color: "#f59e0b" }}>New chest number will be auto-allocated in {p.program?.category?.name || "category"}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {cfg.action === "EXISTING_CANDIDATE" && (
                            <div style={{ backgroundColor: "rgba(245, 158, 11, 0.08)", padding: "8px 10px", borderRadius: "6px" }}>
                              <label style={{ display: "block", fontSize: "0.75rem", color: "#fcd34d", marginBottom: "4px" }}>
                                Select existing candidate from this team:
                              </label>
                              <select
                                value={cfg.existingCandidateId || ""}
                                onChange={(e) => handleProgramConfigChange(p.id, { existingCandidateId: e.target.value })}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  backgroundColor: "#1f2937",
                                  border: "1px solid #f59e0b",
                                  color: "#fff",
                                  fontSize: "0.82rem",
                                }}
                              >
                                <option value="">-- Choose Candidate --</option>
                                {teamCandidates.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.chestNumber ? `(Chest #${c.chestNumber})` : ""} {c.uid ? `[${c.uid}]` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {cfg.action === "MANUAL_STUDENT" && (
                            <div style={{ backgroundColor: "rgba(16, 185, 129, 0.08)", padding: "8px 10px", borderRadius: "6px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "0.72rem", color: "#9ca3af", marginBottom: "2px" }}>
                                  Contestant Full Name *
                                </label>
                                <input
                                  type="text"
                                  placeholder="Full Name"
                                  value={cfg.studentName || ""}
                                  onChange={(e) => handleProgramConfigChange(p.id, { studentName: e.target.value })}
                                  style={{
                                    width: "100%",
                                    padding: "5px 8px",
                                    borderRadius: "5px",
                                    backgroundColor: "#1f2937",
                                    border: "1px solid #10b981",
                                    color: "#fff",
                                    fontSize: "0.8rem",
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: "0.72rem", color: "#9ca3af", marginBottom: "2px" }}>
                                  UID (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="UID"
                                  value={cfg.studentUid || ""}
                                  onChange={(e) => handleProgramConfigChange(p.id, { studentUid: e.target.value })}
                                  style={{
                                    width: "100%",
                                    padding: "5px 8px",
                                    borderRadius: "5px",
                                    backgroundColor: "#1f2937",
                                    border: "1px solid #4b5563",
                                    color: "#fff",
                                    fontSize: "0.8rem",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reason Field with Quick Tags */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#9ca3af" }}>
                      Official Reason for Replacement:
                    </label>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {["Medical Emergency", "Absent / Dropout", "Name Typo Correction"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setReason(tag)}
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#9ca3af",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                          }}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Medical emergency dropout replacement approved by Super Admin"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      backgroundColor: "#1f2937",
                      border: "1px solid #4b5563",
                      color: "#fff",
                      fontSize: "0.82rem",
                    }}
                  />
                </div>

                {/* Confirmation Summary Banner */}
                <div
                  style={{
                    backgroundColor: assignmentStrategy === "PROGRAM_WISE" && (candidateDetails.programs?.length || 0) > 1
                      ? "rgba(56, 189, 248, 0.08)"
                      : "rgba(16, 185, 129, 0.08)",
                    border: `1px solid ${
                      assignmentStrategy === "PROGRAM_WISE" && (candidateDetails.programs?.length || 0) > 1
                        ? "rgba(56, 189, 248, 0.3)"
                        : "rgba(16, 185, 129, 0.3)"
                    }`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "0.8rem",
                    color: assignmentStrategy === "PROGRAM_WISE" && (candidateDetails.programs?.length || 0) > 1
                      ? "#bae6fd"
                      : "#a7f3d0",
                  }}
                >
                  {assignmentStrategy === "PROGRAM_WISE" && (candidateDetails.programs?.length || 0) > 1 ? (
                    <div>
                      ⚡ <strong>Program-Wise Direct Replacement Effect:</strong>
                      <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div>
                          &bull; <strong>Chest #{candidateDetails.chestNumber || "None"}:</strong> assigned to primary student <strong>{replacementName || "[Primary Student]"}</strong>
                        </div>
                        {candidateDetails.programs.map((p: any) => {
                          const cfg = programConfigs[p.id] || { action: "PRIMARY_CANDIDATE" };
                          let targetLabel = replacementName || "[Primary Student]";
                          let chestLabel = `Chest #${candidateDetails.chestNumber || "None"}`;

                          if (cfg.action === "EXISTING_CANDIDATE") {
                            const ex = teamCandidates.find((c) => c.id === cfg.existingCandidateId);
                            targetLabel = ex ? `${ex.name} (Chest #${ex.chestNumber || "None"})` : "[Existing Candidate]";
                            chestLabel = "";
                          } else if (cfg.action === "DIRECTORY_STUDENT" || cfg.action === "MANUAL_STUDENT") {
                            targetLabel = cfg.studentName || "[New Student]";
                            chestLabel = "(New auto-allocated chest #)";
                          }

                          return (
                            <div key={p.id} style={{ marginLeft: "12px", fontSize: "0.75rem", color: "#e0f2fe" }}>
                              &bull; {p.program?.name}: <strong>{targetLabel}</strong> {chestLabel}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      ⚡ <strong>Direct Replacement Effect:</strong> Candidate <strong>{replacementName || "[New Student]"}</strong> will immediately take over Chest #{candidateDetails.chestNumber || "Pending"} and all {candidateDetails.programs?.length || 0} assigned programs. ID card exports and tabulation sheets will reflect the change instantly.
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid #4b5563",
                      backgroundColor: "transparent",
                      color: "#d1d5db",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !replacementName.trim()}
                    style={{
                      padding: "8px 20px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: assignmentStrategy === "PROGRAM_WISE" && (candidateDetails.programs?.length || 0) > 1 ? "#38bdf8" : "#10b981",
                      color: "#000",
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      cursor: submitting || !replacementName.trim() ? "not-allowed" : "pointer",
                      boxShadow: assignmentStrategy === "PROGRAM_WISE" && (candidateDetails.programs?.length || 0) > 1
                        ? "0 4px 12px rgba(56, 189, 248, 0.3)"
                        : "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    {submitting ? "Replacing..." : assignmentStrategy === "PROGRAM_WISE" && (candidateDetails.programs?.length || 0) > 1 ? "🔄 Execute Program-Wise Replacement" : "🔄 Execute Replacement Now"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
