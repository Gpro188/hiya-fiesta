import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintInstitutionAttendancePage(props: {
  searchParams: Promise<{
    eventId?: string;
    zoneId?: string;
    teamId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { eventId, zoneId, teamId } = searchParams;

  const settings = await getSettings(eventId);

  // Find the active zone event
  let activeEvent: any = null;
  if (eventId) {
    activeEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true },
    });
  } else if (zoneId) {
    activeEvent = await prisma.event.findFirst({
      where: { type: "ZONE", zoneId },
      include: { zone: true },
    });
  }

  // Build team filter
  const teamWhere: any = {};
  if (teamId) {
    teamWhere.id = teamId;
  } else if (eventId) {
    teamWhere.eventId = eventId;
  } else if (zoneId) {
    // Find zone event first
    const zoneEvent = await prisma.event.findFirst({ where: { type: "ZONE", zoneId }, select: { id: true } });
    if (zoneEvent) teamWhere.eventId = zoneEvent.id;
  }

  // Fetch all teams for this event, with institution info and candidates
  const teams = await prisma.team.findMany({
    where: teamWhere,
    orderBy: [{ name: "asc" }],
    include: {
      institution: {
        select: { id: true, name: true, place: true, district: true, stream: true, code: true }
      },
      event: {
        select: { id: true, name: true }
      },
      candidates: {
        where: { isApproved: true },
        orderBy: [{ name: "asc" }],
        include: {
          category: { select: { name: true } },
          programs: {
            include: {
              program: {
                select: { id: true, name: true, programCode: true, type: true, stageType: true },
              },
            },
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });

  // Filter teams that have at least 1 candidate (unless viewing a specific team)
  const teamsWithCandidates = teamId
    ? teams
    : teams.filter((t) => t.candidates.length > 0);

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Fetch all zone events for the event switcher
  const allZoneEvents = await prisma.event.findMany({
    where: { type: "ZONE" },
    include: { zone: true },
    orderBy: { name: "asc" },
  });

  return (
    <div
      style={{
        maxWidth: "1050px",
        margin: "0 auto",
        padding: "20px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        minHeight: "100vh",
      }}
    >
      {/* ── Screen Control Bar ── */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          padding: "14px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 800,
                letterSpacing: "0.5px",
                color: "#f8fafc",
              }}
            >
              INSTITUTION REGISTRATION &amp; ATTENDANCE SHEET
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              {activeEvent?.name || settings.festName} •{" "}
              {teamsWithCandidates.length} Institution(s) listed
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <PrintButton label="Print Attendance Sheets" />
            <a
              href="/dashboard/reports"
              style={{
                padding: "6px 12px",
                backgroundColor: "#334155",
                color: "#ffffff",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              ← Back to Reports
            </a>
          </div>
        </div>

        {/* Zone Event Switcher */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
            paddingTop: "10px",
            borderTop: "1px solid #1e293b",
            fontSize: "0.78rem",
          }}
        >
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>Select Zone:</span>
          {allZoneEvents.map((ev) => {
            const url = `/print/institution-attendance?eventId=${ev.id}`;
            return (
              <a
                key={ev.id}
                href={url}
                style={{
                  padding: "4px 10px",
                  borderRadius: "5px",
                  border:
                    ev.id === eventId
                      ? "2px solid #38bdf8"
                      : "1px solid #475569",
                  backgroundColor: ev.id === eventId ? "#0284c7" : "#1e293b",
                  color: "#fff",
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {ev.zone?.name || ev.name}
              </a>
            );
          })}
        </div>
      </div>

      {/* ── Institution / Team Sheets ── */}
      {teamsWithCandidates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <h2>No institutions / candidates found</h2>
          <p>Select a zone from the filter above to see results.</p>
        </div>
      ) : (
        teamsWithCandidates.map((team) => {
          const inst = team.institution;
          const candidates = team.candidates;

          return (
            <div
              key={team.id}
              className="attendance-sheet-page"
              style={{
                marginBottom: "32px",
                pageBreakAfter: "always",
                breakAfter: "page",
                backgroundColor: "#ffffff",
                paddingBottom: "20px",
              }}
            >
              {/* ── Header ── */}
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "8px",
                  borderBottom: "2.5px solid #0f172a",
                  paddingBottom: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    color: "#8E0033",
                    letterSpacing: "1.5px",
                  }}
                >
                  {settings.festName}
                </div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#1e293b",
                    marginTop: "2px",
                  }}
                >
                  {activeEvent?.name || ""} — Institution Registration &amp; Attendance Sheet
                </div>
                {activeEvent?.zone && (
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#475569",
                      marginTop: "2px",
                    }}
                  >
                    Zone: {activeEvent.zone.name}
                  </div>
                )}
              </div>

              {/* ── Institution Info Box ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                  border: "1.5px solid #0f172a",
                  backgroundColor: "#f8fafc",
                  borderRadius: "4px",
                  padding: "10px 14px",
                  marginBottom: "12px",
                  fontSize: "0.84rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#8E0033" }}>
                    {inst?.name || team.name}
                  </div>
                  {inst?.place && (
                    <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
                      {inst.place}{inst.district ? `, ${inst.district}` : ""}
                    </div>
                  )}
                  {inst?.stream && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      Stream: <strong>{inst.stream}</strong>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Institution Code</div>
                  <div
                    style={{
                      fontWeight: 900,
                      fontFamily: "monospace",
                      fontSize: "1.1rem",
                      color: "#0f172a",
                    }}
                  >
                    {inst?.code || team.prefixCode || "—"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>
                    Team Prefix: <strong>{team.prefixCode}</strong>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Total Participants</div>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: "1.4rem",
                      color: "#0f172a",
                      lineHeight: 1,
                    }}
                  >
                    {candidates.length}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "4px" }}>
                    Date: {today}
                  </div>
                </div>
              </div>

              {/* ── Participant Attendance Table ── */}
              {candidates.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "4px",
                    marginBottom: "16px",
                  }}
                >
                  No participants registered for this institution.
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.82rem",
                    border: "1.5px solid #0f172a",
                    marginBottom: "16px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#0f172a",
                        color: "#ffffff",
                        textAlign: "center",
                      }}
                    >
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "40px" }}>
                        Sl
                      </th>
                      <th style={{ border: "1px solid #334155", padding: "7px 8px", width: "90px" }}>
                        Chest No.
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 10px",
                          textAlign: "left",
                          minWidth: "150px",
                        }}
                      >
                        Participant Name
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 6px",
                          width: "110px",
                          backgroundColor: "#1e293b",
                        }}
                      >
                        Category
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 10px",
                          textAlign: "left",
                        }}
                      >
                        Programs Assigned
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 8px",
                          width: "80px",
                          backgroundColor: "#1e293b",
                        }}
                      >
                        Present ✓
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((cand: any, idx: number) => {
                      const progList = cand.programs
                        .map((pa: any) =>
                          pa.program
                            ? `${pa.program.programCode ? pa.program.programCode + " - " : ""}${pa.program.name}`
                            : ""
                        )
                        .filter(Boolean)
                        .join("; ");

                      return (
                        <tr
                          key={cand.id}
                          style={{
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                            height: "40px",
                          }}
                        >
                          <td
                            style={{
                              border: "1px solid #cbd5e1",
                              padding: "4px",
                              textAlign: "center",
                              fontWeight: 800,
                            }}
                          >
                            {idx + 1}
                          </td>
                          <td
                            style={{
                              border: "1px solid #cbd5e1",
                              padding: "4px",
                              textAlign: "center",
                              fontWeight: 900,
                              fontSize: "1rem",
                              color: "#8E0033",
                              fontFamily: "monospace",
                            }}
                          >
                            {cand.chestNumber || "—"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #cbd5e1",
                              padding: "6px 8px",
                              textAlign: "left",
                            }}
                          >
                            <div style={{ fontWeight: 800, color: "#0f172a" }}>{cand.name}</div>
                          </td>
                          <td
                            style={{
                              border: "1px solid #cbd5e1",
                              padding: "4px 6px",
                              textAlign: "center",
                              fontSize: "0.78rem",
                              color: "#475569",
                              fontWeight: 700,
                            }}
                          >
                            {cand.category?.name || "General"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #cbd5e1",
                              padding: "4px 8px",
                              textAlign: "left",
                              fontSize: "0.75rem",
                              color: "#334155",
                            }}
                          >
                            {progList || <em style={{ color: "#94a3b8" }}>—</em>}
                          </td>
                          {/* Attendance checkbox cell */}
                          <td
                            style={{
                              border: "1px solid #cbd5e1",
                              padding: "4px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "30px",
                                height: "24px",
                                border: "2px solid #0f172a",
                                margin: "0 auto",
                                borderRadius: "3px",
                                backgroundColor: "#ffffff",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* ── Team Manager Sign Box ── */}
              <div
                style={{
                  border: "1.5px solid #0f172a",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  backgroundColor: "#fafafa",
                  fontSize: "0.80rem",
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.84rem", marginBottom: "10px" }}>
                  TEAM MANAGER / INSTITUTION REPRESENTATIVE DECLARATION
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "#475569",
                    marginBottom: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  I hereby certify that all the above-listed participants from{" "}
                  <strong>{inst?.name || team.name}</strong> are registered and eligible to
                  participate in the{" "}
                  <strong>{activeEvent?.name || settings.festName}</strong>. All details are correct
                  to the best of my knowledge and all participants have reported for the fest.
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "20px",
                    marginTop: "16px",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        borderBottom: "1.5px solid #0f172a",
                        height: "30px",
                        marginBottom: "5px",
                      }}
                    />
                    <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>Team Manager Name</div>
                  </div>
                  <div>
                    <div
                      style={{
                        borderBottom: "1.5px solid #0f172a",
                        height: "30px",
                        marginBottom: "5px",
                      }}
                    />
                    <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>
                      Team Manager Signature &amp; Date
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        borderBottom: "1.5px solid #0f172a",
                        height: "30px",
                        marginBottom: "5px",
                      }}
                    />
                    <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>
                      Zonal Admin / Controller Signature
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* ── Print CSS ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            .no-print { display: none !important; }
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .attendance-sheet-page {
              box-shadow: none !important;
              border: none !important;
              padding: 4mm 6mm !important;
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
              size: A4 portrait;
              margin: 6mm;
            }
          }
        `,
        }}
      />
    </div>
  );
}
