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
}): Promise<ZoneCompletionStatus> {
  try {
    let resolvedZoneId = params.zoneId || null;
    let resolvedEventId = params.eventId || null;

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
        resolvedEventId = prog.event.id;
        resolvedZoneId = prog.event.zoneId;
        if (prog.event.statusOverride === "COMPLETED") {
          return {
            isCompleted: true,
            zoneName: prog.event.name,
            message: `The festival for ${prog.event.name} has been marked COMPLETED and locked by Super Admin. All mark entry and changes are closed.`
          };
        }
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
        resolvedEventId = team.eventId;
        resolvedZoneId = team.institution?.zoneId || team.event?.zoneId || null;
        if (team.event?.statusOverride === "COMPLETED") {
          return {
            isCompleted: true,
            zoneName: team.event.name,
            message: `The festival for ${team.event.name} has been marked COMPLETED and locked by Super Admin.`
          };
        }
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
        select: { id: true, statusOverride: true, name: true }
      });
      if (ev?.statusOverride === "COMPLETED") {
        return {
          isCompleted: true,
          zoneName: ev.name,
          message: `The festival for ${ev.name} has been marked COMPLETED and locked by Super Admin.`
        };
      }
    }

    return { isCompleted: false };
  } catch (error) {
    console.error("Error checking zone completion status:", error);
    return { isCompleted: false };
  }
}
