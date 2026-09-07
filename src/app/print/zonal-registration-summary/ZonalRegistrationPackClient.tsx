"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface InstitutionSummary {
  id: string;
  code: string;
  name: string;
  place?: string | null;
  district?: string | null;
  stream?: string | null;
  candidateCategories: string[];
  isRegistered: boolean;
  isConfirmed: boolean;
  candidatesCount: number;
  indivProgramsCount: number;
  generalProgramsCount: number;
  totalProgramsCount: number;
  prefixCode?: string;
}

export interface ZoneSummary {
  id: string;
  name: string;
  code: string;
  totalInstitutions: number;
  registeredInstitutions: number;
  unregisteredInstitutions: number;
  totalCandidates: number;
  totalIndivPrograms: number;
  totalGeneralPrograms: number;
  totalPrograms: number;
  institutions: InstitutionSummary[];
}

export interface GrandTotals {
  totalZones: number;
  totalInstitutions: number;
  registeredInstitutions: number;
  unregisteredInstitutions: number;
  registrationPercentage: number;
  totalCandidates: number;
  totalIndivPrograms: number;
  totalGeneralPrograms: number;
  totalPrograms: number;
}

export default function ZonalRegistrationPackClient({
  zones,
  grandTotals,
  festName = "HIYA FIESTA 2026",
  initialZoneId = "ALL",
}: {
  zones: ZoneSummary[];
  grandTotals: GrandTotals;
  festName?: string;
  initialZoneId?: string;
}) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialZoneId);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "REGISTERED_ONLY" | "UNREGISTERED_ONLY">("ALL");
  const [pageBreakMode, setPageBreakMode] = useState<"CONTINUOUS" | "PER_ZONE">("CONTINUOUS");

  const filteredZones = useMemo(() => {
    let result = zones;
    if (selectedZoneId !== "ALL") {
      result = result.filter((z) => z.id === selectedZoneId);
    }

    if (!searchQuery && filterMode === "ALL") {
      return result;
    }

    const q = searchQuery.toLowerCase().trim();

    return result.map((zone) => {
      const filteredInsts = zone.institutions.filter((inst) => {
        if (filterMode === "REGISTERED_ONLY" && !inst.isRegistered) return false;
        if (filterMode === "UNREGISTERED_ONLY" && inst.isRegistered) return false;

        if (!q) return true;

        const matchName = inst.name.toLowerCase().includes(q);
        const matchCode = inst.code.toLowerCase().includes(q);
        const matchPlace = inst.place ? inst.place.toLowerCase().includes(q) : false;
        const matchStream = inst.stream ? inst.stream.toLowerCase().includes(q) : false;
        const matchCats = inst.candidateCategories.some((c) => c.toLowerCase().includes(q));

        return matchName || matchCode || matchPlace || matchStream || matchCats;
      });

      return {
        ...zone,
        institutions: filteredInsts,
      };
    });
  }, [zones, selectedZoneId, searchQuery, filterMode]);

  const printTimestamp = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Dynamic Print Styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 10mm 8mm;
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
          .print-only-kpi-bar {
            display: flex !important;
          }
          .kpi-cards-screen {
            display: none !important;
          }
          .doc-header {
            border-bottom: 2px solid #8E0033 !important;
            padding-bottom: 4px !important;
            margin-bottom: 6px !important;
          }
          .doc-header h1 {
            font-size: 13pt !important;
            margin: 0 !important;
            color: #000000 !important;
            line-height: 1.15 !important;
          }
          .doc-header h2 {
            font-size: 9.5pt !important;
            margin: 0 !important;
            color: #334155 !important;
            line-height: 1.2 !important;
          }
          .doc-header-tag {
            font-size: 7pt !important;
            color: #8E0033 !important;
            font-weight: 800 !important;
          }
          .doc-header-meta {
            font-size: 7pt !important;
            color: #475569 !important;
          }
          .zone-page-pack {
            page-break-inside: auto !important;
            break-inside: auto !important;
            page-break-after: ${pageBreakMode === "PER_ZONE" ? "always" : "auto"} !important;
            break-after: ${pageBreakMode === "PER_ZONE" ? "page" : "auto"} !important;
            margin-bottom: 10px !important;
            padding-bottom: 0 !important;
            border-bottom: none !important;
          }
          .zone-header-banner {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            border: 1.5px solid #1e293b !important;
            border-radius: 3px !important;
            padding: 3px 8px !important;
            margin-bottom: 3px !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .zone-header-banner * {
            color: #0f172a !important;
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
            padding: 3px 5px !important;
            font-size: 7.8pt !important;
            line-height: 1.2 !important;
          }
          th {
            background-color: #e2e8f0 !important;
            color: #0f172a !important;
            font-weight: 800 !important;
          }
          .inst-name {
            font-size: 8pt !important;
            font-weight: 700 !important;
            color: #000000 !important;
            line-height: 1.2 !important;
          }
          .inst-place {
            font-size: 6.8pt !important;
            color: #475569 !important;
          }
          .category-tag {
            border: 1px solid #cbd5e1 !important;
            background-color: #f8fafc !important;
            color: #0f172a !important;
            font-size: 6.8pt !important;
            padding: 1px 4px !important;
          }
          .status-tag {
            font-size: 6.8pt !important;
            padding: 1px 4px !important;
            font-weight: 800 !important;
          }
          .signoff-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 16px !important;
            padding-top: 10px !important;
          }
        }
      `}</style>

      {/* Top Interactive Control Bar (Hidden when printing) */}
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
              href="/dashboard/reports"
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
              &larr; Back to Reports
            </Link>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span style={{ fontSize: "0.82rem", color: "#8E0033", fontWeight: 700 }}>
              Super Admin Registration Pack
            </span>
          </div>
          <h2 style={{ margin: "2px 0 0 0", fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
            📦 Zonal Institution & Program Registration Master Pack
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Zone Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Zone:</label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.84rem",
                fontWeight: 700,
                backgroundColor: "#f8fafc",
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              <option value="ALL">🌐 All Zones (Full Master Festival Pack)</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  📍 {z.name} Zone ({z.registeredInstitutions}/{z.totalInstitutions} Registered)
                </option>
              ))}
            </select>
          </div>

          {/* Registration Filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.84rem",
              fontWeight: 600,
              backgroundColor: "#f8fafc",
              color: "#0f172a",
            }}
          >
            <option value="ALL">Show All Institutions</option>
            <option value="REGISTERED_ONLY">Registered Only</option>
            <option value="UNREGISTERED_ONLY">Pending / Not Registered</option>
          </select>

          {/* Page Break Setting */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>Print Mode:</label>
            <select
              value={pageBreakMode}
              onChange={(e) => setPageBreakMode(e.target.value as any)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.84rem",
                fontWeight: 700,
                backgroundColor: pageBreakMode === "CONTINUOUS" ? "#ecfdf5" : "#f8fafc",
                color: pageBreakMode === "CONTINUOUS" ? "#065f46" : "#0f172a",
                cursor: "pointer",
              }}
              title="Continuous saves paper (fits in ~3-4 sheets). New Page Per Zone separates each zone on a new paper sheet."
            >
              <option value="CONTINUOUS">📄 Continuous Sheet (Saves Paper: ~3-4 Sheets)</option>
              <option value="PER_ZONE">📑 New Page Per Zone (Pack Format: 8+ Sheets)</option>
            </select>
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search college, code, place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.84rem",
              minWidth: "180px",
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
              padding: "0.48rem 1.25rem",
              borderRadius: "6px",
              backgroundColor: "#8E0033",
              color: "#ffffff",
              border: "none",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(142,0,51,0.25)",
            }}
          >
            <span>🖨️</span> Print Master Pack / PDF
          </button>
        </div>
      </div>

      {/* Report Document Content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.25rem 1.5rem" }}>
        {/* Document Header (Always visible & printed) */}
        <div
          className="doc-header"
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
            <div className="doc-header-tag" style={{ fontSize: "0.75rem", fontWeight: 800, color: "#8E0033", textTransform: "uppercase", letterSpacing: "1px" }}>
              STATE ARTS FESTIVAL 2026 • OFFICIAL MASTER DOCUMENT
            </div>
            <h1 style={{ margin: "2px 0 2px 0", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>
              {festName}
            </h1>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#475569" }}>
              Zonal Institution & Program Registration Master Pack
            </h2>
            <div className="doc-subtitle" style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Summary of all registered institutions, stream/categories, candidates, and individual & general program allocations.
            </div>
          </div>

          <div className="doc-header-meta" style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Generated: <strong>{printTimestamp}</strong>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Filter: <strong>{selectedZoneId === "ALL" ? "All Zones" : zones.find((z) => z.id === selectedZoneId)?.name}</strong>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Page Layout: <strong>{pageBreakMode === "CONTINUOUS" ? "Continuous Flow" : "Separate Page per Zone"}</strong>
            </div>
          </div>
        </div>

        {/* Print-Only Sleek Summary Strip (Replaces huge cards on paper) */}
        <div
          className="print-only-kpi-bar"
          style={{
            display: "none",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc",
            border: "1.5px solid #cbd5e1",
            borderRadius: "4px",
            padding: "4px 10px",
            marginBottom: "8px",
            fontSize: "8pt",
            color: "#0f172a",
          }}
        >
          <div><strong>Total Zones:</strong> {grandTotals.totalZones}</div>
          <div><strong>Institutions:</strong> {grandTotals.registeredInstitutions}/{grandTotals.totalInstitutions} ({grandTotals.registrationPercentage}%)</div>
          <div><strong>Total Candidates:</strong> {grandTotals.totalCandidates}</div>
          <div><strong>Individual Programs:</strong> {grandTotals.totalIndivPrograms}</div>
          <div><strong>General Programs:</strong> {grandTotals.totalGeneralPrograms}</div>
          <div><strong>Total Program Reg.:</strong> <span style={{ color: "#8E0033", fontWeight: 800 }}>{grandTotals.totalPrograms}</span></div>
        </div>

        {/* Grand Total KPI Cards (Screen Only) */}
        <div
          className="kpi-cards-screen"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Zones</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a" }}>{grandTotals.totalZones}</div>
            <div style={{ fontSize: "0.7rem", color: "#475569" }}>All Participating Zones</div>
          </div>

          <div style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Registered Institutions</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#059669" }}>
              {grandTotals.registeredInstitutions} <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>/ {grandTotals.totalInstitutions}</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 700 }}>
              {grandTotals.registrationPercentage}% Participation
            </div>
          </div>

          <div style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Candidates</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#8E0033" }}>{grandTotals.totalCandidates}</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Registered Across Fest</div>
          </div>

          <div style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Individual Programs</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#2563eb" }}>{grandTotals.totalIndivPrograms}</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Institution Registrations</div>
          </div>

          <div style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>General Programs</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#d97706" }}>{grandTotals.totalGeneralPrograms}</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Group Registrations</div>
          </div>

          <div style={{ padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #8E0033", backgroundColor: "#fdf2f8" }}>
            <div style={{ fontSize: "0.7rem", color: "#8E0033", fontWeight: 800, textTransform: "uppercase" }}>Total Program Reg.</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#8E0033" }}>{grandTotals.totalPrograms}</div>
            <div style={{ fontSize: "0.7rem", color: "#8E0033", fontWeight: 700 }}>Combined Total</div>
          </div>
        </div>

        {/* Zones & Institutions Breakdowns */}
        {filteredZones.map((zone, zoneIndex) => (
          <div
            key={zone.id}
            className="zone-page-pack"
            style={{
              marginBottom: "1.5rem",
              paddingBottom: "0.5rem",
            }}
          >
            {/* Zone Header Banner */}
            <div
              className="zone-header-banner"
              style={{
                backgroundColor: "#0f172a",
                color: "#ffffff",
                padding: "8px 14px",
                borderRadius: "5px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", fontWeight: 800 }}>
                  ZONE {zoneIndex + 1}
                </span>
                <span style={{ color: "#475569" }}>|</span>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#ffffff" }}>
                  📍 {zone.name} Zone ({zone.code})
                </h3>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", fontSize: "0.78rem" }}>
                <div>
                  Institutions: <strong>{zone.registeredInstitutions} / {zone.totalInstitutions}</strong>
                </div>
                <span>•</span>
                <div>
                  Candidates: <strong>{zone.totalCandidates}</strong>
                </div>
                <span>•</span>
                <div>
                  Indiv: <strong>{zone.totalIndivPrograms}</strong>
                </div>
                <span>•</span>
                <div>
                  General: <strong>{zone.totalGeneralPrograms}</strong>
                </div>
                <span>•</span>
                <div style={{ color: "#38bdf8", fontWeight: 800 }}>
                  Total Programs: <strong>{zone.totalPrograms}</strong>
                </div>
              </div>
            </div>

            {/* Institutions Table */}
            <div className="table-container" style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #94a3b8" }}>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: "35px" }}>#</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: "55px" }}>Code</th>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>Institution Name & Location</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", width: "135px" }}>Category / Stream</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: "70px" }}>Candidates</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: "75px" }}>Individual</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: "70px" }}>General</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: "80px" }}>Total Reg</th>
                    <th style={{ padding: "6px 8px", textAlign: "center", width: "95px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {zone.institutions.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                        No institutions match the current search or filter.
                      </td>
                    </tr>
                  ) : (
                    zone.institutions.map((inst, instIdx) => {
                      const categoriesDisplay =
                        inst.candidateCategories.length > 0
                          ? inst.candidateCategories.join(", ")
                          : inst.stream || "General";

                      return (
                        <tr
                          key={inst.id}
                          style={{
                            borderBottom: "1px solid #e2e8f0",
                            backgroundColor: instIdx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                          }}
                        >
                          <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                            {instIdx + 1}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#8E0033" }}>
                            {inst.code}
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <div className="inst-name" style={{ fontWeight: 700, color: "#0f172a" }}>{inst.name}</div>
                            {inst.place && (
                              <div className="inst-place" style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
                                📍 {inst.place}
                                {inst.district ? ` • ${inst.district}` : ""}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <span
                              className="category-tag"
                              style={{
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                backgroundColor: categoriesDisplay.includes("FADHILA") && categoriesDisplay.includes("FADHEELA")
                                  ? "#f3e8ff"
                                  : categoriesDisplay.includes("FADHEELA")
                                  ? "#dbeafe"
                                  : "#fdf2f8",
                                color: categoriesDisplay.includes("FADHILA") && categoriesDisplay.includes("FADHEELA")
                                  ? "#6b21a8"
                                  : categoriesDisplay.includes("FADHEELA")
                                  ? "#1e40af"
                                  : "#9d174d",
                                border: "1px solid rgba(0,0,0,0.06)",
                              }}
                            >
                              {categoriesDisplay}
                            </span>
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 800, color: inst.candidatesCount > 0 ? "#0f172a" : "#94a3b8" }}>
                            {inst.candidatesCount}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 800, color: inst.indivProgramsCount > 0 ? "#2563eb" : "#94a3b8" }}>
                            {inst.indivProgramsCount}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 800, color: inst.generalProgramsCount > 0 ? "#d97706" : "#94a3b8" }}>
                            {inst.generalProgramsCount}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 900, color: inst.totalProgramsCount > 0 ? "#8E0033" : "#94a3b8" }}>
                            {inst.totalProgramsCount}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>
                            {inst.isConfirmed ? (
                              <span
                                className="status-tag"
                                style={{
                                  display: "inline-block",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  backgroundColor: "#ecfdf5",
                                  color: "#047857",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                ✓ Confirmed
                              </span>
                            ) : inst.isRegistered ? (
                              <span
                                className="status-tag"
                                style={{
                                  display: "inline-block",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                }}
                              >
                                ✓ Registered
                              </span>
                            ) : (
                              <span
                                className="status-tag"
                                style={{
                                  display: "inline-block",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  backgroundColor: "#fef2f2",
                                  color: "#b91c1c",
                                  border: "1px solid #fecaca",
                                }}
                              >
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 900, borderTop: "2px solid #94a3b8" }}>
                    <td colSpan={4} style={{ padding: "6px 8px", textAlign: "right", color: "#0f172a" }}>
                      TOTAL FOR {zone.name.toUpperCase()} ZONE ({zone.institutions.length} Inst.):
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#0f172a" }}>
                      {zone.institutions.reduce((sum, i) => sum + i.candidatesCount, 0)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#2563eb" }}>
                      {zone.institutions.reduce((sum, i) => sum + i.indivProgramsCount, 0)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#d97706" }}>
                      {zone.institutions.reduce((sum, i) => sum + i.generalProgramsCount, 0)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center", color: "#8E0033" }}>
                      {zone.institutions.reduce((sum, i) => sum + i.totalProgramsCount, 0)}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center", fontSize: "0.72rem", color: "#059669" }}>
                      {zone.registeredInstitutions} Reg.
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        {/* Master Summary Sign-Off Section */}
        <div
          className="signoff-section"
          style={{
            marginTop: "2rem",
            paddingTop: "1.25rem",
            borderTop: "2px solid #0f172a",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "36px", marginBottom: "6px" }} />
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>Verified by Zone Coordinator</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "36px", marginBottom: "6px" }} />
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>General Convener</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "36px", marginBottom: "6px" }} />
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>State Festival Director</div>
            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Official Seal & Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
