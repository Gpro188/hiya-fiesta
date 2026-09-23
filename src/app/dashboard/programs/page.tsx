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

  if (!session || !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const isZoneAdmin = session.user.role === "ZONE_ADMIN";

  const fullUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { eventId: true, zoneId: true, role: true }
  });

  const userZoneId = isZoneAdmin ? (fullUser?.zoneId || (session.user as any).zoneId || null) : null;
  let zoneInfo: { id: string; name: string; code: string } | null = null;
  let zoneEventId = fullUser?.eventId || session.user.eventId || null;
  let stateEventId: string | null = null;

  const stateEvent = await prisma.event.findFirst({
    where: { type: 'STATE' },
    select: { id: true, name: true }
  });
  stateEventId = stateEvent?.id || null;

  if (isZoneAdmin && userZoneId) {
    zoneInfo = await prisma.zone.findUnique({
      where: { id: userZoneId },
      select: { id: true, name: true, code: true }
    });
    if (!zoneEventId) {
      const ze = await prisma.event.findFirst({
        where: { type: 'ZONE', zoneId: userZoneId }
      });
      if (ze) zoneEventId = ze.id;
    }
  }

  // Events list for filters & categories
  const eventWhere = isZoneAdmin
    ? {
        OR: [
          ...(zoneEventId ? [{ id: zoneEventId }] : []),
          ...(stateEventId ? [{ id: stateEventId }] : []),
          ...(userZoneId ? [{ zoneId: userZoneId }] : [])
        ]
      }
    : (session.user.eventId ? { id: session.user.eventId } : undefined);

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

  // Allowed event IDs for program query
  const targetEventIds = Array.from(new Set([stateEventId, zoneEventId, session.user.eventId].filter(Boolean))) as string[];

  const rawPrograms = await prisma.program.findMany({
    where: isZoneAdmin 
      ? (targetEventIds.length > 0 ? { eventId: { in: targetEventIds } } : undefined)
      : (session.user.eventId ? { eventId: session.user.eventId } : undefined),
    include: {
      event: true,
      category: true,
      judges: { select: { id: true, username: true } },
      _count: {
        select: { assignments: true }
      }
    },
    orderBy: [
      { programCode: 'asc' },
      { name: 'asc' }
    ]
  });

  // Calculate actual candidate registration counts (scoped to zone for ZONE_ADMIN)
  let programsWithCounts: any[] = rawPrograms;

  if (isZoneAdmin && userZoneId) {
    // Deduplicate programs by normalized name + category
    const programMap = new Map<string, typeof rawPrograms[0]>();
    for (const p of rawPrograms) {
      const key = `${p.name.trim().toUpperCase()}_${p.categoryId || 'NONE'}`;
      if (!programMap.has(key)) {
        programMap.set(key, p);
      } else {
        const existing = programMap.get(key)!;
        if (p._count.assignments > existing._count.assignments) {
          programMap.set(key, p);
        }
      }
    }
    const deduplicatedPrograms = Array.from(programMap.values());

    // Fetch assignment counts for these programs in this zone
    const allMatchingProgramIds = rawPrograms.map(p => p.id);
    const zoneAssignments = await prisma.programAssignment.findMany({
      where: {
        programId: { in: allMatchingProgramIds },
        candidate: {
          OR: [
            { institution: { zoneId: userZoneId } },
            { team: { institution: { zoneId: userZoneId } } },
            { team: { event: { zoneId: userZoneId } } }
          ]
        }
      },
      select: {
        candidateId: true,
        program: {
          select: { name: true, categoryId: true }
        }
      }
    });

    const countMap: Record<string, number> = {};
    const seen = new Set<string>();
    for (const za of zoneAssignments) {
      const key = `${za.program.name.trim().toUpperCase()}_${za.program.categoryId || 'NONE'}`;
      const dedupKey = `${key}_${za.candidateId}`;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        countMap[key] = (countMap[key] || 0) + 1;
      }
    }

    programsWithCounts = deduplicatedPrograms.map(p => {
      const key = `${p.name.trim().toUpperCase()}_${p.categoryId || 'NONE'}`;
      const count = countMap[key] || 0;
      return {
        ...p,
        candidateCount: count,
        _count: { assignments: count }
      };
    });
  }

  const allCategories = events.flatMap(e => e.categories);
  const judges = await prisma.user.findMany({ where: { role: 'JUDGE' }, select: { id: true, username: true } });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: 'var(--spacing-xs)' }}>
            <h1 style={{ margin: 0 }}>
              {isZoneAdmin && zoneInfo ? `${zoneInfo.name} Programs & Participants` : "Programs Management"}
            </h1>
            {isZoneAdmin && zoneInfo && (
              <span style={{ 
                fontSize: '0.8rem', 
                fontWeight: 800, 
                backgroundColor: '#8E0033', 
                color: '#ffffff', 
                padding: '3px 10px', 
                borderRadius: '6px' 
              }}>
                📍 {zoneInfo.code} ZONE
              </span>
            )}
          </div>
          <p className="page-description" style={{ margin: 0 }}>
            {isZoneAdmin 
              ? "Browse all competition programs and inspect registered candidates. Check chest number assignments and photo compliance across institutions."
              : "Define all competition programs. Set types (Individual/Group), categories, time limits, and candidate limits per team."}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href="/print/programs-registration"
            target="_blank"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1.15rem',
              fontSize: '0.86rem',
              fontWeight: 800,
              backgroundColor: '#8E0033',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(142,0,51,0.2)'
            }}
          >
            <span>📊</span> Programs with Registered Counts
          </a>
          <a 
            href="/program_manual.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Program Manual
          </a>
        </div>
      </div>

      {isZoneAdmin && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: 'var(--spacing-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#1e40af',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <span style={{ fontSize: '1.25rem' }}>💡</span>
          <div>
            <strong>Registration Checker:</strong> Click on <em>&ldquo;View Participants&rdquo;</em> on any program card below to inspect all registered candidates, check missing chest numbers, and verify uploaded photos for this zone.
          </div>
        </div>
      )}
      
      {events.length === 0 && rawPrograms.length === 0 ? (
        <div className="glass-panel empty-state-guidance">
          <p style={{ color: 'var(--warning)', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
            No events found.
          </p>
          <p>Programs belong to events. Create an event first, then define programs and categories here.</p>
          <Link href="/dashboard/events" className="empty-state-action">Go to Events &rarr;</Link>
        </div>
      ) : (
        <>
          {!isZoneAdmin && (
            <div data-tour="programs-bulk">
              <ProgramBulkActions 
                events={events} 
                programs={programsWithCounts} 
                categories={allCategories} 
              />
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: isZoneAdmin ? '1fr' : '1fr 2fr', gap: 'var(--spacing-lg)' }}>
            {!isZoneAdmin && (
              <div>
                <div data-tour="programs-form" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                  <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Create New Program</h3>
                  <ProgramForm events={events} userRole={session.user.role} />
                </div>
              </div>
            )}
          
            <div>
              <div data-tour="programs-list" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
                  {isZoneAdmin ? "Competition Programs & Candidate Rosters" : "All Programs"}
                </h3>
                <ProgramList 
                  programs={programsWithCounts as any} 
                  categories={allCategories} 
                  role={session.user.role} 
                  judges={judges}
                  userZoneId={userZoneId || undefined}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
