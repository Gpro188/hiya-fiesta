import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const stateEvent = await prisma.event.findFirst({
      where: { type: "STATE" },
    });

    const stateAssignments = stateEvent
      ? await prisma.programAssignment.findMany({
          where: { program: { eventId: stateEvent.id } },
          select: { candidateId: true, program: { select: { programCode: true } } },
        })
      : [];

    const stateAssignedSet = new Set(
      stateAssignments.map((a) => `${a.program.programCode}_${a.candidateId}`)
    );
    const stateAssignedCandSet = new Set(
      stateAssignments.map((a) => a.candidateId).filter(Boolean)
    );

    const results = await prisma.result.findMany({
      where: {
        rank: 1,
        isPublished: true,
        OR: [
          { grade: { not: "A" } },
          { grade: null },
        ],
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
            candidates: {
              include: {
                institution: { include: { zone: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { program: { programCode: "asc" } },
      ],
    });

    const rows: any[] = [];
    let slNo = 1;

    for (const r of results) {
      if (r.program?.event?.type === "STATE") continue;

      const isKar =
        r.candidate?.team?.institution?.zone?.code === "KAR" ||
        r.candidate?.institution?.zone?.code === "KAR" ||
        r.team?.institution?.zone?.code === "KAR" ||
        r.program?.event?.zone?.code === "KAR" ||
        (r.program?.event?.zone?.name || "").toUpperCase().includes("KARNATAKA");
      if (isKar) continue;

      const zoneNameRaw =
        r.candidate?.team?.institution?.zone?.name ||
        r.candidate?.team?.event?.zone?.name ||
        r.candidate?.institution?.zone?.name ||
        r.team?.institution?.zone?.name ||
        r.team?.event?.zone?.name ||
        r.program?.event?.zone?.name ||
        r.program?.event?.name ||
        "Unknown Zone";

      const zoneName = zoneNameRaw.replace(/\s*Zone\s*$/i, "").trim() || "General";
      const candidateName = r.candidate?.name || r.team?.name || "Team";
      const chestNo = r.candidate?.chestNumber || r.team?.prefixCode || "-";
      const uid = r.candidate?.uid || "-";

      const inst = r.candidate?.institution || r.candidate?.team?.institution || r.team?.institution;
      const college = inst?.name || "-";
      const collegeCode = inst?.code || "-";
      const district = inst?.district || "-";

      const progCode = r.program?.programCode || "-";
      const progName = r.program?.name || "-";
      const stageType = r.program?.stageType || "ON_STAGE";
      const category = r.program?.category?.name || "GENERAL";

      const targetCandId = r.candidateId || (r.team?.candidates && r.team.candidates[0]?.id) || null;
      const key = `${progCode}_${targetCandId}`;
      const isConfirmed = targetCandId
        ? stateAssignedSet.has(key) || stateAssignedCandSet.has(targetCandId)
        : false;

      const rawGrade = (r.grade || "").toUpperCase().trim();
      const grade = rawGrade === "B" ? "B" : rawGrade === "C" ? "C" : rawGrade || "NO GRADE";

      rows.push({
        "Sl No": slNo++,
        "Zone": zoneName,
        "Program Code": progCode,
        "Program Name": progName,
        "Stage Type": stageType,
        "Category": category,
        "Winner Name": candidateName,
        "Chest No": chestNo,
        "UID": uid,
        "College Code": collegeCode,
        "College Name": college,
        "District": district,
        "Marks": (r as any).marks || (r as any).totalMarks || 0,
        "Grade": grade,
        "State Confirmation Status": isConfirmed ? "CONFIRMED TO STATE" : "PENDING REVIEW",
      });
    }

    rows.sort((a, b) => {
      if (a["Zone"] !== b["Zone"]) return a["Zone"].localeCompare(b["Zone"]);
      return (parseInt(a["Program Code"]) || 0) - (parseInt(b["Program Code"]) || 0);
    });

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);

    const colWidths = [
      { wch: 8 },  // Sl No
      { wch: 18 }, // Zone
      { wch: 14 }, // Program Code
      { wch: 32 }, // Program Name
      { wch: 14 }, // Stage Type
      { wch: 16 }, // Category
      { wch: 28 }, // Winner Name
      { wch: 12 }, // Chest No
      { wch: 12 }, // UID
      { wch: 14 }, // College Code
      { wch: 38 }, // College Name
      { wch: 16 }, // District
      { wch: 10 }, // Marks
      { wch: 12 }, // Grade
      { wch: 28 }, // Status
    ];
    worksheet["!cols"] = colWidths;

    xlsx.utils.book_append_sheet(workbook, worksheet, "1st Place Pending Review");

    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    const timestamp = new Date().toISOString().split("T")[0];
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Zonal_1st_Place_Pending_Review_List_${timestamp}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Error generating Excel report:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel report", details: error.message },
      { status: 500 }
    );
  }
}
