import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import BackButton from "@/components/BackButton";

export default async function CandidateIdCardPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const resolvedParams = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id: resolvedParams.candidateId },
    include: {
      team: true,
      category: true,
      programs: {
        include: { program: true }
      }
    }
  });

  if (!candidate) notFound();

  const settings = await getSettings(candidate.team.eventId);

  return (
    <div style={{ padding: '40px', backgroundColor: '#f3f4f6', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* ID Card Container */}
      <div id="id-card" style={{ 
        width: '350px', 
        height: '550px', 
        backgroundColor: 'white', 
        borderRadius: '15px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #e5e7eb'
      }}>
        {/* Header Design */}
        <div style={{ 
          height: '70px', 
          backgroundColor: candidate.team.flagColor || '#8E0033',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '1px' }}>{settings.festName}</h2>
          <p style={{ margin: 0, fontSize: '0.6rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '2px' }}>Official Candidate Card</p>
        </div>

        {/* Photo & Chest Number Section */}
        <div style={{ padding: '30px 20px 10px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '140px', height: '140px' }}>
            {/* Photo */}
            <div style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '15px', 
              backgroundColor: '#f3f4f6', 
              border: '4px solid #fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {candidate.photo ? (
                <img src={candidate.photo} alt={candidate.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>👤</div>
              )}
            </div>

          </div>

          {/* Faint Background Text */}
          <div style={{ 
            position: 'absolute', 
            top: '120px', 
            left: '0', 
            right: '0', 
            textAlign: 'center', 
            zIndex: 1, 
            opacity: 0.05, 
            fontSize: '3rem', 
            fontWeight: 900, 
            pointerEvents: 'none',
            textTransform: 'uppercase'
          }}>
            {candidate.team.name}
          </div>
        </div>

        {/* Candidate Name & Team Badge */}
        <div style={{ textAlign: 'center', padding: '0 20px 10px 20px' }}>
          <h3 style={{ margin: '0 0 2px 0', fontSize: '1.8rem', fontWeight: 900, color: '#400010' }}>
            {candidate.chestNumber || '??'}
          </h3>
          <div style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>
            {candidate.name}
          </div>
          <div style={{ 
            display: 'inline-block', 
            padding: '4px 15px', 
            backgroundColor: `${candidate.team.flagColor}15`, 
            color: candidate.team.flagColor || '#8E0033',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 800,
            border: `1px solid ${candidate.team.flagColor}30`
          }}>
            {candidate.team.name}
          </div>
        </div>

        {/* Details Section */}
        <div style={{ padding: '0 20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderTop: '1px solid #f3f4f6', paddingTop: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Category</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#400010' }}>{candidate.category.name}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Event</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#400010' }}>CSWC Hiya Fiesta 2026</div>
            </div>
          </div>

          <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
            Assigned Programs
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '6px', 
            maxHeight: '180px', 
            overflow: 'hidden' 
          }}>
            {candidate.programs.slice(0, 10).map(p => {
              const displayTime = p.scheduledTime || p.program.startTime;
              return (
                <div key={p.id} style={{ 
                  fontSize: '0.65rem', 
                  backgroundColor: '#f9fafb', 
                  padding: '4px 6px', 
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  color: '#4b5563',
                  lineHeight: '1.1'
                }}>
                  <div style={{ fontWeight: 700, color: '#400010', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.program.name}
                  </div>
                  {displayTime && (
                    <div style={{ fontSize: '0.55rem', color: 'var(--primary)', marginTop: '1px', fontWeight: 600 }}>
                      {new Date(displayTime).toLocaleDateString([], { day: '2-digit', month: 'short' })} {new Date(displayTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {p.program.venue ? ` @ ${p.program.venue}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
            {candidate.programs.length === 0 && <span style={{ fontSize: '0.7rem', color: '#9ca3af', gridColumn: 'span 2', textAlign: 'center' }}>No programs assigned</span>}
          </div>
          {candidate.programs.length > 10 && (
            <div style={{ fontSize: '0.6rem', color: '#9ca3af', textAlign: 'center', marginTop: '4px' }}>
              + {candidate.programs.length - 10} more programs
            </div>
          )}
        </div>

        {/* Footer Signature */}
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f9fafb', 
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '30px', borderBottom: '1px solid #d1d5db', marginBottom: '4px' }}></div>
            <div style={{ fontSize: '0.5rem', color: '#9ca3af' }}>ADMIN SIGN</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.6rem', color: '#9ca3af' }}>
            Generated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

       <div className="no-print" style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
          <PrintButton label="Print ID Card" color="#8E0033" />
          <BackButton label="← Go Back" />
       </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          #id-card { 
            box-shadow: none !important; 
            border: 1px solid #eee !important;
            margin: 0 auto;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
}
