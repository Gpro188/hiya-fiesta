import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CustomerGuidelines from "./CustomerGuidelines";

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
        }
      });
      
      pendingPrograms = allPrograms.filter(p => p.assignments.length < p.candidateLimitPerTeam);

      stats = [
        {
          label: "Your Team",
          value: userTeam.name,
          icon: "🛡️",
          accentStart: "#A5003A",
          accentEnd: "#818cf8",
        },
        {
          label: "Candidates",
          value: candidatesCount,
          icon: "👤",
          accentStart: "#ec4899",
          accentEnd: "#f472b6",
        },
        {
          label: "Approved",
          value: `${approvedCandidatesCount} / ${candidatesCount}`,
          icon: "✅",
          accentStart: "#10b981",
          accentEnd: "#34d399",
        },
        {
          label: "Program Entries",
          value: assignmentsCount,
          icon: "📜",
          accentStart: "#f59e0b",
          accentEnd: "#fbbf24",
        },
        {
          label: "Points Published",
          value: publishedPoints,
          icon: "🏆",
          accentStart: "#8E0033",
          accentEnd: "#a78bfa",
        },
        {
          label: "Total Points",
          value: totalPoints,
          icon: "✨",
          accentStart: "#e11d48",
          accentEnd: "#fb7185",
        },
      ];
    }
  } else {
    let eventFilter: any = eventId ? { id: eventId } : undefined;
    let teamFilter: any = eventId ? { eventId } : undefined;
    
    // Default program and result filters for ADMIN/SUPER_ADMIN
    let programFilter: any = eventId ? { eventId } : undefined;
    let resultFilter: any = eventId ? { program: { eventId } } : {};
    
    if (role === "ZONE_ADMIN" && fullUser?.eventId) {
      const zoneEventId = fullUser.eventId;
      eventFilter = { id: zoneEventId };
      teamFilter = { eventId: zoneEventId };
      programFilter = {
        assignments: { some: { candidate: { team: { eventId: zoneEventId } } } }
      };
      resultFilter = {
        OR: [
          { team: { eventId: zoneEventId } },
          { candidate: { team: { eventId: zoneEventId } } }
        ]
      };
    }

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
  if (["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role)) {
    quickLinks.push(
      { label: "Manage Teams", href: "/dashboard/teams", icon: "🛡️", color: "#f59e0b" },
      { label: "Results Entry", href: "/dashboard/scoring", icon: "🏆", color: "#A5003A" },
      { label: "Manage Schedule", href: "/dashboard/schedule", icon: "📅", color: "#10b981" },
      { label: "Media Branding", href: "/dashboard/media", icon: "🎨", color: "#0ea5e9" },
      { label: "Print All ID Cards", href: `/print/id-cards${fullUser?.eventId ? `?eventId=${fullUser.eventId}` : ""}`, icon: "🪪", color: "#ec4899" }
    );
  } else if (["MANAGER", "INSTITUTION_MANAGER"].includes(role) && hasTeam) {
    quickLinks.push(
      { label: "Register Candidates", href: "/dashboard/candidates", icon: "👤", color: "#ec4899" },
      { label: "View Assignments", href: "/dashboard/assignments", icon: "📜", color: "#f59e0b" },
      { label: "Print Schedule", href: "/dashboard/schedule", icon: "🖨️", color: "#10b981" }
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
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {["MANAGER", "INSTITUTION_MANAGER"].includes(role) ? "Team Dashboard" : "Management Overview"}
          </h1>
          <p className="page-subtitle">
            Welcome back, <strong>{username}</strong> · {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div data-tour="dash-hub-btn" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/hub"
            className="btn btn-success"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <span>📡</span> Live Management Hub
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        data-tour="dash-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={i}
            className="stat-card"
            style={
              {
                "--card-accent-start": stat.accentStart,
                "--card-accent-end": stat.accentEnd,
              } as React.CSSProperties
            }
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${stat.accentStart}22, ${stat.accentEnd}33)`,
                  border: `1px solid ${stat.accentStart}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                }}
              >
                {stat.icon}
              </div>
              {stat.trend && (
                <span
                  className="badge"
                  style={{
                    background: `${stat.accentStart}15`,
                    color: stat.accentStart,
                    border: `1px solid ${stat.accentStart}25`,
                    fontSize: "0.65rem",
                  }}
                >
                  {stat.trend}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: typeof stat.value === "string" && stat.value.length > 6 ? "1.25rem" : "2rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1,
                marginBottom: "0.375rem",
                fontFamily: "var(--font-outfit)",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Info + Quick Actions Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
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

        {/* Manager Resources */}
        <div className="glass-panel" style={{ padding: "var(--spacing-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
            >
              🔗
            </div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Manager Resources</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.8rem", lineHeight: 1.5 }}>
            External tools for candidate photo hosting:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <a
              href="https://imgbb.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
              style={{ justifyContent: "flex-start", gap: "0.5rem" }}
            >
              <span>🚀</span> ImgBB <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>(Recommended)</span>
            </a>
            <a
              href="https://postimages.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-secondary"
              style={{ justifyContent: "flex-start", gap: "0.5rem" }}
            >
              <span>🖼️</span> PostImages
            </a>
          </div>
        </div>
      </div>

      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && hasTeam && (
        <div className="glass-panel" style={{ padding: "var(--spacing-lg)", marginBottom: "2rem", borderLeft: "4px solid #10b981" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981" }}>
            <span>📝</span> Registration Guide
          </h3>
          <ol style={{ paddingLeft: "1.2rem", margin: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <li style={{ paddingBottom: "0.5rem" }}>
              <strong>Step 1:</strong> Go to the <strong>Students List</strong> and add candidates by typing their Name or UID.
            </li>
            <li style={{ paddingBottom: "0.5rem" }}>
              <strong>Step 2:</strong> Go to <strong>View Assignments</strong> and assign programs to the students you just added.
            </li>
            <li style={{ paddingBottom: "0.5rem" }}>
              <strong>Step 3:</strong> Once you have finished assigning all programs, contact your <strong>Zone Admin</strong> to confirm your registration. <em>(This will officially generate their Chest Numbers)</em>.
            </li>
            <li>
              <strong>Step 4:</strong> After confirmation, go to <strong>Print Schedule</strong> to print individual student schedules and your total institution schedule.
            </li>
          </ol>
        </div>
      )}

      <CustomerGuidelines role={role} />

      {/* Pending Programs for Managers */}
      {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && pendingPrograms.length > 0 && (
        <div className="glass-panel" style={{ padding: "var(--spacing-lg)", marginTop: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--warning)" }}>⚠️</span> Pending Program Assignments
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
