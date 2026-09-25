import { prisma } from "./prisma";

export interface ZoneCompletionStatus {
  isCompleted: boolean;
  zoneName?: string;
  zoneCode?: string;
  message?: string;
}

/**
 * Checks if a zone or event has been marked as COMPLETED & locked by Super Admin
 */
export async function isZoneOrEventCompleted(params: {
  zoneId?: string | null;
  eventId?: string | null;
  teamId?: string | null;
  programId?: string | null;
  institutionId?: string | null;
  resultId?: string | null;
  candidateId?: string | null;
  userId?: string | null;
}): Promise<ZoneCompletionStatus> {
  try {
    let resolvedZoneId = params.zoneId || null;
    let resolvedEventId = params.eventId || null;

    // Resolve from user if provided
    if (params.userId && (!resolvedZoneId || !resolvedEventId)) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { zoneId: true, eventId: true }
      });
      if (user) {
        if (!resolvedZoneId && user.zoneId) resolvedZoneId = user.zoneId;
        if (!resolvedEventId && user.eventId) resolvedEventId = user.eventId;
      }
    }

    // Resolve from result if provided
    if (params.resultId) {
      const res = await prisma.result.findUnique({
        where: { id: params.resultId },
        select: {
          team: {
            select: {
              eventId: true,
              institution: { select: { zoneId: true } },
              event: { select: { id: true, type: true, zoneId: true, statusOverride: true, name: true } }
            }
          },
          candidate: {
            select: {
              team: {
                select: {
                  eventId: true,
                  institution: { select: { zoneId: true } },
                  event: { select: { id: true, type: true, zoneId: true, statusOverride: true, name: true } }
                }
              }
            }
          }
        }
      });
      const t = res?.team || res?.candidate?.team;
      if (t) {
        if (t.event?.statusOverride === "COMPLETED") {
          return {
            isCompleted: true,
            zoneName: t.event.name,
            message: `The festival for ${t.event.name} has been marked COMPLETED and locked by Super Admin. All mark entry and changes are closed.`
          };
        }
        if (!resolvedEventId) resolvedEventId = t.eventId;
        if (!resolvedZoneId) resolvedZoneId = t.institution?.zoneId || t.event?.zoneId || null;
      }
    }

    // Resolve from candidate if provided
    if (params.candidateId && (!resolvedZoneId || !resolvedEventId)) {
      const cand = await prisma.candidate.findUnique({
        where: { id: params.candidateId },
        select: {
          team: {
            select: {
              eventId: true,
              institution: { select: { zoneId: true } },
              event: { select: { id: true, type: true, zoneId: true, statusOverride: true, name: true } }
            }
          }
        }
      });
      if (cand?.team) {
        if (cand.team.event?.statusOverride === "COMPLETED") {
          return {
            isCompleted: true,
            zoneName: cand.team.event.name,
            message: `The festival for ${cand.team.event.name} has been marked COMPLETED and locked by Super Admin.`
          };
        }
        if (!resolvedEventId) resolvedEventId = cand.team.eventId;
        if (!resolvedZoneId) resolvedZoneId = cand.team.institution?.zoneId || cand.team.event?.zoneId || null;
      }
    }

    // Resolve from team if provided
    if (params.teamId && (!resolvedZoneId || !resolvedEventId)) {
      const team = await prisma.team.findUnique({
        where: { id: params.teamId },
        select: {
          eventId: true,
          institution: { select: { zoneId: true } },
          event: { select: { id: true, type: true, zoneId: true, statusOverride: true, name: true } }
        }
      });
      if (team) {
        if (team.event?.statusOverride === "COMPLETED") {
          return {
            isCompleted: true,
            zoneName: team.event.name,
            message: `The festival for ${team.event.name} has been marked COMPLETED and locked by Super Admin.`
          };
        }
        if (!resolvedEventId) resolvedEventId = team.eventId;
        resolvedZoneId = team.institution?.zoneId || team.event?.zoneId || null;
      }
    }

    // Resolve from program if provided
    if (params.programId && (!resolvedZoneId || !resolvedEventId)) {
      const prog = await prisma.program.findUnique({
        where: { id: params.programId },
        select: {
          eventId: true,
          event: { select: { id: true, type: true, zoneId: true, statusOverride: true, name: true } }
        }
      });
      if (prog?.event) {
        if (prog.event.statusOverride === "COMPLETED") {
          return {
            isCompleted: true,
            zoneName: prog.event.name,
            message: `The festival for ${prog.event.name} has been marked COMPLETED and locked by Super Admin. All mark entry and changes are closed.`
          };
        }
        if (!resolvedEventId) resolvedEventId = prog.event.id;
        if (!resolvedZoneId) resolvedZoneId = prog.event.zoneId;
      }
    }

    // Resolve from institution if provided
    if (params.institutionId && !resolvedZoneId) {
      const inst = await prisma.masterInstitution.findUnique({
        where: { id: params.institutionId },
        select: { zoneId: true }
      });
      if (inst?.zoneId) resolvedZoneId = inst.zoneId;
    }

    // Check by zoneId
    if (resolvedZoneId) {
      const zoneEvent = await prisma.event.findFirst({
        where: {
          type: "ZONE",
          zoneId: resolvedZoneId,
          statusOverride: "COMPLETED"
        },
        include: { zone: true }
      });
      if (zoneEvent) {
        return {
          isCompleted: true,
          zoneName: zoneEvent.zone?.name || zoneEvent.name,
          zoneCode: zoneEvent.zone?.code,
          message: `The festival for ${zoneEvent.zone?.name || zoneEvent.name} has been marked COMPLETED and locked by Super Admin.`
        };
      }
    }

    // Check by eventId
    if (resolvedEventId) {
      const ev = await prisma.event.findUnique({
        where: { id: resolvedEventId },
        select: { id: true, zoneId: true, statusOverride: true, name: true }
      });
      if (ev?.statusOverride === "COMPLETED") {
        return {
          isCompleted: true,
          zoneName: ev.name,
          message: `The festival for ${ev.name} has been marked COMPLETED and locked by Super Admin.`
        };
      }
      if (ev?.zoneId) {
        const zoneEvent = await prisma.event.findFirst({
          where: {
            type: "ZONE",
            zoneId: ev.zoneId,
            statusOverride: "COMPLETED"
          },
          include: { zone: true }
        });
        if (zoneEvent) {
          return {
            isCompleted: true,
            zoneName: zoneEvent.zone?.name || zoneEvent.name,
            zoneCode: zoneEvent.zone?.code,
            message: `The festival for ${zoneEvent.zone?.name || zoneEvent.name} has been marked COMPLETED and locked by Super Admin.`
          };
        }
      }
    }

    return { isCompleted: false };
  } catch (error) {
    console.error("Error checking zone completion status:", error);
    return { isCompleted: false };
  }
}
