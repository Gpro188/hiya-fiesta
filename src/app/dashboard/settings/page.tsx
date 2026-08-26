import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import SettingsForm from "./SettingsForm";
import PendingList from "./PendingList";
import MaintenanceActions from "./MaintenanceActions";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const { eventId, role } = session.user;
  const settings = await getSettings(eventId);

  const eventFilter = (eventId && role !== "SUPER_ADMIN") ? { eventId } : undefined;

  // Fetch events for deadline configuration
  const events = await prisma.event.findMany({
    where: (eventId && role !== "SUPER_ADMIN") ? { 
      OR: [
        { id: eventId },
        { parentId: eventId }
      ]
    } : undefined,
    select: {
      id: true,
      name: true,
      registrationStart: true,
      registrationEnd: true,
      assignmentStart: true,
      assignmentEnd: true,
      institutionRegistrationEndDate: true,
      zoneActiveStartTime: true,
      zoneActiveEndTime: true,
      stateConfirmEndDate: true,
      statusOverride: true,
    },
    orderBy: { createdAt: 'asc' }
  });

  // Fetch Pending Assignments (optimized queries to select only necessary fields, omitting photos)
  const programs = await prisma.program.findMany({
    where: eventFilter,
    select: {
      id: true,
      name: true,
      type: true,
      categoryId: true,
      candidateLimitPerTeam: true,
      _count: { select: { assignments: true } },
      category: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const teams = await prisma.team.findMany({
    where: eventFilter,
    select: {
      id: true,
      name: true,
      _count: { select: { candidates: true } },
      candidates: {
        select: {
          id: true,
          categoryId: true,
          _count: { select: { programs: true } },
          programs: {
            select: {
              programId: true
            }
          }
        }
      }
    }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>System Settings & Audit</h1>
          <p className="page-description" style={{ margin: 0 }}>
            Configure festival-wide settings, audit program assignments, and manage data maintenance operations.
          </p>
        </div>
        {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && (
          <a 
            href="/dashboard/settings/homepage" 
            className="btn btn-primary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <span>🎨</span> {role === "ZONE_ADMIN" ? "Zone Banner & Portal Settings" : "Homepage & Theme Settings"}
          </a>
        )}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-xl)' }}>
        <div data-tour="settings-config" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem' }}>General Configuration</h2>
          <SettingsForm initialSettings={settings} events={events as any} role={role} />
        </div>

        <div data-tour="settings-audit" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem' }}>Program Assignment Audit (Pending List)</h2>
          <PendingList programs={programs as any} teams={teams as any} />
        </div>

        {role === "SUPER_ADMIN" && (
          <div data-tour="settings-maintenance" className="glass-panel" style={{ padding: 'var(--spacing-lg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem', color: 'var(--error)' }}>Data Management & Maintenance (Super Admin)</h2>
            <MaintenanceActions />
          </div>
        )}
      </div>
    </div>
  );
}
