import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = 'force-dynamic';

export default async function PrintCandidatesPage(props: { searchParams: Promise<{ teamId?: string; eventId?: string; categoryId?: string }> }) {
  const searchParams = await props.searchParams;
  let eventId = searchParams.eventId;
  let team: any = null;

  if (searchParams.teamId) {
    team = await prisma.team.findUnique({
      where: { id: searchParams.teamId },
      include: {
        institution: { include: { zone: true } },
        event: { include: { zone: true } }
      }
    });
    if (team) {
      eventId = team.eventId;
    }
  }

  const settings = await getSettings(eventId);
  
  const whereClause: any = {};
  if (searchParams.teamId) {
    whereClause.teamId = searchParams.teamId;
  } else if (eventId) {
    whereClause.team = { eventId };
    whereClause.isApproved = true;
  }

  if (searchParams.categoryId && searchParams.categoryId !== "ALL") {
    whereClause.categoryId = searchParams.categoryId;
  }

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    include: {
      team: { include: { institution: true, event: { include: { zone: true } } } },
      category: true,
      programs: {
        include: {
          program: true
        }
      }
    },
    orderBy: [
      { name: 'asc' }
    ]
  });

  // Sort candidates: sequentially by numeric chest number if assigned, else by name
  candidates.sort((a, b) => {
    if (a.chestNumber && b.chestNumber) {
      const numA = parseInt(a.chestNumber, 10);
      const numB = parseInt(b.chestNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.chestNumber.localeCompare(b.chestNumber);
    }
    if (a.chestNumber) return -1;
    if (b.chestNumber) return 1;
    return a.name.localeCompare(b.name);
  });

  const totalProgramsAssigned = candidates.reduce((acc, c) => acc + (c.programs?.length || 0), 0);
  const isConfirmed = team ? team.isAssignmentsConfirmed : candidates.some(c => Boolean(c.chestNumber));

  return (
    <div style={{ padding: '30px 40px', backgroundColor: 'white', color: '#111827', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Official Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2.5px solid #111827', paddingBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '1.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {settings.festName}
        </h1>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Official Registered Students List (With Chest Numbers)
        </h2>
        {settings.festMoto && (
          <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.85rem', color: '#6b7280' }}>
            &ldquo;{settings.festMoto}&rdquo;
          </p>
        )}
      </div>

      {/* Institution / Zone Context Information Box */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '12px 18px', 
        backgroundColor: '#f9fafb', 
        border: '1.5px solid #d1d5db', 
        borderRadius: '6px' 
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.9rem' }}>
          <div>
            <strong style={{ color: '#374151' }}>Institution: </strong>
            <span style={{ fontWeight: 700 }}>{team?.institution?.name || team?.name || "All Participating Institutions"}</span>
          </div>
          <div>
            <strong style={{ color: '#374151' }}>Zone / Event: </strong>
            <span>{team?.event?.zone?.name || team?.institution?.zone?.name || team?.event?.name || "State / Zonal Fest"}</span>
          </div>
          <div>
            <strong style={{ color: '#374151' }}>Registration Status: </strong>
            <span style={{ 
              fontWeight: 800, 
              color: isConfirmed ? '#047857' : '#b45309' 
            }}>
              {isConfirmed ? "✅ CONFIRMED BY ZONE ADMIN" : "⏳ PENDING ZONE CONFIRMATION"}
            </span>
          </div>
          {team?.magazineCode && (
            <div>
              <strong style={{ color: '#374151' }}>Magazine Code: </strong>
              <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#8E0033', backgroundColor: '#fce7f3', padding: '2px 6px', borderRadius: '4px' }}>
                {team.magazineCode}
              </span>
            </div>
          )}
          <div>
            <strong style={{ color: '#374151' }}>Total Registered Students: </strong>
            <span style={{ fontWeight: 700 }}>{candidates.length}</span>
          </div>
          <div>
            <strong style={{ color: '#374151' }}>Total Program Allocations: </strong>
            <span style={{ fontWeight: 700 }}>{totalProgramsAssigned}</span>
          </div>
        </div>
      </div>

      {/* Candidates & Chest Numbers Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #111827', borderBottom: '2px solid #111827' }}>
            <th style={{ border: '1px solid #d1d5db', padding: '8px 6px', width: '36px', textAlign: 'center' }}>#</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px 6px', width: '85px', textAlign: 'center', fontWeight: 800 }}>Chest No</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px 6px', width: '55px', textAlign: 'center' }}>Photo</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px 10px', textAlign: 'left' }}>Candidate Name & UID</th>
            {!team && <th style={{ border: '1px solid #d1d5db', padding: '8px 10px', textAlign: 'left' }}>Team</th>}
            <th style={{ border: '1px solid #d1d5db', padding: '8px 8px', textAlign: 'left', width: '110px' }}>Category</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px 10px', textAlign: 'left' }}>Allocated Programs</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px 6px', width: '100px', textAlign: 'center' }}>Remarks / Sign</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, idx) => {
            const photoSrc = c.photo || c.photoUrl;
            return (
              <tr key={c.id} style={{ pageBreakInside: 'avoid' }}>
                <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
                  {idx + 1}
                </td>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '6px', 
                  textAlign: 'center', 
                  fontWeight: 900, 
                  fontSize: '1.05rem',
                  fontFamily: 'monospace',
                  color: c.chestNumber ? '#047857' : '#9ca3af',
                  backgroundColor: c.chestNumber ? '#f0fdf4' : 'transparent'
                }}>
                  {c.chestNumber || '-'}
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '4px', textAlign: 'center' }}>
                  {photoSrc ? (
                    <img 
                      src={photoSrc} 
                      alt={c.name} 
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        objectFit: 'cover', 
                        borderRadius: '4px', 
                        border: '1px solid #9ca3af',
                        display: 'block',
                        margin: '0 auto'
                      }} 
                    />
                  ) : (
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      backgroundColor: '#f3f4f6', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: '4px', 
                      border: '1px dashed #d1d5db', 
                      fontSize: '1rem',
                      margin: '0 auto'
                    }}>
                      👤
                    </div>
                  )}
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 10px', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>{c.name}</div>
                  {c.uid && (
                    <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#6b7280', marginTop: '2px' }}>
                      UID: {c.uid}
                    </div>
                  )}
                </td>
                {!team && (
                  <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', fontSize: '0.8rem' }}>
                    {c.team?.name}
                  </td>
                )}
                <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', fontWeight: 600, color: '#374151' }}>
                  {c.category.name}
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px 10px', verticalAlign: 'middle' }}>
                  {c.programs.length === 0 ? (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.75rem' }}>No programs allocated</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {c.programs.map((p) => (
                        <span 
                          key={p.id} 
                          style={{ 
                            fontSize: '0.7rem', 
                            padding: '1px 5px', 
                            borderRadius: '3px', 
                            backgroundColor: '#f3f4f6', 
                            border: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {p.program.name} {p.program.stageType === "ON_STAGE" ? "🎭" : "🎨"}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'center' }}>
                  {/* Empty cell for physical invigilator / desk checkmark or signature */}
                </td>
              </tr>
            );
          })}
          {candidates.length === 0 && (
            <tr>
              <td colSpan={team ? 7 : 8} style={{ border: '1px solid #d1d5db', padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                No candidates found for this selection.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Official Signatures & Verification Footer */}
      <div style={{ 
        marginTop: '45px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
        paddingTop: '15px',
        pageBreakInside: 'avoid'
      }}>
        <div style={{ textAlign: 'left', fontSize: '0.8rem', color: '#6b7280' }}>
          <div>Generated on: {new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}</div>
          <div>Festival Management System · Official Master Verification Copy</div>
        </div>

        <div style={{ display: 'flex', gap: '60px' }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ height: '40px' }} />
            <div style={{ borderTop: '1.5px solid #111827', paddingTop: '5px', fontSize: '0.82rem', fontWeight: 700 }}>
              Institution Principal / Manager
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Seal & Signature</div>
          </div>

          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ height: '40px' }} />
            <div style={{ borderTop: '1.5px solid #111827', paddingTop: '5px', fontSize: '0.82rem', fontWeight: 700 }}>
              Zone Convener / Festival Director
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Official Stamp & Signature</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
          @page { margin: 12mm; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
        <PrintButton label="🖨️ Print Candidate List" />
      </div>
    </div>
  );
}
