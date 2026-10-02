"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
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
  const [isOpen, setIsOpen] = useState(false); // Mobile drawer open state
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop mini mode
  const [isHovered, setIsHovered] = useState(false); // Desktop hover-expand mode
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cswc_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch (e) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "cswc_sidebar_collapsed") {
        setIsCollapsed(e.newValue === "true");
      }
    };
    const handleCustom = () => {
      try {
        const current = localStorage.getItem("cswc_sidebar_collapsed");
        setIsCollapsed(current === "true");
      } catch (e) {}
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("cswc_sidebar_change", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cswc_sidebar_change", handleCustom);
    };
  }, []);

  const toggleCollapse = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cswc_sidebar_collapsed", String(next));
        window.dispatchEvent(new Event("cswc_sidebar_change"));
      } catch (err) {}
      return next;
    });
  }, []);

  const expandToFull = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsCollapsed(false);
    try {
      localStorage.setItem("cswc_sidebar_collapsed", "false");
      window.dispatchEvent(new Event("cswc_sidebar_change"));
    } catch (err) {}
  }, []);

  const collapseToMini = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsCollapsed(true);
    try {
      localStorage.setItem("cswc_sidebar_collapsed", "true");
      window.dispatchEvent(new Event("cswc_sidebar_change"));
    } catch (err) {}
  }, []);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => {
    setIsOpen(false);
    setIsHovered(false);
  };

  const isActive = useCallback(
    (href: string) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      const hrefPath = href.split("?")[0];
      return pathname.startsWith(hrefPath);
    },
    [pathname]
  );

  const navGroups = getNavItems(role);

  // Desktop visual state:
  // If collapsed and hovered -> hover-expanded (shows full text floating)
  // If collapsed and not hovered -> mini icon-only bar
  // If not collapsed -> full expanded type
  const isMini = isCollapsed && !isHovered;
  const isHoverExpanded = isCollapsed && isHovered;

  const renderContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Logo Area */}
      <div className="sidebar-logo-area">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isMini ? "center" : "space-between",
            width: "100%",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minWidth: 0,
              cursor: isMini ? "pointer" : "default",
            }}
            onClick={isMini ? expandToFull : undefined}
            title={isMini ? "Click to expand full menu" : undefined}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "#FFFFFF",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "3px",
                flexShrink: 0,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <img
                src="/icon.png"
                alt="CSWC Fiesta Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            {!isMini && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
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
                <div
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {festMoto}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button (Expand / Collapse) */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="sidebar-toggle-btn no-mobile"
            title={
              isCollapsed
                ? isHovered
                  ? "Click to Lock Full Menu"
                  : "Click to Expand to Full Menu"
                : "Click to Collapse to Mini Bar"
            }
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={17} strokeWidth={2} />
            ) : (
              <PanelLeftClose size={17} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* User Area */}
      <div className="sidebar-user-area">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isMini ? "center" : "flex-start",
            gap: "10px",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--brand-tint)",
              border: "1px solid rgba(122,31,61,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--brand)",
              cursor: isMini ? "pointer" : "default",
            }}
            onClick={isMini ? expandToFull : undefined}
            title={isMini ? `${displayName || username} (${roleLabel(role)}) — Click to expand` : undefined}
          >
            {roleInitials(username)}
          </div>
          {!isMini && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
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
              <div style={{ marginTop: "2px" }}>
                <span className="role-badge">{roleLabel(role)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.section} className="nav-group-container">
            {isMini ? (
              <div className="nav-section-divider" title={group.section} />
            ) : (
              <div className="nav-section-title">{group.section}</div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={`nav-link-wrapper ${active ? "active" : ""} ${isMini ? "mini-link" : ""}`}
                  title={item.name + (item.subtitle ? ` — ${item.subtitle}` : "")}
                  data-tooltip={item.name}
                >
                  <div className="nav-icon">
                    <Icon
                      size={18}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                  {!isMini && (
                    <div className="nav-link-text-block">
                      <span className="nav-link-main">{item.name}</span>
                      {item.highlight && <span className="nav-link-tag">Hot</span>}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Dedicated "Menu Mode" Quick Toggle Handle */}
        <div className="sidebar-menu-setting-row no-mobile">
          <button
            type="button"
            onClick={toggleCollapse}
            className={`nav-link-wrapper menu-setting-toggle-btn ${isMini ? "mini-link" : ""}`}
            title={isCollapsed ? "Click to Expand to Full Menu" : "Click to Collapse to Mini Bar"}
          >
            <div className="nav-icon">
              {isCollapsed ? (
                <ChevronRight size={18} strokeWidth={2} />
              ) : (
                <ChevronLeft size={18} strokeWidth={2} />
              )}
            </div>
            {!isMini && (
              <div className="nav-link-text-block">
                <span className="nav-link-main" style={{ fontWeight: 600, color: "var(--text)" }}>
                  {isCollapsed ? "Expand to Full Type" : "Collapse to Mini Bar"}
                </span>
                <span className="menu-setting-badge">
                  {isCollapsed ? "Mini" : "Full"}
                </span>
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className={`sidebar-footer ${isMini ? "mini-footer" : ""}`}>
        {isMini ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
            <button
              type="button"
              onClick={expandToFull}
              className="mini-expand-action-btn no-mobile"
              title="Click to Expand Full Type"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
            <ThemeToggle />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mini-logout-btn"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <LogoutButton />
            </div>
            <ThemeToggle />
          </div>
        )}
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
      <aside
        className={`dashboard-sidebar no-print ${isCollapsed ? "mini" : "expanded"} ${isHoverExpanded ? "hover-expanded" : ""} ${isOpen ? "open" : ""}`}
        onMouseEnter={() => {
          if (isCollapsed) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (isCollapsed) setIsHovered(false);
        }}
      >
        {renderContent()}
      </aside>
    </>
  );
}
