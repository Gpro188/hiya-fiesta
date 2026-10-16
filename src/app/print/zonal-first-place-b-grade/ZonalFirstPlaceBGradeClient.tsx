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
  gradeBCount?: number;
  gradeCCount?: number;
  noGradeCount?: number;
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
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const totalCount = items.length;
  const gradeBTotal = items.filter((i) => i.grade === "B").length;
  const gradeCTotal = items.filter((i) => i.grade === "C").length;
  const noGradeTotal = items.filter((i) => i.grade !== "B" && i.grade !== "C").length;

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
      if (selectedGrade === "B" && item.grade !== "B") {
        return false;
      }
      if (selectedGrade === "C" && item.grade !== "C") {
        return false;
      }
      if (selectedGrade === "NO_GRADE" && (item.grade === "B" || item.grade === "C")) {
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
  }, [items, selectedZone, selectedStatus, selectedGrade, searchQuery]);

  const handleExportCSV = () => {
    const headers = [
      "Sl No",
      "Zone",
      "Program Code",
      "Program Name",
      "Stage Type",
      "Category",
      "Winner Name",
      "Chest No",
      "Institution Code",
      "Institution Name",
      "District",
      "Marks",
      "Grade",
      "State Confirmation Status",
    ];

    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      item.zoneName,
      item.programCode,
      `"${item.programName.replace(/"/g, '""')}"`,
      item.stageType,
      item.category,
      `"${item.candidateName.replace(/"/g, '""')}"`,
      item.chestNumber || "-",
      item.institutionCode,
      `"${item.institutionName.replace(/"/g, '""')}"`,
      item.district,
      item.marks,
      item.grade,
      item.isConfirmed ? "CONFIRMED TO STATE" : "PENDING",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Zonal_1st_Place_Pending_Review_List_${festName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-before {
            page-break-before: always;
            break-before: page;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 9pt !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 5px 6px !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 800 !important;
          }
        }
      `}</style>

      {/* Top Interactive Navbar (Screen Only) */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/dashboard/reports"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#475569",
                backgroundColor: "#f1f5f9",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              ← Back to Print Hub
            </Link>
            <Link
              href="/dashboard/promotions"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#8E0033",
                backgroundColor: "#fdf2f8",
                borderRadius: "6px",
                textDecoration: "none",
                border: "1px solid #fbcfe8",
              }}
            >
              ⚡ Manage State Promotions
            </Link>
            <div style={{ borderLeft: "1px solid #cbd5e1", height: "24px", margin: "0 4px" }} />
            <div>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#8E0033" }}>
                🥇 1st Place Pending Review Register (Grade B, C & No Grade)
              </span>
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  backgroundColor: "#fef3c7",
                  color: "#92400e",
                  borderRadius: "12px",
                  fontWeight: 700,
                }}
              >
                {totalCount} Total Items
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: "8px 16px",
                backgroundColor: "#8E0033",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              🖨️ Print / Save PDF
            </button>
            <a
              href="/api/reports/zonal-first-b-grade-excel"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 16px",
                backgroundColor: "#059669",
                color: "#ffffff",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              📥 Download Excel (.xlsx)
            </a>
            <button
              onClick={handleExportCSV}
              style={{
                padding: "8px 14px",
                backgroundColor: "#f8fafc",
                color: "#0f172a",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 24px" }}>
        {/* Printable Official Header */}
        <div
          style={{
            textAlign: "center",
            paddingBottom: "16px",
            marginBottom: "20px",
            borderBottom: "2px solid #8E0033",
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
            ZONAL 1ST PLACE PENDING REVIEW REGISTER (GRADE B, C &amp; NO GRADE)
          </div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>
            Official Audit &amp; Confirmation Roster of 1st Place Winners Securing Grade B, Grade C, or Without Grade Across All Zonal Festivals
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                Total 1st Place Pending
              </span>
              <span style={{ fontSize: "1.3rem" }}>🥇</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#8E0033", marginTop: "4px" }}>
              {totalCount} Items
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Across {zoneSummaries.length} Non-Karnataka Zones
            </div>
          </div>

          {/* Grade B */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1.5px solid #f59e0b",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#b45309", textTransform: "uppercase" }}>
                Grade B Winners
              </span>
              <span style={{ fontSize: "1.1rem", padding: "2px 8px", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "12px", fontWeight: 800 }}>
                Grade B
              </span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#b45309", marginTop: "4px" }}>
              {gradeBTotal} Items
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              1st place with Grade B
            </div>
          </div>

          {/* Grade C */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1.5px solid #e11d48",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#be123c", textTransform: "uppercase" }}>
                Grade C Winners
              </span>
              <span style={{ fontSize: "1.1rem", padding: "2px 8px", backgroundColor: "#ffe4e6", color: "#9f1239", borderRadius: "12px", fontWeight: 800 }}>
                Grade C
              </span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#be123c", marginTop: "4px" }}>
              {gradeCTotal} Items
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              1st place with Grade C
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
                Confirmed to State
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
                Pending Review
              </span>
              <span style={{ fontSize: "1.3rem" }}>🟡</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#d97706", marginTop: "4px" }}>
              {pendingTotal} Pending
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Awaiting committee promotion approval
            </div>
          </div>
        </div>

        {/* Zone Summary Table */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
          className="page-break-inside-avoid"
        >
          <div
            style={{
              padding: "14px 20px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e293b" }}>
              📊 Zone-Wise Breakdown of 1st Place Pending (Grade B, C &amp; No Grade)
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Click any zone button below to filter list
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 800, fontSize: "0.78rem", color: "#475569" }}>ZONE NAME</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, fontSize: "0.78rem", color: "#475569", textAlign: "center" }}>TOTAL PENDING</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, fontSize: "0.78rem", color: "#b45309", textAlign: "center" }}>GRADE B</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, fontSize: "0.78rem", color: "#be123c", textAlign: "center" }}>GRADE C</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, fontSize: "0.78rem", color: "#059669", textAlign: "center" }}>CONFIRMED TO STATE</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, fontSize: "0.78rem", color: "#d97706", textAlign: "center" }}>PENDING DECISION</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, fontSize: "0.78rem", color: "#475569", textAlign: "right" }}>PROGRESS</th>
                </tr>
              </thead>
              <tbody>
                {zoneSummaries.map((zs, idx) => {
                  const pct = zs.totalCount > 0 ? Math.round((zs.confirmedCount / zs.totalCount) * 100) : 0;
                  return (
                    <tr
                      key={zs.zoneName}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                      }}
                    >
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b", fontSize: "0.85rem" }}>
                        <span style={{ color: "#8E0033", marginRight: "6px" }}>📍</span>
                        {zs.zoneName}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, fontSize: "0.9rem" }}>
                        {zs.totalCount}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#b45309" }}>
                        {zs.gradeBCount ?? 0}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#be123c" }}>
                        {zs.gradeCCount ?? 0}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, color: "#059669" }}>
                        {zs.confirmedCount}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, color: "#d97706" }}>
                        {zs.pendingCount}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            backgroundColor: pct === 100 ? "#ecfdf5" : pct > 0 ? "#eff6ff" : "#fef3c7",
                            color: pct === 100 ? "#059669" : pct > 0 ? "#2563eb" : "#d97706",
                          }}
                        >
                          {pct}% Confirmed
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 900, color: "#1e293b", fontSize: "0.85rem" }}>
                    TOTAL ACROSS ALL ZONES
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900, fontSize: "1rem", color: "#8E0033" }}>
                    {totalCount}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900, color: "#b45309" }}>
                    {gradeBTotal}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900, color: "#be123c" }}>
                    {gradeCTotal}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900, color: "#059669" }}>
                    {confirmedTotal}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 900, color: "#d97706" }}>
                    {pendingTotal}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 900, color: "#1e293b" }}>
                    {totalCount > 0 ? Math.round((confirmedTotal / totalCount) * 100) : 0}% Total
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Interactive Controls & Filters (Screen Only) */}
        <div
          className="no-print"
          style={{
            backgroundColor: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
              Status:
            </span>
            <button
              onClick={() => setSelectedStatus("ALL")}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: selectedStatus === "ALL" ? "2px solid #8E0033" : "1px solid #cbd5e1",
                backgroundColor: selectedStatus === "ALL" ? "#8E0033" : "#f8fafc",
                color: selectedStatus === "ALL" ? "#ffffff" : "#334155",
                cursor: "pointer",
              }}
            >
              All Items ({totalCount})
            </button>
            <button
              onClick={() => setSelectedStatus("CONFIRMED")}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: selectedStatus === "CONFIRMED" ? "2px solid #059669" : "1px solid #cbd5e1",
                backgroundColor: selectedStatus === "CONFIRMED" ? "#059669" : "#f8fafc",
                color: selectedStatus === "CONFIRMED" ? "#ffffff" : "#334155",
                cursor: "pointer",
              }}
            >
              🟢 Confirmed to State ({confirmedTotal})
            </button>
            <button
              onClick={() => setSelectedStatus("PENDING")}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: selectedStatus === "PENDING" ? "2px solid #d97706" : "1px solid #cbd5e1",
                backgroundColor: selectedStatus === "PENDING" ? "#d97706" : "#f8fafc",
                color: selectedStatus === "PENDING" ? "#ffffff" : "#334155",
                cursor: "pointer",
              }}
            >
              🟡 Pending Review ({pendingTotal})
            </button>

            {/* Grade Filter Tabs */}
            <div style={{ borderLeft: "1px solid #cbd5e1", height: "20px", margin: "0 6px" }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
              Grade:
            </span>
            <button
              onClick={() => setSelectedGrade("ALL")}
              style={{
                padding: "5px 12px",
                borderRadius: "16px",
                fontSize: "0.78rem",
                fontWeight: 700,
                border: selectedGrade === "ALL" ? "2px solid #1e293b" : "1px solid #cbd5e1",
                backgroundColor: selectedGrade === "ALL" ? "#1e293b" : "#ffffff",
                color: selectedGrade === "ALL" ? "#ffffff" : "#334155",
                cursor: "pointer",
              }}
            >
              All Grades
            </button>
            <button
              onClick={() => setSelectedGrade("B")}
              style={{
                padding: "5px 12px",
                borderRadius: "16px",
                fontSize: "0.78rem",
                fontWeight: 700,
                border: selectedGrade === "B" ? "2px solid #b45309" : "1px solid #fde68a",
                backgroundColor: selectedGrade === "B" ? "#fef3c7" : "#ffffff",
                color: "#92400e",
                cursor: "pointer",
              }}
            >
              Grade B ({gradeBTotal})
            </button>
            <button
              onClick={() => setSelectedGrade("C")}
              style={{
                padding: "5px 12px",
                borderRadius: "16px",
                fontSize: "0.78rem",
                fontWeight: 700,
                border: selectedGrade === "C" ? "2px solid #be123c" : "1px solid #fecdd3",
                backgroundColor: selectedGrade === "C" ? "#ffe4e6" : "#ffffff",
                color: "#9f1239",
                cursor: "pointer",
              }}
            >
              Grade C ({gradeCTotal})
            </button>
            {noGradeTotal > 0 && (
              <button
                onClick={() => setSelectedGrade("NO_GRADE")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "16px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: selectedGrade === "NO_GRADE" ? "2px solid #475569" : "1px solid #cbd5e1",
                  backgroundColor: selectedGrade === "NO_GRADE" ? "#f1f5f9" : "#ffffff",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                No Grade ({noGradeTotal})
              </button>
            )}
          </div>

          {/* Zone Filter Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
              Filter by Zone:
            </span>
            <button
              onClick={() => setSelectedZone("ALL")}
              style={{
                padding: "4px 12px",
                borderRadius: "16px",
                fontSize: "0.78rem",
                fontWeight: 700,
                border: selectedZone === "ALL" ? "2px solid #1e293b" : "1px solid #cbd5e1",
                backgroundColor: selectedZone === "ALL" ? "#1e293b" : "#f8fafc",
                color: selectedZone === "ALL" ? "#ffffff" : "#475569",
                cursor: "pointer",
              }}
            >
              All Zones ({items.length})
            </button>
            {zoneSummaries.map((zs) => (
              <button
                key={zs.zoneName}
                onClick={() => setSelectedZone(zs.zoneName)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: selectedZone === zs.zoneName ? "2px solid #8E0033" : "1px solid #cbd5e1",
                  backgroundColor: selectedZone === zs.zoneName ? "#fdf2f8" : "#ffffff",
                  color: selectedZone === zs.zoneName ? "#8E0033" : "#475569",
                  cursor: "pointer",
                }}
              >
                {zs.zoneName} ({zs.totalCount})
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div>
            <input
              type="text"
              placeholder="🔍 Search candidate name, chest number, college, program code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
                backgroundColor: "#fcfcfd",
              }}
            />
          </div>
        </div>

        {/* Master Table of Results */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>
                📋 Detailed 1st Place Pending Register
              </span>
              <span style={{ fontSize: "0.82rem", color: "#64748b", marginLeft: "10px" }}>
                Showing <b>{filteredItems.length}</b> of {totalCount} programs
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "10px 10px", fontWeight: 800, fontSize: "0.75rem", color: "#475569", width: "40px", textAlign: "center" }}>#</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, fontSize: "0.75rem", color: "#475569" }}>ZONE</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, fontSize: "0.75rem", color: "#475569" }}>PROG CODE &amp; NAME</th>
                  <th style={{ padding: "10px 10px", fontWeight: 800, fontSize: "0.75rem", color: "#475569", textAlign: "center" }}>STAGE / CAT</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, fontSize: "0.75rem", color: "#475569" }}>WINNER / CANDIDATE</th>
                  <th style={{ padding: "10px 12px", fontWeight: 800, fontSize: "0.75rem", color: "#475569" }}>COLLEGE / INSTITUTION</th>
                  <th style={{ padding: "10px 10px", fontWeight: 800, fontSize: "0.75rem", color: "#475569", textAlign: "center" }}>GRADE</th>
                  <th style={{ padding: "10px 14px", fontWeight: 800, fontSize: "0.75rem", color: "#475569", textAlign: "center" }}>STATE STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                      No 1st place items found matching the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fbfcfd",
                      }}
                    >
                      <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: "0.82rem" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: "#8E0033", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {item.zoneName}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 7px",
                              backgroundColor: "#f1f5f9",
                              color: "#1e293b",
                              borderRadius: "6px",
                              fontWeight: 900,
                              fontSize: "0.78rem",
                              border: "1px solid #cbd5e1",
                            }}
                          >
                            #{item.programCode}
                          </span>
                          <span style={{ fontWeight: 800, color: "#1e293b", fontSize: "0.85rem" }}>
                            {item.programName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            backgroundColor: item.stageType === "ON_STAGE" ? "#fdf2f8" : "#f0fdf4",
                            color: item.stageType === "ON_STAGE" ? "#8E0033" : "#15803d",
                            border: `1px solid ${item.stageType === "ON_STAGE" ? "#fbcfe8" : "#bbf7d0"}`,
                          }}
                        >
                          {item.stageType === "ON_STAGE" ? "ON-STAGE" : "OFF-STAGE"}
                        </span>
                        <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px", fontWeight: 600 }}>
                          {item.category}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.88rem" }}>
                          {item.candidateName}
                        </div>
                        {item.chestNumber && (
                          <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                            Chest No: <b style={{ color: "#1e293b" }}>{item.chestNumber}</b>
                            {item.uid && <span style={{ marginLeft: "8px", color: "#94a3b8" }}>UID: {item.uid}</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 700, color: "#334155", fontSize: "0.82rem" }}>
                          {item.institutionName}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                          {item.institutionCode && <span>[{item.institutionCode}]</span>} {item.district}
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 900,
                            backgroundColor:
                              item.grade === "B"
                                ? "#fef3c7"
                                : item.grade === "C"
                                ? "#ffe4e6"
                                : "#f1f5f9",
                            color:
                              item.grade === "B"
                                ? "#92400e"
                                : item.grade === "C"
                                ? "#9f1239"
                                : "#475569",
                            border:
                              item.grade === "B"
                                ? "1px solid #fde68a"
                                : item.grade === "C"
                                ? "1px solid #fecdd3"
                                : "1px solid #cbd5e1",
                          }}
                        >
                          Grade {item.grade}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {item.isConfirmed ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              backgroundColor: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            <span>✓</span> Confirmed to State
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                            }}
                          >
                            <span>⏳</span> Pending Review
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Printable Official Signatory Footer */}
        <div
          style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1.5px dashed #cbd5e1",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            textAlign: "center",
          }}
          className="page-break-inside-avoid"
        >
          <div>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px solid #64748b", paddingTop: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
              Convenor / Results Committee
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>CSWC Hiya Fiesta 2026</div>
          </div>
          <div>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px solid #64748b", paddingTop: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
              General Secretary
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Council of Shariah Women Colleges</div>
          </div>
          <div>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px solid #64748b", paddingTop: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
              State Festival Director
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Hiya Fiesta State Finals</div>
          </div>
        </div>
      </div>
    </div>
  );
}
