import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export default async function PrintTabulationPage(props: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const settings = await getSettings(eventId);

  let whereClause: any = {};
  if (eventId) {
    const activeEv = await prisma.event.findUnique({ where: { id: eventId } });
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
            include: { team: true }
          }
        },
        orderBy: { slotNumber: 'asc' }
      }
    }
  });

  // Group by venue
  const venues: Record<string, any[]> = {};
  programs.forEach(p => {
    const v = p.venue || "Unassigned Venue";
    if (!venues[v]) venues[v] = [];
    venues[v].push(p);
  });

  return (
    <div style={{ padding: '40px', backgroundColor: 'white', color: 'black', minHeight: '100vh' }}>
      {Object.entries(venues).map(([venueName, venuePrograms]) => (
        <div key={venueName}>
          {venuePrograms.map((program, pIndex) => (
            <div 
              key={program.id} 
              style={{ 
                marginBottom: '40px', 
                pageBreakAfter: 'always',
                paddingBottom: '20px'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '15px' }}>
                <h1 style={{ margin: '0 0 5px 0', fontSize: '1.8rem' }}>{settings.festName}</h1>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', textTransform: 'uppercase', color: '#555' }}>
                  Judgement Tabulation Sheet
                </h2>
                <h3 style={{ margin: '0', backgroundColor: '#000', color: '#fff', padding: '10px', fontSize: '1.3rem' }}>
                  STAGE: {venueName}
                </h3>
              </div>

              <div style={{ padding: '0 15px' }}>
                <div style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', color: '#000' }}>{program.name}</h4>
                    <div style={{ fontSize: '1rem', color: '#444', fontWeight: 600 }}>
                      {program.category?.name || 'General'} • {program.stageType} • {program.type}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {program.startTime ? new Date(program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time TBD'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>Duration: {program.duration} min</div>
                  </div>
                </div>

                {program.assignments.length === 0 ? (
                  <div style={{ color: '#999', fontStyle: 'italic' }}>No candidates assigned yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                        <th style={{ border: '1px solid #000', padding: '8px', width: '50px' }}>Slot</th>
                        <th style={{ border: '1px solid #000', padding: '8px', width: '60px' }}>Code Letter</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Chest No.</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Name</th>
                        <th style={{ border: '1px solid #000', padding: '8px', width: '70px' }}>Marks</th>
                        <th style={{ border: '1px solid #000', padding: '8px', width: '70px' }}>Grade</th>
                        <th style={{ border: '1px solid #000', padding: '8px', width: '70px' }}>Place/Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {program.assignments.map((assignment: any, index: number) => (
                        <tr key={assignment.id}>
                          <td style={{ border: '1px solid #000', padding: '12px 8px', fontWeight: 'bold', textAlign: 'center' }}>
                            {assignment.slotNumber || index + 1}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '12px 8px', fontWeight: 'bold' }}>
                            {assignment.candidate.chestNumber || '-'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '12px 8px' }}>
                            {assignment.candidate.name}
                            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>{assignment.candidate.team?.name || '-'}</div>
                          </td>
                          <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                
                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #000', width: '150px', marginBottom: '5px', height: '20px' }}></div>
                    <div style={{ fontSize: '0.9rem' }}>Tabulator 1 Sign</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #000', width: '150px', marginBottom: '5px', height: '20px' }}></div>
                    <div style={{ fontSize: '0.9rem' }}>Tabulator 2 Sign</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #000', width: '150px', marginBottom: '5px', height: '20px' }}></div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Chief Judge Sign</div>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          @page { margin: 1cm; size: landscape; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <PrintButton label="Print Tabulation Sheets" />
      </div>
    </div>
  );
}
