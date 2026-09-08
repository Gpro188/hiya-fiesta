import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintValuationPage(props: {
  searchParams: Promise<{ eventId?: string; programId?: string; stageType?: string; orientation?: string }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const orientation = searchParams.orientation === "portrait" ? "portrait" : "landscape";
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
                href={`/print/valuation?eventId=${eventId || ""}&programId=${searchParams.programId || ""}&stageType=${searchParams.stageType || ""}&orientation=landscape`}
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
                📃 Landscape (Default)
              </a>
              <a
                href={`/print/valuation?eventId=${eventId || ""}&programId=${searchParams.programId || ""}&stageType=${searchParams.stageType || ""}&orientation=portrait`}
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

            <PrintButton label={`Print All Valuation Sheets (${programs.length})`} />
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
        programs.map((program) => {
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

          return (
            <div
              key={program.id}
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
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: "2px" }}>
                  OFFICIAL JURY VALUATION & MARK ENTRY RECORD
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

              {/* ── Candidates Valuation Table ── */}
              {candidateAssignments.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontStyle: "italic", border: "1px dashed #cbd5e1", borderRadius: "4px", marginBottom: "10px" }}>
                  No candidate assignments registered for this program.
                </div>
              ) : (
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
                    {candidateAssignments.map((assignment, idx) => {
                      const c = assignment.candidate;
                      const inst = c.institution || c.team?.institution;
                      return (
                        <tr key={assignment.id} style={{ borderBottom: "1px solid #94a3b8" }}>
                          <td style={{ border: "1px solid #0f172a", padding: "3px 2px", textAlign: "center", fontWeight: 700 }}>
                            {idx + 1}
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
                            {c.photo || c.photoUrl ? (
                              <img
                                src={(c.photo || c.photoUrl) as string}
                                alt={c.name}
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
                              {c.name}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "#64748b", fontFamily: "monospace", marginTop: "1px" }}>
                              UID: {c.uid || "—"}
                            </div>
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center" }} title={inst?.name || c.team?.name || ""}>
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
                              {inst?.code || "—"}
                            </span>
                          </td>
                          {/* Maximum Score */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                            100
                          </td>
                          {/* Blank Score Entry Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center", backgroundColor: "#fafafa" }}></td>
                          {/* Blank Grade Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 2px", textAlign: "center" }}></td>
                          {/* Blank Place Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 2px", textAlign: "center" }}></td>
                          {/* Blank Remarks Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "3px 4px", textAlign: "center" }}></td>
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
