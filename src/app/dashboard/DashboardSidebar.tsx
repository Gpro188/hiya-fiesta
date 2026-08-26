"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "@/app/components/ThemeToggle";

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
  icon: string;
  href: string;
  highlight?: boolean;
}

function getNavItems(role: string): { section: string; items: NavItem[] }[] {
  const groups: { section: string; items: NavItem[] }[] = [];

  const overviewItems: NavItem[] = [
    {
      name: "Dashboard",
      subtitle: "Overview & quick stats",
      icon: "📊",
      href: "/dashboard",
    },
  ];

  // Only show Live Hub for Super Admin, Admin, and Media (removed from Zone Admin & Institution portals)
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "MEDIA") {
    overviewItems.push({
      name: "Live Hub",
      subtitle: "Real-time public standings",
      icon: "📡",
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
      section: "STATE FEST CONTROL",
      items: [
        {
          name: "State Advancements",
          subtitle: "Zone List Conform",
          icon: "⭐",
          href: "/dashboard/promotions",
          highlight: true,
        },
        {
          name: "Schedule & Stages",
          subtitle: "Assign venues & time slots",
          icon: "📅",
          href: "/dashboard/schedule",
        },
        {
          name: "Jury Assign",
          subtitle: "Global master list of judges",
          icon: "⚖️",
          href: "/dashboard/juries",
        },
        {
          name: "Mark Entry",
          subtitle: "State Fest Results",
          icon: "🏆",
          href: "/dashboard/scoring?session=state",
        },
        {
          name: "Poster Branding",
          subtitle: "State result posters",
          icon: "🖼️",
          href: "/dashboard/media?session=state",
        },
        {
          name: "Reports & Print Hub",
          subtitle: "All printables & schedules",
          icon: "🖨️",
          href: "/dashboard/reports",
        },
      ],
    });

    groups.push({
      section: "ZONE FEST CONTROL",
      items: [
        {
          name: "Master Students",
          subtitle: "Upload & UID Directory",
          icon: "👨‍🎓",
          href: "/dashboard/super/students",
          highlight: true,
        },
        {
          name: "Master Institutions",
          subtitle: "Upload & Zone mappings",
          icon: "🏫",
          href: "/dashboard/super/institutions",
          highlight: true,
        },
        {
          name: "Master Zones",
          subtitle: "Manage 8 Regional Zones",
          icon: "🗺️",
          href: "/dashboard/super/zones",
          highlight: true,
        },
        {
          name: "User Manage",
          subtitle: "Portal access & credentials",
          icon: "👥",
          href: "/dashboard/users",
        },
        {
          name: "Events",
          subtitle: "Manage zone events",
          icon: "🎭",
          href: "/dashboard/events",
        },
        {
          name: "Teams",
          subtitle: "Teams & flag colors",
          icon: "🛡️",
          href: "/dashboard/teams",
        },
        {
          name: "Mark Entry (Zone)",
          subtitle: "Override Zone Results",
          icon: "🏆",
          href: "/dashboard/scoring?session=zone",
        },
        {
          name: "Poster Branding (Zone)",
          subtitle: "Zone result posters",
          icon: "🎨",
          href: "/dashboard/media?session=zone",
        },
      ],
    });

    groups.push({
      section: "SYSTEM SETTINGS",
      items: [
        {
          name: "Homepage & Theme",
          subtitle: "Colors, hero & public UI",
          icon: "🎨",
          href: "/dashboard/settings/homepage",
        },
        {
          name: "Global Settings",
          subtitle: "Config, audit & maintenance",
          icon: "⚙️",
          href: "/dashboard/settings",
        },
        {
          name: "Programs",
          subtitle: "Competition programs & rules",
          icon: "📜",
          href: "/dashboard/programs",
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
          icon: "🎭",
          href: "/dashboard/events",
        },
        {
          name: "Teams",
          subtitle: "Teams, managers & flag colors",
          icon: "🛡️",
          href: "/dashboard/teams",
        },
        {
          name: "Users",
          subtitle: "Portal access & credentials",
          icon: "👥",
          href: "/dashboard/users",
        },
        {
          name: "Jury Directory",
          subtitle: "Global master list of judges",
          icon: "⚖️",
          href: "/dashboard/juries",
        },
        {
          name: "Programs",
          subtitle: "Competition programs & rules",
          icon: "📜",
          href: "/dashboard/programs",
        },
        {
          name: "State Advancements",
          subtitle: "Promote winners to state",
          icon: "⭐",
          href: "/dashboard/promotions",
          highlight: true,
        },
        {
          name: "Reports & Print Hub",
          subtitle: "All printables & schedules",
          icon: "🖨️",
          href: "/dashboard/reports",
        },
        {
          name: "Settings",
          subtitle: "Config, audit & maintenance",
          icon: "⚙️",
          href: "/dashboard/settings",
        },
        {
          name: "Homepage & Theme",
          subtitle: "Colors, hero & committee",
          icon: "🎨",
          href: "/dashboard/settings/homepage",
        },
        {
          name: "Poster Branding",
          subtitle: "Design result posters",
          icon: "🖼️",
          href: "/dashboard/media",
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
          icon: "🛡️",
          href: "/dashboard/teams",
          highlight: true,
        },
        {
          name: "Scheduling & Stages",
          subtitle: "Assign venues & time slots",
          icon: "📅",
          href: "/dashboard/schedule",
        },
        {
          name: "Jury Selection",
          subtitle: "Assign judges to programs",
          icon: "⚖️",
          href: "/dashboard/juries",
        },
        {
          name: "Results & Scoring",
          subtitle: "Mark Entry & Publishing",
          icon: "🏆",
          href: "/dashboard/scoring",
        },
        {
          name: "Reports & Print Hub",
          subtitle: "All printables & ID cards",
          icon: "🖨️",
          href: "/dashboard/reports",
        },
        {
          name: "User Credentials",
          subtitle: "Manage institution accounts",
          icon: "👥",
          href: "/dashboard/users",
        },
        {
          name: "Zone Settings",
          subtitle: "Registration Dates & Config",
          icon: "⚙️",
          href: "/dashboard/settings",
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
          icon: "🎨",
          href: "/dashboard/media",
          highlight: true,
        },
        {
          name: "View Results",
          subtitle: "Browse published results",
          icon: "🏆",
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
          icon: "👤",
          href: "/dashboard/candidates",
        },
        {
          name: "Program Allocations",
          subtitle: "Assign students to programs",
          icon: "📜",
          href: "/dashboard/assignments",
        },
        {
          name: "Reports & Print Hub",
          subtitle: "Printable ID cards & timetable",
          icon: "🖨️",
          href: "/dashboard/reports",
        },
        {
          name: "Entry Passes & Schedule",
          subtitle: "Printable ID cards & timetable",
          icon: "🖨️",
          href: "/dashboard/schedule",
        },
      ],
    });
  }

  return groups;
}

