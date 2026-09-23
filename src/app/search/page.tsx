import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SearchClient from "./SearchClient";
import { getSettings } from "@/lib/settings";
import PublicNav from "@/app/components/PublicNav";
import PublicFooter from "@/app/components/PublicFooter";
import { formatInstitutionDisplay } from "@/lib/formatUtils";

export default async function SearchPage(props: {
  searchParams: Promise<{ 
    q?: string; 
    type?: string; 
    categoryId?: string; 
    stageType?: string; 
    sortBy?: string;
    eventId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId || "";
  const settings = await getSettings(eventId);
  const festName = settings.festName;
  const query = (searchParams.q || "").trim();
  // Default type to "programCode" if no query is given, so results board is shown by default!
  const type = searchParams.type || (query ? "chestNumber" : "programCode");
  const categoryId = searchParams.categoryId || "";
  const stageType = searchParams.stageType || "";
  const sortBy = searchParams.sortBy || "code";

  // If eventId is provided, get target event info
  const targetEvent = eventId ? await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, type: true, parentId: true }
  }) : null;
  const activeEventName = targetEvent?.name || "";

  // If eventId is provided, filter events dropdown to the main event & its sub-events
  let eventWhere: any = {};
  if (eventId) {
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

  // Deduplicate events by name
  const seenNames = new Set<string>();
  const events = rawEvents.filter(ev => {
    const key = ev.name.trim().toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  const categoryEventIds = [eventId, targetEvent?.parentId].filter(Boolean) as string[];
  const rawCategories = await prisma.category.findMany({
    where: categoryEventIds.length > 0 ? { eventId: { in: categoryEventIds } } : {},
    orderBy: { name: 'asc' },
    select: { name: true }
  });
  
  const categoryNames = Array.from(new Set(rawCategories.map(c => c.name))).sort();
  const categories = categoryNames.map(name => ({ id: name, name }));

  let candidateResults: any[] = [];
  let programResults: any[] = [];

  // Results filter for active zone / event
  const zoneResultFilter = {
    isPublished: true,
    ...(eventId ? {
      OR: [
        { team: { eventId } },
        { candidate: { team: { eventId } } }
      ]
    } : {})
  };

  if (type === "chestNumber" && query) {
    // Mode 1: Search by Chest Number (or Name / UID)
    const candidateWhere: any = {};
    const filters: any[] = [];

    filters.push({
      OR: [
        { chestNumber: { equals: query } },
        { chestNumber: { contains: query } },
        { uid: { contains: query } },
        { name: { contains: query, mode: "insensitive" } }
      ]
    });

    if (categoryId && categoryId !== "ALL") {
      filters.push({ category: { name: { equals: categoryId, mode: "insensitive" } } });
    }
    if (eventId) {
      filters.push({ team: { eventId } });
    }

    candidateWhere.AND = filters;

    candidateResults = await prisma.candidate.findMany({
      where: candidateWhere,
      include: {
        team: {
          include: {
            institution: true,
            event: true
          }
        },
        category: true,
        programs: { 
          where: {
            program: {
              AND: [
                stageType ? { stageType: stageType as any } : {}
              ]
            }
          },
          include: { program: true } 
        },
        results: {
          where: zoneResultFilter,
          include: { program: true }
        }
      }
    });
  } else {
    // Mode 2: Program Code Search OR Default Results Board
    const progFilters: any[] = [];

    if (query) {
      progFilters.push({
        OR: [
          { programCode: { equals: query } },
          { programCode: { contains: query } },
          { name: { contains: query, mode: "insensitive" } }
        ]
      });
    }

    if (categoryId && categoryId !== "ALL") {
      if (categoryId === "GENERAL") {
        progFilters.push({
          OR: [
            { type: "GENERAL" },
            { categoryId: null },
            { category: { name: { equals: "GENERAL", mode: "insensitive" } } }
          ]
        });
      } else {
        progFilters.push({
          category: { name: { equals: categoryId, mode: "insensitive" } }
        });
      }
    }

    if (stageType) {
      progFilters.push({ stageType: stageType as any });
    }

    // When browsing without a specific query, only show programs that have published results
    if (!query) {
      progFilters.push({
        results: {
          some: zoneResultFilter
        }
      });
    }

    const rawProgramResults = await prisma.program.findMany({
      where: progFilters.length > 0 ? { AND: progFilters } : {},
      include: {
        event: true,
        category: true,
        results: {
          where: zoneResultFilter,
          orderBy: [
            { rank: 'asc' },
            { marks: 'desc' }
          ],
          include: {
            candidate: {
              include: {
                team: {
                  include: { institution: true }
                },
                category: true
              }
            },
            team: {
              include: { institution: true }
            }
          }
        }
      }
    });

    // Deduplicate programs by programCode
    const programMap = new Map<string, typeof rawProgramResults[0]>();
    for (const prog of rawProgramResults) {
      const key = prog.programCode ? `code_${prog.programCode}` : prog.id;
      const existing = programMap.get(key);
      if (!existing) {
        programMap.set(key, prog);
      } else {
        existing.results = Array.from(new Set([...existing.results, ...prog.results]));
      }
    }
    programResults = Array.from(programMap.values());

    // Sort according to sortBy
    if (sortBy === "code") {
      programResults.sort((a, b) => {
        const codeA = Number(a.programCode) || 0;
        const codeB = Number(b.programCode) || 0;
        if (codeA !== codeB) return codeA - codeB;
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy === "recent") {
      programResults.sort((a, b) => {
        const maxA = Math.max(...a.results.map((r: any) => new Date(r.updatedAt || r.createdAt).getTime()), 0);
        const maxB = Math.max(...b.results.map((r: any) => new Date(r.updatedAt || r.createdAt).getTime()), 0);
        return maxB - maxA;
      });
    } else if (sortBy === "rank") {
      programResults.sort((a, b) => {
        const hasRank1A = a.results.some((r: any) => r.rank === 1) ? 1 : 0;
        const hasRank1B = b.results.some((r: any) => r.rank === 1) ? 1 : 0;
        if (hasRank1A !== hasRank1B) return hasRank1B - hasRank1A;
        return (Number(a.programCode) || 0) - (Number(b.programCode) || 0);
      });
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFF8FA', fontFamily: 'Manrope, sans-serif' }}>
      <PublicNav eventName={festName} showSearch={false} />

      <main style={{ flex: 1, padding: '2.5rem 0' }}>
        <div className="container" style={{ maxWidth: '960px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', fontWeight: 800, color: '#1a1420', fontFamily: "'Fraunces', serif" }}>
              Programme & Result Search
            </h1>
            <p style={{ margin: 0, color: '#7a7480', fontSize: '0.9rem' }}>
              Search competition results by chest number or program code, or browse the official winner boards.
            </p>
          </div>
          
          <SearchClient 
            initialQuery={query} 
            initialType={type} 
            events={events}
            categories={categories}
            initialEventId={eventId}
            activeEventName={activeEventName}
            initialCategoryId={categoryId}
            initialStageType={stageType}
            initialSortBy={sortBy}
          />
          
          <div style={{ marginTop: '28px' }}>
            {/* VIEW 1: CANDIDATE SEARCH RESULTS */}
            {type === "chestNumber" && query && (
              <div>
                {candidateResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #f2d9e6' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔍</span>
                    <p style={{ color: '#7a7480', fontSize: '1rem', margin: 0 }}>No candidates found for chest number "{query}".</p>
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
                          borderLeft: `5px solid ${candidate.team?.flagColor || '#e6007e'}`,
                          boxShadow: '0 4px 18px -3px rgba(230, 0, 126, 0.06)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                          <div>
                            <h3 style={{ color: '#1a1420', fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: '1.3rem', margin: '0 0 4px 0' }}>
                              {candidate.name} <span style={{ color: '#e6007e', fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>({candidate.chestNumber})</span>
                            </h3>
                            {(() => {
                              const { name: instName, place: instPlace } = formatInstitutionDisplay(candidate.team);
                              return (
                                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                                  Institution: <strong style={{ color: '#1a1420' }}>{instName}</strong>
                                  {instPlace && <span style={{ marginLeft: '6px' }}>📍 {instPlace}</span>}
                                  {candidate.category && (
                                    <span style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#fcebf3', color: '#e6007e', fontWeight: 700, fontSize: '0.75rem' }}>
                                      {candidate.category.name}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Candidate Enrolled Programs & Results */}
                        <div style={{ marginTop: '16px', borderTop: '1px solid #f9ebf2', paddingTop: '14px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#7a7480', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Participating Programs & Results
                          </h4>

                          {candidate.programs.length === 0 ? (
                            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: 0 }}>No programs assigned to this candidate.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {candidate.programs.map((p: any) => {
                                const resMatch = candidate.results.find((r: any) => r.programId === p.programId);
                                const isCompleted = Boolean(resMatch);
                                const winnerUrl = `/results/${p.program.id}?eventId=${eventId || p.program.eventId}`;

                                return (
                                  <div 
                                    key={p.programId} 
                                    style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center', 
                                      flexWrap: 'wrap', 
                                      gap: '10px', 
                                      padding: '12px 14px', 
                                      backgroundColor: '#FFF8FA', 
                                      borderRadius: '12px', 
                                      border: '1px solid #f9ebf2',
                                      borderLeft: `4px solid ${isCompleted ? '#10b981' : '#cbd5e1'}` 
                                    }}
                                  >
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <Link href={winnerUrl} style={{ fontWeight: 800, color: '#1a1420', textDecoration: 'none' }}>
                                          {p.program.programCode ? `[#${p.program.programCode}] ` : ''}{p.program.name}
                                        </Link>
                                        {p.program.stageType === 'OFF_STAGE' ? (
                                          <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: '1px solid #7dd3fc', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                            🎨 OFF
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(236, 72, 153, 0.12)', color: '#db2777', border: '1px solid #f472b6', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                            🎭 ON
                                          </span>
                                        )}
                                        <span style={{ 
                                          fontSize: '0.68rem', 
                                          padding: '2px 8px', 
                                          borderRadius: '9999px', 
                                          backgroundColor: isCompleted ? '#dcfce7' : '#f1f5f9',
                                          color: isCompleted ? '#15803d' : '#64748b',
                                          fontWeight: 800
                                        }}>
                                          {isCompleted ? 'COMPLETED' : 'PENDING'}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                      {resMatch && (
                                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          {resMatch.rank && (
                                            <span style={{ 
                                              backgroundColor: resMatch.rank === 1 ? '#f59e0b' : resMatch.rank === 2 ? '#94a3b8' : '#d97706',
                                              color: '#fff',
                                              fontWeight: 900,
                                              fontSize: '0.8rem',
                                              padding: '2px 8px',
                                              borderRadius: '6px'
                                            }}>
                                              Rank #{resMatch.rank}
                                            </span>
                                          )}
                                          {resMatch.grade && (
                                            <span style={{ color: '#e6007e', fontWeight: 800, fontSize: '0.85rem' }}>
                                              Grade {resMatch.grade}
                                            </span>
                                          )}
                                          {resMatch.points > 0 && (
                                            <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.8rem' }}>
                                              {resMatch.points} Pts
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <Link 
                                        href={winnerUrl} 
                                        style={{ 
                                          padding: '4px 10px', 
                                          fontSize: '0.75rem', 
                                          fontWeight: 800, 
                                          borderRadius: '6px', 
                                          background: 'linear-gradient(135deg, #e6007e, #a3005c)', 
                                          color: '#FFFFFF', 
                                          textDecoration: 'none' 
                                        }}
                                      >
                                        Winner Board →
                                      </Link>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: PROGRAM RESULTS BOARD (DEFAULT VIEW OR PROGRAM CODE SEARCH) */}
            {(type === "programCode" || !query) && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1a1420', fontFamily: "'Fraunces', serif" }}>
                    {query ? `Search Results for Program Code "${query}"` : 'Official Published Results Board'}
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: '#7a7480', fontWeight: 600 }}>
                    Total Programs: <strong>{programResults.length}</strong>
                  </span>
                </div>

                {programResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #f2d9e6' }}>
                    <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '8px' }}>📋</span>
                    <p style={{ color: '#7a7480', fontSize: '1rem', margin: 0 }}>
                      {query 
                        ? `No program found matching code "${query}".`
                        : 'No published results found for the selected category/stage filters.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {programResults.map(program => {
                      const publishedResults = program.results.filter((r: any) => r.isPublished);
                      const isPublished = publishedResults.length > 0;
                      const winnerUrl = `/results/${program.id}?eventId=${eventId || program.eventId}`;

                      // Rank 1, 2, 3 winners
                      const rank1List = publishedResults.filter((r: any) => r.rank === 1);
                      const rank2List = publishedResults.filter((r: any) => r.rank === 2);
                      const rank3List = publishedResults.filter((r: any) => r.rank === 3);
                      const otherGrades = publishedResults.filter((r: any) => !r.rank && (r.grade === 'A' || r.grade === 'B'));

                      return (
                        <div 
                          key={program.id} 
                          style={{ 
                            background: '#FFFFFF', 
                            borderRadius: '18px', 
                            padding: '22px',
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
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}>
                                  <span>{program.programCode ? `[#${program.programCode}] ` : ''}{program.name}</span>
                                  {program.category && (
                                    <span style={{ 
                                      fontSize: '0.72rem', 
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
                                {program.stageType === 'OFF_STAGE' ? (
                                  <span style={{ backgroundColor: 'rgba(14, 165, 233, 0.14)', color: '#0284c7', border: '1px solid #7dd3fc', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                                    🎨 OFF STAGE
                                  </span>
                                ) : (
                                  <span style={{ backgroundColor: 'rgba(236, 72, 153, 0.14)', color: '#db2777', border: '1px solid #f472b6', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                                    🎭 ON STAGE
                                  </span>
                                )}
                                <span>•</span>
                                <span>Type: <strong>{program.type}</strong></span>
                                {program.event && (
                                  <>
                                    <span>•</span>
                                    <span>Zone: <strong>{activeEventName || program.event.name}</strong></span>
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
                          
                          {/* Winners Breakdown */}
                          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f9ebf2' }}>
                            {isPublished ? (
                              <div>
                                {/* Podium Highlights: Rank 1, 2, 3 */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                                  {/* Rank 1 */}
                                  {rank1List.map((res: any) => {
                                    const candName = res.candidate ? res.candidate.name : (res.team ? res.team.name : 'Team Entry');
                                    const chestNo = res.candidate?.chestNumber;
                                    const { name: instName, place: instPlace } = formatInstitutionDisplay(res.candidate?.team || res.team);
                                    return (
                                      <div key={res.id} style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#fffbeb', border: '1.5px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>🥇</span>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '0.9rem', color: '#92400e' }}>1st Place</strong>
                                            {res.grade && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e6007e' }}>• Grade {res.grade}</span>}
                                            {res.points > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>• {res.points} Pts</span>}
                                          </div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1420', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {candName} {chestNo && <span style={{ color: '#7a7480', fontSize: '0.75rem' }}>({chestNo})</span>}
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {instName}{instPlace ? ` • ${instPlace}` : ''}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Rank 2 */}
                                  {rank2List.map((res: any) => {
                                    const candName = res.candidate ? res.candidate.name : (res.team ? res.team.name : 'Team Entry');
                                    const chestNo = res.candidate?.chestNumber;
                                    const { name: instName, place: instPlace } = formatInstitutionDisplay(res.candidate?.team || res.team);
                                    return (
                                      <div key={res.id} style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>🥈</span>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '0.9rem', color: '#475569' }}>2nd Place</strong>
                                            {res.grade && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e6007e' }}>• Grade {res.grade}</span>}
                                            {res.points > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>• {res.points} Pts</span>}
                                          </div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1420', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {candName} {chestNo && <span style={{ color: '#7a7480', fontSize: '0.75rem' }}>({chestNo})</span>}
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {instName}{instPlace ? ` • ${instPlace}` : ''}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Rank 3 */}
                                  {rank3List.map((res: any) => {
                                    const candName = res.candidate ? res.candidate.name : (res.team ? res.team.name : 'Team Entry');
                                    const chestNo = res.candidate?.chestNumber;
                                    const { name: instName, place: instPlace } = formatInstitutionDisplay(res.candidate?.team || res.team);
                                    return (
                                      <div key={res.id} style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1.5px solid #ffedd5', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>🥉</span>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '0.9rem', color: '#c2410c' }}>3rd Place</strong>
                                            {res.grade && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e6007e' }}>• Grade {res.grade}</span>}
                                            {res.points > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>• {res.points} Pts</span>}
                                          </div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1420', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {candName} {chestNo && <span style={{ color: '#7a7480', fontSize: '0.75rem' }}>({chestNo})</span>}
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {instName}{instPlace ? ` • ${instPlace}` : ''}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Other Grades (Grade A & B) */}
                                {otherGrades.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Other Grade Winners:</span>
                                    {otherGrades.map((res: any) => {
                                      const candName = res.candidate ? res.candidate.name : (res.team ? res.team.name : 'Team');
                                      const chestNo = res.candidate?.chestNumber;
                                      return (
                                        <span 
                                          key={res.id} 
                                          style={{ 
                                            fontSize: '0.72rem', 
                                            padding: '2px 8px', 
                                            borderRadius: '6px', 
                                            backgroundColor: '#f1f5f9', 
                                            border: '1px solid #e2e8f0', 
                                            color: '#334155',
                                            fontWeight: 600
                                          }}
                                        >
                                          {candName} {chestNo ? `(${chestNo})` : ''} - <strong style={{ color: '#e6007e' }}>Grade {res.grade}</strong>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ padding: '8px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                                ⏳ Official results for this programme are being compiled.
                              </div>
                            )}
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
