import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DistributionSheetPage(props: {
  searchParams: Promise<{
    eventId?: string;
    zoneId?: string;
    mode?: "blank" | "filled";
    place?: string; // "all" | "1" | "2" | "3"
    category?: string; // "ALL" | "FADHILA" | "FADHEELA" | "GENERAL"
    stageType?: string; // "ALL" | "ON_STAGE" | "OFF_STAGE" | "GENERAL"
    orientation?: string; // "landscape" | "portrait"
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  const orientation = searchParams.orientation === "portrait" ? "portrait" : "landscape";
  // Default mode is "blank" (Blank marking sheet with Enter Chest Number area only, no candidate names)
  const isBlankMode = searchParams.mode !== "filled";
  const placeFilter = searchParams.place || "all"; // "all" | "1" | "2" | "3"
  const categoryFilter = searchParams.category || "ALL";
  const stageTypeFilter = searchParams.stageType || "ALL";

  // 1. Resolve full user details
  const user = session?.user;
  const fullUser = user?.id
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { eventId: true, zoneId: true, role: true }
      })
    : null;

  const userRole = fullUser?.role || user?.role || "GUEST";
  const userZoneId = fullUser?.zoneId || (user as any)?.zoneId || null;
  const userEventId = fullUser?.eventId || user?.eventId || null;

  // 2. Fetch available events for switcher
  let eventWhere: any = {};
  if (userRole === "ZONE_ADMIN" && userZoneId) {
    eventWhere = { zoneId: userZoneId };
  } else if (userRole === "ZONE_ADMIN" && userEventId) {
    eventWhere = { OR: [{ id: userEventId }, { parentId: userEventId }] };
  }

  const allAvailableEvents = await prisma.event.findMany({
    where: eventWhere,
    include: { zone: true },
    orderBy: { updatedAt: "desc" }
  });

  // 3. Determine target event (prioritize LIVE or COMPLETED zone event)
  let targetEventId = searchParams.eventId || null;
  if (!targetEventId) {
    if (allAvailableEvents.length > 0) {
      const liveOrCompleted = allAvailableEvents.find((e) =>
        ["LIVE", "COMPLETED", "SCHEDULE_PUBLISHED"].includes(e.statusOverride || "")
      );
      targetEventId = liveOrCompleted ? liveOrCompleted.id : allAvailableEvents[0].id;
    } else {
      const defaultEv = await prisma.event.findFirst({
        where: { type: "ZONE" },
        include: { zone: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
      });
      targetEventId = defaultEv?.id || null;
    }
  }

  if (!targetEventId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>No Zone Event Found</h2>
        <p>Please select an active zone event to print the distribution marking list.</p>
        <Link href="/dashboard/reports" className="btn btn-primary">Go to Reports</Link>
      </div>
    );
  }

  const [targetEvent, settings, allCategories] = await Promise.all([
    prisma.event.findUnique({
      where: { id: targetEventId },
      include: {
        zone: true,
        parent: true
      }
    }),
    getSettings(targetEventId),
    prisma.category.findMany({ orderBy: { name: "asc" } })
  ]);

  if (!targetEvent) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Event not found</h2>
        <Link href="/dashboard/reports">Back to Reports</Link>
      </div>
    );
  }

  // 4. Fetch ALL Unique Programs for this festival (both ON_STAGE and OFF_STAGE and GENERAL)
  const allowedEventIds = [targetEvent.id, targetEvent.parentId].filter(Boolean) as string[];

  const rawFestivalPrograms = await prisma.program.findMany({
    where: {
      eventId: { in: allowedEventIds }
    },
    include: {
      category: true
    },
    orderBy: [
      { programCode: "asc" },
      { name: "asc" }
    ]
  });

  // Deduplicate programs by programCode
  const programMapByCode = new Map<string, any>();
  for (const prog of rawFestivalPrograms) {
    const key = prog.programCode || prog.id;
    if (!programMapByCode.has(key)) {
      programMapByCode.set(key, prog);
    }
  }

  const allFestivalPrograms = Array.from(programMapByCode.values()).sort((a, b) => {
    const codeA = parseInt(a.programCode || "999", 10);
    const codeB = parseInt(b.programCode || "999", 10);
    if (!isNaN(codeA) && !isNaN(codeB) && codeA !== codeB) return codeA - codeB;
    return (a.name || "").localeCompare(b.name || "");
  });

  // Accurate breakdown counts for the entire festival
  const totalProgramsCount = allFestivalPrograms.length;
  const totalOnStageCount = allFestivalPrograms.filter((p) => p.stageType === "ON_STAGE").length;
  const totalOffStageCount = allFestivalPrograms.filter((p) => p.stageType === "OFF_STAGE").length;
  const totalGeneralCount = allFestivalPrograms.filter(
    (p) =>
      p.type === "GENERAL" ||
      p.category?.name?.toUpperCase() === "GENERAL" ||
      !p.categoryId ||
      (p.name || "").toLowerCase().includes("magazine")
  ).length;

  // 5. If "filled" mode is requested, query existing results for target event
  const allowedRanks = placeFilter === "1" ? [1] : placeFilter === "2" ? [2] : placeFilter === "3" ? [3] : [1, 2, 3];
  let resultsMap = new Map<string, any>();

  if (!isBlankMode) {
    const rawResults = await prisma.result.findMany({
      where: {
        rank: { in: allowedRanks },
        OR: [
          { team: { eventId: targetEvent.id } },
          { candidate: { team: { eventId: targetEvent.id } } }
        ]
      },
      include: {
        program: { select: { id: true, programCode: true } },
        candidate: {
          select: {
            chestNumber: true,
            institution: { select: { name: true, code: true } },
            team: { select: { institution: { select: { name: true, code: true } } } }
          }
        },
        team: {
          select: {
            name: true,
            institution: { select: { name: true, code: true } }
          }
        }
      }
    });

    for (const r of rawResults) {
      if (!r.program) continue;
      const key1 = `${r.program.id}_${r.rank}`;
      const key2 = `${r.program.programCode}_${r.rank}`;
      resultsMap.set(key1, r);
      resultsMap.set(key2, r);
    }
  }

  // 6. Filter festival programs by stageType and category
  const filteredPrograms = allFestivalPrograms.filter((prog) => {
    const isGen =
      prog.type === "GENERAL" ||
      prog.category?.name?.toUpperCase() === "GENERAL" ||
      !prog.categoryId ||
      (prog.name || "").toLowerCase().includes("magazine");

    if (stageTypeFilter !== "ALL") {
      if (stageTypeFilter === "GENERAL") {
        if (!isGen) return false;
      } else if (stageTypeFilter === "ON_STAGE") {
        if (prog.stageType !== "ON_STAGE") return false;
      } else if (stageTypeFilter === "OFF_STAGE") {
        if (prog.stageType !== "OFF_STAGE") return false;
      }
    }

    if (categoryFilter !== "ALL") {
      const catName = prog.category?.name?.toUpperCase() || "GENERAL";
      if (categoryFilter === "FADHILA" && !catName.includes("FADHILA")) return false;
      if (categoryFilter === "FADHEELA" && !catName.includes("FADHEELA")) return false;
      if (categoryFilter === "GENERAL" && (catName.includes("FADHILA") || catName.includes("FADHEELA"))) return false;
    }

    return true;
  });

  const placesToDisplay = placeFilter === "1" ? [1] : placeFilter === "2" ? [2] : placeFilter === "3" ? [3] : [1, 2, 3];

  const zoneDisplayName = targetEvent.zone?.name || targetEvent.name;
  const zoneDisplayCode = targetEvent.zone?.code ? `[${targetEvent.zone.code}]` : "";

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", padding: "16px" }}>
      {/* High-contrast Black & White Print Styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: ${orientation};
              margin: 7mm 7mm 9mm 7mm;
            }
            @media print {
              body {
                background: #ffffff !important;
                color: #000000 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .print-container {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                background: #ffffff !important;
              }
              .program-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-bottom: 12px !important;
              }
              table {
                page-break-inside: auto;
                border-collapse: collapse !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              th, td {
                border-color: #000000 !important;
              }
            }
          `
        }}
      />

      {/* SCREEN CONTROLS BAR (.no-print) */}
      <div
        className="no-print"
        style={{
          maxWidth: "1350px",
          margin: "0 auto 16px auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          border: "1.5px solid #000000"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.6rem" }}>📋</span>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#000000" }}>
                Prize, Trophy &amp; Certificate Distribution Marking Register
              </h2>
              <span style={{ padding: "3px 9px", borderRadius: "6px", backgroundColor: "#000000", color: "#ffffff", fontSize: "0.75rem", fontWeight: 800 }}>
                {zoneDisplayName} {zoneDisplayCode}
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#475569" }}>
              Official physical handover marking sheet with <strong>Enter Chest Number Area only</strong> (candidate names omitted), On &amp; Off-Stage master program roster, trophy &amp; cert checkboxes, and signature lines.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <PrintButton label="🖨️ Print Sheet (Black & White)" color="#000000" />
            <Link
              href={`/api/reports/trophy-audit-excel?eventId=${targetEventId}`}
              download="Trophy_Certificate_Distribution_Audit.xlsx"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontWeight: 700,
                borderRadius: "6px",
                fontSize: "0.84rem",
                textDecoration: "none"
              }}
              title="Download Excel Sheet for Tabulation Room"
            >
              📊 Audit Excel (.xlsx)
            </Link>
            <Link
              href="/dashboard/reports"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 12px",
                backgroundColor: "#f1f5f9",
                color: "#334155",
                fontWeight: 700,
                borderRadius: "6px",
                fontSize: "0.84rem",
                textDecoration: "none",
                border: "1px solid #cbd5e1"
              }}
            >
              Back to Reports
            </Link>
          </div>
        </div>

        {/* CONTROLS & FILTER PILLS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Row 1: Event Switcher */}
          {allAvailableEvents.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "0.85rem" }}>
              <span style={{ fontWeight: 800, color: "#334155" }}>Festival:</span>
              {allAvailableEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/print/distribution-sheet?eventId=${ev.id}&mode=${searchParams.mode || "blank"}&stageType=${stageTypeFilter}&category=${categoryFilter}&place=${placeFilter}&orientation=${orientation}`}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    backgroundColor: ev.id === targetEventId ? "#000000" : "#f1f5f9",
                    color: ev.id === targetEventId ? "#ffffff" : "#334155",
                    border: "1px solid #000000"
                  }}
                >
                  {ev.zone?.name || ev.name}
                </Link>
              ))}
            </div>
          )}

          {/* Row 2: Sheet Mode (Blank vs Filled) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "0.85rem" }}>
            <span style={{ fontWeight: 800, color: "#334155" }}>Sheet Format:</span>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=blank&stageType=${stageTypeFilter}&category=${categoryFilter}&place=${placeFilter}&orientation=${orientation}`}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 800,
                textDecoration: "none",
                backgroundColor: isBlankMode ? "#000000" : "#ffffff",
                color: isBlankMode ? "#ffffff" : "#000000",
                border: "2px solid #000000"
              }}
            >
              📋 Blank Marking Sheet (Enter Chest No. Area Only)
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=filled&stageType=${stageTypeFilter}&category=${categoryFilter}&place=${placeFilter}&orientation=${orientation}`}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 800,
                textDecoration: "none",
                backgroundColor: !isBlankMode ? "#000000" : "#ffffff",
                color: !isBlankMode ? "#ffffff" : "#000000",
                border: "2px solid #000000"
              }}
            >
              📝 Pre-filled from Live Results
            </Link>
          </div>

          {/* Row 3: Stage Type Filter (ALL, ON_STAGE, OFF_STAGE, GENERAL) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "0.85rem" }}>
            <span style={{ fontWeight: 800, color: "#334155" }}>Programs Filter:</span>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${searchParams.mode || "blank"}&stageType=ALL&category=${categoryFilter}&place=${placeFilter}&orientation=${orientation}`}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: stageTypeFilter === "ALL" ? "#000000" : "#f1f5f9",
                color: stageTypeFilter === "ALL" ? "#ffffff" : "#334155",
                border: "1px solid #cbd5e1"
              }}
            >
              All Programs ({totalProgramsCount})
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${searchParams.mode || "blank"}&stageType=ON_STAGE&category=${categoryFilter}&place=${placeFilter}&orientation=${orientation}`}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: stageTypeFilter === "ON_STAGE" ? "#000000" : "#f1f5f9",
                color: stageTypeFilter === "ON_STAGE" ? "#ffffff" : "#334155",
                border: "1px solid #cbd5e1"
              }}
            >
              🎭 On-Stage Only ({totalOnStageCount})
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${searchParams.mode || "blank"}&stageType=OFF_STAGE&category=${categoryFilter}&place=${placeFilter}&orientation=${orientation}`}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: stageTypeFilter === "OFF_STAGE" ? "#000000" : "#f1f5f9",
                color: stageTypeFilter === "OFF_STAGE" ? "#ffffff" : "#334155",
                border: "1px solid #cbd5e1"
              }}
            >
              📝 Off-Stage Only ({totalOffStageCount})
            </Link>
            <Link
              href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${searchParams.mode || "blank"}&stageType=GENERAL&category=${categoryFilter}&place=${placeFilter}&orientation=${orientation}`}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
                backgroundColor: stageTypeFilter === "GENERAL" ? "#000000" : "#f1f5f9",
                color: stageTypeFilter === "GENERAL" ? "#ffffff" : "#334155",
                border: "1px solid #cbd5e1"
              }}
            >
              👥 General Programs ({totalGeneralCount})
            </Link>
          </div>

          {/* Row 4: Category & Position & Orientation Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 800, color: "#334155" }}>Category:</span>
              {["ALL", "FADHILA", "FADHEELA", "GENERAL"].map((cat) => (
                <Link
                  key={cat}
                  href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${searchParams.mode || "blank"}&stageType=${stageTypeFilter}&category=${cat}&place=${placeFilter}&orientation=${orientation}`}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    backgroundColor: categoryFilter === cat ? "#000000" : "#f1f5f9",
                    color: categoryFilter === cat ? "#ffffff" : "#334155",
                    border: "1px solid #cbd5e1"
                  }}
                >
                  {cat}
                </Link>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 800, color: "#334155" }}>Positions:</span>
              {[
                { val: "all", label: "1st, 2nd & 3rd" },
                { val: "1", label: "1st Only" },
                { val: "2", label: "2nd Only" },
                { val: "3", label: "3rd Only" }
              ].map((p) => (
                <Link
                  key={p.val}
                  href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${searchParams.mode || "blank"}&stageType=${stageTypeFilter}&category=${categoryFilter}&place=${p.val}&orientation=${orientation}`}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    backgroundColor: placeFilter === p.val ? "#000000" : "#f1f5f9",
                    color: placeFilter === p.val ? "#ffffff" : "#334155",
                    border: "1px solid #cbd5e1"
                  }}
                >
                  {p.label}
                </Link>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
              <span style={{ fontWeight: 800, color: "#334155" }}>Print Layout:</span>
              <Link
                href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${searchParams.mode || "blank"}&stageType=${stageTypeFilter}&category=${categoryFilter}&place=${placeFilter}&orientation=landscape`}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  backgroundColor: orientation === "landscape" ? "#000000" : "#f1f5f9",
                  color: orientation === "landscape" ? "#ffffff" : "#334155",
                  border: "1px solid #cbd5e1"
                }}
              >
                Landscape
              </Link>
              <Link
                href={`/print/distribution-sheet?eventId=${targetEventId}&mode=${searchParams.mode || "blank"}&stageType=${stageTypeFilter}&category=${categoryFilter}&place=${placeFilter}&orientation=portrait`}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  backgroundColor: orientation === "portrait" ? "#000000" : "#f1f5f9",
                  color: orientation === "portrait" ? "#ffffff" : "#334155",
                  border: "1px solid #cbd5e1"
                }}
              >
                Portrait
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT CONTAINER (BLACK & WHITE HIGH-CONTRAST REGISTER) */}
      <div
        className="print-container"
        style={{
          maxWidth: orientation === "portrait" ? "900px" : "1350px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          color: "#000000",
          padding: "24px 28px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          border: "2px solid #000000"
        }}
      >
        {/* OFFICIAL HEADER BANNER */}
        <div style={{ borderBottom: "2.5px solid #000000", paddingBottom: "12px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "0.76rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#000000" }}>
                CO-ORDINATION OF SHARI&apos;AH WOMEN&apos;S COLLEGES (CSWC)
              </div>
              <h1 style={{ margin: "2px 0 0 0", fontSize: "1.4rem", fontWeight: 900, color: "#000000", letterSpacing: "-0.01em" }}>
                HIYA FIESTA 2026 &bull; {zoneDisplayName.toUpperCase()} {zoneDisplayCode}
              </h1>
              <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "#000000", marginTop: "2px" }}>
                PRIZE, TROPHY &amp; CERTIFICATE DISTRIBUTION MARKING REGISTER &bull; CHEST NUMBER ENTRY
              </div>
            </div>

            <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#000000", lineHeight: 1.4 }}>
              <div><strong>Document:</strong> Distribution Marking Sheet</div>
              <div><strong>Format:</strong> {isBlankMode ? "Blank Entry Sheet (Manual)" : "Live Results Sheet"}</div>
              <div><strong>Date:</strong> {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
            </div>
          </div>

          {/* AUDIT SUMMARY STATS STRIP WITH TOTAL ON-STAGE, OFF-STAGE & GENERAL PROGRAMS */}
          <div style={{ marginTop: "12px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: "8px"
              }}
            >
              {/* Card 1: Total Programs */}
              <div
                style={{
                  border: "1.5px solid #000000",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 800 }}>
                  Total Programs
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, lineHeight: 1.1, marginTop: "2px" }}>
                  {filteredPrograms.length} / {totalProgramsCount}
                </div>
              </div>

              {/* Card 2: On-Stage Programs */}
              <div
                style={{
                  border: "1.5px solid #000000",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 800 }}>
                  🎭 On-Stage
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, lineHeight: 1.1, marginTop: "2px" }}>
                  {filteredPrograms.filter((p) => p.stageType === "ON_STAGE").length} / {totalOnStageCount}
                </div>
              </div>

              {/* Card 3: Off-Stage Programs */}
              <div
                style={{
                  border: "1.5px solid #000000",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 800 }}>
                  📝 Off-Stage
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, lineHeight: 1.1, marginTop: "2px" }}>
                  {filteredPrograms.filter((p) => p.stageType === "OFF_STAGE").length} / {totalOffStageCount}
                </div>
              </div>

              {/* Card 4: General Programs */}
              <div
                style={{
                  border: "1.5px solid #000000",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 800 }}>
                  🌐 General
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, lineHeight: 1.1, marginTop: "2px" }}>
                  {
                    filteredPrograms.filter(
                      (p) =>
                        p.type === "GENERAL" ||
                        p.category?.name?.toUpperCase() === "GENERAL" ||
                        !p.categoryId ||
                        (p.name || "").toLowerCase().includes("magazine")
                    ).length
                  }{" "}
                  / {totalGeneralCount}
                </div>
              </div>

              {/* Card 5: Positions */}
              <div
                style={{
                  border: "1.5px solid #000000",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 800 }}>
                  Marking Rows
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, lineHeight: 1.1, marginTop: "2px" }}>
                  {filteredPrograms.length * placesToDisplay.length} Slots
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NOTICE INSTRUCTIONS BANNER */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1.5px solid #000000",
            borderRadius: "4px",
            padding: "6px 12px",
            marginBottom: "14px",
            fontSize: "0.72rem",
            color: "#000000",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          <div>
            <strong>INSTRUCTIONS:</strong> Verify the winning chest numbers from official score sheets. Enter the <strong>Chest Number</strong> in the entry box, tick (✓) <strong>Trophy</strong> and <strong>Certificate</strong> upon handover, and obtain recipient signature.
          </div>
          <div>
            <strong>Scope:</strong> All Off-Stage &amp; On-Stage Competition Programs
          </div>
        </div>

        {/* PROGRAM-WISE DISTRIBUTION TABLE (BLACK & WHITE HIGH-CONTRAST) */}
        {filteredPrograms.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#000000", border: "1.5px dashed #000000", borderRadius: "6px" }}>
            No programs found matching the selected stage type or category filter.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredPrograms.map((prog, pIdx) => {
              const isProgOnStage = prog.stageType === "ON_STAGE";
              const isProgGeneral =
                prog.type === "GENERAL" ||
                prog.category?.name?.toUpperCase() === "GENERAL" ||
                !prog.categoryId ||
                (prog.name || "").toLowerCase().includes("magazine");

              return (
                <div
                  key={prog.id}
                  className="program-block"
                  style={{
                    border: "1.5px solid #000000",
                    borderRadius: "4px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff"
                  }}
                >
                  {/* Program Header Bar */}
                  <div
                    style={{
                      backgroundColor: "#f1f5f9",
                      color: "#000000",
                      padding: "5px 10px",
                      borderBottom: "1.5px solid #000000",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "6px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          backgroundColor: "#000000",
                          color: "#ffffff",
                          padding: "1px 7px",
                          borderRadius: "3px",
                          fontWeight: 900,
                          fontSize: "0.82rem",
                          fontFamily: "monospace"
                        }}
                      >
                        #{prog.programCode || pIdx + 1}
                      </span>
                      <strong style={{ fontSize: "0.95rem", color: "#000000" }}>{prog.name}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.72rem" }}>
                      <span
                        style={{
                          border: "1px solid #000000",
                          backgroundColor: "#ffffff",
                          color: "#000000",
                          padding: "1px 6px",
                          borderRadius: "3px",
                          fontWeight: 800
                        }}
                      >
                        {isProgOnStage ? "🎭 ON STAGE" : "📝 OFF STAGE"}
                      </span>
                      {isProgGeneral && (
                        <span
                          style={{
                            border: "1px solid #000000",
                            backgroundColor: "#ffffff",
                            color: "#000000",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            fontWeight: 800
                          }}
                        >
                          🌐 GENERAL
                        </span>
                      )}
                      <span style={{ border: "1px solid #000000", backgroundColor: "#ffffff", padding: "1px 6px", borderRadius: "3px" }}>
                        Cat: <strong>{prog.category?.name || "General"}</strong>
                      </span>
                      <span style={{ border: "1px solid #000000", backgroundColor: "#ffffff", padding: "1px 6px", borderRadius: "3px" }}>
                        Type: <strong>{prog.type}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Marking Table for 1st, 2nd, and 3rd Places */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.78rem",
                      textAlign: "left"
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#ffffff", color: "#000000", borderBottom: "1.5px solid #000000" }}>
                        <th style={{ padding: "5px 8px", width: "95px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                          Position
                        </th>
                        <th style={{ padding: "5px 12px", width: "170px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                          Enter Chest Number
                        </th>
                        <th style={{ padding: "5px 10px", borderRight: "1.5px solid #000000" }}>
                          College / Institution Name
                        </th>
                        <th style={{ padding: "5px 6px", width: "85px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                          Grade
                        </th>
                        <th style={{ padding: "5px 6px", width: "85px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                          Trophy
                        </th>
                        <th style={{ padding: "5px 6px", width: "90px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                          Certificate
                        </th>
                        <th style={{ padding: "5px 12px", width: "160px", textAlign: "center" }}>
                          Recipient Signature
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {placesToDisplay.map((rankNum, rIdx) => {
                        const rankLabel =
                          rankNum === 1 ? "🥇 1st Place" : rankNum === 2 ? "🥈 2nd Place" : rankNum === 3 ? "🥉 3rd Place" : `Rank ${rankNum}`;

                        // If filled mode, check if result exists
                        const existingRes = !isBlankMode ? (resultsMap.get(`${prog.id}_${rankNum}`) || resultsMap.get(`${prog.programCode}_${rankNum}`)) : null;
                        const filledChest = existingRes?.candidate?.chestNumber;
                        const filledInst =
                          existingRes?.candidate?.institution?.name ||
                          existingRes?.candidate?.team?.institution?.name ||
                          existingRes?.team?.institution?.name ||
                          existingRes?.team?.name ||
                          "";

                        return (
                          <tr
                            key={`${prog.id}_${rankNum}`}
                            style={{
                              borderBottom: rIdx === placesToDisplay.length - 1 ? "none" : "1px solid #000000",
                              backgroundColor: "#ffffff"
                            }}
                          >
                            {/* Position */}
                            <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 7px",
                                  borderRadius: "3px",
                                  border: "1px solid #000000",
                                  fontWeight: 800,
                                  fontSize: "0.76rem",
                                  backgroundColor: "#ffffff",
                                  color: "#000000"
                                }}
                              >
                                {rankLabel}
                              </span>
                            </td>

                            {/* ENTER CHEST NUMBER BOX (CLEAR BLANK ENTRY AREA, NO CANDIDATE NAMES) */}
                            <td style={{ padding: "6px 10px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "140px",
                                  height: "34px",
                                  border: "2px solid #000000",
                                  borderRadius: "4px",
                                  backgroundColor: "#ffffff",
                                  fontSize: filledChest ? "1.05rem" : "0.78rem",
                                  fontFamily: "monospace",
                                  fontWeight: 900,
                                  color: "#000000"
                                }}
                              >
                                {filledChest ? filledChest : "Chest: _________"}
                              </div>
                            </td>

                            {/* College / Institution Write-in Line */}
                            <td style={{ padding: "6px 10px", borderRight: "1.5px solid #000000" }}>
                              {filledInst ? (
                                <div style={{ fontWeight: 800, color: "#000000", fontSize: "0.82rem" }}>
                                  {filledInst}
                                </div>
                              ) : (
                                <div style={{ height: "22px", borderBottom: "1.2px dotted #000000", width: "95%" }}></div>
                              )}
                            </td>

                            {/* Grade Checkboxes */}
                            <td style={{ padding: "6px", textAlign: "center", borderRight: "1.5px solid #000000", fontSize: "0.74rem" }}>
                              <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                                <span>[ ] A</span>
                                <span>[ ] B</span>
                                <span>[ ] C</span>
                              </div>
                            </td>

                            {/* Trophy Checkbox */}
                            <td style={{ padding: "6px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "3px 6px",
                                  border: "1.2px solid #000000",
                                  borderRadius: "3px",
                                  backgroundColor: "#ffffff",
                                  fontWeight: 700,
                                  fontSize: "0.72rem"
                                }}
                              >
                                <span style={{ display: "inline-block", width: "12px", height: "12px", border: "1.5px solid #000000", borderRadius: "2px" }}></span>
                                <span>Trophy</span>
                              </div>
                            </td>

                            {/* Certificate Checkbox */}
                            <td style={{ padding: "6px", textAlign: "center", borderRight: "1.5px solid #000000" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "3px 6px",
                                  border: "1.2px solid #000000",
                                  borderRadius: "3px",
                                  backgroundColor: "#ffffff",
                                  fontWeight: 700,
                                  fontSize: "0.72rem"
                                }}
                              >
                                <span style={{ display: "inline-block", width: "12px", height: "12px", border: "1.5px solid #000000", borderRadius: "2px" }}></span>
                                <span>Cert</span>
                              </div>
                            </td>

                            {/* Recipient Signature Line */}
                            <td style={{ padding: "6px 12px", textAlign: "center" }}>
                              <div style={{ height: "20px", borderBottom: "1.2px solid #000000", margin: "0 auto", width: "90%" }}></div>
                              <div style={{ fontSize: "0.62rem", color: "#000000", marginTop: "2px" }}>(Sign / Date)</div>
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
        )}

        {/* OFFICIAL SIGNATURE FOOTER */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "14px",
            borderTop: "2px solid #000000",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px",
            textAlign: "center",
            pageBreakInside: "avoid"
          }}
        >
          <div>
            <div style={{ height: "30px", borderBottom: "1.2px solid #000000", width: "70%", margin: "0 auto 4px auto" }}></div>
            <div style={{ fontSize: "0.74rem", fontWeight: 800 }}>STAGE &amp; PROGRAM CONVENOR</div>
            <div style={{ fontSize: "0.65rem", color: "#333333" }}>Verification &amp; Announcement</div>
          </div>
          <div>
            <div style={{ height: "30px", borderBottom: "1.2px solid #000000", width: "70%", margin: "0 auto 4px auto" }}></div>
            <div style={{ fontSize: "0.74rem", fontWeight: 800 }}>CERTIFICATE &amp; TROPHY CONVENOR</div>
            <div style={{ fontSize: "0.65rem", color: "#333333" }}>Physical Handover Log</div>
          </div>
          <div>
            <div style={{ height: "30px", borderBottom: "1.2px solid #000000", width: "70%", margin: "0 auto 4px auto" }}></div>
            <div style={{ fontSize: "0.74rem", fontWeight: 800 }}>ZONAL GENERAL SECRETARY / ADMIN</div>
            <div style={{ fontSize: "0.65rem", color: "#333333" }}>Final Authority Sign &amp; Seal</div>
          </div>
        </div>
      </div>
    </div>
  );
}
