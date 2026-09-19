import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function PrintInstitutionReportPage(props: {
  searchParams: Promise<{ teamId?: string; institutionId?: string }>;
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
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h2>No Team ID or Institution ID provided.</h2>
        <p style={{ color: '#64748b' }}>Please select your institution to generate the On-Stage Program Entry Sheet.</p>
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
        include: { parent: true, zone: true }
      }
    }
  });

  if (!team) {
    return <div style={{ padding: '40px' }}>Team not found.</div>;
  }

  const settings = await getSettings(team.eventId);
  const eventName = team.event?.name || "Zonal Festival";
  const eventStartDate = team.event?.startDate || team.event?.zoneActiveStartTime;

  // Fetch only candidates registered for ON-STAGE programs
  const candidates = await prisma.candidate.findMany({
    where: { 
      teamId,
      programs: {
        some: {
          program: { stageType: "ON_STAGE" }
        }
      }
    },
    include: {
      category: true,
      programs: {
        where: {
          program: { stageType: "ON_STAGE" }
        },
        include: { program: true },
        orderBy: { program: { name: 'asc' } }
      }
    },
    orderBy: [
      { chestNumber: 'asc' },
      { name: 'asc' }
    ]
  });

  const totalOnStageEntries = candidates.reduce((sum, c) => sum + c.programs.length, 0);

  // Helper to format program scheduled time
  const formatProgramTime = (p: any) => {
    const rawTime = p.scheduledTime || p.program?.startTime;
    if (!rawTime) return "Scheduled";

    const dateObj = new Date(rawTime);
    if (isNaN(dateObj.getTime())) return "Scheduled";

    const dateStr = dateObj.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "2-digit" });
    const timeStr = dateObj.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr}, ${timeStr}`;
  };

  return (
    <div className="entry-sheet-container" style={{ padding: '24px 32px', backgroundColor: 'white', color: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Official Header */}
      <div style={{ textAlign: 'center', borderBottom: '2.5px solid #8E0033', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '6px' }}>
          {settings.festLogo && (
            <img src={settings.festLogo} alt="Logo" style={{ height: '54px', objectFit: 'contain' }} />
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#8E0033', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {settings.festName}
            </h1>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
              {eventName} • Official On-Stage Program Entry & Candidate Verification Sheet
            </div>
          </div>
        </div>
      </div>

      {/* Institution Info Card */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.4fr 1fr', 
        gap: '12px', 
        backgroundColor: '#f8fafc', 
        border: '1.5px solid #cbd5e1', 
        borderRadius: '8px', 
        padding: '12px 18px', 
        marginBottom: '20px',
        fontSize: '0.9rem'
      }}>
        <div>
          <div style={{ marginBottom: '4px' }}>
            <strong style={{ color: '#475569' }}>Institution:</strong>{" "}
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {team.institution?.name || team.name}
            </span>
          </div>
          <div style={{ color: '#475569' }}>
            <strong>Institution Code:</strong> {team.institution?.code || team.prefixCode || 'N/A'} • <strong>Zone:</strong> {team.institution?.zone?.name || team.event?.zone?.name || 'N/A'}
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div>
            <strong style={{ color: '#475569' }}>Total On-Stage Candidates:</strong>{" "}
            <span style={{ fontWeight: 800, color: '#8E0033', fontSize: '1rem' }}>{candidates.length}</span>
          </div>
          <div style={{ color: '#475569', marginTop: '2px' }}>
            <strong>Total Program Allocations:</strong>{" "}
            <span style={{ fontWeight: 800, color: '#0f172a' }}>{totalOnStageEntries}</span>
          </div>
        </div>
      </div>

      {/* Candidates List Table */}
      {candidates.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>No candidates assigned to On-Stage programs for this institution yet.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #334155' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #334155' }}>
              <th style={{ border: '1px solid #94a3b8', padding: '8px 6px', width: '38px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800 }}>SL</th>
              <th style={{ border: '1px solid #94a3b8', padding: '8px 6px', width: '64px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800 }}>PHOTO</th>
              <th style={{ border: '1px solid #94a3b8', padding: '8px 8px', width: '80px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800 }}>CHEST NO</th>
              <th style={{ border: '1px solid #94a3b8', padding: '8px 10px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800 }}>CANDIDATE & CATEGORY</th>
              <th style={{ border: '1px solid #94a3b8', padding: '8px 10px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 800 }}>ASSIGNED ON-STAGE PROGRAMS</th>
              <th style={{ border: '1px solid #94a3b8', padding: '8px 6px', width: '75px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800 }}>GATE ENTRY</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c: any, idx: number) => {
              const photo = c.photoUrl || c.photo;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                    {idx + 1}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {photo ? (
                      <img 
                        src={photo} 
                        alt="" 
                        style={{ width: '50px', height: '58px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #94a3b8', display: 'inline-block' }} 
                      />
                    ) : (
                      <div style={{ width: '50px', height: '58px', backgroundColor: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '1px dashed #94a3b8', margin: '0 auto' }}>
                        👤
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ 
                      backgroundColor: '#f43f5e', 
                      color: 'white', 
                      fontWeight: 900, 
                      fontSize: '0.9rem', 
                      padding: '4px 6px', 
                      borderRadius: '6px',
                      display: 'inline-block',
                      minWidth: '54px'
                    }}>
                      {c.chestNumber || '-'}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', textTransform: 'uppercase' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4f46e5', marginTop: '2px', textTransform: 'uppercase' }}>
                      {c.category?.name || 'GENERAL'}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px 10px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {c.programs.map((as: any) => (
                        <div key={as.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: 800, color: '#1e293b' }}>
                            {as.program?.name}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {as.program?.venue && (
                              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                                {as.program.venue}
                              </span>
                            )}
                            <span style={{ color: '#e11d48', fontWeight: 700, fontSize: '0.78rem' }}>
                              {formatProgramTime(as)}
                            </span>
                            {as.slotNumber && (
                              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 5px', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem' }}>
                                Slot #{as.slotNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ width: '22px', height: '22px', border: '2px solid #64748b', borderRadius: '4px', margin: '0 auto' }}></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Signature Area */}
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px' }}>
        <div style={{ textAlign: 'center', width: '220px' }}>
          <div style={{ height: '50px' }}></div>
          <div style={{ borderTop: '1.5px solid #334155', paddingTop: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
            Institution Manager / Seal
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
          Printed on {new Date().toLocaleString("en-IN")} • {settings.festName} Official Document
        </div>

        <div style={{ textAlign: 'center', width: '220px' }}>
          <div style={{ height: '50px' }}></div>
          <div style={{ borderTop: '1.5px solid #334155', paddingTop: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
            Zone Fest Entry Officer / Seal
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          .entry-sheet-container { padding: 12mm !important; }
          @page { size: A4 portrait; margin: 10mm; }
          tr { page-break-inside: avoid; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
        <PrintButton label="🖨️ Print On-Stage Entry Sheet" />
      </div>
    </div>
  );
}
