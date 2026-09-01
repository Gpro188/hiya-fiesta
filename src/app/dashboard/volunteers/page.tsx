import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VolunteerList from "./VolunteerList";

export default async function VolunteersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const { role, id: userId } = session.user;

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { zoneId: true, eventId: true, zone: { select: { id: true, name: true, code: true } } }
  });

  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const userZoneId = fullUser?.zoneId || null;
  const zoneName = fullUser?.zone?.name || "";

  // Fetch zones for filter/assignment
  const zones = await prisma.zone.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });

  // Where filter for volunteers
  let volunteerWhere: any = {};
  if (role === "ZONE_ADMIN" && userZoneId) {
    volunteerWhere = { zoneId: userZoneId };
  }

  const volunteers = await prisma.volunteer.findMany({
    where: volunteerWhere,
    include: {
      zone: { select: { id: true, name: true, code: true } },
      event: { select: { id: true, name: true } }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "40px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <span style={{ fontSize: "1.8rem" }}>🦺</span>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {role === "ZONE_ADMIN" ? `${zoneName || "Zone"} Volunteer Management` : "Volunteer Management Hub"}
          </h1>
        </div>
        <p className="page-description" style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {role === "ZONE_ADMIN"
            ? `Register, manage, and print official ID cards for volunteers in ${zoneName || "your zone"}.`
            : "Register and organize all festival volunteers with photos, contact details, assigned duty areas, and generate printable ID cards."}
        </p>
      </div>

      {/* Interactive Volunteer List */}
      <VolunteerList
        volunteers={volunteers}
        zones={zones}
        isSuperAdmin={isSuperAdmin}
        userZoneId={userZoneId}
        zoneName={zoneName}
      />
    </div>
  );
}
