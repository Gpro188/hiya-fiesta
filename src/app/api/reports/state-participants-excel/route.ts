import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const stateEvent = await prisma.event.findFirst({
      where: { type: "STATE" },
      include: { parent: true },
    });

    const pgEvent = await prisma.event.findFirst({
      where: { name: { contains: "PG", mode: "insensitive" } },
    });

    if (!stateEvent) {
      return NextResponse.json({ error: "State event not found" }, { status: 404 });
    }

    const stateAssignments = await prisma.programAssignment.findMany({
      where: {
        program: {
          eventId: stateEvent.id,
        },
      },
      include: {
        candidate: {
          include: {
            category: true,
            institution: { include: { zone: true } },
            team: {
              include: {
                institution: { include: { zone: true } },
                event: { include: { zone: true } },
              },
            },
          },
        },
        program: {
          include: { category: true },
        },
      },
      orderBy: [
        { program: { programCode: "asc" } },
        { slotNumber: "asc" },
      ],
    });

    const pgAssignments = pgEvent
      ? await prisma.programAssignment.findMany({
          where: {
            program: {
              eventId: pgEvent.id,
            },
          },
          include: {
            candidate: {
              include: {
                category: true,
                institution: { include: { zone: true } },
                team: {
                  include: {
                    institution: { include: { zone: true } },
                    event: { include: { zone: true } },
                  },
                },
              },
            },
            program: {
              include: { category: true },
            },
          },
          orderBy: [
            { program: { programCode: "asc" } },
            { slotNumber: "asc" },
          ],
        })
      : [];

    const participantMap = new Map<string, any>();
    const zoneMap = new Map<string, any>();

    function processAssignment(a: any, isPg: boolean) {
      const c = a.candidate;
      if (!c) return;

      const instZone = c.institution?.zone || c.team?.institution?.zone;
      const eventZone = c.team?.event?.zone;
      const zoneCode = isPg ? "PG" : (instZone?.code || eventZone?.code || "");
      const zoneNameRaw = isPg ? "FADHEELA PG" : (instZone?.name || eventZone?.name || c.team?.event?.name || "");

      // Exclude Karnataka
      if (zoneCode === "KAR" || zoneNameRaw.toUpperCase().includes("KARNATAKA")) {
        return;
      }

      const zoneName = isPg ? "FADHEELA PG" : (zoneNameRaw.replace(/\s*Zone\s*$/i, "").trim() || "General");
      const inst = c.institution || c.team?.institution;
      const instId = inst?.id || c.institutionId || c.team?.institutionId || "unknown";
      const instName = inst?.name || c.team?.name || "Independent / General";
      const instCode = inst?.code || "";
      const instDistrict = inst?.district || "";

      if (!participantMap.has(c.id)) {
        participantMap.set(c.id, {
          id: c.id,
          name: c.name,
          chestNumber: c.chestNumber || "N/A",
          uid: c.uid || "",
          category: isPg ? "FADHEELA PG" : (c.category?.name || "GENERAL"),
          zoneName,
          zoneCode,
          isPg,
          institutionCode: instCode,
          institutionName: instName,
          institutionDistrict: instDistrict,
          onStageCount: 0,
          offStageCount: 0,
          pgOnStageCount: 0,
          pgOffStageCount: 0,
          needsVenueFacilities: false,
          programs: [],
        });
      }

      const p = participantMap.get(c.id);
      const stageType = a.program.stageType || "ON_STAGE";
      if (!isPg) {
        if (stageType === "ON_STAGE") p.onStageCount++;
        if (stageType === "OFF_STAGE") p.offStageCount++;
      } else {
        if (stageType === "ON_STAGE") p.pgOnStageCount++;
        if (stageType === "OFF_STAGE") p.pgOffStageCount++;
      }

      p.programs.push({
        code: a.program.programCode || "",
        name: a.program.name,
        stageType,
        isPg,
      });

      if (!zoneMap.has(zoneName)) {
        zoneMap.set(zoneName, {
          name: zoneName,
          code: zoneCode,
          isPgZone: isPg,
          candidates: new Set(),
          institutions: new Map(),
          onStage: new Set(),
          offStage: new Set(),
          venueFacilities: new Set(),
          completedOffStageOnly: new Set(),
          totalAssignments: 0,
        });
      }

      const z = zoneMap.get(zoneName);
      z.totalAssignments++;
      z.candidates.add(c.id);

      if (!z.institutions.has(instId)) {
        z.institutions.set(instId, {
          id: instId,
          code: instCode,
          name: instName,
          district: instDistrict,
          candidates: new Set(),
          venueFacilities: new Set(),
          completedOffStageOnly: new Set(),
          assignments: 0,
        });
      }

      const zi = z.institutions.get(instId);
      zi.candidates.add(c.id);
      zi.assignments++;
    }

    stateAssignments.forEach((a) => processAssignment(a, false));
    pgAssignments.forEach((a) => processAssignment(a, true));

    // Update needsVenueFacilities
    for (const p of participantMap.values()) {
      if (p.onStageCount > 0 || p.pgOffStageCount > 0 || p.pgOnStageCount > 0) {
        p.needsVenueFacilities = true;
      } else {
        p.needsVenueFacilities = false;
      }

      const z = zoneMap.get(p.zoneName);
      if (z) {
        if (p.needsVenueFacilities) {
          z.venueFacilities.add(p.id);
        } else {
          z.completedOffStageOnly.add(p.id);
        }

        const zi = z.institutions.get(p.institutionId || "unknown");
        if (zi) {
          if (p.needsVenueFacilities) zi.venueFacilities.add(p.id);
          else zi.completedOffStageOnly.add(p.id);
        }
      }
    }

    // Sheet 1: Zone Facilities Summary
    const zoneRows: any[] = [];
    let grandCand = 0;
    let grandVenueBeds = 0;
    let grandMeals = 0;
    let grandInst = 0;
    let grandOn = 0;
    let grandPg = 0;
    let grandCompletedOffOnly = 0;
    let grandAssign = 0;

    const sortedZones = Array.from(zoneMap.values()).sort((a, b) => {
      if (a.isPgZone && !b.isPgZone) return 1;
      if (!a.isPgZone && b.isPgZone) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const z of sortedZones) {
      const candsCount = z.candidates.size;
      const venueBeds = z.venueFacilities.size;
      const meals = venueBeds * 3;
      const instCount = z.institutions.size;
      const completedOffOnly = z.completedOffStageOnly.size;

      grandCand += candsCount;
      grandVenueBeds += venueBeds;
      grandMeals += meals;
      grandInst += instCount;
      grandCompletedOffOnly += completedOffOnly;
      grandAssign += z.totalAssignments;

      if (!z.isPgZone) {
        grandOn += venueBeds;
      } else {
        grandPg += venueBeds;
      }

      zoneRows.push({
        "Zone Name": z.name,
        "Zone Code": z.code,
        "Colleges Represented": instCount,
        "Venue Beds Required": venueBeds,
        "Estimated Daily Meals": meals,
        "State On-Stage Performers": z.isPgZone ? 0 : venueBeds,
        "Fadheela PG Fest Attendees": z.isPgZone ? venueBeds : 0,
        "Completed Off-Stage Only (No Facilities)": completedOffOnly,
        "Total Registered Candidates": candsCount,
        "Program Assignments": z.totalAssignments,
      });
    }

    zoneRows.push({
      "Zone Name": "GRAND TOTAL (VENUE LOGISTICS)",
      "Zone Code": "ALL",
      "Colleges Represented": grandInst,
      "Venue Beds Required": grandVenueBeds,
      "Estimated Daily Meals": grandMeals,
      "State On-Stage Performers": grandOn,
      "Fadheela PG Fest Attendees": grandPg,
      "Completed Off-Stage Only (No Facilities)": grandCompletedOffOnly,
      "Total Registered Candidates": grandCand,
      "Program Assignments": grandAssign,
    });

    // Sheet 2: State Participants Roster
    const sortedParticipants = Array.from(participantMap.values()).sort((a, b) => {
      if (a.zoneName !== b.zoneName) return a.zoneName.localeCompare(b.zoneName);
      if (a.institutionName !== b.institutionName) return a.institutionName.localeCompare(b.institutionName);
      const chestA = parseInt(a.chestNumber || "99999", 10);
      const chestB = parseInt(b.chestNumber || "99999", 10);
      if (!isNaN(chestA) && !isNaN(chestB) && chestA !== chestB) return chestA - chestB;
      return a.name.localeCompare(b.name);
    });

    const rosterRows = sortedParticipants.map((p, idx) => ({
      "Sl No": idx + 1,
      "Chest No": p.chestNumber,
      "Candidate Name": p.name,
      "UID": p.uid,
      "Category": p.category,
      "Zone": p.zoneName,
      "Venue Facilities Required?": p.needsVenueFacilities
        ? "YES (VENUE BED & MEALS REQUIRED)"
        : "NO (COMPLETED OFF-STAGE ONLY)",
      "College Code": p.institutionCode,
      "College Name": p.institutionName,
      "District": p.institutionDistrict,
      "On-Stage Items Count": p.onStageCount + (p.pgOnStageCount || 0),
      "Off-Stage Items Count": p.offStageCount + (p.pgOffStageCount || 0),
      "Total Programs Count": p.programs.length,
      "Assigned Programs": p.programs
        .map((pr: any) => `[#${pr.code}] ${pr.name} (${pr.stageType}${pr.isPg ? " PG" : ""})`)
        .join("; "),
    }));

    // Sheet 3: Colleges Breakdown
    const collegeRows: any[] = [];
    let collegeSlNo = 1;

    for (const z of sortedZones) {
      for (const inst of Array.from(z.institutions.values()) as any[]) {
        collegeRows.push({
          "Sl No": collegeSlNo++,
          "Zone": z.name,
          "College Code": inst.code,
          "College Name": inst.name,
          "District": inst.district,
          "Venue Beds Required": inst.venueFacilities.size,
          "Completed Off-Stage Only": inst.completedOffStageOnly.size,
          "Total Candidates": inst.candidates.size,
          "Total Assignments": inst.assignments,
        });
      }
    }

    // Build Excel Workbook
    const workbook = xlsx.utils.book_new();

    const wsZone = xlsx.utils.json_to_sheet(zoneRows);
    wsZone["!cols"] = [
      { wch: 22 }, // Zone Name
      { wch: 12 }, // Zone Code
      { wch: 20 }, // Colleges
      { wch: 22 }, // Venue Beds Required
      { wch: 20 }, // Daily Meals
      { wch: 24 }, // State On-Stage
      { wch: 26 }, // PG Fest
      { wch: 34 }, // Completed Off-Stage Only
      { wch: 24 }, // Total Registered
      { wch: 20 }, // Assignments
    ];
    xlsx.utils.book_append_sheet(workbook, wsZone, "Zone Facilities Summary");

    const wsRoster = xlsx.utils.json_to_sheet(rosterRows);
    wsRoster["!cols"] = [
      { wch: 8 },  // Sl No
      { wch: 12 }, // Chest No
      { wch: 28 }, // Candidate Name
      { wch: 12 }, // UID
      { wch: 16 }, // Category
      { wch: 18 }, // Zone
      { wch: 34 }, // Facilities Required?
      { wch: 14 }, // College Code
      { wch: 36 }, // College Name
      { wch: 16 }, // District
      { wch: 18 }, // On-Stage Items
      { wch: 18 }, // Off-Stage Items
      { wch: 18 }, // Total Programs
      { wch: 50 }, // Assigned Programs
    ];
    xlsx.utils.book_append_sheet(workbook, wsRoster, "State Participants Roster");

    const wsColleges = xlsx.utils.json_to_sheet(collegeRows);
    wsColleges["!cols"] = [
      { wch: 8 },  // Sl No
      { wch: 18 }, // Zone
      { wch: 14 }, // College Code
      { wch: 38 }, // College Name
      { wch: 16 }, // District
      { wch: 20 }, // Venue Beds Required
      { wch: 24 }, // Completed Off-Stage Only
      { wch: 16 }, // Total Candidates
      { wch: 18 }, // Total Assignments
    ];
    xlsx.utils.book_append_sheet(workbook, wsColleges, "Colleges Breakdown");

    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    const timestamp = new Date().toISOString().split("T")[0];
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="State_Venue_Facilities_Logistics_Summary_${timestamp}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Error generating State Participants Excel:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: error.message },
      { status: 500 }
    );
  }
}
