import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

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
  const activeVenue = searchParams.venue || "ALL";
  const activeCategory = searchParams.categoryId || "ALL";
  const settings = await getSettings(eventId);

  let activeEv: any = null;
  // Strictly ON_STAGE programs only for Jury Valuation
  let whereClause: any = {
    stageType: "ON_STAGE"
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
    whereClause.categoryId = activeCategory;
  }

  // Fetch categories for filtering
  const allCategories = await prisma.category.findMany({
    where: eventId
      ? { eventId: { in: [eventId, activeEv?.parentId].filter(Boolean) as string[] } }
      : {},
    orderBy: { name: "asc" },
  });

  const rawPrograms = await prisma.program.findMany({
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
  for (const p of rawPrograms) {
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

  let deduplicatedPrograms = Array.from(mergedMap.values());

  const allVenues = Array.from(
    new Set(deduplicatedPrograms.map((p) => p.venue || "Main Stage").filter(Boolean))
  ).sort();

  if (activeVenue !== "ALL") {
    deduplicatedPrograms = deduplicatedPrograms.filter(p => (p.venue || "Main Stage") === activeVenue);
  }

  // Filter candidates per zone and eliminate empty duplicate pages
  const printablePrograms = deduplicatedPrograms.map(prog => {
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

    // Sort by slotNumber or numeric chest number
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
    const vn = overrides.venue !== undefined ? overrides.venue : activeVenue;
    if (vn && vn !== "ALL") params.set("venue", vn);

    const cat = overrides.categoryId !== undefined ? overrides.categoryId : activeCategory;
    if (cat && cat !== "ALL") params.set("categoryId", cat);

    const ori = overrides.orientation !== undefined ? overrides.orientation : orientation;
    if (ori) params.set("orientation", ori);

    const cm = overrides.copyMode !== undefined ? overrides.copyMode : copyMode;
    if (cm && cm !== "both") params.set("copyMode", cm);

    return `/print/valuation?${params.toString()}`;
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#ffffff", color: "#0f172a", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* ── Screen Controls / Filter Bar (Hidden on Print) ── */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          padding: "14px 20px",
          backgroundColor: "#f8fafc",
          border: "1.5px solid #e2e8f0",
          borderRadius: "10px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#8E0033", textTransform: "uppercase" }}>
              ⚖️ Jury Valuation Sheet
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "8px" }}>
              (ON STAGE Programs: {printablePrograms.length})
            </span>
          </div>

          {/* Venue / Stage Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>Stage:</label>
            <select
              id="filter-venue-select"
              defaultValue={buildUrl({ venue: activeVenue })}
              style={{ padding: "4px 8px", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: 600 }}
            >
              <option value={buildUrl({ venue: "ALL" })}>All Stages ({allVenues.length})</option>
              {allVenues.map((v) => (
                <option key={v} value={buildUrl({ venue: v })}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>Category:</label>
            <select
              id="filter-category-select"
              defaultValue={buildUrl({ categoryId: activeCategory })}
              style={{ padding: "4px 8px", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: 600 }}
            >
              <option value={buildUrl({ categoryId: "ALL" })}>All Categories</option>
              {allCategories.map((c) => (
                <option key={c.id} value={buildUrl({ categoryId: c.id })}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Orientation Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#e2e8f0", padding: "2px", borderRadius: "6px", fontSize: "0.75rem" }}>
            <a
              href={buildUrl({ orientation: "portrait" })}
              style={{
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: orientation === "portrait" ? "#0f172a" : "transparent",
                color: orientation === "portrait" ? "#ffffff" : "#475569",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Portrait
            </a>
            <a
              href={buildUrl({ orientation: "landscape" })}
              style={{
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: orientation === "landscape" ? "#0f172a" : "transparent",
                color: orientation === "landscape" ? "#ffffff" : "#475569",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Landscape
            </a>
          </div>
        </div>

        {/* Copy Mode Toggle & Print Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem" }}>
            <span style={{ fontWeight: 700, color: "#64748b", marginRight: "4px" }}>Jury Copy:</span>
            <a
              href={buildUrl({ copyMode: "both" })}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: copyMode === "both" ? "2px solid #8E0033" : "1px solid #cbd5e1",
                backgroundColor: copyMode === "both" ? "#8E0033" : "#ffffff",
                color: copyMode === "both" ? "#ffffff" : "#334155",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Both (Jury 1 & 2)
            </a>
            <a
              href={buildUrl({ copyMode: "jury1" })}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: copyMode === "jury1" ? "2px solid #1e40af" : "1px solid #cbd5e1",
                backgroundColor: copyMode === "jury1" ? "#1e40af" : "#ffffff",
                color: copyMode === "jury1" ? "#ffffff" : "#334155",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Jury 1
            </a>
            <a
              href={buildUrl({ copyMode: "jury2" })}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: copyMode === "jury2" ? "2px solid #1e40af" : "1px solid #cbd5e1",
                backgroundColor: copyMode === "jury2" ? "#1e40af" : "#ffffff",
                color: copyMode === "jury2" ? "#ffffff" : "#334155",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Jury 2
            </a>
          </div>

          <PrintButton label="🖨️ Print Valuation Sheets" />
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

      {/* ── Content: Program Valuation Sheets ── */}
      {printablePrograms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <h2>No On-Stage programs found for this selection</h2>
          <p>Please adjust your Stage or Category filters.</p>
        </div>
      ) : (
        printablePrograms.flatMap((program) => {
          const candidateAssignments = program.filteredAssignments;

          let juryCopies = [1, 2];
          if (copyMode === "jury1") juryCopies = [1];
          else if (copyMode === "jury2") juryCopies = [2];

          return juryCopies.map((juryNum) => {
            const isCopy1 = juryNum === 1;
            const isCopy2 = juryNum === 2;
            const copyTitle = isCopy1 
              ? "OFFICIAL JURY 1 VALUATION SHEET" 
              : "OFFICIAL JURY 2 VALUATION SHEET";

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
                    <span style={{ backgroundColor: isCopy1 ? "#1e40af" : "#8E0033", color: "#ffffff", padding: "2px 8px", borderRadius: "3px", fontSize: "0.72rem", fontWeight: 900 }}>
                      JURY {juryNum}
                    </span>
                  </div>
                  {activeEv && (
                    <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px", fontWeight: 700 }}>
                      {activeEv.name} {activeEv.zone ? `(${activeEv.zone.name})` : ""}
                    </div>
                  )}
                </div>

                {/* ── Program Details Banner with Score to Grade Card on Right ── */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1.5px solid #0f172a",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  marginBottom: "10px",
                  backgroundColor: "#f8fafc",
                  gap: "12px",
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

                  {/* Right: Official Score to Grade Reference Box */}
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
                            <th style={{ border: "1px solid #0f172a", padding: "2px 6px", fontWeight: 800 }}>GRADE</th>
                            <th style={{ border: "1px solid #0f172a", padding: "2px 6px", fontWeight: 800 }}>SCORE (100)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 800, color: "#166534" }}>A GRADE</td>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 700 }}>80 - 100</td>
                          </tr>
                          <tr>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 800, color: "#1e40af" }}>B GRADE</td>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 700 }}>60 - 79</td>
                          </tr>
                          <tr>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 800, color: "#b45309" }}>C GRADE</td>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 700 }}>40 - 59</td>
                          </tr>
                          <tr>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 800, color: "#991b1b" }}>NO GRADE</td>
                            <td style={{ border: "1px solid #0f172a", padding: "1px 6px", fontWeight: 700 }}>39 &amp; Below</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── Clean Jury Valuation Table: ONLY Code Letter, Chest No, Name, Total Score, Grade, Place, Remarks ── */}
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
                    fontSize: "0.80rem",
                    marginBottom: "10px",
                    border: "1.5px solid #0f172a",
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
                        <th style={{ width: "42px", padding: "7px 4px", border: "1px solid #334155" }}>Sl</th>
                        <th style={{ width: "100px", padding: "7px 4px", border: "1px solid #334155", backgroundColor: "#1e293b" }}>
                          Code Letter
                        </th>
                        <th style={{ width: "95px", padding: "7px 4px", border: "1px solid #334155" }}>
                          Chest No.
                        </th>
                        <th style={{ padding: "7px 8px", border: "1px solid #334155", textAlign: "left" }}>
                          Candidate Name / Institution
                        </th>
                        <th style={{ width: "115px", padding: "7px 4px", border: "1px solid #334155", backgroundColor: "#1e293b" }}>
                          Total Score (100)
                        </th>
                        <th style={{ width: "85px", padding: "7px 4px", border: "1px solid #334155" }}>
                          Grade
                        </th>
                        <th style={{ width: "85px", padding: "7px 4px", border: "1px solid #334155" }}>
                          Place
                        </th>
                        <th style={{ width: "180px", padding: "7px 8px", border: "1px solid #334155" }}>
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidateAssignments.map((assignment: any, idx: number) => {
                        const c = assignment.candidate;
                        const instName = c?.institution?.name || c?.team?.institution?.name || c?.team?.name || "-";

                        return (
                          <tr key={assignment.id} style={{
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                            textAlign: "center",
                            height: "44px",
                          }}>
                            <td style={{ border: "1px solid #cbd5e1", fontWeight: 800 }}>{idx + 1}</td>
                            
                            {/* Code Letter Entry Area */}
                            <td style={{ border: "1px solid #cbd5e1", padding: "4px" }}>
                              <div style={{
                                width: "48px",
                                height: "30px",
                                border: "1.5px dashed #475569",
                                borderRadius: "3px",
                                margin: "0 auto",
                                backgroundColor: "#ffffff",
                              }}></div>
                            </td>

                            {/* Chest No */}
                            <td style={{ border: "1px solid #cbd5e1", fontWeight: 900, color: "#8E0033", fontFamily: "monospace", fontSize: "0.95rem" }}>
                              {c?.chestNumber || "-"}
                            </td>

                            {/* Candidate Name & Institution */}
                            <td style={{ border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "left" }}>
                              <div style={{ fontWeight: 800, color: "#0f172a" }}>{c?.name}</div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{instName}</div>
                            </td>

                            {/* Total Score Entry Box */}
                            <td style={{ border: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}></td>

                            {/* Grade Entry Box */}
                            <td style={{ border: "1px solid #cbd5e1" }}></td>

                            {/* Place Entry Box */}
                            <td style={{ border: "1px solid #cbd5e1" }}></td>

                            {/* Remarks Box */}
                            <td style={{ border: "1px solid #cbd5e1" }}></td>
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
                  padding: "10px 14px",
                  backgroundColor: "#fafafa",
                  fontSize: "0.78rem",
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                  marginTop: "12px",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px dashed #cbd5e1" }}>
                    <div>
                      <strong>Evaluator:</strong> JURY {juryNum}
                    </div>
                    <div>
                      <strong>Stage Verified:</strong> {program.venue || "Main Stage"}
                    </div>
                    <div>
                      <strong>Date:</strong> ________________________
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "16px", textAlign: "center" }}>
                    <div>
                      <div style={{ borderBottom: "1.5px solid #0f172a", height: "26px", marginBottom: "4px" }}></div>
                      <div style={{ fontWeight: 800, fontSize: "0.76rem" }}>Jury {juryNum} Name &amp; Signature</div>
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
          });
        })
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; color: black !important; margin: 0; padding: 0; }
            @page {
              size: A4 ${orientation};
              margin: 10mm;
            }
          }
        `,
      }} />
    </div>
  );
}
