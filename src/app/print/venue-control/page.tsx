import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PrintVenueControlPage(props: {
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
        OR: [{ eventId: eventId }, { eventId: activeEv.parentId }],
      };
    } else {
      whereClause = {
        eventId,
      };
    }
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
        select: { id: true, username: true, phone: true },
      },
      results: {
        select: {
          id: true,
          marks: true,
          rank: true,
          grade: true,
          points: true,
          isPublished: true,
          candidateId: true,
          teamId: true,
        },
      },
      assignments: {
        include: {
          candidate: {
            include: {
              team: { include: { institution: true, event: true } },
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
      mergedMap.set(key, { 
        ...p, 
        assignments: [...p.assignments],
        results: [...p.results],
      });
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
      // Merge results
      const existingResIds = new Set(existing.results.map((r: any) => r.id));
      for (const r of p.results) {
        if (!existingResIds.has(r.id)) {
          existing.results.push(r);
          existingResIds.add(r.id);
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

  const deduplicatedPrograms = Array.from(mergedMap.values());

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

    // Results calculations
    const isResultsEntered = prog.results && prog.results.length > 0;
    const isResultsPublished = prog.results && prog.results.some((r: any) => r.isPublished);
    const publishedRanks = prog.results
      ? prog.results.filter((r: any) => r.isPublished && r.rank && r.rank <= 3)
      : [];
    const isCertificatesReady = publishedRanks.length > 0;

    return {
      ...prog,
      zoneCandidateCount: candidateCount,
      zoneTeamCount: teamCount,
      zoneFilteredAssignments: candidateAssignments,
      isResultsEntered,
      isResultsPublished,
      publishedRanksCount: publishedRanks.length,
      isCertificatesReady,
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

  // Events for switcher
  const allEvents = await prisma.event.findMany({
    orderBy: { name: "asc" },
    include: { zone: true },
  });

  const festName = settings.festName || "CSWC Hiya Fiesta 2026";
  const festMoto = settings.festMoto || "She Can. She Will.";
  const zoneName = activeEv?.zone?.name || activeEv?.name || "Zonal Festival";

  return (
    <div className="venue-control-container">
      {/* PRINT-ONLY CSS */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
          }
          .venue-page {
            page-break-after: always;
            break-after: page;
          }
          .venue-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .venue-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .venue-table th, .venue-table td {
            border: 1px solid #1e293b !important;
            padding: 5px 6px !important;
          }
        }

        @media screen {
          body {
            background: #0f172a;
            color: #f8fafc;
          }
          .venue-control-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 1.5rem;
          }
          .venue-page {
            background: #ffffff;
            color: #0f172a;
            border-radius: 12px;
            padding: 1.8rem;
            margin-bottom: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          .venue-table th, .venue-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
          }
        }

        .venue-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .venue-table th {
          background-color: #f1f5f9;
          color: #0f172a;
          font-weight: 800;
          text-align: left;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .tick-box {
          width: 14px;
          height: 14px;
          border: 1.5px solid #0f172a;
          display: inline-block;
          margin-right: 5px;
          vertical-align: middle;
          background: #ffffff;
          border-radius: 2px;
        }
      `}</style>

      {/* TOP CONTROL TOOLBAR (SCREEN ONLY) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#1e293b",
          padding: "1rem 1.5rem",
          borderRadius: "10px",
          marginBottom: "1.5rem",
          border: "1px solid #334155",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/dashboard/reports"
            style={{
              padding: "6px 12px",
              backgroundColor: "#334155",
              color: "#f8fafc",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            ← Back to Reports
          </Link>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
            📋 Venue Program, Result &amp; Certificate Control Sheet
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Event Filter */}
          <form method="GET" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <select
              name="eventId"
              defaultValue={eventId || ""}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                backgroundColor: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <option value="">All Events (State / Zone)</option>
              {allEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} {ev.zone?.name ? `(${ev.zone.name})` : ""}
                </option>
              ))}
            </select>

            {/* Venue Filter */}
            <select
              name="venue"
              defaultValue={activeVenue}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                backgroundColor: "#0f172a",
                color: "#f8fafc",
                border: "1px solid #475569",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <option value="ALL">All Venues &amp; Stages</option>
              {allVenues.map((v) => (
                <option key={v} value={v}>
                  📍 {v}
                </option>
              ))}
            </select>

            <button
              type="submit"
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Filter
            </button>
          </form>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              backgroundColor: "#059669",
              color: "#ffffff",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(5,150,105,0.4)",
            }}
          >
            <span>🖨️</span> PRINT MASTER CHECKLIST
          </button>
        </div>
      </div>

      {/* NO VENUES NOTICE */}
      {Object.keys(venuesMap).length === 0 && (
        <div
          style={{
            backgroundColor: "#ffffff",
            color: "#0f172a",
            padding: "3rem",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
          <h3 style={{ margin: "0 0 6px 0" }}>No Programs Found for the Selected Filter</h3>
          <p style={{ margin: 0, color: "#64748b" }}>
            Assign venues and time slots in the Schedule Manager to generate venue control checklists.
          </p>
        </div>
      )}

      {/* VENUE CONTROL PAGES (1 PAGE PER VENUE) */}
      {Object.entries(venuesMap).map(([venueName, progs], vIdx) => {
        const totalProgs = progs.length;
        const completedProgs = progs.filter((p) => p.isResultsEntered || p.isResultsPublished).length;
        const publishedProgs = progs.filter((p) => p.isResultsPublished).length;
        const certsReady = progs.filter((p) => p.isCertificatesReady).length;

        return (
          <div key={venueName} className="venue-page">
            {/* FESTIVAL & VENUE HEADER */}
            <div
              style={{
                borderBottom: "2px solid #0f172a",
                paddingBottom: "8px",
                marginBottom: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", fontWeight: 900, color: "#8E0033", letterSpacing: "1px", textTransform: "uppercase" }}>
                  {festName}
                </div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                  {festMoto} • Official Zonal Operations &amp; Verification Desk
                </div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                  VENUE CONTROL &amp; STATUS CHECKLIST — <span style={{ color: "#2563eb", textDecoration: "underline" }}>{venueName.toUpperCase()}</span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a" }}>
                  ZONE: <span style={{ color: "#8E0033" }}>{zoneName.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
                  Date: ________________ | Stage Manager: ______________________
                </div>
                <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
                  Venue Location: ______________________ | Contact: ___________________
                </div>
              </div>
            </div>

            {/* SUMMARY STATS BAR */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "8px",
                marginBottom: "10px",
                fontSize: "11px",
              }}
            >
              <div style={{ padding: "4px 8px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                <strong>TOTAL PROGRAMS:</strong> {totalProgs}
              </div>
              <div style={{ padding: "4px 8px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "4px" }}>
                <strong>[  ] COMPLETED:</strong> {completedProgs} / {totalProgs}
              </div>
              <div style={{ padding: "4px 8px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: "4px" }}>
                <strong>[  ] RESULTS PUBLISHED:</strong> {publishedProgs} / {totalProgs}
              </div>
              <div style={{ padding: "4px 8px", backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", color: "#6b21a8", borderRadius: "4px" }}>
                <strong>[  ] CERTIFICATES PRINTED:</strong> {certsReady} / {totalProgs}
              </div>
            </div>

            {/* MASTER CONTROL TABLE */}
            <table className="venue-table">
              <thead>
                <tr>
                  <th style={{ width: "24px", textAlign: "center" }}>#</th>
                  <th style={{ width: "65px" }}>CODE</th>
                  <th>PROGRAM NAME &amp; CATEGORY</th>
                  <th style={{ width: "65px", textAlign: "center" }}>TYPE</th>
                  <th style={{ width: "70px", textAlign: "center" }}>TIME</th>
                  <th style={{ width: "50px", textAlign: "center" }}>CANDS</th>
                  <th style={{ width: "110px" }}>JURY / JUDGES</th>
                  <th style={{ width: "125px", backgroundColor: "#ecfdf5", color: "#065f46" }}>
                    1. PROGRAM STATUS
                  </th>
                  <th style={{ width: "135px", backgroundColor: "#eff6ff", color: "#1e40af" }}>
                    2. RESULT STATUS
                  </th>
                  <th style={{ width: "135px", backgroundColor: "#faf5ff", color: "#6b21a8" }}>
                    3. CERTIFICATE STATUS
                  </th>
                  <th style={{ width: "95px", textAlign: "center" }}>STAGE SIGN</th>
                </tr>
              </thead>
              <tbody>
                {progs.map((prog, pIdx) => {
                  const startTimeStr = prog.startTime
                    ? new Date(prog.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--";

                  const judgesStr =
                    prog.judges && prog.judges.length > 0
                      ? prog.judges.map((j: any) => j.username).join(", ")
                      : "Unassigned";

                  const catName = prog.category?.name || "GENERAL";
                  const catColor =
                    catName === "FADHILA"
                      ? "#8E0033"
                      : catName === "FADHEELA"
                      ? "#2563eb"
                      : "#d97706";

                  return (
                    <tr key={prog.id}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                        {pIdx + 1}
                      </td>
                      <td style={{ fontWeight: 800, fontFamily: "monospace", color: "#0f172a" }}>
                        {prog.programCode || "N/A"}
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{prog.name}</div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px", fontSize: "9px" }}>
                          <span
                            style={{
                              padding: "1px 4px",
                              borderRadius: "3px",
                              backgroundColor: `${catColor}15`,
                              color: catColor,
                              fontWeight: 800,
                            }}
                          >
                            {catName}
                          </span>
                          <span style={{ color: "#64748b" }}>
                            {prog.stageType === "ON_STAGE" ? "On-Stage" : "Off-Stage"} • {prog.duration || 10}m
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#475569" }}>
                        {prog.type === "GROUP" ? "GROUP" : "INDIV"}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700, fontFamily: "monospace" }}>
                        {startTimeStr}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 800, color: "#0f172a" }}>
                        {prog.zoneCandidateCount}
                      </td>
                      <td style={{ fontSize: "10px", color: "#334155", maxWidth: "110px", whiteSpace: "normal", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {judgesStr}
                      </td>

                      {/* 1. PROGRAM STATUS TICK BOX */}
                      <td style={{ backgroundColor: "#f0fdf4" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="tick-box"></span>
                          <span style={{ fontWeight: 700, fontSize: "10px" }}>Conducted</span>
                        </div>
                        <div style={{ fontSize: "8.5px", color: "#166534", marginTop: "2px" }}>
                          {prog.isResultsPublished
                            ? "● Live Finished"
                            : prog.isResultsEntered
                            ? "● Scoring Active"
                            : "○ Scheduled"}
                        </div>
                      </td>

                      {/* 2. RESULT STATUS TICK BOX */}
                      <td style={{ backgroundColor: "#eff6ff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="tick-box"></span>
                          <span style={{ fontWeight: 700, fontSize: "10px" }}>Published</span>
                        </div>
                        <div style={{ fontSize: "8.5px", marginTop: "2px", fontWeight: 700 }}>
                          {prog.isResultsPublished ? (
                            <span style={{ color: "#15803d" }}>✓ PUBLISHED LIVE</span>
                          ) : prog.isResultsEntered ? (
                            <span style={{ color: "#b45309" }}>⚡ MARKS PENDING</span>
                          ) : (
                            <span style={{ color: "#64748b" }}>○ Not Entered</span>
                          )}
                        </div>
                      </td>

                      {/* 3. CERTIFICATE STATUS TICK BOX */}
                      <td style={{ backgroundColor: "#faf5ff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span className="tick-box"></span>
                          <span style={{ fontWeight: 700, fontSize: "10px" }}>Printed &amp; Issued</span>
                        </div>
                        <div style={{ fontSize: "8.5px", marginTop: "2px", fontWeight: 700 }}>
                          {prog.isCertificatesReady ? (
                            <span style={{ color: "#7e22ce" }}>✓ {prog.publishedRanksCount} Ready to Print</span>
                          ) : (
                            <span style={{ color: "#64748b" }}>○ Awaiting Result</span>
                          )}
                        </div>
                      </td>

                      {/* STAGE SIGN / REMARKS */}
                      <td style={{ textAlign: "center", verticalAlign: "bottom", paddingBottom: "4px" }}>
                        <div style={{ borderBottom: "1px dashed #94a3b8", height: "18px" }}></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* VENUE FOOTER & SIGN-OFF BLOCKS */}
            <div
              style={{
                marginTop: "16px",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1.5rem",
                fontSize: "10px",
                borderTop: "1px solid #cbd5e1",
                paddingTop: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>STAGE IN-CHARGE SIGN-OFF</div>
                <div style={{ marginTop: "25px", borderTop: "1px solid #0f172a", paddingTop: "4px" }}>
                  Name &amp; Signature (Stage / Venue Manager)
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>TABULATION &amp; RESULT DESK</div>
                <div style={{ marginTop: "25px", borderTop: "1px solid #0f172a", paddingTop: "4px" }}>
                  Verified &amp; Published By (Scoring Desk)
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>CERTIFICATE ISSUANCE &amp; SEAL</div>
                <div style={{ marginTop: "25px", borderTop: "1px solid #0f172a", paddingTop: "4px" }}>
                  Zonal General Convener / Official Seal
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "10px",
                textAlign: "center",
                fontSize: "9px",
                color: "#64748b",
              }}
            >
              {festName} • Page {vIdx + 1} of {Object.keys(venuesMap).length} • Official Physical Control &amp; Verification Sheet
            </div>
          </div>
        );
      })}
    </div>
  );
}
