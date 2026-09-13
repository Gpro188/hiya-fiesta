import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintValuationPage(props: {
  searchParams: Promise<{ eventId?: string; programId?: string; stageType?: string; orientation?: string; copyMode?: string }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const orientation = searchParams.orientation === "portrait" ? "portrait" : "landscape";
  const copyMode = searchParams.copyMode === "jury1" ? "jury1" : searchParams.copyMode === "jury2" ? "jury2" : "both";
  const settings = await getSettings(eventId);

  let activeEv: any = null;
  let whereClause: any = {};

  if (eventId) {
    activeEv = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true },
    });
    if (activeEv?.parentId) {
      whereClause = {
        OR: [{ eventId: eventId }, { eventId: activeEv.parentId }],
      };
    } else {
      whereClause = { eventId };
    }
  }

  if (searchParams.programId) {
    whereClause.id = searchParams.programId;
  }

  if (searchParams.stageType) {
    whereClause.stageType = searchParams.stageType;
  }

  const programs = await prisma.program.findMany({
    where: whereClause,
    include: {
      category: true,
      assignments: {
        include: {
          candidate: {
            include: {
              institution: {
                include: {
                  zone: true,
                },
              },
              team: {
                include: {
                  institution: true,
                  event: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ programCode: "asc" }, { name: "asc" }],
  });

  const targetZoneId = activeEv?.zoneId || activeEv?.zone?.id;

  return (
    <div style={{
      maxWidth: orientation === "landscape" ? "1240px" : "960px",
      margin: "0 auto",
      padding: "20px 16px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#0f172a",
    }}>
      {/* ── Screen Action Bar ── */}
      <div className="no-print" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#1e293b",
        color: "#f8fafc",
        padding: "14px 20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
              OFFICIAL JURY VALUATION & MARK ENTRY SHEETS
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              {activeEv?.name || settings.festName} • Total Programs: {programs.length}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Print Orientation Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.75rem", color: "#cbd5e1", fontWeight: 700 }}>Layout:</span>
              <a
                href={`/print/valuation?eventId=${eventId || ""}&programId=${searchParams.programId || ""}&stageType=${searchParams.stageType || ""}&orientation=landscape&copyMode=${copyMode}`}
                style={{
                  padding: "5px 10px",
                  borderRadius: "5px",
                  border: orientation === "landscape" ? "2px solid #38bdf8" : "1px solid #475569",
                  backgroundColor: orientation === "landscape" ? "#0284c7" : "#334155",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                📃 Landscape
              </a>
              <a
                href={`/print/valuation?eventId=${eventId || ""}&programId=${searchParams.programId || ""}&stageType=${searchParams.stageType || ""}&orientation=portrait&copyMode=${copyMode}`}
                style={{
                  padding: "5px 10px",
                  borderRadius: "5px",
                  border: orientation === "portrait" ? "2px solid #38bdf8" : "1px solid #475569",
                  backgroundColor: orientation === "portrait" ? "#0284c7" : "#334155",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                📄 Portrait
              </a>
            </div>

            {/* On-Stage Dual Jury Copy Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.75rem", color: "#cbd5e1", fontWeight: 700 }}>Jury Copies:</span>
              <a
                href={`/print/valuation?eventId=${eventId || ""}&programId=${searchParams.programId || ""}&stageType=${searchParams.stageType || ""}&orientation=${orientation}&copyMode=both`}
                style={{
                  padding: "5px 10px",
                  borderRadius: "5px",
                  border: copyMode === "both" ? "2px solid #f59e0b" : "1px solid #475569",
                  backgroundColor: copyMode === "both" ? "#d97706" : "#334155",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Generates 2 separate physical sheets per program: one for Jury 1 and one for Jury 2"
              >
                👥 Both Juries (2 Sheets/Prog)
              </a>
              <a
                href={`/print/valuation?eventId=${eventId || ""}&programId=${searchParams.programId || ""}&stageType=${searchParams.stageType || ""}&orientation=${orientation}&copyMode=jury1`}
                style={{
                  padding: "5px 10px",
                  borderRadius: "5px",
                  border: copyMode === "jury1" ? "2px solid #38bdf8" : "1px solid #475569",
                  backgroundColor: copyMode === "jury1" ? "#0284c7" : "#334155",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                👤 Jury 1 Only
              </a>
              <a
                href={`/print/valuation?eventId=${eventId || ""}&programId=${searchParams.programId || ""}&stageType=${searchParams.stageType || ""}&orientation=${orientation}&copyMode=jury2`}
                style={{
                  padding: "5px 10px",
                  borderRadius: "5px",
                  border: copyMode === "jury2" ? "2px solid #38bdf8" : "1px solid #475569",
                  backgroundColor: copyMode === "jury2" ? "#0284c7" : "#334155",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                👤 Jury 2 Only
              </a>
            </div>

            <PrintButton label="Print All Valuation Sheets" />
            <a
              href="/dashboard/reports"
              style={{
                padding: "6px 12px",
                backgroundColor: "#475569",
                color: "#ffffff",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              Back to Reports
            </a>
          </div>
        </div>

        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
          <div>
            💡 <strong>Landscape Printing:</strong> Pre-configured in <em>Landscape</em> for wide evaluation columns. In the browser print dialog, verify <em>Layout</em> is set to <strong>Landscape</strong>.
          </div>
          <div style={{ color: "#38bdf8", fontWeight: 700 }}>
            Active Print Layout: <span style={{ textTransform: "capitalize" }}>{orientation}</span>
          </div>
        </div>
      </div>

      {/* ── Program Sheets ── */}
      {programs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <h2>No programs found for this selection</h2>
          <p>Please check your filters or return to Reports.</p>
        </div>
      ) : (
        programs.flatMap((program) => {
          // Filter assignments for this specific zone if event is zonal
          let candidateAssignments = program.assignments.filter((a) => Boolean(a.candidate));

          if (targetZoneId) {
            const zoneFiltered = candidateAssignments.filter((a) => {
              const c = a.candidate;
              const zId =
                c.institution?.zoneId ||
                c.institution?.zone?.id ||
                c.team?.institution?.zoneId ||
                c.team?.event?.zoneId;
              return zId === targetZoneId;
            });
            // If candidates exist for this zone, use them; otherwise show all assigned
            if (zoneFiltered.length > 0) {
              candidateAssignments = zoneFiltered;
            }
          }

          // Sort candidates: confirmed with numeric chest numbers first, then alphabetically
          candidateAssignments.sort((a, b) => {
            const cA = a.candidate;
            const cB = b.candidate;
            if (cA.chestNumber && cB.chestNumber) {
              const numA = parseInt(cA.chestNumber, 10);
              const numB = parseInt(cB.chestNumber, 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return cA.chestNumber.localeCompare(cB.chestNumber);
            }
            if (cA.chestNumber) return -1;
            if (cB.chestNumber) return 1;
            return cA.name.localeCompare(cB.name);
          });

          const isStage = program.stageType === "ON_STAGE";
          let juryCopies = [0];
          if (isStage) {
            if (copyMode === "jury1") juryCopies = [1];
            else if (copyMode === "jury2") juryCopies = [2];
            else juryCopies = [1, 2]; // Both Juries (2 distinct printed sheets per program)
          }

          return juryCopies.map((juryNum) => {
            const isCopy1 = juryNum === 1;
            const isCopy2 = juryNum === 2;
            const copyTitle = isCopy1 
              ? "OFFICIAL JURY 1 VALUATION & MARK ENTRY SHEET" 
              : isCopy2 
              ? "OFFICIAL JURY 2 VALUATION & MARK ENTRY SHEET" 
              : "OFFICIAL JURY VALUATION & MARK ENTRY RECORD";

            return (
              <div
                key={`${program.id}_jury_${juryNum}`}
                className="valuation-sheet-page"
                style={{
                  marginBottom: "40px",
                  pageBreakAfter: "always",
                  breakAfter: "page",
                  paddingBottom: "24px",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* ── Sheet Header ── */}
                <div style={{ textAlign: "center", marginBottom: "10px", borderBottom: "2px solid #0f172a", paddingBottom: "8px" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "#8E0033" }}>
                    {settings.festName}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "2px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a", letterSpacing: "1px", textTransform: "uppercase" }}>
                      {copyTitle}
                    </span>
                    {isCopy1 && (
                      <span style={{ backgroundColor: "#1e40af", color: "#ffffff", padding: "2px 8px", borderRadius: "3px", fontSize: "0.72rem", fontWeight: 900 }}>
                        JURY 1 COPY
                      </span>
                    )}
                    {isCopy2 && (
                      <span style={{ backgroundColor: "#9d174d", color: "#ffffff", padding: "2px 8px", borderRadius: "3px", fontSize: "0.72rem", fontWeight: 900 }}>
                        JURY 2 COPY
                      </span>
                    )}
                  </div>
                  {activeEv && (
                    <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                      {activeEv.name} {activeEv.zone ? `(${activeEv.zone.name})` : ""}
                    </div>
                  )}
                </div>

              {/* ── Program Meta Information Box ── */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1fr",
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
                      fontFamily: "monospace",
                    }}>
                      CODE: {program.programCode || "P"}
                    </span>
                    <strong style={{ fontSize: "1.02rem", color: "#0f172a" }}>
                      {program.name}
                    </strong>
                  </div>
                  <div style={{ color: "#334155", fontSize: "0.78rem", marginTop: "2px" }}>
                    <strong>Category:</strong> <span style={{ fontWeight: 700 }}>{program.category?.name || "General"}</span> • <strong>Stage:</strong> {program.stageType} • <strong>Type:</strong> {program.type}
                  </div>
                </div>

                <div style={{ textAlign: "right", borderLeft: "1px solid #cbd5e1", paddingLeft: "12px" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>
                    Stage: {program.venue || "Main Stage"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "1px" }}>
                    Duration: <strong>{program.duration} Min</strong> • Max: <strong>100</strong>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "1px" }}>
                    Candidates in Zone: <strong>{candidateAssignments.length}</strong>
                  </div>
                </div>
              </div>

              {/* ── Valuation Protocol Banner ── */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: isCopy1 ? "#eff6ff" : isCopy2 ? "#fdf2f8" : "#f1f5f9",
                border: isCopy1 ? "1px solid #93c5fd" : isCopy2 ? "1px solid #f9a8d4" : "1px solid #cbd5e1",
                borderRadius: "3px",
                padding: "4px 8px",
                marginBottom: "8px",
                fontSize: "0.74rem",
                color: "#1e293b",
              }}>
                <div>
                  <strong>Valuation Rule:</strong> Two-Jury consensus model. Grade scale: <strong>A+ (90-100)</strong>, <strong>A (80-89)</strong>, <strong>B (70-79)</strong>, <strong>C (60-69)</strong>.
                </div>
                <div style={{ fontWeight: 700, color: isCopy1 ? "#1d4ed8" : isCopy2 ? "#be185d" : "#0f172a" }}>
                  {isCopy1 ? "Evaluation Copy: Jury 1" : isCopy2 ? "Evaluation Copy: Jury 2" : "Evaluation Record"}
                </div>
              </div>

              {/* ── Candidate Scoring Table ── */}
              {candidateAssignments.length === 0 ? (
                <div style={{
                  padding: "30px",
                  textAlign: "center",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "4px",
                  color: "#64748b",
                  marginBottom: "12px",
                  fontSize: "0.85rem",
                }}>
                  No candidates registered for this program in this zone yet.
                </div>
              ) : (
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.78rem",
                  marginBottom: "12px",
                  border: "1.5px solid #0f172a",
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                      <th style={{ width: "35px", padding: "6px 4px", border: "1px solid #334155" }}>Sl</th>
                      <th style={{ width: "80px", padding: "6px 4px", border: "1px solid #334155" }}>Chest No</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", border: "1px solid #334155" }}>Candidate / Institution Name</th>
                      <th style={{ width: "90px", padding: "6px 4px", border: "1px solid #334155" }}>Criteria 1 (30)</th>
                      <th style={{ width: "90px", padding: "6px 4px", border: "1px solid #334155" }}>Criteria 2 (30)</th>
                      <th style={{ width: "90px", padding: "6px 4px", border: "1px solid #334155" }}>Criteria 3 (20)</th>
                      <th style={{ width: "90px", padding: "6px 4px", border: "1px solid #334155" }}>Criteria 4 (20)</th>
                      <th style={{ width: "70px", padding: "6px 4px", border: "1px solid #334155" }}>Total (100)</th>
                      <th style={{ width: "55px", padding: "6px 4px", border: "1px solid #334155" }}>Grade</th>
                      <th style={{ width: "55px", padding: "6px 4px", border: "1px solid #334155" }}>Rank</th>
                      <th style={{ width: "110px", padding: "6px 4px", border: "1px solid #334155" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateAssignments.map((assignment, idx) => {
                      const c = assignment.candidate;
                      const instName = c.institution?.name || c.team?.institution?.name || "-";
                      const chestNo = c.chestNumber || "Pending";

                      return (
                        <tr key={assignment.id} style={{
                          backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                          textAlign: "center",
                          height: "36px",
                        }}>
                          <td style={{ border: "1px solid #cbd5e1", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{
                            border: "1px solid #cbd5e1",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            fontSize: "0.92rem",
                            color: "#8E0033",
                          }}>
                            {chestNo}
                          </td>
                          <td style={{ border: "1px solid #cbd5e1", textAlign: "left", padding: "4px 8px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{instName}</div>
                          </td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                          <td style={{ border: "1px solid #cbd5e1", backgroundColor: "#f1f5f9" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px dashed #cbd5e1" }}>
                  <div>
                    <strong>Total Candidates:</strong> {candidateAssignments.length}
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
                  gridTemplateColumns: "1.1fr 1.1fr 1.1fr 0.7fr",
                  gap: "12px",
                  alignItems: "flex-end",
                  paddingTop: "2px",
                }}>
                  <div style={{ backgroundColor: isCopy1 ? "#eff6ff" : "transparent", padding: isCopy1 ? "4px 6px" : "0", borderRadius: "4px", border: isCopy1 ? "1px solid #bfdbfe" : "none" }}>
                    <div style={{ borderBottom: "1px solid #0f172a", minHeight: "18px", marginBottom: "3px" }}></div>
                    <div style={{ fontWeight: 800, fontSize: "0.76rem", color: isCopy1 ? "#1e40af" : "#0f172a" }}>
                      {isCopy1 ? "✓ Evaluator 1 (Jury 1 Signature)" : "Evaluator 1 (Jury 1)"}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Name: _________________</div>
                  </div>

                  <div style={{ backgroundColor: isCopy2 ? "#fdf2f8" : "transparent", padding: isCopy2 ? "4px 6px" : "0", borderRadius: "4px", border: isCopy2 ? "1px solid #fbcfe8" : "none" }}>
                    <div style={{ borderBottom: "1px solid #0f172a", minHeight: "18px", marginBottom: "3px" }}></div>
                    <div style={{ fontWeight: 800, fontSize: "0.76rem", color: isCopy2 ? "#9d174d" : "#0f172a" }}>
                      {isCopy2 ? "✓ Evaluator 2 (Jury 2 Signature)" : "Evaluator 2 (Jury 2)"}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Name: _________________</div>
                  </div>

                  <div>
                    <div style={{ borderBottom: "1px solid #0f172a", minHeight: "18px", marginBottom: "3px" }}></div>
                    <div style={{ fontWeight: 700, fontSize: "0.76rem" }}>Stage Manager / Chief Judge</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Verification Signature</div>
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
        });
      })
      )}

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
