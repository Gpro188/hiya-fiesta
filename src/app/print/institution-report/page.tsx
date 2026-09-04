import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function PrintInstitutionReportPage(props: {
  searchParams: Promise<{ teamId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const teamId = searchParams.teamId;

  if (!teamId) {
    return <div style={{ padding: '40px' }}>No Team ID provided.</div>;
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { institution: true }
  });

  if (!team) {
    return <div style={{ padding: '40px' }}>Team not found.</div>;
  }

  const settings = await getSettings(team.eventId);

  const candidates = await prisma.candidate.findMany({
    where: { teamId },
    include: {
      category: true,
      programs: {
        include: { program: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div style={{ padding: '40px', backgroundColor: 'white', color: 'black', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid black', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 5px 0' }}>{settings.festName}</h1>
        <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Institution Candidate Schedule Report</h2>
        <p style={{ margin: '5px 0 0 0', fontStyle: 'italic' }}>{team.institution?.name || team.name}</p>
      </div>

      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <strong>Institution / Team:</strong> {team.name}
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>Total Candidates:</strong> {candidates.length}
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid black', padding: '10px', textAlign: 'left' }}>Candidate Details</th>
            <th style={{ border: '1px solid black', padding: '10px', textAlign: 'left' }}>Assigned Programs & Schedule</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate: any) => (
            <tr key={candidate.id}>
              <td style={{ border: '1px solid black', padding: '15px', verticalAlign: 'top', width: '35%' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  {candidate.photoUrl ? (
                    <img src={candidate.photoUrl} alt="Photo" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1.5rem' }}>👤</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{candidate.name}</div>
                    <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '4px' }}>Chest No: {candidate.chestNumber || 'Not assigned'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '2px' }}>Category: {candidate.category?.name}</div>
                  </div>
                </div>
              </td>
              <td style={{ border: '1px solid black', padding: '10px', verticalAlign: 'top' }}>
                {candidate.programs.length === 0 ? (
                  <div style={{ color: '#999', fontStyle: 'italic' }}>No programs assigned.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fafafa' }}>
                        <th style={{ borderBottom: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>Program</th>
                        <th style={{ borderBottom: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>Stage / Venue</th>
                        <th style={{ borderBottom: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>Time</th>
                        <th style={{ borderBottom: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>Slot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidate.programs.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ borderBottom: '1px dotted #ccc', padding: '8px 5px', fontWeight: 'bold' }}>{p.program.name}</td>
                          <td style={{ borderBottom: '1px dotted #ccc', padding: '8px 5px' }}>
                            {p.program.venue ? `${p.program.venue} (${p.program.stageType})` : p.program.stageType}
                          </td>
                          <td style={{ borderBottom: '1px dotted #ccc', padding: '8px 5px' }}>
                            {(p.scheduledTime || p.program.startTime) 
                              ? new Date(p.scheduledTime || p.program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                              : 'TBD'}
                          </td>
                          <td style={{ borderBottom: '1px dotted #ccc', padding: '8px 5px' }}>{p.slotNumber || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.9rem' }}>Generated on: {new Date().toLocaleString()}</div>
        <div style={{ borderTop: '1px solid black', width: '250px', textAlign: 'center', paddingTop: '5px' }}>Institution Manager Signature</div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          @page { margin: 1.5cm; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <PrintButton label="Print Candidate Report" />
      </div>
    </div>
  );
}
