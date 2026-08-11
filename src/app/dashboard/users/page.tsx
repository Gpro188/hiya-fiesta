import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UserActions from "./UserActions";
import CreateUserForm from "./CreateUserForm";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const isZoneAdmin = session.user.role === "ZONE_ADMIN";
  // Zone Admins only see users in their zone
  const whereClause = isZoneAdmin ? { zoneId: (session.user as any).zoneId } : {};

  const users = await prisma.user.findMany({
    where: whereClause,
    include: {
      zone: true,
      institution: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const zones = await prisma.zone.findMany({ select: { id: true, name: true } });
  const institutions = await prisma.masterInstitution.findMany({ select: { id: true, name: true, zoneId: true } });

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

      <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>{user.username}</td>
                  <td>
                    <span className={`badge ${
                      user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'badge-error' : 
                      user.role === 'ZONE_ADMIN' ? 'badge-brand' : 'badge-success'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.institution?.name || (user.zone ? `${user.zone.name} Zone` : null) || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <UserActions userId={user.id} username={user.username} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
