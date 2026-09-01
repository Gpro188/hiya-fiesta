"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createVolunteer(data: {
  name: string;
  phone: string;
  address: string;
  photo?: string | null;
  roleTitle?: string | null;
  dutyArea?: string | null;
  bloodGroup?: string | null;
  zoneId?: string | null;
  eventId?: string | null;
  volunteerNo?: string | null;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized access" };
    }

    const { name, phone, address, photo, roleTitle, dutyArea, bloodGroup } = data;
    let { zoneId, eventId, volunteerNo } = data;

    if (!name?.trim()) {
      return { success: false, error: "Volunteer name is required" };
    }
    if (!phone?.trim()) {
      return { success: false, error: "Phone number is required" };
    }
    if (!address?.trim()) {
      return { success: false, error: "Address is required" };
    }

    // Role-based scoping for ZONE_ADMIN
    if (session.user.role === "ZONE_ADMIN") {
      const fullUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { zoneId: true, eventId: true }
      });
      if (fullUser?.zoneId) {
        zoneId = fullUser.zoneId;
      }
      if (fullUser?.eventId) {
        eventId = fullUser.eventId;
      }
    }

    // Auto-generate volunteer badge number if not supplied
    if (!volunteerNo?.trim()) {
      const count = await prisma.volunteer.count({
        where: zoneId ? { zoneId } : {}
      });
      const nextNum = (count + 1).toString().padStart(3, "0");
      if (zoneId) {
        const zone = await prisma.zone.findUnique({ where: { id: zoneId }, select: { code: true } });
        const code = zone?.code || "ZN";
        volunteerNo = `VOL-${code}-${nextNum}`;
      } else {
        volunteerNo = `VOL-ST-${nextNum}`;
      }
    }

    const volunteer = await prisma.volunteer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photo: photo?.trim() || null,
        roleTitle: roleTitle?.trim() || "OFFICIAL VOLUNTEER",
        dutyArea: dutyArea?.trim() || null,
        bloodGroup: bloodGroup?.trim() || null,
        zoneId: zoneId || null,
        eventId: eventId || null,
        volunteerNo: volunteerNo.trim()
      }
    });

    revalidatePath("/dashboard/volunteers");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/reports");

    return { success: true, volunteer };
  } catch (error: any) {
    console.error("Error creating volunteer:", error);
    if (error.code === "P2002") {
      return { success: false, error: "A volunteer with this badge ID already exists." };
    }
    return { success: false, error: error.message || "Failed to create volunteer" };
  }
}

export async function updateVolunteer(
  id: string,
  data: {
    name: string;
    phone: string;
    address: string;
    photo?: string | null;
    roleTitle?: string | null;
    dutyArea?: string | null;
    bloodGroup?: string | null;
    zoneId?: string | null;
    eventId?: string | null;
    volunteerNo?: string | null;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized access" };
    }

    const { name, phone, address, photo, roleTitle, dutyArea, bloodGroup, zoneId, eventId, volunteerNo } = data;

    if (!name?.trim()) return { success: false, error: "Volunteer name is required" };
    if (!phone?.trim()) return { success: false, error: "Phone number is required" };
    if (!address?.trim()) return { success: false, error: "Address is required" };

    const existing = await prisma.volunteer.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Volunteer not found" };
    }

    // Check if ZONE_ADMIN is updating their own zone's volunteer
    if (session.user.role === "ZONE_ADMIN") {
      const fullUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { zoneId: true }
      });
      if (fullUser?.zoneId && existing.zoneId && existing.zoneId !== fullUser.zoneId) {
        return { success: false, error: "You cannot edit volunteers from other zones." };
      }
    }

    const volunteer = await prisma.volunteer.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photo: photo !== undefined ? (photo?.trim() || null) : existing.photo,
        roleTitle: roleTitle?.trim() || existing.roleTitle,
        dutyArea: dutyArea?.trim() || null,
        bloodGroup: bloodGroup?.trim() || null,
        ...(session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN"
          ? {
              zoneId: zoneId !== undefined ? zoneId : existing.zoneId,
              eventId: eventId !== undefined ? eventId : existing.eventId,
            }
          : {}),
        ...(volunteerNo?.trim() ? { volunteerNo: volunteerNo.trim() } : {})
      }
    });

    revalidatePath("/dashboard/volunteers");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/reports");

    return { success: true, volunteer };
  } catch (error: any) {
    console.error("Error updating volunteer:", error);
    return { success: false, error: error.message || "Failed to update volunteer" };
  }
}

export async function deleteVolunteer(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized access" };
    }

    const existing = await prisma.volunteer.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Volunteer not found" };
    }

    if (session.user.role === "ZONE_ADMIN") {
      const fullUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { zoneId: true }
      });
      if (fullUser?.zoneId && existing.zoneId && existing.zoneId !== fullUser.zoneId) {
        return { success: false, error: "You cannot delete volunteers from other zones." };
      }
    }

    await prisma.volunteer.delete({ where: { id } });

    revalidatePath("/dashboard/volunteers");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/reports");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting volunteer:", error);
    return { success: false, error: error.message || "Failed to delete volunteer" };
  }
}

export async function generateVolunteerNumbers(zoneId?: string, eventId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      return { success: false, error: "Unauthorized access" };
    }

    let targetZoneId = zoneId;
    if (session.user.role === "ZONE_ADMIN") {
      const fullUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { zoneId: true }
      });
      targetZoneId = fullUser?.zoneId || undefined;
    }

    const volunteers = await prisma.volunteer.findMany({
      where: targetZoneId ? { zoneId: targetZoneId } : {},
      orderBy: { createdAt: "asc" },
      include: { zone: true }
    });

    let counter = 1;
    for (const v of volunteers) {
      const code = v.zone?.code || "ST";
      const badge = `VOL-${code}-${counter.toString().padStart(3, "0")}`;
      await prisma.volunteer.update({
        where: { id: v.id },
        data: { volunteerNo: badge }
      });
      counter++;
    }

    revalidatePath("/dashboard/volunteers");
    return { success: true, count: volunteers.length };
  } catch (error: any) {
    console.error("Error generating numbers:", error);
    return { success: false, error: error.message || "Failed to generate badge numbers" };
  }
}
