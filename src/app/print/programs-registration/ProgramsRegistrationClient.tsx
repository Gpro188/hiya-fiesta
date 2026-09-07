"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface ZoneItem {
  id: string;
  name: string;
  code: string;
}

export interface ProgramParticipant {
  candidateId: string;
  candidateName: string;
  chestNumber: string | null;
  institutionCode: string;
  institutionName: string;
  institutionPlace: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  zoneCode?: string | null;
}

export interface ProgramRegistrationItem {
  id: string;
  programCode: string | null;
  name: string;
  type: string;
  stageType: string;
  categoryName: string;
  duration: number;
  candidatesCount: number;
  institutionsCount: number;
  zoneCounts: Record<string, number>;
  participants: ProgramParticipant[];
}

export interface ProgramsOverview {
  totalPrograms: number;
  totalCandidateRegistrations: number;
  totalIndivPrograms: number;
  totalGeneralPrograms: number;
  totalOnStagePrograms: number;
  totalOffStagePrograms: number;
  zoneTotalRegistrations: Record<string, number>;
}

export default function ProgramsRegistrationClient({
  programs,
  zones,
  overview,
  festName = "HIYA FIESTA 2026",
}: {
  programs: ProgramRegistrationItem[];
  zones: ZoneItem[];
  overview: ProgramsOverview;
  festName?: string;
}) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterZone, setFilterZone] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"CODE" | "NAME" | "MOST_REGISTERED" | "LEAST_REGISTERED">("CODE");
  const [printOrientation, setPrintOrientation] = useState<"LANDSCAPE" | "PORTRAIT">("LANDSCAPE");
  const [selectedProgramModal, setSelectedProgramModal] = useState<ProgramRegistrationItem | null>(null);
  const [modalZoneFilter, setModalZoneFilter] = useState<string>("ALL");

  const categories = useMemo(() => {
    const set = new Set<string>();
    programs.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    let list = programs.filter((p) => {
      // Category filter
      if (filterCategory !== "ALL" && p.categoryName !== filterCategory) return false;
      // Stage filter
      if (filterStage !== "ALL" && p.stageType !== filterStage) return false;
      // Type filter
      if (filterType !== "ALL" && p.type !== filterType) return false;
      // Specific Zone filter: only show programs that have at least 1 registration in that zone
      if (filterZone !== "ALL" && (!p.zoneCounts[filterZone] || p.zoneCounts[filterZone] === 0)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = p.programCode?.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = p.categoryName.toLowerCase().includes(q);
        return matchCode || matchName || matchCat;
      }
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "MOST_REGISTERED") {
        return b.candidatesCount - a.candidatesCount;
      }
      if (sortBy === "LEAST_REGISTERED") {
        return a.candidatesCount - b.candidatesCount;
      }
      if (sortBy === "NAME") {
        return a.name.localeCompare(b.name);
      }
      // default: CODE (numeric or string)
      const codeA = parseInt(a.programCode || "9999", 10);
      const codeB = parseInt(b.programCode || "9999", 10);
      if (!isNaN(codeA) && !isNaN(codeB)) {
        return codeA - codeB;
      }
      return (a.programCode || "").localeCompare(b.programCode || "");
    });

    return list;
  }, [programs, filterCategory, filterStage, filterType, filterZone, searchQuery, sortBy]);

  // Compute live column totals for filtered programs
  const columnTotals = useMemo(() => {
    const zTotals: Record<string, number> = {};
    zones.forEach((z) => {
      zTotals[z.id] = 0;
    });
    let grandCandidates = 0;

    filteredPrograms.forEach((p) => {
      grandCandidates += p.candidatesCount;
      zones.forEach((z) => {
        zTotals[z.id] += p.zoneCounts[z.id] || 0;
      });
    });

    return {
      zoneTotals: zTotals,
      grandCandidates,
    };
  }, [filteredPrograms, zones]);

  const printTimestamp = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Dynamic Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${printOrientation === "LANDSCAPE" ? "A4 landscape" : "A4 portrait"};
            margin: 6mm 6mm 8mm 6mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .table-container {
            overflow: visible !important;
            display: block !important;
            border: 1px solid #1e293b !important;
            border-radius: 0 !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-row-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 3px 4px !important;
            font-size: ${printOrientation === "LANDSCAPE" ? "7.5pt" : "7pt"} !important;
            line-height: 1.15 !important;
          }
          th {
            background-color: #e2e8f0 !important;
            color: #0f172a !important;
            font-weight: 800 !important;
          }
          .prog-name {
            font-size: 8pt !important;
            font-weight: 700 !important;
            color: #000000 !important;
          }
          .zone-num {
            font-weight: 800 !important;
            color: #0f172a !important;
          }
          .zero-val {
            color: #94a3b8 !important;
            font-weight: normal !important;
          }
          .signoff-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 14px !important;
            padding-top: 8px !important;
          }
        }
      `}</style>

      {/* Top Interactive Controls (Hidden during Print) */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "#ffffff",
          borderBottom: "2px solid #e2e8f0",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          padding: "0.85rem 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              href="/dashboard/programs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.82rem",
                color: "#64748b",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              &larr; Back to Programs
            </Link>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <Link
              href="/dashboard/reports"
              style={{
                fontSize: "0.82rem",
                color: "#64748b",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Reports Hub
            </Link>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span style={{ fontSize: "0.82rem", color: "#8E0033", fontWeight: 800 }}>
              8-Zone Master Breakdown
            </span>
          </div>
          <h2 style={{ margin: "2px 0 0 0", fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
            📊 Programs Master List with Zonal Registration Counts
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#f8fafc",
            }}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#f8fafc",
            }}
          >
            <option value="ALL">All Stages</option>
            <option value="ON_STAGE">🎭 On-Stage</option>
            <option value="OFF_STAGE">🎨 Off-Stage</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#f8fafc",
            }}
          >
            <option value="ALL">All Types</option>
            <option value="INDIVIDUAL">👤 Individual Only</option>
            <option value="GENERAL">⭐ General Only</option>
          </select>

          {/* Zone Filter */}
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.82rem",
              fontWeight: 700,
              backgroundColor: filterZone !== "ALL" ? "#eff6ff" : "#f8fafc",
              color: filterZone !== "ALL" ? "#1d4ed8" : "#0f172a",
            }}
          >
            <option value="ALL">🌐 All 8 Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                📍 {z.name} ({z.code})
              </option>
            ))}
          </select>

          {/* Print Orientation */}
          <select
            value={printOrientation}
            onChange={(e) => setPrintOrientation(e.target.value as any)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.82rem",
              fontWeight: 700,
              backgroundColor: "#f8fafc",
              color: "#0f172a",
            }}
            title="Choose orientation for Print / PDF export"
          >
            <option value="LANDSCAPE">📄 Landscape (Recommended for 8 Zones)</option>
            <option value="PORTRAIT">📄 Portrait (Compact)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.82rem",
              fontWeight: 700,
              backgroundColor: "#f8fafc",
              color: "#8E0033",
            }}
          >
            <option value="CODE">Sort by Program Code</option>
            <option value="MOST_REGISTERED">🔥 Most Registered First</option>
            <option value="LEAST_REGISTERED">📉 Least Registered First</option>
            <option value="NAME">Sort by Name</option>
          </select>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search program or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.82rem",
              width: "180px",
            }}
          />

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.48rem 1.15rem",
              borderRadius: "6px",
              backgroundColor: "#8E0033",
              color: "#ffffff",
              border: "none",
              fontWeight: 800,
              fontSize: "0.86rem",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(142,0,51,0.25)",
            }}
          >
            <span>🖨️</span> Print Master Sheet / PDF
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.25rem 1.5rem" }}>
        {/* Document Header (Clean & Official) */}
        <div
          style={{
            borderBottom: "2.5px solid #8E0033",
            paddingBottom: "0.75rem",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#8E0033", textTransform: "uppercase", letterSpacing: "1px" }}>
              STATE ARTS FESTIVAL 2026 • OFFICIAL MASTER ALLOCATION SHEET
            </div>
            <h1 style={{ margin: "2px 0 2px 0", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>
              {festName}
            </h1>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#475569" }}>
              Program-wise Zonal Candidate Registration Master Pack
            </h2>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Live registration numbers across all 8 Regional Zones, individual candidates, general teams, and participating colleges.
            </div>
          </div>

          <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748b" }}>
            <div>
              Generated: <strong>{printTimestamp}</strong>
            </div>
            <div>
              Filter: <strong>{filterCategory === "ALL" ? "All Categories" : filterCategory}</strong> | <strong>{filterStage === "ALL" ? "All Stages" : filterStage}</strong> | <strong>{filterType === "ALL" ? "All Types" : filterType}</strong>
            </div>
            <div>
              Zone Scope: <strong>{filterZone === "ALL" ? "All 8 Regional Zones" : zones.find((z) => z.id === filterZone)?.name}</strong>
            </div>
          </div>
        </div>

        {/* Quick Zonal Summary Bar (Screen & Print) */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1.5px solid #cbd5e1",
            borderRadius: "6px",
            padding: "8px 12px",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            fontSize: "0.8rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <strong>Programs:</strong> <span style={{ color: "#0f172a", fontWeight: 800 }}>{filteredPrograms.length}</span> / {overview.totalPrograms}
            </div>
            <span>•</span>
            <div>
              <strong>Total Registrations:</strong> <span style={{ color: "#8E0033", fontWeight: 900 }}>{columnTotals.grandCandidates}</span>
            </div>
            <span>•</span>
            <div>
              <strong>Individual:</strong> {overview.totalIndivPrograms} | <strong>General:</strong> {overview.totalGeneralPrograms}
            </div>
          </div>

          {/* 8-Zone Mini Quick Breakdown */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            {zones.map((z) => (
              <span
                key={z.id}
                style={{
                  display: "inline-block",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  backgroundColor: filterZone === z.id ? "#8E0033" : "#ffffff",
                  color: filterZone === z.id ? "#ffffff" : "#0f172a",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => setFilterZone(filterZone === z.id ? "ALL" : z.id)}
                title={`Click to filter: ${z.name}`}
              >
                {z.code}: <strong>{columnTotals.zoneTotals[z.id] || 0}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Programs 8-Zone Matrix Table */}
        <div className="table-container" style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #94a3b8" }}>
                <th style={{ padding: "6px 4px", textAlign: "center", width: "30px" }}>#</th>
                <th style={{ padding: "6px 4px", textAlign: "center", width: "45px" }}>Code</th>
                <th style={{ padding: "6px 8px", textAlign: "left" }}>Program Name</th>
                <th style={{ padding: "6px 4px", textAlign: "center", width: "75px" }}>Category</th>
                <th style={{ padding: "6px 4px", textAlign: "center", width: "55px" }}>Type</th>
                <th style={{ padding: "6px 4px", textAlign: "center", width: "65px" }}>Stage</th>

                {/* 8 Regional Zone Columns */}
                {zones.map((z) => (
                  <th
                    key={z.id}
                    style={{
                      padding: "6px 3px",
                      textAlign: "center",
                      width: "42px",
                      backgroundColor: filterZone === z.id ? "#fef3c7" : "#e2e8f0",
                      color: "#0f172a",
                      fontSize: "0.74rem",
                    }}
                    title={`${z.name} Zone`}
                  >
                    {z.code}
                  </th>
                ))}

                {/* Total Column */}
                <th
                  style={{
                    padding: "6px 5px",
                    textAlign: "center",
                    width: "55px",
                    backgroundColor: "#fdf2f8",
                    color: "#8E0033",
                    fontWeight: 900,
                  }}
                >
                  TOTAL
                </th>
                <th style={{ padding: "6px 4px", textAlign: "center", width: "55px" }}>Colleges</th>
                <th className="no-print" style={{ padding: "6px 4px", textAlign: "center", width: "70px" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={10 + zones.length} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                    No competition programs match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((program, idx) => {
                  return (
                    <tr
                      key={program.id}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                      }}
                    >
                      <td style={{ padding: "4px 4px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#8E0033" }}>
                        {program.programCode || "-"}
                      </td>
                      <td style={{ padding: "4px 8px", textAlign: "left" }}>
                        <div className="prog-name" style={{ fontWeight: 700, color: "#0f172a" }}>
                          {program.name}
                        </div>
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            backgroundColor: program.categoryName.includes("FADHILA") && program.categoryName.includes("FADHEELA")
                              ? "#f3e8ff"
                              : program.categoryName.includes("FADHEELA")
                              ? "#dbeafe"
                              : "#fdf2f8",
                            color: program.categoryName.includes("FADHILA") && program.categoryName.includes("FADHEELA")
                              ? "#6b21a8"
                              : program.categoryName.includes("FADHEELA")
                              ? "#1e40af"
                              : "#9d174d",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          {program.categoryName}
                        </span>
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: program.type === "GENERAL" ? "#b45309" : "#1d4ed8",
                          }}
                        >
                          {program.type === "GENERAL" ? "General" : "Indiv"}
                        </span>
                      </td>
                      <td style={{ padding: "4px 4px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: program.stageType === "ON_STAGE" ? "#047857" : "#475569",
                          }}
                        >
                          {program.stageType === "ON_STAGE" ? "On-Stage" : "Off-Stage"}
                        </span>
                      </td>

                      {/* 8 Regional Zone Values */}
                      {zones.map((z) => {
                        const cnt = program.zoneCounts[z.id] || 0;
                        return (
                          <td
                            key={z.id}
                            style={{
                              padding: "4px 3px",
                              textAlign: "center",
                              backgroundColor: filterZone === z.id ? "#fffbeb" : "transparent",
                              fontWeight: cnt > 0 ? 800 : 400,
                              color: cnt > 0 ? "#0f172a" : "#cbd5e1",
                            }}
                          >
                            {cnt > 0 ? cnt : "-"}
                          </td>
                        );
                      })}

                      {/* Total Candidates Column */}
                      <td
                        style={{
                          padding: "4px 4px",
                          textAlign: "center",
                          backgroundColor: "#fdf2f8",
                          fontWeight: 900,
                          fontSize: "0.82rem",
                          color: program.candidatesCount > 0 ? "#8E0033" : "#94a3b8",
                        }}
                      >
                        {program.candidatesCount}
                      </td>

                      {/* Participating Colleges Column */}
                      <td style={{ padding: "4px 4px", textAlign: "center", fontWeight: 700, color: "#475569" }}>
                        {program.institutionsCount}
                      </td>

                      {/* Action Button */}
                      <td className="no-print" style={{ padding: "4px 4px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProgramModal(program);
                            setModalZoneFilter("ALL");
                          }}
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            backgroundColor: "#f1f5f9",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            cursor: "pointer",
                          }}
                        >
                          👥 Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Column Sums for Each Zone */}
            <tfoot>
              <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 900, borderTop: "2px solid #94a3b8" }}>
                <td colSpan={6} style={{ padding: "6px 8px", textAlign: "right", color: "#0f172a", fontSize: "0.78rem" }}>
                  TOTAL REGISTERED CANDIDATES ({filteredPrograms.length} Programs):
                </td>

                {/* Each Zone Column Sum */}
                {zones.map((z) => (
                  <td
                    key={z.id}
                    style={{
                      padding: "6px 3px",
                      textAlign: "center",
                      color: "#0f172a",
                      fontWeight: 900,
                      backgroundColor: filterZone === z.id ? "#fef3c7" : "#e2e8f0",
                    }}
                  >
                    {columnTotals.zoneTotals[z.id] || 0}
                  </td>
                ))}

                {/* Grand Total Candidates */}
                <td
                  style={{
                    padding: "6px 5px",
                    textAlign: "center",
                    backgroundColor: "#fdf2f8",
                    color: "#8E0033",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                  }}
                >
                  {columnTotals.grandCandidates}
                </td>

                <td colSpan={2} style={{ padding: "6px 4px", textAlign: "center", fontSize: "0.72rem", color: "#64748b" }}>
                  {filteredPrograms.reduce((sum, p) => sum + p.institutionsCount, 0)} Coll. Reg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Master Summary Sign-Off Section (Prints cleanly at bottom) */}
        <div
          className="signoff-section"
          style={{
            marginTop: "2rem",
            paddingTop: "1.25rem",
            borderTop: "2px solid #0f172a",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "32px", marginBottom: "6px" }} />
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a" }}>Program Committee Head</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "32px", marginBottom: "6px" }} />
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a" }}>Stage & Venue Manager</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "32px", marginBottom: "6px" }} />
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a" }}>General Convener</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "32px", marginBottom: "6px" }} />
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a" }}>Festival Director</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Official Seal & Sign</div>
          </div>
        </div>
      </div>

      {/* Participant Roster Details Modal */}
      {selectedProgramModal && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1.5rem",
          }}
          onClick={() => setSelectedProgramModal(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              maxWidth: "850px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              padding: "1.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    backgroundColor: "#fdf2f8",
                    color: "#8E0033",
                    marginBottom: "4px",
                  }}
                >
                  Code: {selectedProgramModal.programCode || "-"} • {selectedProgramModal.categoryName} • {selectedProgramModal.stageType}
                </span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "1.3rem", fontWeight: 900, color: "#0f172a" }}>
                  {selectedProgramModal.name}
                </h3>
                <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>
                  Total Candidates: <strong>{selectedProgramModal.candidatesCount}</strong> across{" "}
                  <strong>{selectedProgramModal.institutionsCount}</strong> institutions
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProgramModal(null)}
                style={{
                  border: "none",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Zone Filter Inside Modal */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>Filter by Zone:</label>
              <select
                value={modalZoneFilter}
                onChange={(e) => setModalZoneFilter(e.target.value)}
                style={{
                  padding: "0.35rem 0.7rem",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  backgroundColor: "#f8fafc",
                }}
              >
                <option value="ALL">All Zones ({selectedProgramModal.participants.length})</option>
                {zones.map((z) => {
                  const count = selectedProgramModal.zoneCounts[z.id] || 0;
                  return (
                    <option key={z.id} value={z.id}>
                      {z.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Participants Table */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #cbd5e1" }}>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "40px" }}>#</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "75px" }}>Chest No</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Candidate Name</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "65px" }}>Coll. Code</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Institution & Location</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "100px" }}>Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProgramModal.participants
                    .filter((part) => modalZoneFilter === "ALL" || part.zoneId === modalZoneFilter)
                    .map((part, pIdx) => (
                      <tr
                        key={part.candidateId}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: pIdx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                        }}
                      >
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748b", fontWeight: 700 }}>
                          {pIdx + 1}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#8E0033" }}>
                          {part.chestNumber || "-"}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0f172a" }}>
                          {part.candidateName}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#2563eb" }}>
                          {part.institutionCode}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{part.institutionName}</div>
                          {part.institutionPlace && (
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>📍 {part.institutionPlace}</div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: "#f1f5f9",
                              color: "#0f172a",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                            }}
                          >
                            {part.zoneName || "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setSelectedProgramModal(null)}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "6px",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
