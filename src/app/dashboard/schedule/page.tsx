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

    const activeEventId = (searchParams.eventId && events.some(e => e.id === searchParams.eventId)) 
      ? searchParams.eventId 
      : events[0]?.id;

    let programWhere: any = {
      stageType: "ON_STAGE"
    };
    if (activeEventId) {
      const activeEv = await prisma.event.findUnique({ where: { id: activeEventId } });
      if (activeEv?.parentId) {
        programWhere = {
          stageType: "ON_STAGE",
          OR: [
            { eventId: activeEventId },
            { eventId: activeEv.parentId }
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
    if (activeEventId) {
      activeEv = await prisma.event.findUnique({
        where: { id: activeEventId },
        include: { 
          zone: true,
          selectedJudges: { select: { id: true, username: true } } 
        }
      });
      zoneJudges = activeEv?.selectedJudges || [];
    }

    const targetZoneId = activeEv?.zoneId || activeEv?.zone?.id;

    // Deduplicate programs across parent and child events
    const mergedMap = new Map<string, any>();
    for (const p of rawPrograms) {
      const key = p.programCode ? `code_${p.programCode.trim()}` : `name_${p.name.trim()}_${p.categoryId || ''}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, { ...p, assignments: [...p.assignments] });
      } else {
        const existing = mergedMap.get(key);
        const existingIds = new Set(existing.assignments.map((a: any) => a.id));
        for (const a of p.assignments) {
          if (!existingIds.has(a.id)) {
            existing.assignments.push(a);
            existingIds.add(a.id);
          }
        }
        if (p.eventId === activeEventId) {
          existing.id = p.id;
          existing.eventId = p.eventId;
          existing.venue = p.venue || existing.venue;
          existing.startTime = p.startTime || existing.startTime;
          existing.duration = p.duration || existing.duration;
          existing.durationMode = p.durationMode || existing.durationMode;
          existing.stageType = p.stageType || existing.stageType;
          if (p.judges && p.judges.length > 0) existing.judges = p.judges;
        } else if (existing.eventId !== activeEventId) {
          if (!existing.venue && p.venue) existing.venue = p.venue;
          if (!existing.startTime && p.startTime) existing.startTime = p.startTime;
          if (!existing.duration && p.duration) existing.duration = p.duration;
          if (!existing.durationMode && p.durationMode) existing.durationMode = p.durationMode;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h1 style={{ margin: '0 0 var(--spacing-xs) 0' }}>Global Festival Schedule</h1>
            <p className="page-description" style={{ marginBottom: 0 }}>
              Plan and manage the festival timeline. Assign time slots and venues for each program.
            </p>
          </div>
          <div data-tour="schedule-print" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <a href={`/print/schedule?eventId=${activeEventId}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Print Schedule
            </a>
            <a href={`/print/venue?eventId=${activeEventId}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Print Venue List
            </a>
            <a href={`/print/stage-manager?eventId=${activeEventId}`} target="_blank" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Stage Manager Sheet
            </a>
          </div>
        </div>

        <div data-tour="schedule-switcher">
          <EventSwitcher events={events} activeEventId={activeEventId || ""} />
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
