import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import OffStageInvigilationSheet, { InstitutionOffStageData, CategoryOffStageGroup, OffStageCandidateRow } from "@/components/OffStageInvigilationSheet";

export default async function PrintOffStageInvigilationPage(props: {
  searchParams: Promise<{
    teamId?: string;
    institutionId?: string;
    eventId?: string;
    zoneId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { role, id: userId } = session.user;
  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { eventId: true, zoneId: true, institutionId: true },
  });

  // Determine filtering conditions based on user role and searchParams
  let teamWhere: any = {};

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role)) {
    if (!fullUser?.institutionId) {
      return <div style={{ padding: "40px" }}>You are not assigned to any institution.</div>;
    }
    teamWhere = { institutionId: fullUser.institutionId };
    if (fullUser.eventId) {
      teamWhere.eventId = fullUser.eventId;
    }
  } else if (role === "ZONE_ADMIN") {
    const zoneId = fullUser?.zoneId || searchParams.zoneId;
    if (zoneId) {
      teamWhere = {
        event: {
          OR: [{ zoneId }, { id: fullUser?.eventId || "" }],
        },
      };
    } else if (fullUser?.eventId) {
      teamWhere = { eventId: fullUser.eventId };
    }
    if (searchParams.teamId) {
      teamWhere.id = searchParams.teamId;
    }
  } else if (["ADMIN", "SUPER_ADMIN"].includes(role)) {
    if (searchParams.teamId) {
      teamWhere.id = searchParams.teamId;
    } else if (searchParams.institutionId) {
      teamWhere.institutionId = searchParams.institutionId;
    } else if (searchParams.zoneId) {
      teamWhere.event = { zoneId: searchParams.zoneId };
    } else if (searchParams.eventId) {
      teamWhere.eventId = searchParams.eventId;
    }
  }

  // Fetch teams along with their event, zone, and institution
  const teams = await prisma.team.findMany({
    where: teamWhere,
    include: {
      institution: true,
      event: {
        include: {
          zone: true,
        },
      },
      candidates: {
        include: {
          category: true,
          programs: {
            include: {
              program: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: [{ chestNumber: "asc" }, { name: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  if (teams.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>No institutions or teams found</h2>
        <p style={{ color: "#64748b" }}>
          Please verify your filters or ensure candidate registrations and off-stage program assignments have been completed.
        </p>
      </div>
    );
  }

  const primaryEventId = teams[0]?.eventId || fullUser?.eventId || searchParams.eventId;
  const settings = await getSettings(primaryEventId);

  // Group candidate assignments by Institution and Category (filtering ONLY stageType === 'OFF_STAGE')
  const institutionsData: InstitutionOffStageData[] = [];

  for (const team of teams) {
    const categoryMap = new Map<string, { categoryId: string; categoryName: string; rows: OffStageCandidateRow[] }>();

    for (const candidate of team.candidates) {
      for (const assignment of candidate.programs) {
        const program = assignment.program;
        if (!program || program.stageType !== "OFF_STAGE") {
          continue; // ONLY off-stage programs are included on this sheet!
        }

        // Determine category: prioritize candidate category, fallback to program category
        const catId = candidate.categoryId || program.categoryId || "general";
        const catName = candidate.category?.name || program.category?.name || "General Category";

        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            rows: [],
          });
        }

        const startTimeIso = program.startTime ? new Date(program.startTime).toISOString() : null;
        let endTimeIso: string | null = null;
        if (program.startTime && program.duration) {
          const endD = new Date(new Date(program.startTime).getTime() + program.duration * 60 * 1000);
          endTimeIso = endD.toISOString();
        }

        categoryMap.get(catId)!.rows.push({
          assignmentId: assignment.id,
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidateUid: candidate.uid,
          chestNumber: candidate.chestNumber,
          programId: program.id,
          programName: program.name,
          programCode: program.programCode,
          duration: program.duration || 60,
          startTime: startTimeIso,
          endTime: endTimeIso,
          venue: program.venue || "Institution Examination Hall",
        });
      }
    }

    // Sort categories alphabetically or standard order
    const categories: CategoryOffStageGroup[] = Array.from(categoryMap.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName)
    );

    // Sort rows within each category by programName, then chestNumber/candidateName
    categories.forEach((cat) => {
      cat.rows.sort((a, b) => {
        const progComp = a.programName.localeCompare(b.programName);
        if (progComp !== 0) return progComp;
        if (a.chestNumber && b.chestNumber) return a.chestNumber.localeCompare(b.chestNumber);
        return a.candidateName.localeCompare(b.candidateName);
      });
    });

    institutionsData.push({
      teamId: team.id,
      teamName: team.name,
      institutionName: team.institution?.name || team.name,
      institutionCode: team.institution?.code || null,
      zoneName: team.event?.zone?.name || team.event?.name || "Regional Zone",
      eventName: team.event?.name || settings.festName,
      categories,
    });
  }

  return (
    <OffStageInvigilationSheet
      institutionsData={institutionsData}
      festName={settings.festName}
      festMoto={settings.festMoto}
    />
  );
}
