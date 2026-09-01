"use client";

import { useState } from "react";
import ImageUpload from "@/app/components/ImageUpload";
import { createVolunteer, updateVolunteer } from "./actions";

interface VolunteerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer?: any | null; // If editing
  zones?: Array<{ id: string; name: string; code: string }>;
  isSuperAdmin?: boolean;
  defaultZoneId?: string | null;
}

const COMMON_ROLES = [
  "General Volunteer",
  "Stage Coordinator",
  "Registration & Help Desk",
  "Hospitality & Accommodation",
  "Food & Refreshment",
  "Security & Crowd Control",
  "Media & IT Support",
  "Transportation & Logistics",
  "Jury Assistance",
  "Medical & First Aid",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function VolunteerFormModal({
  isOpen,
  onClose,
  volunteer,
  zones = [],
  isSuperAdmin = false,
  defaultZoneId,
}: VolunteerFormModalProps) {
  const isEditing = !!volunteer;

  const [name, setName] = useState(volunteer?.name || "");
  const [phone, setPhone] = useState(volunteer?.phone || "");
  const [address, setAddress] = useState(volunteer?.address || "");
  const [photo, setPhoto] = useState(volunteer?.photo || "");
  const [roleTitle, setRoleTitle] = useState(volunteer?.roleTitle || "General Volunteer");
  const [customRole, setCustomRole] = useState(
    volunteer?.roleTitle && !COMMON_ROLES.includes(volunteer.roleTitle) ? volunteer.roleTitle : ""
  );
  const [dutyArea, setDutyArea] = useState(volunteer?.dutyArea || "");
  const [bloodGroup, setBloodGroup] = useState(volunteer?.bloodGroup || "");
  const [zoneId, setZoneId] = useState(volunteer?.zoneId || defaultZoneId || zones[0]?.id || "");
  const [volunteerNo, setVolunteerNo] = useState(volunteer?.volunteerNo || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter volunteer full name.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter phone number.");
      return;
    }
    if (!address.trim()) {
      setError("Please enter address.");
      return;
    }

    const finalRole = customRole.trim() || roleTitle;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (isEditing) {
        const res = await updateVolunteer(volunteer.id, {
          name,
          phone,
          address,
          photo,
          roleTitle: finalRole,
          dutyArea,
          bloodGroup,
          zoneId: isSuperAdmin ? zoneId : undefined,
          volunteerNo: volunteerNo.trim() || undefined,
        });

        if (res.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 600);
        } else {
          setError(res.error || "Failed to update volunteer");
        }
      } else {
        const res = await createVolunteer({
          name,
          phone,
          address,
          photo,
          roleTitle: finalRole,
          dutyArea,
          bloodGroup,
          zoneId: isSuperAdmin ? zoneId : defaultZoneId,
          volunteerNo: volunteerNo.trim() || undefined,
        });

        if (res.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 600);
        } else {
          setError(res.error || "Failed to add volunteer");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          color: "#1e293b",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#8E0033" }}>
              {isEditing ? "✏️ Edit Volunteer" : "🤝 Add New Volunteer"}
            </h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              {isEditing ? "Update volunteer details & photo" : "Register a new volunteer with photo & contact details"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.4rem",
              cursor: "pointer",
              color: "#94a3b8",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#fee2e2",
              border: "1px solid #f87171",
              borderRadius: "8px",
              color: "#b91c1c",
              fontSize: "0.85rem",
              marginBottom: "16px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#dcfce7",
              border: "1px solid #86efac",
              borderRadius: "8px",
              color: "#15803d",
              fontSize: "0.85rem",
              marginBottom: "16px",
            }}
          >
            ✅ {isEditing ? "Volunteer updated successfully!" : "Volunteer added successfully!"}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Photo Uploader */}
          <div>
            <ImageUpload
              label="Volunteer Photograph (Mandatory / Recommended)"
              folder="volunteers"
              initialUrl={photo}
              onUploadComplete={(url) => setPhoto(url)}
            />
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fathima Zahra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {/* Phone & Blood Group in 2 cols */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "10px 8px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
              Address / Residence Details *
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Baitul Noor, Calicut Road, Manjeri, Malappuram"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-input"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
                resize: "vertical",
              }}
            />
          </div>

          {/* Role & Duty Area */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                Duty / Role
              </label>
              <select
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              >
                {COMMON_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value="Other">Other / Custom</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                Assigned Stage / Area
              </label>
              <input
                type="text"
                placeholder="e.g. Main Stage / Dining Hall"
                value={dutyArea}
                onChange={(e) => setDutyArea(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>

          {roleTitle === "Other" && (
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                Custom Role Title
              </label>
              <input
                type="text"
                placeholder="e.g. Sound Engineer Coordinator"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          )}

          {/* Zone Selector for Super Admin */}
          {isSuperAdmin && zones.length > 0 && (
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                Assigned Zone
              </label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">State Fest / General</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional Badge Code */}
          {isEditing && (
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                Badge Code (Volunteer No.)
              </label>
              <input
                type="text"
                placeholder="e.g. VOL-001"
                value={volunteerNo}
                onChange={(e) => setVolunteerNo(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "12px",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "16px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                backgroundColor: "#e2e8f0",
                color: "#475569",
                borderRadius: "8px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 24px",
                backgroundColor: "#8E0033",
                color: "#ffffff",
                borderRadius: "8px",
                fontWeight: 700,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(142,0,51,0.3)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Saving..." : isEditing ? "Update Volunteer" : "Add Volunteer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
