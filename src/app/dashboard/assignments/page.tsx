import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import AssignmentForm from "./AssignmentForm";
import Link from "next/link";
import { isInstitutionProgram } from "@/lib/programUtils";

export default async function AssignmentsPage(props: { searchParams: Promise<{ candidateId?: string, teamId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || (!["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role) && !["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role))) {
    redirect("/dashboard");
  }

  let teamId: string | null = searchParams.teamId || null;
  let isAssignmentOpen = true;
  let assignmentStatusMessage = "";
  let isAssignmentsConfirmed = false;
  let zoneEventId: string | null = null;
  let parentEventId: string | null = null;
  let availableTeams: Array<{ id: string, name: string }> = [];

  const fullUser = await prisma.user.findUnique({ 
    where: { id: session.user.id }, 
    select: { institutionId: true, eventId: true, zoneId: true } 
  });

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(session.user.role)) {
    if (!fullUser?.institutionId) return <div>You are not assigned to any institution.</div>;

    // Find team via institution → zone → zone event (same logic as candidates page)
    const institution = await prisma.masterInstitution.findUnique({
      where: { id: fullUser.institutionId },
      include: { zone: true }
    });

    if (institution?.zone) {
      const zoneEvent = await prisma.event.findFirst({
        where: { type: 'ZONE', zoneId: institution.zone.id, NOT: { parentId: null } },
        include: { parent: true }
      });

      if (zoneEvent) {
        zoneEventId = zoneEvent.id;
        parentEventId = zoneEvent.parentId;
        let team = await prisma.team.findFirst({
          where: { institutionId: fullUser.institutionId, eventId: zoneEvent.id }
        });

        if (!team && institution) {
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
        }

        if (team) {
          teamId = team.id;
          isAssignmentsConfirmed = team.isAssignmentsConfirmed;
        }
      }
    }
  } else {
    // Admin / Zone Admin / Super Admin
    if (session.user.role === "ZONE_ADMIN" && fullUser?.zoneId) {
      const zoneEvent = await prisma.event.findFirst({
        where: { type: 'ZONE', zoneId: fullUser.zoneId, NOT: { parentId: null } }
      });
      if (zoneEvent) {
        zoneEventId = zoneEvent.id;
        parentEventId = zoneEvent.parentId;
      }
      availableTeams = await prisma.team.findMany({
        where: { event: { zoneId: fullUser.zoneId } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      });
    } else if (fullUser?.eventId) {
      zoneEventId = fullUser.eventId;
      const ev = await prisma.event.findUnique({ where: { id: zoneEventId } });
      if (ev) parentEventId = ev.parentId;
      availableTeams = await prisma.team.findMany({
        where: { OR: [{ eventId: zoneEventId }, { event: { parentId: zoneEventId } }] },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      });
    }

    if (!teamId && availableTeams.length > 0) {
      teamId = availableTeams[0].id;
    }
  }

  // Load team details with event and parent event
  let currentTeam: any = null;
  if (teamId) {
    currentTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: {
          include: { parent: true }
        }
      }
    });
    if (currentTeam) {
      isAssignmentsConfirmed = currentTeam.isAssignmentsConfirmed;
    }
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const now = new Date();

  const offDeadline =
    currentTeam?.event?.offStageRegistrationEnd ||
    currentTeam?.event?.parent?.offStageRegistrationEnd ||
    currentTeam?.event?.institutionRegistrationEndDate ||
    currentTeam?.event?.parent?.institutionRegistrationEndDate ||
    currentTeam?.event?.registrationEnd ||
    currentTeam?.event?.parent?.registrationEnd;

  const onDeadline =
    currentTeam?.event?.onStageRegistrationEnd ||
    currentTeam?.event?.parent?.onStageRegistrationEnd ||
    currentTeam?.event?.institutionRegistrationEndDate ||
    currentTeam?.event?.parent?.institutionRegistrationEndDate ||
    currentTeam?.event?.registrationEnd ||
    currentTeam?.event?.parent?.registrationEnd;

  const isOffStageDeadlinePassed = offDeadline ? now > new Date(offDeadline) : false;
  const isOnStageDeadlinePassed = onDeadline ? now > new Date(onDeadline) : false;

  const isOffStageOpen = isAdmin || (currentTeam?.offStageUnlocked || (!currentTeam?.isAssignmentsConfirmed && !isOffStageDeadlinePassed));
  const isOnStageOpen = isAdmin || (currentTeam?.onStageUnlocked || (!currentTeam?.isAssignmentsConfirmed && !isOnStageDeadlinePassed));

  if (!isAdmin && currentTeam) {
    if (currentTeam.isAssignmentsConfirmed && !currentTeam.offStageUnlocked && !currentTeam.onStageUnlocked) {
      isAssignmentOpen = false;
      assignmentStatusMessage = "Program assignments have been submitted to the Zone and are now locked.";
    } else if (!isOffStageOpen && !isOnStageOpen) {
      isAssignmentOpen = false;
      assignmentStatusMessage = "Both Off-Stage and On-Stage registration deadlines have passed. Contact your Zone Admin to request access.";
    } else {
      isAssignmentOpen = true;
    }
  }

  // Candidates scoped to team
  const whereClause: any = {};
  if (teamId) {
    whereClause.teamId = teamId;
  } else if (zoneEventId) {
    whereClause.team = { eventId: zoneEventId };
  }

  const candidates = await prisma.candidate.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      chestNumber: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true
        }
      },
      programs: {
        select: {
          id: true,
          programId: true,
          program: {
            select: {
              id: true,
              name: true,
              type: true,
              stageType: true,
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const eventIdsToSearch = [zoneEventId, parentEventId, session.user.eventId].filter(Boolean) as string[];
  const programs = await prisma.program.findMany({
    where: eventIdsToSearch.length > 0 ? { eventId: { in: eventIdsToSearch } } : {},
    include: { 
      event: true,
      category: true
    },
    orderBy: { name: 'asc' }
  });

  const settings = await getSettings(zoneEventId || parentEventId || session.user.eventId);
  const limits = {
    maxIndividualPrograms: settings?.maxIndividualPrograms ?? 4,
    maxIndividualOnStage: settings?.maxIndividualOnStage ?? 2,
    maxIndividualOffStage: settings?.maxIndividualOffStage ?? 2,
    maxGeneralTotal: settings?.maxGeneralTotal ?? 2,
    maxGeneralOnStage: settings?.maxGeneralOnStage ?? 1,
    maxGeneralOffStage: settings?.maxGeneralOffStage ?? 1,
  };

  const isGuidelinesHidden = settings?.posterCongratulationUrl === "HIDE_GUIDELINES";

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Program Assignments</h1>
          <p className="page-description">
            Assign registered candidates to competition programs. Category limits and eligibility rules are enforced automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a 
            href={`/print/assignments${teamId ? `?teamId=${teamId}` : ''}`} 
            target="_blank" 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Assignments List
          </a>
        </div>
      </div>

      {availableTeams.length > 1 && ["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(session.user.role) && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, marginRight: '10px' }}>Select Institution / Team:</label>
          <select 
            className="form-input" 
            style={{ maxWidth: '350px', display: 'inline-block' }}
            defaultValue={teamId || ""}
            onChange={(e) => {
              window.location.href = `/dashboard/assignments?teamId=${e.target.value}`;
            }}
          >
            {availableTeams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {(() => {
        const totalCandidates = candidates.length;
        
        // Calculate Total Available Program Slots for the Team
        const candidateCategoryIds = new Set(candidates.map(c => c.categoryId));
        const candidateCategoryNames = new Set(candidates.map(c => c.category?.name));
        
        const applicablePrograms = programs.filter(p => 
          p.type === "GENERAL" || 
          isInstitutionProgram(p) ||
          (p.categoryId !== null && candidateCategoryIds.has(p.categoryId)) || 
          (p.category && candidateCategoryNames.has(p.category.name))
        );

        const studentPrograms = applicablePrograms.filter(p => !isInstitutionProgram(p));
        const hasInstProgram = applicablePrograms.some(p => isInstitutionProgram(p));
        const isMagEnrolled = currentTeam?.isMagazineParticipating || false;

        const studentAvailableSlots = studentPrograms.reduce((acc, p) => acc + (p.candidateLimitPerTeam || 1), 0);
        const studentAssignments = candidates.reduce((acc, c) => acc + c.programs.length, 0);

        const totalAvailableSlots = studentAvailableSlots + (hasInstProgram ? 1 : 0);
        const totalAssignments = studentAssignments + (hasInstProgram && isMagEnrolled ? 1 : 0);
        const pendingPrograms = Math.max(0, totalAvailableSlots - totalAssignments);

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
            <div className="stat-card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Registered Students</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalCandidates}</div>
            </div>
            <div className="stat-card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Assignments</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>{totalAssignments}</div>
            </div>
            <div className="stat-card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Available Slots</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{totalAvailableSlots}</div>
            </div>
            <div className="stat-card glass-panel" style={{ padding: 'var(--spacing-md)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pending Slots</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: pendingPrograms > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {pendingPrograms}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Magazine Competition Highlight & Status Card */}
      {currentTeam && (
        <div style={{
          marginBottom: 'var(--spacing-lg)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: currentTeam.magazineCode 
            ? 'rgba(16, 185, 129, 0.08)' 
            : currentTeam.isMagazineParticipating 
              ? 'rgba(147, 51, 234, 0.08)' 
              : 'rgba(245, 158, 11, 0.08)',
          border: `1.5px solid ${currentTeam.magazineCode 
            ? '#10b981' 
            : currentTeam.isMagazineParticipating 
              ? '#9333ea' 
              : '#f59e0b'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
            <span style={{ fontSize: '2.2rem' }}>
              {currentTeam.magazineCode ? '🎉' : currentTeam.isMagazineParticipating ? '📖' : '⏳'}
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ 
                  fontSize: '1.05rem', 
                  color: currentTeam.magazineCode ? '#10b981' : currentTeam.isMagazineParticipating ? '#9333ea' : '#d97706' 
                }}>
                  {currentTeam.magazineCode 
                    ? `Official Magazine Code: ${currentTeam.magazineCode}` 
                    : currentTeam.isMagazineParticipating 
                      ? 'Magazine Registration Confirmed' 
                      : 'College Magazine Competition Pending Registration'}
                </strong>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  backgroundColor: currentTeam.magazineCode ? '#10b981' : currentTeam.isMagazineParticipating ? '#9333ea' : '#f59e0b',
                  color: '#fff'
                }}>
                  {currentTeam.magazineCode ? 'OFFICIAL CODE ASSIGNED' : currentTeam.isMagazineParticipating ? 'ENROLLED & CONFIRMED' : 'ACTION REQUIRED'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {currentTeam.magazineCode
                  ? 'Please write/mark this code number clearly on the top-right corner of your physical magazine submission before handing it over.'
                  : currentTeam.isMagazineParticipating
                    ? `Registered under ${currentTeam.name}. No individual candidate assignment needed (evaluated on College Name). Your Magazine Code Number will be generated once Zone Admin confirms the list.`
                    : 'The Magazine competition is evaluated on the Institution Name. Click "Confirm Magazine Participation" below so your college is officially registered.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {candidates.length === 0 ? (
        <div className="glass-panel empty-state-guidance">
          <p style={{ color: 'var(--warning)', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
            No registered students found.
          </p>
          <p>Please add students to your institution roster first before making program assignments.</p>
          <Link href="/dashboard/candidates" className="empty-state-action">Go to Student Roster &rarr;</Link>
        </div>
      ) : (
        <div data-tour="assignments-form" className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <h3 style={{ margin: 0 }}>Assign Candidates to Programs</h3>
            {isAssignmentsConfirmed && (
              <span style={{ padding: '4px 8px', backgroundColor: 'var(--success)', color: 'white', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>CONFIRMED</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)', fontSize: '0.85rem' }}>
            Select a candidate below to see available programs and make assignments. Validations enforce category rules and entry limits.
          </p>
          <AssignmentForm 
            candidates={candidates as any} 
            programs={programs as any} 
            isAssignmentOpen={isAssignmentOpen}
            statusMessage={assignmentStatusMessage}
            initialCandidateId={searchParams.candidateId}
            teamId={teamId}
            isAssignmentsConfirmed={isAssignmentsConfirmed}
            isMagazineParticipating={currentTeam?.isMagazineParticipating || false}
            magazineCode={currentTeam?.magazineCode || null}
            teamName={currentTeam?.name || ""}
            limits={limits}
            isOffStageOpen={isOffStageOpen}
            isOnStageOpen={isOnStageOpen}
            offStageDeadline={offDeadline ? new Date(offDeadline).toISOString() : null}
            onStageDeadline={onDeadline ? new Date(onDeadline).toISOString() : null}
            offStageUnlocked={currentTeam?.offStageUnlocked || false}
            onStageUnlocked={currentTeam?.onStageUnlocked || false}
            role={session.user.role}
          />
        </div>
      )}
    </div>
  );
}
