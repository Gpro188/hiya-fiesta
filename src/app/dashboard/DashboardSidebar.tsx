"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "@/app/components/ThemeToggle";
import {
  LayoutDashboard,
  Radio,
  Star,
  CalendarDays,
  Scale,
  Trophy,
  Image,
  GraduationCap,
  FileText,
  UploadCloud,
  Building2,
  Users,
  Settings,
  Palette,
  ClipboardList,
  Printer,
  UserCheck,
  BookOpen,
  Award,
  Map,
  RefreshCw,
  Shield,
  PenLine,
  TableProperties,
  X,
  Menu,
  ChevronRight,
  Ticket,
} from "lucide-react";

interface SidebarProps {
  role: string;
  username: string;
  displayName?: string;
  festName: string;
  festMoto: string;
}

interface NavItem {
  name: string;
  subtitle: string;
  icon: React.ElementType;
  href: string;
  highlight?: boolean;
}

function getNavItems(role: string): { section: string; items: NavItem[] }[] {
  const groups: { section: string; items: NavItem[] }[] = [];

  const overviewItems: NavItem[] = [
    {
      name: "Dashboard",
      subtitle: "Overview & quick stats",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
  ];

  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "MEDIA") {
    overviewItems.push({
      name: "Live Hub",
      subtitle: "Real-time public standings",
      icon: Radio,
      href: "/hub",
      highlight: true,
    });
  }

  groups.push({
    section: "Overview",
    items: overviewItems,
  });

  if (role === "SUPER_ADMIN") {
    groups.push({
      section: "State Fest Control",
      items: [
        {
          name: "State Advancements",
          subtitle: "Zone List Conform",
          icon: Star,
          href: "/dashboard/promotions",
          highlight: true,
        },
        {
          name: "Schedule & Stages",
          subtitle: "Assign venues & time slots",
          icon: CalendarDays,
          href: "/dashboard/schedule",
        },
        {
          name: "Jury Assign",
          subtitle: "Global master list of judges",
          icon: Scale,
          href: "/dashboard/juries",
        },
        {
          name: "Mark Entry",
          subtitle: "State Fest Results",
          icon: Trophy,
          href: "/dashboard/scoring?session=state",
        },
        {
          name: "Poster Branding",
          subtitle: "State result posters",
          icon: Image,
          href: "/dashboard/media?session=state",
        },
        {
          name: "State Merit Certificates",
          subtitle: "1st, 2nd, 3rd overprint",
          icon: GraduationCap,
          href: "/dashboard/certificates?session=state",
          highlight: true,
        },
        {
          name: "Reports & Print Hub",
          subtitle: "All printables & schedules",
          icon: FileText,
          href: "/dashboard/reports",
        },
        {
          name: "Closing Declaration",
          subtitle: "4-Page Stage Announcement PDF",
          icon: Printer,
          href: "/print/closing-ceremony",
          highlight: true,
        },
        {
          name: "Venue Control Sheet",
          subtitle: "Program, result & cert tick sheet",
          icon: ClipboardList,
          href: "/print/venue-control",
          highlight: true,
        },
        {
          name: "Program Reg Counts",
          subtitle: "Candidate & college counts",
          icon: TableProperties,
          href: "/print/programs-registration",
          highlight: true,
        },
      ],
    });

    groups.push({
      section: "Zone Fest Control",
      items: [
        {
          name: "Master Students",
          subtitle: "Upload & UID Directory",
          icon: GraduationCap,
          href: "/dashboard/super/students",
          highlight: true,
        },
        {
          name: "Candidates & Photos",
          subtitle: "Candidate list & photo updates",
          icon: UserCheck,
          href: "/dashboard/candidates",
          highlight: true,
        },
        {
          name: "Chest Number Hub",
          subtitle: "Pending confirm & print roster",
          icon: Ticket,
          href: "/print/chest-numbers",
          highlight: true,
        },
        {
          name: "Zonal Off-Stage Valuation",
          subtitle: "Photos & marks sheet",
          icon: PenLine,
          href: "/print/zonal-offstage-valuation",
          highlight: true,
        },
        {
          name: "Master Institutions",
          subtitle: "Upload & Zone mappings",
          icon: Building2,
          href: "/dashboard/super/institutions",
          highlight: true,
        },
        {
          name: "Zones Management",
          subtitle: "Mark completed & lock zones",
          icon: Map,
          href: "/dashboard/super/zones",
          highlight: true,
        },
        {
          name: "Direct Replacements",
          subtitle: "Swap candidates across zones",
          icon: RefreshCw,
          href: "/dashboard/super/replacement",
          highlight: true,
        },
        {
          name: "User Manage",
          subtitle: "Portal access & credentials",
          icon: Users,
          href: "/dashboard/users",
        },
        {
          name: "Events",
          subtitle: "Manage zone events",
          icon: CalendarDays,
          href: "/dashboard/events",
        },
        {
          name: "Teams",
          subtitle: "Teams & flag colors",
          icon: Shield,
          href: "/dashboard/teams",
        },
        {
          name: "Mark Entry (Zone)",
          subtitle: "Override Zone Results",
          icon: Trophy,
          href: "/dashboard/scoring?session=zone",
        },
        {
          name: "Poster Branding (Zone)",
          subtitle: "Zone result posters",
          icon: Image,
          href: "/dashboard/media?session=zone",
        },
        {
          name: "Volunteers",
          subtitle: "Team & ID cards",
          icon: Award,
          href: "/dashboard/volunteers",
          highlight: true,
        },
        {
          name: "Zonal Merit Certificates",
          subtitle: "1st, 2nd, 3rd overprint",
          icon: GraduationCap,
          href: "/dashboard/certificates?session=zone",
          highlight: true,
        },
      ],
    });

    groups.push({
      section: "System Settings",
      items: [
        {
          name: "Homepage & Theme",
          subtitle: "Colors, hero & public UI",
          icon: Palette,
          href: "/dashboard/settings/homepage",
        },
        {
          name: "Global Settings",
          subtitle: "Config, audit & maintenance",
          icon: Settings,
          href: "/dashboard/settings",
        },
        {
          name: "Programs",
          subtitle: "Competition programs & rules",
          icon: BookOpen,
          href: "/dashboard/programs",
        },
        {
          name: "Program Reg Counts",
          subtitle: "Candidate & college counts",
          icon: TableProperties,
          href: "/print/programs-registration",
          highlight: true,
        },
      ],
    });
  } else if (role === "ADMIN") {
    groups.push({
      section: "Admin Setup",
      items: [
        {
          name: "Events",
          subtitle: "Create & manage festival events",
          icon: CalendarDays,
          href: "/dashboard/events",
        },
        {
          name: "Teams",
          subtitle: "Teams, managers & flag colors",
          icon: Shield,
          href: "/dashboard/teams",
        },
        {
          name: "Candidates & Photos",
          subtitle: "Candidate list & photo updates",
          icon: UserCheck,
          href: "/dashboard/candidates",
          highlight: true,
        },
        {
          name: "Users",
          subtitle: "Portal access & credentials",
          icon: Users,
          href: "/dashboard/users",
        },
        {
          name: "Jury Directory",
          subtitle: "Global master list of judges",
          icon: Scale,
          href: "/dashboard/juries",
        },
        {
          name: "Programs",
          subtitle: "Competition programs & rules",
          icon: BookOpen,
          href: "/dashboard/programs",
        },
        {
          name: "State Advancements",
          subtitle: "Promote winners to state",
          icon: Star,
          href: "/dashboard/promotions",
          highlight: true,
        },
        {
          name: "Reports & Print Hub",
          subtitle: "All printables & schedules",
          icon: FileText,
          href: "/dashboard/reports",
        },
        {
          name: "Closing Declaration",
          subtitle: "4-Page Stage Announcement PDF",
          icon: Printer,
          href: "/print/closing-ceremony",
          highlight: true,
        },
        {
          name: "Venue Control Sheet",
          subtitle: "Program, result & cert tick sheet",
          icon: ClipboardList,
          href: "/print/venue-control",
          highlight: true,
        },
        {
          name: "Merit Certificates",
          subtitle: "1st, 2nd, 3rd overprint",
          icon: GraduationCap,
          href: "/dashboard/certificates",
          highlight: true,
        },
        {
          name: "Chest Number Hub",
          subtitle: "Pending confirm & print roster",
          icon: Ticket,
          href: "/print/chest-numbers",
          highlight: true,
        },
        {
          name: "Zonal Off-Stage Valuation",
          subtitle: "Photos & marks sheet",
          icon: PenLine,
          href: "/print/zonal-offstage-valuation",
          highlight: true,
        },
        {
          name: "Program Reg Counts",
          subtitle: "Candidate & college counts",
          icon: TableProperties,
          href: "/print/programs-registration",
          highlight: true,
        },
        {
          name: "Settings",
          subtitle: "Config, audit & maintenance",
          icon: Settings,
          href: "/dashboard/settings",
        },
        {
          name: "Homepage & Theme",
          subtitle: "Colors, hero & committee",
          icon: Palette,
          href: "/dashboard/settings/homepage",
        },
        {
          name: "Poster Branding",
          subtitle: "Design result posters",
          icon: Image,
          href: "/dashboard/media",
        },
        {
          name: "Volunteers",
          subtitle: "Team & ID cards",
          icon: Award,
          href: "/dashboard/volunteers",
        },
      ],
    });
  }

  if (role === "ZONE_ADMIN") {
    groups.push({
      section: "Zone Management",
      items: [
        {
          name: "Teams & Institutions",
          subtitle: "Confirm List & Chest Nos",
          icon: Shield,
          href: "/dashboard/teams",
          highlight: true,
        },
        {
          name: "Programs & Participants",
          subtitle: "Check registered candidates",
          icon: BookOpen,
          href: "/dashboard/programs",
          highlight: true,
        },
        {
          name: "Candidates & Photos",
          subtitle: "Candidate list & photo updates",
          icon: UserCheck,
          href: "/dashboard/candidates",
          highlight: true,
        },
        {
          name: "Scheduling & Stages",
          subtitle: "Assign venues & time slots",
          icon: CalendarDays,
          href: "/dashboard/schedule",
        },
        {
          name: "Jury Selection",
          subtitle: "Assign judges to programs",
          icon: Scale,
          href: "/dashboard/juries",
        },
        {
          name: "Results & Scoring",
          subtitle: "Mark Entry & Publishing",
          icon: Trophy,
          href: "/dashboard/scoring",
        },
        {
          name: "Reports & Print Hub",
          subtitle: "All printables & ID cards",
          icon: FileText,
          href: "/dashboard/reports",
        },
        {
          name: "Venue Program & Result Control",
          subtitle: "Program, result & cert tick sheet",
          icon: ClipboardList,
          href: "/print/venue-control",
          highlight: true,
        },
        {
          name: "User Credentials",
          subtitle: "Manage institution accounts",
          icon: Users,
          href: "/dashboard/users",
        },
        {
          name: "Volunteers",
          subtitle: "Zone volunteers & ID cards",
          icon: Award,
          href: "/dashboard/volunteers",
          highlight: true,
        },
        {
          name: "Zone Settings",
          subtitle: "Registration Dates & Config",
          icon: Settings,
          href: "/dashboard/settings",
        },
        {
          name: "Inst. Attendance Sheet",
          subtitle: "Team manager sign & attendance",
          icon: ClipboardList,
          href: "/print/institution-attendance",
          highlight: true,
        },
        {
          name: "Zonal Merit Certificates",
          subtitle: "1st, 2nd, 3rd overprint",
          icon: GraduationCap,
          href: "/dashboard/certificates",
          highlight: true,
        },
      ],
    });
  }

  if (role === "MEDIA") {
    groups.push({
      section: "Media Center",
      items: [
        {
          name: "Poster Branding",
          subtitle: "Design result posters",
          icon: Image,
          href: "/dashboard/media",
          highlight: true,
        },
        {
          name: "View Results",
          subtitle: "Browse published results",
          icon: Trophy,
          href: "/dashboard/scoring",
        },
      ],
    });
  }

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role)) {
    groups.push({
      section: "Institution Hub",
      items: [
        {
          name: "Student Roster",
          subtitle: "View & register candidates",
          icon: UserCheck,
          href: "/dashboard/candidates",
        },
        {
          name: "Program Allocations",
          subtitle: "Assign students to programs",
          icon: BookOpen,
          href: "/dashboard/assignments",
        },
        {
          name: "Reports & Print Hub",
          subtitle: "Printable ID cards & timetable",
          icon: FileText,
          href: "/dashboard/reports",
        },
        {
          name: "Entry Passes & Schedule",
          subtitle: "Printable ID cards & timetable",
          icon: CalendarDays,
          href: "/dashboard/schedule",
        },
      ],
    });
  }

  if (role === "JUDGE") {
    groups.push({
      section: "Jury Portal",
      items: [
        {
          name: "Mark Entry",
          subtitle: "Consensus evaluation entry",
          icon: PenLine,
          href: "/dashboard/scoring",
          highlight: true,
        },
        {
          name: "Stage Valuation Sheet",
          subtitle: "Official valuation print",
          icon: FileText,
          href: "/print/valuation",
        },
        {
          name: "Tabulation Sheet",
          subtitle: "Master calculation print",
          icon: TableProperties,
          href: "/print/tabulation",
        },
        {
          name: "Results & Champions",
          subtitle: "Final announcement sheet",
          icon: Trophy,
          href: "/print/results-summary",
          highlight: true,
        },
      ],
    });
  }

  return groups;
}

