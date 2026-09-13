import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function PrintTabulationPage(props: {
  searchParams: Promise<{ eventId?: string; programId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const programId = searchParams.programId;
  const settings = await getSettings(eventId);

  let activeEv: any = null;
  let whereClause: any = {};

  if (eventId) {
    activeEv = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true },
    });
    if (activeEv?.parentId) {
      whereClause = {
        OR: [
          { eventId: eventId },
          { eventId: activeEv.parentId }
        ]
      };
    } else {
      whereClause = { eventId };
    }
  }

  if (programId) {
    whereClause.id = programId;
  }

  const programs = await prisma.program.findMany({
    where: whereClause,
    orderBy: [
      { venue: 'asc' },
      { startTime: 'asc' }
    ],
    include: { 
      category: true,
      assignments: {
        include: {
          candidate: {
            include: { 
              team: { include: { institution: true } },
              institution: { include: { zone: true } }
            }
          }
        },
        orderBy: { slotNumber: 'asc' }
      }
    }
  });

  const targetZoneId = activeEv?.zoneId || activeEv?.zone?.id;

  // Group by venue
  const venues: Record<string, any[]> = {};
  programs.forEach(p => {
    const v = p.venue || "Main Stage";
    if (!venues[v]) venues[v] = [];
    venues[v].push(p);
  });

  return (
    <div style={{ padding: '24px', backgroundColor: 'white', color: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {Object.entries(venues).map(([venueName, venuePrograms]) => (
        <div key={venueName}>
          {venuePrograms.map((program) => {
            let candidateAssignments = program.assignments.filter((a: any) => Boolean(a.candidate));

            if (targetZoneId) {
              const zoneFiltered = candidateAssignments.filter((a: any) => {
                const c = a.candidate;
                const zId =
                  c.institution?.zoneId ||
                  c.institution?.zone?.id ||
                  c.team?.institution?.zoneId ||
                  c.team?.event?.zoneId;
                return zId === targetZoneId;
              });
              if (zoneFiltered.length > 0) {
                candidateAssignments = zoneFiltered;
              }
            }

            // Sort by slotNumber or chestNumber
            candidateAssignments.sort((a: any, b: any) => {
              if (a.slotNumber && b.slotNumber) return a.slotNumber - b.slotNumber;
              const cA = a.candidate;
              const cB = b.candidate;
              if (cA.chestNumber && cB.chestNumber) {
                const numA = parseInt(cA.chestNumber, 10);
                const numB = parseInt(cB.chestNumber, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return cA.chestNumber.localeCompare(cB.chestNumber);
              }
              return (a.slotNumber || 0) - (b.slotNumber || 0);
            });

            return (
              <div 
                key={program.id} 
                style={{ 
                  marginBottom: '40px', 
                  pageBreakAfter: 'always',
                  breakAfter: 'page',
                  paddingBottom: '20px'
                }}
              >
                {/* Header repeated for every program */}
                <div style={{ textAlign: 'center', marginBottom: '14px', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', color: '#8E0033', letterSpacing: '0.5px' }}>
                    {settings.festName}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginTop: '2px' }}>
                    Official Judgement Tabulation Sheet
                  </div>
                  {activeEv && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
                      {activeEv.name} {activeEv.zone ? `(${activeEv.zone.name})` : ''}
                    </div>
                  )}
                  <div style={{ display: 'inline-block', backgroundColor: '#0f172a', color: '#ffffff', padding: '4px 14px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 800, marginTop: '6px' }}>
                    STAGE: {venueName}
                  </div>
                </div>

                <div>
                  <div style={{ border: '1.5px solid #0f172a', backgroundColor: '#f8fafc', borderRadius: '4px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#8E0033', color: '#fff', padding: '2px 8px', borderRadius: '3px', fontWeight: 900, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                          CODE: {program.programCode || 'P'}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                          {program.name}
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                        Category: <strong style={{ color: '#0f172a' }}>{program.category?.name || 'General'}</strong> • Stage: <strong>{program.stageType}</strong> • Type: <strong>{program.type}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', borderLeft: '1px solid #cbd5e1', paddingLeft: '14px' }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                        {program.startTime ? new Date(program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time TBD'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Duration: <strong>{program.duration} min</strong></div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Candidates: <strong>{candidateAssignments.length}</strong></div>
                    </div>
                  </div>

                  <div style={{
                    padding: '4px 8px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '3px',
                    fontSize: '0.74rem',
                    color: '#1e293b',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span><strong>Consensus Tabulation Rule:</strong> Juries finalize consolidated score after joint review. Grade: A+ (90-100), A (80-89), B (70-79), C (60-69).</span>
                    <span style={{ fontWeight: 700, color: '#8E0033' }}>Official Master Record</span>
                  </div>

                  {candidateAssignments.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '30px', border: '1px dashed #cbd5e1', borderRadius: '4px' }}>
                      No candidates assigned yet.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1.5px solid #0f172a' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'center' }}>
                          <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '45px' }}>Slot</th>
                          <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '70px' }}>Code</th>
                          <th style={{ border: '1px solid #334155', padding: '8px 8px', width: '90px' }}>Chest No.</th>
                          <th style={{ border: '1px solid #334155', padding: '8px 10px', textAlign: 'left' }}>Candidate Name & Institution</th>
                          <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '85px', backgroundColor: '#1e293b' }}>Marks (100)</th>
                          <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '70px' }}>Grade</th>
                          <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '85px' }}>Place/Rank</th>
                          <th style={{ border: '1px solid #334155', padding: '8px 8px', width: '120px' }}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidateAssignments.map((assignment: any, index: number) => {
                          const c = assignment.candidate;
                          const instName = c.institution?.name || c.team?.institution?.name || c.team?.name || '-';

                          return (
                            <tr key={assignment.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', height: '42px' }}>
                              <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 800, textAlign: 'center' }}>
                                {assignment.slotNumber || index + 1}
                              </td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>
                                <div style={{ width: '30px', height: '26px', border: '1px dashed #94a3b8', margin: '0 auto', borderRadius: '2px' }}></div>
                              </td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 900, fontSize: '0.95rem', color: '#8E0033', textAlign: 'center', fontFamily: 'monospace' }}>
                                {c.chestNumber || '-'}
                              </td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{c.name}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{instName}</div>
                              </td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#fafafa' }}></td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}></td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}></td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  
                  {/* Consensus Signatures Box */}
                  <div style={{
                    marginTop: '28px',
                    border: '1.5px solid #0f172a',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    backgroundColor: '#fafafa',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Certification of Final Tabulated Marks
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr', gap: '16px', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ borderBottom: '1.5px solid #0f172a', height: '24px', marginBottom: '4px' }}></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Evaluator 1 (Jury 1)</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Name: _________________</div>
                      </div>
                      <div>
                        <div style={{ borderBottom: '1.5px solid #0f172a', height: '24px', marginBottom: '4px' }}></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Evaluator 2 (Jury 2)</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Name: _________________</div>
                      </div>
                      <div>
                        <div style={{ borderBottom: '1.5px solid #0f172a', height: '24px', marginBottom: '4px' }}></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Chief Judge / Stage Mgr</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Verification Signature</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ border: '1px dashed #94a3b8', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                          Zonal Seal
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          @page { margin: 8mm 10mm; size: A4 landscape; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
        <PrintButton label="Print Tabulation Sheets" />
      </div>
    </div>
  );
}
