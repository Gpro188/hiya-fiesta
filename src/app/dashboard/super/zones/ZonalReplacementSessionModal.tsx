"use client";

import { useState } from "react";
import { updateZonalReplacementSession } from "./actions";

export interface ZoneOption {
  id: string;
  name: string;
  code: string;
  totalInstitutions?: number;
  totalCandidates?: number;
  isOffStageSessionActive?: boolean;
  isOnStageSessionActive?: boolean;
  offStageSessionEnd?: string | Date | null;
  onStageSessionEnd?: string | Date | null;
  events?: Array<{
    id: string;
    offStageRegistrationEnd?: string | Date | null;
    onStageRegistrationEnd?: string | Date | null;
  }>;
}

function toLocalInputString(date?: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultEndTime(hoursAhead: number = 3): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  return toLocalInputString(d);
}

export default function ZonalReplacementSessionModal({
  zones,
  initialZoneId = "ALL",
  onClose,
  onUpdated,
}: {
  zones: ZoneOption[];
  initialZoneId?: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialZoneId);
  const [stageType, setStageType] = useState<"OFF_STAGE" | "ON_STAGE" | "BOTH" | "LOCK">("OFF_STAGE");
  const [enableSchedule, setEnableSchedule] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>(toLocalInputString(new Date()));
  const [endDate, setEndDate] = useState<string>(getDefaultEndTime(3));
  const [resetConfirmation, setResetConfirmation] = useState<boolean>(true);
  const [reason, setReason] = useState<string>("Official Zonal Candidate Replacement Session");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const isAll = selectedZoneId === "ALL";

  // Presets
  const applyPresetHours = (hours: number) => {
    const start = new Date();
    const end = new Date();
    end.setHours(end.getHours() + hours);
    setStartDate(toLocalInputString(start));
    setEndDate(toLocalInputString(end));
    setEnableSchedule(true);
  };

  const applyPresetTonight = () => {
    const start = new Date();
    const end = new Date();
    end.setHours(23, 59, 0, 0);
    setStartDate(toLocalInputString(start));
    setEndDate(toLocalInputString(end));
    setEnableSchedule(true);
  };

  const applyPresetTomorrowNoon = () => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 1);
    end.setHours(12, 0, 0, 0);
    setStartDate(toLocalInputString(start));
    setEndDate(toLocalInputString(end));
    setEnableSchedule(true);
  };

  const applyPresetTomorrowMidnight = () => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 1);
    end.setHours(23, 59, 0, 0);
    setStartDate(toLocalInputString(start));
    setEndDate(toLocalInputString(end));
    setEnableSchedule(true);
  };

  const applyPresetIndefinite = () => {
    setEnableSchedule(false);
    setStartDate("");
    setEndDate("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (stageType !== "LOCK" && enableSchedule) {
      if (!startDate || !endDate) {
        setError("Please provide both Start Time and End Time for the scheduled session.");
        setLoading(false);
        return;
      }
      if (new Date(startDate) >= new Date(endDate)) {
        setError("Session End Time must be after Start Time.");
        setLoading(false);
        return;
      }
    }

    const scheduleWindow =
      enableSchedule && stageType !== "LOCK" ? { startDate, endDate } : undefined;

    const res = await updateZonalReplacementSession({
      zoneId: selectedZoneId,
      stageType,
      scheduleWindow,
      reason,
      resetConfirmation,
    });

    if (res.success) {
      const zoneLabel = isAll ? "ALL ZONES" : selectedZone?.name || selectedZoneId;
      alert(`✅ Replacement session updated successfully for ${zoneLabel}! (${res.affectedTeams} institutions affected)`);
      if (onUpdated) onUpdated();
      onClose();
      window.location.reload();
    } else {
      setError(res.error || "Failed to update zonal replacement session.");
      setLoading(false);
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
          maxWidth: "620px",
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
              <span style={{ fontSize: "1.4rem" }}>⏱️</span>
              <h3 style={{ margin: 0, color: "#f43f5e", fontSize: "1.2rem", fontWeight: 800 }}>
                Zonal Replacement Session Control
              </h3>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#9ca3af" }}>
              Schedule or open candidate replacement & edit sessions for entire zones.
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* 1. Target Zone Selection */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#d1d5db", marginBottom: "6px" }}>
              🎯 Target Zone (Scope):
            </label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: "#1f2937",
                border: "1.5px solid #4b5563",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 700,
              }}
            >
              <option value="ALL">🌐 All Regional Zones (Entire Festival Bulk Session)</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  📍 {z.name} ({z.code}) — {z.totalInstitutions || 0} Colleges
                </option>
              ))}
            </select>
          </div>

          {/* Current Status Badge for Selected Zone */}
          {selectedZone && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "0.8rem",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", fontSize: "0.72rem" }}>
                Current Status for {selectedZone.name}:
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "2px" }}>
                <span style={{ color: selectedZone.isOffStageSessionActive ? "#38bdf8" : "#9ca3af" }}>
                  🎨 Off-Stage: {selectedZone.isOffStageSessionActive ? `🟢 Active until ${new Date(selectedZone.offStageSessionEnd!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "🔒 Closed / Normal"}
                </span>
                <span style={{ color: selectedZone.isOnStageSessionActive ? "#f472b6" : "#9ca3af" }}>
                  🎭 On-Stage: {selectedZone.isOnStageSessionActive ? `🟢 Active until ${new Date(selectedZone.onStageSessionEnd!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "🔒 Closed / Normal"}
                </span>
              </div>
            </div>
          )}

          {/* 2. Stage Selection */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#d1d5db", marginBottom: "6px" }}>
              ⚡ Stage Type to Open / Lock:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {/* Off-Stage Card */}
              <div
                onClick={() => setStageType("OFF_STAGE")}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: `2px solid ${stageType === "OFF_STAGE" ? "#0284c7" : "rgba(255,255,255,0.1)"}`,
                  backgroundColor: stageType === "OFF_STAGE" ? "rgba(2, 132, 199, 0.18)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🎨</span> Off-Stage Only
                </div>
                <div style={{ fontSize: "0.74rem", color: "#9ca3af", marginTop: "4px" }}>
                  Unlock off-stage candidate replacements. On-stage stays unchanged.
                </div>
              </div>

              {/* On-Stage Card */}
              <div
                onClick={() => setStageType("ON_STAGE")}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: `2px solid ${stageType === "ON_STAGE" ? "#db2777" : "rgba(255,255,255,0.1)"}`,
                  backgroundColor: stageType === "ON_STAGE" ? "rgba(219, 39, 119, 0.18)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#f472b6", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🎭</span> On-Stage Only
                </div>
                <div style={{ fontSize: "0.74rem", color: "#9ca3af", marginTop: "4px" }}>
                  Unlock on-stage candidate replacements. Off-stage stays locked.
                </div>
              </div>

              {/* Both Stages */}
              <div
                onClick={() => setStageType("BOTH")}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: `2px solid ${stageType === "BOTH" ? "#10b981" : "rgba(255,255,255,0.1)"}`,
                  backgroundColor: stageType === "BOTH" ? "rgba(16, 185, 129, 0.18)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#34d399", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>⚡</span> Both Stages
                </div>
                <div style={{ fontSize: "0.74rem", color: "#9ca3af", marginTop: "4px" }}>
                  Full replacement session for all programs in this zone.
                </div>
              </div>

              {/* Lock / Close */}
              <div
                onClick={() => setStageType("LOCK")}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: `2px solid ${stageType === "LOCK" ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                  backgroundColor: stageType === "LOCK" ? "rgba(239, 68, 68, 0.18)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#f87171", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🔒</span> Close & Lock Session
                </div>
                <div style={{ fontSize: "0.74rem", color: "#9ca3af", marginTop: "4px" }}>
                  Immediately terminate session and lock institutions.
                </div>
              </div>
            </div>
          </div>

          {/* 3. Session Window (Only if not LOCK) */}
          {stageType !== "LOCK" && (
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#d1d5db" }}>
                  ⏳ Quick Time Presets:
                </span>
                <button
                  type="button"
                  onClick={applyPresetIndefinite}
                  style={{
                    background: "none",
                    border: "none",
                    color: !enableSchedule ? "#10b981" : "#9ca3af",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {enableSchedule ? "Switch to Indefinite" : "✓ Indefinite Selected"}
                </button>
              </div>

              {/* Preset Buttons */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                <button
                  type="button"
                  onClick={() => applyPresetHours(2)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #4b5563",
                    backgroundColor: "#1f2937",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  +2 Hours
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetHours(4)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #4b5563",
                    backgroundColor: "#1f2937",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  +4 Hours
                </button>
                <button
                  type="button"
                  onClick={applyPresetTonight}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #4b5563",
                    backgroundColor: "#1f2937",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Tonight 11:59 PM
                </button>
                <button
                  type="button"
                  onClick={applyPresetTomorrowNoon}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #4b5563",
                    backgroundColor: "#1f2937",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Tomorrow Noon (12 PM)
                </button>
                <button
                  type="button"
                  onClick={applyPresetTomorrowMidnight}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #4b5563",
                    backgroundColor: "#1f2937",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Tomorrow Midnight
                </button>
              </div>

              {/* Start & End Inputs */}
              {enableSchedule ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", marginBottom: "4px" }}>
                      🟢 Session Start Time:
                    </label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#111827",
                        border: "1px solid #4b5563",
                        color: "#fff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", marginBottom: "4px" }}>
                      🔴 Session End Time (Auto-Lock):
                    </label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#111827",
                        border: "1px solid #dc2626",
                        color: "#fff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ color: "#10b981", fontSize: "0.82rem", fontWeight: 600 }}>
                  🔓 Open Indefinitely: Registration will remain open for the selected stage until manually locked.
                </div>
              )}
            </div>
          )}

          {/* 4. Reason / Committee Note */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#d1d5db", marginBottom: "4px" }}>
              📝 Session Note / Reason:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Official candidate replacement window for medical dropouts"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563",
                color: "#fff",
                fontSize: "0.85rem",
              }}
            />
          </div>

          {/* 5. Reset Confirmation Checkbox */}
          {stageType !== "LOCK" && (
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#d1d5db", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#8E0033" }}
              />
              <span>
                <strong>Allow Re-Submission:</strong> Temporarily unmarks final submission so colleges can replace candidates and re-confirm. Existing chest numbers stay intact!
              </span>
            </label>
          )}

          {/* Summary Box */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: stageType === "LOCK" ? "rgba(239, 68, 68, 0.08)" : "rgba(14, 165, 233, 0.08)",
              border: `1px solid ${stageType === "LOCK" ? "rgba(239, 68, 68, 0.25)" : "rgba(14, 165, 233, 0.25)"}`,
              fontSize: "0.8rem",
              color: stageType === "LOCK" ? "#fca5a5" : "#7dd3fc",
            }}
          >
            {stageType === "LOCK" ? (
              <span>
                🔒 <strong>Locking Action:</strong> This will close all replacement sessions and lock all institutions in <strong>{isAll ? "All Regional Zones" : selectedZone?.name}</strong>.
              </span>
            ) : (
              <span>
                ⏱️ <strong>Session Scope:</strong> This will open candidate replacement for <strong>{stageType === "BOTH" ? "Both Off-Stage & On-Stage" : stageType === "OFF_STAGE" ? "Off-Stage Programs" : "On-Stage Programs"}</strong> in <strong>{isAll ? "All Regional Zones" : selectedZone?.name}</strong>
                {enableSchedule && endDate ? ` until ${new Date(endDate).toLocaleString("en-IN")}` : " indefinitely"}.
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
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
              disabled={loading}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: stageType === "LOCK" ? "#dc2626" : "#8E0033",
                color: "#fff",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(142, 0, 51, 0.3)",
              }}
            >
              {loading ? "Applying Session..." : stageType === "LOCK" ? "🔒 Lock Session Now" : "⏱️ Apply Replacement Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
