import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EventForm from "./EventForm";
import EventList from "./EventList";

export default async function EventsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const events = await prisma.event.findMany({
    where: { parentId: session.user.eventId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { programs: true, teams: true }
      }
    }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Events & Sub-Fest Management</h1>
        <p className="page-description">
          Manage your festival events and optional sub-fests (such as On-Stage / Off-Stage divisions). Single-event festivals operate directly out of your main event tenant without creating extra sub-events.
        </p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-lg)' }}>
        <div>
          <div data-tour="events-form" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Create New Event</h3>
            <EventForm />
          </div>
        </div>
        
        <div>
          <div data-tour="events-list" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>All Events</h3>
            <EventList events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}
