import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";
import { isProgramGeneral } from "@/lib/programUtils";

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

export default async function PrintTabulationPage(props: {
  searchParams: Promise<{
    eventId?: string;
    programId?: string;
    stageType?: string;
    venue?: string;
    categoryId?: string;
    orientation?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const orientation = searchParams.orientation === "portrait" ? "portrait" : "landscape";
  const activeStageType = searchParams.stageType || "ON_STAGE";
  const activeVenue = searchParams.venue || "ALL";
  const activeCategory = searchParams.categoryId || "ALL";
  const settings = await getSettings(eventId);

  let activeEv: any = null;
  let whereClause: any = {
    stageType: activeStageType === "ALL" ? "ON_STAGE" : activeStageType
  };

  if (eventId) {
    activeEv = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true },
    });
    if (activeEv?.parentId) {
      whereClause.OR = [{ eventId: eventId }, { eventId: activeEv.parentId }];
    } else {
      whereClause.eventId = eventId;
    }
  }

  if (searchParams.programId) {
    whereClause.id = searchParams.programId;
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
    orderBy: [
      { venue: "asc" },
      { startTime: "asc" },
      { programCode: "asc" },
    ],
    include: {
      category: true,
      assignments: {
        include: {
          candidate: {
            include: {
              team: { include: { institution: true } },
              institution: { include: { zone: true } },
            },
          },
        },
        orderBy: { slotNumber: "asc" },
      },
    },
  });

  const targetZoneId = activeEv?.zoneId || activeEv?.zone?.id;

  // Deduplicate programs across parent and child events by programCode (or name_category)
  const mergedMap = new Map<string, any>();
  for (const p of programs) {
    const key = p.programCode ? `code_${p.programCode}` : `name_${p.name}_${p.categoryId || ''}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...p, assignments: [...p.assignments] });
    } else {
      const existing = mergedMap.get(key);
      const existingIds = new Set(existing.assignments.map((a: any) => a.id));
      for (const a of p.assignments) {
        if (!existingIds.has(a.id)) {
          existing.assignments.push(a);
        }
      }
      if (!existing.venue && p.venue) existing.venue = p.venue;
      if (!existing.startTime && p.startTime) existing.startTime = p.startTime;
      if (p.eventId === eventId && p.venue) existing.venue = p.venue;
      if (p.eventId === eventId && p.startTime) existing.startTime = p.startTime;
    }
  }

  const printablePrograms = Array.from(mergedMap.values()).map(prog => {
    let candidateAssignments = prog.assignments.filter((a: any) => Boolean(a.candidate));

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

    candidateAssignments.sort((a: any, b: any) => {
      if (a.slotNumber && b.slotNumber) return a.slotNumber - b.slotNumber;
      const cA = a.candidate;
      const cB = b.candidate;
      if (cA?.chestNumber && cB?.chestNumber) {
        const numA = parseInt(cA.chestNumber, 10);
        const numB = parseInt(cB.chestNumber, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return cA.chestNumber.localeCompare(cB.chestNumber);
      }
      return (a.slotNumber || 0) - (b.slotNumber || 0);
    });

    return {
      ...prog,
      filteredAssignments: candidateAssignments
    };
  }).filter(prog => {
    if (searchParams.programId) return true;
    return prog.filteredAssignments.length > 0;
  });

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

    return `/print/tabulation?${params.toString()}`;
  };

  return (
    <div style={{
      maxWidth: orientation === "landscape" ? "1280px" : "960px",
      margin: "0 auto",
      padding: "20px 16px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#0f172a",
      backgroundColor: "#ffffff",
      minHeight: "100vh",
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
              OFFICIAL JUDGEMENT TABULATION SHEETS
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              {activeEv?.name || settings.festName} • Total Programs Matching: <strong>{programs.length}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <PrintButton label="Print Tabulation Sheets" />
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
              style={{
                backgroundColor: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #475569",
                borderRadius: "5px",
                padding: "4px 8px",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
              id="tab-filter-venue-select"
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
              id="tab-filter-category-select"
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
        </div>

        <script dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('tab-filter-venue-select')?.addEventListener('change', function(e) {
              if (e.target.value) window.location.href = e.target.value;
            });
            document.getElementById('tab-filter-category-select')?.addEventListener('change', function(e) {
              if (e.target.value) window.location.href = e.target.value;
            });
          `
        }} />
      </div>

      {/* ── Program Tabulation Sheets ── */}
      {printablePrograms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <h2>No programs found for this selection</h2>
          <p>Please adjust your Stage Type, Venue, or Category filters.</p>
        </div>
      ) : (
        printablePrograms.map((program) => {
          const isGeneral = isProgramGeneral(program);
          const candidateAssignments = program.filteredAssignments;
          const criteriaList = parseCriteria(program.evaluationCriteria);

          type TeamRow = {
            id: string;
            teamId: string;
            teamName: string;
            slotNumber?: number;
            chestNumbers: string;
            memberNames: string;
            candidates: any[];
          };

          let teamRows: TeamRow[] = [];
          if (isGeneral) {
            const teamMap = new Map<string, TeamRow>();
            for (const a of candidateAssignments) {
              const c = a.candidate;
              const t = c.team;
              const tId = t?.id || c.teamId || c.institutionId || c.name;
              const tName = t?.name || c.institution?.name || c.team?.institution?.name || "Team";
              if (!teamMap.has(tId)) {
                teamMap.set(tId, {
                  id: a.id,
                  teamId: tId,
                  teamName: tName,
                  slotNumber: a.slotNumber,
                  chestNumbers: c.chestNumber || "",
                  memberNames: c.name || "",
                  candidates: [c]
                });
              } else {
                const existing = teamMap.get(tId)!;
                existing.candidates.push(c);
                if (c.chestNumber && !existing.chestNumbers.includes(c.chestNumber)) {
                  existing.chestNumbers = existing.chestNumbers
                    ? `${existing.chestNumbers}, ${c.chestNumber}`
                    : c.chestNumber;
                }
                if (c.name && !existing.memberNames.includes(c.name)) {
                  existing.memberNames = existing.memberNames
                    ? `${existing.memberNames}, ${c.name}`
                    : c.name;
                }
              }
            }
            teamRows = Array.from(teamMap.values());
          }

          return (
            <div
              key={program.id}
              className="tabulation-sheet-page"
              style={{
                marginBottom: "40px",
                pageBreakAfter: "always",
                breakAfter: "page",
                paddingBottom: "24px",
                backgroundColor: "#ffffff",
              }}
            >
              {/* Header repeated for every program */}
              <div style={{ textAlign: "center", marginBottom: "8px", borderBottom: "2px solid #0f172a", paddingBottom: "6px" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", color: "#8E0033", letterSpacing: "1px" }}>
                  {settings.festName}
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 800, textTransform: "uppercase", color: "#1e293b", marginTop: "2px" }}>
                  Official Judgement Tabulation Sheet
                </div>
                {activeEv && (
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginTop: "2px" }}>
                    {activeEv.name} {activeEv.zone ? `(${activeEv.zone.name})` : ""}
                  </div>
                )}
                <div style={{
                  display: "inline-block",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  padding: "3px 12px",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  marginTop: "4px",
                }}>
                  STAGE: {program.venue || "Main Stage"}
                </div>
              </div>

              {/* Program Meta & Score-to-Grade Reference Box */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1fr 1.2fr",
                gap: "10px",
                border: "1.5px solid #0f172a",
                backgroundColor: "#f8fafc",
                borderRadius: "4px",
                padding: "8px 12px",
                marginBottom: "8px",
                fontSize: "0.82rem",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{
                      backgroundColor: "#8E0033",
                      color: "#fff",
                      padding: "2px 6px",
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
                  <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
                    Category: <strong style={{ color: "#8E0033" }}>{program.category?.name || "General"}</strong> • Stage: <strong>{program.stageType}</strong> • Type: <strong>{program.type}</strong>
                  </div>
                </div>

                <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: "10px" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>
                    Stage: {program.venue || "Main Stage"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                    Duration: <strong>{program.duration} min</strong>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>
                    {isGeneral ? (
                      <>Total Teams: <strong>{teamRows.length}</strong> (Candidates: {candidateAssignments.length})</>
                    ) : (
                      <>Total Candidates: <strong>{candidateAssignments.length}</strong></>
                    )}
                  </div>
                </div>

                {/* Right: Official Score to Grade Reference Box (Image) */}
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
                          <th style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 800 }}>GRADE</th>
                          <th style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 800 }}>TOTAL (200)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 800, color: "#166534" }}>A GRADE</td>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 700 }}>160 – 200</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 800, color: "#1e40af" }}>B GRADE</td>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 700 }}>120 – 159</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 800, color: "#b45309" }}>C GRADE</td>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 700 }}>80 – 119</td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 800, color: "#991b1b" }}>118 &amp; Below</td>
                          <td style={{ border: "1px solid #0f172a", padding: "2px 8px", fontWeight: 700 }}>NO GRADE</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: "0.62rem", color: "#64748b", textAlign: "center", marginTop: "2px", fontStyle: "italic" }}>
                      Jury 1 (100) + Jury 2 (100)
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabulation Table: General (By Team) OR Individual (By Candidate) */}
              {(isGeneral ? teamRows.length === 0 : candidateAssignments.length === 0) ? (
                <div style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "30px", border: "1px dashed #cbd5e1", borderRadius: "4px" }}>
                  {isGeneral ? "No teams registered for this general program in this zone yet." : "No candidates registered for this program in this zone yet."}
                </div>
              ) : isGeneral ? (
                /* GENERAL PROGRAM: 1 ROW PER TEAM */
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.80rem", border: "1.5px solid #0f172a", marginBottom: "14px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "42px" }}>Sl</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "85px", backgroundColor: "#1e293b" }}>Code Letter</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 6px", width: "110px" }}>Chest Nos.</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 10px", textAlign: "left" }}>Team / Institution Name</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "105px", backgroundColor: "#1e293b" }}>Jury 1 (100)</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "105px", backgroundColor: "#1e293b" }}>Jury 2 (100)</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "110px" }}>Total (200)</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "75px" }}>Grade</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "75px" }}>Place</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 8px", width: "140px" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRows.map((tRow, index) => {
                      return (
                        <tr key={tRow.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc", height: "48px" }}>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", fontWeight: 800, textAlign: "center" }}>
                            {index + 1}
                          </td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                            <div style={{ width: "44px", height: "28px", border: "1.5px dashed #475569", margin: "0 auto", borderRadius: "3px", backgroundColor: "#ffffff" }}></div>
                          </td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", fontWeight: 900, fontSize: "0.85rem", color: "#8E0033", textAlign: "center", fontFamily: "monospace" }}>
                            {tRow.chestNumbers || "-"}
                          </td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.90rem" }}>🏛️ {tRow.teamName}</div>
                            {tRow.memberNames && (
                              <div style={{ fontSize: "0.70rem", color: "#64748b", marginTop: "2px" }}>
                                <strong>Members:</strong> {tRow.memberNames}
                              </div>
                            )}
                          </td>
                          {/* Jury 1 Marks */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", backgroundColor: "#f8fafc", textAlign: "center" }}></td>
                          {/* Jury 2 Marks */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", backgroundColor: "#f8fafc", textAlign: "center" }}></td>
                          {/* Total Score */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}></td>
                          {/* Grade */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}></td>
                          {/* Place */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}></td>
                          {/* Remarks */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px" }}></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* INDIVIDUAL PROGRAM: 1 ROW PER CANDIDATE */
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.80rem", border: "1.5px solid #0f172a", marginBottom: "14px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "42px" }}>Sl</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "85px", backgroundColor: "#1e293b" }}>Code Letter</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 6px", width: "90px" }}>Chest No.</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 10px", textAlign: "left" }}>Candidate Name / Institution</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "105px", backgroundColor: "#1e293b" }}>Jury 1 (100)</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "105px", backgroundColor: "#1e293b" }}>Jury 2 (100)</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "110px" }}>Total (200)</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "75px" }}>Grade</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 4px", width: "75px" }}>Place</th>
                      <th style={{ border: "1px solid #334155", padding: "7px 8px", width: "140px" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateAssignments.map((assignment: any, index: number) => {
                      const c = assignment.candidate;
                      const instName = c.institution?.name || c.team?.institution?.name || c.team?.name || "-";

                      return (
                        <tr key={assignment.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc", height: "44px" }}>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", fontWeight: 800, textAlign: "center" }}>
                            {index + 1}
                          </td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                            <div style={{ width: "44px", height: "28px", border: "1.5px dashed #475569", margin: "0 auto", borderRadius: "3px", backgroundColor: "#ffffff" }}></div>
                          </td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", fontWeight: 900, fontSize: "0.95rem", color: "#8E0033", textAlign: "center", fontFamily: "monospace" }}>
                            {c.chestNumber || "-"}
                          </td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>
                            <div style={{ fontWeight: 800, color: "#0f172a" }}>{c.name}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{instName}</div>
                          </td>
                          {/* Jury 1 Marks */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", backgroundColor: "#f8fafc", textAlign: "center" }}></td>
                          {/* Jury 2 Marks */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", backgroundColor: "#f8fafc", textAlign: "center" }}></td>
                          {/* Total Score */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}></td>
                          {/* Grade */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}></td>
                          {/* Place */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}></td>
                          {/* Remarks */}
                          <td style={{ border: "1px solid #cbd5e1", padding: "4px" }}></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Consensus Signatures Box */}
              <div style={{
                marginTop: "16px",
                border: "1.5px solid #0f172a",
                borderRadius: "4px",
                padding: "10px 14px",
                backgroundColor: "#fafafa",
                fontSize: "0.78rem",
                pageBreakInside: "avoid",
                breakInside: "avoid",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px dashed #cbd5e1" }}>
                  <div>
                    <strong>Evaluator:</strong> JURY 1 &amp; JURY 2
                  </div>
                  <div>
                    <strong>Stage Verified:</strong> {program.venue || "Main Stage"}
                  </div>
                  <div>
                    <strong>Date:</strong> ________________________
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "16px", textAlign: "center" }}>
                  <div>
                    <div style={{ borderBottom: "1.5px solid #0f172a", height: "26px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 800, fontSize: "0.76rem" }}>Jury 1 Name &amp; Signature</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: "1.5px solid #0f172a", height: "26px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 800, fontSize: "0.76rem" }}>Jury 2 Name &amp; Signature</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: "1.5px solid #0f172a", height: "26px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 800, fontSize: "0.76rem" }}>Stage Manager Signature</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: "1.5px solid #0f172a", height: "26px", marginBottom: "4px" }}></div>
                    <div style={{ fontWeight: 800, fontSize: "0.76rem" }}>Tabulator / Chief Controller</div>
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
            .tabulation-sheet-page {
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
