import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ScoringForm from "./ScoringForm";
import ResultList from "./ResultList";
import TeamScorePreview from "./TeamScorePreview";
import ExcelExport from "./ExcelExport";
import PendingProgramsList from "./PendingProgramsList";
import EventSwitcher from "@/app/components/EventSwitcher";
import { isProgramGeneral } from "@/lib/programUtils";

export default async function ScoringPage(props: {
  searchParams: Promise<{ eventId?: string, session?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "ZONE_ADMIN", "ADMIN", "JUDGE"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  // Scope events strictly to logged in Admin's main event and its sub-events
  const userEventId = session.user.eventId;
  let eventWhere: any = userEventId ? {
    OR: [
      { id: userEventId },
      { parentId: userEventId }
    ]
  } : {};

  if (session.user.role === "SUPER_ADMIN") {
    if (searchParams.session === "state") {
      eventWhere = { type: "STATE" };
    } else if (searchParams.session === "zone") {
      eventWhere = { type: "ZONE" };
    }
  }

  const rawEvents = await prisma.event.findMany({
    where: eventWhere,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true }
  });

  // Deduplicate events by normalized name to prevent duplicate event switcher tabs
  const seenEventNames = new Set<string>();
  const events = rawEvents.filter(ev => {
    const key = ev.name.trim().toLowerCase();
    if (seenEventNames.has(key)) return false;
    seenEventNames.add(key);
    return true;
  });

  const activeEventId = (searchParams.eventId && events.some(e => e.id === searchParams.eventId)) 
    ? searchParams.eventId 
    : events[0]?.id;

  if (!activeEventId) {
    return (
        <div className="animate-fade-in" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
            <h2>No Events Found</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              Create an event and add programs with candidate assignments to begin scoring.
            </p>
            <a href="/dashboard/events" className="btn btn-primary">Go to Events</a>
        </div>
    );
  }

  const activeEvent = await prisma.event.findUnique({
    where: { id: activeEventId },
    select: {
      id: true,
      name: true,
      parentId: true,
      teams: {
        select: {
          id: true,
          name: true,
          flagColor: true,
          magazineCode: true,
          institution: {
            select: {
              id: true,
              name: true,
              zone: { select: { id: true, name: true, code: true } }
            }
          }
        }
      }
    }
  });

  if (!activeEvent) redirect("/dashboard/scoring");

  const programsEventId = activeEvent.parentId || activeEvent.id;

  const judgeVenue = session.user.role === "JUDGE" ? (session.user as any).venue || null : null;

  const [programsForScoring, availableJudges, childProgramsWithAssignments] = await Promise.all([
    prisma.program.findMany({
      where: { 
        eventId: programsEventId,
        // If a JUDGE is logged in, only show programs at their assigned venue
        ...(judgeVenue ? { venue: judgeVenue } : {})
      },
      select: {
        id: true,
        name: true,
        programCode: true,
        stageType: true,
        venue: true,
        type: true,
        categoryId: true,
        candidateLimitPerTeam: true,
        judges: {
          select: {
            id: true,
            username: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            pointMatrix: true,
          }
        },
        results: {
          where: {
            OR: [
              { team: { eventId: activeEventId } },
              { candidate: { team: { eventId: activeEventId } } }
            ]
          },
          select: {
            id: true,
            marks: true,
            rank: true,
            grade: true,
            points: true,
            candidateId: true,
            teamId: true
          }
        },
        assignments: {
          where: {
            candidate: { team: { eventId: activeEventId } }
          },
          select: {
            id: true,
            candidate: {
              select: {
                id: true,
                name: true,
                chestNumber: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                    flagColor: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    prisma.user.findMany({
      where: { role: "JUDGE" },
      select: { id: true, username: true, place: true, phone: true },
      orderBy: { username: 'asc' }
    }),
    activeEvent.parentId
      ? prisma.program.findMany({
          where: {
            eventId: activeEvent.id,
            assignments: { some: { candidate: { team: { eventId: activeEventId } } } }
          },
          select: {
            programCode: true,
            assignments: {
              where: {
                candidate: { team: { eventId: activeEventId } }
              },
              select: {
                id: true,
                candidate: {
                  select: {
                    id: true,
                    name: true,
                    chestNumber: true,
                    team: {
                      select: {
                        id: true,
                        name: true,
                        flagColor: true
                      }
                    }
                  }
                }
              }
            }
          }
        })
      : Promise.resolve([])
  ]);

  // Index child program assignments by programCode so any candidate assigned on child event is never omitted
  const childAssignmentsByCode = new Map<string, any[]>();
  for (const cp of childProgramsWithAssignments) {
    if (cp.programCode) {
      if (!childAssignmentsByCode.has(cp.programCode)) {
        childAssignmentsByCode.set(cp.programCode, []);
      }
      childAssignmentsByCode.get(cp.programCode)!.push(...cp.assignments);
    }
  }

  const mergedProgramsForScoring = programsForScoring.map(p => {
    if (!p.programCode || !childAssignmentsByCode.has(p.programCode)) {
      return p;
    }
    const extraAssignments = childAssignmentsByCode.get(p.programCode) || [];
    const existingCandidateIds = new Set(p.assignments.map(a => a.candidate.id));
    const toAdd = extraAssignments.filter(a => !existingCandidateIds.has(a.candidate.id));
    if (toAdd.length === 0) return p;
    return {
      ...p,
      assignments: [...p.assignments, ...toAdd]
    };
  });

  const activeEventWithPrograms = {
    ...activeEvent,
    programs: mergedProgramsForScoring
  };

  if (!activeEvent) redirect("/dashboard/scoring");

  // Fetch results, pending programs, and flat results for standings in PARALLEL
  const [results, allPrograms, allResultsForScore] = await Promise.all([
    prisma.result.findMany({
      where: { 
        OR: [
          { team: { eventId: activeEventId } },
          { candidate: { team: { eventId: activeEventId } } }
        ],
        // If JUDGE: only show results for their venue's programs
        ...(judgeVenue ? { program: { venue: judgeVenue } } : {})
      },
      select: {
        id: true,
        marks: true,
        points: true,
        rank: true,
        grade: true,
        isPublished: true,
        candidateId: true,
        teamId: true,
        programId: true,
        createdAt: true,
        candidate: { select: { name: true, chestNumber: true, team: { select: { name: true, flagColor: true } }, category: { select: { name: true } } } },
        team: { select: { name: true, flagColor: true } },
        program: { select: { id: true, name: true, category: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Limit to 200 for speed
    }),
    prisma.program.findMany({
      where: { 
        eventId: programsEventId, 
        assignments: { some: { candidate: { team: { eventId: activeEventId } } } } 
      },
      select: {
        id: true,
        name: true,
        programCode: true,
        stageType: true,
        type: true,
        results: { 
          where: {
            OR: [
              { team: { eventId: activeEventId } },
              { candidate: { team: { eventId: activeEventId } } }
            ]
          },
          select: { id: true } 
        },
        category: { select: { id: true, name: true } },
        _count: { select: { assignments: { where: { candidate: { team: { eventId: activeEventId } } } } } }
      }
    }),
    prisma.result.findMany({
      where: { 
        OR: [
          { program: { eventId: activeEventId } },
          { team: { eventId: activeEventId } },
          { candidate: { team: { eventId: activeEventId } } }
        ]
      },
      select: {
        candidateId: true,
        points: true,
        isPublished: true,
        teamId: true,
        candidate: { 
          select: { 
            teamId: true,
            category: { select: { name: true } },
            team: {
              select: {
                id: true,
                name: true,
                flagColor: true,
                institution: {
                  select: {
                    id: true,
                    name: true,
                    zone: { select: { id: true, name: true, code: true } }
                  }
                }
              }
            }
          } 
        },
        team: {
          select: {
            id: true,
            name: true,
            flagColor: true,
            institution: {
              select: {
                id: true,
                name: true,
                zone: { select: { id: true, name: true, code: true } }
              }
            }
          }
        },
        program: {
          select: {
            id: true,
            type: true,
            categoryId: true,
            category: { select: { name: true } }
          }
        }
      }
    })
  ]);

  const pendingPrograms = allPrograms.filter(p => p.results.length === 0);

  const detectCategory = (progCatName?: string | null, candCatName?: string | null): "FADHILA" | "FADHEELA" | "OTHER" => {
    const raw = `${progCatName || ""} ${candCatName || ""}`.toLowerCase().trim();
    if (raw.includes("fadheela") || raw.includes("fadhila high") || raw.includes("senior") || raw.includes("fadhela")) {
      return "FADHEELA";
    }
    if (raw.includes("fadhila") || raw.includes("junior") || raw.includes("fadhl")) {
      return "FADHILA";
    }
    return "OTHER";
  };

  const isStateFest = !activeEvent.parentId || 
    activeEvent.name.toLowerCase().includes("state") || 
    activeEvent.name.toLowerCase().includes("grand");

  const teamScoresMap: Record<string, { 
    publishedPoints: number; 
    totalPoints: number;
    fadhilaPublished: number;
    fadhilaTotal: number;
    fadheelaPublished: number;
    fadheelaTotal: number;
    zoneName?: string;
  }> = {};

  const eventTeams = [...(activeEvent.teams || [])];
  eventTeams.forEach(team => {
    teamScoresMap[team.id] = { 
      publishedPoints: 0, 
      totalPoints: 0,
      fadhilaPublished: 0,
      fadhilaTotal: 0,
      fadheelaPublished: 0,
      fadheelaTotal: 0,
      zoneName: (team as any).institution?.zone?.name || undefined
    };
  });

  const zoneScoresMap: Record<string, {
    id: string;
    name: string;
    code: string;
    publishedPoints: number;
    totalPoints: number;
    fadhilaPublished: number;
    fadhilaTotal: number;
    fadheelaPublished: number;
    fadheelaTotal: number;
  }> = {};

  allResultsForScore.forEach(result => {
    const tObj = result.candidate?.team || result.team;
    const teamId = tObj?.id || result.teamId || result.candidate?.teamId;

    // Dynamically register team/institution if not already in teamScoresMap
    if (teamId && !teamScoresMap[teamId]) {
      teamScoresMap[teamId] = {
        publishedPoints: 0,
        totalPoints: 0,
        fadhilaPublished: 0,
        fadhilaTotal: 0,
        fadheelaPublished: 0,
        fadheelaTotal: 0,
        zoneName: tObj?.institution?.zone?.name || undefined
      };
      eventTeams.push({
        id: teamId,
        name: tObj?.institution?.name || tObj?.name || "Institution",
        institution: tObj?.institution,
        flagColor: tObj?.flagColor || null
      } as any);
    }

    const cat = detectCategory(result.program?.category?.name, result.candidate?.category?.name);
    const pts = result.points || 0;
    const isPub = Boolean(result.isPublished);

    // Category Champions calculate ONLY by individual programs
    const isIndiv = Boolean(result.candidateId) && 
      (!result.program?.type || result.program.type === "INDIVIDUAL") && 
      !isProgramGeneral(result.program);

    if (teamId && teamScoresMap[teamId]) {
      // 1. Overall Institution Standings (Includes ALL: Category Individual + Group + General)
      teamScoresMap[teamId].totalPoints += pts;
      if (isPub) teamScoresMap[teamId].publishedPoints += pts;

      // 2. Category Champions (INDIVIDUAL Programs Points ONLY)
      if (isIndiv) {
        if (cat === "FADHILA") {
          teamScoresMap[teamId].fadhilaTotal += pts;
          if (isPub) teamScoresMap[teamId].fadhilaPublished += pts;
        } else if (cat === "FADHEELA") {
          teamScoresMap[teamId].fadheelaTotal += pts;
          if (isPub) teamScoresMap[teamId].fadheelaPublished += pts;
        }
      }
    }

    // Zone aggregation (for State Fest or multi-zone views)
    const zone = result.team?.institution?.zone || result.candidate?.team?.institution?.zone;
    if (zone && zone.id) {
      if (!zoneScoresMap[zone.id]) {
        zoneScoresMap[zone.id] = {
          id: zone.id,
          name: zone.name,
          code: zone.code || zone.name.substring(0, 3).toUpperCase(),
          publishedPoints: 0,
          totalPoints: 0,
          fadhilaPublished: 0,
          fadhilaTotal: 0,
          fadheelaPublished: 0,
          fadheelaTotal: 0,
        };
      }
      // Overall Zone Points (ALL programs included)
      zoneScoresMap[zone.id].totalPoints += pts;
      if (isPub) zoneScoresMap[zone.id].publishedPoints += pts;

      // Category Zone Points (INDIVIDUAL programs only)
      if (isIndiv) {
        if (cat === "FADHILA") {
          zoneScoresMap[zone.id].fadhilaTotal += pts;
          if (isPub) zoneScoresMap[zone.id].fadhilaPublished += pts;
        } else if (cat === "FADHEELA") {
          zoneScoresMap[zone.id].fadheelaTotal += pts;
          if (isPub) zoneScoresMap[zone.id].fadheelaPublished += pts;
        }
      }
    }
  });

  const teamScores = eventTeams.map(team => ({
    id: team.id,
    name: team.name,
    flagColor: team.flagColor,
    zoneName: (team as any).institution?.zone?.name || null,
    publishedPoints: teamScoresMap[team.id]?.publishedPoints || 0,
    totalPoints: teamScoresMap[team.id]?.totalPoints || 0,
    fadhilaPublished: teamScoresMap[team.id]?.fadhilaPublished || 0,
    fadhilaTotal: teamScoresMap[team.id]?.fadhilaTotal || 0,
    fadheelaPublished: teamScoresMap[team.id]?.fadheelaPublished || 0,
    fadheelaTotal: teamScoresMap[team.id]?.fadheelaTotal || 0,
  }));

  const zoneScores = Object.values(zoneScoresMap);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ margin: '0 0 var(--spacing-xs) 0' }}>Live Scoring & Results Hub</h1>
          <p className="page-description" style={{ marginBottom: 0 }}>
            Enter marks, assign ranks and grades, calculate points, and publish results for live standings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={`/print/offstage-results?eventId=${activeEventId}&status=unpublished`}
            target="_blank"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              backgroundColor: '#fffbeb',
              border: '1.5px solid #f59e0b',
              color: '#b45309',
              borderRadius: '8px',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)'
            }}
            title="Print unpublished off-stage results for Stage 1 announcers to declare"
          >
            <span>📢</span> Print Off-Stage Results (Stage 1 Announce)
          </a>
          <a
            href={`/print/offstage-results?eventId=${activeEventId}&status=all`}
            target="_blank"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: '#f8fafc',
              border: '1.5px solid #0284c7',
              color: '#0369a1',
              borderRadius: '8px',
              textDecoration: 'none'
            }}
            title="Print all off-stage results master sheet"
          >
            <span>📑</span> All Off-Stage
          </a>
          <ExcelExport results={results} />
        </div>
      </div>

      <div data-tour="scoring-switcher">
        <EventSwitcher events={events} activeEventId={activeEventId} />
      </div>
      
      {events.length === 0 ? (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
          <p style={{ color: 'var(--warning)', marginBottom: 'var(--spacing-sm)' }}>
            No events available.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2.8fr 1.2fr', gap: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Primary Entry Area */}
            <div data-tour="scoring-form" className="glass-panel" style={{ padding: 'var(--spacing-xl)', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--primary)' }}></div>
              <h2 style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 Rapid Result Entry
              </h2>
              <Suspense fallback={<div>Loading form...</div>}>
                <ScoringForm 
                  events={[activeEventWithPrograms]} 
                  availableJudges={availableJudges}
                  userRole={session.user.role}
                  userVenue={(session.user as any).venue || null}
                />
              </Suspense>
            </div>

            {/* Results Management Section */}
            <div data-tour="scoring-results" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--secondary)' }}>Results Management Hub</h3>
              <ResultList results={results as any} role={session.user.role} />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Hide Team points leaderboard from Stage Juries */}
            {session.user.role !== "JUDGE" && !judgeVenue && (
              <div data-tour="scoring-teams">
                <TeamScorePreview 
                  scores={teamScores} 
                  zoneScores={zoneScores}
                  isStateFest={isStateFest}
                />
              </div>
            )}

            <div data-tour="scoring-pending" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Pending Entries
                <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--error)', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>{pendingPrograms.length}</span>
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Programs with assignments but no results recorded for <strong>{activeEvent.name}</strong>.
              </p>
              <PendingProgramsList programs={pendingPrograms} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
