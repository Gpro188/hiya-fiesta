import { prisma } from "@/lib/prisma";
import { getCertificateLayout, getCertificateWinners } from "@/app/dashboard/certificates/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintCertificateViewer from "./PrintCertificateViewer";

export default async function PrintCertificatePage(props: {
  searchParams: Promise<{
    eventId?: string;
    programId?: string;
    candidateId?: string;
    stageType?: string;
    rank?: string;
    mode?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  let targetEventId = searchParams.eventId;

  if (!targetEventId) {
    const liveEvent = await prisma.event.findFirst({
      where: { statusOverride: "LIVE" },
      orderBy: { updatedAt: "desc" }
    });
    const defaultEvent = liveEvent || await prisma.event.findFirst({
      where: { type: "ZONE" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    }) || await prisma.event.findFirst({
      orderBy: [{ type: "desc" }, { createdAt: "desc" }]
    });
    if (!defaultEvent) notFound();
    targetEventId = defaultEvent.id;
  }

  // Load layout configuration
  const layout = await getCertificateLayout(targetEventId);

  // If user specified mode via URL
  if (searchParams.mode === 'full') {
    layout.printMode = 'full';
  } else if (searchParams.mode === 'transparent') {
    layout.printMode = 'transparent';
  }

  // Fetch 1st, 2nd, and 3rd placed winners
  const rankFilter = searchParams.rank ? parseInt(searchParams.rank) : undefined;
  const winners = await getCertificateWinners({
    eventId: targetEventId,
    programId: searchParams.programId,
    stageType: searchParams.stageType,
    rankFilter: rankFilter && [1, 2, 3].includes(rankFilter) ? rankFilter : undefined,
  });

  const filteredWinners = searchParams.candidateId
    ? winners.filter(w => w.id === searchParams.candidateId || w.candidateId === searchParams.candidateId || w.resultId === searchParams.candidateId)
    : winners;

  return (
    <PrintCertificateViewer 
      winners={filteredWinners} 
      initialLayout={layout}
      eventId={targetEventId}
    />
  );
}
