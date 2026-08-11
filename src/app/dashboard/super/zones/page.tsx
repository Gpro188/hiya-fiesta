import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ZonesClient from "./ZonesClient";

export default async function MasterZonesPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const zones = await prisma.zone.findMany({
    include: {
      _count: { select: { institutions: true, users: true } }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Master Zones Directory</h1>
        <p className="page-description">
          Manage the 8 Regional Zones.
        </p>
      </div>

      <ZonesClient initialZones={zones} />
    </div>
  );
}
