"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PendingProgramsList({ programs }: { programs: any[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [stageFilter, setStageFilter] = useState<"ALL" | "ON_STAGE" | "OFF_STAGE">("ALL");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const router = useRouter();

  if (!programs || programs.length === 0) {
    return (
      <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--success)" }}>
        🎉 All programs have results entered!
      </div>
    );
  }

  // Helper filters
  const isOffStage = (p: any) => p.stageType === "OFF_STAGE";
  const isOnStage = (p: any) => p.stageType === "ON_STAGE" || (!p.stageType && !isOffStage(p));

  const isGeneral = (p: any) => {
    if (p.type === "GENERAL") return true;
    const cat = (p.category?.name || "").trim().toUpperCase();
    return !cat || cat.includes("GENERAL");
  };

  // Distinct categories excluding general
  const categoryNames = Array.from(
    new Set(
      programs
        .map((p) => (p.category?.name || "").trim())
        .filter((cat) => cat && !cat.toUpperCase().includes("GENERAL"))
    )
  );

  // Counts
  const onStageCount = programs.filter(isOnStage).length;
  const offStageCount = programs.filter(isOffStage).length;
  const generalCount = programs.filter(isGeneral).length;

  const filteredPrograms = programs.filter((p) => {
    // Stage type filter
    if (stageFilter === "ON_STAGE" && !isOnStage(p)) return false;
    if (stageFilter === "OFF_STAGE" && !isOffStage(p)) return false;

    // Scope / Category filter
    if (scopeFilter === "GENERAL") {
      if (!isGeneral(p)) return false;
    } else if (scopeFilter !== "ALL") {
      if ((p.category?.name || "").trim().toUpperCase() !== scopeFilter.toUpperCase()) return false;
    }

    return true;
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-outline"
        style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
      >
        View {programs.length} Pending Programs
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Header and Hide toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
          Showing <strong>{filteredPrograms.length}</strong> of {programs.length}
        </span>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.78rem" }}
        >
          Hide List ▲
        </button>
      </div>

      {/* Filter 1: Stage Type (On-Stage vs Off-Stage) */}
      <div>
        <div style={{ fontSize: "0.70rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
          Stage Type:
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: `All (${programs.length})` },
            { id: "ON_STAGE", label: `🎭 On-Stage (${onStageCount})` },
            { id: "OFF_STAGE", label: `📝 Off-Stage (${offStageCount})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStageFilter(item.id as any)}
              style={{
                padding: "3px 9px",
                borderRadius: "9999px",
                border: "none",
                fontSize: "0.72rem",
                fontWeight: 800,
                cursor: "pointer",
                background: stageFilter === item.id ? "#8E0033" : "rgba(142, 0, 51, 0.08)",
                color: stageFilter === item.id ? "#ffffff" : "#8E0033",
                transition: "all 0.15s ease",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter 2: Category / General Scope */}
      <div>
        <div style={{ fontSize: "0.70rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
          Category / Scope:
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          <button
            onClick={() => setScopeFilter("ALL")}
            style={{
              padding: "3px 9px",
              borderRadius: "9999px",
              border: "none",
              fontSize: "0.72rem",
              fontWeight: 800,
              cursor: "pointer",
              background: scopeFilter === "ALL" ? "#0284c7" : "rgba(2, 132, 199, 0.08)",
              color: scopeFilter === "ALL" ? "#ffffff" : "#0284c7",
              transition: "all 0.15s ease",
            }}
          >
            All
          </button>
          <button
            onClick={() => setScopeFilter("GENERAL")}
            style={{
              padding: "3px 9px",
              borderRadius: "9999px",
              border: "none",
              fontSize: "0.72rem",
              fontWeight: 800,
              cursor: "pointer",
              background: scopeFilter === "GENERAL" ? "#059669" : "rgba(5, 150, 105, 0.08)",
              color: scopeFilter === "GENERAL" ? "#ffffff" : "#059669",
              transition: "all 0.15s ease",
            }}
          >
            🌐 General ({generalCount})
          </button>
          {categoryNames.map((cat) => {
            const count = programs.filter(
              (p) => (p.category?.name || "").trim().toUpperCase() === cat.toUpperCase()
            ).length;
            const isSelected = scopeFilter.toUpperCase() === cat.toUpperCase();
            return (
              <button
                key={cat}
                onClick={() => setScopeFilter(cat)}
                style={{
                  padding: "3px 9px",
                  borderRadius: "9999px",
                  border: "none",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  background: isSelected ? "#7c3aed" : "rgba(124, 58, 237, 0.08)",
                  color: isSelected ? "#ffffff" : "#7c3aed",
                  transition: "all 0.15s ease",
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Program Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "420px", overflowY: "auto", paddingRight: "2px" }}>
        {filteredPrograms.length === 0 ? (
          <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.80rem" }}>
            No pending programs match the selected filters.
          </div>
        ) : (
          filteredPrograms.map((program) => {
            const off = isOffStage(program);
            return (
              <button
                key={program.id}
                onClick={() => {
                  router.push(`?programId=${program.id}#scoring-form`);
                }}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  backgroundColor: "rgba(239, 68, 68, 0.04)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  gap: "8px",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.10)")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.04)")}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                    {program.programCode && (
                      <span
                        style={{
                          background: "#8E003318",
                          color: "#8E0033",
                          border: "1px solid #8E003333",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                        }}
                      >
                        #{program.programCode}
                      </span>
                    )}
                    <span
                      style={{
                        background: off ? "rgba(2, 132, 199, 0.12)" : "rgba(16, 185, 129, 0.12)",
                        color: off ? "#0284c7" : "#059669",
                        border: `1px solid ${off ? "rgba(2, 132, 199, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                      }}
                    >
                      {off ? "📝 OFF" : "🎭 ON"}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "0.86rem", color: "var(--text-primary)" }}>
                      {program.name}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {program.category?.name || "General"} • {program.type || "INDIVIDUAL"} • {program._count?.assignments || 0} Candidates
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.70rem",
                    color: "var(--error)",
                    fontWeight: 900,
                    flexShrink: 0,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                  }}
                >
                  ENTER →
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
