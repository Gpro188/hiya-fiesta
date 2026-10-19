import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminJuryList from "./AdminJuryList";
import ZoneJurySelection from "./ZoneJurySelection";

export default async function JuriesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const { role, id: userId } = session.user;

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { eventId: true, zoneId: true }
  });

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    // Super admin sees all judges and the report
    const allJudges = await prisma.user.findMany({
      where: { role: "JUDGE" },
      include: {
        assignedPrograms: {
          include: {
            event: {
              include: { zone: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const [zones, allEvents, allVenueUsers] = await Promise.all([
      prisma.zone.findMany({
        orderBy: { name: 'asc' }
      }),
      prisma.event.findMany({
        include: {
          zone: true,
          selectedJudges: { select: { id: true, username: true, phone: true, place: true } },
          programs: {
            include: {
              judges: { select: { id: true, username: true } },
              category: true
            },
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.user.findMany({
        where: {
          role: "JUDGE",
          place: { not: null }
        },
        select: {
          id: true,
          username: true,
          place: true,
          phone: true,
          createdAt: true,
          eventId: true,
          zoneId: true
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const stateEvent = allEvents.find(e => e.type === "STATE" || !e.parentId) || allEvents[0] || null;
    const pgEvent = allEvents.find(e => e.name?.toLowerCase().includes("fadheela") || e.name?.toLowerCase().includes("pg")) || null;

    let displayEvents = [...allEvents];

    if (stateEvent && pgEvent) {
      const stateProgsTagged = (stateEvent.programs || []).map((p: any) => ({
        ...p,
        festType: "STATE" as const,
        festName: "State Final"
      }));
      const pgProgsTagged = (pgEvent.programs || []).map((p: any) => ({
        ...p,
        festType: "PG" as const,
        festName: "Fadheela PG"
      }));

      // Combine selected judges
      const combinedSelectedJudgesMap = new Map();
      (stateEvent.selectedJudges || []).forEach((j: any) => combinedSelectedJudgesMap.set(j.id, j));
      (pgEvent.selectedJudges || []).forEach((j: any) => combinedSelectedJudgesMap.set(j.id, j));
      const combinedSelectedJudges = Array.from(combinedSelectedJudgesMap.values());

      const collabEvent = {
        id: "collab_state_pg",
        name: "🌟 Grand Finale (State Fest + Fadheela PG Collab)",
        type: "COLLAB",
        isCollab: true,
        selectedJudges: combinedSelectedJudges,
        programs: [...stateProgsTagged, ...pgProgsTagged],
        zone: null,
      };

      (stateEvent as any).programs = stateProgsTagged;
      (pgEvent as any).programs = pgProgsTagged;

      displayEvents = [collabEvent as any, ...allEvents];
    }

    const statePrograms = stateEvent?.programs || [];

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Jury Management</h1>
          <p className="page-description">Publish and manage the global master list of judges, assign them across Zone and State festivals, and view payment reports.</p>
        </div>
        <AdminJuryList 
          judges={allJudges} 
          zones={zones} 
          events={displayEvents}
          stateEvent={stateEvent} 
          statePrograms={statePrograms} 
          allVenueUsers={allVenueUsers}
        />
      </div>
    );
  }

  if (role === "ZONE_ADMIN") {
    // Zone admin sees master list and can import them
    let activeEventId = fullUser?.eventId;
    
    // Find the primary zone event if they only have zoneId
    if (!activeEventId && fullUser?.zoneId) {
      const zoneEvent = await prisma.event.findFirst({
        where: { zoneId: fullUser.zoneId, type: "ZONE" },
        orderBy: { createdAt: 'desc' }
      });
      if (zoneEvent) activeEventId = zoneEvent.id;
    }

    if (!activeEventId) {
      return <div>Please create a Zone Event first.</div>;
    }

    const allJudges = await prisma.user.findMany({
      where: { role: "JUDGE" },
      select: { id: true, username: true, createdAt: true, phone: true, place: true },
      orderBy: { username: 'asc' }
    });

    const currentEvent = await prisma.event.findUnique({
      where: { id: activeEventId },
      include: {
        zone: true,
        selectedJudges: { select: { id: true, username: true, phone: true, place: true } }
      }
    });

    let programWhere: any = {};
    if (activeEventId) {
      if (currentEvent?.parentId) {
        programWhere = {
          OR: [
            { eventId: activeEventId },
            { eventId: currentEvent.parentId }
          ]
        };
      } else {
        programWhere = { eventId: activeEventId };
      }
    }

    const [programs, venueUsers] = await Promise.all([
      prisma.program.findMany({
        where: programWhere,
        include: {
          judges: { select: { id: true, username: true } },
          category: true
        },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({
        where: {
          role: "JUDGE",
          place: { not: null },
          OR: [
            { eventId: activeEventId },
            ...(currentEvent?.zoneId ? [{ zoneId: currentEvent.zoneId }] : [])
          ]
        },
        select: {
          id: true,
          username: true,
          place: true,
          phone: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const venues = Array.from(
      new Set(programs.map(p => p.venue || "Main Stage").filter(Boolean))
    ).sort();

    const programCountsByVenue: Record<string, number> = {};
    programs.forEach(p => {
      const v = p.venue || "Main Stage";
      programCountsByVenue[v] = (programCountsByVenue[v] || 0) + 1;
    });

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Jury Selection & Assignment</h1>
          <p className="page-description">Select judges for your Zone, assign them to programs, and manage Venue / Stage logins.</p>
        </div>
        <ZoneJurySelection 
          allJudges={allJudges} 
          selectedJudges={currentEvent?.selectedJudges || []} 
          programs={programs}
          eventId={activeEventId}
          venues={venues}
          venueUsers={venueUsers as any}
          programCountsByVenue={programCountsByVenue}
          zoneCode={currentEvent?.zone?.code || ""}
          zoneName={currentEvent?.zone?.name || currentEvent?.name || ""}
        />
      </div>
    );
  }

  return null;
}
