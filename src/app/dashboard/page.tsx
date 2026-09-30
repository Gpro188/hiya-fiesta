import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CustomerGuidelines from "./CustomerGuidelines";
import InstitutionOnboardingModal from "@/components/InstitutionOnboardingModal";
import InstitutionProfileButton from "@/components/InstitutionProfileButton";
import ZoneInstitutionStatusTable, { ZoneTeamStatus } from "./ZoneInstitutionStatusTable";
import RegistrationCountdownBanner from "@/components/RegistrationCountdownBanner";
import { getRegistrationLockStatus } from "@/lib/registrationLockUtils";
import { Shield, UserCheck, CheckCircle2, BookOpen, Trophy, Sparkles, CalendarDays, Scale, Users, Radio, ClipboardList, Map, TrendingUp, Clock, Zap, Printer } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { role, id: userId, eventId, username } = session.user;

  let stats: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    accentStart: string;
    accentEnd: string;
    trend?: string;
  }[] = [];
  let userTeam: any = null;
  let hasTeam = false;

  let pendingPrograms: any[] = [];
  
  const fullUser = await prisma.user.findUnique({ 
    where: { id: userId }, 
    select: { institutionId: true, eventId: true, zoneId: true } 
  });

  const globalSetting = await prisma.globalSetting.findFirst({
    where: { id: "default" },
    select: { posterCongratulationUrl: true }
  });
  const isGuidelinesHidden = globalSetting?.posterCongratulationUrl === "HIDE_GUIDELINES";

  // Zone specific metrics
  let zoneData: {
    confirmedTeamsCount: number;
    totalTeamsCount: number;
    pendingTeams: any[];
    scheduledProgramsCount: number;
    totalProgramsCount: number;
    unscheduledPrograms: any[];
    juryAssignedProgramsCount: number;
    missingJuryPrograms: any[];
    publishedResultsCount: number;
    pendingResultsCount: number;
    unscoredProgramsCount: number;
  } | null = null;
  let zoneTeamsStatusList: ZoneTeamStatus[] = [];
  let zoneName = "Zone";

  // Institution Profile details
  let institutionInfo: any = null;
  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role) && fullUser?.institutionId) {
    institutionInfo = await prisma.masterInstitution.findUnique({
      where: { id: fullUser.institutionId },
      select: { id: true, name: true, code: true, logoUrl: true }
    });
  }

  let institutionLockStatus: any = null;
  let hasChestNumbers = false;

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role)) {
    if (fullUser?.institutionId) {
      userTeam = await prisma.team.findFirst({
        where: fullUser.eventId 
          ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
          : { institutionId: fullUser.institutionId },
        select: {
          id: true,
          name: true,
          eventId: true,
          isAssignmentsConfirmed: true,
          isOnStageConfirmed: true,
          offStageUnlocked: true,
          onStageUnlocked: true,
          registrationUnlocked: true,
          offStageUnlockStart: true,
          offStageUnlockEnd: true,
          onStageUnlockStart: true,
          onStageUnlockEnd: true,
          magazineCode: true,
          isMagazineParticipating: true,
          event: { 
            select: { 
              name: true, 
              registrationEnd: true,
              institutionRegistrationEndDate: true,
              offStageRegistrationEnd: true,
              onStageRegistrationEnd: true,
              zone: { select: { name: true } },
              parent: {
                select: {
                  registrationEnd: true,
                  institutionRegistrationEndDate: true,
                  offStageRegistrationEnd: true,
                  onStageRegistrationEnd: true,
                }
              }
            } 
          },
        },
      });
    }

    if (userTeam) {
      hasTeam = true;
      const teamId = userTeam.id;

      const [
        candidatesCount,
        approvedCandidatesCount,
        assignmentsCount,
        teamResults,
        teamCandidatesForLock,
      ] = await Promise.all([
        prisma.candidate.count({ where: { teamId } }),
        prisma.candidate.count({ where: { teamId, isApproved: true } }),
        prisma.programAssignment.count({
          where: { candidate: { teamId } },
        }),
        prisma.result.findMany({
          where: { OR: [{ teamId }, { candidate: { teamId } }] },
          select: { points: true, isPublished: true },
        }),
        prisma.candidate.findMany({
          where: { teamId },
          select: {
            id: true,
            chestNumber: true,
            programs: {
              select: { program: { select: { stageType: true } } }
            }
          }
        }),
      ]);

      hasChestNumbers = teamCandidatesForLock.some((c) => Boolean(c.chestNumber));
      institutionLockStatus = getRegistrationLockStatus(userTeam, userTeam.event, teamCandidatesForLock, false);

      const publishedPoints = teamResults
        .filter((r) => r.isPublished)
        .reduce((sum, r) => sum + r.points, 0);
      const totalPoints = teamResults.reduce((sum, r) => sum + r.points, 0);

      // Find Pending Programs
      const allPrograms = await prisma.program.findMany({
        where: { eventId: userTeam.eventId },
        include: { 
          category: { select: { name: true } },
          assignments: { where: { candidate: { teamId } } } 
        },
        orderBy: { name: 'asc' }
      });
      
      pendingPrograms = allPrograms.filter(p => p.assignments.length < p.candidateLimitPerTeam);

      stats = [
        {
          label: "Your Team",
          value: userTeam.name,
          icon: Shield,
          accentStart: "var(--brand)",
          accentEnd: "var(--brand)",
          trend: userTeam.isAssignmentsConfirmed ? "Confirmed" : "In Progress",
        },
        {
          label: "Candidates",
          value: candidatesCount,
          icon: UserCheck,
          accentStart: "var(--brand)",
          accentEnd: "var(--brand)",
          trend: "Roster",
        },
        {
          label: "Approved",
          value: `${approvedCandidatesCount} / ${candidatesCount}`,
          icon: CheckCircle2,
          accentStart: "var(--success)",
          accentEnd: "var(--success)",
          trend: approvedCandidatesCount === candidatesCount && candidatesCount > 0 ? "All approved" : "Pending",
        },
        {
          label: "Program Entries",
          value: assignmentsCount,
          icon: BookOpen,
          accentStart: "var(--warning)",
          accentEnd: "var(--warning)",
          trend: `${pendingPrograms.length} pending`,
        },
        {
          label: "Points Published",
          value: publishedPoints,
          icon: Trophy,
          accentStart: "var(--brand)",
          accentEnd: "var(--brand)",
          trend: "Live",
        },
        {
          label: "Total Points",
          value: totalPoints,
          icon: TrendingUp,
          accentStart: "var(--brand)",
          accentEnd: "var(--brand)",
          trend: "Overall",
        },
      ];
    }
  } else if (role === "ZONE_ADMIN") {
    const zoneEventId = fullUser?.eventId || eventId;
    let teamFilter: any = undefined;
    if (fullUser?.zoneId) {
      teamFilter = {
        OR: [
          { event: { zoneId: fullUser.zoneId } },
          { institution: { zoneId: fullUser.zoneId } },
          ...(zoneEventId ? [{ eventId: zoneEventId }] : [])
        ]
      };
      const z = await prisma.zone.findUnique({
        where: { id: fullUser.zoneId },
        select: { name: true }
      });
      if (z?.name) zoneName = z.name;
    } else if (zoneEventId) {
      teamFilter = { eventId: zoneEventId };
    }

    const [
      zoneTeams,
      zonePrograms,
      participantsCount,
      publishedResults,
      pendingResults,
    ] = await Promise.all([
      prisma.team.findMany({
        where: teamFilter,
        select: {
          id: true,
          name: true,
          prefixCode: true,
          isAssignmentsConfirmed: true,
          isOnStageConfirmed: true,
          offStageUnlocked: true,
          onStageUnlocked: true,
          registrationUnlocked: true,
          offStageUnlockStart: true,
          offStageUnlockEnd: true,
          onStageUnlockStart: true,
          onStageUnlockEnd: true,
          magazineCode: true,
          isMagazineParticipating: true,
          eventId: true,
          institution: {
            select: {
              id: true,
              name: true,
              code: true,
              place: true,
              district: true,
            }
          },
          candidates: {
            select: {
              id: true,
              chestNumber: true,
              isApproved: true,
              programs: {
                select: {
                  program: {
                    select: {
                      id: true,
                      stageType: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.program.findMany({
        where: zoneEventId ? { eventId: zoneEventId } : undefined,
        select: {
          id: true,
          name: true,
          programCode: true,
          venue: true,
          startTime: true,
          _count: {
            select: {
              assignments: true,
              judges: true,
              results: true
            }
          },
          results: {
            select: { isPublished: true }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.candidate.count({
        where: {
          team: teamFilter,
          programs: { some: {} },
        },
      }),
      prisma.result.count({
        where: {
          isPublished: true,
          program: zoneEventId ? { eventId: zoneEventId } : undefined
        },
      }),
      prisma.result.count({
        where: {
          isPublished: false,
          program: zoneEventId ? { eventId: zoneEventId } : undefined
        },
      }),
    ]);

    zoneTeamsStatusList = zoneTeams.map((t: any) => {
      const candidateCount = t.candidates.length;
      const approvedCount = t.candidates.filter((c: any) => c.isApproved).length;
      const chestNumberCount = t.candidates.filter((c: any) => Boolean(c.chestNumber)).length;
      let offStageCount = 0;
      let onStageCount = 0;
      let offStageCandidateCount = 0;
      let offStageChestNumberCount = 0;
      let onStageCandidateCount = 0;
      let onStageChestNumberCount = 0;

      t.candidates.forEach((c: any) => {
        let hasOff = false;
        let hasOn = false;
        c.programs.forEach((p: any) => {
          if (p.program?.stageType === "OFF_STAGE") {
            offStageCount++;
            hasOff = true;
          } else if (p.program?.stageType === "ON_STAGE") {
            onStageCount++;
            hasOn = true;
          }
        });
        if (hasOff) {
          offStageCandidateCount++;
          if (c.chestNumber) offStageChestNumberCount++;
        }
        if (hasOn) {
          onStageCandidateCount++;
          if (c.chestNumber) onStageChestNumberCount++;
        }
      });

      return {
        id: t.id,
        name: t.name,
        prefixCode: t.prefixCode,
        isAssignmentsConfirmed: t.isAssignmentsConfirmed,
        isOnStageConfirmed: t.isOnStageConfirmed,
        offStageUnlocked: t.offStageUnlocked,
        onStageUnlocked: t.onStageUnlocked,
        registrationUnlocked: t.registrationUnlocked,
        offStageUnlockStart: t.offStageUnlockStart,
        offStageUnlockEnd: t.offStageUnlockEnd,
        onStageUnlockStart: t.onStageUnlockStart,
        onStageUnlockEnd: t.onStageUnlockEnd,
        magazineCode: t.magazineCode,
        isMagazineParticipating: t.isMagazineParticipating,
        institution: t.institution,
        eventId: t.eventId,
        candidateCount,
        approvedCount,
        chestNumberCount,
        offStageCount,
        onStageCount,
        offStageCandidateCount,
        offStageChestNumberCount,
        onStageCandidateCount,
        onStageChestNumberCount,
        totalPrograms: offStageCount + onStageCount,
      };
    });

    const confirmedTeams = zoneTeams.filter(t => t.isAssignmentsConfirmed);
    const pendingTeams = zoneTeams.filter(t => !t.isAssignmentsConfirmed);
    const scheduledPrograms = zonePrograms.filter(p => p.venue || p.startTime);
    const unscheduledPrograms = zonePrograms.filter(p => !p.venue && !p.startTime);
    const juryAssignedPrograms = zonePrograms.filter(p => p._count.judges > 0);
    const missingJuryPrograms = zonePrograms.filter(p => p._count.judges === 0);
    const scoredPrograms = zonePrograms.filter(p => p._count.results > 0);
    const unscoredPrograms = zonePrograms.filter(p => p._count.results === 0);

    zoneData = {
      confirmedTeamsCount: confirmedTeams.length,
      totalTeamsCount: zoneTeams.length,
      pendingTeams,
      scheduledProgramsCount: scheduledPrograms.length,
      totalProgramsCount: zonePrograms.length,
      unscheduledPrograms,
      juryAssignedProgramsCount: juryAssignedPrograms.length,
      missingJuryPrograms,
      publishedResultsCount: publishedResults,
      pendingResultsCount: pendingResults,
      unscoredProgramsCount: unscoredPrograms.length,
    };

    stats = [
      {
        label: "Zone Institutions",
        value: `${confirmedTeams.length} / ${zoneTeams.length}`,
        icon: Shield,
        accentStart: confirmedTeams.length === zoneTeams.length && zoneTeams.length > 0 ? "var(--success)" : "var(--warning)",
        accentEnd: "var(--success)",
        trend: `${pendingTeams.length} pending`,
      },
      {
        label: "Stages & Schedule",
        value: `${scheduledPrograms.length} / ${zonePrograms.length}`,
        icon: CalendarDays,
        accentStart: scheduledPrograms.length === zonePrograms.length && zonePrograms.length > 0 ? "var(--success)" : "var(--info)",
        accentEnd: "var(--info)",
        trend: `${unscheduledPrograms.length} unscheduled`,
      },
      {
        label: "Jury Assignments",
        value: `${juryAssignedPrograms.length} / ${zonePrograms.length}`,
        icon: Scale,
        accentStart: juryAssignedPrograms.length === zonePrograms.length && zonePrograms.length > 0 ? "var(--success)" : "var(--brand)",
        accentEnd: "var(--brand)",
        trend: `${missingJuryPrograms.length} missing`,
      },
      {
        label: "Active Participants",
        value: participantsCount,
        icon: Users,
        accentStart: "var(--brand)",
        accentEnd: "var(--brand)",
        trend: "Enrolled",
      },
      {
        label: "Results Published",
        value: publishedResults,
        icon: Trophy,
        accentStart: "var(--success)",
        accentEnd: "var(--success)",
        trend: "Live",
      },
      {
        label: "Results Pending",
        value: pendingResults,
        icon: Clock,
        accentStart: "var(--danger)",
        accentEnd: "var(--danger)",
        trend: "Awaiting",
      },
    ];
  } else {
    let eventFilter: any = eventId ? { id: eventId } : undefined;
    let teamFilter: any = eventId ? { eventId } : undefined;
    let programFilter: any = eventId ? { eventId } : undefined;
    let resultFilter: any = eventId ? { program: { eventId } } : {};

    const [
      eventsCount,
      teamsCount,
      programsCount,
      participantsCount,
      publishedResults,
      pendingResults,
    ] = await Promise.all([
      prisma.event.count({ where: eventFilter }),
      prisma.team.count({ where: teamFilter }),
      prisma.program.count({ where: programFilter }),
      prisma.candidate.count({
        where: {
          team: teamFilter,
          programs: { some: {} },
        },
      }),
      prisma.result.count({
        where: {
          isPublished: true,
          ...resultFilter
        },
      }),
      prisma.result.count({
        where: {
          isPublished: false,
          ...resultFilter
        },
      }),
    ]);

    stats = [
      {
        label: "Total Events",
        value: eventsCount,
        icon: CalendarDays,
        accentStart: "var(--brand)",
        accentEnd: "var(--brand)",
        trend: "Active",
      },
      {
        label: "Active Teams",
        value: teamsCount,
        icon: Shield,
        accentStart: "var(--brand)",
        accentEnd: "var(--brand)",
        trend: "Competing",
      },
      {
        label: "Programmes",
        value: programsCount,
        icon: BookOpen,
        accentStart: "var(--warning)",
        accentEnd: "var(--warning)",
        trend: "Scheduled",
      },
      {
        label: "Participants",
        value: participantsCount,
        icon: Users,
        accentStart: "var(--success)",
        accentEnd: "var(--success)",
        trend: "Registered",
      },
      {
        label: "Results Published",
        value: publishedResults,
        icon: Trophy,
        accentStart: "var(--success)",
        accentEnd: "var(--success)",
        trend: "Live",
      },
      {
        label: "Results Pending",
        value: pendingResults,
        icon: Clock,
        accentStart: "var(--danger)",
        accentEnd: "var(--danger)",
        trend: "Awaiting",
      },
    ];
  }

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role) && !hasTeam) {
    return (
      <div className="animate-fade-in" style={{ padding: "var(--space-8)" }}>
        <div className="empty-state glass-panel" style={{ maxWidth: "480px", margin: "0 auto", padding: "var(--space-12)" }}>
          <div className="empty-state-icon">
            <Zap size={32} strokeWidth={1} />
          </div>
          <div className="empty-state-title">Account setup pending</div>
          <div className="empty-state-desc">
            Your account is not yet linked to a participating team. Contact your administrator to complete setup.
          </div>
        </div>
      </div>
    );
  }

  const quickLinks: { label: string; href: string }[] = [];
  if (role === "ZONE_ADMIN") {
    quickLinks.push(
      { label: "Confirm Team Lists", href: "/dashboard/teams" },
      { label: "Scheduling & Stages", href: "/dashboard/schedule" },
      { label: "Assign Juries", href: "/dashboard/juries" },
      { label: "Volunteers & IDs", href: "/dashboard/volunteers" },
      { label: "Rapid Mark Entry", href: "/dashboard/scoring" },
      { label: "Print Candidate IDs", href: `/print/id-cards${fullUser?.eventId ? `?eventId=${fullUser.eventId}` : ""}` }
    );
  } else if (["ADMIN", "SUPER_ADMIN"].includes(role)) {
    quickLinks.push(
      { label: "Manage Teams", href: "/dashboard/teams" },
      { label: "Volunteers Hub", href: "/dashboard/volunteers" },
      { label: "Results Entry", href: "/dashboard/scoring" },
      { label: "Manage Schedule", href: "/dashboard/schedule" },
      { label: "Media Branding", href: "/dashboard/media" },
      { label: "Program Reg Counts", href: "/print/programs-registration" },
      { label: "Print Candidate IDs", href: `/print/id-cards${fullUser?.eventId ? `?eventId=${fullUser.eventId}` : ""}` }
    );
  } else if (["MANAGER", "INSTITUTION_MANAGER"].includes(role) && hasTeam) {
    quickLinks.push(
      { label: "Register Candidates", href: "/dashboard/candidates" },
      { label: "Program Allocations", href: "/dashboard/assignments" },
      { label: "Print Schedule & IDs", href: "/dashboard/reports" }
    );
  } else if (role === "MEDIA") {
    quickLinks.push(
      { label: "Poster Branding", href: "/dashboard/media" },
      { label: "Live Hub", href: "/hub" }
    );
  } else if (role === "JUDGE") {
    quickLinks.push(
      { label: "Results Entry", href: "/dashboard/scoring" }
    );
  }

  return (
    <div 
      className="animate-fade-in"
      style={{
        containerType: 'inline-size',
        containerName: 'fest-admin',
        overflowX: 'hidden'
      }}
    >
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {["MANAGER", "INSTITUTION_MANAGER"].includes(role)
              ? "Institution Portal"
              : role === "ZONE_ADMIN"
              ? "Zone Dashboard"
              : "Management Overview"}
          </h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div data-tour="dash-hub-btn" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          {(role === "SUPER_ADMIN" || role === "ADMIN" || role === "MEDIA") ? (
            <>
              {role === "SUPER_ADMIN" && (
                <Link
                  href="/dashboard/super/zones"
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Map size={15} strokeWidth={1.5} />
                  Zones Management
                </Link>
              )}
              <Link
                href="/hub"
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Radio size={15} strokeWidth={1.5} />
                Live Hub
              </Link>
            </>
          ) : role === "ZONE_ADMIN" ? (
            <Link
              href="/dashboard/scoring"
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Trophy size={15} strokeWidth={1.5} />
              Mark Entry
            </Link>
          ) : (
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
              {institutionInfo && (
                <InstitutionProfileButton
                  institutionName={institutionInfo.name}
                  institutionCode={institutionInfo.code}
                  logoUrl={institutionInfo.logoUrl}
                />
              )}
              {userTeam && (
                <a
                  href={`/print/institution-report?teamId=${userTeam.id}`}
                  target="_blank"
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <ClipboardList size={15} strokeWidth={1.5} />
                  Print Entry Sheet
                </a>
              )}
              <Link
                href="/dashboard/assignments"
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <BookOpen size={15} strokeWidth={1.5} />
                Program Allocations
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Grand Closing Ceremony Banner for Admins */}
      {["SUPER_ADMIN", "ADMIN", "ZONE_ADMIN"].includes(role) && (
        <div
          className="glass-panel"
          style={{
            padding: "var(--space-4) var(--space-5)",
            marginBottom: "var(--space-5)",
            border: "1px solid var(--danger-border)",
            background: "var(--danger-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "2px" }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--danger)" }}>
                Grand Closing Ceremony
              </span>
              <span className="badge badge-danger">Stage Announcement PDF</span>
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
              4-page declaration: Overall Champions, Category Champions, Magazine Results, Kalathilakam Titles.
            </p>
          </div>
          <a
            href="/print/closing-ceremony"
            target="_blank"
            className="btn btn-danger"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
          >
            <Printer size={15} strokeWidth={1.5} />
            Print 4-Page PDF
          </a>
        </div>
      )}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && institutionInfo && (
        <InstitutionOnboardingModal
          institutionName={institutionInfo.name}
          institutionCode={institutionInfo.code}
          initialLogoUrl={institutionInfo.logoUrl}
        />
      )}

      {/* Registration Countdown Banner for Institution Managers */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && userTeam && institutionLockStatus && (
        <RegistrationCountdownBanner
          deadline={institutionLockStatus.onDeadline || institutionLockStatus.generalDeadline}
          onStageDeadline={institutionLockStatus.onDeadline ? institutionLockStatus.onDeadline.toISOString() : null}
          offStageDeadline={institutionLockStatus.offDeadline ? institutionLockStatus.offDeadline.toISOString() : null}
          isOffStageOpen={institutionLockStatus.isOffStageOpen}
          isOnStageOpen={institutionLockStatus.isOnStageOpen}
          isAssignmentsConfirmed={institutionLockStatus.isCollegeSubmittedOffStage}
          isOnStageConfirmed={institutionLockStatus.isCollegeSubmittedOnStage}
          isZoneConfirmedOnStage={institutionLockStatus.isZoneConfirmedOnStage}
          isZoneConfirmedOffStage={institutionLockStatus.isZoneConfirmedOffStage}
          teamName={userTeam.name}
          magazineCode={userTeam.magazineCode}
        />
      )}

      {/* Zone Admin Confirmation Banner */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && hasChestNumbers && (
        <div
          className="glass-panel"
          style={{
            padding: "var(--space-4) var(--space-5)",
            border: "1px solid var(--success-border)",
            background: "var(--success-bg)",
            marginBottom: "var(--space-5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "2px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--success)" }}>
                Registration confirmed by Zone Admin
              </span>
              {userTeam.magazineCode && (
                <span className="badge badge-brand">
                  Magazine: {userTeam.magazineCode}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Chest numbers are generated. View and print the official student list.
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Link
              href="/dashboard/candidates"
              className="btn btn-success"
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <UserCheck size={14} strokeWidth={1.5} />
              View Students
            </Link>
            <a
              href={`/print/candidates?teamId=${userTeam.id}`}
              target="_blank"
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <ClipboardList size={14} strokeWidth={1.5} />
              Print List
            </a>
          </div>
        </div>
      )}

      {/* Super Admin: Zones Management Banner */}
      {role === "SUPER_ADMIN" && (
        <div
          className="glass-panel"
          style={{
            padding: "var(--space-4) var(--space-5)",
            border: "1px solid var(--brand-tint-hover)",
            background: "var(--brand-tint)",
            marginBottom: "var(--space-5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "2px" }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--brand)" }}>
                Zones Management
              </span>
              <span className="badge badge-brand">Super Admin</span>
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Mark a regional zone as concluded to lock scoring and publish final state selections.
            </p>
          </div>
          <Link
            href="/dashboard/super/zones"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
          >
            <Map size={15} strokeWidth={1.5} />
            Open Zones Management
          </Link>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div
        data-tour="dash-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="kpi-card"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {stat.label}
                </div>
                {stat.trend && (
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: 500,
                      color: "var(--text-muted)",
                    }}
                  >
                    {stat.trend}
                  </span>
                )}
              </div>
              <div
                className="mono-numeral"
                style={{
                  fontSize: typeof stat.value === "string" && stat.value.length > 6 ? "1.25rem" : "1.75rem",
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.1,
                }}
              >
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ZONE ADMIN: Fest Lifecycle Workflow */}
      {role === "ZONE_ADMIN" && zoneData && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-md)", fontWeight: 600, margin: 0 }}>Festival Execution Checklist</h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Track progress across the four stages of your zone festival.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {/* Step 1: Confirm Institution Lists */}
            <div className="glass-panel" style={{ padding: "var(--space-5)", borderLeft: `3px solid ${zoneData.pendingTeams.length === 0 ? "var(--success)" : "var(--warning)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Step 1</span>
                <span className={`badge ${zoneData.pendingTeams.length === 0 ? "badge-success" : "badge-warning"}`}>
                  {zoneData.pendingTeams.length === 0 ? "Confirmed" : `${zoneData.pendingTeams.length} pending`}
                </span>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>1. Confirm Institution Lists</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                Verify submitted candidate allocations and generate official chest numbers.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  {zoneData.confirmedTeamsCount} of {zoneData.totalTeamsCount} Confirmed
                </span>
                <Link href="/dashboard/teams" className="btn btn-sm btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                  Review & Confirm →
                </Link>
              </div>
            </div>

            {/* Step 2: Scheduling & Stages */}
            <div className="glass-panel" style={{ padding: "var(--space-5)", borderLeft: `3px solid ${zoneData.unscheduledPrograms.length === 0 ? "var(--success)" : "var(--info)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Step 2</span>
                <span className={`badge ${zoneData.unscheduledPrograms.length === 0 ? "badge-success" : "badge-info"}`}>
                  {zoneData.unscheduledPrograms.length === 0 ? "All scheduled" : `${zoneData.unscheduledPrograms.length} remaining`}
                </span>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>2. Scheduling & Stages</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                Allocate stages, venues, dates and time slots for all competition programs.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  {zoneData.scheduledProgramsCount} of {zoneData.totalProgramsCount} Scheduled
                </span>
                <Link href="/dashboard/schedule" className="btn btn-sm btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                  Manage Schedule →
                </Link>
              </div>
            </div>

            {/* Step 3: Jury / Judge Assignment */}
            <div className="glass-panel" style={{ padding: "var(--space-5)", borderLeft: `3px solid ${zoneData.missingJuryPrograms.length === 0 ? "var(--success)" : "var(--brand)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Step 3</span>
                <span className={`badge ${zoneData.missingJuryPrograms.length === 0 ? "badge-success" : "badge-brand"}`}>
                  {zoneData.missingJuryPrograms.length === 0 ? "All assigned" : `${zoneData.missingJuryPrograms.length} missing`}
                </span>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>3. Jury Assignment</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                Assign certified judges to stage and off-stage competition programs.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  {zoneData.juryAssignedProgramsCount} of {zoneData.totalProgramsCount} Assigned
                </span>
                <Link href="/dashboard/juries" className="btn btn-sm btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                  Assign Juries →
                </Link>
              </div>
            </div>

            {/* Step 4: Mark Entry Status & Scoring */}
            <div className="glass-panel" style={{ padding: "var(--space-5)", borderLeft: `3px solid ${zoneData.unscoredProgramsCount === 0 ? "var(--success)" : "var(--brand)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Step 4</span>
                <span className="badge badge-brand">
                  {zoneData.publishedResultsCount} published
                </span>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>4. Results & Mark Entry</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                Record marks, calculate automatic points, assign places, and publish results.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-muted)" }}>
                  {zoneData.pendingResultsCount > 0 ? `${zoneData.pendingResultsCount} drafts` : `${zoneData.unscoredProgramsCount} awaiting entry`}
                </span>
                <Link href="/dashboard/scoring" className="btn btn-sm btn-primary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                  Enter Scores →
                </Link>
              </div>
            </div>
          </div>

          {/* Detailed Institution Registration Status Table & Controls */}
          <div style={{ marginTop: "1.5rem" }}>
            <ZoneInstitutionStatusTable teams={zoneTeamsStatusList} zoneName={zoneName} />
          </div>
        </div>
      )}

      {/* Info + Quick Actions Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {/* Welcome Card */}
        <div data-tour="dash-welcome" className="glass-panel" style={{ padding: "var(--space-5)" }}>
          <div style={{ marginBottom: "var(--space-3)" }}>
            <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text)", marginBottom: "4px" }}>Signed in as {username}</div>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.5, fontSize: "var(--text-sm)", margin: 0 }}>
              {["MANAGER", "INSTITUTION_MANAGER"].includes(role) ? (
                <>
                  Managing team <strong style={{ color: "var(--text)" }}>{userTeam?.name}</strong> for {userTeam?.event?.name}.
                  {userTeam?.event?.zone?.name && (
                    <span className="badge badge-brand" style={{ marginLeft: "8px" }}>
                      {userTeam.event.zone.name} Zone
                    </span>
                  )}
                </>
              ) : (
                <>
                  {role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} access. All systems operational.
                </>
              )}
            </p>
          </div>
          {quickLinks.length > 0 && (
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {quickLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="btn btn-secondary btn-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📝 INSTITUTION MANAGER: STEP-BY-STEP WORKFLOW & REGISTRATION GUIDE */}
      {/* ========================================================================= */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && hasTeam && (
        <div className="glass-panel" style={{ padding: "var(--space-5)", marginBottom: "var(--space-6)", borderLeft: "3px solid var(--success)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600 }}>Registration & Assignment Steps</h3>
            <span className={`badge ${userTeam.isAssignmentsConfirmed ? "badge-success" : "badge-warning"}`}>
              {userTeam.isAssignmentsConfirmed ? "Confirmed & locked" : "Awaiting zone confirmation"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
            {/* Step 1 */}
            <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius)", background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 500, fontSize: "var(--text-xs)", color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Step 1</div>
              <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginBottom: "4px" }}>Register Students</div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 var(--space-3) 0", lineHeight: 1.4 }}>
                Add candidates by searching their name or UID.
              </p>
              <Link href="/dashboard/candidates" className="btn btn-sm btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                Student Roster
              </Link>
            </div>

            {/* Step 2 */}
            <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius)", background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 500, fontSize: "var(--text-xs)", color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Step 2</div>
              <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginBottom: "4px" }}>Program Allocations</div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 var(--space-3) 0", lineHeight: 1.4 }}>
                Enroll students into their competition programs.
              </p>
              <Link href="/dashboard/assignments" className="btn btn-sm btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Assign Programs
              </Link>
            </div>

            {/* Step 3 */}
            <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius)", background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 500, fontSize: "var(--text-xs)", color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Step 3</div>
              <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginBottom: "4px" }}>Zone Confirmation</div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 var(--space-3) 0", lineHeight: 1.4 }}>
                {userTeam.isAssignmentsConfirmed
                  ? "Chest numbers are generated and active."
                  : "Contact your Zone Admin after all allocations are complete."}
              </p>
              <span className={`badge ${userTeam.isAssignmentsConfirmed ? "badge-success" : "badge-warning"}`}>
                {userTeam.isAssignmentsConfirmed ? "Confirmed" : "Pending zone admin"}
              </span>
            </div>

            {/* Step 4 */}
            <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius)", background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 500, fontSize: "var(--text-xs)", color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Step 4</div>
              <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginBottom: "4px" }}>Print IDs & Schedules</div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "0 0 var(--space-3) 0", lineHeight: 1.4 }}>
                Print candidate ID cards and institution timetable.
              </p>
              <Link href="/dashboard/reports" className="btn btn-sm btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                Reports & Print
              </Link>
            </div>
          </div>
        </div>
      )}

      <CustomerGuidelines role={role} initialHidden={isGuidelinesHidden} />

      {/* Pending Programs for Managers */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && pendingPrograms.length > 0 && (
        <div className="glass-panel" style={{ padding: "var(--space-5)", marginTop: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text)" }}>Pending Program Assignments</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "2px" }}>Assign candidates before the deadline to fill these programs.</div>
            </div>
            <span className="badge badge-warning">{pendingPrograms.length} pending</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Category</th>
                  <th>Assigned / Limit</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingPrograms.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name} {p.programCode && <span className="badge">{p.programCode}</span>}</td>
                    <td>{p.category?.name}</td>
                    <td>
                      <span style={{ color: "var(--error)", fontWeight: 600 }}>{p.assignments.length}</span> / {p.candidateLimitPerTeam}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/dashboard/assignments?programId=${p.id}`} className="btn btn-sm btn-primary">
                        Assign Now
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
