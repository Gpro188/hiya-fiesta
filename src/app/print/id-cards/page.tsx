import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import BulkIdCardsClient from "./BulkIdCardsClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function BulkIdCardsPage({
  searchParams
}: {
  searchParams: Promise<{
    teamId?: string;
    categoryId?: string;
    eventId?: string;
    stageType?: string;
    zoneId?: string;
    institutionId?: string;
    festType?: string;
    isState?: string;
    collab?: string;
  }>;
}) {
  const params = await searchParams;
  let eventId = params.eventId || undefined;
  let activeTeamId = params.teamId || undefined;

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const fullUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { eventId: true, zoneId: true, institutionId: true }
    });

    if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
      if (!activeTeamId && fullUser?.institutionId) {
        const team = await prisma.team.findFirst({
          where: fullUser.eventId 
            ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
            : { institutionId: fullUser.institutionId },
          select: { id: true, eventId: true }
        });
        if (team) {
          activeTeamId = team.id;
          eventId = team.eventId;
        }
      }
    } else if (session.user.role === "ZONE_ADMIN") {
      if (!eventId) {
        if (fullUser?.eventId) {
          eventId = fullUser.eventId;
        } else if (fullUser?.zoneId) {
          const zoneEv = await prisma.event.findFirst({
            where: { zoneId: fullUser.zoneId }
          });
          if (zoneEv) eventId = zoneEv.id;
        }
      }
    }
  }
  
  if (!eventId) {
    if (activeTeamId) {
      const team = await prisma.team.findUnique({
        where: { id: activeTeamId },
        select: { eventId: true }
      });
      if (team) {
        eventId = team.eventId;
      }
    } else if (params.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: params.categoryId },
        select: { eventId: true }
      });
      if (category) {
        eventId = category.eventId;
      }
    }
  }

  // Fetch State Event & PG Event references
  const stateEvent = await prisma.event.findFirst({
    where: { type: "STATE" },
    include: { parent: true }
  });

  const pgEvent = await prisma.event.findFirst({
    where: { name: { contains: "PG", mode: "insensitive" } }
  });

  // Resolve target event if eventId provided
  let targetEvent: any = null;
  if (eventId && eventId !== "collab_state_pg" && eventId !== "collab" && eventId !== "state") {
    targetEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true, parent: true }
    });
  }

  const isCollab = eventId === "collab_state_pg" || eventId === "collab" || params.collab === "true";
  const isStateFest = isCollab ||
    params.isState === "true" ||
    params.festType === "STATE" ||
    params.festType === "COLLAB" ||
    eventId === "state" ||
    targetEvent?.type === "STATE" ||
    Boolean(stateEvent && eventId === stateEvent.id);

  const targetEventIds: string[] = [];
  if (stateEvent) targetEventIds.push(stateEvent.id);
  if ((isCollab || params.festType === "COLLAB" || params.collab === "true") && pgEvent) {
    targetEventIds.push(pgEvent.id);
  }
  if (params.festType === "PG" && pgEvent) {
    targetEventIds.length = 0;
    targetEventIds.push(pgEvent.id);
  }

  const settings = await getSettings(isStateFest ? stateEvent?.id : (eventId || targetEvent?.id));
  const festTitle = isStateFest
    ? (isCollab ? "CSWC HIYA FIESTA 2026 • GRAND FINALE" : (settings.festName || "CSWC HIYA FIESTA 2026 - STATE FINAL"))
    : (settings.festName || targetEvent?.name || "HIYA FIESTA 2026");

  // Fetch zones for zone filtering
  const zones = await prisma.zone.findMany({
    where: { name: { not: "KARNATAKA" } },
    orderBy: { name: "asc" }
  });

  let candidates: any[] = [];

  if (isStateFest) {
    // For State Fest: Query candidates whose program assignments are in the state event(s)
    const stateWhereClause: any = {
      programs: {
        some: {
          program: {
            eventId: { in: targetEventIds },
            ...(params.stageType === "ON_STAGE" ? { stageType: "ON_STAGE" } : {}),
            ...(params.stageType === "OFF_STAGE" ? { stageType: "OFF_STAGE" } : {})
          }
        }
      }
    };

    if (activeTeamId) {
      stateWhereClause.teamId = activeTeamId;
    }
    if (params.institutionId) {
      stateWhereClause.institutionId = params.institutionId;
    }
    if (params.categoryId) {
      stateWhereClause.categoryId = params.categoryId;
    }
    if (params.zoneId) {
      stateWhereClause.institution = {
        zoneId: params.zoneId
      };
    }

    candidates = await prisma.candidate.findMany({
      where: stateWhereClause,
      include: {
        team: {
          include: {
            event: {
              include: { parent: true, zone: true }
            },
            institution: {
              include: { zone: true }
            }
          }
        },
        institution: {
          include: { zone: true }
        },
        category: true,
        programs: {
          where: {
            program: {
              eventId: { in: targetEventIds },
              ...(params.stageType === "ON_STAGE" ? { stageType: "ON_STAGE" } : {}),
              ...(params.stageType === "OFF_STAGE" ? { stageType: "OFF_STAGE" } : {})
            }
          },
          include: { program: true },
          orderBy: { program: { name: 'asc' } }
        }
      },
      orderBy: [
        { chestNumber: 'asc' },
        { name: 'asc' }
      ]
    });
  } else {
    // Normal / Zonal Event Query
    const whereClause: any = {
      OR: [
        { isApproved: true },
        { chestNumber: { not: null } },
        { programs: { some: {} } }
      ]
    };
    if (activeTeamId) {
      whereClause.teamId = activeTeamId;
    } else if (params.categoryId) {
      whereClause.categoryId = params.categoryId;
    } else if (eventId) {
      whereClause.team = { eventId: eventId };
    }

    candidates = await prisma.candidate.findMany({
      where: whereClause,
      include: {
        team: {
          include: {
            event: {
              include: { parent: true }
            }
          }
        },
        institution: true,
        category: true,
        programs: {
          include: { program: true },
          orderBy: { program: { name: 'asc' } }
        }
      },
      orderBy: [
        { chestNumber: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  return (
    <BulkIdCardsClient
      candidates={candidates as any}
      settings={settings}
      initialStageType={params.stageType || "ALL"}
      eventName={festTitle}
      isStateFest={isStateFest}
      zones={zones}
    />
  );
}
