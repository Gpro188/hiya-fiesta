import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import BulkVolunteerCardsClient from "./BulkVolunteerCardsClient";

export default async function BulkVolunteerCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ zoneId?: string; eventId?: string; ids?: string }>;
}) {
  const params = await searchParams;
  const eventId = params.eventId || undefined;
  const settings = await getSettings(eventId);

  let whereClause: any = {};
  let zoneName = "";

  if (params.ids) {
    const idList = params.ids.split(",").map((s) => s.trim()).filter(Boolean);
    whereClause.id = { in: idList };
  } else if (params.zoneId) {
    if (params.zoneId === "STATE") {
      whereClause.zoneId = null;
      zoneName = "State Fest";
    } else if (params.zoneId !== "ALL") {
      whereClause.zoneId = params.zoneId;
      const zone = await prisma.zone.findUnique({ where: { id: params.zoneId }, select: { name: true } });
      if (zone) zoneName = zone.name;
    }
  } else if (params.eventId) {
    whereClause.eventId = params.eventId;
  }

  const volunteers = await prisma.volunteer.findMany({
    where: whereClause,
    include: {
      zone: true,
      event: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <BulkVolunteerCardsClient
      volunteers={volunteers as any}
      settings={settings}
      zoneName={zoneName}
    />
  );
}
