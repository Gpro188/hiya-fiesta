import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PromotionsClient from "./PromotionsClient";

export default async function PromotionsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const isZoneAdmin = session.user.role === "ZONE_ADMIN";

  const eventWhere = session.user.eventId 
    ? (isZoneAdmin ? { id: session.user.eventId } : { parentId: session.user.eventId })
    : { type: "ZONE" };

  // Fetch Zone events (just the events themselves)
  const zoneEvents = await prisma.event.findMany({
    where: eventWhere,
    orderBy: { name: 'asc' }
  });

  // Fetch Master Event Programs with all published results and assignments
  const masterEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
    include: {
      programs: {
        include: {
          assignments: {
            include: { candidate: true }
          },
          results: {
            where: { isPublished: true, rank: { in: [1, 2, 3] } },
            include: {
              candidate: { include: { team: true } },
              team: true
            },
            orderBy: { rank: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      }
    }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>State Advancements</h1>
        <p className="page-description">
          Review and manage candidates promoted to the State Final.
        </p>
      </div>

      <PromotionsClient 
        zoneEvents={zoneEvents} 
        masterPrograms={masterEvent?.programs || []} 
        isZoneAdmin={isZoneAdmin} 
        stateConfirmEndDate={masterEvent?.stateConfirmEndDate}
      />
    </div>
  );
}
