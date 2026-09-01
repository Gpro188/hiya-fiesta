"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import VolunteerFormModal from "./VolunteerFormModal";
import { deleteVolunteer, generateVolunteerNumbers } from "./actions";

interface VolunteerListProps {
  volunteers: any[];
  zones: Array<{ id: string; name: string; code: string }>;
  isSuperAdmin: boolean;
  userZoneId?: string | null;
  zoneName?: string;
}

export default function VolunteerList({
  volunteers,
  zones,
  isSuperAdmin,
  userZoneId,
  zoneName,
}: VolunteerListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState(userZoneId || "ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [editingVolunteer, setEditingVolunteer] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingNumbers, setGeneratingNumbers] = useState(false);

  // Checkbox selection for bulk printing
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    volunteers.forEach((v) => {
      if (v.roleTitle) roles.add(v.roleTitle);
    });
    return Array.from(roles);
  }, [volunteers]);

  // Filtered list
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((v) => {
      const matchSearch =
        !searchTerm.trim() ||
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.volunteerNo && v.volunteerNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.roleTitle && v.roleTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.dutyArea && v.dutyArea.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchZone =
        selectedZone === "ALL" ||
        (selectedZone === "STATE" && !v.zoneId) ||
        v.zoneId === selectedZone;

      const matchRole = selectedRole === "ALL" || v.roleTitle === selectedRole;

      return matchSearch && matchZone && matchRole;
    });
  }, [volunteers, searchTerm, selectedZone, selectedRole]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredVolunteers.map((v) => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove volunteer "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteVolunteer(id);
      if (!res.success) {
        alert(res.error || "Failed to delete volunteer");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete volunteer");
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateNumbers = async () => {
    if (!confirm("This will regenerate sequential badge numbers for all volunteers. Continue?")) return;
    setGeneratingNumbers(true);
    try {
      const res = await generateVolunteerNumbers(userZoneId || undefined);
      if (res.success) {
        alert(`Successfully regenerated badge numbers for ${res.count} volunteers.`);
      } else {
        alert(res.error || "Failed to generate badge numbers");
      }
    } catch (err: any) {
      alert(err.message || "Failed to generate numbers");
    } finally {
      setGeneratingNumbers(false);
    }
  };

  // Bulk print URL
  const bulkPrintUrl = useMemo(() => {
    if (selectedIds.length > 0) {
      return `/print/volunteer-id-cards?ids=${selectedIds.join(",")}`;
    }
    if (selectedZone && selectedZone !== "ALL") {
      return `/print/volunteer-id-cards?zoneId=${selectedZone}`;
    }
    return `/print/volunteer-id-cards`;
  }, [selectedIds, selectedZone]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Action & Filter Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: "16px 20px",
          borderRadius: "14px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        {/* Search & Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", flex: 1, minWidth: "300px" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <input
              type="text"
              placeholder="🔍 Search volunteer by name, phone, address, badge..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: "0.9rem",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Zone Filter (For Super Admin) */}
          {isSuperAdmin && zones.length > 0 && (
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="form-input"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                minWidth: "160px",
              }}
            >
              <option value="ALL">🏛️ All Zones & State</option>
              <option value="STATE">⭐ State Fest Only</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  📍 {z.name} ({z.code})
                </option>
              ))}
            </select>
          )}

          {/* Role Filter */}
          {uniqueRoles.length > 0 && (
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-input"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                minWidth: "140px",
              }}
            >
              <option value="ALL">⭐ All Duties / Roles</option>
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Re-generate Numbers */}
          <button
            onClick={handleGenerateNumbers}
            disabled={generatingNumbers}
            title="Auto-assign badge codes to all volunteers"
            style={{
              padding: "8px 14px",
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: generatingNumbers ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🏷️</span>
            <span>{generatingNumbers ? "Generating..." : "Assign Badge IDs"}</span>
          </button>

          {/* Bulk Print Cards */}
          <Link
            href={bulkPrintUrl}
            target="_blank"
            style={{
              padding: "8px 16px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
            }}
          >
            <span>🖨️</span>
            <span>
              {selectedIds.length > 0
                ? `Print Selected (${selectedIds.length})`
                : `Bulk Print Cards (${filteredVolunteers.length})`}
            </span>
          </Link>

          {/* Add Volunteer Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: "8px 18px",
              backgroundColor: "#8E0033",
              color: "#ffffff",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 10px rgba(142,0,51,0.3)",
            }}
          >
            <span>➕</span>
            <span>Add Volunteer</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        <div
          className="glass-panel"
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "1.8rem" }}>👥</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Total Volunteers</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#8E0033" }}>{volunteers.length}</div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "1.8rem" }}>📸</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Photos Uploaded</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#10b981" }}>
              {volunteers.filter((v) => v.photo).length} / {volunteers.length}
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "1.8rem" }}>🛡️</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Selected / Filtered</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#4f46e5" }}>
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : `${filteredVolunteers.length} Showing`}
            </div>
          </div>
        </div>
      </div>

      {/* Volunteers Table / Cards View */}
      {filteredVolunteers.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "48px 20px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            color: "#64748b",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🤝</div>
          <h3 style={{ margin: "0 0 6px 0", color: "#1e293b" }}>No Volunteers Found</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem" }}>
            {volunteers.length === 0
              ? "Start by adding your festival volunteers with photo, name, phone, address, and duty role."
              : "No volunteers match your current search or filter criteria."}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#8E0033",
              color: "#ffffff",
              borderRadius: "8px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            ➕ Add First Volunteer
          </button>
        </div>
      ) : (
        <div
          className="glass-panel"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                    color: "#475569",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    fontSize: "0.72rem",
                    letterSpacing: "0.5px",
                  }}
                >
                  <th style={{ padding: "12px 14px", width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredVolunteers.length > 0 && selectedIds.length === filteredVolunteers.length
                      }
                      onChange={handleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: "12px 14px" }}>Volunteer</th>
                  <th style={{ padding: "12px 14px" }}>Badge ID</th>
                  <th style={{ padding: "12px 14px" }}>Contact (Phone)</th>
                  <th style={{ padding: "12px 14px" }}>Address / Place</th>
                  <th style={{ padding: "12px 14px" }}>Duty / Role</th>
                  {isSuperAdmin && <th style={{ padding: "12px 14px" }}>Zone</th>}
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVolunteers.map((vol, idx) => {
                  const isSelected = selectedIds.includes(vol.id);
                  return (
                    <tr
                      key={vol.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: isSelected ? "rgba(244, 63, 94, 0.05)" : idx % 2 === 0 ? "#ffffff" : "#fafafa",
                        transition: "background-color 0.15s",
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: "12px 14px" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(vol.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>

                      {/* Photo & Name */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {/* Photo Avatar */}
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              backgroundColor: "#f43f5e",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid #ffffff",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                            }}
                          >
                            {vol.photo ? (
                              <img
                                src={vol.photo}
                                alt={vol.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "1.1rem" }}>
                                {vol.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "#1e293b", fontSize: "0.92rem" }}>
                              {vol.name}
                            </div>
                            {vol.bloodGroup && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  color: "#e11d48",
                                  backgroundColor: "rgba(225, 29, 72, 0.08)",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  display: "inline-block",
                                  marginTop: "2px",
                                }}
                              >
                                🩸 {vol.bloodGroup}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Badge ID */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            backgroundColor: "#8E0033",
                            color: "#ffffff",
                            borderRadius: "6px",
                            fontWeight: 800,
                            fontSize: "0.74rem",
                            letterSpacing: "0.4px",
                          }}
                        >
                          {vol.volunteerNo || `VOL-${vol.id.slice(0, 4).toUpperCase()}`}
                        </span>
                      </td>

                      {/* Phone Number */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "#1e293b", fontWeight: 700 }}>{vol.phone}</span>
                          <a
                            href={`https://wa.me/${vol.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Chat on WhatsApp"
                            style={{
                              textDecoration: "none",
                              fontSize: "0.95rem",
                              lineHeight: 1,
                            }}
                          >
                            💬
                          </a>
                        </div>
                      </td>

                      {/* Address */}
                      <td style={{ padding: "12px 14px", maxWidth: "220px" }}>
                        <div
                          style={{
                            color: "#475569",
                            fontSize: "0.82rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={vol.address}
                        >
                          📍 {vol.address}
                        </div>
                      </td>

                      {/* Role / Duty */}
                      <td style={{ padding: "12px 14px" }}>
                        <div
                          style={{
                            backgroundColor: "rgba(244, 63, 94, 0.1)",
                            color: "#e11d48",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "0.74rem",
                            fontWeight: 800,
                            display: "inline-block",
                          }}
                        >
                          ⭐ {vol.roleTitle || "VOLUNTEER"}
                        </div>
                        {vol.dutyArea && (
                          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                            {vol.dutyArea}
                          </div>
                        )}
                      </td>

                      {/* Zone (if Super Admin) */}
                      {isSuperAdmin && (
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontSize: "0.8rem", color: "#4f46e5", fontWeight: 700 }}>
                            {vol.zone ? vol.zone.name : "State Fest"}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {/* Print ID Card Button */}
                          <Link
                            href={`/print/volunteer-id-card/${vol.id}`}
                            target="_blank"
                            title="Print Volunteer ID Card"
                            style={{
                              padding: "6px 10px",
                              backgroundColor: "#8E0033",
                              color: "#ffffff",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>🪪</span>
                            <span>Print ID</span>
                          </Link>

                          {/* Edit Button */}
                          <button
                            onClick={() => setEditingVolunteer(vol)}
                            title="Edit Volunteer"
                            style={{
                              padding: "6px 10px",
                              backgroundColor: "#f1f5f9",
                              color: "#334155",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              border: "1px solid #cbd5e1",
                              cursor: "pointer",
                            }}
                          >
                            ✏️
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(vol.id, vol.name)}
                            disabled={deletingId === vol.id}
                            title="Delete Volunteer"
                            style={{
                              padding: "6px 10px",
                              backgroundColor: "#fee2e2",
                              color: "#b91c1c",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              border: "1px solid #fca5a5",
                              cursor: deletingId === vol.id ? "not-allowed" : "pointer",
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <VolunteerFormModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          zones={zones}
          isSuperAdmin={isSuperAdmin}
          defaultZoneId={userZoneId}
        />
      )}

      {/* Edit Modal */}
      {editingVolunteer && (
        <VolunteerFormModal
          isOpen={!!editingVolunteer}
          onClose={() => setEditingVolunteer(null)}
          volunteer={editingVolunteer}
          zones={zones}
          isSuperAdmin={isSuperAdmin}
          defaultZoneId={userZoneId}
        />
      )}
    </div>
  );
}
