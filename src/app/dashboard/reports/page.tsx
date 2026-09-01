import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EventSwitcher from "@/app/components/EventSwitcher";

export default async function ReportsPage(props: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { role, id: userId } = session.user;

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { eventId: true, zoneId: true, institutionId: true }
  });

  if (["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role)) {
    const userEventId = fullUser?.eventId;
    const userZoneId = fullUser?.zoneId;
    
    let eventWhere: any = {};
    if (role === "ZONE_ADMIN" && userZoneId) {
      eventWhere = { zoneId: userZoneId };
    } else if (userEventId) {
      eventWhere = {
        OR: [
          { id: userEventId },
          { parentId: userEventId }
        ]
      };
    }

    const rawEvents = await prisma.event.findMany({
      where: eventWhere,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true }
    });

    const seenEventNames = new Set<string>();
    const events = rawEvents.filter(ev => {
      const key = ev.name.trim().toLowerCase();
      if (seenEventNames.has(key)) return false;
      seenEventNames.add(key);
      return true;
    });

    const activeEventId = (searchParams.eventId && events.some(e => e.id === searchParams.eventId)) 
      ? searchParams.eventId 
      : events[0]?.id;

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Reports & Print Hub</h1>
          <p className="page-description">
            Access all printable documents, schedules, and ID cards for the event.
          </p>
        </div>

        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <EventSwitcher events={events} activeEventId={activeEventId || ""} />
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Schedules & Management</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
          <a href={`/print/schedule?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗓️</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Global Schedule</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print the complete timeline of all programs</p>
          </a>
          
          <a href={`/print/venue?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📍</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Venue Controller List</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print schedules grouped by venue/stage</p>
          </a>
          
          <a href={`/print/stage-manager?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid var(--primary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)' }}>Stage Manager Sheet</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Assign code letters and verify candidate photos before performance.</p>
          </a>

          <a href={`/print/off-stage-invigilation?eventId=${activeEventId}${role === 'ZONE_ADMIN' && userZoneId ? `&zoneId=${userZoneId}` : ''}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid #8E0033' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#8E0033' }}>Off-Stage Invigilation Sheets</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print category-wise institution exam sheets with blank invigilator details and candidate sign boxes.</p>
          </a>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Judging & Tabulation (Blind Judging)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
          <a href={`/print/valuation?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid var(--accent)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--accent)' }}>Jury Valuation Sheet</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Blank scoring sheets for judges. (Hides candidate identity).</p>
          </a>
          
          <a href={`/print/tabulation?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid var(--accent)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🧮</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--accent)' }}>Judgement Tabulation Sheet</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Master sheet to map code letters to identities and tally judge scores.</p>
          </a>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Candidates & Teams</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
          <a href={`/print/candidates?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Candidates List</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print the master list of all candidates</p>
          </a>
          
          <a href={`/print/id-cards?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🆔</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Candidate ID Cards</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print ID cards for all approved candidates across all teams</p>
          </a>

          <a href={`/print/volunteer-id-cards${role === 'ZONE_ADMIN' && userZoneId ? `?zoneId=${userZoneId}` : ''}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid var(--primary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🦺</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)' }}>Volunteer ID Cards</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official ID cards for all registered festival volunteers</p>
          </a>
        </div>
      </div>
    );
  }

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role)) {
    if (!fullUser?.institutionId) return <div>You are not assigned to any institution.</div>;

    const team = await prisma.team.findFirst({
      where: fullUser.eventId 
        ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
        : { institutionId: fullUser.institutionId }
    });

    if (!team) return <div>You are not assigned to any team.</div>;

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Institution Print Hub</h1>
          <p className="page-description">
            Access printable documents, off-stage invigilation sheets, and ID cards for your institution.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
          <a href={`/print/off-stage-invigilation?teamId=${team.id}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #8E0033' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#8E0033' }}>Off-Stage Invigilation Sheets</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Official category-separated sheets for external invigilators with candidate details & signature records.</p>
          </a>

          <a href={`/print/schedule?teamId=${team.id}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗓️</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Team Schedule</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print a simple schedule of your team's programs</p>
          </a>
          
          <a href={`/print/institution-report?teamId=${team.id}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📑</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Candidate Schedule Report</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Detailed report of all your assigned candidates, venues, and timings</p>
          </a>

          <a href={`/print/id-cards?teamId=${team.id}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🆔</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Team ID Cards</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official ID cards for all your approved candidates</p>
          </a>
        </div>
      </div>
    );
  }

  redirect("/dashboard");
}
