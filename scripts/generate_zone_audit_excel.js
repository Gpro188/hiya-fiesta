const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateExcel() {
  console.log('Fetching Thrissur Zone results from database...');

  const eventId = '90b65b91-0f9e-4e91-9c4c-af2ca90cee27';
  const childEventId = 'c1bb351f-c165-4270-9b51-b4a2069ff4c2';
  const zoneId = '274203a7-aa36-4ea1-881e-0d0623f40eba';

  // 1. Fetch published rank 1-3 results
  const results = await prisma.result.findMany({
    where: {
      isPublished: true,
      rank: { in: [1, 2, 3] },
      program: {
        OR: [
          { eventId },
          { eventId: childEventId },
          { event: { parentId: eventId } }
        ]
      }
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
      { program: { programCode: 'asc' } },
      { program: { name: 'asc' } },
      { rank: 'asc' }
    ]
  });

  console.log(`Found ${results.length} total published result records.`);

  // 2. Fetch all candidates in Thrissur zone for general participant sheet
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
      { institution: { name: 'asc' } },
      { chestNumber: 'asc' }
    ]
  });

  // Track stats
  let total1st = 0;
  let total2nd = 0;
  let total3rd = 0;

  const instMap = {};
  const catMap = {
    'FADHILA': { name: 'FADHILA', r1: 0, r2: 0, r3: 0, total: 0 },
    'FADHEELA': { name: 'FADHEELA', r1: 0, r2: 0, r3: 0, total: 0 },
    'GENERAL': { name: 'GENERAL (Excl. Magazine)', r1: 0, r2: 0, r3: 0, total: 0 }
  };

  const studentWinners = [];
  const programGazette = [];
  const generalTeamsRoster = [];
  const magazineResults = [];

  const addStat = (instName, instPlace, catKey, rank) => {
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
    const isMag = (prog.name || '').toLowerCase().includes('magazine') || prog.programCode === '43';
    const rank = r.rank;
    const grade = r.grade || '-';
    const catName = prog.category?.name?.toUpperCase() || (prog.type === 'GENERAL' ? 'GENERAL' : 'GENERAL');
    const catKey = catName.includes('FADHEELA') ? 'FADHEELA' : catName.includes('FADHILA') ? 'FADHILA' : 'GENERAL';

    if (isMag) {
      const team = r.team;
      const instName = team?.institution?.name || team?.name || 'Institution';
      const instPlace = team?.institution?.place || '';
      magazineResults.push({
        'Program Code': prog.programCode || '43',
        'Program Name': prog.name,
        'Rank': rank,
        'Winning Institution': instName,
        'Place': instPlace,
        'Grade': grade,
        'Marks': r.marks,
        'Points': r.points,
        'Personal Trophies': 0,
        'Personal Certificates': 0,
        'Status / Note': 'Institution Publication Award Only - No student trophies or certificates'
      });

      programGazette.push({
        'Program Code': prog.programCode || '43',
        'Program Name': prog.name,
        'Category': 'GENERAL',
        'Program Type': 'General (Magazine)',
        'Rank': rank,
        'Winner Name': instName,
        'Chest / Team Code': team?.prefixCode || team?.magazineCode || '-',
        'Institution': instName,
        'Grade': grade,
        'Marks': r.marks,
        'Points': r.points,
        'Student Count': 0,
        'Personal Trophies Awarded': 0,
        'Note': 'Magazine is Institution Award Only - No personal trophy/cert'
      });
      continue;
    }

    if (r.candidateId && r.candidate) {
      const c = r.candidate;
      const instName = c.institution?.name || c.team?.institution?.name || c.team?.name || 'Institution';
      const instPlace = c.institution?.place || c.team?.institution?.place || '';

      addStat(instName, instPlace, catKey, rank);

      const trophyDesc = rank === 1 ? '1st Place Trophy' : rank === 2 ? '2nd Place Trophy' : '3rd Place Trophy';
      const certDesc = rank === 1 ? '1st Place Merit Certificate' : rank === 2 ? '2nd Place Merit Certificate' : '3rd Place Merit Certificate';

      studentWinners.push({
        'Sl No': studentWinners.length + 1,
        'Chest Number': c.chestNumber || '',
        'Candidate Name': c.name,
        'Institution': instName,
        'Place': instPlace,
        'Category': catName,
        'Program Code': prog.programCode || '',
        'Program Name': prog.name,
        'Program Type': 'Individual',
        'Rank': rank,
        'Grade': grade,
        'Marks': r.marks,
        'Points': r.points,
        'Trophy Awarded': trophyDesc,
        'Certificate Awarded': certDesc
      });

      programGazette.push({
        'Program Code': prog.programCode || '',
        'Program Name': prog.name,
        'Category': catName,
        'Program Type': 'Individual',
        'Rank': rank,
        'Winner Name': c.name,
        'Chest / Team Code': c.chestNumber || '-',
        'Institution': instName,
        'Grade': grade,
        'Marks': r.marks,
        'Points': r.points,
        'Student Count': 1,
        'Personal Trophies Awarded': 1,
        'Note': 'Individual Winner'
      });

    } else if (r.teamId && r.team) {
      const team = r.team;
      const instName = team.institution?.name || team.name || 'Institution';
      const instPlace = team.institution?.place || '';

      // Find participating students
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
          { candidate: { chestNumber: 'asc' } },
          { candidate: { name: 'asc' } }
        ]
      });

      const seen = new Set();
      const uniqueCand = [];
      for (const a of assigns) {
        if (!seen.has(a.candidate.id)) {
          seen.add(a.candidate.id);
          uniqueCand.push(a.candidate);
        }
      }

      const trophyDesc = rank === 1 ? '1st Place Trophy' : rank === 2 ? '2nd Place Trophy' : '3rd Place Trophy';
      const certDesc = rank === 1 ? '1st Place Merit Certificate' : rank === 2 ? '2nd Place Merit Certificate' : '3rd Place Merit Certificate';

      for (const c of uniqueCand) {
        addStat(instName, instPlace, 'GENERAL', rank);

        studentWinners.push({
          'Sl No': studentWinners.length + 1,
          'Chest Number': c.chestNumber || '',
          'Candidate Name': c.name,
          'Institution': instName,
          'Place': instPlace,
          'Category': 'GENERAL',
          'Program Code': prog.programCode || '',
          'Program Name': prog.name,
          'Program Type': 'General / Group',
          'Rank': rank,
          'Grade': grade,
          'Marks': r.marks,
          'Points': r.points,
          'Trophy Awarded': trophyDesc,
          'Certificate Awarded': certDesc
        });

        generalTeamsRoster.push({
          'Program Code': prog.programCode || '',
          'Program Name': prog.name,
          'Rank': rank,
          'Institution / Team': instName,
          'Place': instPlace,
          'Candidate Chest No': c.chestNumber || '',
          'Candidate Name': c.name,
          'Grade': grade,
          'Trophy Awarded': trophyDesc,
          'Certificate Awarded': certDesc
        });
      }

      programGazette.push({
        'Program Code': prog.programCode || '',
        'Program Name': prog.name,
        'Category': 'GENERAL',
        'Program Type': 'General / Group',
        'Rank': rank,
        'Winner Name': instName,
        'Chest / Team Code': team.prefixCode || '-',
        'Institution': instName,
        'Grade': grade,
        'Marks': r.marks,
        'Points': r.points,
        'Student Count': uniqueCand.length,
        'Personal Trophies Awarded': uniqueCand.length,
        'Note': `General Program - All ${uniqueCand.length} participating students awarded individual trophies & certificates`
      });
    }
  }

  // Build Summary Sheet Data
  const summaryRows = [
    { 'A': 'CSWC HIYA FIESTA 2026 - THRISSUR ZONE FINAL' },
    { 'A': 'OFFICIAL TROPHY & MERIT CERTIFICATE AUDIT REPORT' },
    { 'A': `Generated: ${new Date().toLocaleString('en-IN')}` },
    {},
    { 'A': '1. GRAND TOTAL REQUIREMENTS (EXCLUDING MAGAZINE)' },
    { 'A': 'Award Item', 'B': 'Count Required', 'C': 'Description' },
    { 'A': '🥇 1st Place Trophies', 'B': total1st, 'C': 'Individual winners + all group participants of 1st place teams' },
    { 'A': '🥈 2nd Place Trophies', 'B': total2nd, 'C': 'Individual winners + all group participants of 2nd place teams' },
    { 'A': '🥉 3rd Place Trophies', 'B': total3rd, 'C': 'Individual winners + all group participants of 3rd place teams' },
    { 'A': '🏆 GRAND TOTAL PERSONAL TROPHIES', 'B': total1st + total2nd + total3rd, 'C': 'Total individual trophies for students' },
    { 'A': '📜 GRAND TOTAL MERIT CERTIFICATES', 'B': total1st + total2nd + total3rd, 'C': 'Total merit certificates for students' },
    { 'A': '📋 TOTAL STUDENT WINNER AWARDS', 'B': studentWinners.length, 'C': 'Total student winner rows in master sheet' },
    { 'A': '📰 Magazine Entries (Code 43)', 'B': magazineResults.length, 'C': 'Institution awards only (No personal student trophies/certs)' },
    {},
    { 'A': '2. INSTITUTION-WISE TROPHY & CERTIFICATE BREAKDOWN' },
    { 'A': 'Sl No', 'B': 'Institution Name', 'C': 'Place', 'D': '1st Trophies', 'E': '2nd Trophies', 'F': '3rd Trophies', 'G': 'Total Trophies Needed', 'H': 'Total Certificates Needed' }
  ];

  let instSl = 1;
  const sortedInsts = Object.values(instMap).sort((a, b) => b.totalTrophies - a.totalTrophies);
  for (const inst of sortedInsts) {
    summaryRows.push({
      'A': instSl++,
      'B': inst.institution,
      'C': inst.place,
      'D': inst.r1,
      'E': inst.r2,
      'F': inst.r3,
      'G': inst.totalTrophies,
      'H': inst.totalCerts
    });
  }

  summaryRows.push({
    'A': 'TOTAL',
    'B': 'ALL INSTITUTIONS',
    'C': '-',
    'D': total1st,
    'E': total2nd,
    'F': total3rd,
    'G': total1st + total2nd + total3rd,
    'H': total1st + total2nd + total3rd
  });

  summaryRows.push({});
  summaryRows.push({ 'A': '3. CATEGORY-WISE DISTRIBUTION' });
  summaryRows.push({ 'A': 'Category', 'B': '1st Place', 'C': '2nd Place', 'D': '3rd Place', 'E': 'Total Trophies & Certificates' });
  for (const cat of Object.values(catMap)) {
    summaryRows.push({
      'A': cat.name,
      'B': cat.r1,
      'C': cat.r2,
      'D': cat.r3,
      'E': cat.total
    });
  }

  summaryRows.push({
    'A': 'TOTAL',
    'B': total1st,
    'C': total2nd,
    'D': total3rd,
    'E': total1st + total2nd + total3rd
  });

  // Build All Zone Participants Sheet Data
  const participantsSheetData = allZoneCandidates.map((cand, idx) => ({
    'Sl No': idx + 1,
    'Chest Number': cand.chestNumber || '',
    'Student Name': cand.name,
    'Institution': cand.institution?.name || '',
    'Place': cand.institution?.place || '',
    'Assigned Programs Count': cand.programs?.length || 0,
    'Assigned Programs': cand.programs?.map(a => `${a.program.programCode} - ${a.program.name}`).join(', ') || ''
  }));

  // Create Workbook
  const wb = xlsx.utils.book_new();

  // Sheet 1: Summary & Audit
  const wsSummary = xlsx.utils.json_to_sheet(summaryRows, { skipHeader: true });
  wsSummary['!cols'] = [
    { wch: 35 },
    { wch: 45 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 22 },
    { wch: 24 }
  ];
  xlsx.utils.book_append_sheet(wb, wsSummary, 'Trophy & Cert Summary');

  // Sheet 2: All Student Winners
  const wsWinners = xlsx.utils.json_to_sheet(studentWinners);
  wsWinners['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 12 }, // Chest
    { wch: 28 }, // Name
    { wch: 35 }, // Inst
    { wch: 18 }, // Place
    { wch: 12 }, // Cat
    { wch: 14 }, // Code
    { wch: 32 }, // Prog Name
    { wch: 18 }, // Type
    { wch: 8 },  // Rank
    { wch: 8 },  // Grade
    { wch: 8 },  // Marks
    { wch: 8 },  // Points
    { wch: 20 }, // Trophy
    { wch: 28 }  // Cert
  ];
  xlsx.utils.book_append_sheet(wb, wsWinners, 'All Student Winners (152)');

  // Sheet 3: Program-wise Gazette
  const wsGazette = xlsx.utils.json_to_sheet(programGazette);
  wsGazette['!cols'] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 14 },
    { wch: 20 },
    { wch: 8 },
    { wch: 32 },
    { wch: 16 },
    { wch: 35 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 25 },
    { wch: 50 }
  ];
  xlsx.utils.book_append_sheet(wb, wsGazette, 'Program-wise Results');

  // Sheet 4: General Programs Students Roster
  const wsGeneralRoster = xlsx.utils.json_to_sheet(generalTeamsRoster);
  wsGeneralRoster['!cols'] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 8 },
    { wch: 35 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 8 },
    { wch: 20 },
    { wch: 28 }
  ];
  xlsx.utils.book_append_sheet(wb, wsGeneralRoster, 'General Group Students');

  // Sheet 5: Magazine Results (Institution only)
  const wsMag = xlsx.utils.json_to_sheet(magazineResults);
  wsMag['!cols'] = [
    { wch: 14 },
    { wch: 20 },
    { wch: 8 },
    { wch: 35 },
    { wch: 18 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 18 },
    { wch: 22 },
    { wch: 60 }
  ];
  xlsx.utils.book_append_sheet(wb, wsMag, 'Magazine (Exempted)');

  // Sheet 6: All Registered Zone Candidates
  const wsAllParticipants = xlsx.utils.json_to_sheet(participantsSheetData);
  wsAllParticipants['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 28 },
    { wch: 35 },
    { wch: 18 },
    { wch: 24 },
    { wch: 60 }
  ];
  xlsx.utils.book_append_sheet(wb, wsAllParticipants, 'All Zone Participants');

  // Ensure directories exist
  const rootPath = path.resolve('c:/Users/user/Desktop/cswc-hiya-fiesta-2026');
  const downloadsDir = path.join(rootPath, 'public', 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const fileName = 'Thrissur_Zone_Final_Results_Trophies_Certificates.xlsx';
  const destPublicDownloads = path.join(downloadsDir, fileName);
  const destPublicRoot = path.join(rootPath, 'public', fileName);
  const destWorkspaceRoot = path.join(rootPath, fileName);

  xlsx.writeFile(wb, destPublicDownloads);
  xlsx.writeFile(wb, destPublicRoot);
  xlsx.writeFile(wb, destWorkspaceRoot);

  console.log(`\n Successfully generated Excel audit file:`);
  console.log(`- ${destPublicDownloads}`);
  console.log(`- ${destPublicRoot}`);
  console.log(`- ${destWorkspaceRoot}`);
  console.log(`\nAudit Summary:`);
  console.log(`🥇 1st Place Trophies: ${total1st}`);
  console.log(`🥈 2nd Place Trophies: ${total2nd}`);
  console.log(`🥉 3rd Place Trophies: ${total3rd}`);
  console.log(`🏆 GRAND TOTAL TROPHIES (Excl. Magazine): ${total1st + total2nd + total3rd}`);
  console.log(`📜 GRAND TOTAL CERTIFICATES (Excl. Magazine): ${total1st + total2nd + total3rd}`);
  console.log(`📋 Total Student Winner Rows: ${studentWinners.length}`);
}

generateExcel().catch(console.error).finally(() => prisma.$disconnect());
