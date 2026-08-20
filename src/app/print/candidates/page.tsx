import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export default async function PrintCandidatesPage(props: { searchParams: Promise<{ teamId?: string; eventId?: string }> }) {
  const searchParams = await props.searchParams;
  let eventId = searchParams.eventId;
  
  if (!eventId && searchParams.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: searchParams.teamId },
      select: { eventId: true }
    });
    if (team) {
      eventId = team.eventId;
    }
  }

  const settings = await getSettings(eventId);
  
  const whereClause: any = { isApproved: true };
  if (searchParams.teamId) {
    whereClause.teamId = searchParams.teamId;
  } else if (eventId) {
    whereClause.team = { eventId };
  }

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    include: {
      team: true,
      category: true,
    },
    orderBy: [
      { team: { name: 'asc' } },
      { chestNumber: 'asc' }
    ]
  });

  return (
    <div style={{ padding: '40px', backgroundColor: 'white', color: 'black', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid black', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 5px 0' }}>{settings.festName}</h1>
        <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Official Candidate List (Approved)</h2>
        <p style={{ margin: '5px 0 0 0', fontStyle: 'italic' }}>{settings.festMoto}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid black', padding: '10px', width: '120px' }}>Chest No</th>
            <th style={{ border: '1px solid black', padding: '10px' }}>Candidate Name</th>
            <th style={{ border: '1px solid black', padding: '10px' }}>Team</th>
            <th style={{ border: '1px solid black', padding: '10px' }}>Category</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map(c => (
            <tr key={c.id}>
              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{c.chestNumber}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{c.name}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{c.team.name}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{c.category.name}</td>
            </tr>
          ))}
          {candidates.length === 0 && (
            <tr>
              <td colSpan={4} style={{ border: '1px solid black', padding: '20px', textAlign: 'center' }}>No approved candidates found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
        <div>Generated on: {new Date().toLocaleString()}</div>
        <div style={{ borderTop: '1px solid black', width: '200px', textAlign: 'center', paddingTop: '5px' }}>Office Seal & Signature</div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <PrintButton label="Print Candidate List" />
      </div>
    </div>
  );
}
