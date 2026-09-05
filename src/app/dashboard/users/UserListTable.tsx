"use client";

import { useState } from "react";
import UserActions from "./UserActions";
import { formatInstitutionDisplay } from "@/lib/formatUtils";

interface UserItem {
  id: string;
  username: string;
  role: string;
  createdAt: Date | string;
  zoneId?: string | null;
  institutionId?: string | null;
  zone?: { id: string; name: string } | null;
  institution?: { id: string; name: string; place?: string | null; zoneId?: string | null } | null;
}

interface ZoneOption {
  id: string;
  name: string;
}

interface InstitutionOption {
  id: string;
  name: string;
  zoneId?: string | null;
}

export default function UserListTable({
  users,
  zones,
  institutions,
  isZoneAdmin,
}: {
  users: UserItem[];
  zones: ZoneOption[];
  institutions: InstitutionOption[];
  isZoneAdmin: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");
  const [institutionFilter, setInstitutionFilter] = useState<string>("ALL");

  // Dynamic institution options filtered by selected zone filter if applicable
  const availableInstitutions = zoneFilter === "ALL" 
    ? institutions 
    : institutions.filter(i => i.zoneId === zoneFilter);

  // Filter users based on search, role, zone, and institution
  const filteredUsers = users.filter((u) => {
    // Search query match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchUsername = u.username.toLowerCase().includes(q);
      const { name: instName, place: instPlace } = formatInstitutionDisplay(u.institution);
      const matchInst = u.institution ? (
        instName.toLowerCase().includes(q) ||
        (instPlace && instPlace.toLowerCase().includes(q)) ||
        u.institution.name.toLowerCase().includes(q) ||
        (u.institution.place && u.institution.place.toLowerCase().includes(q))
      ) : false;
      const matchZone = u.zone?.name?.toLowerCase().includes(q) || false;
      if (!matchUsername && !matchInst && !matchZone) return false;
    }

    // Role filter
    if (roleFilter !== "ALL") {
      if (roleFilter === "JUDGE" && u.role !== "JUDGE") return false;
      if (roleFilter === "ZONE_ADMIN" && u.role !== "ZONE_ADMIN") return false;
      if (roleFilter === "INSTITUTION_MANAGER" && u.role !== "INSTITUTION_MANAGER" && u.role !== "MANAGER") return false;
      if (roleFilter === "ADMIN" && !["ADMIN", "SUPER_ADMIN"].includes(u.role)) return false;
    }

    // Zone filter
    if (zoneFilter !== "ALL") {
      const userZone = u.zoneId || u.institution?.zoneId;
      if (userZone !== zoneFilter) return false;
    }

    // Institution filter
    if (institutionFilter !== "ALL") {
      if (u.institutionId !== institutionFilter) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("ALL");
    setZoneFilter("ALL");
    setInstitutionFilter("ALL");
  };

  const hasActiveFilters = searchTerm !== "" || roleFilter !== "ALL" || zoneFilter !== "ALL" || institutionFilter !== "ALL";

  return (
    <div className="glass-panel" style={{ padding: "var(--spacing-lg)" }}>
      {/* ── Filters Bar ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "1.5rem",
          padding: "14px",
          backgroundColor: "var(--surface-color)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
        }}
      >
        {/* Role Quick Filter Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "4px" }}>
            Filter by Role:
          </span>
          <button
            type="button"
            onClick={() => setRoleFilter("ALL")}
            style={{
              padding: "4px 12px",
              fontSize: "0.75rem",
              fontWeight: 700,
              borderRadius: "20px",
              border: roleFilter === "ALL" ? "1px solid var(--primary)" : "1px solid var(--border-color)",
              backgroundColor: roleFilter === "ALL" ? "var(--primary)" : "transparent",
              color: roleFilter === "ALL" ? "#fff" : "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            All Users ({users.length})
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter("INSTITUTION_MANAGER")}
            style={{
              padding: "4px 12px",
              fontSize: "0.75rem",
              fontWeight: 700,
              borderRadius: "20px",
              border: roleFilter === "INSTITUTION_MANAGER" ? "1px solid #10B981" : "1px solid var(--border-color)",
              backgroundColor: roleFilter === "INSTITUTION_MANAGER" ? "#10B981" : "transparent",
              color: roleFilter === "INSTITUTION_MANAGER" ? "#fff" : "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            🏛️ Institution Managers ({users.filter(u => u.role === "INSTITUTION_MANAGER" || u.role === "MANAGER").length})
          </button>

          {!isZoneAdmin && (
            <button
              type="button"
              onClick={() => setRoleFilter("JUDGE")}
              style={{
                padding: "4px 12px",
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRadius: "20px",
                border: roleFilter === "JUDGE" ? "1px solid #3B82F6" : "1px solid var(--border-color)",
                backgroundColor: roleFilter === "JUDGE" ? "#3B82F6" : "transparent",
                color: roleFilter === "JUDGE" ? "#fff" : "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              ⚖️ Judges ({users.filter(u => u.role === "JUDGE").length})
            </button>
          )}

          {!isZoneAdmin && (
            <button
              type="button"
              onClick={() => setRoleFilter("ZONE_ADMIN")}
              style={{
                padding: "4px 12px",
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRadius: "20px",
                border: roleFilter === "ZONE_ADMIN" ? "1px solid #8B5CF6" : "1px solid var(--border-color)",
                backgroundColor: roleFilter === "ZONE_ADMIN" ? "#8B5CF6" : "transparent",
                color: roleFilter === "ZONE_ADMIN" ? "#fff" : "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              📍 Zone Admins ({users.filter(u => u.role === "ZONE_ADMIN").length})
            </button>
          )}

          {!isZoneAdmin && (
            <button
              type="button"
              onClick={() => setRoleFilter("ADMIN")}
              style={{
                padding: "4px 12px",
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRadius: "20px",
                border: roleFilter === "ADMIN" ? "1px solid #EF4444" : "1px solid var(--border-color)",
                backgroundColor: roleFilter === "ADMIN" ? "#EF4444" : "transparent",
                color: roleFilter === "ADMIN" ? "#fff" : "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              👑 Admins ({users.filter(u => ["ADMIN", "SUPER_ADMIN"].includes(u.role)).length})
            </button>
          )}
        </div>

        {/* Dropdowns Row: Zone, Institution & Search */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", alignItems: "center" }}>
          {/* Search Box */}
          <div>
            <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "3px" }}>Search User</label>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search username, college..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem" }}
            />
          </div>

          {/* Zone Dropdown */}
          {!isZoneAdmin && (
            <div>
              <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "3px" }}>Filter by Zone</label>
              <select
                className="form-input"
                value={zoneFilter}
                onChange={(e) => {
                  setZoneFilter(e.target.value);
                  setInstitutionFilter("ALL"); // Reset institution when zone changes
                }}
                style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem" }}
              >
                <option value="ALL">All Zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Institution Dropdown */}
          <div>
            <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "3px" }}>Filter by Institution</label>
            <select
              className="form-input"
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem" }}
            >
              <option value="ALL">All Institutions ({availableInstitutions.length})</option>
              {availableInstitutions.map((inst) => {
                const { name: instName, place: instPlace } = formatInstitutionDisplay(inst);
                return (
                  <option key={inst.id} value={inst.id}>
                    {instName}{instPlace ? ` (${instPlace})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <div style={{ alignSelf: "flex-end", paddingBottom: "2px" }}>
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", padding: "6px 12px", width: "100%" }}
              >
                🔄 Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Table Listing ── */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Assigned To</th>
              <th>Created</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{user.username}</td>
                <td>
                  <span
                    className={`badge ${
                      user.role === "ADMIN" || user.role === "SUPER_ADMIN"
                        ? "badge-error"
                        : user.role === "ZONE_ADMIN"
                        ? "badge-brand"
                        : user.role === "JUDGE"
                        ? "badge-info"
                        : "badge-success"
                    }`}
                    style={user.role === "JUDGE" ? { backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#2563EB", border: "1px solid rgba(59, 130, 246, 0.3)" } : {}}
                  >
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.institution ? (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>{formatInstitutionDisplay(user.institution).name}</span>
                      {formatInstitutionDisplay(user.institution).place && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "3px" }}>
                          <span>📍</span> {formatInstitutionDisplay(user.institution).place}
                        </span>
                      )}
                      {user.zone && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{user.zone.name} Zone</span>}
                    </div>
                  ) : user.zone ? (
                    <span style={{ fontWeight: 600, color: "var(--primary)" }}>{user.zone.name} Zone</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>-</span>
                  )}
                </td>
                <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td style={{ textAlign: "right" }}>
                  <UserActions userId={user.id} username={user.username} />
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                  No users found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
