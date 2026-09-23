import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function InstitutionStateSelectedPage(props: {
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
        <h2 style={{ color: '#8E0033', marginBottom: '8px' }}>🌟 State Festival Qualified Candidates &mdash; Select Institution</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Select an institution below to view and print their official list of students qualified for the State Festival.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {teams.map(t => (
            <a
              key={t.id}
              href={`/print/institution-state-selected?teamId=${t.id}`}
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

  // 1. Fetch individual candidate selections
  const candidates = await prisma.candidate.findMany({
    where: { teamId },
    include: {
      category: true,
      masterStudent: true,
      stateQualifications: {
        include: { program: true }
      },
      results: {
        where: {
          isPublished: true,
          rank: { in: [1, 2] }
        },
        include: { program: { include: { category: true } } }
      }
    },
    orderBy: [
      { chestNumber: 'asc' },
      { name: 'asc' }
    ]
  });

  // Extract qualified individual programs per candidate
  interface QualifiedIndividualItem {
    candidateId: string;
    chestNumber: string;
    name: string;
    uid: string;
    category: string;
    programId: string;
    programCode: string;
    programName: string;
    stageType: string;
    rank: number;
    grade: string | null;
    marks: number;
    qualificationReason: string;
  }

  const qualifiedItems: QualifiedIndividualItem[] = [];

  for (const c of candidates) {
    const seenProgramIds = new Set<string>();

    // From explicit state qualifications
    for (const sq of c.stateQualifications) {
      if (!seenProgramIds.has(sq.programId)) {
        seenProgramIds.add(sq.programId);
        const relatedRes = c.results.find(r => r.programId === sq.programId);
        qualifiedItems.push({
          candidateId: c.id,
          chestNumber: c.chestNumber || "-",
          name: c.name,
          uid: c.uid || c.masterStudent?.uid || "-",
          category: c.category?.name || "General",
          programId: sq.programId,
          programCode: sq.program.programCode || "-",
          programName: sq.program.name,
          stageType: sq.program.stageType || "ON_STAGE",
          rank: sq.originalRank || relatedRes?.rank || 1,
          grade: relatedRes?.grade || null,
          marks: relatedRes?.marks || 0,
          qualificationReason: sq.originalRank ? `Rank ${sq.originalRank} in Zone` : "Zone Qualification"
        });
      }
    }

    // From published results with Rank 1 or 2
    for (const res of c.results) {
      if (!seenProgramIds.has(res.programId)) {
        seenProgramIds.add(res.programId);
        qualifiedItems.push({
          candidateId: c.id,
          chestNumber: c.chestNumber || "-",
          name: c.name,
          uid: c.uid || c.masterStudent?.uid || "-",
          category: res.program.category?.name || c.category?.name || "General",
          programId: res.programId,
          programCode: res.program.programCode || "-",
          programName: res.program.name,
          stageType: res.program.stageType || "ON_STAGE",
          rank: res.rank || 1,
          grade: res.grade,
          marks: res.marks || 0,
          qualificationReason: res.rank === 1 ? "1st Place Winner" : "2nd Place Winner"
        });
      }
    }

    // Direct qualification flag on candidate
    if ((c.isStateQualified || c.stateQualificationStatus === "QUALIFIED") && seenProgramIds.size === 0) {
      qualifiedItems.push({
        candidateId: c.id,
        chestNumber: c.chestNumber || "-",
        name: c.name,
        uid: c.uid || c.masterStudent?.uid || "-",
        category: c.category?.name || "General",
        programId: "-",
        programCode: "-",
        programName: "State Final Selected Candidate",
        stageType: "ALL",
        rank: 1,
        grade: null,
        marks: 0,
        qualificationReason: "Direct State Selection"
      });
    }
  }

  // 2. Fetch Group Programs where this Team secured 1st Place (State Qualified)
  const groupResults = await prisma.result.findMany({
    where: {
      teamId,
      isPublished: true,
      rank: 1,
      program: {
        type: { not: "INDIVIDUAL" }
      }
    },
    include: {
      program: {
        include: { category: true }
      }
    },
    orderBy: {
      program: { name: 'asc' }
    }
  });

  const uniqueStudentsCount = new Set(qualifiedItems.map(item => item.candidateId)).size;
  const totalProgramsCount = qualifiedItems.length + groupResults.length;

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
          <h3 style={{ margin: 0, color: '#8E0033' }}>State Festival Qualification List</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Official selection list of candidates and programs qualifying for the State Final
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <PrintButton color="#8E0033" label="Print Official List" />
        </div>
      </div>

      {/* Header */}
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
              {zoneName} · STATE FESTIVAL QUALIFIED CANDIDATES LIST
            </div>
          </div>
        </div>

        {/* Institution Info Card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff1f2', border: '1.5px solid #fecdd3', padding: '10px 16px', borderRadius: '8px', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9f1239', fontWeight: 800 }}>Institution / College:</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#881337' }}>
              {instName} <span style={{ fontFamily: 'monospace', color: '#be123c', marginLeft: '6px' }}>({instCode})</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#9f1239', fontWeight: 700, textTransform: 'uppercase' }}>Zonal Division</span>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{zoneName}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#9f1239', fontWeight: 700, textTransform: 'uppercase' }}>Generated On</span>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <div style={{ border: '1.5px solid #bbf7d0', backgroundColor: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Selected Students</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>{uniqueStudentsCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#166534' }}>Qualified for State Final</div>
        </div>
        <div style={{ border: '1.5px solid #fed7aa', backgroundColor: '#fff7ed', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>Individual Program Entries</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#c2410c', marginTop: '2px' }}>{qualifiedItems.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#9a3412' }}>1st & 2nd Place Winners</div>
        </div>
        <div style={{ border: '1.5px solid #ddd6fe', backgroundColor: '#f5f3ff', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#5b21b6', textTransform: 'uppercase' }}>Group Programs Qualified</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#6d28d9', marginTop: '2px' }}>{groupResults.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#5b21b6' }}>1st Place Group Winners</div>
        </div>
      </div>

      {/* Section 1: Individual Qualified Students */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '6px', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            A. Individual Students Selected for State Festival
          </h2>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
            {qualifiedItems.length} {qualifiedItems.length === 1 ? 'Selection' : 'Selections'}
          </span>
        </div>

        {qualifiedItems.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b' }}>
            No individual candidate qualifications recorded yet for this institution.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px', width: '38px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '8px', width: '80px', textAlign: 'center' }}>Chest No</th>
                <th style={{ padding: '8px' }}>Candidate Name & UID</th>
                <th style={{ padding: '8px', width: '110px' }}>Category</th>
                <th style={{ padding: '8px' }}>Program Qualified</th>
                <th style={{ padding: '8px', width: '75px', textAlign: 'center' }}>Stage</th>
                <th style={{ padding: '8px', width: '90px', textAlign: 'center' }}>Zonal Rank</th>
                <th style={{ padding: '8px', width: '60px', textAlign: 'center' }}>Grade</th>
                <th style={{ padding: '8px', width: '120px', textAlign: 'center' }}>State Status</th>
              </tr>
            </thead>
            <tbody>
              {qualifiedItems.map((item, idx) => (
                <tr key={`${item.candidateId}-${item.programId}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace', color: '#8E0033', fontSize: '0.95rem' }}>
                    {item.chestNumber}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>UID: {item.uid}</div>
                  </td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#334155' }}>
                    {item.category}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.programName}</div>
                    {item.programCode !== "-" && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>Code: {item.programCode}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: item.stageType === 'OFF_STAGE' ? '#e0f2fe' : '#fce7f3',
                      color: item.stageType === 'OFF_STAGE' ? '#0369a1' : '#be185d'
                    }}>
                      {item.stageType === 'OFF_STAGE' ? 'Off-Stage' : 'On-Stage'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      backgroundColor: item.rank === 1 ? '#fef3c7' : '#e2e8f0',
                      color: item.rank === 1 ? '#b45309' : '#334155',
                      border: item.rank === 1 ? '1px solid #fde68a' : '1px solid #cbd5e1'
                    }}>
                      {item.rank === 1 ? '🥇 1st Place' : (item.rank === 2 ? '🥈 2nd Place' : `${item.rank} Place`)}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: item.grade === 'A' ? '#15803d' : (item.grade === 'B' ? '#0369a1' : '#475569') }}>
                    {item.grade ? `Grade ${item.grade}` : '-'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '4px', border: '1px solid #86efac' }}>
                      ✓ QUALIFIED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 2: Group Programs Qualified */}
      {groupResults.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '6px', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              B. Group Programs Selected for State Festival
            </h2>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
              {groupResults.length} {groupResults.length === 1 ? 'Program' : 'Programs'} (1st Place Winners)
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px', width: '38px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '8px', width: '90px' }}>Prog Code</th>
                <th style={{ padding: '8px' }}>Program Name</th>
                <th style={{ padding: '8px', width: '120px' }}>Category</th>
                <th style={{ padding: '8px', width: '85px', textAlign: 'center' }}>Stage</th>
                <th style={{ padding: '8px', width: '90px', textAlign: 'center' }}>Zonal Rank</th>
                <th style={{ padding: '8px', width: '70px', textAlign: 'center' }}>Grade</th>
                <th style={{ padding: '8px', width: '120px', textAlign: 'center' }}>State Status</th>
              </tr>
            </thead>
            <tbody>
              {groupResults.map((gr, idx) => (
                <tr key={gr.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>
                    {gr.program.programCode || "-"}
                  </td>
                  <td style={{ padding: '8px', fontWeight: 800, color: '#0f172a' }}>
                    {gr.program.name}
                  </td>
                  <td style={{ padding: '8px', color: '#334155', fontWeight: 600 }}>
                    {gr.program.category?.name || "General"}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: gr.program.stageType === 'OFF_STAGE' ? '#e0f2fe' : '#fce7f3',
                      color: gr.program.stageType === 'OFF_STAGE' ? '#0369a1' : '#be185d'
                    }}>
                      {gr.program.stageType === 'OFF_STAGE' ? 'Off-Stage' : 'On-Stage'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '999px', fontWeight: 800, fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                      🥇 1st Place
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: gr.grade === 'A' ? '#15803d' : '#0369a1' }}>
                    {gr.grade ? `Grade ${gr.grade}` : '-'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '4px', border: '1px solid #86efac' }}>
                      ✓ QUALIFIED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Official Signatures Section */}
      <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1.5px solid #cbd5e1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center', marginTop: '36px' }}>
          <div>
            <div style={{ borderBottom: '1px dashed #94a3b8', width: '75%', margin: '0 auto 8px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>College Principal / Manager</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{instName}</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px dashed #94a3b8', width: '75%', margin: '0 auto 8px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Zonal Convener / Secretary</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{zoneName}</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px dashed #94a3b8', width: '75%', margin: '0 auto 8px' }}></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>General Convener / Controller</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>CSWC State Festival Committee</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.7rem', color: '#94a3b8' }}>
          This document is computer-generated and officially authenticated by the CSWC Festival Management System.
        </div>
      </div>
    </div>
  );
}
