import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminScheduler from "./AdminScheduler";
import ManagerScheduler from "./ManagerScheduler";
import EventSwitcher from "@/app/components/EventSwitcher";

export default async function SchedulePage(props: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { role, id: userId } = session.user;

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { eventId: true, zoneId: true, institutionId: true }
  });

  if (["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role)) {
    const userEventId = fullUser?.eventId;
    const userZoneId = fullUser?.zoneId;
    
    let eventWhere: any = {};
    if (role === "ZONE_ADMIN" && userZoneId) {
      eventWhere = { zoneId: userZoneId };
    } else if (userEventId) {
      eventWhere = { id: userEventId };
    }

    const rawEvents = await prisma.event.findMany({
      where: eventWhere,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true }
    });

    const seenEventNames = new Set<string>();
    const events = rawEvents.filter(ev => {
      const key = ev.name.trim().toLowerCase();
      if (seenEventNames.has(key)) return false;
      seenEventNames.add(key);
      return true;
    });

    // Detect State Fest & Fadheela PG Fest to build the Collaborative Finale option
    const stateEv = rawEvents.find(e => (e as any).type === "STATE") || await prisma.event.findFirst({ where: { type: "STATE" } });
    const pgEv = rawEvents.find(e => e.name?.toLowerCase().includes("fadheela") || e.name?.toLowerCase().includes("pg")) || await prisma.event.findFirst({ where: { name: { contains: "Fadheela" } } });

    const hasCollab = Boolean(stateEv && pgEv) && ["ADMIN", "SUPER_ADMIN"].includes(role);
    const displayEvents = [...events];
    if (hasCollab) {
      displayEvents.unshift({
        id: "collab_state_pg",
        name: "🌟 Grand Finale (State Fest + Fadheela PG Collab)",
        isCollab: true,
        type: "COLLAB",
        createdAt: new Date()
      } as any);
    }

    let defaultEventId = events[0]?.id;
    if (!searchParams.eventId) {
      const latestScheduledProg = await prisma.program.findFirst({
        where: {
          eventId: { in: events.map(e => e.id) },
          stageType: 'ON_STAGE',
          venue: { not: null },
          startTime: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        select: { eventId: true }
      });
      if (latestScheduledProg) {
        defaultEventId = latestScheduledProg.eventId;
      }
    }

    const activeEventId = (searchParams.eventId && displayEvents.some(e => e.id === searchParams.eventId)) 
      ? searchParams.eventId 
      : defaultEventId;

    const isCollab = activeEventId === "collab_state_pg" || activeEventId === "collab";

    let programWhere: any = {
      stageType: "ON_STAGE"
    };

    if (isCollab && stateEv && pgEv) {
      programWhere = {
        stageType: "ON_STAGE",
        eventId: { in: [stateEv.id, pgEv.id] }
      };
    } else if (activeEventId) {
      const activeEvCheck = await prisma.event.findUnique({ where: { id: activeEventId } });
      if (activeEvCheck?.parentId) {
        programWhere = {
          stageType: "ON_STAGE",
          OR: [
            { eventId: activeEventId },
            { eventId: activeEvCheck.parentId }
          ]
        };
      } else {
        programWhere = {
          stageType: "ON_STAGE",
          eventId: activeEventId
        };
      }
    }

    const rawPrograms = await prisma.program.findMany({
      where: programWhere,
      include: {
        event: true,
        category: true,
        _count: { select: { assignments: true } },
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: { include: { zone: true } } } },
                institution: { include: { zone: true } }
              }
            }
          }
        },
        judges: {
          select: { id: true, username: true }
        }
      },
      orderBy: [
        { venue: 'asc' },
        { startTime: 'asc' },
        { programCode: 'asc' }
      ]
    });

    let zoneJudges: any[] = [];
    let activeEv: any = null;
    if (isCollab && stateEv) {
      activeEv = await prisma.event.findUnique({
        where: { id: stateEv.id },
        include: {
          zone: true,
          selectedJudges: { select: { id: true, username: true } }
        }
      });
      zoneJudges = activeEv?.selectedJudges || [];
    } else if (activeEventId) {
      activeEv = await prisma.event.findUnique({
        where: { id: activeEventId },
        include: { 
          zone: true,
          selectedJudges: { select: { id: true, username: true } } 
        }
      });
      zoneJudges = activeEv?.selectedJudges || [];
    }

    const targetZoneId = isCollab ? null : (activeEv?.zoneId || activeEv?.zone?.id);

    // Deduplicate programs across parent and child events
    // In collab mode, State and PG programs each keep their independent entries
    const mergedMap = new Map<string, any>();
    for (const p of rawPrograms) {
      const festType = (pgEv && p.eventId === pgEv.id) ? "PG" : "STATE";
      const festName = festType === "PG" ? "Fadheela PG" : "State Final";
      const decoratedProg = { ...p, festType, festName };

      const key = isCollab
        ? `${p.eventId}_${p.id}`
        : (p.programCode ? `code_${p.programCode.trim()}` : `name_${p.name.trim()}_${p.categoryId || ''}`);

      if (!mergedMap.has(key)) {
        mergedMap.set(key, { ...decoratedProg, assignments: [...p.assignments] });
      } else {
        const existing = mergedMap.get(key);
        const existingIds = new Set(existing.assignments.map((a: any) => a.id));
        const existingCandidateIds = new Set(existing.assignments.map((a: any) => a.candidateId || a.candidate?.id).filter(Boolean));
        for (const a of p.assignments) {
          const cId = a.candidateId || a.candidate?.id;
          if (!existingIds.has(a.id) && (!cId || !existingCandidateIds.has(cId))) {
            existing.assignments.push(a);
            existingIds.add(a.id);
            if (cId) existingCandidateIds.add(cId);
          }
        }
        if (p.eventId === activeEventId) {
          existing.id = p.id;
          existing.eventId = p.eventId;
          existing.name = p.name;
          existing.venue = p.venue;
          existing.startTime = p.startTime;
          existing.duration = p.duration;
          existing.durationMode = p.durationMode;
          existing.stageType = p.stageType;
          if (p.judges && p.judges.length > 0) existing.judges = p.judges;
        }
      }
    }

    // If active event is a zone event, ensure programs that only belong to parent do not keep parent's old venue/timing
    if (!isCollab && activeEv?.parentId) {
      for (const prog of mergedMap.values()) {
        if (prog.eventId !== activeEventId) {
          prog.venue = null;
          prog.startTime = null;
        }
      }
    }

    // If viewing a zone, filter candidate assignments strictly to that zone
    if (targetZoneId) {
      for (const prog of mergedMap.values()) {
        prog.assignments = prog.assignments.filter((a: any) => {
          const c = a.candidate;
          if (!c) return false;
          const cZoneId =
            c.institution?.zoneId ||
            c.institution?.zone?.id ||
            c.team?.institution?.zoneId ||
            c.team?.institution?.zone?.id;
          return cZoneId === targetZoneId;
        });
      }
    }

    const programs = Array.from(mergedMap.values()).sort((a, b) => {
      // First sort by venue
      const venueA = a.venue || "zzz";
      const venueB = b.venue || "zzz";
      if (venueA !== venueB) return venueA.localeCompare(venueB);
      // Within same venue, sort chronologically by startTime
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      if (timeA !== timeB) {
        if (timeA === 0) return 1;
        if (timeB === 0) return -1;
        return timeA - timeB;
      }
      return (a.programCode || a.name || "").localeCompare(b.programCode || b.name || "");
    });

    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: '0 0 var(--spacing-xs) 0' }}>
                {isCollab ? "🌟 Grand Finale Schedule (State Fest + Fadheela PG Collab)" : "Global Festival Schedule"}
              </h1>
              {isCollab && (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                }}>
                  ✨ COLLABORATIVE FINALE
                </span>
              )}
            </div>
            <p className="page-description" style={{ marginBottom: 0 }}>
              {isCollab
                ? "Unified stage timeline combining CSWC Hiya Fiesta 2026 State Final and Fadheela PG Fest programs into shared venues."
                : "Plan and manage the festival timeline. Assign time slots and venues for each program."}
            </p>
          </div>
          <div data-tour="schedule-print" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <a href={`/print/schedule?eventId=${activeEventId}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700 }}>
              {isCollab ? "🖨️ Print Combined Schedule" : "Print Schedule"}
            </a>
            <a href={`/print/venue?eventId=${activeEventId}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              {isCollab ? "📍 Combined Venue List" : "Print Venue List"}
            </a>
            <a href={`/print/stage-manager?eventId=${activeEventId}`} target="_blank" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              {isCollab ? "📋 Combined Stage Manager Sheet" : "Stage Manager Sheet"}
            </a>
          </div>
        </div>

        <div data-tour="schedule-switcher">
          <EventSwitcher events={displayEvents} activeEventId={activeEventId || ""} />
        </div>

        <div data-tour="schedule-grid">
          <AdminScheduler 
            initialPrograms={programs as any} 
            eventId={activeEventId || "default"} 
            targetZoneId={targetZoneId}
            allJudges={zoneJudges}
            isSuperAdmin={["ADMIN", "SUPER_ADMIN"].includes(role)}
            eventStatusOverride={activeEv?.statusOverride || "AUTO"}
            eventStartDate={activeEv?.startDate ? activeEv.startDate.toISOString() : null}
            eventEndDate={activeEv?.endDate ? activeEv.endDate.toISOString() : null}
            isCollab={isCollab}
          />
        </div>
      </div>
    );
  }

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role)) {
    const fullUser = await prisma.user.findUnique({ where: { id: userId }, select: { institutionId: true, eventId: true } });
    if (!fullUser?.institutionId) return <div>You are not assigned to any institution.</div>;

    const team = await prisma.team.findFirst({
      where: fullUser.eventId 
        ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
        : { institutionId: fullUser.institutionId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            statusOverride: true,
            parent: { select: { statusOverride: true } }
          }
        }
      }
    });

    if (!team) return <div>You are not assigned to any team.</div>;

    const isSchedulePublished = team.event?.statusOverride === "SCHEDULE_PUBLISHED" || 
      team.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";

    // Fetch only ON-STAGE programs of the event (off-stage does not have stage scheduling)
    const programs = await prisma.program.findMany({
      where: { 
        eventId: team.eventId,
        stageType: "ON_STAGE"
      },
      include: {
        category: true,
        assignments: {
          where: { candidate: { teamId: team.id } },
          include: { candidate: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: '0 0 var(--spacing-xs) 0' }}>On-Stage Program Schedule</h1>
              {isSchedulePublished ? (
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  ✅ FINAL SCHEDULE PUBLISHED
                </span>
              ) : (
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
                  ⏳ DRAFT / AWAITING ZONE PUBLICATION
                </span>
              )}
            </div>
            <p className="page-description" style={{ marginBottom: 0 }}>
              {isSchedulePublished 
                ? "Final On-Stage program timeline and assigned candidate slots are confirmed." 
                : "On-Stage schedule is currently being finalized by the Zone Admin. Schedule printing and candidate slot reports will be available once the Zone Admin publishes the official schedule."}
            </p>
          </div>
          {isSchedulePublished ? (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              <a href={`/print/schedule?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                🖨️ Print On-Stage Schedule
              </a>
              <a href={`/print/institution-report?teamId=${team.id}`} target="_blank" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                📑 On-Stage Candidate Schedule Report
              </a>
            </div>
          ) : (
            <div style={{ padding: '8px 14px', borderRadius: '6px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem', fontWeight: 600 }}>
              🔒 Schedule printing will be available once the Zone Admin publishes the finalized On-Stage timings.
            </div>
          )}
        </div>
        <ManagerScheduler initialPrograms={programs as any} teamId={team.id} isSchedulePublished={isSchedulePublished} />
      </div>
    );
  }

  redirect("/dashboard");
}
