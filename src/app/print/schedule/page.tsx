import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function PrintSchedulePage(props: {
  searchParams: Promise<{ eventId?: string; teamId?: string }>;
}) {
  const searchParams = await props.searchParams;
  let eventId = searchParams.eventId;
  const teamId = searchParams.teamId;

  let team: any = null;
  if (teamId) {
    team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: {
          include: { parent: true }
        },
        institution: true
      }
    });
    if (team) {
      eventId = team.eventId;
    }
  }

  // If printing for a team/institution, verify schedule is published by Zone Admin
  if (teamId && team) {
    const isSchedulePublished = team.event?.statusOverride === "SCHEDULE_PUBLISHED" || 
      team.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";
    
    if (!isSchedulePublished) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: '#b45309', marginBottom: '8px' }}>On-Stage Schedule Not Yet Published</h2>
          <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6 }}>
            The official On-Stage program schedule is currently being finalized by the Zone Admin. 
            Schedule printing will become available immediately after the Zone Admin updates and publishes the final timings.
          </p>
          <div style={{ marginTop: '24px' }}>
            <a href="/dashboard/schedule" style={{ padding: '8px 16px', backgroundColor: '#8E0033', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              &larr; Back to Schedule Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  const settings = await getSettings(eventId);

  let whereClause: any = {
    // Only ON-STAGE programs have stage schedules and timings
    stageType: "ON_STAGE"
  };

  if (eventId) {
    const activeEv = await prisma.event.findUnique({ where: { id: eventId } });
    if (activeEv?.parentId) {
      whereClause.OR = [
        { eventId: eventId },
        { eventId: activeEv.parentId }
      ];
    } else {
      whereClause.eventId = eventId;
    }
  }

  if (teamId) {
    whereClause.assignments = {
      some: {
        candidate: {
          teamId
        }
      }
    };
  }

  const programs = await prisma.program.findMany({
    where: whereClause,
    orderBy: { startTime: 'asc' },
    include: { category: true, event: true }
  });

  return (
    <div style={{ padding: '40px', backgroundColor: 'white', color: 'black', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid black', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 5px 0' }}>{settings.festName}</h1>
        <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Official On-Stage Program Schedule</h2>
        {team ? (
          <p style={{ margin: '5px 0 0 0', fontWeight: 700, color: '#1e293b' }}>
            Institution / Team: {team.institution?.name || team.name} ({team.prefixCode})
          </p>
        ) : (
          <p style={{ margin: '5px 0 0 0', fontStyle: 'italic' }}>{settings.festMoto}</p>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid black', padding: '10px' }}>Time</th>
            <th style={{ border: '1px solid black', padding: '10px' }}>Program Name</th>
            <th style={{ border: '1px solid black', padding: '10px' }}>Category</th>
            <th style={{ border: '1px solid black', padding: '10px' }}>Venue</th>
            <th style={{ border: '1px solid black', padding: '10px' }}>Stage</th>
          </tr>
        </thead>
        <tbody>
          {programs.map(p => (
            <tr key={p.id}>
              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>
                {p.startTime ? new Date(p.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
              </td>
              <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>{p.name}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{p.category?.name || 'General'}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{p.venue || '-'}</td>
              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>{p.stageType}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
        <div>Generated on: {new Date().toLocaleString()}</div>
        <div style={{ borderTop: '1px solid black', width: '200px', textAlign: 'center', paddingTop: '5px' }}>Convener Signature</div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <PrintButton label="Print Schedule" />
      </div>
    </div>
  );
}
