"use client";

import { useState, useEffect } from "react";
import {
  searchCandidatesForReplacement,
  getReplacementCandidateDetails,
  directReplaceCandidate,
  removeProgramFromCandidate,
  transferProgramToAnotherCandidate,
} from "./actions";
import ImageUpload from "@/app/components/ImageUpload";

export interface ZoneOption {
  id: string;
  name: string;
  code: string;
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
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(initialCandidateId && initialCandidateId !== "SEARCH_MODE" ? initialCandidateId : null);
  const [candidateDetails, setCandidateDetails] = useState<any | null>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [teamCandidates, setTeamCandidates] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Program Transfer State
  const [transferringProgramId, setTransferringProgramId] = useState<string | null>(null);
  const [transferTargetType, setTransferTargetType] = useState<"DIRECTORY_STUDENT" | "EXISTING_CANDIDATE" | "MANUAL_STUDENT">("DIRECTORY_STUDENT");
  const [transferStudentUid, setTransferStudentUid] = useState<string>("");
  const [transferStudentName, setTransferStudentName] = useState<string>("");
  const [transferStudentPhoto, setTransferStudentPhoto] = useState<string>("");
  const [transferExistingCandidateId, setTransferExistingCandidateId] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("Program replacement approved by Super Admin");
  const [transferStudentSearch, setTransferStudentSearch] = useState<string>("");
  const [limits, setLimits] = useState<any>(null);
  const [bypassLimits, setBypassLimits] = useState<boolean>(false);

  // Full Candidate Replacement State (optional accordion)
  const [showFullReplacement, setShowFullReplacement] = useState<boolean>(false);
  const [replacementMode, setReplacementMode] = useState<"DIRECTORY" | "MANUAL">("DIRECTORY");
  const [selectedStudentUid, setSelectedStudentUid] = useState<string>("");
  const [replacementName, setReplacementName] = useState<string>("");
  const [replacementPhoto, setReplacementPhoto] = useState<string>("");
  const [fullReason, setFullReason] = useState<string>("Medical dropout replacement approved by Super Admin");
  const [studentSearch, setStudentSearch] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
  const reloadCandidateDetails = async (candId: string) => {
    setLoadingDetails(true);
    setError(null);
    const res = await getReplacementCandidateDetails(candId);
    if (res.success && res.candidate) {
      setCandidateDetails(res.candidate);
      setAvailableStudents(res.availableStudents || []);
      setTeamCandidates(res.teamCandidates || []);
      setLimits(res.limits || null);
      setReplacementPhoto(res.candidate.photo || res.candidate.photoUrl || "");
      if (res.availableStudents && res.availableStudents.length > 0) {
        setReplacementMode("DIRECTORY");
        setTransferTargetType("DIRECTORY_STUDENT");
      } else {
        setReplacementMode("MANUAL");
        setTransferTargetType("MANUAL_STUDENT");
      }
    } else {
      setError(res.error || "Failed to load candidate details.");
    }
    setLoadingDetails(false);
  };

  useEffect(() => {
    if (!activeCandidateId) {
      setCandidateDetails(null);
      setAvailableStudents([]);
      setTeamCandidates([]);
      return;
    }
    reloadCandidateDetails(activeCandidateId);
  }, [activeCandidateId]);

  // Handler: Remove Program from Candidate
  const handleRemoveProgram = async (programAssignmentId: string, programName: string) => {
    if (!activeCandidateId || !candidateDetails) return;
    const confirmMsg = `Are you sure you want to remove program "${programName}" from candidate "${candidateDetails.name}" (Chest #${candidateDetails.chestNumber || "None"})?\n\nCandidate will remain with Chest #${candidateDetails.chestNumber || "None"} and any other remaining programs.`;
    if (!confirm(confirmMsg)) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const res = await removeProgramFromCandidate({
      candidateId: activeCandidateId,
      programAssignmentId,
      reason: `Program "${programName}" removed by Super Admin`,
    });

    if (res.success) {
      setSuccessMsg(`✅ Removed "${res.programName}" from ${res.candidateName}!`);
      if (transferringProgramId === programAssignmentId) {
        setTransferringProgramId(null);
      }
      await reloadCandidateDetails(activeCandidateId);
      if (onReplaced) onReplaced();
    } else {
      setError(res.error || "Failed to remove program.");
    }
    setSubmitting(false);
  };

