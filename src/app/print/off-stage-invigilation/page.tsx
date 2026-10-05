import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import OffStageInvigilationSheet, { InstitutionOffStageData, CategoryOffStageGroup, OffStageCandidateRow } from "@/components/OffStageInvigilationSheet";

export const dynamic = 'force-dynamic';

export default async function PrintOffStageInvigilationPage(props: {
  searchParams: Promise<{
    teamId?: string;
    institutionId?: string;
    eventId?: string;
    zoneId?: string;
    stageType?: string;
    groupBy?: string;
  }>;
}) {
  try {
    const searchParams = await props.searchParams;
    const session = await getServerSession(authOptions);

    const role = session?.user?.role;
    const userId = session?.user?.id;

    // Optional user context
    const fullUser = userId ? await prisma.user.findUnique({
      where: { id: userId },
      select: { eventId: true, zoneId: true, institutionId: true },
    }) : null;

    // 1. Resolve target event
    let targetEventId = searchParams.eventId;
    if (!targetEventId && role === "ZONE_ADMIN" && fullUser?.eventId) {
      targetEventId = fullUser.eventId;
    }
    if (!targetEventId && fullUser?.zoneId) {
      const zEv = await prisma.event.findFirst({ where: { zoneId: fullUser.zoneId } });
      if (zEv) targetEventId = zEv.id;
    }
    if (!targetEventId) {
      const defaultEv = await prisma.event.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      targetEventId = defaultEv?.id;
    }

    const activeEv = targetEventId ? await prisma.event.findUnique({
      where: { id: targetEventId },
      include: { zone: true, parent: true }
    }) : null;

    const isStateEvent = activeEv ? (activeEv.parentId === null || !activeEv.zoneId) : false;
    const activeStageType = searchParams.stageType || "OFF_STAGE"; // "OFF_STAGE", "ON_STAGE", or "ALL"
    const activeGroupBy = searchParams.groupBy || (isStateEvent ? "institution" : "institution");

    // Fetch all completed zones for filtering
    const allZones = await prisma.zone.findMany({
      where: { code: { not: 'KAR' } },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' }
    });

    const settings = await getSettings(targetEventId);

    const institutionsData: InstitutionOffStageData[] = [];

    if (isStateEvent && activeEv) {
      // ══════════════════════════════════════════════════════════════
      // STATE FESTIVAL: Query candidates assigned to State Event programs
      // ══════════════════════════════════════════════════════════════
      const progFilter: any = { eventId: activeEv.id };
      if (activeStageType !== "ALL") {
        progFilter.stageType = activeStageType;
      }

      const activeZoneId = searchParams.zoneId || (role === "ZONE_ADMIN" ? fullUser?.zoneId : undefined);

      const candidates = await prisma.candidate.findMany({
        where: {
          programs: {
            some: {
              program: progFilter
            }
          },
          ...(activeZoneId && activeZoneId !== "ALL" ? {
            OR: [
              { institution: { zoneId: activeZoneId } },
              { team: { institution: { zoneId: activeZoneId } } },
              { team: { event: { zoneId: activeZoneId } } }
            ]
          } : {}),
          ...(searchParams.teamId ? { teamId: searchParams.teamId } : {}),
          ...(searchParams.institutionId ? {
            OR: [
              { institutionId: searchParams.institutionId },
              { team: { institutionId: searchParams.institutionId } }
            ]
          } : {})
        },
        include: {
          category: true,
          institution: { include: { zone: true } },
          team: {
            include: {
              institution: { include: { zone: true } },
              event: { include: { zone: true } }
            }
          },
          programs: {
            where: {
              program: progFilter
            },
            include: {
              program: { include: { category: true } }
            },
            orderBy: { program: { programCode: "asc" } }
          }
        },
        orderBy: [{ chestNumber: "asc" }, { name: "asc" }]
      });

      if (activeGroupBy === "zone") {
        // Group by Zone (7 sheets for the 7 completed zones)
        const zoneBuckets = new Map<string, {
          zoneName: string;
          zoneCode: string;
          candidates: typeof candidates;
        }>();

        for (const c of candidates) {
          const z = c.institution?.zone || c.team?.institution?.zone || c.team?.event?.zone;
          const zName = z?.name || "General Zone";
          const zCode = z?.code || "GEN";

          if (!zoneBuckets.has(zName)) {
            zoneBuckets.set(zName, {
              zoneName: zName,
              zoneCode: zCode,
              candidates: []
            });
          }
          zoneBuckets.get(zName)!.candidates.push(c);
        }

        // Sort zones alphabetically
        const sortedZones = Array.from(zoneBuckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [zName, bucket] of sortedZones) {
          const categoryMap = new Map<string, { categoryId: string; categoryName: string; rows: OffStageCandidateRow[] }>();

          for (const candidate of bucket.candidates) {
            for (const assignment of candidate.programs) {
              const program = assignment.program;
              const catId = candidate.categoryId || program.categoryId || "general";
              const catName = candidate.category?.name || program.category?.name || "General Category";

              if (!categoryMap.has(catId)) {
                categoryMap.set(catId, {
                  categoryId: catId,
                  categoryName: catName,
                  rows: []
                });
              }

              const startTimeIso = program.startTime ? new Date(program.startTime).toISOString() : null;
              let endTimeIso: string | null = null;
              if (program.startTime && program.duration) {
                const endD = new Date(new Date(program.startTime).getTime() + program.duration * 60 * 1000);
                endTimeIso = endD.toISOString();
              }

              const inst = candidate.institution || candidate.team?.institution;

              categoryMap.get(catId)!.rows.push({
                assignmentId: assignment.id,
                candidateId: candidate.id,
                candidateName: `${candidate.name} (${inst?.name || 'Institution'})`,
                candidateUid: candidate.uid,
                candidatePhoto: candidate.photo || candidate.photoUrl || null,
                chestNumber: candidate.chestNumber,
                programId: program.id,
                programName: program.name,
                programCode: program.programCode,
                duration: program.duration || 60,
                startTime: startTimeIso,
                endTime: endTimeIso,
                venue: program.venue || (program.stageType === "ON_STAGE" ? "Main Stage" : "Examination Hall"),
              });
            }
          }

          const categories: CategoryOffStageGroup[] = Array.from(categoryMap.values()).sort((a, b) =>
            a.categoryName.localeCompare(b.categoryName)
          );

          categories.forEach((cat) => {
            cat.rows.sort((a, b) => {
              if (a.chestNumber && b.chestNumber) {
                const numA = parseInt(a.chestNumber, 10);
                const numB = parseInt(b.chestNumber, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.chestNumber.localeCompare(b.chestNumber);
              }
              if (a.chestNumber) return -1;
              if (b.chestNumber) return 1;
              return a.candidateName.localeCompare(b.candidateName);
            });
          });

          institutionsData.push({
            teamId: `zone_${zName}`,
            teamName: `${zName} Zone Finalists`,
            institutionName: `${zName} ZONE — STATE FINALISTS`,
            institutionCode: bucket.zoneCode,
            zoneName: zName,
            eventName: settings.festName,
            categories,
          });
        }
      } else {
        // Group by College / Institution (each institution that has 1st place winners gets a sheet)
        const instBuckets = new Map<string, {
          instName: string;
          instCode: string | null;
          zoneName: string;
          candidates: typeof candidates;
        }>();

        for (const c of candidates) {
          const inst = c.institution || c.team?.institution;
          const instName = inst?.name || c.team?.name || "Institution";
          const instCode = inst?.code || c.team?.prefixCode || null;
          const zoneName = inst?.zone?.name || c.team?.institution?.zone?.name || c.team?.event?.zone?.name || "Regional Zone";

          if (!instBuckets.has(instName)) {
            instBuckets.set(instName, {
              instName,
              instCode,
              zoneName,
              candidates: []
            });
          }
          instBuckets.get(instName)!.candidates.push(c);
        }

        const sortedInsts = Array.from(instBuckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [instName, bucket] of sortedInsts) {
          const categoryMap = new Map<string, { categoryId: string; categoryName: string; rows: OffStageCandidateRow[] }>();

          for (const candidate of bucket.candidates) {
            for (const assignment of candidate.programs) {
              const program = assignment.program;
              const catId = candidate.categoryId || program.categoryId || "general";
              const catName = candidate.category?.name || program.category?.name || "General Category";

              if (!categoryMap.has(catId)) {
                categoryMap.set(catId, {
                  categoryId: catId,
                  categoryName: catName,
                  rows: []
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
                candidatePhoto: candidate.photo || candidate.photoUrl || null,
                chestNumber: candidate.chestNumber,
                programId: program.id,
                programName: program.name,
                programCode: program.programCode,
                duration: program.duration || 60,
                startTime: startTimeIso,
                endTime: endTimeIso,
                venue: program.venue || (program.stageType === "ON_STAGE" ? "Main Stage" : "Examination Hall"),
              });
            }
          }

          const categories: CategoryOffStageGroup[] = Array.from(categoryMap.values()).sort((a, b) =>
            a.categoryName.localeCompare(b.categoryName)
          );

          categories.forEach((cat) => {
            cat.rows.sort((a, b) => {
              if (a.chestNumber && b.chestNumber) {
                const numA = parseInt(a.chestNumber, 10);
                const numB = parseInt(b.chestNumber, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.chestNumber.localeCompare(b.chestNumber);
              }
              if (a.chestNumber) return -1;
              if (b.chestNumber) return 1;
              return a.candidateName.localeCompare(b.candidateName);
            });
          });

          institutionsData.push({
            teamId: `inst_${instName}`,
            teamName: instName,
            institutionName: instName,
            institutionCode: bucket.instCode,
            zoneName: bucket.zoneName,
            eventName: settings.festName,
            categories,
          });
        }
      }
    } else {
      // ══════════════════════════════════════════════════════════════
      // ZONAL FESTIVAL: Group by teams/institutions within this zone
      // ══════════════════════════════════════════════════════════════
      let teamWhere: any = {};

      if (role === "ZONE_ADMIN") {
        const zoneId = fullUser?.zoneId || searchParams.zoneId;
        const targetEvId = fullUser?.eventId || targetEventId;

        if (searchParams.teamId) {
          teamWhere.id = searchParams.teamId;
        } else if (zoneId) {
          teamWhere.OR = [
            { event: { zoneId: zoneId } },
            { institution: { zoneId: zoneId } },
            ...(targetEvId ? [{ eventId: targetEvId }] : [])
          ];
        } else if (targetEvId) {
          teamWhere.eventId = targetEvId;
        }
      } else if (["ADMIN", "SUPER_ADMIN"].includes(role)) {
        if (searchParams.teamId) {
          teamWhere.id = searchParams.teamId;
        } else if (searchParams.institutionId) {
          teamWhere.institutionId = searchParams.institutionId;
        } else if (searchParams.zoneId) {
          teamWhere.OR = [
            { event: { zoneId: searchParams.zoneId } },
            { institution: { zoneId: searchParams.zoneId } }
          ];
        } else if (targetEventId) {
          teamWhere.eventId = targetEventId;
        }
      }

      const teams = await prisma.team.findMany({
        where: teamWhere,
        include: {
          institution: true,
          event: { include: { zone: true } },
          candidates: {
            include: {
              category: true,
              programs: {
                include: {
                  program: { include: { category: true } }
                }
              }
            },
            orderBy: [{ chestNumber: "asc" }, { name: "asc" }]
          }
        },
        orderBy: { name: "asc" }
      });

      for (const team of teams) {
        const categoryMap = new Map<string, { categoryId: string; categoryName: string; rows: OffStageCandidateRow[] }>();

        for (const candidate of team.candidates) {
          for (const assignment of candidate.programs) {
            const program = assignment.program;
            if (!program) continue;
            if (activeStageType !== "ALL" && program.stageType !== activeStageType) {
              continue;
            }

            const catId = candidate.categoryId || program.categoryId || "general";
            const catName = candidate.category?.name || program.category?.name || "General Category";

            if (!categoryMap.has(catId)) {
              categoryMap.set(catId, {
                categoryId: catId,
                categoryName: catName,
                rows: []
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
              candidatePhoto: candidate.photo || candidate.photoUrl || null,
              chestNumber: candidate.chestNumber,
              programId: program.id,
              programName: program.name,
              programCode: program.programCode,
              duration: program.duration || 60,
              startTime: startTimeIso,
              endTime: endTimeIso,
              venue: program.venue || (program.stageType === "ON_STAGE" ? "Main Stage" : "Institution Examination Hall"),
            });
          }
        }

        const categories: CategoryOffStageGroup[] = Array.from(categoryMap.values()).sort((a, b) =>
          a.categoryName.localeCompare(b.categoryName)
        );

        categories.forEach((cat) => {
          cat.rows.sort((a, b) => {
            if (a.chestNumber && b.chestNumber) {
              const numA = parseInt(a.chestNumber, 10);
              const numB = parseInt(b.chestNumber, 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return a.chestNumber.localeCompare(b.chestNumber);
            }
            if (a.chestNumber) return -1;
            if (b.chestNumber) return 1;
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
    }

    if (institutionsData.length === 0 || institutionsData.every(i => i.categories.length === 0)) {
      return (
        <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
          <h2>No candidates found for {activeStageType === "ON_STAGE" ? "On-Stage" : activeStageType === "ALL" ? "Competition" : "Off-Stage"} Invigilation Sheet</h2>
          <p style={{ color: "#64748b" }}>
            Please verify your filters or ensure program assignments have been confirmed.
          </p>
          <a 
            href="/dashboard/reports" 
            style={{ display: "inline-block", padding: "8px 16px", backgroundColor: "#8E0033", color: "#fff", textDecoration: "none", borderRadius: "4px", marginTop: "12px" }}
          >
            Return to Reports
          </a>
        </div>
      );
    }

    return (
      <OffStageInvigilationSheet
        institutionsData={institutionsData}
        festName={settings.festName}
        festMoto={settings.festMoto}
        stageType={activeStageType}
        groupBy={activeGroupBy}
        eventId={targetEventId}
        zoneId={searchParams.zoneId}
        allZones={allZones}
        isStateEvent={isStateEvent}
      />
    );
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err;
    }
    console.error("Invigilation sheet error:", err);
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Unable to load invigilation sheet</h2>
        <p style={{ color: "#ef4444" }}>{err?.message || "An unexpected error occurred."}</p>
        <a 
          href="/dashboard/reports" 
          style={{ display: "inline-block", padding: "8px 16px", backgroundColor: "#8E0033", color: "#fff", textDecoration: "none", borderRadius: "4px", marginTop: "12px" }}
        >
          Return to Reports
        </a>
      </div>
    );
  }
}
