import React from "react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";
import { formatTimeAmPm } from "@/lib/scheduleCalculator";
import SchedulePrintClient from "./SchedulePrintClient";

export const dynamic = 'force-dynamic';

export default async function PrintSchedulePage(props: {
  searchParams: Promise<{ eventId?: string; teamId?: string }>;
}) {
  const searchParams = await props.searchParams;
  let eventId = searchParams.eventId;
  const teamId = searchParams.teamId;

  let team: any = null;
  if (teamId) {
    team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: {
          include: { parent: true, zone: true }
        },
        institution: true
      }
    });
    if (team) {
      eventId = team.eventId;
    }
  }

  // If printing for a team/institution, verify schedule is published by Zone Admin
  if (teamId && team) {
    const isSchedulePublished = team.event?.statusOverride === "SCHEDULE_PUBLISHED" || 
      team.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";
    
    if (!isSchedulePublished) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: '#b45309', marginBottom: '8px' }}>On-Stage Schedule Not Yet Published</h2>
          <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6 }}>
            The official On-Stage program schedule is currently being finalized by the Zone Admin. 
            Schedule printing will become available immediately after the Zone Admin updates and publishes the final timings.
          </p>
          <div style={{ marginTop: '24px' }}>
            <a href="/dashboard/schedule" style={{ padding: '8px 16px', backgroundColor: '#8E0033', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              &larr; Back to Schedule Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  const isCollab = eventId === "collab_state_pg" || eventId === "collab";

  // If eventId is not provided, resolve it
  if (!eventId && !isCollab) {
    const latestScheduledProg = await prisma.program.findFirst({
      where: { stageType: 'ON_STAGE', venue: { not: null }, startTime: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: { eventId: true }
    });
    if (latestScheduledProg) {
      eventId = latestScheduledProg.eventId;
    } else {
      const defaultEv = await prisma.event.findFirst({
        where: { parentId: { not: null } },
        orderBy: { createdAt: 'desc' }
      });
      eventId = defaultEv?.id;
    }
  }

  let stateEv: any = null;
  let pgEv: any = null;
  if (isCollab) {
    stateEv = await prisma.event.findFirst({ where: { type: 'STATE' } });
    pgEv = await prisma.event.findFirst({ where: { name: { contains: 'Fadheela' } } });
  }

  const settings = await getSettings(isCollab ? stateEv?.id : eventId);

  let activeEv: any = null;
  if (isCollab) {
    activeEv = stateEv;
  } else if (eventId) {
    activeEv = await prisma.event.findUnique({ 
      where: { id: eventId },
      include: { zone: true }
    });
  }

  // Check if this event has its own scheduled on-stage programs
  let targetEventId = eventId;
  if (!isCollab && eventId && activeEv?.parentId) {
    const ownCount = await prisma.program.count({
      where: {
        eventId,
        stageType: "ON_STAGE",
        venue: { not: null },
        startTime: { not: null }
      }
    });
    if (ownCount === 0) {
      targetEventId = activeEv.parentId;
    }
  }

  // Fetch only legitimately SCHEDULED ON_STAGE programs for this specific event or both in collab
  const programWhere: any = {
    stageType: "ON_STAGE",
    venue: { not: null },
    startTime: { not: null },
  };

  if (isCollab) {
    const targetEventIds = [stateEv?.id, pgEv?.id].filter(Boolean) as string[];
    programWhere.eventId = { in: targetEventIds };
  } else if (targetEventId) {
    programWhere.eventId = targetEventId;
  }

  const rawPrograms = await prisma.program.findMany({
    where: programWhere,
    orderBy: [
      { venue: 'asc' },
      { startTime: 'asc' },
      { programCode: 'asc' }
    ],
    include: { 
      category: true, 
      event: true,
      assignments: {
        include: {
          candidate: {
            include: {
              team: { include: { institution: true } },
              institution: { include: { zone: true } }
            }
          }
        }
      }
    }
  });

  // Tag programs with fest details in collab mode
  if (isCollab) {
    for (const p of rawPrograms) {
      const festType = (pgEv && p.eventId === pgEv.id) ? "PG" : "STATE";
      const festName = festType === "PG" ? "Fadheela PG" : "State Final";
      (p as any).festType = festType;
      (p as any).festName = festName;
    }
  }

  // If candidate assignments are in parent event, merge assignments into zone programs
  if (!isCollab && activeEv?.parentId) {
    const parentPrograms = await prisma.program.findMany({
      where: {
        eventId: activeEv.parentId,
        stageType: 'ON_STAGE'
      },
      include: {
        category: true,
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: true } },
                institution: { include: { zone: true } }
              }
            }
          }
        }
      }
    });

    const parentMap = new Map<string, any[]>();
    for (const pp of parentPrograms) {
      const codeKey = pp.programCode ? `code_${pp.programCode.trim()}` : null;
      const catName = pp.category?.name?.trim().toLowerCase() || '';
      const nameKey = `name_${pp.name.trim().toLowerCase()}_${catName}`;
      if (codeKey) parentMap.set(codeKey, pp.assignments);
      parentMap.set(nameKey, pp.assignments);
    }

    for (const zp of rawPrograms) {
      const codeKey = zp.programCode ? `code_${zp.programCode.trim()}` : null;
      const catName = zp.category?.name?.trim().toLowerCase() || '';
      const nameKey = `name_${zp.name.trim().toLowerCase()}_${catName}`;
      const parentAss = (codeKey && parentMap.get(codeKey)) || parentMap.get(nameKey) || [];

      // Combine direct zone assignments and parent assignments, deduplicating candidates
      const combined = [...(zp.assignments || []), ...parentAss];
      const seenCandidateIds = new Set<string>();
      zp.assignments = combined.filter((a: any) => {
        const cId = a.candidate?.id || a.candidateId;
        if (!cId || seenCandidateIds.has(cId)) return false;
        seenCandidateIds.add(cId);
        return true;
      });
    }
  }

  // Filter ONLY scheduled programs (must have valid stage venue and startTime)
  let programs = rawPrograms.filter(p => {
    return Boolean(p.venue && p.venue.trim() && p.venue !== "Unassigned" && p.startTime);
  });

  // If filtered for a specific team, filter to programs that team is participating in
  if (teamId) {
    programs = programs.filter(p => 
      p.assignments.some((a: any) => a.candidate?.teamId === teamId)
    );
  }

  programs.sort((a, b) => {
    const venueA = a.venue || "";
    const venueB = b.venue || "";
    if (venueA !== venueB) return venueA.localeCompare(venueB);

    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.programCode || a.name || "").localeCompare(b.programCode || b.name || "");
  });

  // Group strictly by assigned stage
  const venueGroups: Record<string, any[]> = {};
  for (const p of programs) {
    const v = p.venue!;
    if (!venueGroups[v]) venueGroups[v] = [];
    venueGroups[v].push(p);
  }

  const zoneName = isCollab
    ? "State Final & Fadheela PG Fest (Collab)"
    : (activeEv?.zone?.name || activeEv?.name || team?.event?.zone?.name || "");

  const festName = isCollab ? "CSWC Hiya Fiesta 2026 Grand Finale" : settings.festName;
  const festSubtitle = isCollab
    ? "Grand Finale Program Schedule • State Final & Fadheela PG Fest (Collab)"
    : `Official On-Stage Program Schedule ${zoneName ? `• ${zoneName}` : ""}`;

  const generatedDateStr = `Generated on: ${new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "long",
  })} at ${new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    timeStyle: "short",
  })}`;

  const teamInfo = team
    ? {
        name: team.name,
        institutionName: team.institution?.name,
        prefixCode: team.prefixCode,
      }
    : null;

  return (
    <SchedulePrintClient
      isCollab={isCollab}
      festName={festName}
      festSubtitle={festSubtitle}
      teamInfo={teamInfo}
      collabNote={
        isCollab
          ? "🌟 Combined Timeline for State Fest & Fadheela PG Programs Across All Stages"
          : null
      }
      festMoto={settings.festMoto}
      zoneName={zoneName}
      venueGroups={venueGroups}
      generatedDateStr={generatedDateStr}
    />
  );
}

