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
      {/* Print Styling */}
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
          .zone-page-pack {
            page-break-after: always;
            break-after: page;
          }
          .zone-page-pack:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .table-container {
            border: 1px solid #000000 !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 4px 6px !important;
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
          <h2 style={{ margin: "2px 0 0 0", fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
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
            <option value="REGISTERED_ONLY">Registered Institutions Only</option>
            <option value="UNREGISTERED_ONLY">Pending / Not Registered</option>
          </select>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search college, code, place, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.84rem",
              minWidth: "220px",
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
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
        {/* Document Header (Always visible & printed) */}
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
              STATE ARTS FESTIVAL 2026 • OFFICIAL DOCUMENT
            </div>
            <h1 style={{ margin: "2px 0 4px 0", fontSize: "1.8rem", fontWeight: 900, color: "#0f172a" }}>
              {festName}
            </h1>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#475569" }}>
              Zonal Institution & Program Registration Master Pack
            </h2>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>
              Summary of all registered institutions, stream/categories, and individual & general program allocations by zone.
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Generated: <strong>{printTimestamp}</strong>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Filter: <strong>{selectedZoneId === "ALL" ? "All Zones" : zones.find((z) => z.id === selectedZoneId)?.name}</strong>
            </div>
          </div>
        </div>

        {/* Grand Total KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "10px",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Zones</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>{grandTotals.totalZones}</div>
            <div style={{ fontSize: "0.72rem", color: "#475569" }}>All Participating Zones</div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Registered Institutions</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#059669" }}>
              {grandTotals.registeredInstitutions} <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>/ {grandTotals.totalInstitutions}</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 700 }}>
              {grandTotals.registrationPercentage}% Participation
            </div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Candidates</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#8E0033" }}>{grandTotals.totalCandidates}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Registered Across Fest</div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Individual Programs</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#2563eb" }}>{grandTotals.totalIndivPrograms}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Institution Registrations</div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>General Programs</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#d97706" }}>{grandTotals.totalGeneralPrograms}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Group Registrations</div>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #8E0033", backgroundColor: "#fdf2f8" }}>
            <div style={{ fontSize: "0.72rem", color: "#8E0033", fontWeight: 800, textTransform: "uppercase" }}>Total Program Reg.</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#8E0033" }}>{grandTotals.totalPrograms}</div>
            <div style={{ fontSize: "0.72rem", color: "#8E0033", fontWeight: 700 }}>Combined Total</div>
          </div>
        </div>

        {/* Zones & Institutions Breakdowns */}
        {filteredZones.map((zone, zoneIndex) => (
          <div
            key={zone.id}
            className="zone-page-pack"
            style={{
              marginBottom: "2rem",
              paddingBottom: "1.5rem",
              borderBottom: zoneIndex < filteredZones.length - 1 ? "1px dashed #cbd5e1" : "none",
            }}
          >
            {/* Zone Header Banner */}
            <div
              style={{
                backgroundColor: "#0f172a",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", fontWeight: 700 }}>
                  ZONE {zoneIndex + 1}
                </span>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "1.15rem", fontWeight: 800, color: "#ffffff" }}>
                  📍 {zone.name} Zone ({zone.code})
                </h3>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", fontSize: "0.82rem" }}>
                <div>
                  Institutions: <strong>{zone.registeredInstitutions} / {zone.totalInstitutions}</strong>
                </div>
                <span>•</span>
                <div>
                  Candidates: <strong>{zone.totalCandidates}</strong>
                </div>
                <span>•</span>
                <div>
                  Individual Programs: <strong>{zone.totalIndivPrograms}</strong>
                </div>
                <span>•</span>
                <div>
                  General Programs: <strong>{zone.totalGeneralPrograms}</strong>
                </div>
                <span>•</span>
                <div style={{ color: "#38bdf8", fontWeight: 800 }}>
                  Total Programs: <strong>{zone.totalPrograms}</strong>
                </div>
              </div>
            </div>

            {/* Institutions Table */}
            <div className="table-container" style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "40px" }}>#</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "70px" }}>Code</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Institution Name & Place</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", width: "160px" }}>Category / Stream</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "85px" }}>Candidates</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "95px" }}>Individual</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "95px" }}>General</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "95px" }}>Total Programs</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "110px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {zone.institutions.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
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
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                            {instIdx + 1}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "monospace", fontWeight: 800, color: "#8E0033" }}>
                            {inst.code}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{inst.name}</div>
                            {inst.place && (
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                📍 {inst.place}
                                {inst.district ? ` • ${inst.district}` : ""}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
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
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 800, color: inst.candidatesCount > 0 ? "#0f172a" : "#94a3b8" }}>
                            {inst.candidatesCount}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 800, color: inst.indivProgramsCount > 0 ? "#2563eb" : "#94a3b8" }}>
                            {inst.indivProgramsCount}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 800, color: inst.generalProgramsCount > 0 ? "#d97706" : "#94a3b8" }}>
                            {inst.generalProgramsCount}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 900, color: inst.totalProgramsCount > 0 ? "#8E0033" : "#94a3b8" }}>
                            {inst.totalProgramsCount}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            {inst.isConfirmed ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  backgroundColor: "#ecfdf5",
                                  color: "#047857",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                ✅ Confirmed
                              </span>
                            ) : inst.isRegistered ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                }}
                              >
                                🟢 Registered
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  backgroundColor: "#fef2f2",
                                  color: "#b91c1c",
                                  border: "1px solid #fecaca",
                                }}
                              >
                                ⚪ Pending
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
                    <td colSpan={4} style={{ padding: "10px", textAlign: "right", color: "#0f172a" }}>
                      TOTAL FOR {zone.name.toUpperCase()} ZONE ({zone.institutions.length} Institutions):
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", color: "#0f172a" }}>
                      {zone.institutions.reduce((sum, i) => sum + i.candidatesCount, 0)}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", color: "#2563eb" }}>
                      {zone.institutions.reduce((sum, i) => sum + i.indivProgramsCount, 0)}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", color: "#d97706" }}>
                      {zone.institutions.reduce((sum, i) => sum + i.generalProgramsCount, 0)}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", color: "#8E0033" }}>
                      {zone.institutions.reduce((sum, i) => sum + i.totalProgramsCount, 0)}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontSize: "0.74rem", color: "#059669" }}>
                      {zone.registeredInstitutions} Registered
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        {/* Master Summary Sign-Off Section */}
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
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>Verified by Zone Coordinator</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "40px", marginBottom: "8px" }} />
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>General Convener</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Signature & Date</div>
          </div>

          <div>
            <div style={{ borderBottom: "1px dashed #94a3b8", height: "40px", marginBottom: "8px" }} />
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>State Festival Director</div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Official Seal & Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
