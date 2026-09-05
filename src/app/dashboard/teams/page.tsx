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
          padding: '14px 20px',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          border: '1.5px solid #bfdbfe',
          fontSize: '0.88rem',
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>💡</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e40af', marginBottom: '6px' }}>
              How to Open Off-Stage Only or On-Stage Only Registration in Your Zone:
            </div>
            <div style={{ color: '#1e293b', lineHeight: 1.6 }}>
              <div>
                <strong>1. For an Individual College:</strong> Find the college below and click the crimson button{" "}
                <span style={{ backgroundColor: '#8E0033', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem' }}>
                  ⚡ Unlock Registration (Off/On-Stage)
                </span>
                . In the popup, choose <strong>🎨 Open OFF-STAGE Only</strong> or <strong>🎭 Open ON-STAGE Only</strong>.
              </div>
              <div style={{ marginTop: '4px' }}>
                <strong>2. For All Colleges in the Zone:</strong> Go to{" "}
                <Link href="/dashboard/settings" style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'underline' }}>
                  Zone Settings
                </Link>{" "}
                &rarr; <strong>Split Stage Deadlines</strong> to set different closing dates for Off-Stage vs On-Stage competitions.
              </div>
            </div>
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
