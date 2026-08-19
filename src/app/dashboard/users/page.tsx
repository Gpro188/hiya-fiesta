import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UserActions from "./UserActions";
import CreateUserForm from "./CreateUserForm";
import UserListTable from "./UserListTable";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const isZoneAdmin = session.user.role === "ZONE_ADMIN";
  
  // Look up user directly to guarantee accurate zoneId
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { zoneId: true }
  });
  const currentZoneId = currentUser?.zoneId || (session.user as any).zoneId;

  // Zone Admins strictly see ONLY Institution Managers belonging to their zone
  const whereClause = isZoneAdmin && currentZoneId
    ? {
        role: { in: ["INSTITUTION_MANAGER", "MANAGER"] },
        OR: [
          { zoneId: currentZoneId },
          { institution: { zoneId: currentZoneId } }
        ]
      }
    : isZoneAdmin
    ? { role: "NONE" } // Fallback empty if zoneId not linked
    : {};

  const users = await prisma.user.findMany({
    where: whereClause,
    include: {
      zone: true,
      institution: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const zones = isZoneAdmin && currentZoneId
    ? await prisma.zone.findMany({ where: { id: currentZoneId }, select: { id: true, name: true } })
    : await prisma.zone.findMany({ select: { id: true, name: true } });

  const institutions = isZoneAdmin && currentZoneId
    ? await prisma.masterInstitution.findMany({ where: { zoneId: currentZoneId }, select: { id: true, name: true, zoneId: true } })
    : await prisma.masterInstitution.findMany({ select: { id: true, name: true, zoneId: true } });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            {isZoneAdmin ? "Manage credentials for Institution Managers in your zone." : "Manage credentials for Judges, Zone Admins, and Institution Managers."}
          </p>
        </div>
        <CreateUserForm 
          role={session.user.role} 
          zones={zones} 
          institutions={institutions} 
          userZoneId={(session.user as any).zoneId} 
        />
      </div>

      <UserListTable 
        users={users as any} 
        zones={zones} 
        institutions={institutions} 
        isZoneAdmin={isZoneAdmin} 
      />
    </div>
  );
}