function roleColor(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "#f59e0b";
    case "ADMIN":
      return "#A5003A";
    case "JUDGE":
      return "#10b981";
    case "MEDIA":
      return "#0ea5e9";
    case "MANAGER":
    case "INSTITUTION_MANAGER":
      return "#f43f5e";
    default:
      return "#98a2b3";
  }
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
      return pathname.startsWith(href);
    },
    [pathname]
  );

  const navGroups = getNavItems(role);

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo Area */}
      <div className="sidebar-logo-area">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              boxShadow: "0 1px 4px rgba(0, 0, 0, 0.12)",
              flexShrink: 0,
            }}
          >
            <img
              src="/icon.png"
              alt="CSWC Fiesta Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              {festName}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {festMoto}
            </div>
          </div>
        </div>
      </div>

      {/* User Area */}
      <div className="sidebar-user-area">
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${roleColor(role)}, ${roleColor(role)}aa)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "white",
            }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.85rem",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "160px",
              }}
              title={displayName || username}
            >
              {displayName || username}
            </div>
            <div style={{ marginTop: "2px" }}>
              <span className="role-badge">{role.replace("_", " ").toLowerCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.section}>
            <div className="nav-section-title">{group.section}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`nav-link-wrapper ${isActive(item.href) ? "active" : ""}`}
                style={item.highlight && !isActive(item.href) ? { borderLeftColor: "rgba(14,165,233,0.3)" } : undefined}
              >
                <div className="nav-icon">
                  <span style={{ fontSize: "0.95rem" }}>{item.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    className="nav-link-main"
                    style={
                      item.highlight && !isActive(item.href)
                        ? { color: "#0ea5e9", fontWeight: 600 }
                        : undefined
                    }
                  >
                    {item.name}
                  </span>
                  <span className="nav-link-subtitle">{item.subtitle}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <LogoutButton />
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}
          >
            <img src="/icon.png" alt="CSWC Fiesta Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
            {festName}
          </span>
        </div>
        <button onClick={toggle} className="burger-btn" aria-label="Toggle menu">
          {isOpen ? "✕" : "☰"}
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
