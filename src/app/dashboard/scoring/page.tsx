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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ScoringPage(props: {
  searchParams: Promise<{ eventId?: string, session?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "ZONE_ADMIN", "ADMIN", "JUDGE"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  // Resolve judge venue & zone early to determine stage login context
  let judgeVenue = session.user.role === "JUDGE" ? (session.user as any).venue || null : null;
  let judgeZoneId = (session.user as any).zoneId || null;
  const usernameLower = (session.user.username || "").toLowerCase();

  if (session.user.role === "JUDGE") {
    const dbJudge = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { place: true, zoneId: true, eventId: true }
    });
    if (dbJudge) {
      if (dbJudge.place) judgeVenue = dbJudge.place;
      if (dbJudge.zoneId) judgeZoneId = dbJudge.zoneId;
    }
  }

  // Pre-fetch State Final and Fadheela PG Fest events
  const [stateEv, pgEv] = await Promise.all([
    prisma.event.findFirst({
      where: { type: "STATE" },
      select: { id: true, name: true, createdAt: true, type: true }
    }),
    prisma.event.findFirst({
      where: { name: { contains: "Fadheela", mode: "insensitive" } },
      select: { id: true, name: true, createdAt: true, type: true }
    })
  ]);

  // Detect if this user is a Collaborative / State On-Stage Login
  const isCollabStageLogin = 
    usernameLower.startsWith("collab_") ||
    (session.user.role === "JUDGE" && Boolean(judgeVenue) && !judgeZoneId && (!session.user.eventId || session.user.eventId === stateEv?.id)) ||
    (session.user.role === "SUPER_ADMIN" && searchParams.session === "state");

  let events: any[] = [];

  if (isCollabStageLogin) {
    // For Collaborative On-Stage logins: ONLY State Final & Fadheela PG Fest! Completely exclude all regular zones.
    events = [stateEv, pgEv].filter(Boolean) as any[];
  } else {
    // Scope events strictly to logged in Admin's main event and its sub-events
    let userEventId = session.user.eventId;
    if (!userEventId && (session.user as any).zoneId) {
      const zoneEv = await prisma.event.findFirst({
        where: { zoneId: (session.user as any).zoneId, type: "ZONE" },
        orderBy: { createdAt: "desc" },
        select: { id: true }
      });
      if (zoneEv) userEventId = zoneEv.id;
    }

    let eventWhere: any = userEventId ? {
      OR: [
        { id: userEventId },
        { parentId: userEventId }
      ]
    } : {};

    if (session.user.role === "SUPER_ADMIN") {
      if (searchParams.session === "zone") {
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
    events = rawEvents.filter(ev => {
      const key = ev.name.trim().toLowerCase();
      if (seenEventNames.has(key)) return false;
      seenEventNames.add(key);
      return true;
    });
  }

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
      statusOverride: true,
      zoneId: true,
      type: true,
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

  if (!activeEvent) {
    return (
      <div className="animate-fade-in" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <h2>Event Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
          The requested festival event could not be found.
        </p>
        <a href="/dashboard" className="btn btn-primary">Go to Dashboard</a>
      </div>
    );
  }

  const isStateFest = activeEvent.type === "STATE" || !activeEvent.parentId || 
    activeEvent.name.toLowerCase().includes("state") || 
    activeEvent.name.toLowerCase().includes("grand");

  const programsEventId = isStateFest ? activeEvent.id : (activeEvent.type === "ZONE" ? activeEvent.id : (activeEvent.parentId || activeEvent.id));



  const candidateZoneFilter: any[] = [];
  if (!isStateFest) {
    candidateZoneFilter.push({ team: { eventId: activeEventId } });
    if (activeEvent.zoneId) {
      candidateZoneFilter.push(
        { institution: { zoneId: activeEvent.zoneId } },
        { team: { institution: { zoneId: activeEvent.zoneId } } },
        { team: { event: { zoneId: activeEvent.zoneId } } }
      );
    }
  }

  const assignmentCandidateWhere = isStateFest ? {} : {
    candidate: {
      OR: candidateZoneFilter
    }
  };

  const [programsForScoring, availableJudges, childProgramsWithAssignments, allDbZones] = await Promise.all([
    prisma.program.findMany({
      where: { 
        eventId: programsEventId,
      },
      select: {
        id: true,
        name: true,
        programCode: true,
        stageType: true,
        venue: true,
        startTime: true,
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
          where: assignmentCandidateWhere,
          select: {
            id: true,
            createdAt: true,
            replacedFromChest: true,
            replacementNote: true,
            candidate: {
              select: {
                id: true,
                name: true,
                chestNumber: true,
                replacedFromChest: true,
                replacementNote: true,
                institution: {
                  select: {
                    id: true,
                    name: true,
                    zone: { select: { id: true, name: true, code: true } }
                  }
                },
                team: {
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
          },
          select: {
            id: true,
            programCode: true,
            name: true,
            venue: true,
            startTime: true,
            judges: {
              select: {
                id: true,
                username: true,
              }
            },
            assignments: {
              where: assignmentCandidateWhere,
              select: {
                id: true,
                createdAt: true,
                replacedFromChest: true,
                replacementNote: true,
                candidate: {
                  select: {
                    id: true,
                    name: true,
                    chestNumber: true,
                    replacedFromChest: true,
                    replacementNote: true,
                    institution: {
                      select: {
                        id: true,
                        name: true,
                        zone: { select: { id: true, name: true, code: true } }
                      }
                    },
                    team: {
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
                }
              }
            }
          }
        })
      : Promise.resolve([]),
    prisma.zone.findMany({ select: { id: true, name: true, code: true } })
  ]);

  // Index child programs by programCode and name so child data (assignments, venue, judges) merges smoothly
  const childProgramsByCode = new Map<string, any>();
  const childProgramsByName = new Map<string, any>();
  for (const cp of childProgramsWithAssignments) {
    if (cp.programCode) {
      childProgramsByCode.set(cp.programCode.trim(), cp);
    }
    childProgramsByName.set(cp.name.trim().toLowerCase(), cp);
  }

  const mergedProgramsForScoring = programsForScoring.map(p => {
    const codeKey = p.programCode ? p.programCode.trim() : null;
    const nameKey = p.name.trim().toLowerCase();
    const childProg = (codeKey && childProgramsByCode.get(codeKey)) || childProgramsByName.get(nameKey);

    let updatedAssignments = [...p.assignments];
    let updatedVenue = p.venue;
    let updatedStartTime = p.startTime;
    let updatedJudges = [...(p.judges || [])];

    if (childProg) {
      if (childProg.venue) updatedVenue = childProg.venue;
      if (childProg.startTime) updatedStartTime = childProg.startTime;
      if (childProg.judges && childProg.judges.length > 0 && updatedJudges.length === 0) {
        updatedJudges = childProg.judges;
      }

      const existingCandidateIds = new Set(p.assignments.map((a: any) => a.candidate.id));
      const extraAssignments = (childProg.assignments || []).filter((a: any) => !existingCandidateIds.has(a.candidate.id));
      updatedAssignments = [...updatedAssignments, ...extraAssignments];
    }

    // For individual programs with candidate limit per team == 1,
    // ensure no team has multiple conflicting candidates due to legacy twin discrepancies.
    // Give priority to replacement candidates (with replacedFromChest) or newer assignments.
    if (p.type === "INDIVIDUAL" || p.candidateLimitPerTeam === 1) {
      const assignmentsByTeam = new Map<string, any[]>();
      for (const asgn of updatedAssignments) {
        const teamId = asgn.candidate?.team?.id;
        if (!teamId) continue;
        if (!assignmentsByTeam.has(teamId)) assignmentsByTeam.set(teamId, []);
        assignmentsByTeam.get(teamId)!.push(asgn);
      }

      const dedupedAssignments: any[] = [];
      for (const [_, teamAsgns] of assignmentsByTeam.entries()) {
        if (teamAsgns.length <= 1) {
          dedupedAssignments.push(...teamAsgns);
        } else {
          teamAsgns.sort((a, b) => {
            const aHasRep = (a.replacedFromChest || a.candidate?.replacedFromChest) ? 1 : 0;
            const bHasRep = (b.replacedFromChest || b.candidate?.replacedFromChest) ? 1 : 0;
            if (aHasRep !== bHasRep) return bHasRep - aHasRep;
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          });
          dedupedAssignments.push(teamAsgns[0]);
        }
      }
      updatedAssignments = dedupedAssignments;
    }

    // Sort candidates by numeric chest number
    updatedAssignments.sort((a: any, b: any) => {
      const cA = a.candidate?.chestNumber;
      const cB = b.candidate?.chestNumber;
      if (cA && cB) {
        const numA = parseInt(cA, 10);
        const numB = parseInt(cB, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return cA.localeCompare(cB);
      }
      return 0;
    });

    return {
      ...p,
      venue: updatedVenue,
      startTime: updatedStartTime,
      judges: updatedJudges,
      assignments: updatedAssignments,
      childId: childProg?.id || null
    };
  });

  // Also include any standalone child programs that didn't exist in parent event
  const matchedChildIds = new Set(mergedProgramsForScoring.map(p => p.childId).filter(Boolean));
  for (const cp of childProgramsWithAssignments) {
    if (!matchedChildIds.has(cp.id)) {
      mergedProgramsForScoring.push({
        ...cp,
        stageType: (cp as any).stageType || "STAGE",
        type: (cp as any).type || "INDIVIDUAL",
        categoryId: (cp as any).categoryId || null,
        candidateLimitPerTeam: (cp as any).candidateLimitPerTeam || 1,
        category: (cp as any).category || null,
        results: [],
        assignments: cp.assignments || [],
        childId: cp.id
      } as any);
    }
  }

  // Filter programs by judge's assigned venue (case-insensitive & trimmed)
  const finalProgramsForScoring = judgeVenue
    ? mergedProgramsForScoring.filter(p => {
        if (!p.venue) return false;
        return p.venue.trim().toLowerCase() === judgeVenue.trim().toLowerCase();
      })
    : mergedProgramsForScoring;

  const venueProgramIdSet = new Set<string>();
  if (judgeVenue) {
    for (const p of finalProgramsForScoring) {
      if (p.id) venueProgramIdSet.add(p.id);
      if (p.childId) venueProgramIdSet.add(p.childId);
    }
  }

  const activeEventWithPrograms = {
    ...activeEvent,
    programs: finalProgramsForScoring
  };

  // Fetch results, pending programs, and flat results for standings in PARALLEL
  const [results, allPrograms, allResultsForScore] = await Promise.all([
    prisma.result.findMany({
      where: { 
        OR: [
          { program: { eventId: activeEventId } },
          { team: { eventId: activeEventId } }
        ],
        // If JUDGE: only show results for their venue's programs
        ...(judgeVenue && venueProgramIdSet.size > 0 ? { programId: { in: Array.from(venueProgramIdSet) } } : {})
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
        candidate: {
          select: {
            name: true,
            chestNumber: true,
            institution: {
              select: {
                id: true,
                name: true,
                zone: { select: { id: true, name: true, code: true } }
              }
            },
            team: {
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
            },
            category: { select: { name: true } }
          }
        },
        team: {
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
        },
        program: { select: { id: true, name: true, programCode: true, category: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Limit to 200 for speed
    }),
    prisma.program.findMany({
      where: { 
        eventId: programsEventId, 
        assignments: {
          some: assignmentCandidateWhere
        } 
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
        _count: {
          select: {
            assignments: {
              where: assignmentCandidateWhere
            }
          }
        }
      }
    }),
    prisma.result.findMany({
      where: { 
        OR: [
          { program: { eventId: activeEventId } },
          { team: { eventId: activeEventId } }
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
            institution: {
              select: {
                id: true,
                name: true,
                zone: { select: { id: true, name: true, code: true } }
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

  let pendingPrograms = allPrograms.filter(p => p.results.length === 0);
  if (judgeVenue && venueProgramIdSet.size > 0) {
    pendingPrograms = pendingPrograms.filter(p => venueProgramIdSet.has(p.id));
  }

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
    let targetTeamId: string | null = null;

    if (isStateFest) {
      // IN STATE FEST: Points strictly belong to the 7 Participating Zones!
      // Institutions are merely candidate address/origin, not competing teams.
      if (result.teamId && eventTeams.some(t => t.id === result.teamId)) {
        targetTeamId = result.teamId;
      } else {
        const candZone = (
          result.candidate?.institution?.zone?.name ||
          result.candidate?.team?.institution?.zone?.name ||
          result.team?.institution?.zone?.name ||
          result.team?.name ||
          ""
        ).trim().toLowerCase();

        if (candZone) {
          const matched = eventTeams.find(t => 
            t.name.trim().toLowerCase() === candZone ||
            candZone.includes(t.name.trim().toLowerCase())
          );
          if (matched) targetTeamId = matched.id;
        }
      }
    } else {
      // REGIONAL ZONE FEST: Points belong to the institution colleges
      const tObj = result.candidate?.team || result.team;
      targetTeamId = tObj?.id || result.teamId || result.candidate?.teamId || null;

      // Dynamically register team/institution if not already in teamScoresMap
      if (targetTeamId && !teamScoresMap[targetTeamId]) {
        teamScoresMap[targetTeamId] = {
          publishedPoints: 0,
          totalPoints: 0,
          fadhilaPublished: 0,
          fadhilaTotal: 0,
          fadheelaPublished: 0,
          fadheelaTotal: 0,
          zoneName: tObj?.institution?.zone?.name || undefined
        };
        eventTeams.push({
          id: targetTeamId,
          name: tObj?.institution?.name || tObj?.name || "Institution",
          institution: tObj?.institution,
          flagColor: tObj?.flagColor || null
        } as any);
      }
    }

    if (!targetTeamId || !teamScoresMap[targetTeamId]) return;

    const cat = detectCategory(result.program?.category?.name, result.candidate?.category?.name);
    const pts = result.points || 0;
    const isPub = Boolean(result.isPublished);

    // Category Champions calculate ONLY by individual programs
    const isIndiv = Boolean(result.candidateId) && 
      (!result.program?.type || result.program.type === "INDIVIDUAL") && 
      !isProgramGeneral(result.program);

    // 1. Overall Standings (Includes ALL: Category Individual + Group + General)
    teamScoresMap[targetTeamId].totalPoints += pts;
    if (isPub) teamScoresMap[targetTeamId].publishedPoints += pts;

    // 2. Category Champions (INDIVIDUAL Programs Points ONLY)
    if (isIndiv) {
      if (cat === "FADHILA") {
        teamScoresMap[targetTeamId].fadhilaTotal += pts;
        if (isPub) teamScoresMap[targetTeamId].fadhilaPublished += pts;
      } else if (cat === "FADHEELA") {
        teamScoresMap[targetTeamId].fadheelaTotal += pts;
        if (isPub) teamScoresMap[targetTeamId].fadheelaPublished += pts;
      }
    }

    // Zone aggregation (for State Fest or multi-zone views)
    const zone = result.team?.institution?.zone || 
      result.candidate?.team?.institution?.zone ||
      result.candidate?.institution?.zone;
    let zoneId = zone?.id;
    let zoneName = zone?.name;
    let zoneCode = zone?.code;

    if (!zoneId && (result.team?.name || targetTeamId) && allDbZones) {
      const tName = eventTeams.find(t => t.id === targetTeamId)?.name || result.team?.name;
      const matchedZone = allDbZones.find(z => z.name.trim().toLowerCase() === tName?.trim().toLowerCase());
      if (matchedZone) {
        zoneId = matchedZone.id;
        zoneName = matchedZone.name;
        zoneCode = matchedZone.code;
      }
    }

    if (zoneId && zoneName) {
      if (!zoneScoresMap[zoneId]) {
        zoneScoresMap[zoneId] = {
          id: zoneId,
          name: zoneName,
          code: zoneCode || zoneName.substring(0, 3).toUpperCase(),
          publishedPoints: 0,
          totalPoints: 0,
          fadhilaPublished: 0,
          fadhilaTotal: 0,
          fadheelaPublished: 0,
          fadheelaTotal: 0,
        };
      }
      // Overall Zone Points (ALL programs included)
      zoneScoresMap[zoneId].totalPoints += pts;
      if (isPub) zoneScoresMap[zoneId].publishedPoints += pts;

      // Category Zone Points (INDIVIDUAL programs only)
      if (isIndiv) {
        if (cat === "FADHILA") {
          zoneScoresMap[zoneId].fadhilaTotal += pts;
          if (isPub) zoneScoresMap[zoneId].fadhilaPublished += pts;
        } else if (cat === "FADHEELA") {
          zoneScoresMap[zoneId].fadheelaTotal += pts;
          if (isPub) zoneScoresMap[zoneId].fadheelaPublished += pts;
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

  // Fetch State Magazine entries with New State Codes if this is a state event
  let stateMagazineEntries: any[] = [];
  if (isStateFest) {
    const magTeams = await prisma.team.findMany({
      where: {
        OR: [
          { isMagazineParticipating: true },
          { magazineCode: { not: null } },
        ],
      },
      include: {
        institution: {
          include: { zone: true },
        },
        event: {
          include: { zone: true },
        },
        results: {
          where: {
            program: {
              OR: [
                { name: { contains: "magazine", mode: "insensitive" } },
                { programCode: "43" },
              ],
            },
          },
        },
      },
      orderBy: [
        { institution: { zone: { name: "asc" } } },
        { magazineCode: "asc" },
        { name: "asc" },
      ],
    });

    const winners = magTeams.filter(t => {
      const zone = t.institution?.zone || t.event?.zone;
      const isKarnataka = zone?.code === "KAR" || zone?.name?.toLowerCase().includes("karnataka") || false;
      const rank1Result = t.results.find(r => r.rank === 1);
      return Boolean(rank1Result) && !isKarnataka;
    });

    winners.sort((a, b) => {
      const zA = a.institution?.zone?.name || "";
      const zB = b.institution?.zone?.name || "";
      const cmp = zA.localeCompare(zB);
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name);
    });

    stateMagazineEntries = winners.map((t, idx) => {
      const inst = t.institution;
      const zone = inst?.zone || t.event?.zone;
      const num = String(idx + 1).padStart(2, "0");
      const bestResult = t.results.sort((a, b) => (a.rank || 99) - (b.rank || 99))[0];

      return {
        teamId: t.id,
        teamName: t.name,
        institutionName: inst?.name || t.name,
        zoneName: zone?.name || "General",
        zoneCode: zone?.code || zone?.name?.substring(0, 3)?.toUpperCase() || "GEN",
        zonalMagazineCode: t.magazineCode || null,
        stateMagazineCode: `SMAG-${num}`,
        zonalRank: bestResult?.rank || null,
        zonalGrade: bestResult?.grade || null
      };
    });
  }

  const isFestCompleted = activeEvent.statusOverride === "COMPLETED";
  const isScoringLocked = isFestCompleted && session.user.role !== "SUPER_ADMIN";

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: '0 0 var(--spacing-xs) 0' }}>Live Scoring & Results Hub</h1>
            {isFestCompleted && (
              <span style={{
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #ef4444',
                color: '#b91c1c',
                fontWeight: 800,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                🔒 FEST COMPLETED
              </span>
            )}
          </div>
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
          <a
            href={`/print/distribution-sheet?eventId=${activeEventId}`}
            target="_blank"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              backgroundColor: '#eff6ff',
              border: '1.5px solid #2563eb',
              color: '#1d4ed8',
              borderRadius: '8px',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)'
            }}
            title="Print official Trophy & Certificate Distribution Marking Sheet for 1st, 2nd, 3rd places"
          >
            <span>🏆</span> Distribution Sheet (PDF)
          </a>
          <a
            href={`/print/closing-ceremony?eventId=${activeEventId}`}
            target="_blank"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              backgroundColor: '#fdf2f8',
              border: '1.5px solid #db2777',
              color: '#9d174d',
              borderRadius: '8px',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(219, 39, 119, 0.15)'
            }}
            title="Download / Print Official 4-Page Closing Ceremony Announcement Sheet (PDF)"
          >
            <span>📥</span> 🎙️ Closing Declaration (4P PDF)
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

              {isCollabStageLogin && stateEv && pgEv && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  backgroundColor: 'rgba(234, 179, 8, 0.08)',
                  border: '1.5px solid rgba(234, 179, 8, 0.35)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🤝</span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ca8a04' }}>
                        Collaborative Stage Portal • {judgeVenue ? judgeVenue.toUpperCase() : 'ON STAGE'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Currently scoring: <strong style={{ color: 'var(--text-primary)' }}>{activeEvent.name}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Switch Festival:</span>
                    <a
                      href={`/dashboard/scoring?eventId=${stateEv.id}`}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        backgroundColor: activeEventId === stateEv.id ? '#1e40af' : '#ffffff',
                        color: activeEventId === stateEv.id ? '#ffffff' : '#1e40af',
                        border: '1.5px solid #1e40af',
                        boxShadow: activeEventId === stateEv.id ? '0 2px 8px rgba(30, 64, 175, 0.3)' : 'none',
                        transition: '0.2s'
                      }}
                    >
                      🏆 State Final
                    </a>
                    <a
                      href={`/dashboard/scoring?eventId=${pgEv.id}`}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        backgroundColor: activeEventId === pgEv.id ? '#7e22ce' : '#ffffff',
                        color: activeEventId === pgEv.id ? '#ffffff' : '#7e22ce',
                        border: '1.5px solid #7e22ce',
                        boxShadow: activeEventId === pgEv.id ? '0 2px 8px rgba(126, 34, 206, 0.3)' : 'none',
                        transition: '0.2s'
                      }}
                    >
                      🎓 Fadheela PG
                    </a>
                  </div>
                </div>
              )}

              <Suspense fallback={<div>Loading form...</div>}>
                <ScoringForm 
                  events={[activeEventWithPrograms]} 
                  availableJudges={availableJudges}
                  userRole={session.user.role}
                  userVenue={judgeVenue}
                  isCompleted={isScoringLocked}
                  completedFestName={activeEvent.name}
                  stateMagazineEntries={stateMagazineEntries}
                  isStateFest={isStateFest}
                />
              </Suspense>
            </div>

            {/* Results Management Section */}
            <div data-tour="scoring-results" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--secondary)' }}>Results Management Hub</h3>
              <ResultList 
                results={results as any} 
                role={session.user.role} 
                isCompleted={isScoringLocked}
                completedFestName={activeEvent.name}
                activeEventId={activeEventId}
                isStateFest={isStateFest}
              />
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
