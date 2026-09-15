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
      event: true,
      results: {
        orderBy: [
          { rank: 'asc' },
          { marks: 'desc' }
        ],
        include: { candidate: { include: { team: true } }, team: true }
      }
    }
  });

  if (!program) notFound();

  const settings = await getSettings(program.eventId);

  return (
    <div style={{ padding: '40px', backgroundColor: 'white', color: 'black', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px double black', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 5px 0' }}>{settings.festName}</h1>
        <h2 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Official Result Notification</h2>
        <p style={{ margin: '5px 0 0 0', fontStyle: 'italic' }}>{settings.festMoto}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', backgroundColor: '#f9fafb', padding: '15px', border: '1px solid #000' }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>PROGRAM: {program.name}</div>
          <div>CATEGORY: {program.category?.name || 'General'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>EVENT: {program.event.name}</div>
          <div>DATE: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#000', color: '#fff' }}>
            <th style={{ border: '1px solid black', padding: '12px', width: '80px' }}>Rank</th>
            <th style={{ border: '1px solid black', padding: '12px', width: '80px' }}>Grade</th>
            <th style={{ border: '1px solid black', padding: '12px' }}>Candidate Name</th>
            <th style={{ border: '1px solid black', padding: '12px' }}>Chest #</th>
            <th style={{ border: '1px solid black', padding: '12px' }}>Team</th>
          </tr>
        </thead>
        <tbody>
          {program.results.map(res => (
            <tr key={res.id} style={{ fontSize: '1.1rem' }}>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{res.rank || '-'}</td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{res.grade || '-'}</td>
              <td style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>{res.candidate?.name || res.team?.name || '-'}</td>
              <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center' }}>{res.candidate?.chestNumber || '-'}</td>
              <td style={{ border: '1px solid black', padding: '10px' }}>{res.candidate?.team.name || res.team?.name || '-'}</td>
            </tr>
          ))}
          {program.results.length === 0 && (
            <tr>
              <td colSpan={5} style={{ border: '1px solid black', padding: '30px', textAlign: 'center', color: '#666' }}>
                No results recorded yet for this program.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ borderTop: '1px solid black', width: '200px', textAlign: 'center', paddingTop: '5px' }}>
          Result Controller
        </div>
        <div style={{ borderTop: '1px solid black', width: '200px', textAlign: 'center', paddingTop: '5px' }}>
          General Convener
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <PrintButton label="Print for Notice Board" color="#10B981" />
      </div>
    </div>
  );
}
