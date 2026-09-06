"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmTeamRegistration } from "./teams/actions";

export interface ZoneTeamStatus {
  id: string;
  name: string;
  prefixCode: string;
  isAssignmentsConfirmed: boolean;
  isOnStageConfirmed: boolean;
  offStageUnlocked: boolean;
  onStageUnlocked: boolean;
  magazineCode: string | null;
  isMagazineParticipating: boolean;
  institution?: {
    id: string;
    name: string;
    code: string;
    place: string | null;
    district: string | null;
  } | null;
  eventId?: string;
  candidateCount: number;
  approvedCount: number;
  chestNumberCount: number;
  offStageCount: number;
  onStageCount: number;
  totalPrograms: number;
}

export default function ZoneInstitutionStatusTable({
  teams = [],
  zoneName = "Zone",
}: {
  teams: ZoneTeamStatus[];
  zoneName?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING_OFF" | "CONFIRMED_OFF" | "PENDING_ON" | "FULLY_CONFIRMED"
  >("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter logic
  const filteredTeams = teams.filter((team) => {
    // Search filter
    const term = searchTerm.toLowerCase().trim();
    const instName = team.institution?.name?.toLowerCase() || "";
    const teamName = team.name.toLowerCase();
    const code = team.institution?.code?.toLowerCase() || "";
    const place = team.institution?.place?.toLowerCase() || "";
    const prefix = team.prefixCode.toLowerCase();

    const matchesSearch =
      !term ||
      instName.includes(term) ||
      teamName.includes(term) ||
      code.includes(term) ||
      place.includes(term) ||
      prefix.includes(term);

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === "PENDING_OFF") {
      return !team.isAssignmentsConfirmed;
    }
    if (statusFilter === "CONFIRMED_OFF") {
      return team.isAssignmentsConfirmed;
    }
    if (statusFilter === "PENDING_ON") {
      return team.isAssignmentsConfirmed && !team.isOnStageConfirmed;
    }
    if (statusFilter === "FULLY_CONFIRMED") {
      return team.isAssignmentsConfirmed && team.isOnStageConfirmed;
    }

    return true;
  });

  // Calculate high-level metrics
  const totalInstitutions = teams.length;
  const offStageConfirmedCount = teams.filter((t) => t.isAssignmentsConfirmed).length;
  const onStageConfirmedCount = teams.filter((t) => t.isOnStageConfirmed).length;
  const pendingOffStageCount = teams.filter((t) => !t.isAssignmentsConfirmed).length;
  const pendingOnStageCount = teams.filter((t) => t.isAssignmentsConfirmed && !t.isOnStageConfirmed).length;
  const fullyConfirmedCount = teams.filter((t) => t.isAssignmentsConfirmed && t.isOnStageConfirmed).length;
  const totalCandidates = teams.reduce((sum, t) => sum + t.candidateCount, 0);
  const totalChestNumbers = teams.reduce((sum, t) => sum + t.chestNumberCount, 0);
  const totalProgramAllocations = teams.reduce((sum, t) => sum + t.totalPrograms, 0);

  // Quick Approval Handler
  const handleApprove = async (teamId: string, stageType: "OFF_STAGE" | "ON_STAGE") => {
    setActionLoadingId(`${teamId}-${stageType}`);
    setToastMessage(null);

    try {
      const res = await confirmTeamRegistration(teamId, stageType);
      if (res.success) {
        setToastMessage({
          type: "success",
          text:
            stageType === "OFF_STAGE"
              ? `✅ Off-Stage confirmed for ${res.count} candidates! Magazine Code: ${res.magazineCode || "Assigned"}.`
              : `✅ On-Stage confirmed! New candidates assigned sequential chest numbers.`,
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        setToastMessage({
          type: "error",
          text: res.error || "Failed to confirm registration.",
        });
      }
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: err.message || "An unexpected error occurred.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // WhatsApp Summary Copy
  const handleCopyWhatsApp = () => {
    let text = `*📊 ${zoneName.toUpperCase()} ZONE - INSTITUTION REGISTRATION STATUS*\n`;
    text += `📅 Date: ${new Date().toLocaleDateString("en-IN")}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏛️ Total Institutions: ${totalInstitutions}\n`;
    text += `🎨 Off-Stage Confirmed: ${offStageConfirmedCount} / ${totalInstitutions}\n`;
    text += `🎭 On-Stage Confirmed: ${onStageConfirmedCount} / ${totalInstitutions}\n`;
    text += `👥 Total Registered Candidates: ${totalCandidates}\n`;
    text += `🪪 Candidates with Chest Nos: ${totalChestNumbers}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `*📋 INSTITUTION DETAILS:*\n`;
    teams.forEach((t, i) => {
      const instName = t.institution?.name || t.name;
      const place = t.institution?.place ? ` (${t.institution.place})` : "";
      const offStatus = t.isAssignmentsConfirmed ? "✅ Confirmed" : "⏳ Pending";
      const onStatus = t.isOnStageConfirmed
        ? "✅ Confirmed"
        : t.isAssignmentsConfirmed
        ? "⏳ Open/Pending"
        : "🔒 Not Ready";

      text += `${i + 1}. *${instName}${place}* [Prefix: ${t.prefixCode}]\n`;
      text += `   • Candidates: ${t.candidateCount} (Chest Nos: ${t.chestNumberCount})\n`;
      text += `   • Off-Stage: ${offStatus} (${t.offStageCount} entries)\n`;
      text += `   • On-Stage: ${onStatus} (${t.onStageCount} entries)\n`;
      if (t.magazineCode) {
        text += `   • Magazine Code: ${t.magazineCode}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "1.5rem",
        marginBottom: "2rem",
        borderRadius: "14px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "1.25rem",
            backgroundColor:
              toastMessage.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1.5px solid ${toastMessage.type === "success" ? "#10b981" : "#ef4444"}`,
            color: toastMessage.type === "success" ? "#065f46" : "#991b1b",
            fontSize: "0.88rem",
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "1rem",
              color: "inherit",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Top Header & WhatsApp Share */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.5rem" }}>🏛️</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
              Zone Institution Registration Status
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "10px",
                backgroundColor: "rgba(142, 0, 51, 0.1)",
                color: "#8E0033",
                fontWeight: 800,
                border: "1px solid rgba(142, 0, 51, 0.2)",
              }}
            >
              {teams.length} INSTITUTIONS
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Live tracking of candidate rosters, chest number allocation, and stage confirmations across all zone colleges.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleCopyWhatsApp}
            className="btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.45rem 1rem",
              fontSize: "0.82rem",
              backgroundColor: copied ? "#059669" : "#25D366",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "background-color 0.2s ease",
            }}
          >
            <span>{copied ? "✅" : "📲"}</span>
            {copied ? "Copied Status to Clipboard!" : "Copy WhatsApp Summary"}
          </button>

          <Link
            href="/dashboard/teams"
            className="btn btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.45rem 1rem",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            <span>🛡️</span> Manage Teams & Unlock
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.85rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            backgroundColor: "rgba(2, 132, 199, 0.06)",
            border: "1px solid rgba(2, 132, 199, 0.2)",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
            Off-Stage Confirmed
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0369a1", marginTop: "2px" }}>
            {offStageConfirmedCount} / {totalInstitutions}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {pendingOffStageCount > 0 ? `⚠️ ${pendingOffStageCount} colleges pending` : "✅ 100% Completed"}
          </div>
        </div>

        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            backgroundColor: "rgba(219, 39, 119, 0.06)",
            border: "1px solid rgba(219, 39, 119, 0.2)",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#db2777", textTransform: "uppercase" }}>
            On-Stage Confirmed
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#be185d", marginTop: "2px" }}>
            {onStageConfirmedCount} / {totalInstitutions}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {pendingOnStageCount > 0 ? `🎭 ${pendingOnStageCount} ready for On-Stage` : "Awaiting Off-Stage"}
          </div>
        </div>

        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            backgroundColor: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>
            Chest Numbers Issued
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#047857", marginTop: "2px" }}>
            {totalChestNumbers} / {totalCandidates}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {totalCandidates - totalChestNumbers > 0
              ? `${totalCandidates - totalChestNumbers} awaiting generation`
              : "All candidates numbered"}
          </div>
        </div>

        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            backgroundColor: "rgba(245, 158, 11, 0.06)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#d97706", textTransform: "uppercase" }}>
            Program Allocations
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#b45309", marginTop: "2px" }}>
            {totalProgramAllocations}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Across all categories
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "1.25rem",
        }}
      >
        {/* Status Filter Buttons */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: statusFilter === "ALL" ? "1.5px solid #8E0033" : "1px solid var(--border)",
              backgroundColor: statusFilter === "ALL" ? "#8E0033" : "rgba(255,255,255,0.04)",
              color: statusFilter === "ALL" ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            All ({totalInstitutions})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING_OFF")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: statusFilter === "PENDING_OFF" ? "1.5px solid #d97706" : "1px solid var(--border)",
              backgroundColor: statusFilter === "PENDING_OFF" ? "#d97706" : "rgba(255,255,255,0.04)",
              color: statusFilter === "PENDING_OFF" ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            ⚠️ Pending Off-Stage ({pendingOffStageCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("CONFIRMED_OFF")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: statusFilter === "CONFIRMED_OFF" ? "1.5px solid #0284c7" : "1px solid var(--border)",
              backgroundColor: statusFilter === "CONFIRMED_OFF" ? "#0284c7" : "rgba(255,255,255,0.04)",
              color: statusFilter === "CONFIRMED_OFF" ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            🎨 Off-Stage Confirmed ({offStageConfirmedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING_ON")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: statusFilter === "PENDING_ON" ? "1.5px solid #db2777" : "1px solid var(--border)",
              backgroundColor: statusFilter === "PENDING_ON" ? "#db2777" : "rgba(255,255,255,0.04)",
              color: statusFilter === "PENDING_ON" ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            🎭 Ready for On-Stage ({pendingOnStageCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("FULLY_CONFIRMED")}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: statusFilter === "FULLY_CONFIRMED" ? "1.5px solid #059669" : "1px solid var(--border)",
              backgroundColor: statusFilter === "FULLY_CONFIRMED" ? "#059669" : "rgba(255,255,255,0.04)",
              color: statusFilter === "FULLY_CONFIRMED" ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            ✅ Fully Confirmed ({fullyConfirmedCount})
          </button>
        </div>

        {/* Live Search Input */}
        <div style={{ minWidth: "240px", flex: "1", maxWidth: "340px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search institution, code, place..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: "0.82rem",
              borderRadius: "6px",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Institution Status Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          className="table"
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0 6px",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.05em" }}>
              <th style={{ padding: "8px 12px", textAlign: "left" }}>Institution</th>
              <th style={{ padding: "8px 12px", textAlign: "center" }}>Candidates</th>
              <th style={{ padding: "8px 12px", textAlign: "center" }}>Chest Nos</th>
              <th style={{ padding: "8px 12px", textAlign: "center" }}>Programs</th>
              <th style={{ padding: "8px 12px", textAlign: "center" }}>Magazine</th>
              <th style={{ padding: "8px 12px", textAlign: "center" }}>Off-Stage Status</th>
              <th style={{ padding: "8px 12px", textAlign: "center" }}>On-Stage Status</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>Zone Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  No institutions found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredTeams.map((team) => {
                const isOffConfirmed = team.isAssignmentsConfirmed;
                const isOnConfirmed = team.isOnStageConfirmed;
                const hasPendingOff = team.candidateCount > 0 && !isOffConfirmed;
                const hasPendingOn = isOffConfirmed && !isOnConfirmed;

                return (
                  <tr
                    key={team.id}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    {/* Institution Name & Details */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                          {team.institution?.name || team.name}
                        </span>
                        {team.institution?.code && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              backgroundColor: "rgba(255,255,255,0.06)",
                              border: "1px solid var(--border)",
                              fontWeight: 700,
                              color: "var(--text-secondary)",
                            }}
                          >
                            #{team.institution.code}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {team.institution?.place ? `📍 ${team.institution.place}` : ""}{" "}
                        {team.institution?.district ? `• ${team.institution.district}` : ""}{" "}
                        <span style={{ color: "#8E0033", fontWeight: 700 }}>[Prefix: {team.prefixCode}]</span>
                      </div>
                    </td>

                    {/* Candidates Count */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: team.candidateCount > 0 ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                      >
                        {team.candidateCount}
                      </span>
                    </td>

                    {/* Chest Nos Status */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          backgroundColor:
                            team.chestNumberCount === team.candidateCount && team.candidateCount > 0
                              ? "rgba(16, 185, 129, 0.15)"
                              : team.chestNumberCount > 0
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(239, 68, 68, 0.1)",
                          color:
                            team.chestNumberCount === team.candidateCount && team.candidateCount > 0
                              ? "#059669"
                              : team.chestNumberCount > 0
                              ? "#d97706"
                              : "#dc2626",
                        }}
                      >
                        {team.chestNumberCount} / {team.candidateCount}
                      </span>
                    </td>

                    {/* Program Allocations */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                        <span style={{ color: "#0284c7" }}>🎨 {team.offStageCount}</span>
                        <span style={{ margin: "0 4px", color: "var(--text-muted)" }}>•</span>
                        <span style={{ color: "#db2777" }}>🎭 {team.onStageCount}</span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {team.totalPrograms} total
                      </div>
                    </td>

                    {/* Magazine */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {team.magazineCode ? (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(147, 51, 234, 0.15)",
                            color: "#7e22ce",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            border: "1px solid rgba(147, 51, 234, 0.3)",
                          }}
                        >
                          {team.magazineCode}
                        </span>
                      ) : team.isMagazineParticipating ? (
                        <span style={{ fontSize: "0.72rem", color: "#d97706", fontWeight: 700 }}>
                          📖 Enrolled
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>

                    {/* Off-Stage Badge */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {isOffConfirmed ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "#059669",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            display: "inline-block",
                          }}
                        >
                          🔒 CONFIRMED
                        </span>
                      ) : team.offStageUnlocked ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: "rgba(14, 165, 233, 0.15)",
                            color: "#0284c7",
                            border: "1px solid rgba(14, 165, 233, 0.3)",
                            display: "inline-block",
                          }}
                        >
                          ⚡ UNLOCKED
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            color: "#d97706",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            display: "inline-block",
                          }}
                        >
                          ⏳ PENDING
                        </span>
                      )}
                    </td>

                    {/* On-Stage Badge */}
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {isOnConfirmed ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "#059669",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            display: "inline-block",
                          }}
                        >
                          🔒 CONFIRMED
                        </span>
                      ) : team.onStageUnlocked ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: "rgba(236, 72, 153, 0.15)",
                            color: "#db2777",
                            border: "1px solid rgba(236, 72, 153, 0.3)",
                            display: "inline-block",
                          }}
                        >
                          ⚡ UNLOCKED
                        </span>
                      ) : isOffConfirmed ? (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: "rgba(147, 51, 234, 0.15)",
                            color: "#9333ea",
                            border: "1px solid rgba(147, 51, 234, 0.3)",
                            display: "inline-block",
                          }}
                        >
                          🟢 OPEN
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "var(--text-muted)",
                          }}
                        >
                          🔒 Waiting Off
                        </span>
                      )}
                    </td>

                    {/* Zone Quick Actions */}
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Quick Approve Off-Stage */}
                        {hasPendingOff && (
                          <button
                            type="button"
                            disabled={actionLoadingId === `${team.id}-OFF_STAGE`}
                            onClick={() => handleApprove(team.id, "OFF_STAGE")}
                            className="btn btn-primary"
                            style={{
                              padding: "3px 8px",
                              fontSize: "0.74rem",
                              backgroundColor: "#059669",
                              borderColor: "#059669",
                              color: "#fff",
                              fontWeight: 700,
                            }}
                            title="Confirm Off-Stage candidates & assign chest numbers strictly to Off-Stage participants"
                          >
                            {actionLoadingId === `${team.id}-OFF_STAGE` ? "Confirming..." : "🎨 Confirm Off-Stage"}
                          </button>
                        )}

                        {/* Quick Approve On-Stage */}
                        {hasPendingOn && (
                          <button
                            type="button"
                            disabled={actionLoadingId === `${team.id}-ON_STAGE`}
                            onClick={() => handleApprove(team.id, "ON_STAGE")}
                            className="btn btn-primary"
                            style={{
                              padding: "3px 8px",
                              fontSize: "0.74rem",
                              backgroundColor: "#db2777",
                              borderColor: "#db2777",
                              color: "#fff",
                              fontWeight: 700,
                            }}
                            title="Confirm On-Stage candidates. Students already numbered in Off-Stage keep their chest number permanently. Only new students receive new numbers."
                          >
                            {actionLoadingId === `${team.id}-ON_STAGE` ? "Confirming..." : "🎭 Confirm On-Stage"}
                          </button>
                        )}

                        {/* Print Dropdown / Quick Links */}
                        <a
                          href={`/print/candidates?teamId=${team.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{
                            padding: "3px 7px",
                            fontSize: "0.72rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                          title="Print official candidate list with chest numbers"
                        >
                          📜 List
                        </a>

                        <a
                          href={`/print/id-cards?teamId=${team.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{
                            padding: "3px 7px",
                            fontSize: "0.72rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                          title="Print candidate ID cards"
                        >
                          🪪 IDs
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
