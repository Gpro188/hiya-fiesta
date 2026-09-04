import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import BulkIdCardsClient from "./BulkIdCardsClient";

export const dynamic = 'force-dynamic';

export default async function BulkIdCardsPage({ searchParams }: { searchParams: Promise<{ teamId?: string, categoryId?: string, eventId?: string }> }) {
  const params = await searchParams;
  let eventId = params.eventId || undefined;
  
  if (!eventId) {
    if (params.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: params.teamId },
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
      { chestNumber: { not: null } }
    ]
  };
  if (params.teamId) {
    whereClause.teamId = params.teamId;
  } else if (params.categoryId) {
    whereClause.categoryId = params.categoryId;
  } else if (params.eventId) {
    whereClause.team = { eventId: params.eventId };
  }

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    include: {
      team: {
        include: { event: true }
      },
      institution: true,
      category: true,
      programs: {
        include: { program: true },
        orderBy: { program: { name: 'asc' } }
      }
    },
    orderBy: { name: 'asc' }
  });

  return <BulkIdCardsClient candidates={candidates as any} settings={settings} />;
}