function roleLabel(role: string): string {
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export default function DashboardSidebar({
  role,
  username,
  displayName,
  festName,
  festMoto,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      // Strip query string for comparison
      const hrefPath = href.split("?")[0];
      return pathname.startsWith(hrefPath);
    },
    [pathname]
  );

  const navGroups = getNavItems(role);

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo Area */}
      <div className="sidebar-logo-area">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px",
              flexShrink: 0,
            }}
          >
            <img
              src="/icon.png"
              alt="CSWC Fiesta Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "var(--text)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {festName}
            </div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "1px", lineHeight: 1.2 }}>
              {festMoto}
            </div>
          </div>
        </div>
      </div>

      {/* User Area */}
      <div className="sidebar-user-area">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "var(--brand-tint)",
              border: "1px solid rgba(122,31,61,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--brand)",
            }}
          >
            {roleInitials(username)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 500,
                fontSize: "0.8125rem",
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={displayName || username}
            >
              {displayName || username}
            </div>
            <div style={{ marginTop: "1px" }}>
              <span className="role-badge">{roleLabel(role)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.section}>
            <div className="nav-section-title">{group.section}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={`nav-link-wrapper ${active ? "active" : ""}`}
                  title={item.subtitle}
                >
                  <div className="nav-icon">
                    <Icon
                      size={18}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="nav-link-main">{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="sidebar-footer"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <LogoutButton />
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "6px",
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px",
              flexShrink: 0,
            }}
          >
            <img src="/icon.png" alt="CSWC Fiesta Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>
            {festName}
          </span>
        </div>
        <button onClick={toggle} className="burger-btn" aria-label="Toggle menu">
          {isOpen ? <X size={16} strokeWidth={1.5} /> : <Menu size={16} strokeWidth={1.5} />}
        </button>
      </header>

      {/* Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={close} />}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar no-print ${isOpen ? "open" : ""}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
