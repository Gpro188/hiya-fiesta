"use client";

import PrintButton from "@/components/PrintButton";

export default function BulkIdCardsClient({ candidates, settings }: { candidates: any[], settings: any }) {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Bulk ID Card Printing</h1>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>Found {candidates.length} approved candidates</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <PrintButton label="Print All Cards" color="#4F46E5" />
          <button onClick={() => window.history.back()} style={{ padding: '8px 16px', backgroundColor: '#9ca3af', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.875rem' }}>
            ← Back
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, 350px)', 
        gap: '20px', 
        justifyContent: 'center' 
      }}>
        {candidates.map(candidate => (
          <div key={candidate.id} className="id-card-wrapper" style={{ 
            width: '350px', 
            height: '550px', 
            backgroundColor: 'white', 
            borderRadius: '15px', 
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid #e5e7eb',
            pageBreakInside: 'avoid',
            marginBottom: '20px'
          }}>
            {/* Header Design */}
            <div style={{ 
              height: '60px', 
              backgroundColor: candidate.team.flagColor || '#4F46E5',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              padding: '8px',
              textAlign: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{settings.festName}</h2>
              <p style={{ margin: 0, fontSize: '0.5rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Official Candidate Card</p>
            </div>

            {/* Photo & Chest Number Section */}
            <div style={{ padding: '20px 15px 5px 15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                {/* Photo */}
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '10px', 
                  backgroundColor: '#f3f4f6', 
                  border: '3px solid #fff',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}>
                  {candidate.photoUrl ? (
                    <img src={candidate.photoUrl} alt={candidate.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>👤</div>
                  )}
                </div>
              </div>

              {/* Faint Background Text */}
              <div style={{ 
                position: 'absolute', 
                top: '90px', 
                left: '0', 
                right: '0', 
                textAlign: 'center', 
                zIndex: 1, 
                opacity: 0.05, 
                fontSize: '2.5rem', 
                fontWeight: 900, 
                pointerEvents: 'none',
                textTransform: 'uppercase'
              }}>
                {candidate.team.name}
              </div>
            </div>

            {/* Candidate Name & Team Badge */}
            <div style={{ textAlign: 'center', padding: '0 15px 5px 15px' }}>
              <h3 style={{ margin: '0 0 1px 0', fontSize: '1.5rem', fontWeight: 900, color: '#1e1b4b' }}>
                {candidate.chestNumber || '??'}
              </h3>
              <div style={{ margin: '0 0 5px 0', fontSize: '0.9rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>
                {candidate.name}
              </div>
              <div style={{ 
                display: 'inline-block', 
                padding: '2px 10px', 
                backgroundColor: `${candidate.team.flagColor}10`, 
                color: candidate.team.flagColor || '#4F46E5',
                borderRadius: '15px',
                fontSize: '0.7rem',
                fontWeight: 800,
                border: `1px solid ${candidate.team.flagColor}20`
              }}>
                {candidate.team.name}
              </div>
            </div>

            {/* Details Section */}
            <div style={{ padding: '0 20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', borderTop: '1px solid #f3f4f6', paddingTop: '10px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Category</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e1b4b' }}>{candidate.category.name}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Event</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e1b4b' }}>CSWC Hiya Fiesta 2026</div>
                </div>
              </div>

              <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, marginBottom: '5px' }}>Programs</div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '4px', 
                maxHeight: '140px', 
                overflow: 'hidden' 
              }}>
                {candidate.programs.slice(0, 10).map((p: any) => (
                  <div key={p.id} style={{ 
                    fontSize: '0.6rem', 
                    backgroundColor: '#f9fafb', 
                    padding: '3px 6px', 
                    borderRadius: '4px',
                    color: '#4b5563',
                    border: '1px solid #e5e7eb',
                    lineHeight: '1.1'
                  }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.program.name}
                    </div>
                    {(p.scheduledTime || p.program.startTime) && (
                      <div style={{ fontSize: '0.5rem', color: '#6b7280' }}>
                        {new Date(p.scheduledTime || p.program.startTime).toLocaleDateString([], { day: '2-digit', month: 'short' })} {new Date(p.scheduledTime || p.program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {p.program.venue ? ` @ ${p.program.venue}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {candidate.programs.length > 10 && (
                <div style={{ fontSize: '0.55rem', color: '#9ca3af', textAlign: 'center', marginTop: '3px' }}>
                  + {candidate.programs.length - 10} more
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '10px 15px', 
              backgroundColor: '#f9fafb', 
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '60px', height: '20px', borderBottom: '1px solid #d1d5db' }}></div>
                <div style={{ fontSize: '0.4rem', color: '#9ca3af' }}>ADMIN</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.5rem', color: '#9ca3af' }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .id-card-wrapper { 
            box-shadow: none !important; 
            border: 1px solid #eee !important;
            margin: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            float: left;
            break-inside: avoid-page;
          }
        }
      `}} />
    </div>
  );
}
