"use client";

import React from "react";
import PrintButton from "./PrintButton";

export interface OffStageCandidateRow {
  assignmentId: string;
  candidateId: string;
  candidateName: string;
  candidateUid: string | null;
  candidatePhoto?: string | null;
  chestNumber: string | null;
  programId: string;
  programName: string;
  programCode: string | null;
  duration: number; // in minutes
  startTime: string | null;
  endTime: string | null;
  venue?: string | null;
}

export interface CategoryOffStageGroup {
  categoryId: string;
  categoryName: string;
  rows: OffStageCandidateRow[];
}

export interface InstitutionOffStageData {
  teamId: string;
  teamName: string;
  institutionName: string;
  institutionCode?: string | null;
  zoneName: string;
  eventName: string;
  categories: CategoryOffStageGroup[];
}

export default function OffStageInvigilationSheet({
  institutionsData,
  festName,
  festMoto,
}: {
  institutionsData: InstitutionOffStageData[];
  festName: string;
  festMoto?: string;
}) {
  return (
    <div className="offstage-print-wrapper" style={{ backgroundColor: "#f8fafc", minHeight: "100vh", padding: "20px" }}>
      {/* Top Action Bar (hidden when printing) */}
      <div
        className="no-print"
        style={{
          maxWidth: "1050px",
          margin: "0 auto 20px auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "16px 24px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#1e1b4b", fontWeight: 800 }}>
            📝 Off-Stage Invigilation & Attendance Sheets
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Each category prints on a separate sheet with blank organiser details and candidate signature boxes.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <PrintButton />
        </div>
      </div>

      {/* Printable Sheets */}
      <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
        {institutionsData.map((inst, instIdx) => {
          if (inst.categories.length === 0) {
            return (
              <div
                key={inst.teamId}
                className="sheet-page"
                style={{
                  backgroundColor: "#ffffff",
                  padding: "40px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  marginBottom: "30px",
                  textAlign: "center",
                }}
              >
                <h3>{inst.institutionName}</h3>
                <p style={{ color: "#64748b" }}>No off-stage programs registered for this institution.</p>
              </div>
            );
          }

          return inst.categories.map((catGroup, catIdx) => (
            <div
              key={`${inst.teamId}-${catGroup.categoryId}`}
              className="sheet-page"
              style={{
                backgroundColor: "#ffffff",
                padding: "36px 32px 30px 32px",
                border: "2px solid #0f172a",
                borderRadius: "4px",
                marginBottom: "36px",
                boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
                position: "relative",
                pageBreakAfter: "always",
                breakAfter: "page",
                color: "#0f172a",
                fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
              }}
            >
              {/* ── Official Header ── */}
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "2px solid #0f172a",
                  paddingBottom: "14px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: "#475569",
                  }}
                >
                  COUNCIL OF SAMASTHA WOMEN&apos;S COLLEGES (CSWC)
                </div>
                <h1
                  style={{
                    margin: "4px 0",
                    fontSize: "1.65rem",
                    fontWeight: 900,
                    color: "#8E0033",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {festName || "CSWC HIYA FIESTA 2026"}
                </h1>
                <div
                  style={{
                    display: "inline-block",
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    padding: "4px 18px",
                    borderRadius: "4px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    marginTop: "4px",
                  }}
                >
                  OFF-STAGE COMPETITIONS — INVIGILATION & ATTENDANCE RECORD
                </div>
              </div>

              {/* ── Institution & Zone Info Grid ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr",
                  gap: "10px",
                  padding: "10px 14px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #94a3b8",
                  borderRadius: "4px",
                  marginBottom: "14px",
                  fontSize: "0.88rem",
                }}
              >
                <div>
                  <div style={{ marginBottom: "4px" }}>
                    <strong>INSTITUTION:</strong>{" "}
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e1b4b" }}>
                      {inst.institutionName}
                    </span>
                    {inst.institutionCode && (
                      <span style={{ color: "#64748b", marginLeft: "6px" }}>({inst.institutionCode})</span>
                    )}
                  </div>
                  <div>
                    <strong>ZONE:</strong> <span style={{ fontWeight: 700 }}>{inst.zoneName || "Regional Zone"}</span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ marginBottom: "4px" }}>
                    <strong>CATEGORY:</strong>{" "}
                    <span
                      style={{
                        backgroundColor: "#8E0033",
                        color: "#ffffff",
                        padding: "3px 12px",
                        borderRadius: "4px",
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {catGroup.categoryName.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                    Total Candidates in Category: <strong>{catGroup.rows.length}</strong>
                  </div>
                </div>
              </div>

              {/* ── Organiser Details (Blank to Fill) ── */}
              <div
                style={{
                  border: "1px dashed #475569",
                  borderRadius: "4px",
                  padding: "10px 14px",
                  marginBottom: "18px",
                  backgroundColor: "#ffffff",
                  fontSize: "0.86rem",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "16px", alignItems: "center" }}>
                  <div>
                    <strong>Name of Organiser:</strong>{" "}
                    <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "60%", minHeight: "18px" }}></span>
                  </div>
                  <div>
                    <strong>Contact / Mobile:</strong>{" "}
                    <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "55%", minHeight: "18px" }}></span>
                  </div>
                  <div>
                    <strong>Date of Event:</strong>{" "}
                    <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "55%", minHeight: "18px" }}></span>
                  </div>
                </div>
              </div>

              {/* ── Program & Candidate Table ── */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.82rem",
                  marginBottom: "20px",
                  border: "1.5px solid #0f172a",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #0f172a", color: "#0f172a" }}>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "28px", textAlign: "center" }}>
                      Sl.
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 6px", textAlign: "left" }}>
                      Program Name & Code
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "55px", textAlign: "center" }}>
                      Duration
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "50px", textAlign: "center" }}>
                      Photo
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 8px", textAlign: "left" }}>
                      Candidate Name
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "80px", textAlign: "center" }}>
                      UID
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "60px", textAlign: "center" }}>
                      Chest No.
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "85px", textAlign: "center" }}>
                      Time (Start - End)
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "95px", textAlign: "center" }}>
                      Sign of Candidate
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "85px", textAlign: "center" }}>
                      Organiser Sign
                    </th>
                    <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "55px", textAlign: "center" }}>
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {catGroup.rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                        No candidates assigned for off-stage programs in this category.
                      </td>
                    </tr>
                  ) : (
                    catGroup.rows.map((row, idx) => (
                      <tr key={row.assignmentId || `${row.candidateId}-${row.programId}`} style={{ borderBottom: "1px solid #94a3b8" }}>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>
                          {idx + 1}
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 8px" }}>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>
                            {row.programName}
                          </div>
                          {row.programCode && (
                            <span
                              style={{
                                display: "inline-block",
                                backgroundColor: "rgba(142,0,51,0.08)",
                                color: "#8E0033",
                                padding: "1px 6px",
                                borderRadius: "3px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                marginTop: "2px",
                              }}
                            >
                              Code: {row.programCode}
                            </span>
                          )}
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 600 }}>
                          {row.duration ? `${row.duration} M` : "—"}
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "4px 2px", textAlign: "center", verticalAlign: "middle" }}>
                          {row.candidatePhoto ? (
                            <img
                              src={row.candidatePhoto}
                              alt={row.candidateName}
                              style={{
                                width: "40px",
                                height: "48px",
                                objectFit: "cover",
                                borderRadius: "3px",
                                border: "1px solid #334155",
                                display: "block",
                                margin: "0 auto",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "40px",
                                height: "48px",
                                backgroundColor: "#f1f5f9",
                                border: "1px dashed #94a3b8",
                                borderRadius: "3px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto",
                                color: "#94a3b8",
                              }}
                            >
                              <span style={{ fontSize: "0.8rem", lineHeight: 1 }}>👤</span>
                              <span style={{ fontSize: "0.48rem", fontWeight: 700, marginTop: "2px" }}>NO PIC</span>
                            </div>
                          )}
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 8px", fontWeight: 700 }}>
                          {row.candidateName}
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontFamily: "monospace", fontSize: "0.8rem", color: "#334155" }}>
                          {row.candidateUid || "—"}
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 800, fontSize: "0.88rem", color: "#8E0033" }}>
                          {row.chestNumber || "—"}
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontSize: "0.75rem" }}>
                          <div style={{ color: "#475569" }}>___:___ to ___:___</div>
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}>
                          {/* Blank box for candidate signature */}
                          <div style={{ minHeight: "26px", borderBottom: "1px dotted #94a3b8" }}></div>
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}>
                          {/* Blank box for organiser signature */}
                          <div style={{ minHeight: "26px", borderBottom: "1px dotted #94a3b8" }}></div>
                        </td>
                        <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontSize: "0.75rem", color: "#64748b" }}>
                          [ &nbsp; ] P &nbsp; [ &nbsp; ] A
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* ── Certification & Signatures Box ── */}
              <div
                style={{
                  border: "1.5px solid #0f172a",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  backgroundColor: "#fafafa",
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ fontStyle: "italic", marginBottom: "22px", color: "#334155", lineHeight: 1.4 }}>
                  <strong>Organiser Certification:</strong> I hereby certify that the above off-stage competitions / events were conducted strictly adhering to the official CSWC Hiya Fiesta 2026 guidelines, syllabus duration, and event protocols without any malpractice.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1.2fr 1fr",
                    gap: "16px",
                    alignItems: "flex-end",
                    marginTop: "16px",
                    paddingTop: "10px",
                  }}
                >
                  <div>
                    <div style={{ borderBottom: "1px solid #0f172a", minHeight: "22px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 700 }}>Signature of Organiser</div>
                    <div style={{ fontSize: "0.74rem", color: "#64748b" }}>Name: ____________________</div>
                  </div>

                  <div>
                    <div style={{ borderBottom: "1px solid #0f172a", minHeight: "22px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 700 }}>Signature of Principal / Manager</div>
                    <div style={{ fontSize: "0.74rem", color: "#64748b" }}>Institution Head</div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        border: "1px dashed #94a3b8",
                        height: "50px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                        fontSize: "0.72rem",
                        textTransform: "uppercase",
                      }}
                    >
                      Institution Seal
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Number indicator */}
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  right: "24px",
                  fontSize: "0.72rem",
                  color: "#94a3b8",
                }}
              >
                Sheet: {catGroup.categoryName} · Page {catIdx + 1} of {inst.categories.length}
              </div>
            </div>
          ));
        })}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .offstage-print-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .sheet-page {
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            margin: 0 !important;
            margin-bottom: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 24px 20px !important;
          }
          table {
            border: 1.5px solid #000000 !important;
          }
          th,
          td {
            border: 1px solid #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}
