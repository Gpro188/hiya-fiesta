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

    let programWhere: any = {};
    if (activeEventId) {
      const activeEv = await prisma.event.findUnique({ where: { id: activeEventId } });
      if (activeEv?.parentId) {
        programWhere = {
          OR: [
            { eventId: activeEventId },
            { eventId: activeEv.parentId }
          ]
        };
      } else {
        programWhere = { eventId: activeEventId };
      }
    }

    const programs = await prisma.program.findMany({
      where: programWhere,
      include: {
        event: true,
        category: true,
        _count: { select: { assignments: true } },
        assignments: {
          include: {
            candidate: { include: { team: true } }
          }
        },
        judges: {
          select: { id: true, username: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    let zoneJudges: any[] = [];
    if (activeEventId) {
      const activeEv = await prisma.event.findUnique({
        where: { id: activeEventId },
        include: { selectedJudges: { select: { id: true, username: true } } }
      });
      zoneJudges = activeEv?.selectedJudges || [];
    }

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
            allJudges={zoneJudges}
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
        : { institutionId: fullUser.institutionId }
    });

    if (!team) return <div>You are not assigned to any team.</div>;

    // Fetch all programs of the event
    const programs = await prisma.program.findMany({
      where: { eventId: team.eventId },
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <div>
            <h1 style={{ margin: '0 0 var(--spacing-xs) 0' }}>Team Festival Schedule</h1>
            <p className="page-description" style={{ marginBottom: 0 }}>
              View all programs and track your team's assignments and time slots.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <a href={`/print/schedule?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Print Team Schedule
            </a>
            <a href={`/print/institution-report?teamId=${team.id}`} target="_blank" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Candidate Schedule Report
            </a>
          </div>
        </div>
        <ManagerScheduler initialPrograms={programs as any} teamId={team.id} />
      </div>
    );
  }

  redirect("/dashboard");
}
