"use client";

import { useState } from "react";
import { updateTeamRegistrationAccess } from "./actions";

export interface TeamProps {
  id: string;
  name: string;
  prefixCode: string;
  isAssignmentsConfirmed: boolean;
  isOnStageConfirmed?: boolean;
  offStageUnlocked?: boolean;
  onStageUnlocked?: boolean;
  registrationUnlocked?: boolean;
  offStageUnlockStart?: string | Date | null;
  offStageUnlockEnd?: string | Date | null;
  onStageUnlockStart?: string | Date | null;
  onStageUnlockEnd?: string | Date | null;
  institution?: {
    id?: string;
    name?: string | null;
    place?: string | null;
    code?: string | null;
  } | null;
  event?: {
    name: string;
    offStageRegistrationEnd?: string | Date | null;
    onStageRegistrationEnd?: string | Date | null;
    institutionRegistrationEndDate?: string | Date | null;
    registrationEnd?: string | Date | null;
    parent?: {
      offStageRegistrationEnd?: string | Date | null;
      onStageRegistrationEnd?: string | Date | null;
      institutionRegistrationEndDate?: string | Date | null;
      registrationEnd?: string | Date | null;
    } | null;
  };
}

function toLocalInputString(date?: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, '0');
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

export default function RegistrationAccessModal({
  team,
  teams = [],
  onClose,
  onUpdated,
}: {
  team: TeamProps;
  teams?: TeamProps[];
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(team.id);
  const [selectedType, setSelectedType] = useState<"OFF_STAGE" | "ON_STAGE" | "BOTH" | "LOCK">("OFF_STAGE");
  const [enableSchedule, setEnableSchedule] = useState<boolean>(true);
  
  // Set default start time to now and end time to +3 hours
  const [startDate, setStartDate] = useState<string>(toLocalInputString(new Date()));
  const [endDate, setEndDate] = useState<string>(getDefaultEndTime(3));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTeam = teams.find((t) => t.id === selectedTeamId) || team;

  const now = new Date();
  const offDeadline =
    activeTeam.event?.offStageRegistrationEnd ||
    activeTeam.event?.parent?.offStageRegistrationEnd ||
    activeTeam.event?.institutionRegistrationEndDate ||
    activeTeam.event?.parent?.institutionRegistrationEndDate ||
    activeTeam.event?.registrationEnd ||
    activeTeam.event?.parent?.registrationEnd;

  const onDeadline =
    activeTeam.event?.onStageRegistrationEnd ||
    activeTeam.event?.parent?.onStageRegistrationEnd ||
    activeTeam.event?.institutionRegistrationEndDate ||
    activeTeam.event?.parent?.institutionRegistrationEndDate ||
    activeTeam.event?.registrationEnd ||
    activeTeam.event?.parent?.registrationEnd;

  const isOffDeadlinePassed = offDeadline ? now > new Date(offDeadline) : false;
  const isOnDeadlinePassed = onDeadline ? now > new Date(onDeadline) : false;

  // Presets
  const applyPresetHours = (hours: number) => {
    const start = new Date();
    const end = new Date();
    end.setHours(end.getHours() + hours);
    setStartDate(toLocalInputString(start));
    setEndDate(toLocalInputString(end));
    setEnableSchedule(true);
  };

  const applyPresetMidnight = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (selectedType !== "LOCK" && enableSchedule) {
      if (!startDate || !endDate) {
        setError("Please enter both Start Time and End Time for the scheduled registration window.");
        setLoading(false);
        return;
      }
      if (new Date(startDate) >= new Date(endDate)) {
        setError("End Time must be after Start Time.");
        setLoading(false);
        return;
      }
    }

    const scheduleWindow = enableSchedule && selectedType !== "LOCK" ? { startDate, endDate } : undefined;
    const res = await updateTeamRegistrationAccess(selectedTeamId, selectedType, reason, scheduleWindow);
    
    if (res.success) {
      alert(`✅ Registration schedule and access updated successfully for "${activeTeam.name}"!`);
      if (onUpdated) onUpdated();
      onClose();
      window.location.reload();
    } else {
      setError(res.error || "Failed to update registration access");
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
        backgroundColor: "rgba(0, 0, 0, 0.75)",
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
          maxWidth: "580px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          color: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.3rem" }}>⏱️</span>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc", fontWeight: 800 }}>
                Schedule Institution Registration
              </h3>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              Select institution, choose Off or On-Stage, and set specific start & end times.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.5rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.85rem",
              fontWeight: 600
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. SELECT INSTITUTION */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.4rem", color: "#f1f5f9" }}>
              🏛️ 1. Select Institution:
            </label>
            {teams.length > 1 ? (
              <select
                className="form-input"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  border: "1.5px solid #0284c7",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                }}
              >
                {teams.map((t) => {
                  const instName = t.institution?.name || t.name;
                  const instPlace = t.institution?.place ? ` (${t.institution.place})` : "";
                  return (
                    <option key={t.id} value={t.id}>
                      {instName}{instPlace} — [{t.prefixCode}]
                    </option>
                  );
                })}
              </select>
            ) : (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  backgroundColor: "#1e293b",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "#f8fafc",
                }}
              >
                {activeTeam.institution?.name || activeTeam.name} [{activeTeam.prefixCode}]
              </div>
            )}
          </div>

          {/* Current Status Banner for Selected Team */}
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              marginBottom: "1.25rem",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "2px" }}>🎨 Current Off-Stage</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                {activeTeam.offStageUnlockEnd && now <= new Date(activeTeam.offStageUnlockEnd) ? (
                  <span style={{ color: "#34d399" }}>
                    ⏱️ Timed Unlock (until {new Date(activeTeam.offStageUnlockEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                ) : activeTeam.offStageUnlocked ? (
                  <span style={{ color: "#10b981" }}>⚡ Unlocked (Open)</span>
                ) : activeTeam.isAssignmentsConfirmed ? (
                  <span style={{ color: "#f87171" }}>🔒 Submitted / Locked</span>
                ) : isOffDeadlinePassed ? (
                  <span style={{ color: "#f87171" }}>🔒 Deadline Passed</span>
                ) : (
                  <span style={{ color: "#60a5fa" }}>🟢 Open</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "2px" }}>🎭 Current On-Stage</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                {activeTeam.onStageUnlockEnd && now <= new Date(activeTeam.onStageUnlockEnd) ? (
                  <span style={{ color: "#34d399" }}>
                    ⏱️ Timed Unlock (until {new Date(activeTeam.onStageUnlockEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                ) : activeTeam.onStageUnlocked ? (
                  <span style={{ color: "#10b981" }}>⚡ Unlocked (Open)</span>
                ) : activeTeam.isOnStageConfirmed ? (
                  <span style={{ color: "#f87171" }}>🔒 Submitted / Locked</span>
                ) : isOnDeadlinePassed ? (
                  <span style={{ color: "#f87171" }}>🔒 Deadline Passed</span>
                ) : (
                  <span style={{ color: "#60a5fa" }}>🟢 Open</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. SELECT STAGE */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem", color: "#f1f5f9" }}>
              🎯 2. Select Stage to Open:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.75rem",
                  backgroundColor: selectedType === "OFF_STAGE" ? "rgba(225, 29, 72, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedType === "OFF_STAGE" ? "#f43f5e" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="accessType"
                  value="OFF_STAGE"
                  checked={selectedType === "OFF_STAGE"}
                  onChange={() => setSelectedType("OFF_STAGE")}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#fb7185" }}>🎨 Off-Stage Only</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>On-Stage stays locked</div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.75rem",
                  backgroundColor: selectedType === "ON_STAGE" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedType === "ON_STAGE" ? "#3b82f6" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="accessType"
                  value="ON_STAGE"
                  checked={selectedType === "ON_STAGE"}
                  onChange={() => setSelectedType("ON_STAGE")}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#60a5fa" }}>🎭 On-Stage Only</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Off-Stage stays locked</div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.75rem",
                  backgroundColor: selectedType === "BOTH" ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedType === "BOTH" ? "#10b981" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="accessType"
                  value="BOTH"
                  checked={selectedType === "BOTH"}
                  onChange={() => setSelectedType("BOTH")}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#34d399" }}>🔓 Both Stages</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Full editing access</div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.75rem",
                  backgroundColor: selectedType === "LOCK" ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedType === "LOCK" ? "#ef4444" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="accessType"
                  value="LOCK"
                  checked={selectedType === "LOCK"}
                  onChange={() => setSelectedType("LOCK")}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#f87171" }}>🔒 Lock & Close</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>End access immediately</div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. TIME SCHEDULE (START & END TIME) */}
          {selectedType !== "LOCK" && (
            <div
              style={{
                backgroundColor: "rgba(14, 165, 233, 0.05)",
                border: "1.5px solid rgba(14, 165, 233, 0.25)",
                borderRadius: "12px",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "1rem" }}>📅</span>
                  <label style={{ fontSize: "0.875rem", fontWeight: 800, color: "#38bdf8", margin: 0 }}>
                    3. Set Registration Time Window:
                  </label>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", cursor: "pointer", color: "#cbd5e1" }}>
                  <input
                    type="checkbox"
                    checked={enableSchedule}
                    onChange={(e) => setEnableSchedule(e.target.checked)}
                  />
                  <span>Enable Auto-Lock Schedule</span>
                </label>
              </div>

              {enableSchedule ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
                        🟢 Start Time:
                      </label>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="form-input"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          backgroundColor: "#0f172a",
                          color: "#fff",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
                        🔴 End Time (Auto-Locks):
                      </label>
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="form-input"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          border: "1px solid #38bdf8",
                          backgroundColor: "#0f172a",
                          color: "#fff",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: "6px", fontWeight: 600 }}>
                      ⚡ Quick Presets (From Now):
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {[
                        { label: "+1 Hour", action: () => applyPresetHours(1) },
                        { label: "+2 Hours", action: () => applyPresetHours(2) },
                        { label: "+4 Hours", action: () => applyPresetHours(4) },
                        { label: "+8 Hours", action: () => applyPresetHours(8) },
                        { label: "Today Midnight", action: applyPresetMidnight },
                        { label: "Tomorrow 12:00 PM", action: applyPresetTomorrowNoon },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={preset.action}
                          style={{
                            padding: "3px 8px",
                            fontSize: "0.72rem",
                            borderRadius: "4px",
                            background: "rgba(56, 189, 248, 0.12)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            color: "#7dd3fc",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "#fbbf24", padding: "6px", backgroundColor: "rgba(251, 191, 36, 0.1)", borderRadius: "6px" }}>
                  ⚡ Immediate Unlock (No time limit). Registration will stay open until manually locked by an admin.
                </div>
              )}
            </div>
          )}

          {/* 4. REASON */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem", color: "#e2e8f0" }}>
              📝 Reason / Notes (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Granted 2 hours extension for off-stage essay entry"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-input"
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                color: "#fff",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                padding: "0.5rem 1.4rem",
                fontSize: "0.875rem",
                fontWeight: 800,
                backgroundColor: selectedType === "LOCK" ? "#dc2626" : "#0284c7",
                borderColor: selectedType === "LOCK" ? "#dc2626" : "#0284c7",
              }}
            >
              {loading ? "Saving Schedule..." : selectedType === "LOCK" ? "🔒 Lock Registration" : "⏱️ Apply & Open Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
