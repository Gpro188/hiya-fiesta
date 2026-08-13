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

    const zones = await prisma.zone.findMany({
      orderBy: { name: 'asc' }
    });

    let stateEvent = null;
    let statePrograms: any[] = [];
    if (role === "SUPER_ADMIN") {
      stateEvent = await prisma.event.findFirst({
        where: { type: "STATE" },
        include: {
          selectedJudges: { select: { id: true, username: true, phone: true, place: true } }
        }
      });
      if (stateEvent) {
        statePrograms = await prisma.program.findMany({
          where: { eventId: stateEvent.id },
          include: {
            judges: { select: { id: true, username: true } },
            category: true
          },
          orderBy: { name: 'asc' }
        });
      }
    }

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Jury Management</h1>
          <p className="page-description">Publish and manage the global master list of judges, and view payment reports by Zone.</p>
        </div>
        <AdminJuryList 
          judges={allJudges} 
          zones={zones} 
          stateEvent={stateEvent} 
          statePrograms={statePrograms} 
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

    const programs = await prisma.program.findMany({
      where: programWhere,
      include: {
        judges: { select: { id: true, username: true } },
        category: true
      },
      orderBy: { name: 'asc' }
    });

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Jury Selection & Assignment</h1>
          <p className="page-description">Select judges for your Zone and assign them to programs.</p>
        </div>
        <ZoneJurySelection 
          allJudges={allJudges} 
          selectedJudges={currentEvent?.selectedJudges || []} 
          programs={programs}
          eventId={activeEventId} 
        />
      </div>
    );
  }

  return null;
}
