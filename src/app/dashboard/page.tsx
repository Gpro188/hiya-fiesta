import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CustomerGuidelines from "./CustomerGuidelines";
import InstitutionOnboardingModal from "@/components/InstitutionOnboardingModal";
import InstitutionProfileButton from "@/components/InstitutionProfileButton";
import ZoneInstitutionStatusTable, { ZoneTeamStatus } from "./ZoneInstitutionStatusTable";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { role, id: userId, eventId, username } = session.user;

  let stats: {
    label: string;
    value: string | number;
    icon: string;
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
          magazineCode: true,
          event: { select: { name: true, zone: { select: { name: true } } } },
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
      ]);

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
          icon: "🛡️",
          accentStart: "#A5003A",
          accentEnd: "#818cf8",
          trend: userTeam.isAssignmentsConfirmed ? "Confirmed" : "In Progress",
        },
        {
          label: "Candidates",
          value: candidatesCount,
          icon: "👤",
          accentStart: "#ec4899",
          accentEnd: "#f472b6",
          trend: "Roster",
        },
        {
          label: "Approved",
          value: `${approvedCandidatesCount} / ${candidatesCount}`,
          icon: "✅",
          accentStart: "#10b981",
          accentEnd: "#34d399",
          trend: approvedCandidatesCount === candidatesCount && candidatesCount > 0 ? "All Approved" : "Pending",
        },
        {
          label: "Program Entries",
          value: assignmentsCount,
          icon: "📜",
          accentStart: "#f59e0b",
          accentEnd: "#fbbf24",
          trend: `${pendingPrograms.length} Pending`,
        },
        {
          label: "Points Published",
          value: publishedPoints,
          icon: "🏆",
          accentStart: "#8E0033",
          accentEnd: "#a78bfa",
          trend: "Live",
        },
        {
          label: "Total Points",
          value: totalPoints,
          icon: "✨",
          accentStart: "#e11d48",
          accentEnd: "#fb7185",
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
      t.candidates.forEach((c: any) => {
        c.programs.forEach((p: any) => {
          if (p.program?.stageType === "OFF_STAGE") offStageCount++;
          else if (p.program?.stageType === "ON_STAGE") onStageCount++;
        });
      });
      return {
        id: t.id,
        name: t.name,
        prefixCode: t.prefixCode,
        isAssignmentsConfirmed: t.isAssignmentsConfirmed,
        isOnStageConfirmed: t.isOnStageConfirmed,
        offStageUnlocked: t.offStageUnlocked,
        onStageUnlocked: t.onStageUnlocked,
        magazineCode: t.magazineCode,
        isMagazineParticipating: t.isMagazineParticipating,
        institution: t.institution,
        eventId: t.eventId,
        candidateCount,
        approvedCount,
        chestNumberCount,
        offStageCount,
        onStageCount,
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
        icon: "🛡️",
        accentStart: confirmedTeams.length === zoneTeams.length && zoneTeams.length > 0 ? "#10b981" : "#f59e0b",
        accentEnd: "#34d399",
        trend: `${pendingTeams.length} Pending Confirm`,
      },
      {
        label: "Stages & Schedule",
        value: `${scheduledPrograms.length} / ${zonePrograms.length}`,
        icon: "📅",
        accentStart: scheduledPrograms.length === zonePrograms.length && zonePrograms.length > 0 ? "#10b981" : "#0ea5e9",
        accentEnd: "#38bdf8",
        trend: `${unscheduledPrograms.length} Unscheduled`,
      },
      {
        label: "Jury Assignments",
        value: `${juryAssignedPrograms.length} / ${zonePrograms.length}`,
        icon: "⚖️",
        accentStart: juryAssignedPrograms.length === zonePrograms.length && zonePrograms.length > 0 ? "#10b981" : "#8E0033",
        accentEnd: "#a78bfa",
        trend: `${missingJuryPrograms.length} Missing Jury`,
      },
      {
        label: "Active Participants",
        value: participantsCount,
        icon: "👤",
        accentStart: "#ec4899",
        accentEnd: "#f472b6",
        trend: "Enrolled",
      },
      {
        label: "Results Published",
        value: publishedResults,
        icon: "🏆",
        accentStart: "#10b981",
        accentEnd: "#34d399",
        trend: "Live",
      },
      {
        label: "Results Pending",
        value: pendingResults,
        icon: "⏳",
        accentStart: "#ef4444",
        accentEnd: "#f87171",
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
        icon: "🎭",
        accentStart: "#A5003A",
        accentEnd: "#818cf8",
        trend: "Active",
      },
      {
        label: "Active Teams",
        value: teamsCount,
        icon: "🛡️",
        accentStart: "#ec4899",
        accentEnd: "#f472b6",
        trend: "Competing",
      },
      {
        label: "Programmes",
        value: programsCount,
        icon: "📜",
        accentStart: "#f59e0b",
        accentEnd: "#fbbf24",
        trend: "Scheduled",
      },
      {
        label: "Participants",
        value: participantsCount,
        icon: "👤",
        accentStart: "#10b981",
        accentEnd: "#34d399",
        trend: "Registered",
      },
      {
        label: "Results Published",
        value: publishedResults,
        icon: "🏆",
        accentStart: "#8E0033",
        accentEnd: "#a78bfa",
        trend: "Live",
      },
      {
        label: "Results Pending",
        value: pendingResults,
        icon: "⏳",
        accentStart: "#ef4444",
        accentEnd: "#f87171",
        trend: "Awaiting",
      },
    ];
  }

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role) && !hasTeam) {
    return (
      <div className="animate-fade-in" style={{ padding: "var(--spacing-xl)" }}>
        <div
          className="stat-card"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            textAlign: "center",
            padding: "3rem",
            "--card-accent-start": "#f59e0b",
            "--card-accent-end": "#fbbf24",
          } as React.CSSProperties}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ color: "#d97706", marginBottom: "1rem", fontSize: "1.25rem" }}>
            Account Setup Pending
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Welcome, <strong>{username}</strong>. Your account has not been assigned to a
            participating team yet.
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Please contact your festival administrator to link your profile with your designated
            team.
          </p>
        </div>
      </div>
    );
  }

  const quickLinks: { label: string; href: string; icon: string; color: string }[] = [];
  if (role === "ZONE_ADMIN") {
    quickLinks.push(
      { label: "Confirm Team Lists", href: "/dashboard/teams", icon: "🛡️", color: "#f59e0b" },
      { label: "Scheduling & Stages", href: "/dashboard/schedule", icon: "📅", color: "#0ea5e9" },
      { label: "Assign Juries", href: "/dashboard/juries", icon: "⚖️", color: "#8E0033" },
      { label: "Volunteers & IDs", href: "/dashboard/volunteers", icon: "🦺", color: "#8E0033" },
      { label: "Rapid Mark Entry", href: "/dashboard/scoring", icon: "🏆", color: "#10b981" },
      { label: "Print Candidate IDs", href: `/print/id-cards${fullUser?.eventId ? `?eventId=${fullUser.eventId}` : ""}`, icon: "🪪", color: "#ec4899" }
    );
  } else if (["ADMIN", "SUPER_ADMIN"].includes(role)) {
    quickLinks.push(
      { label: "Manage Teams", href: "/dashboard/teams", icon: "🛡️", color: "#f59e0b" },
      { label: "Volunteers Hub", href: "/dashboard/volunteers", icon: "🦺", color: "#8E0033" },
      { label: "Results Entry", href: "/dashboard/scoring", icon: "🏆", color: "#A5003A" },
      { label: "Manage Schedule", href: "/dashboard/schedule", icon: "📅", color: "#10b981" },
      { label: "Media Branding", href: "/dashboard/media", icon: "🎨", color: "#0ea5e9" },
      { label: "Print Candidate IDs", href: `/print/id-cards${fullUser?.eventId ? `?eventId=${fullUser.eventId}` : ""}`, icon: "🪪", color: "#ec4899" }
    );
  } else if (["MANAGER", "INSTITUTION_MANAGER"].includes(role) && hasTeam) {
    quickLinks.push(
      { label: "1. Register Candidates", href: "/dashboard/candidates", icon: "👤", color: "#ec4899" },
      { label: "2. Program Allocations", href: "/dashboard/assignments", icon: "📜", color: "#f59e0b" },
      { label: "3. Print Schedule & IDs", href: "/dashboard/reports", icon: "🖨️", color: "#10b981" }
    );
  } else if (role === "MEDIA") {
    quickLinks.push(
      { label: "Poster Branding", href: "/dashboard/media", icon: "🎨", color: "#0ea5e9" },
      { label: "Live Hub", href: "/hub", icon: "📡", color: "#A5003A" }
    );
  } else if (role === "JUDGE") {
    quickLinks.push(
      { label: "Results Entry", href: "/dashboard/scoring", icon: "🏆", color: "#A5003A" }
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 4px 0' }}>
            {["MANAGER", "INSTITUTION_MANAGER"].includes(role) ? "Institution Portal Dashboard" : (role === "ZONE_ADMIN" ? "Zone Admin Control Hub" : "Management Overview")}
          </h1>
          <p className="page-subtitle" style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
            Welcome back, <strong>{username}</strong> · {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        
        {/* Only show Live Hub button for Super Admin / Admin / Media. Replace with quick workflow action for Zone & Institution */}
        <div data-tour="dash-hub-btn" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {role === "SUPER_ADMIN" || role === "ADMIN" || role === "MEDIA" ? (
            <Link
              href="/hub"
              className="btn btn-success"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.5rem",
                background: 'var(--emerald)',
                color: '#ffffff',
                borderRadius: 'var(--radius-full)',
                padding: '0.5rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              <span>📡</span> Live Management Hub
            </Link>
          ) : role === "ZONE_ADMIN" ? (
            <Link
              href="/dashboard/scoring"
              className="btn btn-primary"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.5rem",
                borderRadius: 'var(--radius-full)',
                padding: '0.5rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              <span>🏆</span> Results & Mark Entry
            </Link>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {institutionInfo && (
                <InstitutionProfileButton
                  institutionName={institutionInfo.name}
                  institutionCode={institutionInfo.code}
                  logoUrl={institutionInfo.logoUrl}
                />
              )}
              <Link
                href="/dashboard/assignments"
                className="btn btn-primary"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.5rem",
                  borderRadius: 'var(--radius-full)',
                  padding: '0.5rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                <span>📜</span> Program Allocations
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Institution First-Login / Profile Onboarding Modal */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && institutionInfo && (
        <InstitutionOnboardingModal
          institutionName={institutionInfo.name}
          institutionCode={institutionInfo.code}
          initialLogoUrl={institutionInfo.logoUrl}
        />
      )}

      {/* Zone Admin Confirmation Alert Banner for Institutions */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && userTeam?.isAssignmentsConfirmed && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '12px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '2px solid #10b981',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.3rem' }}>🎉</span>
              <strong style={{ fontSize: '1.05rem', color: '#065f46' }}>
                Zone Admin Confirmed Your Registration!
              </strong>
              {userTeam.magazineCode && (
                <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#8E0033', color: 'white', fontWeight: 800 }}>
                  MAGAZINE CODE: {userTeam.magazineCode}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#047857' }}>
              Official Chest Numbers have been generated for your candidates. You can now view and print the full student list with chest numbers and ID cards.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link 
              href="/dashboard/candidates"
              className="btn btn-primary"
              style={{ backgroundColor: '#059669', borderColor: '#059669', color: 'white', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              👤 View Students & Chest Nos
            </Link>
            <a 
              href={`/print/candidates?teamId=${userTeam.id}`} 
              target="_blank" 
              className="btn btn-secondary"
              style={{ borderColor: '#059669', color: '#059669', backgroundColor: '#ffffff', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              📜 Print Official List
            </a>
            <a 
              href={`/print/id-cards?teamId=${userTeam.id}`} 
              target="_blank" 
              className="btn btn-secondary"
              style={{ borderColor: '#059669', color: '#059669', backgroundColor: '#ffffff', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
            >
              🪪 Print ID Cards
            </a>
          </div>
        </div>
      )}

      {/* Stats Grid with auto-fit reflow */}
      <div
        data-tour="dash-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={i}
            className="stat-card"
            style={{
              padding: '1.25rem 1rem',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderTop: `4px solid ${stat.accentStart}`,
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: `${stat.accentStart}15`,
                  border: `1px solid ${stat.accentStart}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}
              >
                {stat.icon}
              </div>
              {stat.trend && (
                <span
                  style={{
                    background: `${stat.accentStart}15`,
                    color: stat.accentStart,
                    border: `1px solid ${stat.accentStart}30`,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: "9999px",
                    textTransform: "uppercase",
                  }}
                >
                  {stat.trend}
                </span>
              )}
            </div>
            <div>
              <div
                className="mono-numeral"
                style={{
                  fontSize: typeof stat.value === "string" && stat.value.length > 6 ? "1.2rem" : "1.85rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  lineHeight: 1.1,
                  marginBottom: "0.3rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 🚀 ZONE ADMIN: STEP-BY-STEP FEST LIFECYCLE WORKFLOW & STATUS */}
      {/* ========================================================================= */}
      {role === "ZONE_ADMIN" && zoneData && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>🎯</span> Zone Festival Execution Steps & Status
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Follow these continuous stages to organize and execute your zone arts festival.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {/* Step 1: Confirm Institution Lists */}
            <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: `4px solid ${zoneData.pendingTeams.length === 0 ? "#10b981" : "#f59e0b"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Step 1</span>
                <span className="badge" style={{ backgroundColor: zoneData.pendingTeams.length === 0 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: zoneData.pendingTeams.length === 0 ? "#10b981" : "#d97706", fontWeight: 700 }}>
                  {zoneData.pendingTeams.length === 0 ? "✅ Confirmed" : `⚠️ ${zoneData.pendingTeams.length} Pending`}
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
            <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: `4px solid ${zoneData.unscheduledPrograms.length === 0 ? "#10b981" : "#0ea5e9"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Step 2</span>
                <span className="badge" style={{ backgroundColor: zoneData.unscheduledPrograms.length === 0 ? "rgba(16,185,129,0.15)" : "rgba(14,165,233,0.15)", color: zoneData.unscheduledPrograms.length === 0 ? "#10b981" : "#0284c7", fontWeight: 700 }}>
                  {zoneData.unscheduledPrograms.length === 0 ? "✅ All Scheduled" : `📅 ${zoneData.unscheduledPrograms.length} Remaining`}
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
            <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: `4px solid ${zoneData.missingJuryPrograms.length === 0 ? "#10b981" : "#8E0033"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Step 3</span>
                <span className="badge" style={{ backgroundColor: zoneData.missingJuryPrograms.length === 0 ? "rgba(16,185,129,0.15)" : "rgba(142,0,51,0.15)", color: zoneData.missingJuryPrograms.length === 0 ? "#10b981" : "#8E0033", fontWeight: 700 }}>
                  {zoneData.missingJuryPrograms.length === 0 ? "✅ All Assigned" : `⚖️ ${zoneData.missingJuryPrograms.length} Missing`}
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
            <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: `4px solid ${zoneData.unscoredProgramsCount === 0 ? "#10b981" : "#A5003A"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Step 4</span>
                <span className="badge" style={{ backgroundColor: "rgba(165,0,58,0.15)", color: "#A5003A", fontWeight: 700 }}>
                  {zoneData.publishedResultsCount} Published
                </span>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>4. Results & Mark Entry</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                Record marks, calculate automatic points, assign places, and publish results.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  {zoneData.pendingResultsCount > 0 ? `⏳ ${zoneData.pendingResultsCount} Drafts` : `${zoneData.unscoredProgramsCount} Awaiting Entry`}
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
        <div data-tour="dash-welcome" className="glass-panel" style={{ padding: "var(--spacing-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #A5003A, #8E0033)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
            >
              👋
            </div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Welcome Back</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            {["MANAGER", "INSTITUTION_MANAGER"].includes(role) ? (
              <>
                Logged in as <strong>{username}</strong>, managing team{" "}
                <strong>{userTeam?.name}</strong> for <strong>{userTeam?.event?.name}</strong>.
                {userTeam?.event?.zone?.name && (
                  <span style={{ 
                    marginLeft: '8px',
                    padding: '2px 8px', 
                    background: 'var(--primary)', 
                    color: 'white', 
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {userTeam.event.zone.name} ZONE
                  </span>
                )}
              </>
            ) : (
              <>
                Logged in as <strong>{username}</strong> with{" "}
                <strong>{role.replace("_", " ").toLowerCase()}</strong> privileges. All
                system operations are running normally.
              </>
            )}
          </p>
          {quickLinks.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {quickLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="btn btn-sm"
                  style={{
                    background: `${link.color}15`,
                    color: link.color,
                    border: `1px solid ${link.color}30`,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span style={{ fontSize: "0.85rem" }}>{link.icon}</span>
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
        <div className="glass-panel" style={{ padding: "var(--spacing-lg)", marginBottom: "2rem", borderLeft: "4px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981" }}>
              <span>📝</span> Institution Registration & Assignment Steps
            </h3>
            <span className="badge" style={{ backgroundColor: userTeam.isAssignmentsConfirmed ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: userTeam.isAssignmentsConfirmed ? "#10b981" : "#d97706", fontWeight: 700 }}>
              {userTeam.isAssignmentsConfirmed ? "✅ Zone Confirmed & Locked" : "⏳ In Progress (Awaiting Zone Confirmation)"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            {/* Step 1 */}
            <div style={{ padding: "1rem", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--primary)", textTransform: "uppercase", marginBottom: "4px" }}>Step 1</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem" }}>Register Students</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
                Add your participating candidates by searching their Name or UID.
              </p>
              <Link href="/dashboard/candidates" className="btn btn-sm btn-secondary" style={{ width: "100%", textAlign: "center" }}>
                Student Roster →
              </Link>
            </div>

            {/* Step 2 */}
            <div style={{ padding: "1rem", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--primary)", textTransform: "uppercase", marginBottom: "4px" }}>Step 2</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem" }}>Program Allocations</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
                Enroll registered students into their competition categories.
              </p>
              <Link href="/dashboard/assignments" className="btn btn-sm btn-primary" style={{ width: "100%", textAlign: "center" }}>
                Assign Programs →
              </Link>
            </div>

            {/* Step 3 */}
            <div style={{ padding: "1rem", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--primary)", textTransform: "uppercase", marginBottom: "4px" }}>Step 3</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem" }}>Zone Confirmation</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
                {userTeam.isAssignmentsConfirmed 
                  ? "Chest numbers are officially generated and active." 
                  : "Contact your Zone Admin once all allocations are finished."}
              </p>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: userTeam.isAssignmentsConfirmed ? "#10b981" : "#f59e0b" }}>
                {userTeam.isAssignmentsConfirmed ? "✅ Confirmed" : "⏳ Pending Zone Admin"}
              </span>
            </div>

            {/* Step 4 */}
            <div style={{ padding: "1rem", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--primary)", textTransform: "uppercase", marginBottom: "4px" }}>Step 4</div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem" }}>Print ID & Schedules</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
                Print official candidate ID cards and institution event timetable.
              </p>
              <Link href="/dashboard/reports" className="btn btn-sm btn-secondary" style={{ width: "100%", textAlign: "center" }}>
                Reports & Print Hub →
              </Link>
            </div>
          </div>
        </div>
      )}

      <CustomerGuidelines role={role} initialHidden={isGuidelinesHidden} />

      {/* Pending Programs for Managers */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && pendingPrograms.length > 0 && (
        <div className="glass-panel" style={{ padding: "var(--spacing-lg)", marginTop: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--warning)" }}>⚠️</span> Pending Program Assignments ({pendingPrograms.length})
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            You have not reached the candidate limit for the following programs. Please assign candidates before the deadline.
          </p>
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
