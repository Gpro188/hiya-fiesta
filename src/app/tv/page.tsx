import { prisma } from "@/lib/prisma";
import TVDisplayClient from "./TVDisplayClient";
import { isProgramGeneral } from "@/lib/programUtils";
import { getSettings } from "@/lib/settings";
import { getPublicEventData } from "@/app/actions/public";

export const dynamic = "force-dynamic";

export default async function TVDisplayPage(props: { searchParams: Promise<{ eventId?: string }> }) {
  const searchParams = await props.searchParams;
  let activeEventId = searchParams.eventId;

  let eventObj: any = null;
  if (activeEventId) {
    eventObj = await prisma.event.findUnique({
      where: { id: activeEventId },
      include: { zone: true }
    });
  } else {
    // Default to State Event or First Zone Event
    eventObj = await prisma.event.findFirst({
      where: { type: "STATE" },
      include: { zone: true }
    });
    if (!eventObj) {
      eventObj = await prisma.event.findFirst({
        include: { zone: true }
      });
    }
  }

  if (!eventObj) {
    return (
      <div style={{ backgroundColor: "#1e3a8a", color: "white", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h2>No Active Festival Found for TV Broadcast</h2>
      </div>
    );
  }

  const programsEventId = eventObj.parentId || eventObj.id;

  const [settings, publicRes, publishedProgramsRaw, allEvents] = await Promise.all([
    getSettings(eventObj.id),
    getPublicEventData(eventObj.id),
    prisma.program.findMany({
      where: {
        OR: [
          { eventId: eventObj.id },
          { eventId: programsEventId }
        ],
        results: {
          some: {
            isPublished: true,
            OR: [
              { program: { eventId: eventObj.id } },
              { team: { eventId: eventObj.id } },
              { candidate: { team: { eventId: eventObj.id } } }
            ]
          }
        }
      },
      include: {
        category: true,
        results: {
          where: {
            isPublished: true,
            OR: [
              { program: { eventId: eventObj.id } },
              { team: { eventId: eventObj.id } },
              { candidate: { team: { eventId: eventObj.id } } }
            ]
          },
          include: {
            candidate: {
              include: {
                team: { include: { institution: true } },
                institution: true
              }
            },
            team: {
              include: {
                institution: true
              }
            }
          },
          orderBy: [
            { rank: "asc" },
            { points: "desc" }
          ]
        }
      },
      orderBy: { updatedAt: "asc" }
    }),
    prisma.event.findMany({
      select: { id: true, name: true, type: true }
    })
  ]);

  const data = publicRes.data || {
    leaderboard: [],
    teams: [],
    topStars: [],
    categoryStars: {},
    champions: null,
    generalLeaderboard: [],
    stats: null
  };

  const leaderboard = data.leaderboard || [];
  const champions = (data as any).champions || {};
  const topStars = data.topStars || [];
  const categoryStars = (data.categoryStars as any) || {};

  // Extract Fadhila and Fadheela Kalathilakam
  const fadhilaStars = (champions.fadhilaCategoryStars && champions.fadhilaCategoryStars.length > 0)
    ? champions.fadhilaCategoryStars
    : (categoryStars["FADHILA"] || Object.entries(categoryStars).find(([k]) => k.toUpperCase().includes("FADHILA"))?.[1] || []);

  const fadheelaStars = (champions.fadheelaCategoryStars && champions.fadheelaCategoryStars.length > 0)
    ? champions.fadheelaCategoryStars
    : (categoryStars["FADHEELA"] || Object.entries(categoryStars).find(([k]) => k.toUpperCase().includes("FADHEELA"))?.[1] || []);

  const fadhilaStar = champions.fadhilaTopStar || fadhilaStars[0] || null;
  const fadheelaStar = champions.fadheelaTopStar || fadheelaStars[0] || null;
  const overallStar = champions.overallTopStar || topStars[0] || null;

  // Process published programs in published order
  const publishedPrograms = publishedProgramsRaw.map((prog: any) => {
    const isGeneral = isProgramGeneral(prog);
    const catName = (prog.category?.name || "").toUpperCase();
    const categoryType: "FADHILA" | "FADHEELA" | "GENERAL" = isGeneral
      ? "GENERAL"
      : catName.includes("FADHILA")
      ? "FADHILA"
      : "FADHEELA";

    const categoryTitle = isGeneral
      ? "General category winners"
      : categoryType === "FADHILA"
      ? "Fadhila category winners"
      : "Fadheela category winners";

    const winners = (prog.results || [])
      .filter((r: any) => r.rank && r.rank <= 3)
      .sort((a: any, b: any) => a.rank - b.rank)
      .map((r: any) => {
        const isIndiv = Boolean(r.candidate);
        const name = isIndiv
          ? r.candidate.name
          : (r.team?.institution?.name || r.team?.name || "Institution");
        const college = isIndiv
          ? (r.candidate.institution?.name || r.candidate.team?.institution?.name || r.candidate.team?.name || "")
          : (r.team?.institution?.place || r.team?.name || "");
        const place = isIndiv
          ? (r.candidate.institution?.place || r.candidate.team?.institution?.place || "")
          : (r.team?.institution?.place || "");

        return {
          rank: r.rank,
          name,
          college: college ? (place && !college.includes(place) ? `${college}, ${place}` : college) : (place || "—"),
          place,
          chestNumber: r.candidate?.chestNumber || null,
          grade: r.grade ? `Grade ${r.grade}` : null,
          points: r.points || 0
        };
      });

    return {
      id: prog.id,
      code: prog.programCode || "",
      name: prog.name,
      categoryType,
      categoryTitle,
      winners
    };
  }).filter((p: any) => p.winners.length > 0);

  return (
    <TVDisplayClient
      event={eventObj}
      settings={settings}
      leaderboard={leaderboard}
      champions={{
        overallChampion: champions.overallChampion || leaderboard[0] || null,
        overallRunnerUp: champions.overallRunnerUp || leaderboard[1] || null,
        overallSecondRunnerUp: champions.overallSecondRunnerUp || leaderboard[2] || null,
        fadhilaTopInstitution: champions.fadhilaTopInstitution || null,
        fadhilaRunnerUpInstitution: champions.fadhilaRunnerUpInstitution || null,
        fadhilaSecondRunnerUpInstitution: champions.fadhilaSecondRunnerUpInstitution || null,
        fadheelaTopInstitution: champions.fadheelaTopInstitution || null,
        fadheelaRunnerUpInstitution: champions.fadheelaRunnerUpInstitution || null,
        fadheelaSecondRunnerUpInstitution: champions.fadheelaSecondRunnerUpInstitution || null,
        generalTopInstitution: champions.generalTopInstitution || null,
        generalRunnerUpInstitution: champions.generalRunnerUpInstitution || null,
        generalSecondRunnerUpInstitution: champions.generalSecondRunnerUpInstitution || null,
        fadhilaStar,
        fadheelaStar,
        overallStar,
        fadhilaStars: fadhilaStars || [],
        fadheelaStars: fadheelaStars || []
      }}
      publishedPrograms={publishedPrograms}
      allEvents={allEvents}
    />
  );
}
