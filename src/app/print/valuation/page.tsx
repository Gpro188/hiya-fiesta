import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

type Criterion = { name: string; max: number };

function parseCriteria(criteriaStr?: string | null): Criterion[] {
  if (!criteriaStr || !criteriaStr.trim()) {
    return [
      { name: "Criteria 1", max: 30 },
      { name: "Criteria 2", max: 30 },
      { name: "Criteria 3", max: 20 },
      { name: "Criteria 4", max: 20 },
    ];
  }

  const parts = criteriaStr.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  const parsed: Criterion[] = [];

  for (const part of parts) {
    const match = part.match(/^(.+?)[\s:(]+(\d+)\s*\)?$/);
    if (match) {
      parsed.push({ name: match[1].trim(), max: parseInt(match[2], 10) });
    } else {
      parsed.push({ name: part, max: 25 });
    }
  }

  return parsed.length > 0
    ? parsed
    : [
        { name: "Criteria 1", max: 30 },
        { name: "Criteria 2", max: 30 },
        { name: "Criteria 3", max: 20 },
        { name: "Criteria 4", max: 20 },
      ];
}

export default async function PrintValuationPage(props: {
  searchParams: Promise<{
    eventId?: string;
    programId?: string;
    stageType?: string;
    venue?: string;
    categoryId?: string;
    orientation?: string;
    copyMode?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const orientation = searchParams.orientation === "portrait" ? "portrait" : "landscape";
  const copyMode = searchParams.copyMode === "jury1" ? "jury1" : searchParams.copyMode === "jury2" ? "jury2" : "both";
  const activeStageType = searchParams.stageType || "ALL";
  const activeVenue = searchParams.venue || "ALL";
  const activeCategory = searchParams.categoryId || "ALL";
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

  if (activeStageType !== "ALL") {
    whereClause.stageType = activeStageType;
  }

  if (activeVenue !== "ALL") {
    whereClause.venue = activeVenue;
  }

  if (activeCategory !== "ALL") {
    if (activeCategory === "GENERAL") {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { categoryId: null },
            { category: { name: { contains: "General", mode: "insensitive" } } },
          ],
        },
      ];
    } else {
      whereClause.categoryId = activeCategory;
    }
  }

  // Fetch all categories for filter options
  const allCategories = await prisma.category.findMany({
    where: eventId
      ? { eventId: { in: [eventId, activeEv?.parentId].filter(Boolean) as string[] } }
      : {},
    orderBy: { name: "asc" },
  });

  // Fetch all venues from programs for this event
  const allEventPrograms = await prisma.program.findMany({
    where: eventId
      ? (activeEv?.parentId ? { OR: [{ eventId }, { eventId: activeEv.parentId }] } : { eventId })
      : {},
    select: { venue: true, stageType: true },
  });

  const allVenues = Array.from(
    new Set(allEventPrograms.map((p) => p.venue || "Main Stage").filter(Boolean))
  ).sort();

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
    orderBy: [{ venue: "asc" }, { programCode: "asc" }, { name: "asc" }],
  });

  const targetZoneId = activeEv?.zoneId || activeEv?.zone?.id;

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (searchParams.programId && overrides.programId !== "") {
      params.set("programId", overrides.programId ?? searchParams.programId);
    }
    const st = overrides.stageType !== undefined ? overrides.stageType : activeStageType;
    if (st && st !== "ALL") params.set("stageType", st);

    const vn = overrides.venue !== undefined ? overrides.venue : activeVenue;
    if (vn && vn !== "ALL") params.set("venue", vn);

    const cat = overrides.categoryId !== undefined ? overrides.categoryId : activeCategory;
    if (cat && cat !== "ALL") params.set("categoryId", cat);

    const ori = overrides.orientation !== undefined ? overrides.orientation : orientation;
    if (ori) params.set("orientation", ori);

    const cp = overrides.copyMode !== undefined ? overrides.copyMode : copyMode;
    if (cp) params.set("copyMode", cp);

    return `/print/valuation?${params.toString()}`;
  };

  return (
    <div style={{
      maxWidth: orientation === "landscape" ? "1260px" : "960px",
      margin: "0 auto",
      padding: "20px 16px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#0f172a",
    }}>
      {/* ── Screen Action & Filter Bar ── */}
      <div className="no-print" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        padding: "14px 20px",
        borderRadius: "8px",
        marginBottom: "20px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "12px",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, letterSpacing: "0.5px", color: "#f8fafc" }}>
              OFFICIAL JURY VALUATION &amp; MARK ENTRY SHEETS
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              {activeEv?.name || settings.festName} • Total Programs Matching: <strong>{programs.length}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <PrintButton label="Print All Valuation Sheets" />
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
              Back to Reports
            </a>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
          paddingTop: "10px",
          borderTop: "1px solid #1e293b",
          fontSize: "0.78rem",
        }}>
          {/* Stage Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>Stage Type:</span>
            <div style={{ display: "inline-flex", borderRadius: "5px", overflow: "hidden", border: "1px solid #334155" }}>
              <a
                href={buildUrl({ stageType: "ALL" })}
                style={{
                  padding: "4px 8px",
                  backgroundColor: activeStageType === "ALL" ? "#0284c7" : "#1e293b",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                All
              </a>
              <a
                href={buildUrl({ stageType: "ON_STAGE" })}
                style={{
                  padding: "4px 8px",
                  backgroundColor: activeStageType === "ON_STAGE" ? "#0284c7" : "#1e293b",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  borderLeft: "1px solid #334155",
                }}
              >
                On-Stage
              </a>
              <a
                href={buildUrl({ stageType: "OFF_STAGE" })}
                style={{
                  padding: "4px 8px",
                  backgroundColor: activeStageType === "OFF_STAGE" ? "#0284c7" : "#1e293b",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  borderLeft: "1px solid #334155",
                }}
              >
                Off-Stage
              </a>
            </div>
          </div>

          {/* Stage / Venue Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>Stage/Venue:</span>
            <select
              value={activeVenue}
              onChange={undefined}
              // @ts-ignore
              onInput={undefined}
              style={{
                backgroundColor: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #475569",
                borderRadius: "5px",
                padding: "4px 8px",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
              // Use native navigation on change
              // eslint-disable-next-line react/no-unknown-property
              data-nav="venue"
              id="filter-venue-select"
            >
              <option value={buildUrl({ venue: "ALL" })}>All Stages / Venues</option>
              {allVenues.map((v) => (
                <option key={v} value={buildUrl({ venue: v })}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>Category:</span>
            <select
              value={activeCategory}
              style={{
                backgroundColor: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #475569",
                borderRadius: "5px",
                padding: "4px 8px",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
              id="filter-category-select"
            >
              <option value={buildUrl({ categoryId: "ALL" })}>All Categories</option>
              <option value={buildUrl({ categoryId: "GENERAL" })}>General</option>
              {allCategories.map((c) => (
                <option key={c.id} value={buildUrl({ categoryId: c.id })}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Layout Orientation Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>Layout:</span>
            <a
              href={buildUrl({ orientation: "landscape" })}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: orientation === "landscape" ? "2px solid #38bdf8" : "1px solid #475569",
                backgroundColor: orientation === "landscape" ? "#0284c7" : "#1e293b",
                color: "#ffffff",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              📃 Landscape
            </a>
            <a
              href={buildUrl({ orientation: "portrait" })}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: orientation === "portrait" ? "2px solid #38bdf8" : "1px solid #475569",
                backgroundColor: orientation === "portrait" ? "#0284c7" : "#1e293b",
                color: "#ffffff",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              📄 Portrait
            </a>
          </div>

          {/* Jury Copies Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>Jury Copies:</span>
            <a
              href={buildUrl({ copyMode: "both" })}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: copyMode === "both" ? "2px solid #f59e0b" : "1px solid #475569",
                backgroundColor: copyMode === "both" ? "#d97706" : "#1e293b",
                color: "#ffffff",
                fontWeight: 700,
                textDecoration: "none",
              }}
              title="Both Juries (2 distinct sheets per program)"
            >
              👥 Both
            </a>
            <a
              href={buildUrl({ copyMode: "jury1" })}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: copyMode === "jury1" ? "2px solid #38bdf8" : "1px solid #475569",
                backgroundColor: copyMode === "jury1" ? "#0284c7" : "#1e293b",
                color: "#ffffff",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              👤 Jury 1
            </a>
            <a
              href={buildUrl({ copyMode: "jury2" })}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: copyMode === "jury2" ? "2px solid #38bdf8" : "1px solid #475569",
                backgroundColor: copyMode === "jury2" ? "#0284c7" : "#1e293b",
                color: "#ffffff",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              👤 Jury 2
            </a>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('filter-venue-select')?.addEventListener('change', function(e) {
              if (e.target.value) window.location.href = e.target.value;
            });
            document.getElementById('filter-category-select')?.addEventListener('change', function(e) {
              if (e.target.value) window.location.href = e.target.value;
            });
          `
        }} />
      </div>

      {/* ── Program Valuation Sheets ── */}
      {programs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <h2>No programs found for this selection</h2>
          <p>Please check your filters (Stage Type, Venue, Category) or return to Reports.</p>
        </div>
      ) : (
        programs.flatMap((program) => {
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
            if (zoneFiltered.length > 0) {
              candidateAssignments = zoneFiltered;
            }
          }

          // Sort candidates: slotNumber first, else numeric chest number
          candidateAssignments.sort((a, b) => {
            if (a.slotNumber && b.slotNumber) return a.slotNumber - b.slotNumber;
            const cA = a.candidate;
            const cB = b.candidate;
            if (cA.chestNumber && cB.chestNumber) {
              const numA = parseInt(cA.chestNumber, 10);
              const numB = parseInt(cB.chestNumber, 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return cA.chestNumber.localeCompare(cB.chestNumber);
            }
            return (a.slotNumber || 0) - (b.slotNumber || 0);
          });

          const isStage = program.stageType === "ON_STAGE";
          let juryCopies = [0];
          if (isStage) {
            if (copyMode === "jury1") juryCopies = [1];
            else if (copyMode === "jury2") juryCopies = [2];
            else juryCopies = [1, 2]; // Both Juries (2 distinct printed sheets per program)
          }

          const criteriaList = parseCriteria(program.evaluationCriteria);

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
                <div style={{ textAlign: "center", marginBottom: "8px", borderBottom: "2px solid #0f172a", paddingBottom: "6px" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "#8E0033" }}>
                    {settings.festName}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "2px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", letterSpacing: "0.5px", textTransform: "uppercase" }}>
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
                    <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                      {activeEv.name} {activeEv.zone ? `(${activeEv.zone.name})` : ""}
                    </div>
                  )}
                </div>

                {/* ── Program Meta Information & Score-to-Grade Reference ── */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr 1fr 1.2fr",
                  gap: "10px",
                  backgroundColor: "#f8fafc",
                  border: "1.5px solid #0f172a",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  marginBottom: "8px",
                  fontSize: "0.82rem",
                  alignItems: "center",
                }}>
                  {/* Left: Program Meta */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{
                        backgroundColor: "#8E0033",
                        color: "#ffffff",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontWeight: 900,
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                      }}>
                        CODE: {program.programCode || "P"}
                      </span>
                      <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>
                        {program.name}
                      </strong>
                    </div>
                    <div style={{ color: "#334155", fontSize: "0.78rem", marginTop: "3px" }}>
                      <strong>Category:</strong> <span style={{ fontWeight: 800, color: "#8E0033" }}>{program.category?.name || "General"}</span> • <strong>Stage:</strong> {program.stageType} • <strong>Type:</strong> {program.type}
                    </div>
                  </div>

                  {/* Middle: Venue & Count */}
                  <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: "10px" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>
                      Stage: {program.venue || "Main Stage"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
                      Duration: <strong>{program.duration} Min</strong> • Max: <strong>100</strong>
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>
                      Participants: <strong>{candidateAssignments.length}</strong>
                    </div>
                  </div>

                  {/* Right: Score to Grade Reference Box (Image 3) */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      display: "inline-block",
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #0f172a",
                      borderRadius: "3px",
                      overflow: "hidden",
                      fontSize: "0.70rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}>
                      <table style={{ borderCollapse: "collapse", textAlign: "center", margin: 0 }}>
                        <thead>
                          <tr style={{ backgroundColor: "#dcfce7", color: "#065f46" }}>
                            <th style={{ border: "1px solid #0f172a", padding: "2px 6px", fontWeight: 800 }}>SCORE</th>
                            <th style={{ border: "1px solid #0f172a", padding: "2px 6px", fontWeight: 800 }}>GRADE</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 700 }}>A GRADE</td>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 800, color: "#166534" }}>160 - 200</td>
                          </tr>
                          <tr>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 700 }}>B GRADE</td>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 800, color: "#1e40af" }}>120 - 159</td>
                          </tr>
                          <tr>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 700 }}>C GRADE</td>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 800, color: "#b45309" }}>80 - 119</td>
                          </tr>
                          <tr>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 700 }}>118 &amp; BELOW</td>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 800, color: "#991b1b" }}>NO GRADE</td>
                          </tr>
                        </tbody>
                      </table>
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
                    <strong>Anonymous Evaluation Rule:</strong> Strictly blind judging. Identify participants by <strong>Code Letter</strong> only. Scale: A (160-200 / 80-100), B (120-159 / 60-79), C (80-119 / 40-59), No Grade: 118 &amp; Below.
                  </div>
                  <div style={{ fontWeight: 800, color: isCopy1 ? "#1d4ed8" : isCopy2 ? "#be185d" : "#0f172a" }}>
                    {isCopy1 ? "Evaluation Copy: Jury 1" : isCopy2 ? "Evaluation Copy: Jury 2" : "Evaluation Record"}
                  </div>
                </div>

                {/* ── Blind Candidate Scoring Table (NO Name, NO Institution, NO Chest Number) ── */}
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
                    marginBottom: "10px",
                    border: "1.5px solid #0f172a",
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                        <th style={{ width: "40px", padding: "6px 4px", border: "1px solid #334155" }}>Sl</th>
                        <th style={{ width: "95px", padding: "6px 4px", border: "1px solid #334155", backgroundColor: "#1e293b" }}>
                          Code Letter
                        </th>
                        {criteriaList.map((crit, cIdx) => (
                          <th key={cIdx} style={{ width: "100px", padding: "6px 4px", border: "1px solid #334155" }}>
                            {crit.name} ({crit.max})
                          </th>
                        ))}
                        <th style={{ width: "80px", padding: "6px 4px", border: "1px solid #334155", backgroundColor: "#1e293b" }}>
                          Total (100)
                        </th>
                        <th style={{ width: "65px", padding: "6px 4px", border: "1px solid #334155" }}>Grade</th>
                        <th style={{ width: "65px", padding: "6px 4px", border: "1px solid #334155" }}>Rank</th>
                        <th style={{ padding: "6px 8px", border: "1px solid #334155" }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidateAssignments.map((assignment, idx) => (
                        <tr key={assignment.id} style={{
                          backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                          textAlign: "center",
                          height: "38px",
                        }}>
                          <td style={{ border: "1px solid #cbd5e1", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px" }}>
                            <div style={{
                              width: "44px",
                              height: "28px",
                              border: "1.5px dashed #475569",
                              borderRadius: "3px",
                              margin: "0 auto",
                              backgroundColor: "#ffffff",
                            }}></div>
                          </td>
                          {criteriaList.map((crit, cIdx) => (
                            <td key={cIdx} style={{ border: "1px solid #cbd5e1" }}></td>
                          ))}
                          <td style={{ border: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                          <td style={{ border: "1px solid #cbd5e1" }}></td>
                        </tr>
                      ))}
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
