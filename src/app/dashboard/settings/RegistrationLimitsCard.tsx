"use client";

import { useState } from "react";
import { updateRegistrationLimits } from "./actions";

interface Props {
  initialSettings: any;
  role: string;
}

export default function RegistrationLimitsCard({ initialSettings, role }: Props) {
  const [maxIndividualPrograms, setMaxIndividualPrograms] = useState<number>(
    initialSettings?.maxIndividualPrograms ?? 4
  );
  const [maxIndividualOnStage, setMaxIndividualOnStage] = useState<number>(
    initialSettings?.maxIndividualOnStage ?? 2
  );
  const [maxIndividualOffStage, setMaxIndividualOffStage] = useState<number>(
    initialSettings?.maxIndividualOffStage ?? 2
  );
  const [maxGeneralTotal, setMaxGeneralTotal] = useState<number>(
    initialSettings?.maxGeneralTotal ?? 2
  );
  const [maxGeneralOnStage, setMaxGeneralOnStage] = useState<number>(
    initialSettings?.maxGeneralOnStage ?? 1
  );
  const [maxGeneralOffStage, setMaxGeneralOffStage] = useState<number>(
    initialSettings?.maxGeneralOffStage ?? 1
  );

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await updateRegistrationLimits({
        maxIndividualPrograms,
        maxIndividualOnStage,
        maxIndividualOffStage,
        maxGeneralTotal,
        maxGeneralOnStage,
        maxGeneralOffStage,
      });

      if (res.success) {
        setStatus({
          type: "success",
          message: "Candidate Program Registration Limits updated successfully!",
        });
      } else {
        setStatus({
          type: "error",
          message: res.error || "Failed to update registration limits.",
        });
      }
    } catch (err: any) {
      setStatus({
        type: "error",
        message: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="registration-limits"
      className="card"
      style={{
        border: "2px solid rgba(16, 185, 129, 0.4)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--spacing-lg)",
        backgroundColor: "rgba(16, 185, 129, 0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "var(--spacing-md)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "1.5rem" }}>🎯</span>
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--success)", fontWeight: 700 }}>
              Candidate Program Registration Limits
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "var(--success)",
                fontWeight: 600,
              }}
            >
              Super Admin / Admin
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Control per-candidate registration caps. Individual programs and General programs have completely separate limits, allowing candidates to register for both without conflict.
          </p>
        </div>
      </div>

      {status && (
        <div
          style={{
            padding: "var(--spacing-sm) var(--spacing-md)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--spacing-md)",
            backgroundColor:
              status.type === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
            color: status.type === "error" ? "var(--error)" : "var(--success)",
            border: `1px solid ${status.type === "error" ? "var(--error)" : "var(--success)"}`,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>{status.type === "error" ? "⚠️" : "✅"}</span>
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--spacing-lg)", marginBottom: "var(--spacing-lg)" }}>
          {/* SECTION 1: INDIVIDUAL PROGRAMS */}
          <div
            style={{
              padding: "var(--spacing-md)",
              backgroundColor: "var(--surface-color)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                marginBottom: "var(--spacing-md)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "8px",
              }}
            >
              <span>👤</span>
              <span>Individual Programs Limits</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Total Individual Max</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="form-input"
                  value={maxIndividualPrograms}
                  onChange={(e) => setMaxIndividualPrograms(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="field-helper">Maximum total individual programs a candidate can take (Default: 4)</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Individual On-Stage</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="form-input"
                    value={maxIndividualOnStage}
                    onChange={(e) => setMaxIndividualOnStage(parseInt(e.target.value) || 0)}
                    required
                  />
                  <span className="field-helper">Default: 2 On-Stage</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Individual Off-Stage</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="form-input"
                    value={maxIndividualOffStage}
                    onChange={(e) => setMaxIndividualOffStage(parseInt(e.target.value) || 0)}
                    required
                  />
                  <span className="field-helper">Default: 2 Off-Stage</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: GENERAL PROGRAMS */}
          <div
            style={{
              padding: "var(--spacing-md)",
              backgroundColor: "var(--surface-color)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                marginBottom: "var(--spacing-md)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "8px",
              }}
            >
              <span>🌐</span>
              <span>General Programs Limits</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Total General Max</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="form-input"
                  value={maxGeneralTotal}
                  onChange={(e) => setMaxGeneralTotal(parseInt(e.target.value) || 0)}
                  required
                />
                <span className="field-helper">Maximum total general programs (Default: 2)</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-sm)" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>General On-Stage</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    className="form-input"
                    value={maxGeneralOnStage}
                    onChange={(e) => setMaxGeneralOnStage(parseInt(e.target.value) || 0)}
                    required
                  />
                  <span className="field-helper">Default: 1 On-Stage</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>General Off-Stage</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    className="form-input"
                    value={maxGeneralOffStage}
                    onChange={(e) => setMaxGeneralOffStage(parseInt(e.target.value) || 0)}
                    required
                  />
                  <span className="field-helper">Default: 1 Off-Stage</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              backgroundColor: "var(--success)",
              borderColor: "var(--success)",
              padding: "0.6rem 1.5rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            disabled={loading}
          >
            <span>💾</span>
            <span>{loading ? "Saving Limits..." : "Save Program Registration Limits"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
