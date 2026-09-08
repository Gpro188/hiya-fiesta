"use client";

import React, { useState } from "react";
import PrintButton from "@/components/PrintButton";

type CandidateEntry = {
  assignmentId: string;
  candidateId: string;
  candidateName: string;
  candidateUid: string | null;
  chestNumber: string | null;
  candidatePhoto: string | null;
  institutionCode: string | null;
  institutionName: string;
  institutionPlace: string | null;
  categoryName: string;
  isConfirmed: boolean;
};

type ProgramValuationSheet = {
  programId: string;
  programCode: string | null;
  programName: string;
  categoryName: string;
  duration: number;
  venue: string | null;
  candidates: CandidateEntry[];
};

type ZoneValuationData = {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  programs: ProgramValuationSheet[];
};

interface Props {
  festName: string;
  festMoto?: string;
  zonalData: ZoneValuationData[];
  zones: { id: string; code: string; name: string }[];
  allPrograms: { id: string; code: string | null; name: string; categoryName: string }[];
  userRole: string;
  initialZoneId: string | null;
  initialProgramId: string | null;
}

export default function ZonalOffstageValuationClient({
  festName,
  festMoto,
  zonalData,
  zones,
  allPrograms,
  userRole,
  initialZoneId,
  initialProgramId,
}: Props) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    initialZoneId || (zonalData.length > 0 ? zonalData[0].zoneId : "")
  );
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    initialProgramId || "ALL"
  );
  const [filterConfirmedOnly, setFilterConfirmedOnly] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

  // Active Zone data
  const activeZone = zonalData.find((z) => z.zoneId === selectedZoneId) || zonalData[0];

  // Filter programs in this zone
  const visiblePrograms = (activeZone?.programs || []).filter((p) => {
    if (selectedProgramId !== "ALL" && p.programId !== selectedProgramId) {
      return false;
    }
    return true;
  });

  const totalCandidatesInZone = (activeZone?.programs || []).reduce(
    (acc, p) => acc + p.candidates.length,
    0
  );
  const confirmedCandidatesInZone = (activeZone?.programs || []).reduce(
    (acc, p) => acc + p.candidates.filter((c) => c.isConfirmed).length,
    0
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Screen Controls Header ── */}
      <div className="no-print" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#1e293b",
        color: "#f8fafc",
        padding: "16px 24px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.4rem" }}>📝</span>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, letterSpacing: "0.5px" }}>
                  ZONAL OFF-STAGE VALUATION & MARK ENTRY SHEETS
                </h1>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                  Official evaluation sheets sent to Zonal Centers with Candidate Photos & Chest Numbers
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            {/* Zone Selector */}
            {userRole !== "ZONE_ADMIN" && (
              <div>
                <label style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", marginBottom: "2px", fontWeight: 600 }}>
                  ZONE
                </label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => {
                    setSelectedZoneId(e.target.value);
                    setSelectedProgramId("ALL");
                  }}
                  style={{
                    backgroundColor: "#334155",
                    color: "#ffffff",
                    border: "1px solid #475569",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  {zonalData.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>
                      {z.zoneCode} — {z.zoneName} ({z.programs.length} progs)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Program Selector */}
            <div>
              <label style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block", marginBottom: "2px", fontWeight: 600 }}>
                OFF-STAGE PROGRAM
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                style={{
                  backgroundColor: "#334155",
                  color: "#ffffff",
                  border: "1px solid #475569",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  maxWidth: "320px",
                }}
              >
                <option value="ALL">
                  All Off-Stage Programs ({activeZone?.programs.length || 0})
                </option>
                {(activeZone?.programs || []).map((p) => (
                  <option key={p.programId} value={p.programId}>
                    [{p.programCode || "P"}] {p.programName} ({p.candidates.length} candidates)
                  </option>
                ))}
              </select>
            </div>

              {/* Filter Confirmed Only Toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="checkbox"
                  id="confOnly"
                  checked={filterConfirmedOnly}
                  onChange={(e) => setFilterConfirmedOnly(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="confOnly" style={{ fontSize: "0.75rem", color: "#cbd5e1", cursor: "pointer", fontWeight: 600 }}>
                  Confirmed Only
                </label>
              </div>

              {/* Print Orientation Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "#cbd5e1", fontWeight: 700 }}>Print Layout:</span>
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "5px",
                    border: orientation === "landscape" ? "2px solid #38bdf8" : "1px solid #475569",
                    backgroundColor: orientation === "landscape" ? "#0284c7" : "#334155",
                    color: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  📃 Landscape (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "5px",
                    border: orientation === "portrait" ? "2px solid #38bdf8" : "1px solid #475569",
                    backgroundColor: orientation === "portrait" ? "#0284c7" : "#334155",
                    color: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  📄 Portrait
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <PrintButton label={`Print Valuation Sheets (${visiblePrograms.length})`} />
                <a
                  href="/dashboard/reports"
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#475569",
                    color: "#f8fafc",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  Back to Reports
                </a>
              </div>
            </div>
          </div>

          {/* Zone Summary & Landscape Tip Banner */}
          {activeZone && (
            <div style={{ maxWidth: "1280px", margin: "10px auto 0", paddingTop: "10px", borderTop: "1px solid #334155" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", fontSize: "0.78rem", marginBottom: "6px" }}>
                <div>
                  <span style={{ color: "#94a3b8" }}>Selected Zone: </span>
                  <strong style={{ color: "#38bdf8" }}>{activeZone.zoneName} ({activeZone.zoneCode})</strong>
                </div>
                <div>
                  <span style={{ color: "#94a3b8" }}>Total Off-Stage Programs: </span>
                  <strong style={{ color: "#ffffff" }}>{activeZone.programs.length}</strong>
                </div>
                <div>
                  <span style={{ color: "#94a3b8" }}>Total Candidates Registered: </span>
                  <strong style={{ color: "#ffffff" }}>{totalCandidatesInZone}</strong>
                </div>
                <div>
                  <span style={{ color: "#94a3b8" }}>Confirmed with Chest Numbers: </span>
                  <strong style={{ color: "#4ade80" }}>{confirmedCandidatesInZone}</strong>
                  {totalCandidatesInZone > confirmedCandidatesInZone && (
                    <span style={{ color: "#fbbf24", marginLeft: "6px" }}>
                      ({totalCandidatesInZone - confirmedCandidatesInZone} pending)
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
                <div>
                  💡 <strong>Landscape Printing:</strong> Set to <em>Landscape</em> by default for wide mark-entry columns. In the browser print dialog, verify <em>Layout</em> is set to <strong>Landscape</strong>.
                </div>
                <div style={{ color: "#38bdf8", fontWeight: 700 }}>
                  Active Print Layout: <span style={{ textTransform: "capitalize" }}>{orientation}</span>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* ── Printable Sheets Area ── */}
      <div style={{ maxWidth: orientation === "landscape" ? "1240px" : "960px", margin: "24px auto", padding: "0 16px" }}>
        {visiblePrograms.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ color: "#64748b" }}>No off-stage registrations found for this selection.</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              Please select another zone or check candidate registrations.
            </p>
          </div>
        ) : (
          visiblePrograms.map((prog, pIdx) => {
            const candidates = filterConfirmedOnly
              ? prog.candidates.filter((c) => c.isConfirmed)
              : prog.candidates;

            return (
              <div
                key={prog.programId}
                className="valuation-sheet-page"
                style={{
                  backgroundColor: "#ffffff",
                  padding: "36px 40px",
                  marginBottom: "32px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                {/* ── Sheet Header ── */}
                <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "8px", marginBottom: "10px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "#8E0033" }}>
                    {festName}
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: "2px" }}>
                    CSWC STATE FESTIVAL 2026 • OFF-STAGE VALUATION & MARK ENTRY RECORD
                  </div>
                  {festMoto && (
                    <div style={{ fontSize: "0.72rem", fontStyle: "italic", color: "#64748b", marginTop: "1px" }}>
                      &ldquo;{festMoto}&rdquo;
                    </div>
                  )}
                </div>

                {/* ── Program & Zonal Center Meta Box ── */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr",
                  gap: "12px",
                  backgroundColor: "#f8fafc",
                  border: "1.5px solid #0f172a",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  marginBottom: "8px",
                  fontSize: "0.82rem",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{
                        backgroundColor: "#8E0033",
                        color: "#ffffff",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontWeight: 900,
                        fontSize: "0.8rem",
                        fontFamily: "monospace"
                      }}>
                        CODE: {prog.programCode || "P"}
                      </span>
                      <strong style={{ fontSize: "1.02rem", color: "#0f172a" }}>
                        {prog.programName}
                      </strong>
                    </div>
                    <div style={{ color: "#334155", fontSize: "0.78rem", marginTop: "2px" }}>
                      <strong>Category:</strong> <span style={{ fontWeight: 700 }}>{prog.categoryName}</span> • <strong>Duration:</strong> {prog.duration} Min • <strong>Max Marks:</strong> 100
                    </div>
                  </div>

                  <div style={{ textAlign: "right", borderLeft: "1px solid #cbd5e1", paddingLeft: "12px" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>
                      ZONE: {activeZone.zoneName} ({activeZone.zoneCode})
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "1px" }}>
                      Valuation Center: <strong>{prog.venue || "Zonal Center"}</strong>
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#475569", marginTop: "1px" }}>
                      Registered Candidates in Zone: <strong>{candidates.length}</strong>
                    </div>
                  </div>
                </div>

                {/* ── Mark Entry Instructions for Judges ── */}
                <div style={{
                  padding: "4px 10px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  color: "#991b1b",
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>
                    <strong>Valuation Protocol:</strong> Verify candidate scripts with official <strong>Chest Number</strong> and candidate photo. Marks must be entered in ink without overwriting.
                  </span>
                  <span>
                    <strong>Evaluation:</strong> Maximum Score (100) &bull; Obtained Score &bull; Grade &bull; Place (1st, 2nd, 3rd)
                  </span>
                </div>

                {/* ── Candidates Mark Entry Table ── */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: orientation === "landscape" ? "0.84rem" : "0.8rem", border: "1.5px solid #0f172a", marginBottom: "10px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 2px", width: "30px" }}>Sl</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 4px", width: orientation === "landscape" ? "90px" : "80px" }}>Chest No.</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 2px", width: "46px" }}>Photo</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 6px", textAlign: "left" }}>Candidate Name & UID</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", width: orientation === "landscape" ? "85px" : "70px" }}>Inst. Code</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 4px", width: orientation === "landscape" ? "90px" : "70px" }}>Maximum Score</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 4px", width: orientation === "landscape" ? "110px" : "85px", backgroundColor: "#1e293b" }}>Obtained Score</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 2px", width: orientation === "landscape" ? "55px" : "48px" }}>Grade</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 2px", width: orientation === "landscape" ? "55px" : "48px" }}>Place</th>
                      <th style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "left", width: orientation === "landscape" ? "130px" : "85px" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                          No candidates registered for this program in this zone.
                        </td>
                      </tr>
                    ) : (
                      candidates.map((c, cIdx) => (
                        <tr key={c.assignmentId} style={{ borderBottom: "1px solid #94a3b8" }}>
                          <td style={{ border: "1px solid #0f172a", padding: "3px 2px", textAlign: "center", fontWeight: 700 }}>
                            {cIdx + 1}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center" }}>
                            {c.chestNumber ? (
                              <span style={{
                                display: "inline-block",
                                backgroundColor: "#fdf2f4",
                                border: "1.5px solid #8E0033",
                                color: "#8E0033",
                                fontWeight: 900,
                                fontSize: "0.9rem",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                letterSpacing: "0.5px",
                              }}>
                                {c.chestNumber}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "0.68rem", fontStyle: "italic" }}>
                                [PENDING]
                              </span>
                            )}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 2px", textAlign: "center", verticalAlign: "middle" }}>
                            {c.candidatePhoto ? (
                              <img
                                src={c.candidatePhoto}
                                alt={c.candidateName}
                                style={{
                                  width: "30px",
                                  height: "36px",
                                  objectFit: "cover",
                                  borderRadius: "2px",
                                  border: "1px solid #334155",
                                  display: "block",
                                  margin: "0 auto",
                                }}
                              />
                            ) : (
                              <div style={{
                                width: "30px",
                                height: "36px",
                                backgroundColor: "#f1f5f9",
                                border: "1px dashed #94a3b8",
                                borderRadius: "2px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto",
                                color: "#94a3b8",
                              }}>
                                <span style={{ fontSize: "0.7rem", lineHeight: 1 }}>👤</span>
                              </div>
                            )}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "3px 6px" }}>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.82rem", lineHeight: 1.2 }}>
                              {c.candidateName}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "#64748b", fontFamily: "monospace", marginTop: "1px" }}>
                              UID: {c.candidateUid || "—"}
                            </div>
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center" }} title={`${c.institutionName || ""} ${c.institutionPlace ? `(${c.institutionPlace})` : ""}`}>
                            <span style={{
                              display: "inline-block",
                              backgroundColor: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              color: "#0f172a",
                              fontWeight: 800,
                              fontFamily: "monospace",
                              fontSize: "0.82rem",
                              padding: "2px 6px",
                              borderRadius: "3px",
                            }}>
                              {c.institutionCode || "—"}
                            </span>
                          </td>
                          {/* Maximum Score */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                            100
                          </td>
                          {/* Blank Obtained Score Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center", backgroundColor: "#fafafa" }}></td>
                          {/* Blank Grade Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 2px", textAlign: "center" }}></td>
                          {/* Blank Place Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 2px", textAlign: "center" }}></td>
                          {/* Blank Remarks Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center" }}></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* ── Official Valuation Certification & Signatures Box ── */}
                <div style={{
                  border: "1.5px solid #0f172a",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  backgroundColor: "#fafafa",
                  fontSize: "0.78rem",
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                }}>
                  {/* Summary counts */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px dashed #cbd5e1" }}>
                    <div>
                      <strong>Total Registered:</strong> {candidates.length}
                    </div>
                    <div>
                      <strong>Total Evaluated:</strong> <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "35px", minHeight: "14px" }}></span>
                    </div>
                    <div>
                      <strong>Total Absent:</strong> <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "35px", minHeight: "14px" }}></span>
                    </div>
                    <div>
                      <strong>Date of Valuation:</strong> <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "60px", minHeight: "14px" }}></span>
                    </div>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1.2fr 0.9fr",
                    gap: "12px",
                    alignItems: "flex-end",
                    paddingTop: "2px",
                  }}>
                    <div>
                      <div style={{ borderBottom: "1px solid #0f172a", minHeight: "18px", marginBottom: "3px" }}></div>
                      <div style={{ fontWeight: 700, fontSize: "0.76rem" }}>1st Evaluator / Judge</div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Name: _________________</div>
                    </div>

                    <div>
                      <div style={{ borderBottom: "1px solid #0f172a", minHeight: "18px", marginBottom: "3px" }}></div>
                      <div style={{ fontWeight: 700, fontSize: "0.76rem" }}>2nd Evaluator / Judge</div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Name: _________________</div>
                    </div>

                    <div>
                      <div style={{ borderBottom: "1px solid #0f172a", minHeight: "18px", marginBottom: "3px" }}></div>
                      <div style={{ fontWeight: 700, fontSize: "0.76rem" }}>Chief Examiner / Head</div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Zonal Valuation Center</div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        border: "1px dashed #94a3b8",
                        height: "38px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                      }}>
                        Official Seal
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Print Specific Stylesheet ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .valuation-sheet-page {
              box-shadow: none !important;
              border: none !important;
              padding: ${orientation === "landscape" ? "5mm 8mm" : "4mm 6mm"} !important;
              margin: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
            }
            @page {
              size: A4 ${orientation};
              margin: ${orientation === "landscape" ? "6mm 8mm" : "4mm"};
            }
          }
        `,
      }} />
    </div>
  );
}
