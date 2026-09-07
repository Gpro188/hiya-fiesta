"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface ProgramParticipant {
  candidateId: string;
  candidateName: string;
  chestNumber: string | null;
  institutionCode: string;
  institutionName: string;
  institutionPlace: string | null;
  zoneName?: string | null;
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
  participants: ProgramParticipant[];
}

export interface ProgramsOverview {
  totalPrograms: number;
  totalCandidateRegistrations: number;
  totalIndivPrograms: number;
  totalGeneralPrograms: number;
  totalOnStagePrograms: number;
  totalOffStagePrograms: number;
}

export default function ProgramsRegistrationClient({
  programs,
  overview,
  festName = "HIYA FIESTA 2026",
}: {
  programs: ProgramRegistrationItem[];
  overview: ProgramsOverview;
  festName?: string;
}) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"CODE" | "NAME" | "MOST_REGISTERED" | "LEAST_REGISTERED">("CODE");
  const [selectedProgramModal, setSelectedProgramModal] = useState<ProgramRegistrationItem | null>(null);

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
  }, [programs, filterCategory, filterStage, filterType, searchQuery, sortBy]);

  const printTimestamp = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 12mm 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 5px 8px !important;
            font-size: 8.5pt !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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
          padding: "1rem 1.5rem",
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
          </div>
          <h2 style={{ margin: "2px 0 0 0", fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
            📊 Programs Master List with Registered Counts
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
            placeholder="Search code or program..."
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
            <span>🖨️</span> Print Report / PDF
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
        {/* Document Header */}
        <div
          style={{
            borderBottom: "2.5px solid #8E0033",
            paddingBottom: "1rem",
            marginBottom: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#8E0033", textTransform: "uppercase", letterSpacing: "1px" }}>
              STATE ARTS FESTIVAL 2026 • OFFICIAL REPORT
            </div>
            <h1 style={{ margin: "2px 0 4px 0", fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>
              {festName}
            </h1>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#475569" }}>
              Programs Master List & Registration Counts
            </h2>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>
              Comprehensive list of all competition programs with total registered candidates and participating institutions.
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Generated: <strong>{printTimestamp}</strong>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Showing: <strong>{filteredPrograms.length} of {programs.length} Programs</strong>
            </div>
          </div>
        </div>

        {/* Overview KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "10px",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Programs</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>{overview.totalPrograms}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              {overview.totalOnStagePrograms} On-Stage • {overview.totalOffStagePrograms} Off-Stage
            </div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #8E0033", backgroundColor: "#fdf2f8" }}>
            <div style={{ fontSize: "0.72rem", color: "#8E0033", fontWeight: 800, textTransform: "uppercase" }}>Total Candidate Entries</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#8E0033" }}>{overview.totalCandidateRegistrations}</div>
            <div style={{ fontSize: "0.72rem", color: "#8E0033", fontWeight: 700 }}>Program Registrations</div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Individual Competitions</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#2563eb" }}>{overview.totalIndivPrograms}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Single Candidate Items</div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>General Competitions</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#d97706" }}>{overview.totalGeneralPrograms}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Group / Open Items</div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Avg Candidates / Item</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#059669" }}>
              {overview.totalPrograms > 0
                ? (overview.totalCandidateRegistrations / overview.totalPrograms).toFixed(1)
                : "0"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>Per Program</div>
          </div>
        </div>

        {/* Programs Table */}
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "45px" }}>#</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "70px" }}>Code</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Program Name</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "100px" }}>Category</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "95px" }}>Type</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "95px" }}>Stage</th>
                <th style={{ padding: "8px 12px", textAlign: "center", width: "120px" }}>Registered Candidates</th>
                <th style={{ padding: "8px 12px", textAlign: "center", width: "120px" }}>Colleges Participating</th>
                <th className="no-print" style={{ padding: "8px 10px", textAlign: "center", width: "100px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No programs match the current filters.
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((p, idx) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                    }}
                  >
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748b", fontWeight: 700 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#8E0033" }}>
                      {p.programCode || "-"}
                    </td>
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a" }}>
                      {p.name}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          backgroundColor:
                            p.categoryName === "FADHILA"
                              ? "#fdf2f8"
                              : p.categoryName === "FADHEELA"
                              ? "#eff6ff"
                              : "#fef3c7",
                          color:
                            p.categoryName === "FADHILA"
                              ? "#9d174d"
                              : p.categoryName === "FADHEELA"
                              ? "#1e40af"
                              : "#92400e",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        {p.categoryName || "General"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          backgroundColor: p.type === "GENERAL" ? "#fffbeb" : "#eff6ff",
                          color: p.type === "GENERAL" ? "#b45309" : "#2563eb",
                        }}
                      >
                        {p.type === "GENERAL" ? "⭐ GENERAL" : "👤 INDIVIDUAL"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          backgroundColor: p.stageType === "ON_STAGE" ? "#fdf2f8" : "#f0f9ff",
                          color: p.stageType === "ON_STAGE" ? "#db2777" : "#0284c7",
                          border: `1px solid ${p.stageType === "ON_STAGE" ? "#fbcfe8" : "#bae6fd"}`,
                        }}
                      >
                        {p.stageType === "ON_STAGE" ? "🎭 ON-STAGE" : "🎨 OFF-STAGE"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: 900,
                          backgroundColor: p.candidatesCount > 0 ? "rgba(142, 0, 51, 0.08)" : "#f1f5f9",
                          color: p.candidatesCount > 0 ? "#8E0033" : "#94a3b8",
                          border: `1px solid ${p.candidatesCount > 0 ? "rgba(142, 0, 51, 0.2)" : "#cbd5e1"}`,
                        }}
                      >
                        {p.candidatesCount}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: 900,
                          backgroundColor: p.institutionsCount > 0 ? "rgba(2, 132, 199, 0.08)" : "#f1f5f9",
                          color: p.institutionsCount > 0 ? "#0284c7" : "#94a3b8",
                          border: `1px solid ${p.institutionsCount > 0 ? "rgba(2, 132, 199, 0.2)" : "#cbd5e1"}`,
                        }}
                      >
                        {p.institutionsCount}
                      </span>
                    </td>
                    <td className="no-print" style={{ padding: "8px 10px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedProgramModal(p)}
                        disabled={p.candidatesCount === 0}
                        className="btn btn-secondary"
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: p.candidatesCount > 0 ? "pointer" : "default",
                          opacity: p.candidatesCount > 0 ? 1 : 0.4,
                        }}
                        title={p.candidatesCount > 0 ? "View registered colleges & candidates" : "No registrations yet"}
                      >
                        👥 Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 900, borderTop: "2px solid #94a3b8" }}>
                <td colSpan={6} style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a" }}>
                  TOTAL FOR {filteredPrograms.length} PROGRAMS:
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: "#8E0033", fontSize: "0.95rem" }}>
                  {filteredPrograms.reduce((sum, p) => sum + p.candidatesCount, 0)}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: "#0284c7", fontSize: "0.95rem" }}>
                  {filteredPrograms.reduce((sum, p) => sum + p.institutionsCount, 0)} (sum)
                </td>
                <td className="no-print" style={{ padding: "10px" }}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Sign-off (for official printouts) */}
        <div
          style={{
            marginTop: "2.5rem",
            paddingTop: "1.5rem",
            borderTop: "2px solid #0f172a",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "40px", marginBottom: "8px" }} />
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>Program Committee Convener</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "40px", marginBottom: "8px" }} />
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>General Secretary</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "40px", marginBottom: "8px" }} />
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>State Festival Director</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Official Seal & Signature</div>
          </div>
        </div>
      </div>

      {/* Details Modal (View Registered Candidates & Colleges for Selected Program) */}
      {selectedProgramModal && (
        <div
          className="no-print"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1rem 1.25rem",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>
                  PROGRAM {selectedProgramModal.programCode || ""} • {selectedProgramModal.stageType === "ON_STAGE" ? "🎭 ON-STAGE" : "🎨 OFF-STAGE"}
                </span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "1.15rem", fontWeight: 800, color: "#ffffff" }}>
                  {selectedProgramModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProgramModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#cbd5e1",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Summary Bar */}
            <div
              style={{
                padding: "0.75rem 1.25rem",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                gap: "16px",
                fontSize: "0.84rem",
              }}
            >
              <div>
                Registered Candidates: <strong style={{ color: "#8E0033" }}>{selectedProgramModal.candidatesCount}</strong>
              </div>
              <span>•</span>
              <div>
                Colleges Participating: <strong style={{ color: "#0284c7" }}>{selectedProgramModal.institutionsCount}</strong>
              </div>
            </div>

            {/* Modal List Table */}
            <div style={{ padding: "1rem 1.25rem", overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "6px 10px", textAlign: "center", width: "40px" }}>#</th>
                    <th style={{ padding: "6px 10px", textAlign: "center", width: "80px" }}>Chest No</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Candidate Name</th>
                    <th style={{ padding: "6px 10px", textAlign: "center", width: "70px" }}>College Code</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Institution & Place</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", width: "120px" }}>Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProgramModal.participants.map((item, pIdx) => (
                    <tr key={item.candidateId + pIdx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "6px 10px", textAlign: "center", color: "#64748b" }}>{pIdx + 1}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, color: "#8E0033", fontFamily: "monospace" }}>
                        {item.chestNumber || "Pending"}
                      </td>
                      <td style={{ padding: "6px 10px", fontWeight: 700, color: "#0f172a" }}>{item.candidateName}</td>
                      <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 800, color: "#0284c7", fontFamily: "monospace" }}>
                        {item.institutionCode}
                      </td>
                      <td style={{ padding: "6px 10px" }}>
                        <div>{item.institutionName}</div>
                        {item.institutionPlace && (
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>📍 {item.institutionPlace}</div>
                        )}
                      </td>
                      <td style={{ padding: "6px 10px", color: "#475569", fontWeight: 600 }}>{item.zoneName || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "0.75rem 1.25rem",
                backgroundColor: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedProgramModal(null)}
                className="btn btn-secondary"
                style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
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
