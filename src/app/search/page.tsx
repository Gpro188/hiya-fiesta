import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SearchClient from "./SearchClient";
import { getSettings } from "@/lib/settings";

export default async function SearchPage(props: {
  searchParams: Promise<{ 
    q?: string; 
    type?: string; 
    categoryId?: string; 
    stageType?: string; 
    programType?: string;
    eventId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId || "";
  const settings = await getSettings(eventId);
  const festName = settings.festName;
  const query = searchParams.q || "";
  const type = searchParams.type || "chestNumber"; 
  const categoryId = searchParams.categoryId || "";
  const stageType = searchParams.stageType || "";
  const programType = searchParams.programType || "";
  
  // If eventId is provided, filter events dropdown to the main event & its sub-events
  let eventWhere: any = {};
  if (eventId) {
    const targetEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, parentId: true }
    });
    const rootId = targetEvent?.parentId || eventId;
    eventWhere = {
      OR: [
        { id: rootId },
        { parentId: rootId }
      ]
    };
  }

  const rawEvents = await prisma.event.findMany({
    where: eventWhere,
    select: { id: true, name: true, parentId: true },
    orderBy: { createdAt: 'desc' }
  });

  // Deduplicate by name/id so event names don't repeat in dropdowns
  const seenNames = new Set<string>();
  const events = rawEvents.filter(ev => {
    const key = ev.name.trim().toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  const categories = await prisma.category.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { name: 'asc' }
  });

  let candidateResults: any[] = [];
  let programResults: any[] = [];

  if (query || categoryId || stageType || programType || eventId) {
    if (type === "chestNumber") {
      const candidateWhere: any = {};
      
      const filters: any[] = [];
      if (query) {
        filters.push({
          OR: [
            { uid: { contains: query, mode: 'insensitive' } },
            { chestNumber: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { team: { name: { contains: query, mode: 'insensitive' } } },
            { team: { prefixCode: { contains: query, mode: 'insensitive' } } }
          ]
        });
      }
      if (categoryId) filters.push({ categoryId });
      if (eventId) filters.push({ team: { eventId } });

      if (filters.length > 0) {
        candidateWhere.AND = filters;
      }

      candidateResults = await prisma.candidate.findMany({
        where: candidateWhere,
        include: {
          team: true,
          category: true,
          programs: { 
            where: {
              program: {
                AND: [
                  stageType ? { stageType: stageType as any } : {},
                  programType ? { type: programType as any } : {}
                ]
              }
            },
            include: { program: true } 
          },
          results: {
            include: { program: true }
          }
        }
      });
    } else if (type === "program") {
      const programWhere: any = {};
      const filters: any[] = [];

      if (query) {
        filters.push({
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { programCode: { contains: query, mode: 'insensitive' } }
          ]
        });
      }
      if (categoryId) filters.push({ categoryId });
      if (eventId) filters.push({ eventId });
      if (stageType) filters.push({ stageType: stageType as any });
      if (programType) filters.push({ type: programType as any });

      if (filters.length > 0) {
        programWhere.AND = filters;
      }

      programResults = await prisma.program.findMany({
        where: programWhere,
        include: {
          event: true,
          category: true,
          results: {
            orderBy: { marks: 'desc' },
            include: { candidate: { include: { team: true } } }
          },
          assignments: {
            include: { candidate: { include: { team: true } } }
          }
        }
      });
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: 'var(--spacing-md) 0', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {settings.festLogo ? (
                <img src={settings.festLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {festName.charAt(0)}
                </div>
              )}
            </div>
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{festName}</h1>
          </Link>
          <Link href="/" style={{ color: 'var(--text-secondary)' }}>Back to Home</Link>
        </div>
      </header>

      <main style={{ flex: 1, padding: 'var(--spacing-xl) 0' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Advanced Programme & Result Search</h2>
          
          <SearchClient 
            initialQuery={query} 
            initialType={type} 
            events={events}
            categories={categories}
            initialEventId={eventId}
            initialCategoryId={categoryId}
            initialStageType={stageType}
            initialProgramType={programType}
          />
          
          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            {type === "chestNumber" && (
              <div>
                {(query || categoryId || eventId) && candidateResults.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No candidates found matching your criteria.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    {candidateResults.map(candidate => (
                      <div key={candidate.id} className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                        <h3 style={{ color: 'var(--primary)', marginBottom: 'var(--spacing-xs)' }}>
                          {candidate.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>({candidate.chestNumber})</span>
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                          <div style={{ width: '4px', height: '40px', backgroundColor: candidate.team.flagColor || 'var(--primary)', borderRadius: 'var(--radius-full)' }}></div>
                          <div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              Team: <strong style={{ color: candidate.team.flagColor || 'inherit' }}>{candidate.team.name}</strong> • {candidate.category.name}
                            </div>
                          </div>
                        </div>
                                               <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: '1rem' }}>Schedule & Results</h4>
                        {candidate.programs.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No programs matching filters for this candidate.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            {candidate.programs.map((p: any) => {
                              const progStartTime = p.program.startTime ? new Date(p.program.startTime) : null;
                              const isFinished = progStartTime && (progStartTime.getTime() + (p.program.duration * 60000)) < new Date().getTime();
                              const hasResult = candidate.results.some((r: any) => r.programId === p.programId);
                              const isEntered = hasResult || isFinished;
                              
                              return (
                                <div key={p.id} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  padding: 'var(--spacing-sm)', 
                                  backgroundColor: 'rgba(255,255,255,0.03)', 
                                  borderRadius: 'var(--radius-sm)', 
                                  borderLeft: `3px solid ${isEntered ? 'var(--success)' : 'var(--primary)'}` 
                                }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontWeight: 600 }}>{p.program.name}</span>
                                      <span style={{ 
                                        fontSize: '0.65rem', 
                                        padding: '2px 6px', 
                                        borderRadius: '10px', 
                                        backgroundColor: isEntered ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        color: isEntered ? 'var(--success)' : 'var(--primary)',
                                        border: `1px solid ${isEntered ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                                      }}>
                                        {isEntered ? 'ENTERED' : 'UPCOMING'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {p.program.startTime ? (
                                        <>
                                          {new Date(p.program.startTime).toLocaleDateString()} • {new Date(p.program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </>
                                      ) : 'Time TBD'} 
                                      {p.program.venue ? ` @ ${p.program.venue}` : ''}
                                      {p.slotNumber && ` • Slot #${p.slotNumber}`}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                    {candidate.results.find((r: any) => r.programId === p.programId) && (
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#FCD34D', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                          {candidate.results.find((r: any) => r.programId === p.programId).rank ? `Rank ${candidate.results.find((r: any) => r.programId === p.programId).rank}` : ''}
                                        </div>
                                        <div style={{ color: 'var(--success)', fontSize: '0.8rem' }}>
                                          {candidate.results.find((r: any) => r.programId === p.programId).grade ? `Grade ${candidate.results.find((r: any) => r.programId === p.programId).grade}` : ''}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {type === "program" && (
              <div>
                {(query || categoryId || eventId || stageType || programType) && programResults.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No programs found matching your criteria.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    {programResults.map(program => (
                      <div key={program.id} className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                        <Link href={`/results/${program.id}`} style={{ textDecoration: 'none' }}>
                          <h3 style={{ color: 'var(--primary)', marginBottom: 'var(--spacing-xs)', cursor: 'pointer' }}>
                            {program.name} 
                            {program.category && (
                              <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>({program.category.name})</span>
                            )}
                          </h3>
                        </Link>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                          Event: <strong>{program.event.name}</strong> • Type: <strong>{program.type}</strong> • <strong>{program.stageType}</strong>
                          {program.startTime && ` • ${new Date(program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          {program.venue && ` @ ${program.venue}`}
                        </div>
                        
                        <h4 style={{ marginBottom: 'var(--spacing-sm)', fontSize: '1rem' }}>Winners List</h4>
                        {program.results.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No published results for this program.</div>
                        ) : (
                          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                <th style={{ padding: 'var(--spacing-sm) 0' }}>Candidate</th>
                                <th>Team</th>
                                <th>Rank</th>
                                <th>Grade</th>
                                <th>Poster</th>
                              </tr>
                            </thead>
                            <tbody>
                              {program.results.map((res: any) => (
                                <tr key={res.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: 'var(--spacing-sm) 0' }}>{res.candidate.name} <span style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>({res.candidate.chestNumber})</span></td>
                                  <td>{res.candidate.team.name}</td>
                                  <td style={{ color: '#FCD34D', fontWeight: res.rank ? 'bold' : 'normal' }}>{res.rank || '-'}</td>
                                  <td style={{ color: 'var(--success)', fontWeight: res.grade ? 'bold' : 'normal' }}>{res.grade || '-'}</td>
                                  <td>
                                    <Link href={`/results/${program.id}`} style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>Full Board</Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
