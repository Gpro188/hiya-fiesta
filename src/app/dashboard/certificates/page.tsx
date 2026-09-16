import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CertificateStudioClient from "./CertificateStudioClient";
import { getCertificateLayout, getCertificateWinners } from "./actions";

export default async function CertificatesDashboardPage(props: {
  searchParams: Promise<{ session?: string; eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN", "MEDIA"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const { role, eventId: sessionEventId } = session.user;

  // Fetch full user record for zoneId (not in session)
  const fullUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { eventId: true, zoneId: true }
  });
  const userZoneId = fullUser?.zoneId ?? null;
  const userEventId = sessionEventId ?? fullUser?.eventId ?? null;

  // Determine allowed events
  let eventWhere: any = {};
  if (role === "ZONE_ADMIN") {
    if (userEventId) {
      eventWhere = { id: userEventId };
    } else if (userZoneId) {
      eventWhere = { zoneId: userZoneId };
    }
  }

  const rawEvents = await prisma.event.findMany({
    where: eventWhere,
    include: {
      zone: true,
      categories: { orderBy: { name: "asc" } },
      programs: {
        select: { id: true, name: true, programCode: true, categoryId: true, type: true, stageType: true },
        orderBy: [{ programCode: "asc" }, { name: "asc" }]
      }
    },
    orderBy: [{ type: "desc" }, { name: "asc" }]
  });

  // For any zonal events, also pull programs from parent event if direct programs don't cover all
  const events = await Promise.all(rawEvents.map(async (ev) => {
    if (ev.parentId) {
      const parentPrograms = await prisma.program.findMany({
        where: { eventId: ev.parentId },
        select: { id: true, name: true, programCode: true, categoryId: true, type: true, stageType: true },
        orderBy: [{ programCode: "asc" }, { name: "asc" }]
      });
      const existingIds = new Set(ev.programs.map(p => p.id));
      const combined = [...ev.programs];
      for (const pp of parentPrograms) {
        if (!existingIds.has(pp.id)) {
          combined.push(pp);
        }
      }
      const filteredProgs = combined.filter(p => {
        const name = (p.name || "").toLowerCase();
        return !name.includes("magazine") && p.programCode !== "43" && (p.type || "").toUpperCase() !== "INSTITUTION";
      });
      return {
        ...ev,
        programs: filteredProgs
      };
    }
    const filteredProgs = ev.programs.filter(p => {
      const name = (p.name || "").toLowerCase();
      return !name.includes("magazine") && p.programCode !== "43" && (p.type || "").toUpperCase() !== "INSTITUTION";
    });
    return {
      ...ev,
      programs: filteredProgs
    };
  }));

  const allZones = await prisma.zone.findMany({
    orderBy: { name: "asc" }
  });

  if (events.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
        <h2>No Active Fest Event Found</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          There is currently no event linked to your zone. Please contact the administrator.
        </p>
      </div>
    );
  }

  // Select target event
  let selectedEvent = events[0];
  if (role === "SUPER_ADMIN") {
    if (searchParams.session === "state") {
      selectedEvent = events.find(e => e.type === "STATE") || events[0];
    } else if (searchParams.eventId) {
      selectedEvent = events.find(e => e.id === searchParams.eventId) || events[0];
    } else if (searchParams.session === "zone") {
      selectedEvent = events.find(e => e.type === "ZONE") || events[0];
    }
  }

  // Fetch initial layout and initial winners (strictly 1st, 2nd, 3rd placed)
  const initialLayout = await getCertificateLayout(selectedEvent.id);
  const initialWinners = await getCertificateWinners({
    eventId: selectedEvent.id
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "var(--spacing-xl)" }}>
      <CertificateStudioClient
        initialEvents={events}
        allZones={allZones}
        userRole={role}
        userZoneId={userZoneId}
        userEventId={userEventId}
        initialLayout={initialLayout}
        initialWinners={initialWinners}
      />
    </div>
  );
}
