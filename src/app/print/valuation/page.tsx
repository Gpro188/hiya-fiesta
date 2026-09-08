import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintValuationPage(props: {
  searchParams: Promise<{ eventId?: string; programId?: string; stageType?: string }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
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
    orderBy: [
      { stageType: "asc" },
      { category: { name: "asc" } },
      { programCode: "asc" },
      { name: "asc" },
    ],
    include: {
      category: true,
      assignments: {
        include: {
          candidate: {
            include: {
              category: true,
              institution: { include: { zone: true } },
              team: {
                include: {
                  institution: { include: { zone: true } },
                  event: { include: { zone: true } },
                },
              },
            },
          },
        },
        orderBy: [{ slotNumber: "asc" }],
      },
    },
  });

  const targetZoneId = activeEv?.zoneId || null;

  return (
    <div style={{ padding: "30px 40px", backgroundColor: "white", color: "#0f172a", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Screen Controls Header ── */}
      <div className="no-print" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#1e293b",
        color: "#f8fafc",
        padding: "14px 20px",
        borderRadius: "8px",
        marginBottom: "24px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
              <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2.5px solid #0f172a", paddingBottom: "14px" }}>
                <div style={{ fontSize: "1.35rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "#8E0033" }}>
                  {settings.festName}
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: "2px" }}>
                  OFFICIAL JURY VALUATION & MARK ENTRY RECORD
                </div>
                {activeEv && (
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                    {activeEv.name} {activeEv.zone ? `(${activeEv.zone.name})` : ""}
                  </div>
                )}
              </div>

              {/* ── Program Meta Information Box ── */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1fr",
                gap: "16px",
                backgroundColor: "#f8fafc",
                border: "1.5px solid #0f172a",
                borderRadius: "4px",
                padding: "12px 16px",
                marginBottom: "14px",
                fontSize: "0.86rem",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{
                      backgroundColor: "#8E0033",
                      color: "#ffffff",
                      padding: "2px 8px",
                      borderRadius: "3px",
                      fontWeight: 900,
                      fontSize: "0.82rem",
                      fontFamily: "monospace",
                    }}>
                      CODE: {program.programCode || "P"}
                    </span>
                    <strong style={{ fontSize: "1.1rem", color: "#0f172a" }}>
                      {program.name}
                    </strong>
                  </div>
                  <div style={{ color: "#334155", fontSize: "0.82rem", marginTop: "4px" }}>
                    <strong>Category:</strong> <span style={{ fontWeight: 700 }}>{program.category?.name || "General"}</span> • <strong>Stage:</strong> {program.stageType} • <strong>Type:</strong> {program.type}
                  </div>
                </div>

                <div style={{ textAlign: "right", borderLeft: "1px solid #cbd5e1", paddingLeft: "16px" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                    Stage / Venue: {program.venue || "Main Stage"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
                    Duration: <strong>{program.duration} Minutes</strong> • Max Score: <strong>100</strong>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                    Total Candidates: <strong>{candidateAssignments.length}</strong>
                  </div>
                </div>
              </div>

              {/* ── Valuation Protocol Banner ── */}
              <div style={{
                padding: "6px 12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "4px",
                fontSize: "0.75rem",
                color: "#991b1b",
                marginBottom: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span>
                  <strong>Valuation Protocol:</strong> Verify candidate performance with official <strong>Chest Number</strong> and candidate photo. Enter marks in ink without overwriting.
                </span>
                <span>
                  <strong>Columns:</strong> Maximum Score (100) &bull; Obtained Score &bull; Grade &bull; Place (1st, 2nd, 3rd)
                </span>
              </div>

              {/* ── Candidates Valuation Table ── */}
              {candidateAssignments.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontStyle: "italic", border: "1px dashed #cbd5e1", borderRadius: "4px", marginBottom: "16px" }}>
                  No candidate assignments registered for this program.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", border: "1.5px solid #0f172a", marginBottom: "16px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "28px" }}>Sl</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "85px" }}>Chest No.</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "50px" }}>Photo</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 8px", textAlign: "left" }}>Candidate Name & UID</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 8px", textAlign: "left", width: "190px" }}>Institution</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "90px" }}>Maximum Score</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "95px", backgroundColor: "#1e293b" }}>Obtained Score</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "65px" }}>Grade</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "65px" }}>Place</th>
                      <th style={{ border: "1px solid #0f172a", padding: "8px 6px", textAlign: "left", width: "100px" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateAssignments.map((assignment, idx) => {
                      const c = assignment.candidate;
                      const inst = c.institution || c.team?.institution;
                      return (
                        <tr key={assignment.id} style={{ borderBottom: "1px solid #94a3b8" }}>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>
                            {idx + 1}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}>
                            {c.chestNumber ? (
                              <span style={{
                                display: "inline-block",
                                backgroundColor: "#fdf2f4",
                                border: "1.5px solid #8E0033",
                                color: "#8E0033",
                                fontWeight: 900,
                                fontSize: "0.95rem",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                letterSpacing: "0.5px",
                              }}>
                                {c.chestNumber}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "0.72rem", fontStyle: "italic" }}>
                                [PENDING]
                              </span>
                            )}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "4px 2px", textAlign: "center", verticalAlign: "middle" }}>
                            {c.photo || c.photoUrl ? (
                              <img
                                src={(c.photo || c.photoUrl) as string}
                                alt={c.name}
                                style={{
                                  width: "38px",
                                  height: "46px",
                                  objectFit: "cover",
                                  borderRadius: "3px",
                                  border: "1px solid #334155",
                                  display: "block",
                                  margin: "0 auto",
                                }}
                              />
                            ) : (
                              <div style={{
                                width: "38px",
                                height: "46px",
                                backgroundColor: "#f1f5f9",
                                border: "1px dashed #94a3b8",
                                borderRadius: "3px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto",
                                color: "#94a3b8",
                              }}>
                                <span style={{ fontSize: "0.75rem", lineHeight: 1 }}>👤</span>
                                <span style={{ fontSize: "0.45rem", fontWeight: 700, marginTop: "2px" }}>NO PIC</span>
                              </div>
                            )}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 8px" }}>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>
                              UID: {c.uid || "—"}
                            </div>
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 8px", fontSize: "0.78rem" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              {inst?.name || c.team?.name || "Unknown"}
                            </div>
                            {inst?.code && (
                              <span style={{
                                display: "inline-block",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                marginTop: "2px",
                              }}>
                                CODE: {inst.code} {inst.place ? `• ${inst.place}` : ""}
                              </span>
                            )}
                          </td>
                          {/* Maximum Score */}
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                            100
                          </td>
                          {/* Blank Score Entry Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", backgroundColor: "#fafafa" }}></td>
                          {/* Blank Grade Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}></td>
                          {/* Blank Place Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}></td>
                          {/* Blank Remarks Cell */}
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}></td>
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
                padding: "12px 16px",
                backgroundColor: "#fafafa",
                fontSize: "0.82rem",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px dashed #cbd5e1" }}>
                  <div>
                    <strong>Total Candidates:</strong> {candidateAssignments.length}
                  </div>
                  <div>
                    <strong>Total Evaluated:</strong> <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "40px", minHeight: "16px" }}></span>
                  </div>
                  <div>
                    <strong>Total Absent:</strong> <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "40px", minHeight: "16px" }}></span>
                  </div>
                  <div>
                    <strong>Date of Valuation:</strong> <span style={{ borderBottom: "1px solid #0f172a", display: "inline-block", width: "70px", minHeight: "16px" }}></span>
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1.2fr 0.9fr",
                  gap: "16px",
                  alignItems: "flex-end",
                  paddingTop: "6px",
                }}>
                  <div>
                    <div style={{ borderBottom: "1px solid #0f172a", minHeight: "22px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 700 }}>Signature of 1st Evaluator / Judge</div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Name: _________________</div>
                  </div>

                  <div>
                    <div style={{ borderBottom: "1px solid #0f172a", minHeight: "22px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 700 }}>Signature of 2nd Evaluator / Judge</div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Name: _________________</div>
                  </div>

                  <div>
                    <div style={{ borderBottom: "1px solid #0f172a", minHeight: "22px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 700 }}>Chief Examiner / Valuation Head</div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Verification Signature</div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      border: "1px dashed #94a3b8",
                      height: "46px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: "0.68rem",
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
              padding: 8mm 10mm !important;
              margin: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
            }
            @page {
              size: A4 portrait;
              margin: 6mm;
            }
          }
        `,
      }} />
    </div>
  );
}
