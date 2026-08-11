import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProgramForm from "./ProgramForm";
import ProgramList from "./ProgramList";
import ProgramBulkActions from "./BulkActions";
import Link from "next/link";

export default async function ProgramsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const isZoneAdmin = session.user.role === "ZONE_ADMIN";

  const eventWhere = session.user.eventId ? { id: session.user.eventId } : undefined;

  const events = await prisma.event.findMany({
    where: eventWhere,
    select: {
      id: true,
      name: true,
      createdAt: true,
      categories: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const programsWhere = session.user.eventId ? { eventId: session.user.eventId } : undefined;

  const programs = await prisma.program.findMany({
    where: programsWhere,
    include: {
      event: true,
      category: true,
      judges: { select: { id: true, username: true } },
      _count: {
        select: { assignments: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const allCategories = events.flatMap(e => e.categories);
  const judges = await prisma.user.findMany({ where: { role: 'JUDGE' }, select: { id: true, username: true } });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Programs Management</h1>
          <p className="page-description">
            Define all competition programs. Set types (Individual/Group), categories, time limits, and candidate limits per team.
          </p>
        </div>
        <a 
          href="/program_manual.pdf" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download Program Manual
        </a>
      </div>
      
      {events.length === 0 ? (
        <div className="glass-panel empty-state-guidance">
          <p style={{ color: 'var(--warning)', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
            No events found.
          </p>
          <p>Programs belong to events. Create an event first, then define programs and categories here.</p>
          <Link href="/dashboard/events" className="empty-state-action">Go to Events &rarr;</Link>
        </div>
      ) : (
        <>
          <div data-tour="programs-bulk">
            <ProgramBulkActions 
              events={events} 
              programs={programs} 
              categories={allCategories} 
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: isZoneAdmin ? '1fr' : '1fr 2fr', gap: 'var(--spacing-lg)' }}>
            {!isZoneAdmin && (
              <div>
                <div data-tour="programs-form" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                  <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Create New Program</h3>
                  <ProgramForm events={events} />
                </div>
              </div>
            )}
          
            <div>
              <div data-tour="programs-list" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>All Programs</h3>
                <ProgramList programs={programs as any} categories={allCategories} role={session.user.role} judges={judges} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