  // Handler: Execute Program Transfer to Another Student
  const handleExecuteProgramTransfer = async (programAssignmentId: string, programName: string) => {
    if (!activeCandidateId || !candidateDetails) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const res = await transferProgramToAnotherCandidate({
      fromCandidateId: activeCandidateId,
      programAssignmentId,
      targetType: transferTargetType,
      studentUid: transferStudentUid || undefined,
      studentName: transferStudentName || undefined,
      studentPhoto: transferStudentPhoto || undefined,
      existingCandidateId: transferExistingCandidateId || undefined,
      reason: transferReason,
      bypassLimits,
    });

    if (res.success) {
      alert(
        `✅ Program Transferred Successfully!\n\n` +
        `Program: ${res.programName}\n` +
        `Removed from: ${res.fromCandidateName} (Chest #${res.fromChestNumber})\n` +
        `Assigned to: ${res.toCandidateName} (Chest #${res.toChestNumber || "Pending"})\n\n` +
        `Note: "${res.toCandidateName}" will clearly display "Replaced from Chest #${res.fromChestNumber}" on ID cards and sheets.`
      );
      setTransferringProgramId(null);
      setTransferStudentName("");
      setTransferStudentUid("");
      setTransferStudentPhoto("");
      setTransferExistingCandidateId("");
      await reloadCandidateDetails(activeCandidateId);
      if (onReplaced) onReplaced();
    } else {
      setError(res.error || "Failed to transfer program.");
    }
    setSubmitting(false);
  };

