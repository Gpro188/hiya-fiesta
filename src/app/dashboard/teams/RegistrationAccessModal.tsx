"use client";

import { useState } from "react";
import { updateTeamRegistrationAccess } from "./actions";

interface TeamProps {
  id: string;
  name: string;
  prefixCode: string;
  isAssignmentsConfirmed: boolean;
  isOnStageConfirmed?: boolean;
  offStageUnlocked?: boolean;
  onStageUnlocked?: boolean;
  registrationUnlocked?: boolean;
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

export default function RegistrationAccessModal({
  team,
  onClose,
  onUpdated,
}: {
  team: TeamProps;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [selectedType, setSelectedType] = useState<"OFF_STAGE" | "ON_STAGE" | "BOTH" | "LOCK">("OFF_STAGE");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const offDeadline =
    team.event?.offStageRegistrationEnd ||
    team.event?.parent?.offStageRegistrationEnd ||
    team.event?.institutionRegistrationEndDate ||
    team.event?.parent?.institutionRegistrationEndDate ||
    team.event?.registrationEnd ||
    team.event?.parent?.registrationEnd;

  const onDeadline =
    team.event?.onStageRegistrationEnd ||
    team.event?.parent?.onStageRegistrationEnd ||
    team.event?.institutionRegistrationEndDate ||
    team.event?.parent?.institutionRegistrationEndDate ||
    team.event?.registrationEnd ||
    team.event?.parent?.registrationEnd;

  const isOffDeadlinePassed = offDeadline ? now > new Date(offDeadline) : false;
  const isOnDeadlinePassed = onDeadline ? now > new Date(onDeadline) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateTeamRegistrationAccess(team.id, selectedType, reason);
    if (res.success) {
      alert(`✅ Registration access updated successfully for "${team.name}"!`);
      if (onUpdated) onUpdated();
      onClose();
      window.location.reload();
    } else {
      setError(res.error || "Failed to update access");
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
          maxWidth: "540px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          color: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc", fontWeight: 700 }}>
              ⚡ Manage Registration Access
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#94a3b8" }}>
              {team.name} ({team.prefixCode})
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

        {/* Current Status Pills */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "0.85rem",
            marginBottom: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "2px" }}>🎨 Off-Stage Status</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
              {team.offStageUnlocked ? (
                <span style={{ color: "#10b981" }}>⚡ Unlocked (Zone Override)</span>
              ) : team.isAssignmentsConfirmed ? (
                <span style={{ color: "#ef4444" }}>🔒 Locked (Confirmed)</span>
              ) : isOffDeadlinePassed ? (
                <span style={{ color: "#ef4444" }}>🔒 Closed by Deadline</span>
              ) : (
                <span style={{ color: "#3b82f6" }}>🟢 Open</span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "2px" }}>🎭 On-Stage Status</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
              {team.onStageUnlocked ? (
                <span style={{ color: "#10b981" }}>⚡ Unlocked (Zone Override)</span>
              ) : team.isOnStageConfirmed ? (
                <span style={{ color: "#ef4444" }}>🔒 Locked (Confirmed)</span>
              ) : isOnDeadlinePassed ? (
                <span style={{ color: "#ef4444" }}>🔒 Closed by Deadline</span>
              ) : (
                <span style={{ color: "#3b82f6" }}>🟢 Open</span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "#e2e8f0" }}>
              Select Access Type to Grant:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: selectedType === "OFF_STAGE" ? "rgba(142, 0, 51, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedType === "OFF_STAGE" ? "#d81b60" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="radio"
                  name="accessType"
                  value="OFF_STAGE"
                  checked={selectedType === "OFF_STAGE"}
                  onChange={() => setSelectedType("OFF_STAGE")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f43f5e" }}>🎨 Open OFF-STAGE Only</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                    Institution can add, remove, and modify OFF-STAGE program assignments. ON-STAGE programs will remain locked if closed.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: selectedType === "ON_STAGE" ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedType === "ON_STAGE" ? "#3b82f6" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="radio"
                  name="accessType"
                  value="ON_STAGE"
                  checked={selectedType === "ON_STAGE"}
                  onChange={() => setSelectedType("ON_STAGE")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#60a5fa" }}>🎭 Open ON-STAGE Only</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                    Institution can add, remove, and modify ON-STAGE program assignments. Previously confirmed OFF-STAGE programs and chest numbers remain strictly locked and safe.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: selectedType === "BOTH" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedType === "BOTH" ? "#10b981" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="radio"
                  name="accessType"
                  value="BOTH"
                  checked={selectedType === "BOTH"}
                  onChange={() => setSelectedType("BOTH")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#34d399" }}>🔓 Open Both (Full Access)</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                    Unlocks student roster registration and both off-stage and on-stage program allocations for complete editing.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: selectedType === "LOCK" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedType === "LOCK" ? "#ef4444" : "rgba(255, 255, 255, 0.1)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="radio"
                  name="accessType"
                  value="LOCK"
                  checked={selectedType === "LOCK"}
                  onChange={() => setSelectedType("LOCK")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f87171" }}>🔒 Lock Registration</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                    Locks the institution&apos;s registration and assignments completely. Overrides any previous unlocks.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.4rem", color: "#e2e8f0" }}>
              Reason / Remarks (Optional):
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
                padding: "0.5rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                backgroundColor: selectedType === "LOCK" ? "#dc2626" : "var(--primary)",
              }}
            >
              {loading ? "Applying..." : "Apply Access Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
