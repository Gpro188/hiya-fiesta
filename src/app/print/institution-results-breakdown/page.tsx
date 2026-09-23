import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getPointsConfigForProgram } from "@/app/dashboard/scoring/actions";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function InstitutionResultsBreakdownPage(props: {
  searchParams: Promise<{ teamId?: string; institutionId?: string; eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  let teamId = searchParams.teamId;

  if (!teamId && searchParams.institutionId) {
    const team = await prisma.team.findFirst({
      where: { institutionId: searchParams.institutionId },
      select: { id: true }
    });
    if (team) teamId = team.id;
  }

  if (!teamId) {
    const teams = await prisma.team.findMany({
      where: searchParams.eventId ? { eventId: searchParams.eventId } : {},
      include: { institution: { include: { zone: true } }, event: true },
      orderBy: { name: 'asc' }
    });

    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ color: '#8E0033', marginBottom: '8px' }}>📊 Institution Results &amp; Points Breakdown &mdash; Select Institution</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Select an institution below to view and print their complete itemized results, grades, places, and point tally breakdown.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {teams.map(t => (
            <a
              key={t.id}
              href={`/print/institution-results-breakdown?teamId=${t.id}`}
              style={{
                display: 'block',
                padding: '12px 16px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ fontWeight: 800, color: '#8E0033' }}>{t.institution?.name || t.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Code: {t.institution?.code || t.prefixCode} · Zone: {t.institution?.zone?.name || t.event?.name || 'General'}
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      institution: {
        include: { zone: true }
      },
      event: {
        include: { zone: true, parent: true }
      }
    }
  });

  if (!team) {
    return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>Team / Institution not found.</div>;
  }

  const settings = await getSettings(team.eventId);
  const zoneName = team.institution?.zone?.name || team.event?.zone?.name || team.event?.name || "Zonal Festival";
  const instName = team.institution?.name || team.name;
  const instCode = team.institution?.code || team.prefixCode;

  // Fetch all published results for this institution:
  // 1. Candidate individual results
  // 2. Team group results
  const [candidateResults, teamGroupResults] = await Promise.all([
    prisma.result.findMany({
      where: {
        candidate: { teamId },
        isPublished: true
      },
      include: {
        candidate: {
          include: { category: true, masterStudent: true }
        },
        program: {
          include: { category: true }
        }
      },
      orderBy: [
        { program: { name: 'asc' } },
        { candidate: { chestNumber: 'asc' } }
      ]
    }),
    prisma.result.findMany({
      where: {
        teamId,
        isPublished: true,
        program: { type: { not: "INDIVIDUAL" } }
      },
      include: {
        program: {
          include: { category: true }
        }
      },
      orderBy: {
        program: { name: 'asc' }
      }
    })
  ]);

  // Merge and itemize results
  interface ItemizedResultRow {
    id: string;
    programId: string;
    programCode: string;
    programName: string;
    categoryName: string;
    programType: string;
    stageType: string;
    participantType: "INDIVIDUAL" | "GROUP";
    participantName: string;
    chestNumber: string;
    uid: string;
    marks: number;
    rank: number | null;
    grade: string | null;
    placePoints: number;
    gradePoints: number;
    totalPoints: number;
  }

  // Preload point configs for INDIVIDUAL and GROUP
  const indConfig = await getPointsConfigForProgram("INDIVIDUAL", team.eventId);
  const genConfig = await getPointsConfigForProgram("GROUP", team.eventId);

  const rows: ItemizedResultRow[] = [];

  for (const res of candidateResults) {
    const isIndiv = res.program.type === "INDIVIDUAL";
    const cfg = isIndiv ? indConfig : genConfig;

    let placePts = 0;
    if (res.rank === 1) placePts = cfg.rank1 || 0;
    else if (res.rank === 2) placePts = cfg.rank2 || 0;
    else if (res.rank === 3) placePts = cfg.rank3 || 0;

    let grPts = 0;
    if (res.grade === "A") grPts = cfg.gradeA || 0;
    else if (res.grade === "B") grPts = cfg.gradeB || 0;
    else if (res.grade === "C") grPts = cfg.gradeC || 0;

    // Use stored points if available, otherwise computed
    const totalPts = res.points > 0 ? res.points : (placePts + grPts);

    rows.push({
      id: res.id,
      programId: res.programId,
      programCode: res.program.programCode || "-",
      programName: res.program.name,
      categoryName: res.program.category?.name || res.candidate?.category?.name || "General",
      programType: res.program.type,
      stageType: res.program.stageType || "ON_STAGE",
      participantType: "INDIVIDUAL",
      participantName: res.candidate?.name || "Unknown",
      chestNumber: res.candidate?.chestNumber || "-",
      uid: res.candidate?.uid || res.candidate?.masterStudent?.uid || "-",
      marks: res.marks || 0,
      rank: res.rank,
      grade: res.grade,
      placePoints: placePts,
      gradePoints: grPts,
      totalPoints: totalPts
    });
  }

  for (const res of teamGroupResults) {
    const cfg = genConfig;

    let placePts = 0;
    if (res.rank === 1) placePts = cfg.rank1 || 0;
    else if (res.rank === 2) placePts = cfg.rank2 || 0;
    else if (res.rank === 3) placePts = cfg.rank3 || 0;

    let grPts = 0;
    if (res.grade === "A") grPts = cfg.gradeA || 0;
    else if (res.grade === "B") grPts = cfg.gradeB || 0;
    else if (res.grade === "C") grPts = cfg.gradeC || 0;

    const totalPts = res.points > 0 ? res.points : (placePts + grPts);

    rows.push({
      id: res.id,
      programId: res.programId,
      programCode: res.program.programCode || "-",
      programName: res.program.name,
      categoryName: res.program.category?.name || "General",
      programType: res.program.type || "GROUP",
      stageType: res.program.stageType || "ON_STAGE",
      participantType: "GROUP",
      participantName: `Team ${instName}`,
      chestNumber: `Team (${instCode})`,
      uid: "-",
      marks: res.marks || 0,
      rank: res.rank,
      grade: res.grade,
      placePoints: placePts,
      gradePoints: grPts,
      totalPoints: totalPts
    });
  }

  // Summary Metrics
  const totalScore = rows.reduce((sum, r) => sum + r.totalPoints, 0);
  const firstPlaces = rows.filter(r => r.rank === 1).length;
  const secondPlaces = rows.filter(r => r.rank === 2).length;
  const thirdPlaces = rows.filter(r => r.rank === 3).length;
  const gradeACount = rows.filter(r => r.grade === "A").length;
  const gradeBCount = rows.filter(r => r.grade === "B").length;
  const gradeCCount = rows.filter(r => r.grade === "C").length;

  // Category-wise Breakdown
  const categorySummaryMap = new Map<string, { points: number; count: number }>();
  rows.forEach(r => {
    const cat = r.categoryName || "General";
    const cur = categorySummaryMap.get(cat) || { points: 0, count: 0 };
    categorySummaryMap.set(cat, {
      points: cur.points + r.totalPoints,
      count: cur.count + 1
    });
  });

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#0f172a', minHeight: '100vh', padding: '32px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      {/* Control bar */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '14px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#8E0033' }}>Institution Total Results & Points Breakdown</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Complete official tabulation of grades, places, and points for all participated programs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <PrintButton color="#8E0033" label="Print Results Sheet" />
        </div>
      </div>

      {/* Official Header */}
      <div style={{ borderBottom: '3px solid #8E0033', paddingBottom: '16px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
          {settings.festLogo && (
            <img src={settings.festLogo} alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
          )}
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '1px', color: '#8E0033', textTransform: 'uppercase' }}>
              Council of Samastha Women's Colleges (CSWC)
            </div>
            <h1 style={{ margin: '2px 0', fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
              {settings.festName || "HIYA FIESTA 2026"}
            </h1>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
              {zoneName} · INSTITUTION OFFICIAL RESULTS & POINTS BREAKDOWN
            </div>
          </div>
        </div>

        {/* Institution Banner Card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff1f2', border: '1.5px solid #fecdd3', padding: '12px 18px', borderRadius: '8px', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9f1239', fontWeight: 800 }}>Institution / College:</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#881337' }}>
              {instName} <span style={{ fontFamily: 'monospace', color: '#be123c', marginLeft: '6px' }}>({instCode})</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#9f1239', fontWeight: 700, textTransform: 'uppercase' }}>Zonal Division</span>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{zoneName}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#9f1239', fontWeight: 700, textTransform: 'uppercase' }}>Total Tally</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#8E0033' }}>{totalScore} pts</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ border: '2px solid #8E0033', backgroundColor: 'rgba(142,0,51,0.04)', padding: '12px 14px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8E0033', textTransform: 'uppercase' }}>Grand Total Points</div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#8E0033', marginTop: '2px' }}>{totalScore}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Cumulative Tally</div>
        </div>
        <div style={{ border: '1.5px solid #fde047', backgroundColor: '#fefce8', padding: '12px 14px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a16207', textTransform: 'uppercase' }}>🥇 1st Places</div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ca8a04', marginTop: '2px' }}>{firstPlaces}</div>
          <div style={{ fontSize: '0.72rem', color: '#a16207' }}>Zone Champions</div>
        </div>
        <div style={{ border: '1.5px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>🥈 2nd / 🥉 3rd Places</div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#334155', marginTop: '2px' }}>
            {secondPlaces} <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/</span> {thirdPlaces}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#475569' }}>Runners-up</div>
        </div>
        <div style={{ border: '1.5px solid #bbf7d0', backgroundColor: '#f0fdf4', padding: '12px 14px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Grades (A / B / C)</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
            {gradeACount} <span style={{ fontSize: '1.1rem', color: '#86efac' }}>/</span> {gradeBCount} <span style={{ fontSize: '1.1rem', color: '#86efac' }}>/</span> {gradeCCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#166534' }}>Grade Certificates</div>
        </div>
      </div>

      {/* Category Points Breakdown Pills */}
      {categorySummaryMap.size > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '22px', padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center' }}>Category Totals:</div>
          {Array.from(categorySummaryMap.entries()).map(([cat, data]) => (
            <div key={cat} style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <span style={{ color: '#0f172a' }}>{cat}:</span> <strong style={{ color: '#8E0033' }}>{data.points} pts</strong> ({data.count} programs)
            </div>
          ))}
        </div>
      )}

      {/* Itemized Results Table */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '6px', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Detailed Results & Point Calculation Breakdown
          </h2>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
            {rows.length} {rows.length === 1 ? 'Program Result' : 'Program Results'}
          </span>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b' }}>
            No published results found for this institution. Results will appear once evaluated and published by the festival committee.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px', width: '30px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '8px 6px', width: '75px' }}>Prog Code</th>
                <th style={{ padding: '8px 6px' }}>Program Name & Category</th>
                <th style={{ padding: '8px 6px', width: '70px', textAlign: 'center' }}>Stage</th>
                <th style={{ padding: '8px 6px' }}>Candidate / Team</th>
                <th style={{ padding: '8px 6px', width: '65px', textAlign: 'center' }}>Chest No</th>
                <th style={{ padding: '8px 6px', width: '50px', textAlign: 'center' }}>Marks</th>
                <th style={{ padding: '8px 6px', width: '85px', textAlign: 'center' }}>Rank / Place</th>
                <th style={{ padding: '8px 6px', width: '65px', textAlign: 'center' }}>Grade</th>
                <th style={{ padding: '8px 6px', width: '65px', textAlign: 'center' }}>Place Pts</th>
                <th style={{ padding: '8px 6px', width: '65px', textAlign: 'center' }}>Grade Pts</th>
                <th style={{ padding: '8px 6px', width: '70px', textAlign: 'center', backgroundColor: 'rgba(142,0,51,0.06)' }}>Total Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>{r.programCode}</td>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{r.programName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.categoryName} · {r.programType}</div>
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      backgroundColor: r.stageType === 'OFF_STAGE' ? '#e0f2fe' : '#fce7f3',
                      color: r.stageType === 'OFF_STAGE' ? '#0369a1' : '#be185d'
                    }}>
                      {r.stageType === 'OFF_STAGE' ? 'Off' : 'On'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.participantName}</div>
                    {r.uid !== "-" && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>UID: {r.uid}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#8E0033' }}>
                    {r.chestNumber}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700 }}>
                    {r.marks > 0 ? r.marks : '-'}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    {r.rank ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '999px',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        backgroundColor: r.rank === 1 ? '#fef3c7' : (r.rank === 2 ? '#e2e8f0' : '#ffedd5'),
                        color: r.rank === 1 ? '#b45309' : (r.rank === 2 ? '#334155' : '#c2410c'),
                        border: r.rank === 1 ? '1px solid #fde68a' : (r.rank === 2 ? '1px solid #cbd5e1' : '1px solid #fed7aa')
                      }}>
                        {r.rank === 1 ? '🥇 1st' : (r.rank === 2 ? '🥈 2nd' : '🥉 3rd')}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 800 }}>
                    {r.grade ? (
                      <span style={{
                        color: r.grade === 'A' ? '#15803d' : (r.grade === 'B' ? '#0369a1' : '#d97706')
                      }}>
                        Grade {r.grade}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: r.placePoints > 0 ? '#b45309' : '#94a3b8' }}>
                    {r.placePoints > 0 ? `+${r.placePoints}` : '0'}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: r.gradePoints > 0 ? '#15803d' : '#94a3b8' }}>
                    {r.gradePoints > 0 ? `+${r.gradePoints}` : '0'}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 900, color: '#8E0033', fontSize: '0.9rem', backgroundColor: 'rgba(142,0,51,0.04)' }}>
                    {r.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2.5px solid #0f172a', fontWeight: 900 }}>
                <td colSpan={9} style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                  Total Institution Points:
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center', color: '#b45309' }}>
                  {rows.reduce((sum, r) => sum + r.placePoints, 0)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center', color: '#15803d' }}>
                  {rows.reduce((sum, r) => sum + r.gradePoints, 0)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '1.05rem', color: '#8E0033', backgroundColor: 'rgba(142,0,51,0.08)' }}>
                  {totalScore}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Official Signatures Section */}
      <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1.5px solid #cbd5e1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center', marginTop: '36px' }}>
          <div>
            <div style={{ borderBottom: '1px dashed #94a3b8', width: '75%', margin: '0 auto 8px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>College Principal / Manager</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{instName}</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px dashed #94a3b8', width: '75%', margin: '0 auto 8px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Zonal Convener / Tabulator</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{zoneName}</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px dashed #94a3b8', width: '75%', margin: '0 auto 8px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Controller of Examinations</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>CSWC Central Committee</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '0.7rem', color: '#94a3b8' }}>
          Official Statement of Results · CSWC Hiya Fiesta 2026 Tabulation Cell · Generated on {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
        </div>
      </div>
    </div>
  );
}
