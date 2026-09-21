import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";
import { isProgramGeneral } from "@/lib/programUtils";

export const dynamic = "force-dynamic";

export default async function OffstageResultsPrintPage(props: {
  searchParams: Promise<{
    eventId?: string;
    zoneId?: string;
    status?: string; // 'unpublished' | 'published' | 'all'
    categoryId?: string;
    orientation?: string; // 'landscape' | 'portrait'
  }>;
}) {
  const searchParams = await props.searchParams;
  const requestedStatus = searchParams.status || "all";
  const requestedEventId = searchParams.eventId;
  const requestedZoneId = searchParams.zoneId;
  const requestedCategoryId = searchParams.categoryId || "ALL";
  const orientation = searchParams.orientation === "portrait" ? "portrait" : "landscape";

  // Fetch settings & zones
  const [settings, allZones, allEvents, allCategories] = await Promise.all([
    getSettings(requestedEventId),
    prisma.zone.findMany({ orderBy: { name: "asc" } }),
    prisma.event.findMany({
      where: { parentId: null },
      include: { subEvents: true, zone: true },
      orderBy: { name: "asc" }
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } })
  ]);

  // Fetch all off-stage programs with their category, event, assignments, and results
  const offstagePrograms = await prisma.program.findMany({
    where: {
      stageType: "OFF_STAGE",
      ...(requestedCategoryId !== "ALL" ? { categoryId: requestedCategoryId } : {})
    },
    include: {
      category: true,
      event: {
        include: {
          zone: true
        }
      },
      assignments: {
        include: {
          candidate: {
            include: {
              team: { include: { institution: { include: { zone: true } } } },
              institution: { include: { zone: true } }
            }
          }
        }
      },
      results: {
        orderBy: [
          { rank: "asc" },
          { marks: "desc" },
          { points: "desc" }
        ],
        include: {
          candidate: {
            include: {
              team: { 
                include: { 
                  institution: { include: { zone: true } },
                  event: { include: { zone: true } }
                } 
              },
              institution: { include: { zone: true } }
            }
          },
          team: {
            include: {
              institution: { include: { zone: true } },
              event: { include: { zone: true } }
            }
          }
        }
      }
    },
    orderBy: [
      { category: { name: "asc" } },
      { programCode: "asc" },
      { name: "asc" }
    ]
  });

  // Helper to resolve zone from result
  const getResultZone = (res: any) => {
    return (
      res.candidate?.institution?.zone ||
      res.candidate?.team?.institution?.zone ||
      res.candidate?.team?.event?.zone ||
      res.team?.institution?.zone ||
      res.team?.event?.zone ||
      null
    );
  };

  // Helper to resolve eventId from result
  const getResultEventId = (res: any) => {
    return res.candidate?.team?.eventId || res.team?.eventId || null;
  };

  // Group programs by programCode/name and filter their results
  type ProgramDisplayItem = {
    id: string;
    programCode: string | null;
    name: string;
    categoryName: string;
    type: string;
    isGeneral: boolean;
    results: any[];
    publishedCount: number;
    pendingCount: number;
  };

  const programsWithFilteredResults: ProgramDisplayItem[] = [];
  let totalWinnersCount = 0;
  let totalPublishedWinners = 0;
  let totalPendingWinners = 0;

  for (const prog of offstagePrograms) {
    let filteredResults = [...prog.results];

    // Filter by EventId
    if (requestedEventId) {
      filteredResults = filteredResults.filter(
        (r) => getResultEventId(r) === requestedEventId
      );
    }

    // Filter by ZoneId
    if (requestedZoneId) {
      filteredResults = filteredResults.filter(
        (r) => getResultZone(r)?.id === requestedZoneId
      );
    }

    const pubCount = filteredResults.filter((r) => r.isPublished).length;
    const pendCount = filteredResults.filter((r) => !r.isPublished).length;

    // Filter by Status
    if (requestedStatus === "published") {
      filteredResults = filteredResults.filter((r) => r.isPublished);
    } else if (requestedStatus === "unpublished" || requestedStatus === "pending") {
      filteredResults = filteredResults.filter((r) => !r.isPublished);
    }

    // Deduplicate duplicate candidates in results if any
    const seenCands = new Set<string>();
    const uniqueResults: typeof filteredResults = [];
    for (const res of filteredResults) {
      const key = res.candidateId
        ? `c_${res.candidateId}`
        : res.teamId
        ? `t_${res.teamId}`
        : res.id;
      if (!seenCands.has(key)) {
        seenCands.add(key);
        uniqueResults.push(res);
      }
    }

    // Sort by rank ascending (ranks 1, 2, 3 first), then grades
    uniqueResults.sort((a, b) => {
      const rankA = a.rank || 99;
      const rankB = b.rank || 99;
      if (rankA !== rankB) return rankA - rankB;
      const marksA = a.marks || 0;
      const marksB = b.marks || 0;
      return marksB - marksA;
    });

    if (uniqueResults.length > 0) {
      totalWinnersCount += uniqueResults.length;
      totalPublishedWinners += uniqueResults.filter((r) => r.isPublished).length;
      totalPendingWinners += uniqueResults.filter((r) => !r.isPublished).length;

      programsWithFilteredResults.push({
        id: prog.id,
        programCode: prog.programCode,
        name: prog.name,
        categoryName: prog.category?.name || "General",
        type: prog.type,
        isGeneral: isProgramGeneral(prog),
        results: uniqueResults,
        publishedCount: pubCount,
        pendingCount: pendCount
      });
    }
  }

  // Selected Zone name
  const activeZone = allZones.find((z) => z.id === requestedZoneId);

  // URL builder for interactive switcher toolbar
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const st = overrides.status !== undefined ? overrides.status : requestedStatus;
    if (st) sp.set("status", st);
    const ev = overrides.eventId !== undefined ? overrides.eventId : requestedEventId;
    if (ev) sp.set("eventId", ev);
    const zn = overrides.zoneId !== undefined ? overrides.zoneId : requestedZoneId;
    if (zn) sp.set("zoneId", zn);
    const cat = overrides.categoryId !== undefined ? overrides.categoryId : requestedCategoryId;
    if (cat && cat !== "ALL") sp.set("categoryId", cat);
    const ori = overrides.orientation !== undefined ? overrides.orientation : orientation;
    if (ori) sp.set("orientation", ori);

    const q = sp.toString();
    return `/print/offstage-results${q ? `?${q}` : ""}`;
  };

  return (
    <div
      style={{
        maxWidth: orientation === "landscape" ? "1260px" : "1020px",
        margin: "0 auto",
        padding: "16px 18px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        minHeight: "100vh"
      }}
    >
      {/* ── Screen Action & Filter Toolbar (No-Print) ── */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          padding: "12px 18px",
          borderRadius: "10px",
          marginBottom: "16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#f59e0b",
                color: "#78350f",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "0.68rem",
                fontWeight: 900,
                textTransform: "uppercase"
              }}
            >
              📢 STAGE 1 ANNOUNCEMENT MASTER
            </div>
            <h1
              style={{
                margin: "3px 0 0",
                fontSize: "1.18rem",
                fontWeight: 800,
                color: "#f8fafc"
              }}
            >
              OFF-STAGE RESULTS DECLARATION
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
              {activeZone ? `Zone: ${activeZone.name}` : "All Zones Combined"} •{" "}
              Programs: {programsWithFilteredResults.length} • Total Winners: {totalWinnersCount} (
              <span style={{ color: "#4ade80" }}>{totalPublishedWinners} Published</span>,{" "}
              <span style={{ color: "#facc15" }}>{totalPendingWinners} Pending to Announce</span>)
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Status Switcher */}
            <div
              style={{
                display: "inline-flex",
                borderRadius: "6px",
                overflow: "hidden",
                border: "1px solid #334155",
                fontSize: "0.76rem"
              }}
            >
              <Link
                href={buildUrl({ status: "unpublished" })}
                style={{
                  padding: "6px 11px",
                  backgroundColor:
                    requestedStatus === "unpublished" || requestedStatus === "pending"
                      ? "#d97706"
                      : "#1e293b",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 800
                }}
              >
                🟡 Stage 1 Announce ({totalPendingWinners})
              </Link>
              <Link
                href={buildUrl({ status: "published" })}
                style={{
                  padding: "6px 11px",
                  backgroundColor: requestedStatus === "published" ? "#16a34a" : "#1e293b",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 800,
                  borderLeft: "1px solid #334155"
                }}
              >
                🟢 Published ({totalPublishedWinners})
              </Link>
              <Link
                href={buildUrl({ status: "all" })}
                style={{
                  padding: "6px 11px",
                  backgroundColor: requestedStatus === "all" ? "#0284c7" : "#1e293b",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 800,
                  borderLeft: "1px solid #334155"
                }}
              >
                📑 All Total ({totalWinnersCount})
              </Link>
            </div>

            {/* Orientation Switcher */}
            <div
              style={{
                display: "inline-flex",
                borderRadius: "6px",
                overflow: "hidden",
                border: "1px solid #334155",
                fontSize: "0.76rem"
              }}
            >
              <Link
                href={buildUrl({ orientation: "landscape" })}
                style={{
                  padding: "6px 10px",
                  backgroundColor: orientation === "landscape" ? "#7c3aed" : "#1e293b",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 700
                }}
              >
                🖥️ Landscape (Stage Binder)
              </Link>
              <Link
                href={buildUrl({ orientation: "portrait" })}
                style={{
                  padding: "6px 10px",
                  backgroundColor: orientation === "portrait" ? "#7c3aed" : "#1e293b",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 700,
                  borderLeft: "1px solid #334155"
                }}
              >
                📄 Portrait
              </Link>
            </div>

            <PrintButton label="🖨️ Print Stage 1 Announcement" color="#8E0033" />

            <Link
              href="/dashboard/scoring"
              style={{
                padding: "6px 12px",
                backgroundColor: "#334155",
                color: "#ffffff",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.78rem",
                fontWeight: 700
              }}
            >
              Back to Scoring
            </Link>
          </div>
        </div>

        {/* Filters Row: Zone & Category */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "1px solid #1e293b",
            flexWrap: "wrap"
          }}
        >
          {/* Zone Selector */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700 }}>
              Zone:
            </span>
            <div style={{ display: "flex", gap: "4px", overflowX: "auto" }}>
              <Link
                href={buildUrl({ zoneId: undefined, eventId: undefined })}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: !requestedZoneId ? 800 : 600,
                  textDecoration: "none",
                  backgroundColor: !requestedZoneId ? "#0284c7" : "#1e293b",
                  color: "#ffffff",
                  whiteSpace: "nowrap"
                }}
              >
                All Zones (State Final)
              </Link>
              {allZones.map((z) => {
                const isSelected = z.id === requestedZoneId;
                return (
                  <Link
                    key={z.id}
                    href={buildUrl({ zoneId: z.id, eventId: undefined })}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      fontWeight: isSelected ? 800 : 600,
                      textDecoration: "none",
                      backgroundColor: isSelected ? "#0284c7" : "#1e293b",
                      color: "#ffffff",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {z.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "auto" }}>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700 }}>
              Category:
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <Link
                href={buildUrl({ categoryId: "ALL" })}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: requestedCategoryId === "ALL" ? 800 : 600,
                  textDecoration: "none",
                  backgroundColor: requestedCategoryId === "ALL" ? "#f59e0b" : "#1e293b",
                  color: requestedCategoryId === "ALL" ? "#78350f" : "#ffffff"
                }}
              >
                All
              </Link>
              {allCategories.map((c) => {
                const isSelected = c.id === requestedCategoryId;
                return (
                  <Link
                    key={c.id}
                    href={buildUrl({ categoryId: c.id })}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      fontWeight: isSelected ? 800 : 600,
                      textDecoration: "none",
                      backgroundColor: isSelected ? "#f59e0b" : "#1e293b",
                      color: isSelected ? "#78350f" : "#ffffff",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── PRINT CONTENT: STAGE 1 ANNOUNCEMENT SHEET ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <div className="offstage-print-document">
        {/* Official Letterhead Header */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "3px double #0f172a",
            paddingBottom: "12px",
            marginBottom: "16px"
          }}
        >
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 900,
              textTransform: "uppercase",
              color: "#8E0033",
              letterSpacing: "0.8px"
            }}
          >
            {settings.festName}
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginTop: "1px" }}>
            {settings.festMoto || "Council of Samastha Women's Colleges"}
          </div>

          <div
            style={{
              display: "inline-block",
              backgroundColor:
                requestedStatus === "unpublished" || requestedStatus === "pending"
                  ? "#fef3c7"
                  : requestedStatus === "published"
                  ? "#dcfce7"
                  : "#0f172a",
              color:
                requestedStatus === "unpublished" || requestedStatus === "pending"
                  ? "#92400e"
                  : requestedStatus === "published"
                  ? "#166534"
                  : "#ffffff",
              border:
                requestedStatus === "unpublished" || requestedStatus === "pending"
                  ? "1.5px solid #f59e0b"
                  : requestedStatus === "published"
                  ? "1.5px solid #16a34a"
                  : "1.5px solid #0f172a",
              padding: "4px 18px",
              borderRadius: "4px",
              fontSize: "0.88rem",
              fontWeight: 900,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginTop: "4px"
            }}
          >
            {requestedStatus === "unpublished" || requestedStatus === "pending"
              ? "📢 STAGE 1 ANNOUNCEMENT SHEET — OFF-STAGE RESULTS (PENDING VERIFICATION)"
              : requestedStatus === "published"
              ? "🏆 OFFICIAL PUBLISHED OFF-STAGE RESULTS DECLARATION"
              : "📑 TOTAL OFF-STAGE RESULTS MASTER AUDIT & STAGE DECLARATION"}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              fontSize: "0.76rem",
              fontWeight: 700,
              color: "#1e293b",
              marginTop: "4px",
              flexWrap: "wrap"
            }}
          >
            <span>
              VENUE: <strong>STAGE 1 / VALUATION CONTROL</strong>
            </span>
            <span>•</span>
            <span>
              ZONE: <strong>{activeZone ? activeZone.name : "ALL ZONES COMBINED"}</strong>
            </span>
            <span>•</span>
            <span>
              DATE:{" "}
              <strong>
                {new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </strong>
            </span>
            <span>•</span>
            <span>
              TOTAL OFF-STAGE PROGRAMS: <strong>{programsWithFilteredResults.length}</strong>
            </span>
          </div>
        </div>

        {/* Notice if no results found */}
        {programsWithFilteredResults.length === 0 && (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              border: "2px dashed #cbd5e1",
              borderRadius: "8px",
              color: "#64748b"
            }}
          >
            <h3 style={{ margin: "0 0 8px", color: "#1e293b" }}>No Off-Stage Results Found</h3>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              {requestedStatus === "unpublished"
                ? "There are currently no unpublished/pending off-stage results. All evaluated programs may have been published."
                : requestedStatus === "published"
                ? "No published off-stage results recorded yet for the selected filter."
                : "No off-stage competition results have been entered yet."}
            </p>
          </div>
        )}

        {/* ── PROGRAM-WISE STAGE 1 ANNOUNCEMENT TABLES ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {programsWithFilteredResults.map((prog, idx) => {
            const hasPub = prog.results.some((r) => r.isPublished);
            const hasPend = prog.results.some((r) => !r.isPublished);

            return (
              <div
                key={prog.id}
                className="program-announcement-card"
                style={{
                  border: "1.5px solid #0f172a",
                  borderRadius: "4px",
                  overflow: "hidden",
                  pageBreakInside: "avoid",
                  backgroundColor: "#ffffff"
                }}
              >
                {/* Program Header Bar */}
                <div
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    padding: "7px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        backgroundColor: "#8E0033",
                        color: "#ffffff",
                        padding: "1px 7px",
                        borderRadius: "3px",
                        fontWeight: 900,
                        fontSize: "0.78rem"
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: "1rem", fontWeight: 800 }}>
                      {prog.name} {prog.programCode ? `[Code: ${prog.programCode}]` : ""}
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "1px 6px",
                        borderRadius: "3px",
                        backgroundColor: "#334155",
                        fontWeight: 700,
                        textTransform: "uppercase"
                      }}
                    >
                      {prog.categoryName} • {prog.type}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        backgroundColor:
                          hasPend && !hasPub
                            ? "#fef3c7"
                            : hasPub && !hasPend
                            ? "#dcfce7"
                            : "#e0f2fe",
                        color:
                          hasPend && !hasPub
                            ? "#92400e"
                            : hasPub && !hasPend
                            ? "#15803d"
                            : "#0369a1"
                      }}
                    >
                      {hasPend && !hasPub
                        ? "🟡 PENDING STAGE 1 ANNOUNCEMENT"
                        : hasPub && !hasPend
                        ? "🟢 PUBLISHED"
                        : "📑 MIXED STATUS"}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      ({prog.results.length} Awarded)
                    </span>
                  </div>
                </div>

                {/* Announcement Winners Table */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.88rem"
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", color: "#334155", borderBottom: "1.5px solid #cbd5e1" }}>
                      <th
                        style={{
                          borderRight: "1px solid #e2e8f0",
                          padding: "6px 8px",
                          width: "90px",
                          textAlign: "center",
                          fontSize: "0.74rem",
                          fontWeight: 900,
                          textTransform: "uppercase"
                        }}
                      >
                        Place / Rank
                      </th>
                      <th
                        style={{
                          borderRight: "1px solid #e2e8f0",
                          padding: "6px 8px",
                          width: "75px",
                          textAlign: "center",
                          fontSize: "0.74rem",
                          fontWeight: 900,
                          textTransform: "uppercase"
                        }}
                      >
                        Grade
                      </th>
                      <th
                        style={{
                          borderRight: "1px solid #e2e8f0",
                          padding: "6px 8px",
                          width: "90px",
                          textAlign: "center",
                          fontSize: "0.74rem",
                          fontWeight: 900,
                          textTransform: "uppercase"
                        }}
                      >
                        Chest #
                      </th>
                      <th
                        style={{
                          borderRight: "1px solid #e2e8f0",
                          padding: "6px 12px",
                          textAlign: "left",
                          fontSize: "0.74rem",
                          fontWeight: 900,
                          textTransform: "uppercase"
                        }}
                      >
                        {prog.isGeneral ? "Winning Institution & Students" : "Candidate Name"}
                      </th>
                      <th
                        style={{
                          borderRight: "1px solid #e2e8f0",
                          padding: "6px 12px",
                          textAlign: "left",
                          fontSize: "0.74rem",
                          fontWeight: 900,
                          textTransform: "uppercase"
                        }}
                      >
                        Institution &amp; Zone
                      </th>
                      <th
                        style={{
                          borderRight: "1px solid #e2e8f0",
                          padding: "6px 8px",
                          width: "80px",
                          textAlign: "center",
                          fontSize: "0.74rem",
                          fontWeight: 900,
                          textTransform: "uppercase"
                        }}
                      >
                        Points
                      </th>
                      <th
                        style={{
                          padding: "6px 8px",
                          width: "90px",
                          textAlign: "center",
                          fontSize: "0.74rem",
                          fontWeight: 900,
                          textTransform: "uppercase"
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prog.results.map((res) => {
                      const cand = res.candidate;
                      const team = res.team;
                      const inst = cand?.institution || cand?.team?.institution || team?.institution;
                      const instName = inst?.name || team?.name || "Institution";
                      const instPlace = inst?.place || "";
                      const zoneObj = getResultZone(res);

                      const rankBadge =
                        res.rank === 1
                          ? { text: "🥇 1st Place", bg: "#fef3c7", color: "#b45309", border: "#f59e0b" }
                          : res.rank === 2
                          ? { text: "🥈 2nd Place", bg: "#f1f5f9", color: "#475569", border: "#94a3b8" }
                          : res.rank === 3
                          ? { text: "🥉 3rd Place", bg: "#fff7ed", color: "#c2410c", border: "#f97316" }
                          : { text: res.rank ? `#${res.rank}` : "—", bg: "#ffffff", color: "#64748b", border: "#cbd5e1" };

                      return (
                        <tr
                          key={res.id}
                          style={{
                            borderBottom: "1px solid #e2e8f0",
                            backgroundColor:
                              res.rank === 1
                                ? "#fffbeb"
                                : res.rank === 2
                                ? "#f8fafc"
                                : res.rank === 3
                                ? "#fff7ed"
                                : "#ffffff"
                          }}
                        >
                          {/* Rank / Place */}
                          <td
                            style={{
                              borderRight: "1px solid #e2e8f0",
                              padding: "7px 6px",
                              textAlign: "center"
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                backgroundColor: rankBadge.bg,
                                border: `1px solid ${rankBadge.border}`,
                                color: rankBadge.color,
                                fontWeight: 900,
                                fontSize: "0.78rem"
                              }}
                            >
                              {rankBadge.text}
                            </span>
                          </td>

                          {/* Grade */}
                          <td
                            style={{
                              borderRight: "1px solid #e2e8f0",
                              padding: "7px 6px",
                              textAlign: "center",
                              fontWeight: 900,
                              fontSize: "0.88rem"
                            }}
                          >
                            {res.grade ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    res.grade === "A"
                                      ? "#dcfce7"
                                      : res.grade === "B"
                                      ? "#eff6ff"
                                      : "#fef3c7",
                                  color:
                                    res.grade === "A"
                                      ? "#15803d"
                                      : res.grade === "B"
                                      ? "#1d4ed8"
                                      : "#b45309"
                                }}
                              >
                                {res.grade} Gr
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>

                          {/* Chest Number (Extra Prominent for Stage MC) */}
                          <td
                            style={{
                              borderRight: "1px solid #e2e8f0",
                              padding: "7px 6px",
                              textAlign: "center",
                              fontFamily: "monospace",
                              fontWeight: 900,
                              fontSize: "1.05rem",
                              color: "#0f172a"
                            }}
                          >
                            {cand?.chestNumber ? (
                              <span
                                style={{
                                  backgroundColor: "#0f172a",
                                  color: "#ffffff",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  letterSpacing: "0.5px"
                                }}
                              >
                                #{cand.chestNumber}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>

                          {/* Candidate Name / Team Name */}
                          <td
                            style={{
                              borderRight: "1px solid #e2e8f0",
                              padding: "7px 12px",
                              fontWeight: 800,
                              color: "#0f172a",
                              fontSize: "0.94rem"
                            }}
                          >
                            <div>{cand?.name || team?.name || "Participant"}</div>
                            {res.marks && res.marks > 0 ? (
                              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                                Marks: {res.marks}
                              </div>
                            ) : null}
                          </td>

                          {/* Institution & Zone */}
                          <td
                            style={{
                              borderRight: "1px solid #e2e8f0",
                              padding: "7px 12px"
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#1e293b" }}>
                              {instName}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                alignItems: "center",
                                marginTop: "2px",
                                fontSize: "0.75rem",
                                color: "#64748b"
                              }}
                            >
                              {instPlace && <span>📍 {instPlace}</span>}
                              {zoneObj && (
                                <span
                                  style={{
                                    backgroundColor: "#e2e8f0",
                                    color: "#334155",
                                    padding: "1px 5px",
                                    borderRadius: "3px",
                                    fontSize: "0.70rem",
                                    fontWeight: 700
                                  }}
                                >
                                  {zoneObj.name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Points */}
                          <td
                            style={{
                              borderRight: "1px solid #e2e8f0",
                              padding: "7px 6px",
                              textAlign: "center",
                              fontWeight: 900,
                              color: "#8E0033",
                              fontSize: "0.95rem",
                              fontFamily: "monospace"
                            }}
                          >
                            {res.points !== null && res.points !== undefined ? `${res.points} pts` : "0"}
                          </td>

                          {/* Status */}
                          <td
                            style={{
                              padding: "7px 6px",
                              textAlign: "center",
                              fontSize: "0.72rem",
                              fontWeight: 800
                            }}
                          >
                            {res.isPublished ? (
                              <span style={{ color: "#16a34a" }}>🟢 PUBLISHED</span>
                            ) : (
                              <span style={{ color: "#d97706" }}>🟡 PENDING</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* ── Official Stage Attestation Signatures ── */}
        <div
          style={{
            marginTop: "45px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingTop: "10px",
            pageBreakInside: "avoid"
          }}
        >
          <div
            style={{
              borderTop: "1.5px solid #0f172a",
              width: "220px",
              textAlign: "center",
              paddingTop: "6px"
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>
              Stage 1 Announcer / MC
            </div>
            <div style={{ fontSize: "0.70rem", color: "#64748b" }}>
              Signature &amp; Announcement Time
            </div>
          </div>

          <div
            style={{
              borderTop: "1.5px solid #0f172a",
              width: "220px",
              textAlign: "center",
              paddingTop: "6px"
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>
              Off-Stage Result Controller
            </div>
            <div style={{ fontSize: "0.70rem", color: "#64748b" }}>
              Tabulator Signature &amp; Date
            </div>
          </div>

          <div
            style={{
              borderTop: "1.5px solid #0f172a",
              width: "220px",
              textAlign: "center",
              paddingTop: "6px"
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>
              Program Convener / Chairman
            </div>
            <div style={{ fontSize: "0.70rem", color: "#64748b" }}>
              Official Seal &amp; Attestation
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; margin: 0 !important; }
          @page {
            size: ${orientation === "landscape" ? "A4 landscape" : "A4 portrait"};
            margin: 8mm;
          }
          .program-announcement-card {
            break-inside: avoid;
            margin-bottom: 12px !important;
          }
        }
      `
        }}
      />
    </div>
  );
}
