import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import BulkIdCardsClient from "./BulkIdCardsClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function BulkIdCardsPage({ searchParams }: { searchParams: Promise<{ teamId?: string, categoryId?: string, eventId?: string, stageType?: string }> }) {
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

  const settings = await getSettings(eventId);

  let whereClause: any = {
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

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    include: {
      team: {
        include: {
          event: {
            include: { parent: true },
          },
        },
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

  return <BulkIdCardsClient candidates={candidates as any} settings={settings} initialStageType={params.stageType || "ALL"} />;
}
