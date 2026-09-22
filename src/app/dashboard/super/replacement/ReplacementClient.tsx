"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getInstitutionsByZone,
  getProgramAssignmentsByInstitution,
  addAndAssignNewCandidate,
  zonalTransferProgram,
} from "./actions";
import { transferProgramToAnotherCandidate } from "@/app/dashboard/candidates/actions";
import ImageUpload from "@/app/components/ImageUpload";

interface Zone { id: string; name: string; code: string; events: any[] }

interface Props {
  zones: Zone[];
}

const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "rgba(255,255,255,0.1)",
  accent: "#6366f1",
  gold: "#facc15",
  green: "#10b981",
  red: "#ef4444",
  text: "#f1f5f9",
  muted: "rgba(241,245,249,0.55)",
};

function Tag({ children, color = COLORS.accent }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 9999,
      fontSize: "0.70rem", fontWeight: 800,
      background: `${color}22`, color, border: `1px solid ${color}44`
    }}>{children}</span>
  );
}

function ChestBadge({ num }: { num: string | null }) {
  if (!num) return <Tag color={COLORS.muted}>No Chest</Tag>;
  return <Tag color={COLORS.gold}>#{num}</Tag>;
}

export default function ReplacementClient({ zones }: Props) {
  const [isPending, startTransition] = useTransition();

  // Cascade selections
  const [zoneId, setZoneId] = useState("");
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [masterStudents, setMasterStudents] = useState<any[]>([]);
  const [teamCandidates, setTeamCandidates] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // Active replacement panel
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [activeAssignment, setActiveAssignment] = useState<any>(null); // the specific assignment being replaced
  const [mode, setMode] = useState<"EXISTING" | "NEW">("EXISTING");

  // New candidate form
  const [newName, setNewName] = useState("");
  const [newUid, setNewUid] = useState("");
  const [newPhoto, setNewPhoto] = useState("");
  const [reason, setReason] = useState("Zonal replacement approved by Super Admin");

  // Existing candidate selection
  const [targetCandidateId, setTargetCandidateId] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Step 1: Load institutions when zone changes
  useEffect(() => {
    if (!zoneId) { setInstitutions([]); setSelectedInst(null); setPrograms([]); return; }
    setLoading(true);
    getInstitutionsByZone(zoneId).then(res => {
      setInstitutions(res.institutions || []);
      setSelectedInst(null);
      setPrograms([]);
      setLoading(false);
    });
  }, [zoneId]);

  // Step 2: Load programs when institution changes
  const loadInstitution = (inst: any) => {
    if (!inst) return;
    setSelectedInst(inst);
    setActiveProgram(null);
    setActiveAssignment(null);
    setPrograms([]);
    setLoading(true);
    getProgramAssignmentsByInstitution(inst.teamId, inst.eventId).then(res => {
      setPrograms(res.programs || []);
      setMasterStudents(res.masterStudents || []);
      setTeamCandidates(res.team?.candidates || []);
      setLoading(false);
    });
  };

  const resetPanel = () => {
    setActiveProgram(null);
    setActiveAssignment(null);
    setNewName(""); setNewUid(""); setNewPhoto("");
    setTargetCandidateId("");
    setReason("Zonal replacement approved by Super Admin");
  };

  const handleReplace = () => {
    if (!activeProgram || !selectedInst) return;

    if (mode === "EXISTING") {
      if (!targetCandidateId) { showToast("Please select a target candidate", "err"); return; }
      if (!activeAssignment) { showToast("No assignment selected", "err"); return; }

      startTransition(async () => {
        const res = await transferProgramToAnotherCandidate({
          fromCandidateId: activeAssignment.candidate.id,
          programAssignmentId: activeAssignment.id,
          targetType: "EXISTING_CANDIDATE",
          existingCandidateId: targetCandidateId,
          reason,
          bypassLimits: true
        });
        if (res.success) {
          showToast(`✅ Transferred to selected candidate`);
          resetPanel();
          loadInstitution(selectedInst);
        } else {
          showToast(res.error || "Failed", "err");
        }
      });
    } else {
      // NEW candidate
      if (!newName.trim()) { showToast("Enter new candidate name", "err"); return; }
      startTransition(async () => {
        const res = await addAndAssignNewCandidate({
          name: newName,
          uid: newUid || undefined,
          photo: newPhoto || undefined,
          teamId: selectedInst.teamId,
          categoryId: activeProgram.category?.id || activeProgram.categoryId,
          programId: activeProgram.id,
          programAssignmentId: activeAssignment?.id,
          fromCandidateId: activeAssignment?.candidate?.id,
          reason
        });
        if (res.success) {
          showToast(`✅ Added ${res.name} — Chest #${res.chestNumber}`);
          resetPanel();
          loadInstitution(selectedInst);
        } else {
          showToast(res.error || "Failed", "err");
        }
      });
    }
  };

  // Derived categories
  const categories = Array.from(new Set(programs.map(p => p.category?.name || "General").filter(Boolean)));

  const filteredPrograms = programs.filter(p => {
    if (categoryFilter !== "ALL" && (p.category?.name || "General") !== categoryFilter) return false;
    return true;
  });

  const selectedZone = zones.find(z => z.id === zoneId);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", fontFamily: "'Inter', system-ui, sans-serif", color: COLORS.text }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "ok" ? "#064e3b" : "#7f1d1d",
          border: `1px solid ${toast.type === "ok" ? "#10b981" : "#ef4444"}`,
          color: "#fff", padding: "12px 20px", borderRadius: 12,
          fontSize: "0.88rem", fontWeight: 700, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          maxWidth: 380, animation: "fadeIn 0.2s"
        }}>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: "1.8rem" }}>🔄</span>
          <h1 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 900, color: COLORS.text }}>
            Zonal Replacement Management
          </h1>
        </div>
        <p style={{ margin: 0, color: COLORS.muted, fontSize: "0.88rem" }}>
          Select a zone → institution → program to manage candidate replacements. Changes reflect in stage management and tabulation sheets automatically.
        </p>
      </div>

      {/* Step 1 + 2: Zone & Institution Selectors */}
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 16, padding: "20px 24px", marginBottom: 24
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Zone */}
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              1. Select Zone
            </label>
            <select
              value={zoneId}
              onChange={e => { setZoneId(e.target.value); setCategoryFilter("ALL"); }}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                background: COLORS.bg, border: `1.5px solid ${zoneId ? COLORS.accent : COLORS.border}`,
                color: COLORS.text, fontSize: "0.92rem", outline: "none", cursor: "pointer"
              }}
            >
              <option value="">— Choose Zone —</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Institution */}
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              2. Select Institution
            </label>
            <select
              value={selectedInst?.id || ""}
              onChange={e => {
                const inst = institutions.find(i => i.id === e.target.value);
                if (inst) loadInstitution(inst);
              }}
              disabled={!zoneId || loading}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                background: COLORS.bg, border: `1.5px solid ${selectedInst ? COLORS.accent : COLORS.border}`,
                color: COLORS.text, fontSize: "0.92rem", outline: "none",
                cursor: !zoneId ? "not-allowed" : "pointer", opacity: !zoneId ? 0.5 : 1
              }}
            >
              <option value="">— Choose Institution —</option>
              {institutions.map(i => (
                <option key={i.id} value={i.id}>{i.name}{i.place ? `, ${i.place}` : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Institution info bar */}
        {selectedInst && (
          <div style={{
            marginTop: 14, padding: "10px 14px", borderRadius: 8,
            background: `${COLORS.accent}18`, border: `1px solid ${COLORS.accent}33`,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
          }}>
            <span style={{ fontWeight: 800, color: COLORS.accent }}>{selectedInst.name}</span>
            {selectedInst.place && <span style={{ color: COLORS.muted, fontSize: "0.82rem" }}>📍 {selectedInst.place}</span>}
            <span style={{ color: COLORS.muted, fontSize: "0.82rem" }}>Zone: {selectedZone?.name}</span>
            <Tag color={COLORS.green}>{programs.length} Programs</Tag>
            <Tag color={COLORS.accent}>{teamCandidates.length} Candidates</Tag>
          </div>
        )}
      </div>

      {/* Program list with replacement panels */}
      {selectedInst && programs.length > 0 && (
        <>
          {/* Category Filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: COLORS.muted, fontWeight: 700, marginRight: 4 }}>Filter:</span>
            {["ALL", ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: "5px 14px", borderRadius: 9999, border: "none",
                  fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
                  background: categoryFilter === cat ? COLORS.accent : `${COLORS.accent}15`,
                  color: categoryFilter === cat ? "#fff" : COLORS.accent,
                  transition: "all 0.15s"
                }}
              >{cat}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredPrograms.map(prog => {
              const assignments = prog.assignments || [];
              const isActive = activeProgram?.id === prog.id;
              const catColor = (prog.category?.name || "").toUpperCase().includes("FADHIL") ? "#facc15"
                : (prog.category?.name || "").toUpperCase().includes("FADHEEL") ? "#ef4444"
                : COLORS.green;

              return (
                <div
                  key={prog.id}
                  style={{
                    background: COLORS.card, border: `1.5px solid ${isActive ? COLORS.accent : COLORS.border}`,
                    borderRadius: 14, overflow: "hidden",
                    boxShadow: isActive ? `0 0 0 2px ${COLORS.accent}44` : "none",
                    transition: "border-color 0.2s, box-shadow 0.2s"
                  }}
                >
                  {/* Program Header */}
                  <div style={{
                    padding: "12px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 10
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{
                        background: `${catColor}22`, color: catColor,
                        border: `1px solid ${catColor}44`,
                        padding: "2px 8px", borderRadius: 9999,
                        fontSize: "0.66rem", fontWeight: 900, flexShrink: 0
                      }}>#{prog.programCode || "?"}</span>
                      <span style={{ fontWeight: 800, fontSize: "0.96rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {prog.name}
                      </span>
                      {prog.category && (
                        <Tag color={catColor}>{prog.category.name}</Tag>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>
                        {assignments.length}/{prog.candidateLimitPerTeam} slots filled
                      </span>
                      {assignments.length < prog.candidateLimitPerTeam && (
                        <button
                          onClick={() => {
                            setActiveProgram(prog);
                            setActiveAssignment(null);
                            setMode("NEW");
                          }}
                          style={{
                            padding: "5px 12px", borderRadius: 8,
                            background: `${COLORS.green}22`, color: COLORS.green,
                            border: `1px solid ${COLORS.green}44`,
                            fontSize: "0.78rem", fontWeight: 800, cursor: "pointer"
                          }}
                        >
                          ➕ Add Candidate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Assigned Candidates */}
                  {assignments.length > 0 && (
                    <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {assignments.map((asn: any) => {
                        const c = asn.candidate;
                        return (
                          <div key={asn.id} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            background: COLORS.bg, borderRadius: 10, padding: "8px 12px",
                            border: `1px solid ${COLORS.border}`, flexWrap: "wrap"
                          }}>
                            {/* Photo */}
                            {(c.photoUrl || c.photo) ? (
                              <img
                                src={c.photoUrl || c.photo}
                                alt={c.name}
                                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${COLORS.border}`, flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{
                                width: 36, height: 36, borderRadius: "50%",
                                background: COLORS.accent + "44", border: `2px solid ${COLORS.accent}44`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.88rem", fontWeight: 900, flexShrink: 0,
                                color: COLORS.accent
                              }}>
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: "0.90rem" }}>{c.name}</div>
                              <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                                <ChestBadge num={c.chestNumber} />
                                {c.uid && <Tag color={COLORS.muted}>UID: {c.uid}</Tag>}
                                {c.replacedFromChest && <Tag color={COLORS.red}>Replaced from #{c.replacedFromChest}</Tag>}
                                {!c.isApproved && <Tag color={COLORS.red}>⚠ Not Approved</Tag>}
                              </div>
                            </div>

                            {/* Replace button */}
                            <button
                              onClick={() => {
                                setActiveProgram(prog);
                                setActiveAssignment(asn);
                                setMode("EXISTING");
                                setTargetCandidateId("");
                                setNewName(""); setNewUid(""); setNewPhoto("");
                              }}
                              style={{
                                padding: "5px 12px", borderRadius: 8,
                                background: `${COLORS.accent}22`, color: COLORS.accent,
                                border: `1px solid ${COLORS.accent}44`,
                                fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", flexShrink: 0
                              }}
                            >
                              🔄 Replace
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {assignments.length === 0 && (
                    <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "10px 16px" }}>
                      <span style={{ color: COLORS.muted, fontSize: "0.82rem" }}>No candidate assigned yet</span>
                    </div>
                  )}

                  {/* Replacement / Add Panel */}
                  {isActive && (
                    <div style={{
                      borderTop: `2px solid ${COLORS.accent}`,
                      padding: "20px",
                      background: `${COLORS.accent}08`,
                      display: "flex", flexDirection: "column", gap: 16
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 900, fontSize: "0.92rem", color: COLORS.accent }}>
                          {activeAssignment ? `🔄 Replace: ${activeAssignment.candidate.name}` : "➕ Add New Candidate"}
                          <span style={{ color: COLORS.muted, fontWeight: 600, fontSize: "0.80rem", marginLeft: 8 }}>
                            for {prog.name}
                          </span>
                        </span>
                        <button onClick={resetPanel} style={{
                          background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "1.1rem"
                        }}>✕</button>
                      </div>

                      {/* Mode Tabs — only show if replacing */}
                      {activeAssignment && (
                        <div style={{ display: "flex", gap: 8 }}>
                          {(["EXISTING", "NEW"] as const).map(m => (
                            <button
                              key={m}
                              onClick={() => setMode(m)}
                              style={{
                                padding: "6px 16px", borderRadius: 8,
                                background: mode === m ? COLORS.accent : `${COLORS.accent}15`,
                                color: mode === m ? "#fff" : COLORS.accent,
                                border: "none", cursor: "pointer",
                                fontSize: "0.82rem", fontWeight: 800
                              }}
                            >
                              {m === "EXISTING" ? "👤 Existing Candidate" : "✨ New / Directory Student"}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* EXISTING candidate selector */}
                      {mode === "EXISTING" && activeAssignment && (
                        <div>
                          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
                            Select from team's current candidates:
                          </label>
                          <select
                            value={targetCandidateId}
                            onChange={e => setTargetCandidateId(e.target.value)}
                            style={{
                              width: "100%", padding: "10px 14px", borderRadius: 10,
                              background: COLORS.bg, border: `1.5px solid ${COLORS.border}`,
                              color: COLORS.text, fontSize: "0.92rem", outline: "none"
                            }}
                          >
                            <option value="">— Select target candidate —</option>
                            {teamCandidates
                              .filter(c => c.id !== activeAssignment.candidate.id)
                              .map((c: any) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}{c.chestNumber ? ` (Chest #${c.chestNumber})` : ""} — {c.category?.name || ""}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {/* NEW candidate form */}
                      {mode === "NEW" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {/* Master student quick-select */}
                          {masterStudents.length > 0 && (
                            <div>
                              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
                                Pick from Institution Directory (auto-fills name & UID):
                              </label>
                              <select
                                defaultValue=""
                                onChange={e => {
                                  const s = masterStudents.find((m: any) => m.uid === e.target.value);
                                  if (s) { setNewName(s.name); setNewUid(s.uid); }
                                }}
                                style={{
                                  width: "100%", padding: "10px 14px", borderRadius: 10,
                                  background: COLORS.bg, border: `1.5px solid ${COLORS.border}`,
                                  color: COLORS.text, fontSize: "0.88rem", outline: "none"
                                }}
                              >
                                <option value="">— Quick-pick from directory —</option>
                                {masterStudents.map((s: any) => (
                                  <option key={s.uid} value={s.uid}>{s.name} ({s.uid}) — {s.stream}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
                                Full Name *
                              </label>
                              <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Student full name"
                                style={{
                                  width: "100%", padding: "9px 12px", borderRadius: 8,
                                  background: COLORS.bg, border: `1.5px solid ${COLORS.border}`,
                                  color: COLORS.text, fontSize: "0.90rem", outline: "none", boxSizing: "border-box"
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
                                Student UID (optional)
                              </label>
                              <input
                                value={newUid}
                                onChange={e => setNewUid(e.target.value.toUpperCase())}
                                placeholder="e.g. 23456789"
                                style={{
                                  width: "100%", padding: "9px 12px", borderRadius: 8,
                                  background: COLORS.bg, border: `1.5px solid ${COLORS.border}`,
                                  color: COLORS.text, fontSize: "0.90rem", outline: "none", boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>

                          {/* Photo Upload */}
                          <div>
                            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
                              Photo (optional)
                            </label>
                            <ImageUpload
                              onUploadComplete={(url: string) => setNewPhoto(url)}
                              initialUrl={newPhoto || null}
                              label="Upload candidate photo"
                              folder="candidates"
                            />
                            {newPhoto && (
                              <img src={newPhoto} alt="preview" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", marginTop: 8, border: `2px solid ${COLORS.accent}` }} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reason */}
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: COLORS.muted, marginBottom: 6 }}>
                          Reason / Note
                        </label>
                        <input
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          style={{
                            width: "100%", padding: "9px 12px", borderRadius: 8,
                            background: COLORS.bg, border: `1.5px solid ${COLORS.border}`,
                            color: COLORS.text, fontSize: "0.88rem", outline: "none", boxSizing: "border-box"
                          }}
                        />
                      </div>

                      {/* Submit */}
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                          onClick={handleReplace}
                          disabled={isPending}
                          style={{
                            padding: "10px 24px", borderRadius: 10,
                            background: isPending ? `${COLORS.accent}44` : COLORS.accent,
                            color: "#fff", border: "none",
                            fontSize: "0.90rem", fontWeight: 900, cursor: isPending ? "not-allowed" : "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          {isPending ? "Processing…" : activeAssignment ? "✅ Confirm Replacement" : "✅ Add Candidate"}
                        </button>
                        <button onClick={resetPanel} style={{
                          padding: "10px 16px", borderRadius: 10,
                          background: "transparent", color: COLORS.muted,
                          border: `1px solid ${COLORS.border}`,
                          fontSize: "0.88rem", fontWeight: 700, cursor: "pointer"
                        }}>Cancel</button>

                        {activeAssignment && (
                          <span style={{ fontSize: "0.80rem", color: COLORS.muted, marginLeft: 4 }}>
                            Chest #{activeAssignment.candidate.chestNumber || "none"} will be reassigned
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedInst && !loading && programs.length === 0 && (
        <div style={{
          textAlign: "center", padding: "48px 24px",
          color: COLORS.muted, fontSize: "0.95rem"
        }}>
          No programs found for this institution.
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.muted }}>
          Loading…
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        select option { background: #1e293b; color: #f1f5f9; }
      `}</style>
    </div>
  );
}
