import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintInstitutionAttendancePage(props: {
  searchParams: Promise<{
    eventId?: string;
    zoneId?: string;
    teamId?: string;
    stageType?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { eventId, zoneId, teamId, stageType } = searchParams;

  // Find the state event as a default or reference
  const stateEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
    include: { zone: true },
  });

  // Find the active event
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

  // If no event is specified, default to the State Event
  if (!activeEvent) {
    activeEvent = stateEvent;
  }

  const isStateFest = activeEvent?.type === "STATE";
  const settings = await getSettings(activeEvent?.id);

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

  // ──────────────────────────────────────────────────────────
  // CASE A: STATE FESTIVAL (ZONE-WISE ATTENDANCE SHEETS)
  // ──────────────────────────────────────────────────────────
  if (isStateFest) {
    // Fetch the 7 Kerala zones (excluding Karnataka & non-Kerala)
    const keralaZones = await prisma.zone.findMany({
      where: {
        NOT: {
          OR: [
            { code: "KAR" },
            { name: { contains: "Karnataka", mode: "insensitive" } },
            { name: { contains: "PG", mode: "insensitive" } },
          ],
        },
      },
      orderBy: { name: "asc" },
    });

    // Query all state-qualified candidates
    const allStateCandidates = await prisma.candidate.findMany({
      where: {
        isApproved: true,
        programs: { some: { program: { eventId: activeEvent.id } } },
        NOT: {
          OR: [
            { institution: { zone: { code: "KAR" } } },
            { team: { institution: { zone: { code: "KAR" } } } },
            { team: { event: { zone: { code: "KAR" } } } },
            { institution: { zone: { name: { contains: "Karnataka", mode: "insensitive" } } } },
            { team: { institution: { zone: { name: { contains: "Karnataka", mode: "insensitive" } } } } },
            { team: { event: { zone: { name: { contains: "Karnataka", mode: "insensitive" } } } } },
          ],
        },
      },
      include: {
        category: { select: { name: true } },
        institution: { include: { zone: true } },
        team: {
          include: {
            institution: { include: { zone: true } },
            event: { include: { zone: true } },
          },
        },
        programs: {
          where: { program: { eventId: activeEvent.id } },
          include: {
            program: {
              select: { id: true, name: true, programCode: true, type: true, stageType: true },
            },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    // Sort candidates: numeric chest number if available, then by name
    allStateCandidates.sort((a, b) => {
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

    // Filter out candidates who do not have any state programs
    const activeStateCandidates = allStateCandidates.filter(
      (c) => c.programs && c.programs.length > 0
    );

    // Group candidates by Zone
    let stateZoneGroups = keralaZones.map((z) => {
      const zCands = activeStateCandidates.filter(
        (c) =>
          c.institution?.zoneId === z.id ||
          c.team?.institution?.zoneId === z.id ||
          c.team?.event?.zoneId === z.id ||
          c.institution?.zone?.name?.toUpperCase() === z.name.toUpperCase()
      );
      return {
        id: z.id,
        name: z.name,
        code: z.code,
        candidates: zCands,
      };
    }).filter((zg) => zg.candidates.length > 0);

    // If specific zoneId was requested in searchParams, filter to it
    if (zoneId) {
      const filtered = stateZoneGroups.filter((zg) => zg.id === zoneId);
      if (filtered.length > 0) {
        stateZoneGroups = filtered;
      }
    }

    const totalStateParticipants = stateZoneGroups.reduce(
      (sum, zg) => sum + zg.candidates.length,
      0
    );

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
              marginBottom: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>🏆</span>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    color: "#f8fafc",
                  }}
                >
                  STATE FEST ZONE REGISTRATION &amp; ATTENDANCE SHEET
                </h1>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                {activeEvent?.name || settings.festName} • {stateZoneGroups.length} Zone(s) •{" "}
                {totalStateParticipants} Qualified Candidates Listed
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <PrintButton label="🖨️ Print Attendance Sheets" />
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

          {/* Master Switcher: State Fest vs Zone Fests */}
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
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>Event:</span>
            <a
              href={`/print/institution-attendance?eventId=${stateEvent?.id || ""}`}
              style={{
                padding: "4px 10px",
                borderRadius: "5px",
                border: "2px solid #38bdf8",
                backgroundColor: "#0284c7",
                color: "#fff",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              🏆 State Final (All Zones)
            </a>

            {allZoneEvents.map((ev) => {
              const url = `/print/institution-attendance?eventId=${ev.id}`;
              return (
                <a
                  key={ev.id}
                  href={url}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "5px",
                    border: "1px solid #475569",
                    backgroundColor: "#1e293b",
                    color: "#94a3b8",
                    fontWeight: 600,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ev.zone?.name || ev.name}
                </a>
              );
            })}
          </div>

          {/* Zone Selector Pills within State Fest */}
          <div
            style={{
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
            <span style={{ color: "#cbd5e1", fontWeight: 700 }}>Filter Zone:</span>
            <a
              href={`/print/institution-attendance?eventId=${activeEvent.id}`}
              style={{
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: !zoneId ? "#8E0033" : "#334155",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: !zoneId ? 800 : 500,
              }}
            >
              All 7 Zones ({allStateCandidates.length})
            </a>
            {keralaZones.map((z) => {
              const count = allStateCandidates.filter(
                (c) =>
                  c.institution?.zoneId === z.id ||
                  c.team?.institution?.zoneId === z.id ||
                  c.team?.event?.zoneId === z.id ||
                  c.institution?.zone?.name?.toUpperCase() === z.name.toUpperCase()
              ).length;
              if (count === 0) return null;
              const isSelected = zoneId === z.id;
              return (
                <a
                  key={z.id}
                  href={`/print/institution-attendance?eventId=${activeEvent.id}&zoneId=${z.id}`}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    backgroundColor: isSelected ? "#8E0033" : "#1e293b",
                    border: isSelected ? "1px solid #ec4899" : "1px solid #334155",
                    color: isSelected ? "#ffffff" : "#cbd5e1",
                    textDecoration: "none",
                    fontWeight: isSelected ? 800 : 500,
                  }}
                >
                  {z.name} ({count})
                </a>
              );
            })}
          </div>
        </div>

        {/* ── Zone Attendance Sheets ── */}
        {stateZoneGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
            <h2>No qualified state candidates found</h2>
            <p>Select a zone or ensure candidates have been approved for State Fest.</p>
          </div>
        ) : (
          stateZoneGroups.map((zg) => {
            const candidates = zg.candidates;

            return (
              <div
                key={zg.id}
                className="attendance-sheet-page"
                style={{
                  marginBottom: "36px",
                  pageBreakAfter: "always",
                  breakAfter: "page",
                  backgroundColor: "#ffffff",
                  paddingBottom: "20px",
                }}
              >
                {/* ── Official Header ── */}
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
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      color: "#1e293b",
                      marginTop: "2px",
                    }}
                  >
                    {zg.name} ZONE — STATE FEST REGISTRATION &amp; ATTENDANCE SHEET
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#475569",
                      marginTop: "2px",
                    }}
                  >
                    Official Zonal Delegation • State Final 2026
                  </div>
                </div>

                {/* ── Zone Info Box ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 1fr",
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
                    <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#8E0033" }}>
                      📍 {zg.name} ZONE
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "#0f172a",
                        marginTop: "2px",
                      }}
                    >
                      Kerala State Final Delegation
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                      Qualified 1st Place Winners from Zonal Arts Fest
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Zone Prefix Code</div>
                    <div
                      style={{
                        fontWeight: 900,
                        fontFamily: "monospace",
                        fontSize: "1.1rem",
                        color: "#0f172a",
                      }}
                    >
                      {zg.code || "—"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>
                      State Fest Event ID: <strong>{activeEvent.name}</strong>
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
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 4px",
                          width: "35px",
                        }}
                      >
                        Sl
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 6px",
                          width: "80px",
                        }}
                      >
                        Chest No.
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 10px",
                          textAlign: "left",
                          minWidth: "140px",
                        }}
                      >
                        Participant Name
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 6px",
                          width: "95px",
                          backgroundColor: "#1e293b",
                        }}
                      >
                        Category
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 8px",
                          textAlign: "left",
                          width: "180px",
                        }}
                      >
                        Institution / Campus
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 10px",
                          textAlign: "left",
                        }}
                      >
                        Assigned State Programs
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 8px",
                          width: "70px",
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

                      const instName =
                        cand.institution?.name ||
                        cand.team?.institution?.name ||
                        cand.team?.name ||
                        "—";

                      return (
                        <tr
                          key={cand.id}
                          style={{
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                            height: "38px",
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
                              fontSize: "0.95rem",
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
                            <div style={{ fontWeight: 600 }}>{instName}</div>
                            {cand.institution?.place && (
                              <div style={{ fontSize: "0.70rem", color: "#64748b" }}>
                                {cand.institution.place}
                              </div>
                            )}
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
                          {/* Attendance Checkbox Cell */}
                          <td
                            style={{
                              border: "1px solid #cbd5e1",
                              padding: "4px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "28px",
                                height: "22px",
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

                {/* ── Zone Leader / Team Manager Sign Box ── */}
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
                  <div style={{ fontWeight: 800, fontSize: "0.84rem", marginBottom: "8px" }}>
                    ZONE LEADER / TEAM MANAGER DECLARATION
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "#475569",
                      marginBottom: "14px",
                      lineHeight: 1.5,
                    }}
                  >
                    I hereby certify that all the above-listed {candidates.length} participants from{" "}
                    <strong>{zg.name} ZONE</strong> are officially registered and eligible to
                    represent the zone in the <strong>{settings.festName}</strong>. All candidates
                    have reported for festival verification.
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
                          height: "28px",
                          marginBottom: "4px",
                        }}
                      />
                      <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>
                        Zone Leader Name &amp; Contact
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
                        Zone Team Manager Signature &amp; Date
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
                        State Fest General Convener / Controller
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

  // ──────────────────────────────────────────────────────────
  // CASE B: ZONAL FESTIVAL (INSTITUTION-WISE ATTENDANCE SHEETS)
  // ──────────────────────────────────────────────────────────
  const teamWhere: any = {};
  if (teamId) {
    teamWhere.id = teamId;
  } else if (eventId) {
    teamWhere.eventId = eventId;
  } else if (zoneId) {
    const zoneEvent = await prisma.event.findFirst({
      where: { type: "ZONE", zoneId },
      select: { id: true },
    });
    if (zoneEvent) teamWhere.eventId = zoneEvent.id;
  }

  const candidateWhere: any = { isApproved: true };
  const programWhere: any = {};
  if (stageType === "ON_STAGE") {
    candidateWhere.programs = { some: { program: { stageType: "ON_STAGE" } } };
    programWhere.program = { stageType: "ON_STAGE" };
  } else if (stageType === "OFF_STAGE") {
    candidateWhere.programs = { some: { program: { stageType: "OFF_STAGE" } } };
    programWhere.program = { stageType: "OFF_STAGE" };
  }

  const teams = await prisma.team.findMany({
    where: teamWhere,
    orderBy: [{ name: "asc" }],
    include: {
      institution: {
        include: { zone: true },
      },
      event: {
        include: { zone: true },
      },
      candidates: {
        where: candidateWhere,
        orderBy: [{ name: "asc" }],
        include: {
          category: { select: { name: true } },
          programs: {
            where: programWhere,
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

  const teamsWithCandidates = teamId ? teams : teams.filter((t) => t.candidates.length > 0);

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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  color: "#f8fafc",
                }}
              >
                {stageType === "ON_STAGE"
                  ? "ON-STAGE INSTITUTION REGISTRATION & ATTENDANCE SHEET"
                  : stageType === "OFF_STAGE"
                  ? "OFF-STAGE INSTITUTION REGISTRATION & ATTENDANCE SHEET"
                  : "INSTITUTION REGISTRATION & ATTENDANCE SHEET"}
              </h1>
              {stageType === "ON_STAGE" && (
                <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "999px", backgroundColor: "#8E0033", color: "#fff", fontWeight: 800 }}>
                  ON-STAGE ONLY
                </span>
              )}
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              {activeEvent?.name || settings.festName} • {teamsWithCandidates.length} Institution(s)
              listed {stageType === "ON_STAGE" ? "• (On-Stage Participants Only)" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <PrintButton label="🖨️ Print Attendance Sheets" />
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

        {/* Master Switcher: State Fest vs Zone Events */}
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
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>Select Event:</span>

          {stateEvent && (
            <a
              href={`/print/institution-attendance?eventId=${stateEvent.id}`}
              style={{
                padding: "4px 10px",
                borderRadius: "5px",
                border: "1px solid #475569",
                backgroundColor: "#1e293b",
                color: "#fff",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              🏆 State Final
            </a>
          )}

          {allZoneEvents.map((ev) => {
            const url = `/print/institution-attendance?eventId=${ev.id}${stageType ? `&stageType=${stageType}` : ""}`;
            const isSelected = ev.id === eventId || (activeEvent && activeEvent.id === ev.id);
            return (
              <a
                key={ev.id}
                href={url}
                style={{
                  padding: "4px 10px",
                  borderRadius: "5px",
                  border: isSelected ? "2px solid #38bdf8" : "1px solid #475569",
                  backgroundColor: isSelected ? "#0284c7" : "#1e293b",
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

        {/* Stage Type Filter Pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px dashed #334155",
            fontSize: "0.78rem",
          }}
        >
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>Program Filter:</span>
          <a
            href={`/print/institution-attendance?eventId=${activeEvent?.id || ""}&stageType=ON_STAGE${teamId ? `&teamId=${teamId}` : ""}`}
            style={{
              padding: "4px 12px",
              borderRadius: "5px",
              border: stageType === "ON_STAGE" ? "2px solid #38bdf8" : "1px solid #475569",
              backgroundColor: stageType === "ON_STAGE" ? "#8E0033" : "#1e293b",
              color: "#fff",
              fontWeight: stageType === "ON_STAGE" ? 800 : 600,
              textDecoration: "none",
            }}
          >
            🎭 On-Stage Only (Team Manager Pass)
          </a>
          <a
            href={`/print/institution-attendance?eventId=${activeEvent?.id || ""}${teamId ? `&teamId=${teamId}` : ""}`}
            style={{
              padding: "4px 12px",
              borderRadius: "5px",
              border: !stageType || stageType === "ALL" ? "2px solid #38bdf8" : "1px solid #475569",
              backgroundColor: !stageType || stageType === "ALL" ? "#0284c7" : "#1e293b",
              color: "#fff",
              fontWeight: !stageType || stageType === "ALL" ? 800 : 600,
              textDecoration: "none",
            }}
          >
            📝 All Programs (On + Off Stage)
          </a>
          <a
            href={`/print/institution-attendance?eventId=${activeEvent?.id || ""}&stageType=OFF_STAGE${teamId ? `&teamId=${teamId}` : ""}`}
            style={{
              padding: "4px 12px",
              borderRadius: "5px",
              border: stageType === "OFF_STAGE" ? "2px solid #38bdf8" : "1px solid #475569",
              backgroundColor: stageType === "OFF_STAGE" ? "#7c3aed" : "#1e293b",
              color: "#fff",
              fontWeight: stageType === "OFF_STAGE" ? 800 : 600,
              textDecoration: "none",
            }}
          >
            🎨 Off-Stage Only
          </a>
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
                  <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#8E0033" }}>
                    📍{" "}
                    {team.institution?.zone?.name || activeEvent?.zone?.name
                      ? `${team.institution?.zone?.name || activeEvent?.zone?.name} ZONE`
                      : team.name}
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      color: "#0f172a",
                      marginTop: "2px",
                    }}
                  >
                    🏛️ {inst?.name || team.name}
                  </div>
                  {inst?.place && (
                    <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
                      {inst.place}
                      {inst.district ? `, ${inst.district}` : ""}
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
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 4px",
                          width: "40px",
                        }}
                      >
                        Sl
                      </th>
                      <th
                        style={{
                          border: "1px solid #334155",
                          padding: "7px 8px",
                          width: "90px",
                        }}
                      >
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
