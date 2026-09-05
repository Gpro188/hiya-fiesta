"use client";

import { useState } from "react";

interface ProgramItem {
  id: string;
  candidateName: string;
  chestNumber: string | null;
  uid: string | null;
  categoryName: string;
  programName: string;
  programCode: string | null;
  stageType: "OFF_STAGE" | "ON_STAGE" | string;
  type: string;
}

interface StageRegistrationClientProps {
  festName: string;
  team: {
    id: string;
    name: string;
    prefixCode?: string;
    isAssignmentsConfirmed: boolean;
    offStageUnlocked: boolean;
    onStageUnlocked: boolean;
    institution?: {
      id: string;
      name: string;
      code?: string | null;
      place?: string | null;
      zone?: { name: string } | null;
    } | null;
    event?: {
      id: string;
      name: string;
    } | null;
  };
  totalCandidates: number;
  offStageItems: ProgramItem[];
  onStageItems: ProgramItem[];
  allTeams?: Array<{ id: string; name: string }>;
  canSwitchTeams?: boolean;
}

export default function StageRegistrationClient({
  festName,
  team,
  totalCandidates,
  offStageItems,
  onStageItems,
  allTeams = [],
  canSwitchTeams = false
}: StageRegistrationClientProps) {
  const [filter, setFilter] = useState<"ALL" | "OFF_STAGE" | "ON_STAGE">("ALL");
  const [copied, setCopied] = useState(false);

  const institutionName = team.institution?.name || team.name;
  const zoneName = team.institution?.zone?.name || "Zone";
  const isConfirmed = team.isAssignmentsConfirmed;

  // Build WhatsApp text representation
  const generateWhatsAppText = () => {
    let text = `🌟 *${festName.toUpperCase()}* 🌟\n`;
    text += `📋 *REGISTRATION STATUS REPORT*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏛️ *Institution:* ${institutionName}\n`;
    if (team.institution?.place) text += `📍 *Place:* ${team.institution.place}\n`;
    text += `🗺️ *Zone:* ${zoneName}\n`;
    text += `👥 *Total Candidates:* ${totalCandidates}\n`;
    text += `🔒 *Overall Status:* ${isConfirmed ? "✅ CONFIRMED" : "⏳ IN PROGRESS"}\n`;
    text += `📝 *Off-Stage Programs:* ${offStageItems.length} registrations\n`;
    text += `🎭 *On-Stage Programs:* ${onStageItems.length} registrations\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (filter === "ALL" || filter === "OFF_STAGE") {
      text += `📝 *OFF-STAGE REGISTRATIONS (${offStageItems.length})*\n`;
      if (offStageItems.length === 0) {
        text += `_No off-stage programs assigned_\n`;
      } else {
        offStageItems.forEach((item, idx) => {
          const idInfo = item.chestNumber ? `Chest: ${item.chestNumber}` : item.uid ? `UID: ${item.uid}` : "";
          text += `${idx + 1}. *${item.programName}* [${item.categoryName}]\n`;
          text += `   👤 ${item.candidateName} ${idInfo ? `(${idInfo})` : ""}\n`;
        });
      }
      text += `\n`;
    }

    if (filter === "ALL" || filter === "ON_STAGE") {
      text += `🎭 *ON-STAGE REGISTRATIONS (${onStageItems.length})*\n`;
      if (onStageItems.length === 0) {
        text += `_No on-stage programs assigned_\n`;
      } else {
        onStageItems.forEach((item, idx) => {
          const idInfo = item.chestNumber ? `Chest: ${item.chestNumber}` : item.uid ? `UID: ${item.uid}` : "";
          text += `${idx + 1}. *${item.programName}* [${item.categoryName}]\n`;
          text += `   👤 ${item.candidateName} ${idInfo ? `(${idInfo})` : ""}\n`;
        });
      }
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🌐 Verified from Official CSWC Portal\n`;
    text += `📅 Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;

    return text;
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleCopyText = async () => {
    try {
      const text = generateWhatsAppText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const showOffStage = filter === "ALL" || filter === "OFF_STAGE";
  const showOnStage = filter === "ALL" || filter === "ON_STAGE";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", padding: "20px" }}>
      {/* Control bar - Hidden on print */}
      <div 
        className="no-print" 
        style={{ 
          maxWidth: "1100px", 
          margin: "0 auto 20px auto", 
          backgroundColor: "#ffffff", 
          padding: "16px 20px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {canSwitchTeams && allTeams.length > 1 && (
            <select
              defaultValue={team.id}
              onChange={(e) => {
                window.location.href = `/print/stage-registrations?teamId=${e.target.value}`;
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                fontSize: "0.9rem",
                fontWeight: 600
              }}
            >
              {allTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Stage Filter tabs */}
          <div style={{ display: "inline-flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
            <button
              onClick={() => setFilter("ALL")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: filter === "ALL" ? "#ffffff" : "transparent",
                color: filter === "ALL" ? "#0f172a" : "#64748b",
                boxShadow: filter === "ALL" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              All ({offStageItems.length + onStageItems.length})
            </button>
            <button
              onClick={() => setFilter("OFF_STAGE")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: filter === "OFF_STAGE" ? "#8E0033" : "transparent",
                color: filter === "OFF_STAGE" ? "#ffffff" : "#64748b",
                boxShadow: filter === "OFF_STAGE" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              📝 Off-Stage ({offStageItems.length})
            </button>
            <button
              onClick={() => setFilter("ON_STAGE")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                backgroundColor: filter === "ON_STAGE" ? "#2563eb" : "transparent",
                color: filter === "ON_STAGE" ? "#ffffff" : "#64748b",
                boxShadow: filter === "ON_STAGE" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
              }}
            >
              🎭 On-Stage ({onStageItems.length})
            </button>
          </div>
        </div>

        {/* Action Buttons: WhatsApp Share, Copy Text, Print PDF */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleShareWhatsApp}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              backgroundColor: "#25D366",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(37, 211, 102, 0.3)"
            }}
          >
            <span>📱</span> Share on WhatsApp
          </button>

          <button
            onClick={handleCopyText}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            <span>📋</span> {copied ? "✅ Copied!" : "Copy WhatsApp Text"}
          </button>

          <button
            onClick={() => window.print()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              backgroundColor: "#8E0033",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(142, 0, 51, 0.25)"
            }}
          >
            <span>🖨️</span> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div 
        className="printable-document" 
        style={{ 
          maxWidth: "1100px", 
          margin: "0 auto", 
          backgroundColor: "#ffffff", 
          padding: "36px 40px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)"
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "20px", marginBottom: "24px" }}>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "1.8rem", color: "#8E0033", fontWeight: 800 }}>
            {festName}
          </h1>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", textTransform: "uppercase", letterSpacing: "1px", color: "#1e293b", fontWeight: 700 }}>
            Off-Stage & On-Stage Registration Status Report
          </h2>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
            {institutionName}
          </div>
          {team.institution?.place && (
            <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
              {team.institution.place} • Zone: {zoneName}
            </div>
          )}
        </div>

        {/* Summary Info Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "28px" }}>
          <div style={{ padding: "14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 600 }}>Total Candidates</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{totalCandidates}</div>
          </div>

          <div style={{ padding: "14px", borderRadius: "8px", backgroundColor: "rgba(142, 0, 51, 0.04)", border: "1px solid rgba(142, 0, 51, 0.2)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#8E0033", fontWeight: 600 }}>Off-Stage Registrations</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#8E0033" }}>{offStageItems.length}</div>
          </div>

          <div style={{ padding: "14px", borderRadius: "8px", backgroundColor: "rgba(37, 99, 235, 0.04)", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#2563eb", fontWeight: 600 }}>On-Stage Registrations</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb" }}>{onStageItems.length}</div>
          </div>

          <div style={{ padding: "14px", borderRadius: "8px", backgroundColor: isConfirmed ? "rgba(34, 197, 94, 0.06)" : "rgba(245, 158, 11, 0.06)", border: isConfirmed ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: isConfirmed ? "#16a34a" : "#d97706", fontWeight: 600 }}>Registration Status</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: isConfirmed ? "#16a34a" : "#d97706", marginTop: "4px" }}>
              {isConfirmed ? "✅ CONFIRMED" : "⏳ IN PROGRESS"}
            </div>
          </div>
        </div>

        {/* Section 1: Off-Stage Registrations */}
        {showOffStage && (
          <div style={{ marginBottom: "36px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #8E0033", paddingBottom: "8px", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#8E0033", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📝</span> Off-Stage Competition Registrations ({offStageItems.length})
              </h3>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#8E0033", backgroundColor: "rgba(142, 0, 51, 0.08)", padding: "2px 8px", borderRadius: "4px" }}>
                OFF-STAGE
              </span>
            </div>

            {offStageItems.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "8px", color: "#64748b", fontStyle: "italic", border: "1px dashed #cbd5e1" }}>
                No candidates registered for Off-Stage programs.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #cbd5e1" }}>
                    <th style={{ padding: "10px 8px", textAlign: "center", width: "40px", color: "#475569" }}>#</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569" }}>Program Name</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", width: "110px", color: "#475569" }}>Category</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569" }}>Candidate Name</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", width: "120px", color: "#475569" }}>UID / Chest #</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", width: "100px", color: "#475569" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {offStageItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                        {item.programName}
                        {item.programCode && <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "6px" }}>({item.programCode})</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", fontWeight: 600, color: "#334155" }}>
                          {item.categoryName}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>
                        {item.candidateName}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "0.85rem", color: "#334155" }}>
                        {item.chestNumber ? (
                          <strong style={{ color: "#8E0033" }}>{item.chestNumber}</strong>
                        ) : item.uid ? (
                          item.uid
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          padding: "3px 8px", 
                          borderRadius: "9999px", 
                          fontWeight: 700,
                          backgroundColor: isConfirmed ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
                          color: isConfirmed ? "#16a34a" : "#d97706"
                        }}>
                          {isConfirmed ? "Confirmed" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Section 2: On-Stage Registrations */}
        {showOnStage && (
          <div style={{ marginBottom: "36px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #2563eb", paddingBottom: "8px", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#2563eb", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🎭</span> On-Stage Competition Registrations ({onStageItems.length})
              </h3>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#2563eb", backgroundColor: "rgba(37, 99, 235, 0.08)", padding: "2px 8px", borderRadius: "4px" }}>
                ON-STAGE
              </span>
            </div>

            {onStageItems.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "8px", color: "#64748b", fontStyle: "italic", border: "1px dashed #cbd5e1" }}>
                No candidates registered for On-Stage programs.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #cbd5e1" }}>
                    <th style={{ padding: "10px 8px", textAlign: "center", width: "40px", color: "#475569" }}>#</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569" }}>Program Name</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", width: "110px", color: "#475569" }}>Category</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569" }}>Candidate Name</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", width: "120px", color: "#475569" }}>UID / Chest #</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", width: "100px", color: "#475569" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {onStageItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                        {item.programName}
                        {item.programCode && <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "6px" }}>({item.programCode})</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", fontWeight: 600, color: "#334155" }}>
                          {item.categoryName}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>
                        {item.candidateName}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "0.85rem", color: "#334155" }}>
                        {item.chestNumber ? (
                          <strong style={{ color: "#2563eb" }}>{item.chestNumber}</strong>
                        ) : item.uid ? (
                          item.uid
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          padding: "3px 8px", 
                          borderRadius: "9999px", 
                          fontWeight: 700,
                          backgroundColor: isConfirmed ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)",
                          color: isConfirmed ? "#16a34a" : "#d97706"
                        }}>
                          {isConfirmed ? "Confirmed" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer / Signatures on Print */}
        <div style={{ marginTop: "48px", paddingTop: "20px", borderTop: "1px dashed #cbd5e1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", textAlign: "center", fontSize: "0.85rem", color: "#475569" }}>
          <div>
            <div style={{ height: "45px" }}></div>
            <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 600 }}>
              Institution Manager Signature
            </div>
          </div>
          <div>
            <div style={{ height: "45px" }}></div>
            <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 600 }}>
              Organiser / Zone Admin Signature
            </div>
          </div>
          <div>
            <div style={{ height: "45px" }}></div>
            <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 600 }}>
              Festival Controller Seal & Date
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-document {
            max-width: 100% !important;
            box-shadow: none !important;
            padding: 10mm !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
