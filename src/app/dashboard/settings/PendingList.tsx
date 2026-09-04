import { isInstitutionProgram } from "@/lib/programUtils";

export default function PendingList({ programs, teams }: { programs: any[], teams: any[] }) {
  // Programs with 0 assignments (excluding Institution-level programs like Magazine)
  const emptyPrograms = programs.filter(p => !isInstitutionProgram(p) && p._count.assignments === 0);

  // Programs that require participants (especially Group/General, excluding Institution-level programs)
  const groupOrGeneralPrograms = programs.filter(p => !isInstitutionProgram(p) && (p.type === "GROUP" || p.type === "GENERAL"));

  const teamFulfillment = teams.map(team => {
    const underAssigned = groupOrGeneralPrograms.filter(p => {
      // For Group programs, only check if the program category matches or is null
      if (p.type === "GROUP" && p.categoryId) {
        // If team has no candidates in this category, maybe skip? 
        // Actually, let's check if the team is expected to participate.
        // For simplicity, if they have candidates in that category, they should participate.
        const hasCandidatesInCategory = team.candidates.some((c: any) => c.categoryId === p.categoryId);
        if (!hasCandidatesInCategory) return false;
      }

      const count = team.candidates.reduce((acc: number, c: any) => {
        return acc + (c.programs.some((pa: any) => pa.programId === p.id) ? 1 : 0);
      }, 0);
      return count < (p.candidateLimitPerTeam || 1);
    }).map(p => {
       const count = team.candidates.reduce((acc: number, c: any) => {
        return acc + (c.programs.some((pa: any) => pa.programId === p.id) ? 1 : 0);
      }, 0);
      return { name: p.name, current: count, limit: p.candidateLimitPerTeam || 1, type: p.type };
    });

    const candidatesWithNoPrograms = team.candidates.filter((c: any) => c._count.programs === 0);
    
    return { 
      ...team, 
      underAssigned,
      pendingCandidates: candidatesWithNoPrograms.length 
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div>
        <h3 style={{ fontSize: '1rem', color: 'var(--warning)', marginBottom: 'var(--spacing-sm)' }}>
          ⚠️ Empty Programs ({emptyPrograms.length})
        </h3>
        {emptyPrograms.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--success)' }}>All programs have at least one participant.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-sm)' }}>
            {emptyPrograms.map(p => (
              <div key={p.id} style={{ padding: 'var(--spacing-sm)', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.type} • {p.category?.name || 'General'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

      <div>
        <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: 'var(--spacing-sm)' }}>
          📋 Team Fulfillment Status
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {teamFulfillment.map(team => (
            <div key={team.id} className="glass-panel" style={{ 
              padding: 'var(--spacing-md)', 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                <strong>{team.name}</strong>
                <span style={{ fontSize: '0.8rem', color: team.pendingCandidates > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {team.pendingCandidates > 0 ? `${team.pendingCandidates} Candidates without programs` : 'All candidates assigned'}
                </span>
              </div>
              
              {team.underAssigned.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                  {team.underAssigned.map((ua: any, i: number) => (
                    <div key={i} style={{ 
                      fontSize: '0.75rem', 
                      padding: '4px 8px', 
                      backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                      border: '1px solid rgba(245, 158, 11, 0.3)', 
                      borderRadius: '4px',
                      color: 'var(--warning)'
                    }}>
                      {ua.name}: {ua.current}/{ua.limit} ({ua.type})
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✓ All Group/General program limits fulfilled.</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
