import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const stateEvent = await prisma.event.findFirst({
      where: { type: "STATE" },
    });

    const stateAssignments = await prisma.programAssignment.findMany({
      where: { program: { eventId: stateEvent?.id } },
      select: { candidateId: true, program: { select: { programCode: true } } },
    });

    const stateAssignedSet = new Set(
      stateAssignments.map((a) => `${a.program.programCode}_${a.candidateId}`)
    );
    const stateAssignedCandSet = new Set(
      stateAssignments.map((a) => a.candidateId).filter(Boolean)
    );

    const results = await prisma.result.findMany({
      where: {
        rank: 1,
        grade: "B",
        isPublished: true,
      },
      include: {
        program: {
          include: {
            event: { include: { zone: true } },
            category: true,
          },
        },
        candidate: {
          include: {
            institution: { include: { zone: true } },
            team: {
              include: {
                institution: { include: { zone: true } },
                event: { include: { zone: true } },
              },
            },
          },
        },
        team: {
          include: {
            institution: { include: { zone: true } },
            event: { include: { zone: true } },
          },
        },
      },
      orderBy: [
        { program: { programCode: "asc" } },
      ],
    });

    const rows: any[] = [];
    let sl = 1;

    for (const r of results) {
      const isKar =
        r.candidate?.team?.institution?.zone?.code === "KAR" ||
        r.team?.institution?.zone?.code === "KAR" ||
        r.program?.event?.zone?.code === "KAR";
      if (isKar) continue;

      const zoneName =
        r.candidate?.team?.institution?.zone?.name ||
        r.candidate?.team?.event?.zone?.name ||
        r.team?.institution?.zone?.name ||
        r.team?.event?.zone?.name ||
        r.program?.event?.zone?.name ||
        r.program?.event?.name ||
        "Unknown Zone";

      const zoneCode =
        r.candidate?.team?.institution?.zone?.code ||
        r.candidate?.team?.event?.zone?.code ||
        r.team?.institution?.zone?.code ||
        r.team?.event?.zone?.code ||
        r.program?.event?.zone?.code ||
        "";

      const candidateName = r.candidate?.name || r.team?.name || "Team";
      const chestNo = r.candidate?.chestNumber || "N/A";
      const college =
        r.candidate?.institution?.name ||
        r.candidate?.team?.institution?.name ||
        r.team?.institution?.name ||
        "-";
      const collegeCode =
        r.candidate?.institution?.code ||
        r.candidate?.team?.institution?.code ||
        r.team?.institution?.code ||
        "-";
      const district =
        r.candidate?.institution?.district ||
        r.candidate?.team?.institution?.district ||
        r.team?.institution?.district ||
        "-";

      const progCode = r.program?.programCode || "-";
      const progName = r.program?.name || "-";
      const stageType = r.program?.stageType || "ON_STAGE";
      const category = r.program?.category?.name || "GENERAL";

      const key = `${progCode}_${r.candidateId}`;
      const isConfirmed = r.candidateId
        ? stateAssignedSet.has(key) || stateAssignedCandSet.has(r.candidateId)
        : false;

      rows.push({
        "Sl No": sl++,
        "Zone / District": zoneName.replace(/\s*Zone\s*$/i, ""),
        "Zone Code": zoneCode,
        "Program Code": progCode,
        "Program Name": progName,
        "Stage Type": stageType,
        "Category": category,
        "1st Place Winner": candidateName,
        "Chest No": chestNo,
        "College Code": collegeCode,
        "College Name": college,
        "District": district,
        "Rank": 1,
        "Grade": "B",
        "Marks": r.marks || 0,
        "State Confirmation Status": isConfirmed ? "CONFIRMED TO STATE" : "PENDING CONFIRMATION",
      });
    }

    // Sort by Zone then Program Code
    rows.sort((a, b) => {
      if (a["Zone / District"] !== b["Zone / District"]) {
        return a["Zone / District"].localeCompare(b["Zone / District"]);
      }
      return (parseInt(a["Program Code"]) || 0) - (parseInt(b["Program Code"]) || 0);
    });

    // Re-index Sl No
    rows.forEach((r, idx) => {
      r["Sl No"] = idx + 1;
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, "1st Place Grade B Winners");

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Zonal_1st_Place_Grade_B_Total_List.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("Failed to generate 1st place Grade B excel:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
