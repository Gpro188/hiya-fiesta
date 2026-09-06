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
  let userTeam: any = null;
  let categories: any[] = [];
  let teams: any[] = [];
  let masterStudents: any[] = [];
  let isRegistrationOpen = true;
  let registrationStatusMessage = "";
  let isSchedulePublished = true;

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
          userTeam = team;
          userTeamId = team.id;

          // Fetch MasterStudents for this institution
          masterStudents = await prisma.masterStudent.findMany({
            where: { institutionId: fullUser.institutionId },
            orderBy: { name: 'asc' }
          });

          // Auto-Sync block removed to prevent automatic candidate registration

          const now = new Date();
          const start = zoneEvent.registrationStart || zoneEvent.parent?.registrationStart;
          const offEnd = zoneEvent.offStageRegistrationEnd || zoneEvent.parent?.offStageRegistrationEnd;
          const onEnd = zoneEvent.onStageRegistrationEnd || zoneEvent.parent?.onStageRegistrationEnd;
          const generalEnd = zoneEvent.institutionRegistrationEndDate || zoneEvent.registrationEnd || zoneEvent.parent?.institutionRegistrationEndDate || zoneEvent.parent?.registrationEnd;

          const isUnlocked = team.registrationUnlocked || team.offStageUnlocked || team.onStageUnlocked;
          const isOffStageOpen = !offEnd || now <= offEnd;
          const isOnStageOpen = (!onEnd || now <= onEnd) && !team.isOnStageConfirmed;
          const isGeneralOpen = !generalEnd || now <= generalEnd;
          const isAnyStageOpen = isOffStageOpen || isOnStageOpen || isGeneralOpen;

          const isOffStageConfirmed = team.isAssignmentsConfirmed;
          const isOnStageConfirmed = team.isOnStageConfirmed;
          const isBothConfirmed = isOffStageConfirmed && (isOnStageConfirmed || !isOnStageOpen);

          if (isBothConfirmed && !isUnlocked) {
            isRegistrationOpen = false;
            registrationStatusMessage = "All registrations are confirmed and locked by the Zone Admin. Please contact your Zone Admin to unlock for any corrections.";
          } else if (start && now < start) {
            isRegistrationOpen = false;
            registrationStatusMessage = `Registration will open on ${start.toLocaleString()}.`;
          } else if (!isUnlocked && !isAnyStageOpen) {
            isRegistrationOpen = false;
            registrationStatusMessage = "Registration deadlines for Off-Stage and On-Stage programs have passed. Please contact your Zone Admin.";
          }

          isSchedulePublished = zoneEvent.statusOverride === "SCHEDULE_PUBLISHED" || 
            Boolean(zoneEvent.parent && zoneEvent.parent.statusOverride === "SCHEDULE_PUBLISHED");
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
      photo: true,
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

  // Sort candidates sequentially: by chest number if assigned, else by name
  candidates.sort((a, b) => {
    if (a.chestNumber && b.chestNumber) {
      const numA = parseInt(a.chestNumber, 10);
      const numB = parseInt(b.chestNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.chestNumber.localeCompare(b.chestNumber);
    }
    if (a.chestNumber) return -1;
    if (b.chestNumber) return 1;
    return a.name.localeCompare(b.name);
  });

  const isChestNosConfirmed = candidates.some(c => Boolean(c.chestNumber));
  const canPrintCards = isSchedulePublished || isChestNosConfirmed;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Students Management</h1>
        <p className="page-description">
          Manage students in {userTeamId ? "your institution" : "the event"}. Upload photos and define basic details.
        </p>
      </div>

      {/* Confirmation & Chest Number Status Banner for Institutions */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) && userTeam?.isAssignmentsConfirmed && (
        <div style={{
          padding: '18px 24px',
          borderRadius: '12px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '2px solid #10b981',
          marginBottom: 'var(--spacing-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem' }}>🎉</span>
              <strong style={{ fontSize: '1.1rem', color: '#065f46' }}>
                Official Registration Confirmed by Zone Admin!
              </strong>
              {userTeam.magazineCode && (
                <span style={{ 
                  fontSize: '0.8rem', 
                  padding: '3px 10px', 
                  borderRadius: '6px', 
                  backgroundColor: '#8E0033', 
                  color: 'white', 
                  fontWeight: 800,
                  letterSpacing: '0.5px' 
                }}>
                  MAGAZINE CODE: {userTeam.magazineCode}
                </span>
              )}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#047857', maxWidth: '750px', lineHeight: 1.5 }}>
              All registered students have been officially approved with sequential Chest Numbers. You can now download and print the official Registered Student List and Candidate ID Cards.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a 
              href={`/print/candidates?teamId=${userTeamId}`} 
              target="_blank" 
              className="btn btn-primary"
              style={{ 
                backgroundColor: '#059669', 
                borderColor: '#059669', 
                color: 'white', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontWeight: 700, 
                padding: '0.55rem 1.15rem' 
              }}
            >
              <span>📜</span> Print Student List (With Chest Nos)
            </a>
            <a 
              href={`/print/id-cards?teamId=${userTeamId}`} 
              target="_blank" 
              className="btn btn-secondary"
              style={{ 
                borderColor: '#059669', 
                color: '#059669', 
                backgroundColor: '#ffffff',
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontWeight: 700, 
                padding: '0.55rem 1.15rem' 
              }}
            >
              <span>🪪</span> Print All ID Cards
            </a>
          </div>
        </div>
      )}

      {["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) && !userTeam?.isAssignmentsConfirmed && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          marginBottom: 'var(--spacing-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.4rem' }}>⏳</span>
          <div style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: 1.5 }}>
            <strong>Awaiting Zone Admin Confirmation:</strong> Your registered students and program allocations are recorded. As soon as the Zone Admin reviews and confirms your institution list, official <strong>Chest Numbers</strong> and your <strong>Magazine Code</strong> will be assigned and displayed here.
          </div>
        </div>
      )}
      
      {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role) && (
        <CandidateBulkActions teams={teams} categories={categories} />
      )}

      {["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>1. Available Students</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              These students are available to be registered. Copy a UID and paste it in the form below.
            </p>
          </div>
          {masterStudents.length === 0 ? (
            <div style={{
              padding: '16px 20px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              color: '#92400e',
              fontSize: '0.88rem',
              lineHeight: 1.6
            }}>
              <strong>⚠️ No students found in your institution directory:</strong> If your students are not appearing or you cannot find a student by UID, their <strong>admission or promotion procedure</strong> in the institution portal might not be completed. Please ensure all student admissions and promotions are processed in the institution portal, or contact the <strong>IT Cell of CSWC</strong>.
            </div>
          ) : (
            <>
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

              {/* Helpful notice about missing students */}
              <div style={{
                marginTop: 'var(--spacing-md)',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: '0.82rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>ℹ️</span>
                <div>
                  <strong>Can't find a student?</strong> If any student is missing from your institution list or not found during UID search, ensure their <strong>admission or promotion procedure</strong> has been completed in the institution portal. If the issue persists, please contact the <strong>IT Cell of CSWC</strong>.
                </div>
              </div>
            </>
          )}
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
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>
              3. Registered Students {isChestNosConfirmed && <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', marginLeft: '6px' }}>✓ Chest Numbers Assigned</span>}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Showing {candidates.length} registered students {isChestNosConfirmed ? "(sorted sequentially by Chest Number)" : ""}
            </p>
          </div>
          <div data-tour="candidates-filters" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
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
            <a 
              href={`/print/candidates?${["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) ? `teamId=${userTeamId}` : (filterTeamId ? `teamId=${filterTeamId}` : (fullUser?.eventId ? `eventId=${fullUser.eventId}` : ''))}${filterCategoryId ? `&categoryId=${filterCategoryId}` : ''}`} 
              target="_blank" 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>📜</span> Print Student List
            </a>
            {["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) && !canPrintCards ? (
              <button 
                disabled
                title="ID Cards will be enabled once the final zone program schedule is published or chest numbers are assigned."
                className="btn btn-secondary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', opacity: 0.6, cursor: 'not-allowed' }}
              >
                🔒 ID Cards (Awaiting Publication/Chest Nos)
              </button>
            ) : (
              <a 
                data-tour="candidates-idcards"
                href={`/print/id-cards?${["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) ? `teamId=${userTeamId}` : (filterTeamId ? `teamId=${filterTeamId}` : (fullUser?.eventId ? `eventId=${fullUser.eventId}` : ''))}${filterCategoryId ? `&categoryId=${filterCategoryId}` : ''}`} 
                target="_blank" 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', backgroundColor: 'var(--primary)', color: 'white' }}
              >
                Bulk ID Cards
              </a>
            )}
          </div>
        </div>
        <CandidateList 
          candidates={candidates as any} 
          role={session.user.role} 
          categories={categories} 
          isSchedulePublished={canPrintCards}
        />
      </div>
    </div>
  );
}
