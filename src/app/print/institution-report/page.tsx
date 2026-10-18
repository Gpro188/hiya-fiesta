import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function PrintInstitutionReportPage(props: {
  searchParams: Promise<{
    teamId?: string;
    institutionId?: string;
    eventId?: string;
    zoneId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  let { teamId, institutionId, eventId, zoneId } = searchParams;

  // If institutionId was provided, resolve teamId
  if (!teamId && institutionId) {
    const team = await prisma.team.findFirst({
      where: { institutionId },
      select: { id: true }
    });
    if (team) teamId = team.id;
  }

  // Fetch all zone events for the Event / Zone selector
  const allZoneEvents = await prisma.event.findMany({
    where: { type: "ZONE" },
    include: { zone: true },
    orderBy: { name: "asc" },
  });

  // Determine active event
  let activeEvent: any = null;
  if (eventId) {
    activeEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true },
    });
  } else if (zoneId) {
    activeEvent = await prisma.event.findFirst({
      where: { type: "ZONE", zoneId },
      include: { zone: true, parent: true },
    });
  } else if (teamId) {
    const singleTeam = await prisma.team.findUnique({
      where: { id: teamId },
      select: { eventId: true }
    });
    if (singleTeam?.eventId) {
      activeEvent = await prisma.event.findUnique({
        where: { id: singleTeam.eventId },
        include: { zone: true, parent: true },
      });
    }
  }

  // Fallback if still no event
  if (!activeEvent) {
    activeEvent = allZoneEvents[0] || (await prisma.event.findFirst({ include: { zone: true, parent: true } }));
  }

  const effectiveEventId = activeEvent?.id;
  const settings = await getSettings(effectiveEventId);
  const eventName = activeEvent?.name || "Zonal Festival";

  // Build team query
  const teamWhere: any = {};
  if (teamId) {
    teamWhere.id = teamId;
  } else if (effectiveEventId) {
    teamWhere.eventId = effectiveEventId;
  }

  // Fetch teams with their institutions and on-stage candidates
  const rawTeams = await prisma.team.findMany({
    where: teamWhere,
    orderBy: [
      { institution: { name: 'asc' } },
      { name: 'asc' }
    ],
    include: {
      institution: {
        include: { zone: true }
      },
      event: {
        include: { parent: true, zone: true }
      },
      candidates: {
        where: {
          programs: {
            some: {
              program: { stageType: "ON_STAGE" }
            }
          }
        },
        include: {
          category: true,
          programs: {
            where: {
              program: { stageType: "ON_STAGE" }
            },
            include: {
              program: {
                select: {
                  id: true,
                  name: true,
                  programCode: true,
                  venue: true,
                  startTime: true,
                  stageType: true
                }
              }
            },
            orderBy: { program: { name: 'asc' } }
          }
        }
      }
    }
  });

  // Sort candidates within each team: numeric chest number if available, then by name
  for (const team of rawTeams) {
    team.candidates.sort((a: any, b: any) => {
      if (a.chestNumber && b.chestNumber) {
        const numA = parseInt(a.chestNumber, 10);
        const numB = parseInt(b.chestNumber, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.chestNumber.localeCompare(b.chestNumber);
      }
      if (a.chestNumber) return -1;
      if (b.chestNumber) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // If viewing the entire zone (no single team requested), only show teams with on-stage participants
  const teamsWithOnStage = teamId 
    ? rawTeams 
    : rawTeams.filter(t => t.candidates.length > 0);

  const totalCandidatesAcrossZone = teamsWithOnStage.reduce(
    (sum, t) => sum + t.candidates.length, 
    0
  );

  // Helper to format program scheduled time
  const formatProgramTime = (p: any) => {
    const rawTime = p.scheduledTime || p.program?.startTime;
    if (!rawTime) return "Scheduled";

    const dateObj = new Date(rawTime);
    if (isNaN(dateObj.getTime())) return "Scheduled";

    const dateStr = dateObj.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "2-digit" });
    const timeStr = dateObj.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr}, ${timeStr}`;
  };

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* ── Screen Control & Navigation Bar (No Print) ── */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          padding: "14px 24px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          borderBottom: "1px solid #334155"
        }}
      >
        <div
          style={{
            maxWidth: "1150px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.4rem" }}>🎭</span>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  fontWeight: 900,
                  letterSpacing: "0.5px",
                  color: "#ffffff",
                }}
              >
                ON-STAGE PARTICIPANTS ONLY &bull; ZONAL TEAM MANAGER LIST
              </h1>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  backgroundColor: "#8E0033",
                  color: "#ffffff",
                  fontWeight: 800,
                }}
              >
                ON-STAGE ONLY
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              {activeEvent?.zone?.name ? `${activeEvent.zone.name} ZONE` : activeEvent?.name} &bull;{" "}
              <strong>{teamsWithOnStage.length}</strong> Institution(s) Listed &bull;{" "}
              <strong>{totalCandidatesAcrossZone}</strong> On-Stage Participants
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <PrintButton label="🖨️ Print On-Stage Roster" />
            <a
              href={`/dashboard/reports?eventId=${effectiveEventId || ""}`}
              style={{
                padding: "8px 14px",
                backgroundColor: "#334155",
                color: "#ffffff",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                transition: "background-color 0.2s"
              }}
            >
              ← Back to Print Hub
            </a>
          </div>
        </div>

        {/* Master Zone Selector Pills */}
        <div
          style={{
            maxWidth: "1150px",
            margin: "0 auto",
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
            const isSelected = ev.id === effectiveEventId;
            return (
              <a
                key={ev.id}
                href={`/print/institution-report?eventId=${ev.id}`}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: isSelected ? "2px solid #38bdf8" : "1px solid #475569",
                  backgroundColor: isSelected ? "#0284c7" : "#1e293b",
                  color: "#ffffff",
                  fontWeight: isSelected ? 800 : 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {ev.zone?.name || ev.name}
              </a>
            );
          })}
        </div>

        {/* Institution Filter Pills within Zone (if multiple teams) */}
        {rawTeams.length > 1 && (
          <div
            style={{
              maxWidth: "1150px",
              margin: "0 auto",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              alignItems: "center",
              marginTop: "10px",
              paddingTop: "8px",
              borderTop: "1px dashed #334155",
              fontSize: "0.75rem",
            }}
          >
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>Filter Institution:</span>
            <a
              href={`/print/institution-report?eventId=${effectiveEventId}`}
              style={{
                padding: "3px 10px",
                borderRadius: "4px",
                border: !teamId ? "1.5px solid #8E0033" : "1px solid #475569",
                backgroundColor: !teamId ? "#8E0033" : "#1e293b",
                color: "#fff",
                fontWeight: !teamId ? 800 : 500,
                textDecoration: "none",
              }}
            >
              All Institutions ({teamsWithOnStage.length})
            </a>
            {rawTeams.map((t) => {
              const isCurrent = t.id === teamId;
              const candCount = t.candidates.length;
              return (
                <a
                  key={t.id}
                  href={`/print/institution-report?eventId=${effectiveEventId}&teamId=${t.id}`}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "4px",
                    border: isCurrent ? "1.5px solid #8E0033" : "1px solid #475569",
                    backgroundColor: isCurrent ? "#8E0033" : "#1e293b",
                    color: isCurrent ? "#fff" : candCount > 0 ? "#e2e8f0" : "#64748b",
                    fontWeight: isCurrent ? 800 : 500,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.institution?.name || t.name} ({candCount})
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main Printable Content Container ── */}
      <div style={{ maxWidth: "1080px", margin: "24px auto", padding: "0 16px" }}>
        {teamsWithOnStage.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "60px 24px",
              textAlign: "center",
              borderRadius: "12px",
              border: "1px dashed #cbd5e1",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎭</div>
            <h2 style={{ color: "#0f172a", margin: "0 0 8px 0", fontWeight: 800 }}>
              No On-Stage Participants Found
            </h2>
            <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
              No candidates are assigned to On-Stage programs for this selection yet. Select another zone from the top bar.
            </p>
          </div>
        ) : (
          teamsWithOnStage.map((team, tIdx) => {
            const inst = team.institution;
            const candidates = team.candidates;
            const totalOnStageEntries = candidates.reduce(
              (sum: number, c: any) => sum + c.programs.length,
              0
            );

            return (
              <div
                key={team.id}
                className="institution-page"
                style={{
                  backgroundColor: "#ffffff",
                  padding: "28px 32px",
                  borderRadius: "8px",
                  marginBottom: "36px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                  border: "1px solid #e2e8f0",
                }}
              >
                {/* ── Official Header ── */}
                <div
                  style={{
                    textAlign: "center",
                    borderBottom: "2.5px solid #8E0033",
                    paddingBottom: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "16px",
                      marginBottom: "6px",
                    }}
                  >
                    {settings.festLogo && (
                      <img
                        src={settings.festLogo}
                        alt="Logo"
                        style={{ height: "50px", objectFit: "contain" }}
                      />
                    )}
                    <div>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: "1.6rem",
                          fontWeight: 900,
                          color: "#8E0033",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                        }}
                      >
                        {settings.festName}
                      </h1>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: "#0f172a",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          marginTop: "2px",
                        }}
                      >
                        {team.event?.name || eventName} &bull; Official On-Stage Program Entry &amp; Candidate Verification Sheet
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#8E0033",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          marginTop: "3px",
                        }}
                      >
                        ★ ON-STAGE PARTICIPANTS ONLY &bull; ZONAL TEAM MANAGER ROSTER ★
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Institution Info Card ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr",
                    gap: "12px",
                    backgroundColor: "#f8fafc",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "12px 18px",
                    marginBottom: "18px",
                    fontSize: "0.88rem",
                  }}
                >
                  <div>
                    <div style={{ marginBottom: "4px" }}>
                      <strong style={{ color: "#475569" }}>Zone:</strong>{" "}
                      <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#8E0033" }}>
                        📍 {inst?.zone?.name || team.event?.zone?.name ? `${inst?.zone?.name || team.event?.zone?.name} ZONE` : "Zonal Fest"}
                      </span>
                    </div>
                    <div style={{ marginBottom: "4px" }}>
                      <strong style={{ color: "#475569" }}>Institution:</strong>{" "}
                      <span style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
                        🏛️ {inst?.name || team.name}
                      </span>
                    </div>
                    <div style={{ color: "#475569", fontSize: "0.8rem" }}>
                      <strong>Institution Code:</strong> {inst?.code || team.prefixCode || "N/A"}{" "}
                      {inst?.place && `&bull; ${inst.place}`}
                      {inst?.district && `, ${inst.district}`}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#475569" }}>On-Stage Candidates:</strong>{" "}
                      <span style={{ fontWeight: 900, color: "#8E0033", fontSize: "1.15rem" }}>
                        {candidates.length}
                      </span>
                    </div>
                    <div style={{ color: "#475569", marginTop: "2px" }}>
                      <strong>Total Stage Program Allocations:</strong>{" "}
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>
                        {totalOnStageEntries}
                      </span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.76rem", marginTop: "3px" }}>
                      Date: {today}
                    </div>
                  </div>
                </div>

                {/* ── Candidates Table ── */}
                {candidates.length === 0 ? (
                  <div
                    style={{
                      padding: "36px",
                      textAlign: "center",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1",
                      marginBottom: "20px",
                    }}
                  >
                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
                      No candidates assigned to On-Stage programs for this institution.
                    </p>
                  </div>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1.5px solid #334155",
                      marginBottom: "20px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f1f5f9",
                          borderBottom: "2px solid #334155",
                        }}
                      >
                        <th
                          style={{
                            border: "1px solid #94a3b8",
                            padding: "8px 6px",
                            width: "36px",
                            textAlign: "center",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                          }}
                        >
                          SL
                        </th>
                        <th
                          style={{
                            border: "1px solid #94a3b8",
                            padding: "8px 6px",
                            width: "60px",
                            textAlign: "center",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                          }}
                        >
                          PHOTO
                        </th>
                        <th
                          style={{
                            border: "1px solid #94a3b8",
                            padding: "8px 8px",
                            width: "84px",
                            textAlign: "center",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                          }}
                        >
                          CHEST NO
                        </th>
                        <th
                          style={{
                            border: "1px solid #94a3b8",
                            padding: "8px 10px",
                            textAlign: "left",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                          }}
                        >
                          CANDIDATE &amp; CATEGORY
                        </th>
                        <th
                          style={{
                            border: "1px solid #94a3b8",
                            padding: "8px 10px",
                            textAlign: "left",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                          }}
                        >
                          ASSIGNED ON-STAGE PROGRAMS
                        </th>
                        <th
                          style={{
                            border: "1px solid #94a3b8",
                            padding: "8px 6px",
                            width: "75px",
                            textAlign: "center",
                            fontSize: "0.78rem",
                            fontWeight: 800,
                          }}
                        >
                          PRESENT ✓
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c: any, idx: number) => {
                        const photo = c.photoUrl || c.photo;
                        return (
                          <tr key={c.id} style={{ borderBottom: "1px solid #cbd5e1" }}>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "8px 4px",
                                textAlign: "center",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                              }}
                            >
                              {idx + 1}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "6px",
                                textAlign: "center",
                                verticalAlign: "middle",
                              }}
                            >
                              {photo ? (
                                <img
                                  src={photo}
                                  alt=""
                                  style={{
                                    width: "48px",
                                    height: "56px",
                                    objectFit: "cover",
                                    borderRadius: "4px",
                                    border: "1px solid #94a3b8",
                                    display: "inline-block",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "48px",
                                    height: "56px",
                                    backgroundColor: "#e2e8f0",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.3rem",
                                    border: "1px dashed #94a3b8",
                                    margin: "0 auto",
                                  }}
                                >
                                  👤
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "8px 6px",
                                textAlign: "center",
                                verticalAlign: "middle",
                              }}
                            >
                              <div
                                style={{
                                  backgroundColor: "#8E0033",
                                  color: "white",
                                  fontWeight: 900,
                                  fontSize: "0.95rem",
                                  padding: "4px 6px",
                                  borderRadius: "6px",
                                  display: "inline-block",
                                  minWidth: "54px",
                                  fontFamily: "monospace",
                                }}
                              >
                                {c.chestNumber || "—"}
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "8px 10px",
                                verticalAlign: "middle",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: "0.95rem",
                                  color: "#0f172a",
                                  textTransform: "uppercase",
                                }}
                              >
                                {c.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  color: "#4f46e5",
                                  marginTop: "2px",
                                  textTransform: "uppercase",
                                }}
                              >
                                {c.category?.name || "GENERAL"}
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "8px 10px",
                                verticalAlign: "middle",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {c.programs.map((as: any) => (
                                  <div
                                    key={as.id}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "4px 8px",
                                      backgroundColor: "#f8fafc",
                                      borderRadius: "4px",
                                      border: "1px solid #e2e8f0",
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    <span style={{ fontWeight: 800, color: "#1e293b" }}>
                                      {as.program?.programCode ? `${as.program.programCode} - ` : ""}
                                      {as.program?.name}
                                    </span>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "8px",
                                        alignItems: "center",
                                      }}
                                    >
                                      {as.program?.venue && (
                                        <span
                                          style={{
                                            backgroundColor: "#e0f2fe",
                                            color: "#0369a1",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          {as.program.venue}
                                        </span>
                                      )}
                                      <span
                                        style={{
                                          color: "#8E0033",
                                          fontWeight: 700,
                                          fontSize: "0.78rem",
                                        }}
                                      >
                                        {formatProgramTime(as)}
                                      </span>
                                      {as.slotNumber && (
                                        <span
                                          style={{
                                            backgroundColor: "#fef3c7",
                                            color: "#b45309",
                                            padding: "2px 5px",
                                            borderRadius: "4px",
                                            fontWeight: 800,
                                            fontSize: "0.72rem",
                                          }}
                                        >
                                          Slot #{as.slotNumber}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "6px",
                                textAlign: "center",
                                verticalAlign: "middle",
                              }}
                            >
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  border: "2px solid #0f172a",
                                  borderRadius: "4px",
                                  margin: "0 auto",
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

                {/* ── Declaration & Signature Area ── */}
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
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "0.84rem",
                      marginBottom: "6px",
                      color: "#0f172a",
                    }}
                  >
                    TEAM MANAGER / INSTITUTION REPRESENTATIVE DECLARATION
                  </div>
                  <div
                    style={{
                      fontSize: "0.76rem",
                      color: "#475569",
                      marginBottom: "14px",
                      lineHeight: 1.5,
                    }}
                  >
                    I hereby certify that all the above-listed {candidates.length} On-Stage participants from{" "}
                    <strong>{inst?.name || team.name}</strong> are officially registered and eligible to represent the
                    institution in the <strong>{team.event?.name || eventName}</strong>. All candidate details and photos
                    have been verified for gate entry and stage reporting.
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "20px",
                      textAlign: "center",
                      marginTop: "16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          borderBottom: "1.5px solid #0f172a",
                          height: "28px",
                          marginBottom: "4px",
                        }}
                      />
                      <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>
                        Team Manager Name &amp; Contact
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          borderBottom: "1.5px solid #0f172a",
                          height: "28px",
                          marginBottom: "4px",
                        }}
                      />
                      <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>
                        Institution Manager Signature &amp; Seal
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          borderBottom: "1.5px solid #0f172a",
                          height: "28px",
                          marginBottom: "4px",
                        }}
                      />
                      <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>
                        Zone Fest Entry Officer / Stage Manager
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Clean Print Styling ── */}
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
          .institution-page {
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
            margin: 8mm;
          }
        }
      `,
        }}
      />
    </div>
  );
}
