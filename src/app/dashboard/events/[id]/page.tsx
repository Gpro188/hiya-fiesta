import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PointMatrixForm from "./PointMatrixForm";
import CategoryManager from "./CategoryManager";
import GeneralPointForm from "./GeneralPointForm";
import Link from "next/link";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      categories: {
        include: { pointMatrix: true }
      },
      generalPointMatrix: true,
      _count: {
        select: { programs: true, teams: true }
      }
    }
  });

  if (!event) return <div>Event not found</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <Link href="/dashboard/events" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          &larr; Back to Events
        </Link>
      </div>
      
      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>{event.name}</h1>
      <p className="page-description">
        Manage categories, point schemes, and division settings for this event. Configure how ranks convert to points for championship scoring.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-lg)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <div data-tour="event-categories">
            <CategoryManager eventId={event.id} categories={event.categories} />
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--spacing-xl) 0' }} />
          
          <div data-tour="event-general-points">
            <GeneralPointForm eventId={event.id} initialData={event.generalPointMatrix} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--spacing-xl) 0' }} />
          
          <div data-tour="event-point-matrix">
            <PointMatrixForm eventId={event.id} categories={event.categories} />
          </div>
        </div>
      </div>
    </div>
  );
}
