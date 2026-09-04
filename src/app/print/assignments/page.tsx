import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function PrintAssignmentsPage(props: { searchParams: Promise<{ teamId?: string; eventId?: string }> }) {
  const searchParams = await props.searchParams;
  let eventId = searchParams.eventId;
  let teamId = searchParams.teamId;
  
  const session = await getServerSession(authOptions);
  if (session && ["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
    const fullUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { institutionId: true, eventId: true } });
    if (fullUser?.institutionId) {
      const team = await prisma.team.findFirst({
        where: fullUser.eventId 
          ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
          : { institutionId: fullUser.institutionId }
      });
      if (team) {
        teamId = team.id;
        eventId = team.eventId;
      }
    }
  }

  let teamName = "All Teams";
  if (!eventId && teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { eventId: true, name: true }
    });
    if (team) {
      eventId = team.eventId;
      teamName = team.name;
    }
  } else if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true }
    });
    if (team) {
      teamName = team.name;
    }
  }

  const settings = await getSettings(eventId);
  
  const whereClause: any = { }; // removed isApproved: true to show all assigned students
  if (teamId) {
    whereClause.teamId = teamId;
    // For teams, only print candidates that actually have programs assigned
    whereClause.programs = {
      some: {}
    };
  }

  // Fetch all candidates with their programs
  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    include: {
      team: true,
      category: true,
      programs: {
        include: {
          program: {
            include: {
              category: true
            }
          }
        }
      }
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
        <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Program Assignments Summary</h2>
        <p style={{ margin: '5px 0 0 0', fontStyle: 'italic' }}>{settings.festMoto}</p>
        <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>
          Team: {teamName}
        </p>
      </div>

      <div style={{ marginBottom: '20px', fontSize: '0.9rem' }}>
        <strong>Registration Rules Enforced:</strong> Max 2 On-Stage, Max 2 Off-Stage, Max 1 General per student.
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid black', padding: '10px', width: '80px' }}>Chest No</th>
            <th style={{ border: '1px solid black', padding: '10px', width: '250px' }}>Candidate Name</th>
            <th style={{ border: '1px solid black', padding: '10px', width: '150px' }}>Category</th>
            <th style={{ border: '1px solid black', padding: '10px' }}>Assigned Programs</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map(c => (
            <tr key={c.id}>
              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{c.chestNumber}</td>
              <td style={{ border: '1px solid black', padding: '8px', fontWeight: 600 }}>{c.name}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{c.category.name}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>
                {c.programs.length === 0 ? (
                  <span style={{ color: '#666', fontStyle: 'italic' }}>No programs assigned</span>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {c.programs.map(p => (
                      <li key={p.id}>
                        {p.program.name} 
                        {p.program.programCode && ` (${p.program.programCode})`} 
                        <span style={{ fontSize: '0.8em', color: '#555', marginLeft: '5px' }}>
                          [{p.program.stageType.replace('_', ' ')}]
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
          {candidates.length === 0 && (
            <tr>
              <td colSpan={4} style={{ border: '1px solid black', padding: '20px', textAlign: 'center' }}>No assigned candidates found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
        <div>Generated on: {new Date().toLocaleString()}</div>
        <div style={{ borderTop: '1px solid black', width: '200px', textAlign: 'center', paddingTop: '5px' }}>Institution Head Seal & Signature</div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <PrintButton label="Print Assignments List" />
      </div>
    </div>
  );
}
