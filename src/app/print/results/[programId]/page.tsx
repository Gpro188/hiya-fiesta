import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

import Link from "next/link";

export default async function PrintResultsPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ eventId?: string; status?: string; zoneId?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedStatus = resolvedSearchParams.status || 'auto'; // 'auto' | 'published' | 'unpublished' | 'all'
  const requestedEventId = resolvedSearchParams.eventId;
  const requestedZoneId = resolvedSearchParams.zoneId;

  const [program, allZones] = await Promise.all([
    prisma.program.findUnique({
      where: { id: resolvedParams.programId },
      include: {
        category: true,
        event: {
          include: {
            zone: true
          }
        },
        assignments: {
          include: {
            candidate: {
              include: {
                team: { 
                  include: { 
                    institution: { include: { zone: true } },
                    event: { include: { zone: true } }
                  } 
                },
                institution: { include: { zone: true } }
              }
            }
          },
          orderBy: [
            { slotNumber: 'asc' },
            { candidate: { chestNumber: 'asc' } },
            { candidate: { name: 'asc' } }
          ]
        },
        results: {
          orderBy: [
            { rank: 'asc' },
            { marks: 'desc' },
            { points: 'desc' }
          ],
          include: {
            candidate: {
              include: {
                team: { 
                  include: { 
                    institution: { include: { zone: true } },
                    event: { include: { zone: true } }
                  } 
                },
                institution: { include: { zone: true } }
              }
            },
            team: {
              include: {
                institution: { include: { zone: true } },
                event: { include: { zone: true } }
              }
            }
          }
        }
      }
    }),
    prisma.zone.findMany({ orderBy: { name: 'asc' } })
  ]);

  if (!program) notFound();

  // Helper to extract zone from result
  const getResultZone = (res: any) => {
    return res.candidate?.institution?.zone ||
      res.candidate?.team?.institution?.zone ||
      res.candidate?.team?.event?.zone ||
      res.team?.institution?.zone ||
      res.team?.event?.zone ||
      null;
  };

  // Helper to extract eventId from result
  const getResultEventId = (res: any) => {
    return res.candidate?.team?.eventId || res.team?.eventId || null;
  };

  // Filter results by Event / Zone if requested
  let filteredResults = [...program.results];

  if (requestedEventId) {
    filteredResults = filteredResults.filter(r => getResultEventId(r) === requestedEventId);
  }

  if (requestedZoneId) {
    filteredResults = filteredResults.filter(r => getResultZone(r)?.id === requestedZoneId);
  }

  // Determine active status filter
  const hasPublished = filteredResults.some(r => r.isPublished);
  const hasPending = filteredResults.some(r => !r.isPublished);

  let activeStatus = requestedStatus;
  if (activeStatus === 'auto') {
    // If published results exist, show ONLY published results so duplicate pending entries never leak
    activeStatus = hasPublished ? 'published' : 'all';
  }

  if (activeStatus === 'published') {
    filteredResults = filteredResults.filter(r => r.isPublished);
  } else if (activeStatus === 'unpublished' || activeStatus === 'pending') {
    filteredResults = filteredResults.filter(r => !r.isPublished);
  }

  // Deduplicate identical candidate/team entries if multiple exist
  const seenEntities = new Set<string>();
  const displayedResults: typeof filteredResults = [];
  for (const res of filteredResults) {
    const key = res.candidateId ? `c_${res.candidateId}` : (res.teamId ? `t_${res.teamId}` : res.id);
    if (!seenEntities.has(key)) {
      seenEntities.add(key);
      displayedResults.push(res);
    }
  }

  const settings = await getSettings(program.eventId);
  const isGeneral = program.type === "GENERAL" || program.type === "GROUP" || (program.category?.name || "").toUpperCase().includes("GENERAL");

  // Build helper URL for switcher toolbar
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const st = overrides.status !== undefined ? overrides.status : (activeStatus !== 'auto' ? activeStatus : undefined);
    if (st) sp.set('status', st);
    const ev = overrides.eventId !== undefined ? overrides.eventId : requestedEventId;
    if (ev) sp.set('eventId', ev);
    const zn = overrides.zoneId !== undefined ? overrides.zoneId : requestedZoneId;
    if (zn) sp.set('zoneId', zn);
    const q = sp.toString();
    return `/print/results/${program.id}${q ? `?${q}` : ''}`;
  };

  return (
    <div style={{ padding: '36px', backgroundColor: 'white', color: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── Toolbar: Status & Zone Filter (Screen Only) ── */}
      <div className="no-print" style={{
        marginBottom: '24px',
        padding: '12px 18px',
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        color: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>FILTER STATUS:</span>
          <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #334155' }}>
            <Link
              href={buildUrl({ status: 'published' })}
              style={{
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                backgroundColor: activeStatus === 'published' ? '#16a34a' : '#1e293b',
                color: '#ffffff'
              }}
            >
              🟢 Published Only
            </Link>
            <Link
              href={buildUrl({ status: 'unpublished' })}
              style={{
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                backgroundColor: activeStatus === 'unpublished' || activeStatus === 'pending' ? '#d97706' : '#1e293b',
                color: '#ffffff',
                borderLeft: '1px solid #334155'
              }}
            >
              🟡 Stage 1 Announce (Unpublished)
            </Link>
            <Link
              href={buildUrl({ status: 'all' })}
              style={{
                padding: '5px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                backgroundColor: activeStatus === 'all' ? '#0284c7' : '#1e293b',
                color: '#ffffff',
                borderLeft: '1px solid #334155'
              }}
            >
              📑 All Entries
            </Link>
          </div>

          {/* Zone filter if multiple zones exist */}
          {allZones.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>ZONE:</span>
              <select
                defaultValue={requestedZoneId || ''}
                onChange={(e) => {
                  const targetZone = e.target.value;
                  const newUrl = buildUrl({ zoneId: targetZone ? targetZone : undefined });
                  window.location.href = newUrl;
                }}
                style={{
                  padding: '5px 8px',
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #334155',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                <option value="">All Zones</option>
                {allZones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {program.stageType === 'OFF_STAGE' && (
            <Link
              href={`/print/offstage-results?status=${activeStatus === 'unpublished' ? 'unpublished' : 'all'}${requestedZoneId ? `&zoneId=${requestedZoneId}` : ''}`}
              style={{
                padding: '6px 12px',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              📢 Total Off-Stage Print
            </Link>
          )}
          <Link
            href="/dashboard/scoring"
            style={{
              padding: '6px 12px',
              backgroundColor: '#334155',
              color: '#ffffff',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            Back to Scoring
          </Link>
        </div>
      </div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px double #0f172a', paddingBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '1.6rem', fontWeight: 900, color: '#8E0033', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {settings.festName}
        </h1>
        <div style={{ display: 'inline-block', padding: '2px 14px', borderRadius: '4px', backgroundColor: activeStatus === 'unpublished' ? '#fef3c7' : '#0f172a', color: activeStatus === 'unpublished' ? '#92400e' : '#ffffff', fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          {activeStatus === 'unpublished' ? '📢 STAGE 1 ANNOUNCEMENT SHEET (PENDING VERIFICATION)' : (activeStatus === 'all' ? 'TABULATION & RESULTS AUDIT NOTIFICATION' : 'OFFICIAL RESULT NOTIFICATION')}
        </div>
        {program.event && (
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
            {program.event.name} {program.event.zone ? `(${program.event.zone.name})` : ''}
            {requestedZoneId && (
              <span style={{ color: '#0284c7', marginLeft: '6px' }}>
                • Showing {allZones.find(z => z.id === requestedZoneId)?.name || 'Selected'} Zone
              </span>
            )}
          </div>
        )}
        {settings.festMoto && (
          <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '0.8rem', color: '#64748b' }}>{settings.festMoto}</p>
        )}
      </div>

      {/* Meta Box */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '12px 16px', border: '1.5px solid #0f172a', borderRadius: '4px' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
            PROGRAM: <span style={{ color: '#8E0033' }}>{program.name}</span> {program.programCode ? `[${program.programCode}]` : ''}
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
            CATEGORY: <strong>{program.category?.name || 'General'}</strong> • TYPE: <strong>{program.type}</strong> • STAGE: <strong>{program.stageType === 'OFF_STAGE' ? 'OFF-STAGE' : 'ON-STAGE'}</strong>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.88rem' }}>
          <div>VENUE: <strong>{program.venue || (program.stageType === 'OFF_STAGE' ? 'Valuation Center / Stage 1' : 'Main Stage')}</strong></div>
          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>DATE: {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Results Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            <th style={{ border: '1.5px solid #0f172a', padding: '10px 8px', width: '70px', textAlign: 'center' }}>Rank</th>
            <th style={{ border: '1.5px solid #0f172a', padding: '10px 8px', width: '75px', textAlign: 'center' }}>Grade</th>
            {isGeneral ? (
              <>
                <th style={{ border: '1.5px solid #0f172a', padding: '10px 12px', textAlign: 'left', minWidth: '220px' }}>Winning Institution</th>
                <th style={{ border: '1.5px solid #0f172a', padding: '10px 12px', textAlign: 'left' }}>Registered Participants (Students)</th>
              </>
            ) : (
              <>
                <th style={{ border: '1.5px solid #0f172a', padding: '10px 12px', textAlign: 'left' }}>Candidate Name</th>
                <th style={{ border: '1.5px solid #0f172a', padding: '10px 8px', width: '90px', textAlign: 'center' }}>Chest #</th>
                <th style={{ border: '1.5px solid #0f172a', padding: '10px 12px', textAlign: 'left' }}>Institution &amp; Zone</th>
              </>
            )}
            <th style={{ border: '1.5px solid #0f172a', padding: '10px 8px', width: '80px', textAlign: 'center' }}>Points</th>
            {activeStatus === 'all' && (
              <th style={{ border: '1.5px solid #0f172a', padding: '10px 8px', width: '90px', textAlign: 'center' }}>Status</th>
            )}
          </tr>
        </thead>
        <tbody>
          {displayedResults.map((res) => {
            const cand = res.candidate;
            const team = res.team;
            const inst = cand?.institution || cand?.team?.institution || team?.institution;
            const instName = inst?.name || team?.name || "Institution";
            const instPlace = inst?.place || "";
            const zoneObj = getResultZone(res);

            // For general programs, find assigned participants for this team
            const teamAssignments = isGeneral && res.teamId
              ? program.assignments.filter((a) => a.candidate?.teamId === res.teamId || a.candidate?.institutionId === team?.institutionId)
              : [];

            const rankText = res.rank === 1 ? '🥇 1st' : res.rank === 2 ? '🥈 2nd' : res.rank === 3 ? '🥉 3rd' : res.rank ? `#${res.rank}` : '-';

            return (
              <tr key={res.id} style={{ fontSize: '0.92rem', backgroundColor: res.rank === 1 ? '#fefce8' : res.rank === 2 ? '#f8fafc' : res.rank === 3 ? '#fff7ed' : '#ffffff' }}>
                <td style={{ border: '1.5px solid #0f172a', padding: '10px 8px', textAlign: 'center', fontWeight: 900, color: res.rank === 1 ? '#b45309' : res.rank === 2 ? '#475569' : res.rank === 3 ? '#c2410c' : '#64748b' }}>
                  {rankText}
                </td>
                <td style={{ border: '1.5px solid #0f172a', padding: '10px 8px', textAlign: 'center', fontWeight: 800 }}>
                  {res.grade ? `${res.grade} Gr` : '-'}
                </td>
                {isGeneral ? (
                  <>
                    <td style={{ border: '1.5px solid #0f172a', padding: '10px 12px', fontWeight: 800 }}>
                      <div style={{ fontSize: '1rem', color: '#0f172a' }}>{instName}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        {instPlace && <span>📍 {instPlace}</span>}
                        {zoneObj && (
                          <span style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {zoneObj.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ border: '1.5px solid #0f172a', padding: '10px 12px' }}>
                      {teamAssignments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Merit Candidates ({teamAssignments.length}):
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {teamAssignments.map((a) => (
                              <span 
                                key={a.id} 
                                style={{ 
                                  fontSize: '0.8rem', 
                                  fontWeight: 600, 
                                  backgroundColor: '#f1f5f9', 
                                  border: '1px solid #cbd5e1', 
                                  padding: '2px 6px', 
                                  borderRadius: '3px' 
                                }}
                              >
                                {a.candidate?.name} {a.candidate?.chestNumber ? `(#${a.candidate.chestNumber})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: '#64748b', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          {res.candidate?.name || 'Registered Team'}
                        </div>
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ border: '1.5px solid #0f172a', padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                      {cand?.name || team?.name || '-'}
                    </td>
                    <td style={{ border: '1.5px solid #0f172a', padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.98rem' }}>
                      {cand?.chestNumber || '-'}
                    </td>
                    <td style={{ border: '1.5px solid #0f172a', padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{instName}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', fontSize: '0.78rem', color: '#64748b' }}>
                        {instPlace && <span>📍 {instPlace}</span>}
                        {zoneObj && (
                          <span style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {zoneObj.name}
                          </span>
                        )}
                      </div>
                    </td>
                  </>
                )}
                <td style={{ border: '1.5px solid #0f172a', padding: '10px 8px', textAlign: 'center', fontWeight: 900, color: '#8E0033' }}>
                  {res.points !== null && res.points !== undefined ? `${res.points} pts` : '-'}
                </td>
                {activeStatus === 'all' && (
                  <td style={{ border: '1.5px solid #0f172a', padding: '10px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                    {res.isPublished ? (
                      <span style={{ color: '#16a34a' }}>🟢 PUBLISHED</span>
                    ) : (
                      <span style={{ color: '#d97706' }}>🟡 PENDING</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {displayedResults.length === 0 && (
            <tr>
              <td colSpan={isGeneral ? (activeStatus === 'all' ? 6 : 5) : (activeStatus === 'all' ? 7 : 6)} style={{ border: '1.5px solid #0f172a', padding: '30px', textAlign: 'center', color: '#666' }}>
                {activeStatus === 'published' ? 'No published results recorded yet for this program.' : 'No results found matching selected filter criteria.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Official Signatures */}
      <div style={{ marginTop: '70px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px' }}>
        <div style={{ borderTop: '1.5px solid #0f172a', width: '220px', textAlign: 'center', paddingTop: '6px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Result Controller / Tabulator</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Signature &amp; Date</div>
        </div>
        <div style={{ borderTop: '1.5px solid #0f172a', width: '220px', textAlign: 'center', paddingTop: '6px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Stage 1 Announcer / MC</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Signature &amp; Date</div>
        </div>
        <div style={{ borderTop: '1.5px solid #0f172a', width: '220px', textAlign: 'center', paddingTop: '6px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Program Convener / Chairman</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Official Seal &amp; Endorsement</div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', gap: '10px' }}>
        <PrintButton label="Print Official Notification" color="#8E0033" />
      </div>
    </div>
  );
}
