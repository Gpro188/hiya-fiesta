import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CandidateForm from "./CandidateForm";
import CandidateList from "./CandidateList";
import CandidateFilter from "./CandidateFilter";
import CandidateBulkActions from "./CandidateBulkActions";
import GenerateChestNumbersButton from "./GenerateChestNumbersButton";

export default async function CandidatesPage(props: { searchParams: Promise<{ teamId?: string, categoryId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const { teamId: filterTeamId, categoryId: filterCategoryId } = searchParams;

  if (!session || (!["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) && !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role))) {
    redirect("/dashboard");
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { institutionId: true, eventId: true, zoneId: true }
  });

  let userTeamId = null;
  let categories: any[] = [];
  let teams: any[] = [];
  let masterStudents: any[] = [];
  let isRegistrationOpen = true;
  let registrationStatusMessage = "";

  const userEventId = session.user.eventId;
  const categoryTeamWhere: any = userEventId ? {
    OR: [
      { eventId: userEventId },
      { event: { parentId: userEventId } }
    ]
  } : undefined;

  const [allTeams, allCategories] = await Promise.all([
    session.user.role === "ADMIN" ? prisma.team.findMany({ where: categoryTeamWhere, select: { id: true, name: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    session.user.role === "ADMIN" ? prisma.category.findMany({ where: categoryTeamWhere, select: { id: true, name: true }, orderBy: { name: 'asc' } }) : Promise.resolve([])
  ]);

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
    if (fullUser?.institutionId) {
      // Load the institution with its zone
      const institution = await prisma.masterInstitution.findUnique({
        where: { id: fullUser.institutionId },
        include: { zone: true }
      });

      // Find the Zone Event for this institution's zone
      let zoneEvent = null;
      if (institution?.zone) {
        zoneEvent = await prisma.event.findFirst({
          where: { 
            type: 'ZONE', 
            zoneId: institution.zone.id,
            NOT: { parentId: null } // must be linked to a state event
          },
          include: { 
            categories: true, 
            parent: { include: { categories: true } }
          }
        });
      }

      if (zoneEvent) {
        // Categories come from the zone event itself, or fall back to the state event's categories
        categories = zoneEvent.categories.length > 0 
          ? zoneEvent.categories 
          : (zoneEvent.parent?.categories || []);

        // Find or auto-create a Team for this institution in this Zone Event
        let team = await prisma.team.findFirst({
          where: { institutionId: fullUser.institutionId, eventId: zoneEvent.id }
        });

        if (!team && institution) {
          // Auto-create a team for this institution in the zone event
          const teamCode = institution.code || `INST${fullUser.institutionId.slice(0, 6).toUpperCase()}`;
          const safePrefixCode = `${teamCode}-${zoneEvent.id.slice(0, 4)}`;
          team = await prisma.team.create({
            data: {
              name: institution.name,
              prefixCode: safePrefixCode,
              eventId: zoneEvent.id,
              institutionId: fullUser.institutionId,
              flagColor: '#A5003A',
            }
          });
          console.log(`Auto-created team for institution ${institution.name} in event ${zoneEvent.name}`);
        }

        if (team) {
          userTeamId = team.id;

          // Fetch MasterStudents for this institution
          masterStudents = await prisma.masterStudent.findMany({
            where: { institutionId: fullUser.institutionId },
            orderBy: { name: 'asc' }
          });

          // Auto-Sync block removed to prevent automatic candidate registration

          const now = new Date();
          const start = zoneEvent.registrationStart;
          const end = zoneEvent.registrationEnd;

          if (start && now < start) {
            isRegistrationOpen = false;
            registrationStatusMessage = `Registration will open on ${start.toLocaleString()}.`;
          } else if (end && now > end) {
            isRegistrationOpen = false;
            registrationStatusMessage = `Registration closed on ${end.toLocaleString()}.`;
          }
        }
      }
    }
  } else {
    let teamWhere: any = {};

    if (["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)) {
      if (fullUser?.eventId) {
        teamWhere = { event: { parentId: fullUser.eventId } };
      }
      
      teams = await prisma.team.findMany({
        where: teamWhere,
        orderBy: { name: 'asc' }
      });
      
      let eventWhere: any = {};
      if (session.user.role === "ZONE_ADMIN" && fullUser?.zoneId) {
        eventWhere = { zoneId: fullUser.zoneId };
      } else if (fullUser?.eventId) {
        eventWhere = {
          OR: [
            { id: fullUser.eventId },
            { parentId: fullUser.eventId }
          ]
        };
      }
      
      categories = await prisma.category.findMany({
        where: { event: eventWhere },
        orderBy: { name: 'asc' }
      });
    }
  }

  // Define where clause scoped by eventId and role
  const whereClause: any = {};
  if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
    whereClause.teamId = userTeamId || "none";
  } else {
    if (session.user.eventId) {
      whereClause.team = { eventId: session.user.eventId };
    }
    if (filterTeamId) whereClause.teamId = filterTeamId;
  }
  
  if (filterCategoryId) whereClause.categoryId = filterCategoryId;

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      uid: true,
      chestNumber: true,
      photoUrl: true,
      isApproved: true,
      createdAt: true,
      team: { select: { id: true, name: true, prefixCode: true, flagColor: true, event: { select: { name: true } } } },
      category: { select: { id: true, name: true } },
      _count: {
        select: { programs: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Students Management</h1>
        <p className="page-description">
          Manage students in {userTeamId ? "your institution" : "the event"}. Upload photos and define basic details.
        </p>
      </div>
      
      {/* Bulk Import / Excel Actions (Admins only) */}
      {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role) && (
        <CandidateBulkActions teams={teams} categories={categories} />
      )}

      {/* Available Students (Managers Only) */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) && masterStudents.length > 0 && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>1. Available Students</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              These students are available to be registered. Copy a UID and paste it in the form below.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--spacing-md)' }}>
            {(() => {
              const unadded = masterStudents.filter(ms => !candidates.some(c => c.uid === ms.uid));
              if (unadded.length === 0) {
                return <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>All students have been registered!</div>;
              }
              const streams = Array.from(new Set(unadded.map(s => s.stream || 'Other')));
              
              return streams.map(stream => (
                <div key={stream} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {stream} Students
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                    <table className="data-table" style={{ fontSize: '0.875rem', width: '100%', margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-color)', zIndex: 1 }}>UID</th>
                          <th style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-color)', zIndex: 1 }}>Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unadded.filter(s => (s.stream || 'Other') === stream).map(student => (
                          <tr key={student.uid}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', width: '110px' }}>{student.uid}</td>
                            <td>{student.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Add Candidate Form (Available to Managers and Admins) */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div data-tour="candidates-form" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>2. Add Student {session.user.role === "ADMIN" && "(Admin Direct Add)"}</h3>
          {categories.length === 0 ? (
            <p style={{ color: 'var(--warning)' }}>No categories created for this event. Please add categories in Settings or Categories setup first.</p>
          ) : ["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) ? (
            userTeamId ? (
              <CandidateForm 
                teamId={userTeamId} 
                categories={categories} 
                masterStudents={masterStudents}
                isRegistrationOpen={isRegistrationOpen} 
                statusMessage={registrationStatusMessage} 
              />
            ) : (
              <p style={{ color: 'var(--warning)' }}>You are not assigned to any team.</p>
            )
          ) : (
            <CandidateForm teams={teams} categories={categories} isAdmin={true} />
          )}
        </div>
      </div>

      <div data-tour="candidates-list" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>3. Registered Students</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Showing {candidates.length} registered students</p>
          </div>
          <div data-tour="candidates-filters" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
             <CandidateFilter 
                teams={teams} 
                categories={categories} 
                currentTeamId={filterTeamId} 
                currentCategoryId={filterCategoryId}
                showTeamFilter={["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role)}
             />
            {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role) && fullUser?.eventId && (
              <GenerateChestNumbersButton eventId={fullUser.eventId} />
            )}
            <a href={`/print/candidates?${fullUser?.eventId ? `eventId=${fullUser.eventId}` : ''}${filterTeamId ? `&teamId=${filterTeamId}` : ''}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
              Print List
            </a>
            <a 
              data-tour="candidates-idcards"
              href={`/print/id-cards?${["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) ? `teamId=${userTeamId}` : (filterTeamId ? `teamId=${filterTeamId}` : (fullUser?.eventId ? `eventId=${fullUser.eventId}` : ''))}${filterCategoryId ? `&categoryId=${filterCategoryId}` : ''}`} 
              target="_blank" 
              className="btn btn-primary" 
              style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', backgroundColor: 'var(--primary)', color: 'white' }}
            >
              Bulk ID Cards
            </a>
          </div>
        </div>
        <CandidateList candidates={candidates as any} role={session.user.role} categories={categories} />
      </div>
    </div>
  );
}
