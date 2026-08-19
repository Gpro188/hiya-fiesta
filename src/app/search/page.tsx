import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SearchClient from "./SearchClient";
import { getSettings } from "@/lib/settings";
import PublicNav from "@/app/components/PublicNav";
import PublicFooter from "@/app/components/PublicFooter";

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

  const rawCategories = await prisma.category.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { name: 'asc' },
    select: { name: true }
  });
  
  const categoryNames = Array.from(new Set(rawCategories.map(c => c.name))).sort();
  const categories = categoryNames.map(name => ({ id: name, name }));

  let candidateResults: any[] = [];
  let programResults: any[] = [];

  if (query || categoryId || stageType || programType || eventId) {
    if (type === "chestNumber") {
      const candidateWhere: any = {};
      
      const filters: any[] = [];
      if (query) {
        filters.push({
          OR: [
            { uid: { contains: query } },
            { chestNumber: { contains: query } },
            { name: { contains: query } },
            { team: { name: { contains: query } } },
            { team: { prefixCode: { contains: query } } }
          ]
        });
      }
      if (categoryId) filters.push({ category: { name: categoryId } });
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
            where: { isPublished: true },
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
            { name: { contains: query } },
            { programCode: { contains: query } }
          ]
        });
      }
      if (categoryId) filters.push({ category: { name: categoryId } });
      if (eventId) {
        const targetEvent = await prisma.event.findUnique({ where: { id: eventId } });
        filters.push({
          OR: [
            { eventId: eventId },
            ...(targetEvent?.parentId ? [{ eventId: targetEvent.parentId }] : [])
          ]
        });
      }
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
            where: eventId ? { candidate: { team: { eventId } } } : {},
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFF8FA', fontFamily: 'Manrope, sans-serif' }}>
      <PublicNav eventName={festName} showSearch={false} />

      <main style={{ flex: 1, padding: '2.5rem 0' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
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
                  <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #f2d9e6' }}>
                    <p style={{ color: '#7a7480', fontSize: '1rem', margin: 0 }}>No candidates found matching your criteria.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {candidateResults.map(candidate => (
                      <div 
                        key={candidate.id} 
                        style={{ 
                          background: '#FFFFFF', 
                          borderRadius: '18px', 
                          padding: '24px 22px',
                          border: '1px solid #f2d9e6',
                          borderLeft: `5px solid ${candidate.team.flagColor || '#e6007e'}`,
                          boxShadow: '0 4px 18px -3px rgba(230, 0, 126, 0.06)'
                        }}
                      >
                        <h3 style={{ color: '#1a1420', fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: '1.25rem', margin: '0 0 6px 0' }}>
                          {candidate.name} <span style={{ color: '#7a7480', fontSize: '0.85rem', fontFamily: "'IBM Plex Mono', monospace" }}>({candidate.chestNumber})</span>
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                          <div style={{ width: '4px', height: '32px', backgroundColor: candidate.team.flagColor || '#e6007e', borderRadius: '9999px' }}></div>
                          <div style={{ color: '#7a7480', fontSize: '0.875rem' }}>
                            Team: <strong style={{ color: '#1a1420' }}>{candidate.team.name}</strong> • Category: <strong style={{ color: '#e6007e' }}>{candidate.category.name}</strong>
                          </div>
                        </div>

                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontFamily: "'Fraunces', serif", color: '#1a1420', fontWeight: 800 }}>
                          Schedule & Results
                        </h4>
                        {candidate.programs.length === 0 ? (
                          <div style={{ color: '#7a7480', fontSize: '0.85rem' }}>No programs matching filters for this candidate.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {candidate.programs.map((p: any) => {
                              const progStartTime = p.program.startTime ? new Date(p.program.startTime) : null;
                              const isFinished = progStartTime && (progStartTime.getTime() + (p.program.duration * 60000)) < new Date().getTime();
                              const resMatch = candidate.results.find((r: any) => r.programId === p.programId);
                              const hasResult = !!resMatch;
                              const isEntered = hasResult || isFinished;
                              const winnerUrl = `/results/${p.programId}?eventId=${candidate.team?.eventId || ''}`;
                              
                              return (
                                <div key={p.id} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  padding: '12px 14px', 
                                  backgroundColor: '#FFF8FA', 
                                  borderRadius: '12px', 
                                  border: '1px solid #f9ebf2',
                                  borderLeft: `4px solid ${isEntered ? '#10b981' : '#e6007e'}` 
                                }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <Link href={winnerUrl} style={{ fontWeight: 800, color: '#1a1420', textDecoration: 'none' }}>
                                        {p.program.name}
                                      </Link>
                                      <span style={{ 
                                        fontSize: '0.68rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '9999px', 
                                        backgroundColor: isEntered ? '#dcfce7' : '#fcebf3',
                                        color: isEntered ? '#15803d' : '#e6007e',
                                        fontWeight: 800
                                      }}>
                                        {isEntered ? 'COMPLETED' : 'UPCOMING'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#7a7480', marginTop: '2px' }}>
                                      {p.program.startTime ? (
                                        <>
                                          {new Date(p.program.startTime).toLocaleDateString()} • {new Date(p.program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </>
                                      ) : 'Time TBD'} 
                                      {p.program.venue ? ` @ ${p.program.venue}` : ''}
                                      {p.slotNumber && ` • Slot #${p.slotNumber}`}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {resMatch && (
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#d97706', fontWeight: 800, fontSize: '0.88rem' }}>
                                          {resMatch.rank ? `Rank #${resMatch.rank}` : ''}
                                        </div>
                                        <div style={{ color: '#e6007e', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                                          {resMatch.grade ? `Grade ${resMatch.grade}` : ''}
                                        </div>
                                        <Link 
                                          href={winnerUrl} 
                                          style={{ 
                                            padding: '4px 10px', 
                                            fontSize: '0.72rem', 
                                            fontWeight: 800,
                                            borderRadius: '6px',
                                            background: 'linear-gradient(135deg, #e6007e, #a3005c)',
                                            color: '#FFFFFF',
                                            textDecoration: 'none',
                                            display: 'inline-block'
                                          }}
                                        >
                                          Winner Board →
                                        </Link>
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
                  <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #f2d9e6' }}>
                    <p style={{ color: '#7a7480', fontSize: '1rem', margin: 0 }}>No programs found matching your criteria.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {programResults.map(program => {
                      const publishedResults = program.results.filter((r: any) => r.isPublished);
                      const isPublished = publishedResults.length > 0;
                      const winnerUrl = `/results/${program.id}?eventId=${eventId || program.eventId}`;

                      return (
                        <div 
                          key={program.id} 
                          style={{ 
                            background: '#FFFFFF', 
                            borderRadius: '18px', 
                            padding: '24px 22px',
                            border: '1px solid #f2d9e6',
                            borderLeft: `5px solid ${isPublished ? '#e6007e' : '#cbd5e1'}`,
                            boxShadow: '0 4px 18px -3px rgba(230, 0, 126, 0.06)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              <Link href={winnerUrl} style={{ textDecoration: 'none' }}>
                                <h3 style={{ 
                                  color: '#1a1420', 
                                  fontFamily: "'Fraunces', serif", 
                                  fontWeight: 800, 
                                  fontSize: '1.25rem', 
                                  margin: '0 0 6px 0', 
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  {program.name} 
                                  {program.category && (
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      padding: '2px 8px', 
                                      borderRadius: '6px', 
                                      background: '#fcebf3', 
                                      color: '#e6007e', 
                                      fontFamily: "'Inter', sans-serif",
                                      fontWeight: 700 
                                    }}>
                                      {program.category.name}
                                    </span>
                                  )}
                                </h3>
                              </Link>
                              <div style={{ color: '#7a7480', fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                <span>Event: <strong style={{ color: '#1a1420' }}>{program.event.name}</strong></span>
                                <span>•</span>
                                <span>Type: <strong>{program.type}</strong></span>
                                <span>•</span>
                                <span>Stage: <strong>{program.stageType}</strong></span>
                                {program.startTime && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(program.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </>
                                )}
                                {program.venue && (
                                  <>
                                    <span>•</span>
                                    <span>@{program.venue}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <Link 
                              href={winnerUrl}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: isPublished ? 'linear-gradient(135deg, #e6007e, #a3005c)' : '#f1f5f9',
                                color: isPublished ? '#FFFFFF' : '#475569',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                textDecoration: 'none',
                                boxShadow: isPublished ? '0 3px 10px rgba(230, 0, 126, 0.25)' : 'none',
                                flexShrink: 0
                              }}
                            >
                              <span>🏆</span> {isPublished ? 'View Winner Board' : 'View Program'}
                            </Link>
                          </div>
                          
                          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f9ebf2' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={{ margin: 0, fontSize: '0.92rem', fontFamily: "'Fraunces', serif", color: '#1a1420', fontWeight: 800 }}>
                                Winners List
                              </h4>
                              {isPublished ? (
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  padding: '3px 10px', 
                                  borderRadius: '9999px', 
                                  background: '#dcfce7', 
                                  color: '#15803d', 
                                  fontWeight: 800 
                                }}>
                                  PUBLISHED
                                </span>
                              ) : (
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  padding: '3px 10px', 
                                  borderRadius: '9999px', 
                                  background: '#fef2f2', 
                                  color: '#b91c1c', 
                                  fontWeight: 700 
                                }}>
                                  PENDING
                                </span>
                              )}
                            </div>

                            {isPublished ? (
                              <div>
                                {/* Desktop View: Table */}
                                <div className="hidden sm:block" style={{ overflowX: 'auto', width: '100%' }}>
                                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1.5px solid #f2d9e6', color: '#7a7480', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '8px 6px', width: '35%' }}>Candidate</th>
                                        <th style={{ padding: '8px 6px', width: '35%' }}>Team</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>Rank</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>Grade</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Board</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {publishedResults.map((res: any) => {
                                        const rankGold = res.rank === 1 ? '#F59E0B' : res.rank === 2 ? '#94A3B8' : res.rank === 3 ? '#D97706' : '#7a7480';
                                        return (
                                          <tr key={res.id} style={{ borderBottom: '1px solid #fbeff5' }}>
                                            <td style={{ padding: '10px 6px', verticalAlign: 'middle' }}>
                                              <div style={{ fontWeight: 800, color: '#1a1420' }}>{res.candidate.name}</div>
                                              <div style={{ color: '#7a7480', fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                                                {res.candidate.chestNumber}
                                              </div>
                                            </td>
                                            <td style={{ padding: '10px 6px', verticalAlign: 'middle', color: '#332938', fontWeight: 600 }}>
                                              {res.candidate.team.name}
                                            </td>
                                            <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                              {res.rank ? (
                                                <span style={{
                                                  background: rankGold,
                                                  color: '#FFFFFF',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 900,
                                                  padding: '2px 8px',
                                                  borderRadius: '6px'
                                                }}>
                                                  #{res.rank}
                                                </span>
                                              ) : '-'}
                                            </td>
                                            <td style={{ padding: '10px 6px', color: '#e6007e', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle' }}>
                                              {res.grade || '-'}
                                            </td>
                                            <td style={{ padding: '10px 6px', textAlign: 'right', verticalAlign: 'middle' }}>
                                              <Link 
                                                href={winnerUrl} 
                                                style={{ 
                                                  color: '#e6007e', 
                                                  fontWeight: 800,
                                                  textDecoration: 'none',
                                                  padding: '4px 10px',
                                                  backgroundColor: '#fcebf3',
                                                  borderRadius: '6px',
                                                  fontSize: '0.75rem',
                                                  display: 'inline-block'
                                                }}
                                              >
                                                Winner Board →
                                              </Link>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Mobile View: Compact Cards */}
                                <div className="block sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {publishedResults.map((res: any) => {
                                    const rankGold = res.rank === 1 ? '#F59E0B' : res.rank === 2 ? '#94A3B8' : res.rank === 3 ? '#D97706' : '#7a7480';
                                    return (
                                      <div 
                                        key={res.id} 
                                        style={{ 
                                          padding: '12px 14px', 
                                          background: '#FFF8FA', 
                                          borderRadius: '12px', 
                                          border: '1px solid #f9ebf2',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: '10px'
                                        }}
                                      >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            {res.rank && (
                                              <span style={{
                                                background: rankGold,
                                                color: '#FFFFFF',
                                                fontSize: '0.7rem',
                                                fontWeight: 900,
                                                padding: '2px 6px',
                                                borderRadius: '5px'
                                              }}>
                                                #{res.rank}
                                              </span>
                                            )}
                                            <span style={{ fontWeight: 800, color: '#1a1420', fontSize: '0.9rem' }}>
                                              {res.candidate.name}
                                            </span>
                                            {res.grade && (
                                              <span style={{ color: '#e6007e', fontWeight: 800, fontSize: '0.75rem' }}>
                                                • Grade {res.grade}
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: '#7a7480', marginTop: '2px', wordBreak: 'break-word' }}>
                                            {res.candidate.team.name}
                                          </div>
                                          {res.candidate.chestNumber && (
                                            <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontFamily: "'IBM Plex Mono', monospace" }}>
                                              Chest #{res.candidate.chestNumber}
                                            </div>
                                          )}
                                        </div>

                                        <Link 
                                          href={winnerUrl} 
                                          style={{ 
                                            color: '#e6007e', 
                                            fontWeight: 800,
                                            textDecoration: 'none',
                                            padding: '6px 10px',
                                            backgroundColor: '#fcebf3',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            flexShrink: 0,
                                            textAlign: 'center'
                                          }}
                                        >
                                          Board →
                                        </Link>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter eventName={festName} />
    </div>
  );
}
