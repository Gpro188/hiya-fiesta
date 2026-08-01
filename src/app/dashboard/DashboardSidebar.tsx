"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "@/app/components/ThemeToggle";

interface SidebarProps {
  role: string;
  username: string;
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

  // Always shown
  groups.push({
    section: "Overview",
    items: [
      {
        name: "Dashboard",
        subtitle: "Overview & quick stats",
        icon: "📊",
        href: "/dashboard",
      },
      {
        name: "Live Hub",
        subtitle: "Real-time public standings",
        icon: "📡",
        href: "/hub",
        highlight: true,
      },
    ],
  });

  if (["ADMIN", "SUPER_ADMIN"].includes(role)) {
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
          name: "Candidates",
          subtitle: "Register & approve participants",
          icon: "👤",
          href: "/dashboard/candidates",
        },
        {
          name: "Programs",
          subtitle: "Competition programs & rules",
          icon: "📜",
          href: "/dashboard/programs",
        },
        {
          name: "Program Assignments",
          subtitle: "Enroll candidates into programs",
          icon: "📝",
          href: "/dashboard/assignments",
        },
        {
          name: "Results & Scoring",
          subtitle: "Enter marks & publish results",
          icon: "🏆",
          href: "/dashboard/scoring",
        },
        {
          name: "Global Schedule",
          subtitle: "Timeline & venue planning",
          icon: "📅",
          href: "/dashboard/schedule",
        },
        {
          name: "Media Branding",
          subtitle: "Posters, logos & branding",
          icon: "🎨",
          href: "/dashboard/media",
          highlight: true,
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
      ],
    });

    if (role === "SUPER_ADMIN") {
      groups.push({
        section: "Central Registry",
        items: [
          {
            name: "Master Institutions",
            subtitle: "80+ Colleges & Zone mappings",
            icon: "🏫",
            href: "/dashboard/super/institutions",
            highlight: true,
          },
          {
            name: "Master Students (UID)",
            subtitle: "Central student UID directory",
            icon: "👨‍🎓",
            href: "/dashboard/super/students",
            highlight: true,
          },
        ],
      });
    }
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

  if (role === "MANAGER") {
    groups.push({
      section: "Team Manager",
      items: [
        {
          name: "Candidates",
          subtitle: "Register your team's participants",
          icon: "👤",
          href: "/dashboard/candidates",
        },
        {
          name: "Program Assignments",
          subtitle: "Enroll candidates in programs",
          icon: "📜",
          href: "/dashboard/assignments",
        },
        {
          name: "Print Schedule",
          subtitle: "View & print team timetable",
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
      return "#6366f1";
    case "JUDGE":
      return "#10b981";
    case "MEDIA":
      return "#0ea5e9";
    case "MANAGER":
      return "#f43f5e";
    default:
      return "#98a2b3";
  }
}

export default function DashboardSidebar({
  role,
  username,
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img
              src="/logo.png"
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
              }}
            >
              {username}
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
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src="/logo.png" alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
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
