import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeamForm from "./TeamForm";
import TeamList from "./TeamList";
import Link from "next/link";

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { eventId: true, zoneId: true }
  });

  const { role } = session.user;

  let eventWhere: any = {};
  if (role === "ZONE_ADMIN" && fullUser?.zoneId) {
    eventWhere = { zoneId: fullUser.zoneId };
  } else if (fullUser?.eventId) {
    eventWhere = { parentId: fullUser.eventId };
  }

  const events = await prisma.event.findMany({
    where: eventWhere,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, _count: { select: { programs: true } } }
  });

  let teamWhere: any = {};
  if (role === "ZONE_ADMIN" && fullUser?.zoneId) {
    teamWhere = { event: { zoneId: fullUser.zoneId } };
  } else if (fullUser?.eventId) {
    teamWhere = { event: { parentId: fullUser.eventId } };
  }

  const teams = await prisma.team.findMany({
    where: teamWhere,
    include: {
      event: {
        include: {
          parent: true
        }
      },
      _count: {
        select: { candidates: true }
      },
      candidates: {
        select: {
          id: true,
          _count: { select: { programs: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Teams Management</h1>
        <p className="page-description">
          Manage participating teams. Assign managers, set flag colors, and define prefix codes used for chest number generation.
        </p>
      </div>

      {role === "ZONE_ADMIN" && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          color: '#60a5fa',
          fontSize: '0.875rem',
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.4rem' }}>💡</span>
          <div>
            <strong>How to Open Registration for an Individual Institution:</strong> To unlock registration or program assignment for any specific college in your zone, find the college below and click <strong>⚡ Unlock Registration</strong>. You can choose to open <em>Off-Stage only</em>, <em>On-Stage only</em>, or <em>Full Access</em>.
          </div>
        </div>
      )}
      
      {events.length === 0 ? (
        <div className="glass-panel empty-state-guidance">
          <p style={{ color: 'var(--warning)', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
            No events found.
          </p>
          <p>Events are the foundation of your festival. Create an event first, then come back to add participating teams.</p>
          <Link href="/dashboard/events" className="empty-state-action">Go to Events &rarr;</Link>
        </div>
      ) : (
        <div style={{ display: role === 'ZONE_ADMIN' ? 'block' : 'grid', gridTemplateColumns: role === 'ZONE_ADMIN' ? 'none' : '1fr 2fr', gap: 'var(--spacing-lg)' }}>
          {role !== 'ZONE_ADMIN' && (
            <div>
              <div data-tour="teams-form" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Create New Team</h3>
                <TeamForm events={events} />
              </div>
            </div>
          )}
          
          <div>
            <div data-tour="teams-list" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>All Teams (Registration Status)</h3>
              <TeamList teams={teams as any} role={role} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
