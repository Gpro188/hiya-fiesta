"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface FirstPlaceBGradeItem {
  id: string;
  programId: string;
  programCode: string;
  programName: string;
  stageType: string;
  category: string;
  zoneName: string;
  zoneCode: string;
  candidateId: string | null;
  candidateName: string;
  chestNumber: string | null;
  uid: string | null;
  photoUrl: string | null;
  institutionName: string;
  institutionCode: string;
  district: string;
  marks: number;
  grade: string;
  isConfirmed: boolean;
}

export interface ZoneBGradeSummary {
  zoneName: string;
  zoneCode: string;
  totalCount: number;
  confirmedCount: number;
  pendingCount: number;
}

export default function ZonalFirstPlaceBGradeClient({
  festName,
  items,
  zoneSummaries,
}: {
  festName: string;
  items: FirstPlaceBGradeItem[];
  zoneSummaries: ZoneBGradeSummary[];
}) {
  const [selectedZone, setSelectedZone] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const totalCount = items.length;
  const confirmedTotal = items.filter((i) => i.isConfirmed).length;
  const pendingTotal = items.filter((i) => !i.isConfirmed).length;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedZone !== "ALL" && item.zoneName !== selectedZone) {
        return false;
      }
      if (selectedStatus === "CONFIRMED" && !item.isConfirmed) {
        return false;
      }
      if (selectedStatus === "PENDING" && item.isConfirmed) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.candidateName.toLowerCase().includes(q);
        const matchesChest = (item.chestNumber || "").toLowerCase().includes(q);
        const matchesCollege =
          item.institutionName.toLowerCase().includes(q) ||
          item.institutionCode.toLowerCase().includes(q);
        const matchesProg =
          item.programName.toLowerCase().includes(q) ||
          item.programCode.toLowerCase().includes(q);
        const matchesZone = item.zoneName.toLowerCase().includes(q);

        if (!matchesName && !matchesChest && !matchesCollege && !matchesProg && !matchesZone) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedZone, selectedStatus, searchQuery]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        color: "#0f172a",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10.5pt !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .table-print {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8.5pt !important;
          }
          .table-print th, .table-print td {
            border: 1px solid #cbd5e1 !important;
            padding: 5px 7px !important;
          }
          .table-print th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Top Navigation Bar */}
      <div
        className="no-print"
        style={{
          backgroundColor: "#8E0033",
          color: "#ffffff",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 4px 12px rgba(142,0,51,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/dashboard/reports"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "0.85rem",
              padding: "6px 12px",
              borderRadius: "6px",
              backgroundColor: "rgba(255,255,255,0.15)",
              fontWeight: 700,
            }}
          >
            ← Back to Reports Hub
          </Link>
          <Link
            href="/dashboard/promotions"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "0.85rem",
              padding: "6px 12px",
              borderRadius: "6px",
              backgroundColor: "rgba(255,255,255,0.15)",
              fontWeight: 700,
            }}
          >
            ⚡ Promotions Manager
          </Link>
          <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            🥇 Zonal 1st Place with Grade B Master Register
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: "#ffffff",
              color: "#8E0033",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            🖨️ Print / Save as PDF
          </button>
          <a
            href="/api/reports/zonal-first-b-grade-excel"
            style={{
              backgroundColor: "#15803d",
              color: "#ffffff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            📊 Download Excel (.xlsx)
          </a>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        {/* Document Header */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "3px double #8E0033",
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              letterSpacing: "1.5px",
              color: "#8E0033",
              textTransform: "uppercase",
            }}
          >
            CSWC - COUNCIL OF SHARIAH WOMEN COLLEGES
          </div>
          <h1
            style={{
              margin: "4px 0",
              fontSize: "1.8rem",
              fontWeight: 900,
              color: "#1e293b",
              letterSpacing: "-0.5px",
            }}
          >
            {festName.toUpperCase()}
          </h1>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#8E0033" }}>
            ZONAL 1ST PLACE WINNERS WITH GRADE B (TOTAL REGISTER)
          </div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>
            Official Audit &amp; Confirmation Roster of 1st Place Winners Securing Grade B Across All Zonal Festivals
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginBottom: "22px",
          }}
          className="page-break-inside-avoid"
        >
          {/* Total Items */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1.5px solid #8E0033",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#8E0033", textTransform: "uppercase" }}>
                Total 1st Place (Grade B)
              </span>
              <span style={{ fontSize: "1.3rem" }}>🥇</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#8E0033", marginTop: "4px" }}>
              {totalCount} Items
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Across {zoneSummaries.length} Zonal Festivals
            </div>
          </div>

          {/* Confirmed to State */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1.5px solid #059669",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>
                Confirmed to State Final
              </span>
              <span style={{ fontSize: "1.3rem" }}>🟢</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#059669", marginTop: "4px" }}>
              {confirmedTotal} Confirmed
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Included in State Festival assignments
            </div>
          </div>

          {/* Pending Confirmation */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1.5px solid #d97706",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#d97706", textTransform: "uppercase" }}>
                Pending Confirmation
              </span>
              <span style={{ fontSize: "1.3rem" }}>🟡</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#d97706", marginTop: "4px" }}>
              {pendingTotal} Pending
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Awaiting advancement to State
            </div>
          </div>
        </div>

        {/* Zone Summary Badges (Screen) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "18px",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#475569" }}>
            Filter by Zone:
          </span>
          <button
            onClick={() => setSelectedZone("ALL")}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: selectedZone === "ALL" ? 800 : 600,
              cursor: "pointer",
              border: selectedZone === "ALL" ? "2px solid #8E0033" : "1px solid #cbd5e1",
              backgroundColor: selectedZone === "ALL" ? "#8E0033" : "#ffffff",
              color: selectedZone === "ALL" ? "#ffffff" : "#334155",
            }}
          >
            All Zones ({totalCount})
          </button>
          {zoneSummaries.map((z) => (
            <button
              key={z.zoneName}
              onClick={() => setSelectedZone(z.zoneName)}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: selectedZone === z.zoneName ? 800 : 600,
                cursor: "pointer",
                border: selectedZone === z.zoneName ? "2px solid #8E0033" : "1px solid #cbd5e1",
                backgroundColor: selectedZone === z.zoneName ? "#8E0033" : "#ffffff",
                color: selectedZone === z.zoneName ? "#ffffff" : "#334155",
              }}
            >
              {z.zoneName} ({z.totalCount})
            </button>
          ))}
        </div>

        {/* Filter Controls Bar (Screen) */}
        <div
          className="no-print"
          style={{
            backgroundColor: "#f8fafc",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            marginBottom: "18px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {/* Search Box */}
          <div style={{ flex: "1 1 240px" }}>
            <input
              type="text"
              placeholder="🔍 Search candidate, chest no, college, program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.88rem",
                fontWeight: 600,
                backgroundColor: "#ffffff",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Statuses ({items.length})</option>
              <option value="CONFIRMED">🟢 Confirmed to State ({confirmedTotal})</option>
              <option value="PENDING">🟡 Pending Confirmation ({pendingTotal})</option>
            </select>
          </div>

          {(selectedZone !== "ALL" || selectedStatus !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedZone("ALL");
                setSelectedStatus("ALL");
                setSearchQuery("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#ef4444",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ Clear
            </button>
          )}

          <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#64748b", fontWeight: 700 }}>
            Showing <strong>{filteredItems.length}</strong> of {items.length} Programs
          </div>
        </div>

        {/* Master Table */}
        <div style={{ overflowX: "auto", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #cbd5e1", padding: "16px" }}>
          <table className="table-print" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e293b", color: "#ffffff", fontSize: "0.82rem" }}>
                <th style={{ padding: "8px 10px", border: "1px solid #334155", textAlign: "center", width: "40px" }}>SL</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "120px" }}>ZONE</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "65px", textAlign: "center" }}>PROG #</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155" }}>PROGRAM NAME</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "80px", textAlign: "center" }}>STAGE</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "70px", textAlign: "center" }}>CHEST</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "200px" }}>1ST PLACE WINNER</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155" }}>COLLEGE / INSTITUTION</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "65px", textAlign: "center" }}>GRADE</th>
                <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "150px", textAlign: "center" }}>STATE STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "30px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                    No results found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                      fontSize: "0.85rem",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                    className="page-break-inside-avoid"
                  >
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, border: "1px solid #cbd5e1" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", fontWeight: 800, color: "#8E0033" }}>
                      {item.zoneName}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 800 }}>
                      <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1" }}>
                        #{item.programCode}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", fontWeight: 700, color: "#1e293b" }}>
                      {item.programName}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: 700,
                          backgroundColor: item.stageType === "ON_STAGE" ? "#f5f3ff" : "#ecfdf5",
                          color: item.stageType === "ON_STAGE" ? "#6d28d9" : "#047857",
                          border: `1px solid ${item.stageType === "ON_STAGE" ? "#ddd6fe" : "#a7f3d0"}`,
                        }}
                      >
                        {item.stageType === "ON_STAGE" ? "ON-STAGE" : "OFF-STAGE"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 800 }}>
                      {item.chestNumber ? `#${item.chestNumber}` : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{item.candidateName}</div>
                      {item.uid && <div style={{ fontSize: "0.72rem", color: "#64748b" }}>UID: {item.uid}</div>}
                    </td>
                    <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>{item.institutionName}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Code: {item.institutionCode}</div>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fde68a",
                          fontWeight: 900,
                          fontSize: "0.85rem",
                        }}
                      >
                        GRADE B
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1" }}>
                      {item.isConfirmed ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            backgroundColor: "#ecfdf5",
                            color: "#047857",
                            border: "1px solid #a7f3d0",
                            fontWeight: 800,
                            fontSize: "0.72rem",
                          }}
                        >
                          🟢 CONFIRMED
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            backgroundColor: "#fffbeb",
                            color: "#b45309",
                            border: "1px solid #fde68a",
                            fontWeight: 800,
                            fontSize: "0.72rem",
                          }}
                        >
                          🟡 PENDING
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures for Print */}
        <div style={{ marginTop: "35px", paddingTop: "20px", borderTop: "2px dashed #cbd5e1" }} className="page-break-inside-avoid">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", textAlign: "center" }}>
            <div>
              <div style={{ height: "40px" }}></div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 800, fontSize: "0.82rem" }}>
                Zonal Tabulation In-Charge
              </div>
            </div>
            <div>
              <div style={{ height: "40px" }}></div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 800, fontSize: "0.82rem" }}>
                State Selection Committee
              </div>
            </div>
            <div>
              <div style={{ height: "40px" }}></div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 800, fontSize: "0.82rem" }}>
                General Convener / President
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
