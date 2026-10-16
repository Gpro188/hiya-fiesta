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

    if (!stateEvent) {
      return NextResponse.json({ error: "State event not found" }, { status: 404 });
    }

    const assignments = await prisma.programAssignment.findMany({
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

    const participantMap = new Map<string, any>();
    const zoneMap = new Map<string, any>();

    for (const a of assignments) {
      const c = a.candidate;
      if (!c) continue;

      const instZone = c.institution?.zone || c.team?.institution?.zone;
      const eventZone = c.team?.event?.zone;
      const zoneCode = instZone?.code || eventZone?.code || "";
      const zoneNameRaw = instZone?.name || eventZone?.name || c.team?.event?.name || "";

      // Exclude Karnataka
      if (zoneCode === "KAR" || zoneNameRaw.toUpperCase().includes("KARNATAKA")) {
        continue;
      }

      const zoneName = zoneNameRaw.replace(/\s*Zone\s*$/i, "").trim() || "General";
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
          category: c.category?.name || "GENERAL",
          zoneName,
          zoneCode,
          institutionCode: instCode,
          institutionName: instName,
          institutionDistrict: instDistrict,
          onStageCount: 0,
          offStageCount: 0,
          programs: [],
        });
      }

      const p = participantMap.get(c.id);
      const stageType = a.program.stageType || "ON_STAGE";
      if (stageType === "ON_STAGE") p.onStageCount++;
      if (stageType === "OFF_STAGE") p.offStageCount++;
      p.programs.push({
        code: a.program.programCode || "",
        name: a.program.name,
        stageType,
      });

      if (!zoneMap.has(zoneName)) {
        zoneMap.set(zoneName, {
          name: zoneName,
          code: zoneCode,
          candidates: new Set(),
          institutions: new Map(),
          onStage: new Set(),
          offStage: new Set(),
          totalAssignments: 0,
        });
      }

      const z = zoneMap.get(zoneName);
      z.totalAssignments++;
      z.candidates.add(c.id);
      if (stageType === "ON_STAGE") z.onStage.add(c.id);
      if (stageType === "OFF_STAGE") z.offStage.add(c.id);

      if (!z.institutions.has(instId)) {
        z.institutions.set(instId, {
          id: instId,
          code: instCode,
          name: instName,
          district: instDistrict,
          candidates: new Set(),
          assignments: 0,
        });
      }

      const zi = z.institutions.get(instId);
      zi.candidates.add(c.id);
      zi.assignments++;
    }

    // Sheet 1: Zone Facilities Summary
    const zoneRows: any[] = [];
    let grandCand = 0;
    let grandInst = 0;
    let grandOn = 0;
    let grandOff = 0;
    let grandAssign = 0;

    const sortedZones = Array.from(zoneMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < sortedZones.length; i++) {
      const z = sortedZones[i];
      const candCount = z.candidates.size;
      const instCount = z.institutions.size;
      const onCount = z.onStage.size;
      const offCount = z.offStage.size;
      const assignCount = z.totalAssignments;

      grandCand += candCount;
      grandInst += instCount;
      grandOn += onCount;
      grandOff += offCount;
      grandAssign += assignCount;

      zoneRows.push({
        "Sl No": i + 1,
        "Zone / District": z.name,
        "Zone Code": z.code,
        "Participating Colleges": instCount,
        "Total Candidates (Headcount)": candCount,
        "On-Stage Performers": onCount,
        "Off-Stage Competitors": offCount,
        "Total Program Entries": assignCount,
        "Accommodation Beds Needed": candCount,
        "Daily Meals (3 meals/day)": candCount * 3,
        "Badges & Kit Bags Required": candCount,
      });
    }

    // Grand total row
    zoneRows.push({
      "Sl No": "TOTAL",
      "Zone / District": "ALL 7 PARTICIPATING ZONES",
      "Zone Code": "ALL",
      "Participating Colleges": grandInst,
      "Total Candidates (Headcount)": grandCand,
      "On-Stage Performers": grandOn,
      "Off-Stage Competitors": grandOff,
      "Total Program Entries": grandAssign,
      "Accommodation Beds Needed": grandCand,
      "Daily Meals (3 meals/day)": grandCand * 3,
      "Badges & Kit Bags Required": grandCand,
    });

    // Sheet 2: Master State Roster
    const sortedParticipants = Array.from(participantMap.values()).sort((a, b) => {
      if (a.zoneName !== b.zoneName) return a.zoneName.localeCompare(b.zoneName);
      if (a.institutionName !== b.institutionName) return a.institutionName.localeCompare(b.institutionName);
      return a.name.localeCompare(b.name);
    });

    const rosterRows = sortedParticipants.map((p, idx) => ({
      "Sl No": idx + 1,
      "Chest No": p.chestNumber,
      "Candidate Name": p.name,
      "UID": p.uid,
      "Category": p.category,
      "Zone": p.zoneName,
      "College Code": p.institutionCode,
      "College Name": p.institutionName,
      "District": p.institutionDistrict,
      "On-Stage Items": p.onStageCount,
      "Off-Stage Items": p.offStageCount,
      "Total Items": p.programs.length,
      "Assigned Programs": p.programs.map((pr: any) => `[#${pr.code}] ${pr.name} (${pr.stageType})`).join("; "),
    }));

    // Sheet 3: Colleges Breakdown
    const collegeRows: any[] = [];
    let cIdx = 1;
    for (const z of sortedZones) {
      for (const inst of Array.from(z.institutions.values())) {
        collegeRows.push({
          "Sl No": cIdx++,
          "Zone": z.name,
          "College Code": (inst as any).code,
          "College Name": (inst as any).name,
          "District": (inst as any).district,
          "Total Candidates": (inst as any).candidates.size,
          "Total Program Entries": (inst as any).assignments,
        });
      }
    }

    // Build workbook
    const wb = xlsx.utils.book_new();

    const ws1 = xlsx.utils.json_to_sheet(zoneRows);
    xlsx.utils.book_append_sheet(wb, ws1, "Zone Facilities Summary");

    const ws2 = xlsx.utils.json_to_sheet(rosterRows);
    xlsx.utils.book_append_sheet(wb, ws2, "State Participants Roster");

    const ws3 = xlsx.utils.json_to_sheet(collegeRows);
    xlsx.utils.book_append_sheet(wb, ws3, "Colleges Breakdown");

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="CSWC_State_Festival_Participants_Facilities_Pack.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate state participants excel:", error);
    return NextResponse.json({ error: error.message || "Failed to generate excel" }, { status: 500 });
  }
}
