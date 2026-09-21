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

    // Collect all eventIds to search (this event + child events)
    const childEventId = "c1bb351f-c165-4270-9b51-b4a2069ff4c2"; // keep for legacy

    // Fetch all published results with program, candidate/team and institution
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

    // Fetch all institutions in the zone
    const institutions = await prisma.institution.findMany({
      where: { zoneId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, place: true }
    });

    // ---- Build institution map: instId -> list of result rows ----
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
    for (const inst of institutions) {
      instResultMap[inst.id] = [];
    }

    // Points totals per institution
    const instTotals: Record<string, { individual: number; general: number; grand: number }> = {};

    for (const r of results) {
      const prog = r.program;
      const isMag = (prog.name || "").toLowerCase().includes("magazine") || prog.programCode === "43";
      if (isMag) continue; // magazine is institution award only, skip for point breakdown

      const rank = r.rank;
      if (!rank) continue;

      const grade = r.grade || "-";
      const catName = prog.category?.name?.toUpperCase() || "GENERAL";
      const points = r.points ?? 0;
      const marks = r.marks ?? null;

      const row: ResultRow = {
        programCode: prog.programCode || "",
        programName: prog.name,
        category: catName,
        programType: "",
        rank,
        grade,
        marks,
        points
      };

      if (r.candidateId && r.candidate) {
        const c = r.candidate;
        const instId =
          c.institution?.id ||
          c.team?.institution?.id ||
          null;

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
          // For group programs, count the point once per institution (not per participant)
          // But only add once (check we haven't already added this result for this institution)
          const existing = instResultMap[instId].find(
            ex => ex.programCode === row.programCode && ex.rank === rank && ex.programType === "General / Group"
          );
          if (!existing) {
            instResultMap[instId].push({ ...row });
            if (!instTotals[instId]) instTotals[instId] = { individual: 0, general: 0, grand: 0 };
            instTotals[instId].general += points;
            instTotals[instId].grand += points;
          }
        }
      }
    }

    // ---- Build leaderboard (across all institutions in zone) ----
    const leaderboard: any[] = institutions
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

    // --- Sheet 1: Zone Leaderboard ---
    const leaderboardHeader: any[] = [
      { A: `CSWC HIYA FIESTA 2026 - ${(targetEvent.zone?.name || targetEvent.name || "ZONE").toUpperCase()}` },
      { A: "INSTITUTION-WISE POINTS LEADERBOARD" },
      { A: `Generated: ${new Date().toLocaleString("en-IN")}` },
      {}
    ];
    const wsLB = xlsx.utils.json_to_sheet([...leaderboardHeader, ...leaderboard.map(r => ({
      "Rank": r.Rank,
      "Institution": r.Institution,
      "Place": r.Place,
      "Individual Points": r["Individual Points"],
      "General/Group Points": r["General/Group Points"],
      "Total Points": r["Total Points"]
    }))], { skipHeader: leaderboardHeader.length > 0 ? false : false });

    // Rebuild properly
    const lbSheetData = leaderboard.map((r, i) => ({
      "Rank": i + 1,
      "Institution": r.Institution,
      "Place": r.Place,
      "Individual Points": r["Individual Points"],
      "General/Group Points": r["General/Group Points"],
      "Total Points": r["Total Points"]
    }));
    const wsLeaderboard = xlsx.utils.json_to_sheet(lbSheetData);
    wsLeaderboard["!cols"] = [
      { wch: 6 }, { wch: 40 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 14 }
    ];
    xlsx.utils.book_append_sheet(wb, wsLeaderboard, "Zone Leaderboard");

    // --- Sheet 2: All Institutions Combined ---
    const allRows: any[] = [];
    let slNo = 1;
    for (const inst of institutions.sort((a, b) => {
      const ta = instTotals[a.id]?.grand ?? 0;
      const tb = instTotals[b.id]?.grand ?? 0;
      return tb - ta;
    })) {
      const rows = instResultMap[inst.id] || [];
      if (rows.length === 0) continue;

      const sorted = [...rows].sort((a, b) => {
        if (a.programCode < b.programCode) return -1;
        if (a.programCode > b.programCode) return 1;
        return a.rank - b.rank;
      });

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
        "Institution": `${inst.name} - SUBTOTAL`,
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
      { wch: 7 }, { wch: 38 }, { wch: 20 }, { wch: 14 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 8 }
    ];
    xlsx.utils.book_append_sheet(wb, wsAll, "All Institutions Combined");

    // --- Sheet per institution ---
    for (const inst of institutions) {
      const rows = instResultMap[inst.id] || [];
      if (rows.length === 0) continue;

      const sorted = [...rows].sort((a, b) => {
        if (a.programCode < b.programCode) return -1;
        if (a.programCode > b.programCode) return 1;
        return a.rank - b.rank;
      });

      const totals = instTotals[inst.id] || { individual: 0, general: 0, grand: 0 };

      const sheetRows = sorted.map((row, i) => ({
        "Sl No": i + 1,
        "Program Code": row.programCode,
        "Program Name": row.programName,
        "Category": row.category,
        "Type": row.programType,
        "Place (Rank)": row.rank === 1 ? "1st" : row.rank === 2 ? "2nd" : "3rd",
        "Grade": row.grade,
        "Marks": row.marks ?? "",
        "Points": row.points ?? 0
      }));

      sheetRows.push({} as any);
      sheetRows.push({
        "Sl No": "" as any,
        "Program Code": "" as any,
        "Program Name": "TOTAL POINTS" as any,
        "Category": "" as any,
        "Type": "" as any,
        "Place (Rank)": "" as any,
        "Grade": `Individual: ${totals.individual} | General: ${totals.general}` as any,
        "Marks": "" as any,
        "Points": totals.grand
      });

      const wsInst = xlsx.utils.json_to_sheet(sheetRows);
      wsInst["!cols"] = [
        { wch: 6 }, { wch: 14 }, { wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }
      ];

      // Sheet name max 31 chars, no special chars
      const sheetName = inst.name.replace(/[^a-zA-Z0-9\s\-]/g, "").substring(0, 28).trim() || `Inst_${inst.id.substring(0, 6)}`;
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
