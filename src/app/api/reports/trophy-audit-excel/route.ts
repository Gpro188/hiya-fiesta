import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || "90b65b91-0f9e-4e91-9c4c-af2ca90cee27";
    const childEventId = "c1bb351f-c165-4270-9b51-b4a2069ff4c2";

    const targetEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, zoneId: true, parentId: true, zone: { select: { id: true, name: true } } }
    });

    if (!targetEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Use the event's own zoneId — never fall back to a hardcoded zone
    const zoneId = searchParams.get("zoneId") || targetEvent.zoneId || null;
    if (!zoneId) {
      return NextResponse.json({ error: "Could not determine zone for this event." }, { status: 400 });
    }

    // 1. Fetch published rank 1-3 results
    const results = await prisma.result.findMany({
      where: {
        isPublished: true,
        rank: { in: [1, 2, 3] },
        OR: [
          { team: { eventId: targetEvent.id } },
          { candidate: { team: { eventId: targetEvent.id } } }
        ]
      },
      include: {
        program: { include: { category: true } },
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
        { program: { name: "asc" } },
        { rank: "asc" }
      ]
    });

    // 2. Fetch all candidates in zone for general participants sheet
    const allZoneCandidates = await prisma.candidate.findMany({
      where: {
        institution: { zoneId }
      },
      include: {
        institution: true,
        programs: {
          include: { program: true }
        }
      },
      orderBy: [
        { institution: { name: "asc" } },
        { chestNumber: "asc" }
      ]
    });

    let total1st = 0;
    let total2nd = 0;
    let total3rd = 0;

    const instMap: Record<string, { institution: string; place: string; r1: number; r2: number; r3: number; totalTrophies: number; totalCerts: number }> = {};
    const catMap: Record<string, { name: string; r1: number; r2: number; r3: number; total: number }> = {
      FADHILA: { name: "FADHILA", r1: 0, r2: 0, r3: 0, total: 0 },
      FADHEELA: { name: "FADHEELA", r1: 0, r2: 0, r3: 0, total: 0 },
      GENERAL: { name: "GENERAL (Excl. Magazine)", r1: 0, r2: 0, r3: 0, total: 0 }
    };

    const studentWinners: any[] = [];
    const programGazette: any[] = [];
    const generalTeamsRoster: any[] = [];
    const magazineResults: any[] = [];

    const addStat = (instName: string, instPlace: string, catKey: string, rank: number) => {
      if (!instMap[instName]) {
        instMap[instName] = { institution: instName, place: instPlace, r1: 0, r2: 0, r3: 0, totalTrophies: 0, totalCerts: 0 };
      }
      if (rank === 1) { total1st++; instMap[instName].r1++; catMap[catKey].r1++; }
      else if (rank === 2) { total2nd++; instMap[instName].r2++; catMap[catKey].r2++; }
      else if (rank === 3) { total3rd++; instMap[instName].r3++; catMap[catKey].r3++; }

      instMap[instName].totalTrophies++;
      instMap[instName].totalCerts++;
      catMap[catKey].total++;
    };

    for (const r of results) {
      const prog = r.program;
      const isMag = (prog.name || "").toLowerCase().includes("magazine") || prog.programCode === "43";
      const rank = r.rank;
      if (!rank) continue;
      const grade = r.grade || "-";
      const catName = prog.category?.name?.toUpperCase() || "GENERAL";
      const catKey = catName.includes("FADHEELA") ? "FADHEELA" : catName.includes("FADHILA") ? "FADHILA" : "GENERAL";

      if (isMag) {
        const team = r.team;
        const instName = team?.institution?.name || team?.name || "Institution";
        const instPlace = team?.institution?.place || "";
        magazineResults.push({
          "Program Code": prog.programCode || "43",
          "Program Name": prog.name,
          Rank: rank,
          "Winning Institution": instName,
          Place: instPlace,
          Grade: grade,
          Marks: r.marks,
          Points: r.points,
          "Personal Trophies": 0,
          "Personal Certificates": 0,
          "Status / Note": "Institution Publication Award Only - No student trophies or certificates"
        });

        programGazette.push({
          "Program Code": prog.programCode || "43",
          "Program Name": prog.name,
          Category: "GENERAL",
          "Program Type": "General (Magazine)",
          Rank: rank,
          "Winner Name": instName,
          "Chest / Team Code": team?.prefixCode || team?.magazineCode || "-",
          Institution: instName,
          Grade: grade,
          Marks: r.marks,
          Points: r.points,
          "Student Count": 0,
          "Personal Trophies Awarded": 0,
          Note: "Magazine is Institution Award Only - No personal trophy/cert"
        });
        continue;
      }

      if (r.candidateId && r.candidate) {
        const c = r.candidate;
        const instName = c.institution?.name || c.team?.institution?.name || c.team?.name || "Institution";
        const instPlace = c.institution?.place || c.team?.institution?.place || "";

        addStat(instName, instPlace, catKey, rank);

        const trophyDesc = rank === 1 ? "1st Place Trophy" : rank === 2 ? "2nd Place Trophy" : "3rd Place Trophy";
        const certDesc = rank === 1 ? "1st Place Merit Certificate" : rank === 2 ? "2nd Place Merit Certificate" : "3rd Place Merit Certificate";

        studentWinners.push({
          "Sl No": studentWinners.length + 1,
          "Chest Number": c.chestNumber || "",
          "Candidate Name": c.name,
          Institution: instName,
          Place: instPlace,
          Category: catName,
          "Program Code": prog.programCode || "",
          "Program Name": prog.name,
          "Program Type": "Individual",
          Rank: rank,
          Grade: grade,
          Marks: r.marks,
          Points: r.points,
          "Trophy Awarded": trophyDesc,
          "Certificate Awarded": certDesc
        });

        programGazette.push({
          "Program Code": prog.programCode || "",
          "Program Name": prog.name,
          Category: catName,
          "Program Type": "Individual",
          Rank: rank,
          "Winner Name": c.name,
          "Chest / Team Code": c.chestNumber || "-",
          Institution: instName,
          Grade: grade,
          Marks: r.marks,
          Points: r.points,
          "Student Count": 1,
          "Personal Trophies Awarded": 1,
          Note: "Individual Winner"
        });

      } else if (r.teamId && r.team) {
        const team = r.team;
        const instName = team.institution?.name || team.name || "Institution";
        const instPlace = team.institution?.place || "";

        const assigns = await prisma.programAssignment.findMany({
          where: {
            program: { programCode: prog.programCode },
            candidate: {
              OR: [
                { teamId: team.id },
                { institutionId: team.institutionId },
                { team: { institutionId: team.institutionId } }
              ]
            }
          },
          include: { candidate: true },
          orderBy: [
            { candidate: { chestNumber: "asc" } },
            { candidate: { name: "asc" } }
          ]
        });

        const seen = new Set<string>();
        const uniqueCand: any[] = [];
        for (const a of assigns) {
          if (!seen.has(a.candidate.id)) {
            seen.add(a.candidate.id);
            uniqueCand.push(a.candidate);
          }
        }

        const trophyDesc = rank === 1 ? "1st Place Trophy" : rank === 2 ? "2nd Place Trophy" : "3rd Place Trophy";
        const certDesc = rank === 1 ? "1st Place Merit Certificate" : rank === 2 ? "2nd Place Merit Certificate" : "3rd Place Merit Certificate";

        for (const c of uniqueCand) {
          addStat(instName, instPlace, "GENERAL", rank);

          studentWinners.push({
            "Sl No": studentWinners.length + 1,
            "Chest Number": c.chestNumber || "",
            "Candidate Name": c.name,
            Institution: instName,
            Place: instPlace,
            Category: "GENERAL",
            "Program Code": prog.programCode || "",
            "Program Name": prog.name,
            "Program Type": "General / Group",
            Rank: rank,
            Grade: grade,
            Marks: r.marks,
            Points: r.points,
            "Trophy Awarded": trophyDesc,
            "Certificate Awarded": certDesc
          });

          generalTeamsRoster.push({
            "Program Code": prog.programCode || "",
            "Program Name": prog.name,
            Rank: rank,
            "Institution / Team": instName,
            Place: instPlace,
            "Candidate Chest No": c.chestNumber || "",
            "Candidate Name": c.name,
            Grade: grade,
            "Trophy Awarded": trophyDesc,
            "Certificate Awarded": certDesc
          });
        }

        programGazette.push({
          "Program Code": prog.programCode || "",
          "Program Name": prog.name,
          Category: "GENERAL",
          "Program Type": "General / Group",
          Rank: rank,
          "Winner Name": instName,
          "Chest / Team Code": team.prefixCode || "-",
          Institution: instName,
          Grade: grade,
          Marks: r.marks,
          Points: r.points,
          "Student Count": uniqueCand.length,
          "Personal Trophies Awarded": uniqueCand.length,
          Note: `General Program - All ${uniqueCand.length} participating students awarded individual trophies & certificates`
        });
      }
    }

    // Build Summary
    const summaryRows: any[] = [
      { A: `CSWC HIYA FIESTA 2026 - ${(targetEvent?.zone?.name || targetEvent?.name || "ZONE").toUpperCase()} FINAL` },
      { A: "OFFICIAL TROPHY & MERIT CERTIFICATE AUDIT REPORT" },
      { A: `Generated: ${new Date().toLocaleString("en-IN")}` },
      {},
      { A: "1. GRAND TOTAL REQUIREMENTS (EXCLUDING MAGAZINE)" },
      { A: "Award Item", B: "Count Required", C: "Description" },
      { A: "🥇 1st Place Trophies", B: total1st, C: "Individual winners + all group participants of 1st place teams" },
      { A: "🥈 2nd Place Trophies", B: total2nd, C: "Individual winners + all group participants of 2nd place teams" },
      { A: "🥉 3rd Place Trophies", B: total3rd, C: "Individual winners + all group participants of 3rd place teams" },
      { A: "🏆 GRAND TOTAL PERSONAL TROPHIES", B: total1st + total2nd + total3rd, C: "Total individual trophies for students" },
      { A: "📜 GRAND TOTAL MERIT CERTIFICATES", B: total1st + total2nd + total3rd, C: "Total merit certificates for students" },
      { A: "📋 TOTAL STUDENT WINNER AWARDS", B: studentWinners.length, C: "Total student winner rows in master sheet" },
      { A: "📰 Magazine Entries (Code 43)", B: magazineResults.length, C: "Institution awards only (No personal student trophies/certs)" },
      {},
      { A: "2. INSTITUTION-WISE TROPHY & CERTIFICATE BREAKDOWN" },
      { A: "Sl No", B: "Institution Name", C: "Place", D: "1st Trophies", E: "2nd Trophies", F: "3rd Trophies", G: "Total Trophies Needed", H: "Total Certificates Needed" }
    ];

    let instSl = 1;
    const sortedInsts = Object.values(instMap).sort((a, b) => b.totalTrophies - a.totalTrophies);
    for (const inst of sortedInsts) {
      summaryRows.push({
        A: instSl++,
        B: inst.institution,
        C: inst.place,
        D: inst.r1,
        E: inst.r2,
        F: inst.r3,
        G: inst.totalTrophies,
        H: inst.totalCerts
      });
    }

    summaryRows.push({
      A: "TOTAL",
      B: "ALL INSTITUTIONS",
      C: "-",
      D: total1st,
      E: total2nd,
      F: total3rd,
      G: total1st + total2nd + total3rd,
      H: total1st + total2nd + total3rd
    });

    summaryRows.push({});
    summaryRows.push({ A: "3. CATEGORY-WISE DISTRIBUTION" });
    summaryRows.push({ A: "Category", B: "1st Place", C: "2nd Place", D: "3rd Place", E: "Total Trophies & Certificates" });
    for (const cat of Object.values(catMap)) {
      summaryRows.push({
        A: cat.name,
        B: cat.r1,
        C: cat.r2,
        D: cat.r3,
        E: cat.total
      });
    }

    summaryRows.push({
      A: "TOTAL",
      B: total1st,
      C: total2nd,
      D: total3rd,
      E: total1st + total2nd + total3rd
    });

    const participantsSheetData = allZoneCandidates.map((cand, idx) => ({
      "Sl No": idx + 1,
      "Chest Number": cand.chestNumber || "",
      "Student Name": cand.name,
      Institution: cand.institution?.name || "",
      Place: cand.institution?.place || "",
      "Assigned Programs Count": cand.programs?.length || 0,
      "Assigned Programs": cand.programs?.map(a => `${a.program.programCode} - ${a.program.name}`).join(", ") || ""
    }));

    const wb = xlsx.utils.book_new();

    const wsSummary = xlsx.utils.json_to_sheet(summaryRows, { skipHeader: true });
    wsSummary["!cols"] = [{ wch: 35 }, { wch: 45 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 24 }];
    xlsx.utils.book_append_sheet(wb, wsSummary, "Trophy & Cert Summary");

    const wsWinners = xlsx.utils.json_to_sheet(studentWinners);
    wsWinners["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 28 }, { wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 28 }];
    xlsx.utils.book_append_sheet(wb, wsWinners, "All Student Winners (152)");

    const wsGazette = xlsx.utils.json_to_sheet(programGazette);
    wsGazette["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 32 }, { wch: 16 }, { wch: 35 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 25 }, { wch: 50 }];
    xlsx.utils.book_append_sheet(wb, wsGazette, "Program-wise Results");

    const wsGeneralRoster = xlsx.utils.json_to_sheet(generalTeamsRoster);
    wsGeneralRoster["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 8 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 28 }, { wch: 8 }, { wch: 20 }, { wch: 28 }];
    xlsx.utils.book_append_sheet(wb, wsGeneralRoster, "General Group Students");

    const wsMag = xlsx.utils.json_to_sheet(magazineResults);
    wsMag["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 35 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 22 }, { wch: 60 }];
    xlsx.utils.book_append_sheet(wb, wsMag, "Magazine (Exempted)");

    const wsAllParticipants = xlsx.utils.json_to_sheet(participantsSheetData);
    wsAllParticipants["!cols"] = [{ wch: 8 }, { wch: 14 }, { wch: 28 }, { wch: 35 }, { wch: 18 }, { wch: 24 }, { wch: 60 }];
    xlsx.utils.book_append_sheet(wb, wsAllParticipants, "All Zone Participants");

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    const safeName = targetEvent?.name ? targetEvent.name.replace(/[^a-zA-Z0-9_-]/g, "_") : "Zone";
    const filename = `${safeName}_Final_Results_Trophies_Certificates.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache"
      }
    });
  } catch (error: any) {
    console.error("Error generating trophy audit excel:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Excel" }, { status: 500 });
  }
}
