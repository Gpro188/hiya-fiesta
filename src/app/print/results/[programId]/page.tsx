import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

export default async function PrintResultsPage({ params }: { params: Promise<{ programId: string }> }) {
  const resolvedParams = await params;
  const program = await prisma.program.findUnique({
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
              team: { include: { institution: true } },
              institution: true
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
          { marks: 'desc' }
        ],
        include: {
          candidate: {
            include: {
              team: { include: { institution: true } },
              institution: true
            }
          },
          team: {
            include: {
              institution: true
            }
          }
        }
      }
    }
  });

  if (!program) notFound();

  const settings = await getSettings(program.eventId);
  const isGeneral = program.type === "GENERAL" || program.type === "GROUP" || (program.category?.name || "").toUpperCase().includes("GENERAL");

  return (
    <div style={{ padding: '36px', backgroundColor: 'white', color: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px double #0f172a', paddingBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '1.6rem', fontWeight: 900, color: '#8E0033', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {settings.festName}
        </h1>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#1e293b' }}>
          Official Result Notification
        </h2>
        {program.event && (
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
            {program.event.name} {program.event.zone ? `(${program.event.zone.name})` : ''}
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
          <div>VENUE: <strong>{program.venue || 'Main Stage'}</strong></div>
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
                <th style={{ border: '1.5px solid #0f172a', padding: '10px 12px', textAlign: 'left' }}>Institution</th>
              </>
            )}
            <th style={{ border: '1.5px solid #0f172a', padding: '10px 8px', width: '80px', textAlign: 'center' }}>Points</th>
          </tr>
        </thead>
        <tbody>
          {program.results.map((res) => {
            const cand = res.candidate;
            const team = res.team;
            const inst = cand?.institution || cand?.team?.institution || team?.institution;
            const instName = inst?.name || team?.name || "Institution";
            const instPlace = inst?.place || "";

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
                      {instPlace && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>📍 {instPlace}</div>
                      )}
                    </td>
                    <td style={{ border: '1.5px solid #0f172a', padding: '10px 12px' }}>
                      {teamAssignments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Merit Candidates ({teamAssignments.length}):
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {teamAssignments.map((a, cIdx) => (
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
                                {a.candidate?.name} {a.candidate?.chestNumber ? `(Chest #${a.candidate.chestNumber})` : ''}
                                {cIdx < teamAssignments.length - 1 ? '' : ''}
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
                    <td style={{ border: '1.5px solid #0f172a', padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>
                      {cand?.chestNumber || '-'}
                    </td>
                    <td style={{ border: '1.5px solid #0f172a', padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{instName}</div>
                      {instPlace && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>📍 {instPlace}</div>
                      )}
                    </td>
                  </>
                )}
                <td style={{ border: '1.5px solid #0f172a', padding: '10px 8px', textAlign: 'center', fontWeight: 900, color: '#8E0033' }}>
                  {res.points !== null && res.points !== undefined ? `${res.points} pts` : '-'}
                </td>
              </tr>
            );
          })}
          {program.results.length === 0 && (
            <tr>
              <td colSpan={isGeneral ? 5 : 6} style={{ border: '1.5px solid #0f172a', padding: '30px', textAlign: 'center', color: '#666' }}>
                No published results recorded yet for this program.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Official Signatures */}
      <div style={{ marginTop: '70px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px' }}>
        <div style={{ borderTop: '1.5px solid #0f172a', width: '220px', textAlign: 'center', paddingTop: '6px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Result Controller / Tabulator</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Signature & Date</div>
        </div>
        <div style={{ borderTop: '1.5px solid #0f172a', width: '220px', textAlign: 'center', paddingTop: '6px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Program Convener</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Signature & Date</div>
        </div>
        <div style={{ borderTop: '1.5px solid #0f172a', width: '220px', textAlign: 'center', paddingTop: '6px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>General Secretary / Chairman</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Official Seal & Endorsement</div>
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
