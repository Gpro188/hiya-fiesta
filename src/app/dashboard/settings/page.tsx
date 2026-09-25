import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import SettingsForm from "./SettingsForm";
import RegistrationLimitsCard from "./RegistrationLimitsCard";
import PointMatrixSettingsCard from "./PointMatrixSettingsCard";
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
      type: true,
      parentId: true,
      startDate: true,
      endDate: true,
      registrationStart: true,
      registrationEnd: true,
      assignmentStart: true,
      assignmentEnd: true,
      institutionRegistrationEndDate: true,
      offStageRegistrationEnd: true,
      onStageRegistrationEnd: true,
      zoneActiveStartTime: true,
      zoneActiveEndTime: true,
      stateConfirmEndDate: true,
      statusOverride: true,
      zoneUnlockWindowStart: true,
      zoneUnlockWindowEnd: true,
      zoneUnlockMode: true,
    },
    orderBy: { createdAt: 'asc' }
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {["ADMIN", "SUPER_ADMIN"].includes(role) && (
            <a 
              href="#registration-limits" 
              className="btn btn-secondary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <span>🎯</span> Candidate Program Limits
            </a>
          )}
          {["ADMIN", "SUPER_ADMIN"].includes(role) && (
            <a 
              href="#point-matrix" 
              className="btn btn-secondary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <span>🏆</span> Points Matrix
            </a>
          )}
          {["ADMIN", "SUPER_ADMIN"].includes(role) && (
            <a 
              href="/dashboard/settings/homepage" 
              className="btn btn-primary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <span>🎨</span> Homepage & Theme Settings
            </a>
          )}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-xl)' }}>
        {["ADMIN", "SUPER_ADMIN"].includes(role) && (
          <div data-tour="settings-limits">
            <RegistrationLimitsCard initialSettings={settings} role={role} />
          </div>
        )}

        {["ADMIN", "SUPER_ADMIN"].includes(role) && (
          <div data-tour="settings-point-matrix" id="point-matrix">
            <PointMatrixSettingsCard events={events as any} />
          </div>
        )}

        <div data-tour="settings-config" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.25rem' }}>General Configuration</h2>
          <SettingsForm initialSettings={settings} events={events as any} role={role} />
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