  // Handler: Execute Full Candidate Replacement
  const handleExecuteFullReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidateId || !candidateDetails) return;

    if (!replacementName.trim()) {
      setError("Replacement candidate name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await directReplaceCandidate({
      candidateId: activeCandidateId,
      newStudentUid: selectedStudentUid || undefined,
      newName: replacementName,
      newPhoto: replacementPhoto || undefined,
      reason: fullReason,
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
          maxWidth: activeCandidateId ? "740px" : "640px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          color: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.4rem" }}>🔄</span>
              <h3 style={{ margin: 0, color: "#f59e0b", fontSize: "1.2rem", fontWeight: 800 }}>
                Super Admin Candidate & Program Replacement
              </h3>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#9ca3af" }}>
              Remove or reassign specific programs to other students with automatic &quot;Replaced from Chest #&quot; tracking.
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

        {successMsg && (
          <div
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "1rem",
              color: "#6ee7b7",
              fontSize: "0.85rem",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* STEP 1: Search & Pick Candidate */}
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
                  Search Candidate to Manage / Replace:
                </label>
                <input
                  type="text"
                  placeholder="Enter Chest No (e.g. 335), Candidate Name, UID, or College..."
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
                            {c.replacedFromChest && (
                              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#fcd34d" }}>
                                🔁 From #{c.replacedFromChest}
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
                        Manage ➔
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* STEP 2: Candidate Details, Program Management, and Replacement */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {loadingDetails ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                Loading candidate details...
              </div>
            ) : candidateDetails ? (
              <>
                {/* Back to search */}
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

                {/* Candidate Overview Card */}
                <div
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    border: "1.5px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>👤</span> SELECTED CANDIDATE:
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
                        {candidateDetails.replacedFromChest && (
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "2px 7px", borderRadius: "4px", backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#fcd34d", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
                            🔁 Replaced from Chest #{candidateDetails.replacedFromChest}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "3px" }}>
                        🏛️ {candidateDetails.team?.name} &bull; Zone: <strong style={{ color: "#38bdf8" }}>{candidateDetails.team?.event?.zone?.name || "N/A"}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: ASSIGNED PROGRAMS */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.84rem", fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>📜</span> ASSIGNED PROGRAMS ({candidateDetails.programs?.length || 0}):
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                      Remove any program or reassign to another student with old chest number recorded
                    </span>
                  </div>

                  {(!candidateDetails.programs || candidateDetails.programs.length === 0) ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                      No programs currently assigned to this candidate.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {candidateDetails.programs.map((p: any) => {
                        const isOffStage = p.program?.stageType === "OFF_STAGE";
                        const isTransferring = transferringProgramId === p.id;

                        return (
                          <div
                            key={p.id}
                            style={{
                              backgroundColor: isTransferring ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.03)",
                              border: `1.5px solid ${isTransferring ? "#3b82f6" : "rgba(255, 255, 255, 0.1)"}`,
                              borderRadius: "10px",
                              padding: "12px 14px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "1.2rem" }}>{isOffStage ? "🎨" : "🎭"}</span>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                    <strong style={{ fontSize: "0.92rem", color: "#fff" }}>{p.program?.name}</strong>
                                    {p.replacedFromChest && (
                                      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 5px", borderRadius: "4px", backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#fcd34d" }}>
                                        🔁 From #{p.replacedFromChest}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "2px" }}>
                                    Category: <span style={{ color: "#38bdf8" }}>{p.program?.category?.name || candidateDetails.category?.name || "General"}</span> &bull; Stage: <span style={{ color: isOffStage ? "#38bdf8" : "#f472b6", fontWeight: 700 }}>{p.program?.stageType}</span> &bull; Rule: <span style={{ color: "#fcd34d", fontWeight: 600 }}>{isOffStage ? `${limits?.maxIndividualOffStage ?? 2} Off-Stage max` : `${limits?.maxIndividualOnStage ?? 2} On-Stage max`}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Program Actions */}
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProgram(p.id, p.program?.name)}
                                  disabled={submitting}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                                    color: "#f87171",
                                  }}
                                  title="Remove this program from this candidate"
                                >
                                  🗑️ Remove
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isTransferring) {
                                      setTransferringProgramId(null);
                                    } else {
                                      setTransferringProgramId(p.id);
                                      setTransferStudentName("");
                                      setTransferStudentUid("");
                                      setTransferStudentPhoto("");
                                    }
                                  }}
                                  disabled={submitting}
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    border: isTransferring ? "1.5px solid #38bdf8" : "1px solid rgba(56, 189, 248, 0.4)",
                                    backgroundColor: isTransferring ? "#38bdf8" : "rgba(56, 189, 248, 0.15)",
                                    color: isTransferring ? "#000" : "#38bdf8",
                                  }}
                                >
                                  {isTransferring ? "✕ Cancel Transfer" : "🔄 Transfer to Another Student"}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Transfer Panel for this Program */}
                            {isTransferring && (
                              <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px" }}>
                                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#38bdf8", marginBottom: "8px" }}>
                                  TRANSFER &quot;{p.program?.name}&quot; TO ANOTHER CANDIDATE:
                                </div>
                                <p style={{ fontSize: "0.74rem", color: "#9ca3af", margin: "0 0 10px 0" }}>
                                  This program will be removed from <strong>{candidateDetails.name}</strong> (Chest #{candidateDetails.chestNumber || "None"}) and assigned to the selected student below. The recipient candidate will receive their own chest number and clearly display <strong>&quot;Replaced from Chest #{candidateDetails.chestNumber || "None"}&quot;</strong>.
                                </p>

                                {/* Stage Limit Alert Banner */}
                                <div style={{ backgroundColor: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "0.74rem", color: "#bae6fd", display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "1rem" }}>{isOffStage ? "🎨" : "🎭"}</span>
                                  <div>
                                    <strong>Stage Limit Enforced:</strong> This program is <strong>{isOffStage ? "OFF-STAGE" : "ON-STAGE"}</strong>. Max limit per candidate is <strong>{isOffStage ? (limits?.maxIndividualOffStage ?? 2) : (limits?.maxIndividualOnStage ?? 2)} {isOffStage ? "Off-Stage" : "On-Stage"}</strong> individual programs. Candidates at or exceeding this limit cannot be assigned.
                                  </div>
                                </div>

                                {/* Target Mode Selector */}
                                <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={() => setTransferTargetType("DIRECTORY_STUDENT")}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      border: "none",
                                      backgroundColor: transferTargetType === "DIRECTORY_STUDENT" ? "#38bdf8" : "rgba(255,255,255,0.06)",
                                      color: transferTargetType === "DIRECTORY_STUDENT" ? "#000" : "#9ca3af",
                                    }}
                                  >
                                    🏛️ College Directory ({availableStudents.length})
                                  </button>
                                  {teamCandidates.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setTransferTargetType("EXISTING_CANDIDATE")}
                                      style={{
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        fontSize: "0.74rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        border: "none",
                                        backgroundColor: transferTargetType === "EXISTING_CANDIDATE" ? "#f59e0b" : "rgba(255,255,255,0.06)",
                                        color: transferTargetType === "EXISTING_CANDIDATE" ? "#000" : "#9ca3af",
                                      }}
                                    >
                                      👥 Existing Team Candidate ({teamCandidates.length})
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setTransferTargetType("MANUAL_STUDENT")}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      fontSize: "0.74rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      border: "none",
                                      backgroundColor: transferTargetType === "MANUAL_STUDENT" ? "#10b981" : "rgba(255,255,255,0.06)",
                                      color: transferTargetType === "MANUAL_STUDENT" ? "#000" : "#9ca3af",
                                    }}
                                  >
                                    ✏️ Manual Entry
                                  </button>
                                </div>

                                {/* Option A: Directory Picker */}
                                {transferTargetType === "DIRECTORY_STUDENT" && (
                                  <div style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", borderRadius: "8px", padding: "10px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "10px" }}>
                                    <input
                                      type="text"
                                      placeholder="Filter college directory by name or UID..."
                                      value={transferStudentSearch}
                                      onChange={(e) => setTransferStudentSearch(e.target.value)}
                                      style={{
                                        width: "100%",
                                        padding: "6px 10px",
                                        borderRadius: "6px",
                                        backgroundColor: "#1f2937",
                                        border: "1px solid #4b5563",
                                        color: "#fff",
                                        fontSize: "0.8rem",
                                        marginBottom: "6px",
                                      }}
                                    />
                                    <div style={{ maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "3px" }}>
                                      {availableStudents
                                        .filter((s) => {
                                          if (!transferStudentSearch) return true;
                                          const q = transferStudentSearch.toLowerCase();
                                          return s.name.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q);
                                        })
                                        .map((s) => {
                                          const isSelected = transferStudentUid === s.uid;
                                          return (
                                            <div
                                              key={s.id}
                                              onClick={() => {
                                                setTransferStudentUid(s.uid);
                                                setTransferStudentName(s.name);
                                                setTransferStudentPhoto(s.photo || s.photoUrl || "");
                                              }}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "6px 8px",
                                                borderRadius: "5px",
                                                backgroundColor: isSelected ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.02)",
                                                border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.05)",
                                                cursor: "pointer",
                                              }}
                                            >
                                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <div style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#374151", overflow: "hidden" }}>
                                                  {s.photo || s.photoUrl ? (
                                                    <img src={s.photo || s.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                  ) : (
                                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#9ca3af" }}>👤</div>
                                                  )}
                                                </div>
                                                <span style={{ fontSize: "0.78rem", color: isSelected ? "#38bdf8" : "#fff", fontWeight: isSelected ? 700 : 500 }}>
                                                  {s.name}
                                                </span>
                                                <span style={{ fontSize: "0.68rem", color: "#9ca3af", fontFamily: "monospace" }}>
                                                  [{s.uid}]
                                                </span>
                                              </div>
                                              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isSelected ? "#38bdf8" : "#6b7280" }}>
                                                {isSelected ? "✓ Selected" : "Select"}
                                              </span>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}

                                {/* Option B: Existing Team Candidate */}
                                {transferTargetType === "EXISTING_CANDIDATE" && (
                                  <div style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", borderRadius: "8px", padding: "10px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "10px" }}>
                                    <label style={{ display: "block", fontSize: "0.74rem", color: "#fcd34d", marginBottom: "4px", fontWeight: 600 }}>
                                      Select existing candidate from this team (live stage limits applied):
                                    </label>
                                    <select
                                      value={transferExistingCandidateId}
                                      onChange={(e) => {
                                        setTransferExistingCandidateId(e.target.value);
                                        const chosen = teamCandidates.find(c => c.id === e.target.value);
                                        if (chosen) {
                                          setTransferStudentName(chosen.name);
                                          setTransferStudentUid(chosen.uid || "");
                                        }
                                      }}
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
                                      <option value="">-- Choose Existing Candidate --</option>
                                      {teamCandidates.map((c) => {
                                        const progStage = p.program?.stageType || "ON_STAGE";
                                        const maxStage = progStage === "ON_STAGE" ? (limits?.maxIndividualOnStage ?? 2) : (limits?.maxIndividualOffStage ?? 2);
                                        const currentStage = progStage === "ON_STAGE" ? (c.onStageCount || 0) : (c.offStageCount || 0);
                                        const isLimitReached = !bypassLimits && currentStage >= maxStage;
                                        return (
                                          <option key={c.id} value={c.id} disabled={isLimitReached}>
                                            {c.name} {c.chestNumber ? `(Chest #${c.chestNumber})` : ""} — 🎭 On: {c.onStageCount || 0}/{limits?.maxIndividualOnStage ?? 2}, 🎨 Off: {c.offStageCount || 0}/{limits?.maxIndividualOffStage ?? 2} {isLimitReached ? `⛔ [${progStage} LIMIT REACHED]` : ""}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}

                                {/* Option C / Recipient Inputs */}
                                {transferTargetType !== "EXISTING_CANDIDATE" && (
                                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "10px" }}>
                                    <div>
                                      <label style={{ display: "block", fontSize: "0.72rem", color: "#9ca3af", marginBottom: "2px" }}>
                                        Recipient Student Full Name *
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={transferStudentName}
                                        onChange={(e) => setTransferStudentName(e.target.value)}
                                        style={{
                                          width: "100%",
                                          padding: "6px 8px",
                                          borderRadius: "5px",
                                          backgroundColor: "#1f2937",
                                          border: "1.5px solid #38bdf8",
                                          color: "#fff",
                                          fontSize: "0.82rem",
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
                                        value={transferStudentUid}
                                        onChange={(e) => setTransferStudentUid(e.target.value)}
                                        style={{
                                          width: "100%",
                                          padding: "6px 8px",
                                          borderRadius: "5px",
                                          backgroundColor: "#1f2937",
                                          border: "1px solid #4b5563",
                                          color: "#fff",
                                          fontSize: "0.82rem",
                                          fontFamily: "monospace",
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Super Admin Bypass Limits Checkbox */}
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0 12px 0", padding: "8px 10px", backgroundColor: "rgba(239, 68, 68, 0.08)", borderRadius: "6px", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                                  <input
                                    type="checkbox"
                                    id={`bypass-limits-${p.id}`}
                                    checked={bypassLimits}
                                    onChange={(e) => setBypassLimits(e.target.checked)}
                                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                  />
                                  <label htmlFor={`bypass-limits-${p.id}`} style={{ fontSize: "0.74rem", color: "#fca5a5", cursor: "pointer", fontWeight: 600 }}>
                                    ⚠️ <strong>Override Limits:</strong> Super Admin emergency dispensation to bypass On-Stage & Off-Stage limits ({limits?.maxIndividualOnStage ?? 2} On / {limits?.maxIndividualOffStage ?? 2} Off)
                                  </label>
                                </div>

                                {/* Transfer Action Button */}
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                  <button
                                    type="button"
                                    onClick={() => setTransferringProgramId(null)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      border: "1px solid #4b5563",
                                      backgroundColor: "transparent",
                                      color: "#d1d5db",
                                      fontSize: "0.78rem",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteProgramTransfer(p.id, p.program?.name)}
                                    disabled={submitting || (transferTargetType === "EXISTING_CANDIDATE" ? !transferExistingCandidateId : !transferStudentName.trim())}
                                    style={{
                                      padding: "6px 16px",
                                      borderRadius: "6px",
                                      border: "none",
                                      backgroundColor: "#38bdf8",
                                      color: "#000",
                                      fontSize: "0.8rem",
                                      fontWeight: 800,
                                      cursor: submitting ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    {submitting ? "Transferring..." : `🚀 Remove from ${candidateDetails.name} & Assign to ${transferStudentName || "Candidate"}`}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section: OPTIONAL FULL STUDENT REPLACEMENT */}
                <div style={{ marginTop: "10px", borderTop: "1px dashed rgba(255,255,255,0.15)", paddingTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setShowFullReplacement(!showFullReplacement)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#f59e0b",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: 0,
                    }}
                  >
                    <span>{showFullReplacement ? "▼" : "▶"}</span> Need to replace candidate completely across all programs? (Takes over Chest #{candidateDetails.chestNumber || "None"})
                  </button>

                  {showFullReplacement && (
                    <form onSubmit={handleExecuteFullReplacement} style={{ marginTop: "12px", backgroundColor: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#10b981" }}>
                          Choose New Student for Chest #{candidateDetails.chestNumber || "None"}:
                        </label>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setReplacementMode("DIRECTORY")}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              border: "none",
                              backgroundColor: replacementMode === "DIRECTORY" ? "#10b981" : "rgba(255,255,255,0.06)",
                              color: replacementMode === "DIRECTORY" ? "#000" : "#9ca3af",
                            }}
                          >
                            🏛️ Directory
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplacementMode("MANUAL")}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              border: "none",
                              backgroundColor: replacementMode === "MANUAL" ? "#10b981" : "rgba(255,255,255,0.06)",
                              color: replacementMode === "MANUAL" ? "#000" : "#9ca3af",
                            }}
                          >
                            ✏️ Manual
                          </button>
                        </div>
                      </div>

                      {replacementMode === "DIRECTORY" && (
                        <div>
                          <input
                            type="text"
                            placeholder="Filter college students..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "5px 8px",
                              borderRadius: "5px",
                              backgroundColor: "#1f2937",
                              border: "1px solid #4b5563",
                              color: "#fff",
                              fontSize: "0.8rem",
                              marginBottom: "4px",
                            }}
                          />
                          <div style={{ maxHeight: "110px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {availableStudents
                              .filter((s) => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.uid.toLowerCase().includes(studentSearch.toLowerCase()))
                              .map((s) => {
                                const isSel = selectedStudentUid === s.uid;
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => {
                                      setSelectedStudentUid(s.uid);
                                      setReplacementName(s.name);
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      backgroundColor: isSel ? "rgba(16, 185, 129, 0.25)" : "rgba(255,255,255,0.02)",
                                      border: `1px solid ${isSel ? "#10b981" : "rgba(255,255,255,0.05)"}`,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      cursor: "pointer",
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    <span><strong>{s.name}</strong> ({s.uid})</span>
                                    <span style={{ color: isSel ? "#10b981" : "#6b7280" }}>{isSel ? "✓ Selected" : "Select"}</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", color: "#9ca3af", marginBottom: "2px" }}>
                            New Candidate Name *
                          </label>
                          <input
                            type="text"
                            value={replacementName}
                            onChange={(e) => setReplacementName(e.target.value)}
                            required
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: "5px",
                              backgroundColor: "#1f2937",
                              border: "1.5px solid #10b981",
                              color: "#fff",
                              fontSize: "0.82rem",
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", color: "#9ca3af", marginBottom: "2px" }}>
                            UID (Optional)
                          </label>
                          <input
                            type="text"
                            value={selectedStudentUid}
                            onChange={(e) => setSelectedStudentUid(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: "5px",
                              backgroundColor: "#1f2937",
                              border: "1px solid #4b5563",
                              color: "#fff",
                              fontSize: "0.82rem",
                              fontFamily: "monospace",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: "4px" }}>
                        <ImageUpload
                          label="Candidate Photo (Optional):"
                          folder="candidates"
                          initialUrl={replacementPhoto}
                          maxSizeKb={800}
                          onUploadComplete={(url) => setReplacementPhoto(url)}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                        <button
                          type="submit"
                          disabled={submitting || !replacementName.trim()}
                          style={{
                            padding: "6px 16px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: "#10b981",
                            color: "#000",
                            fontSize: "0.82rem",
                            fontWeight: 800,
                            cursor: submitting || !replacementName.trim() ? "not-allowed" : "pointer",
                          }}
                        >
                          {submitting ? "Replacing..." : "🔄 Execute Complete Candidate Swap"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
