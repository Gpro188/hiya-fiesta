import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PrintVenuePage(props: {
  searchParams: Promise<{ eventId?: string; venue?: string }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const activeVenue = searchParams.venue || "ALL";
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
        stageType: "ON_STAGE",
        OR: [{ eventId: eventId }, { eventId: activeEv.parentId }],
      };
    } else {
      whereClause = {
        stageType: "ON_STAGE",
        eventId
      };
    }
  } else {
    whereClause = { stageType: "ON_STAGE" };
  }

  const rawPrograms = await prisma.program.findMany({
    where: whereClause,
    orderBy: [
      { venue: "asc" },
      { startTime: "asc" },
      { programCode: "asc" },
    ],
    include: {
      category: true,
      judges: {
        select: { id: true, username: true },
      },
      assignments: {
        include: {
          candidate: {
            include: {
              team: { include: { institution: true } },
              institution: { include: { zone: true } },
            },
          },
        },
      },
    },
  });

  const targetZoneId = activeEv?.zoneId || activeEv?.zone?.id;

  // Deduplicate programs across parent & child events by programCode (or name_category)
  const mergedMap = new Map<string, any>();
  for (const p of rawPrograms) {
    const key = p.programCode
      ? `code_${p.programCode.trim()}`
      : `name_${p.name.trim()}_${p.categoryId || ""}`;

    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...p, assignments: [...p.assignments] });
    } else {
      const existing = mergedMap.get(key);
      // Merge candidate assignments
      const existingIds = new Set(existing.assignments.map((a: any) => a.id));
      for (const a of p.assignments) {
        if (!existingIds.has(a.id)) {
          existing.assignments.push(a);
          existingIds.add(a.id);
        }
      }
      // Inherit venue and timing (prefer zonal if set, otherwise parent)
      if (p.eventId === eventId) {
        if (p.venue) existing.venue = p.venue;
        if (p.startTime) existing.startTime = p.startTime;
        if (p.duration) existing.duration = p.duration;
        if (p.judges && p.judges.length > 0) existing.judges = p.judges;
      } else {
        if (!existing.venue && p.venue) existing.venue = p.venue;
        if (!existing.startTime && p.startTime) existing.startTime = p.startTime;
      }
    }
  }

  let deduplicatedPrograms = Array.from(mergedMap.values());

  // Filter candidates per zone and calculate zone candidates/teams count
  const programsWithZoneCounts = deduplicatedPrograms.map((prog) => {
    let candidateAssignments = prog.assignments.filter((a: any) =>
      Boolean(a.candidate)
    );

    if (targetZoneId) {
      candidateAssignments = candidateAssignments.filter((a: any) => {
        const c = a.candidate;
        const zId =
          c?.institution?.zoneId ||
          c?.institution?.zone?.id ||
          c?.team?.institution?.zoneId ||
          c?.team?.event?.zoneId;
        return zId === targetZoneId;
      });
    }

    const candidateCount = candidateAssignments.length;
    const uniqueTeams = new Set(
      candidateAssignments.map((a: any) => a.candidate?.teamId).filter(Boolean)
    );
    const teamCount = uniqueTeams.size;

    return {
      ...prog,
      zoneCandidateCount: candidateCount,
      zoneTeamCount: teamCount,
      zoneFilteredAssignments: candidateAssignments,
    };
  });

  // Extract all distinct venues
  const allVenues = Array.from(
    new Set(
      programsWithZoneCounts.map((p) => p.venue || "Main Stage").filter(Boolean)
    )
  ).sort();

  // Filter by venue if selected
  let filteredPrograms = programsWithZoneCounts;
  if (activeVenue !== "ALL") {
    filteredPrograms = programsWithZoneCounts.filter(
      (p) => (p.venue || "Main Stage") === activeVenue
    );
  }

  // Group by venue
  const venuesMap: Record<string, any[]> = {};
  filteredPrograms.forEach((p) => {
    const v = p.venue || "Main Stage";
    if (!venuesMap[v]) venuesMap[v] = [];
    venuesMap[v].push(p);
  });

  // Sort programs in each venue chronologically by startTime
  Object.keys(venuesMap).forEach((v) => {
    venuesMap[v].sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.programCode || "").localeCompare(b.programCode || "");
    });
  });

  const zoneName = activeEv?.zone?.name || activeEv?.name || "Zonal Festival";
  const eventDateStr = activeEv?.startDate
    ? new Date(activeEv.startDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        color: "#111827",
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Top Filter & Print Toolbar (Hidden during Print) */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/dashboard/reports"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#4b5563",
              textDecoration: "none",
              fontSize: "0.88rem",
              fontWeight: 600,
            }}
          >
            ← Back to Reports
          </Link>
          <div style={{ height: "20px", width: "1px", backgroundColor: "#e5e7eb" }} />
          <div>
            <strong style={{ fontSize: "1rem", color: "#111827" }}>
              {zoneName}
            </strong>
            <span style={{ fontSize: "0.82rem", color: "#6b7280", marginLeft: "8px" }}>
              Venue-Based Schedule Print
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>
            Select Stage:
          </label>
          <select
            id="venue-filter-select"
            defaultValue={activeVenue}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1.5px solid #d1d5db",
              fontSize: "0.88rem",
              fontWeight: 600,
              backgroundColor: "#f9fafb",
              color: "#111827",
            }}
          >
            <option value="ALL">All Stages ({allVenues.length})</option>
            {allVenues.map((v) => (
              <option key={v} value={v}>
                {v} ({programsWithZoneCounts.filter((p) => (p.venue || "Main Stage") === v).length} Programs)
              </option>
            ))}
          </select>

          <button
            id="print-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#8E0033",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 18px",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(142,0,51,0.25)",
            }}
          >
            🖨️ Print Venue Schedule
          </button>
        </div>
      </div>

      {/* Printable Pages Container */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
        {Object.keys(venuesMap).length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              backgroundColor: "#f9fafb",
              borderRadius: "16px",
              border: "1px dashed #d1d5db",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📍</div>
            <h3 style={{ margin: "0 0 6px 0", color: "#111827" }}>
              No Programs Scheduled for Selected Venue
            </h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Assign venues to programs in Global Schedule management to generate venue sheets.
            </p>
          </div>
        ) : (
          Object.entries(venuesMap).map(([venueName, venuePrograms], idx) => {
            return (
              <div
                key={venueName}
                className="venue-page"
                style={{
                  marginBottom: "40px",
                  pageBreakInside: "avoid",
                  pageBreakBefore: idx > 0 ? "always" : "auto",
                }}
              >
                {/* Official Festival Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "2.5px solid #111827",
                    paddingBottom: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h1
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "1.45rem",
                        fontWeight: 900,
                        letterSpacing: "-0.01em",
                        color: "#8E0033",
                        textTransform: "uppercase",
                      }}
                    >
                      {settings.festName || "CSWC HIYA FIESTA 2026"}
                    </h1>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color: "#111827",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {zoneName} · OFFICIAL VENUE TIMELINE
                    </div>
                    {eventDateStr && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "#4b5563",
                          fontWeight: 600,
                          marginTop: "2px",
                        }}
                      >
                        Festival Date: <strong>{eventDateStr}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        display: "inline-block",
                        backgroundColor: "#111827",
                        color: "#ffffff",
                        padding: "6px 16px",
                        borderRadius: "6px",
                        fontSize: "1.1rem",
                        fontWeight: 900,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                      }}
                    >
                      VENUE: {venueName}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#6b7280",
                        fontWeight: 600,
                        marginTop: "4px",
                      }}
                    >
                      Total Programs: <strong>{venuePrograms.length}</strong>
                    </div>
                  </div>
                </div>

                {/* Venue Programs Schedule Table */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                    marginBottom: "24px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#f3f4f6",
                        borderTop: "1.5px solid #111827",
                        borderBottom: "1.5px solid #111827",
                        color: "#111827",
                        fontWeight: 800,
                        fontSize: "0.78rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", width: "45px", textAlign: "center" }}>
                        #
                      </th>
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", width: "135px", textAlign: "center" }}>
                        Scheduled Time
                      </th>
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", width: "85px", textAlign: "center" }}>
                        Code
                      </th>
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 12px", textAlign: "left" }}>
                        Program Name
                      </th>
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", width: "120px", textAlign: "center" }}>
                        Category
                      </th>
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", width: "95px", textAlign: "center" }}>
                        Stage Type
                      </th>
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", width: "80px", textAlign: "center" }}>
                        Duration
                      </th>
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", width: "95px", textAlign: "center" }}>
                        Candidates
                      </th>
                      <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", width: "110px", textAlign: "center" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {venuePrograms.map((p, pIdx) => {
                      const startTimeObj = p.startTime ? new Date(p.startTime) : null;
                      const timeStr = startTimeObj
                        ? startTimeObj.toLocaleTimeString("en-US", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "TBD";

                      const endTimeObj =
                        startTimeObj && p.duration
                          ? new Date(startTimeObj.getTime() + p.duration * 60000)
                          : null;
                      const endTimeStr = endTimeObj
                        ? endTimeObj.toLocaleTimeString("en-US", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : null;

                      // Duration Breakdown calculation:
                      // If INDIVIDUAL and we have candidates: total duration = p.duration min, per candidate = Math.round(p.duration / candidateCount) or p.duration / candidateCount
                      const isGroup = p.type === "GROUP";
                      const count = isGroup ? p.zoneTeamCount : p.zoneCandidateCount;
                      const countLabel = isGroup ? "teams" : "cand";

                      let durationDisplay = p.duration ? `${p.duration} min` : "-";
                      let perItemText = "";
                      if (p.duration && count > 0) {
                        const minPerItem = (p.duration / count);
                        const formattedPerItem = minPerItem % 1 === 0 ? minPerItem : minPerItem.toFixed(1);
                        perItemText = `${count} ${countLabel} × ${formattedPerItem}m`;
                      }

                      return (
                        <tr
                          key={p.id}
                          style={{
                            backgroundColor: pIdx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                          }}
                        >
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 6px",
                              textAlign: "center",
                              fontWeight: 700,
                              color: "#6b7280",
                            }}
                          >
                            {pIdx + 1}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 8px",
                              textAlign: "center",
                              fontWeight: 800,
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: "#111827",
                            }}
                          >
                            <div>{timeStr}</div>
                            {endTimeStr && (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#6b7280",
                                  fontWeight: 500,
                                }}
                              >
                                to {endTimeStr}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 6px",
                              textAlign: "center",
                              fontWeight: 900,
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: "#8E0033",
                            }}
                          >
                            {p.programCode || "-"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 12px",
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            <div>{p.name}</div>
                            {p.type && p.type !== "INDIVIDUAL" && (
                              <span
                                style={{
                                  display: "inline-block",
                                  fontSize: "0.7rem",
                                  color: "#4f46e5",
                                  backgroundColor: "rgba(79, 70, 229, 0.08)",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  fontWeight: 700,
                                  marginTop: "2px",
                                }}
                              >
                                {p.type}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 6px",
                              textAlign: "center",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                            }}
                          >
                            {p.category?.name || "General"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 6px",
                              textAlign: "center",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              color:
                                p.stageType === "OFF_STAGE"
                                  ? "#0284c7"
                                  : "#b91c1c",
                            }}
                          >
                            {p.stageType === "OFF_STAGE" ? "Off Stage" : "On Stage"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 6px",
                              textAlign: "center",
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>{durationDisplay}</div>
                            {perItemText && (
                              <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 500 }}>
                                ({perItemText})
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 6px",
                              textAlign: "center",
                              fontWeight: 900,
                              color: "#111827",
                              fontSize: "0.95rem",
                            }}
                          >
                            {isGroup ? `${p.zoneTeamCount} Teams` : p.zoneCandidateCount}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px 6px",
                              textAlign: "center",
                              color: "#9ca3af",
                              fontSize: "0.75rem",
                            }}
                          >
                            [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Controller & Convener Signatures Block */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "30px",
                    paddingTop: "20px",
                    borderTop: "1.5px dashed #9ca3af",
                    pageBreakInside: "avoid",
                  }}
                >
                  <div style={{ textAlign: "center", width: "220px" }}>
                    <div style={{ height: "40px" }} />
                    <div
                      style={{
                        borderTop: "1.5px solid #111827",
                        paddingTop: "6px",
                        fontSize: "0.82rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      Stage Controller
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#6b7280" }}>
                      {venueName}
                    </div>
                  </div>

                  <div style={{ textAlign: "center", width: "220px" }}>
                    <div style={{ height: "40px" }} />
                    <div
                      style={{
                        borderTop: "1.5px solid #111827",
                        paddingTop: "6px",
                        fontSize: "0.82rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      Zonal Program Convener
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#6b7280" }}>
                      {zoneName}
                    </div>
                  </div>

                  <div style={{ textAlign: "center", width: "220px" }}>
                    <div style={{ height: "40px" }} />
                    <div
                      style={{
                        borderTop: "1.5px solid #111827",
                        paddingTop: "6px",
                        fontSize: "0.82rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      General Secretary / Chair
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#6b7280" }}>
                      CSWC Hiya Fiesta 2026
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .venue-page { page-break-after: always; }
          .venue-page:last-child { page-break-after: auto; }
        }
      `,
        }}
      />

      <script
        dangerouslySetInnerHTML={{
          __html: `
        document.getElementById('print-btn')?.addEventListener('click', function() {
          window.print();
        });
        document.getElementById('venue-filter-select')?.addEventListener('change', function(e) {
          const val = e.target.value;
          const url = new URL(window.location.href);
          if (val === 'ALL') {
            url.searchParams.delete('venue');
          } else {
            url.searchParams.set('venue', val);
          }
          window.location.href = url.toString();
        });
      `,
        }}
      />
    </div>
  );
}
