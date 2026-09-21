import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    // Fetch event info
    const targetEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        zoneId: true,
        parentId: true,
        zone: { select: { id: true, name: true } }
      }
    });

    if (!targetEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const zoneId = targetEvent.zoneId;
    if (!zoneId) {
      return NextResponse.json({ error: "Event has no zone assigned" }, { status: 400 });
    }

    // All eventIds to search (this event + child events)
    const childEventId = "c1bb351f-c165-4270-9b51-b4a2069ff4c2";

    // Fetch all published results (rank 1-3) for this event
    const results = await prisma.result.findMany({
      where: {
        isPublished: true,
        rank: { in: [1, 2, 3] },
        program: {
          OR: [
            { eventId },
            { eventId: childEventId },
            { event: { parentId: eventId } },
            ...(targetEvent?.parentId ? [{ eventId: targetEvent.parentId }] : [])
          ]
        }
      },
      include: {
        program: {
          include: { category: true }
        },
        candidate: {
          include: {
            institution: true,
            team: { include: { institution: true } }
          }
        },
        team: {
          include: { institution: true }
        }
      },
      orderBy: [
        { program: { programCode: "asc" } },
        { rank: "asc" }
      ]
    });

    // Fetch all institutions in this zone via MasterInstitution
    const allInstitutions = await prisma.masterInstitution.findMany({
      where: { zoneId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, place: true }
    });

    // ---- Build institution result map ----
    interface ResultRow {
      programCode: string;
      programName: string;
      category: string;
      programType: string;
      rank: number;
      grade: string;
      marks: number | null;
      points: number | null;
    }

    const instResultMap: Record<string, ResultRow[]> = {};
    for (const inst of allInstitutions) {
      instResultMap[inst.id] = [];
    }

    const instTotals: Record<string, { individual: number; general: number; grand: number }> = {};

    for (const r of results) {
      const prog = r.program;
      // Skip magazine programs (institution award only)
      const isMag = (prog.name || "").toLowerCase().includes("magazine") || prog.programCode === "43";
      if (isMag) continue;

      const rank = r.rank;
      if (!rank) continue;

      const catName = prog.category?.name?.toUpperCase() || "GENERAL";
      const points = r.points ?? 0;

      const row: ResultRow = {
        programCode: prog.programCode || "",
        programName: prog.name,
        category: catName,
        programType: "",
        rank,
        grade: r.grade || "-",
        marks: r.marks ?? null,
        points
      };

      if (r.candidateId && r.candidate) {
        const c = r.candidate;
        const instId = c.institution?.id || c.team?.institution?.id || null;
        row.programType = "Individual";

        if (instId && instResultMap[instId] !== undefined) {
          instResultMap[instId].push({ ...row });
          if (!instTotals[instId]) instTotals[instId] = { individual: 0, general: 0, grand: 0 };
          instTotals[instId].individual += points;
          instTotals[instId].grand += points;
        }
      } else if (r.teamId && r.team) {
        const team = r.team;
        const instId = team.institution?.id || null;
        row.programType = "General / Group";

        if (instId && instResultMap[instId] !== undefined) {
          // Add only once per program+rank per institution for group events
          const already = instResultMap[instId].find(
            ex => ex.programCode === row.programCode && ex.rank === rank && ex.programType === "General / Group"
          );
          if (!already) {
            instResultMap[instId].push({ ...row });
            if (!instTotals[instId]) instTotals[instId] = { individual: 0, general: 0, grand: 0 };
            instTotals[instId].general += points;
            instTotals[instId].grand += points;
          }
        }
      }
    }

    // ---- Zone Leaderboard data ----
    const leaderboard = allInstitutions
      .map(inst => ({
        Institution: inst.name,
        Place: inst.place || "",
        "Individual Points": instTotals[inst.id]?.individual ?? 0,
        "General/Group Points": instTotals[inst.id]?.general ?? 0,
        "Total Points": instTotals[inst.id]?.grand ?? 0
      }))
      .sort((a, b) => b["Total Points"] - a["Total Points"])
      .map((row, idx) => ({ Rank: idx + 1, ...row }));

    // ---- Create Workbook ----
    const wb = xlsx.utils.book_new();

    // Sheet 1: Zone Leaderboard
    const wsLeaderboard = xlsx.utils.json_to_sheet(leaderboard);
    wsLeaderboard["!cols"] = [
      { wch: 6 }, { wch: 40 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 14 }
    ];
    xlsx.utils.book_append_sheet(wb, wsLeaderboard, "Zone Leaderboard");

    // Sheet 2: All Institutions Combined
    const sortedByPoints = [...allInstitutions].sort((a, b) => {
      return (instTotals[b.id]?.grand ?? 0) - (instTotals[a.id]?.grand ?? 0);
    });

    const allRows: any[] = [];
    let slNo = 1;
    for (const inst of sortedByPoints) {
      const rows = instResultMap[inst.id] || [];
      if (rows.length === 0) continue;

      const sorted = [...rows].sort((a, b) =>
        a.programCode < b.programCode ? -1 : a.programCode > b.programCode ? 1 : a.rank - b.rank
      );

      for (const row of sorted) {
        allRows.push({
          "Sl No": slNo++,
          "Institution": inst.name,
          "Place": inst.place || "",
          "Program Code": row.programCode,
          "Program Name": row.programName,
          "Category": row.category,
          "Type": row.programType,
          "Rank": row.rank,
          "Grade": row.grade,
          "Marks": row.marks ?? "",
          "Points": row.points ?? 0
        });
      }

      const totals = instTotals[inst.id] || { individual: 0, general: 0, grand: 0 };
      allRows.push({
        "Sl No": "",
        "Institution": `${inst.name} — SUBTOTAL`,
        "Place": "",
        "Program Code": "",
        "Program Name": "",
        "Category": "",
        "Type": "",
        "Rank": "",
        "Grade": `Individual: ${totals.individual} pts | General: ${totals.general} pts`,
        "Marks": "",
        "Points": totals.grand
      });
      allRows.push({});
    }

    const wsAll = xlsx.utils.json_to_sheet(allRows);
    wsAll["!cols"] = [
      { wch: 7 }, { wch: 38 }, { wch: 20 }, { wch: 14 }, { wch: 32 },
      { wch: 12 }, { wch: 16 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 8 }
    ];
    xlsx.utils.book_append_sheet(wb, wsAll, "All Institutions Combined");

    // Individual institution sheets
    for (const inst of sortedByPoints) {
      const rows = instResultMap[inst.id] || [];
      if (rows.length === 0) continue;

      const sorted = [...rows].sort((a, b) =>
        a.programCode < b.programCode ? -1 : a.programCode > b.programCode ? 1 : a.rank - b.rank
      );

      const totals = instTotals[inst.id] || { individual: 0, general: 0, grand: 0 };

      const sheetRows: any[] = sorted.map((row, i) => ({
        "Sl No": i + 1,
        "Program Code": row.programCode,
        "Program Name": row.programName,
        "Category": row.category,
        "Type": row.programType,
        "Place": row.rank === 1 ? "1st" : row.rank === 2 ? "2nd" : "3rd",
        "Grade": row.grade,
        "Marks": row.marks ?? "",
        "Points": row.points ?? 0
      }));

      sheetRows.push({});
      sheetRows.push({
        "Sl No": "",
        "Program Code": "",
        "Program Name": "TOTAL POINTS",
        "Category": "",
        "Type": "",
        "Place": "",
        "Grade": `Individual: ${totals.individual} | General: ${totals.general}`,
        "Marks": "",
        "Points": totals.grand
      });

      const wsInst = xlsx.utils.json_to_sheet(sheetRows);
      wsInst["!cols"] = [
        { wch: 6 }, { wch: 14 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }
      ];

      // Sheet name: max 31 chars, safe chars only
      const sheetName = inst.name
        .replace(/[^a-zA-Z0-9\s\-]/g, "")
        .substring(0, 28)
        .trim() || `Inst_${inst.id.substring(0, 6)}`;

      xlsx.utils.book_append_sheet(wb, wsInst, sheetName);
    }

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    const zoneName = targetEvent.zone?.name || targetEvent.name || "Zone";
    const safeZone = zoneName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeZone}_Institution_Points_Breakdown.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache"
      }
    });
  } catch (error: any) {
    console.error("Error generating institution points excel:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate Excel" },
      { status: 500 }
    );
  }
}
