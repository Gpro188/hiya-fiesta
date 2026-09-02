"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/app/components/ImageUpload";
import { updateMyInstitutionProfile } from "@/app/dashboard/institution-profile/actions";

export interface InstitutionOnboardingModalProps {
  institutionName?: string;
  institutionCode?: string;
  initialLogoUrl?: string | null;
  isDefaultPassword?: boolean;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export default function InstitutionOnboardingModal({
  institutionName = "Your Institution",
  institutionCode = "",
  initialLogoUrl,
  isDefaultPassword,
  isOpenExternal,
  onCloseExternal,
}: InstitutionOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setIsOpen(isOpenExternal);
      return;
    }

    // Auto open on login if not dismissed for this session and (logo missing or default password is true)
    const storageKey = institutionCode ? `cswc_inst_profile_dismissed_${institutionCode}` : "cswc_inst_profile_dismissed";
    const sessionDismissed = sessionStorage.getItem(storageKey);
    const permanentDismissed = localStorage.getItem(storageKey);

    if (!sessionDismissed && !permanentDismissed && (!initialLogoUrl || isDefaultPassword)) {
      setIsOpen(true);
    }
  }, [isOpenExternal, institutionCode, initialLogoUrl, isDefaultPassword]);

  const handleClose = () => {
    // Only dismiss for current browser session when skipped
    const storageKey = institutionCode ? `cswc_inst_profile_dismissed_${institutionCode}` : "cswc_inst_profile_dismissed";
    sessionStorage.setItem(storageKey, "true");
    setIsOpen(false);
    if (onCloseExternal) onCloseExternal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match. Please re-enter." });
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setStatus({ type: "error", message: "Password must be at least 4 characters long." });
      return;
    }

    setLoading(true);
    const res = await updateMyInstitutionProfile({
      logoUrl: logoUrl || "",
      newPassword: newPassword || undefined,
    });

    if (res.success) {
      setStatus({ type: "success", message: res.message || "Saved successfully!" });
      const storageKey = institutionCode ? `cswc_inst_profile_dismissed_${institutionCode}` : "cswc_inst_profile_dismissed";
      localStorage.setItem(storageKey, "true");
      sessionStorage.removeItem(storageKey);
      setTimeout(() => {
        setIsOpen(false);
        if (onCloseExternal) onCloseExternal();
        window.location.reload();
      }, 1000);
    } else {
      setStatus({ type: "error", message: res.error || "Failed to update profile." });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(10px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "30px 26px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(142, 0, 51, 0.2)",
          color: "#0f172a",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Top Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(142, 0, 51, 0.08)",
              border: "1px solid rgba(142, 0, 51, 0.2)",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "#8E0033",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "10px",
            }}
          >
            <span>🏛️ INSTITUTION PROFILE SETUP</span>
          </div>

          <h2 style={{ margin: "0 0 6px 0", fontSize: "1.35rem", fontWeight: 800, color: "#1e1b4b" }}>
            {institutionName}
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            Upload your institution&apos;s crest / logo and set your secure login password.
          </p>
        </div>

        {status && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              marginBottom: "16px",
              fontSize: "0.85rem",
              fontWeight: 600,
              backgroundColor: status.type === "error" ? "#fee2e2" : "#dcfce7",
              color: status.type === "error" ? "#dc2626" : "#16a34a",
              border: `1px solid ${status.type === "error" ? "#fca5a5" : "#86efac"}`,
            }}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Institution Logo Upload */}
          <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
              🖼️ Official Institution Logo
            </label>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.76rem", color: "#64748b" }}>
              This logo will be displayed on the public live scoreboard, top 3 podiums, and TV broadcast screens.
            </p>

            <ImageUpload
              label="Upload Institution Logo (PNG / JPG)"
              folder="institution-logos"
              initialUrl={logoUrl}
              onUploadComplete={(url: string) => setLogoUrl(url)}
            />
          </div>

          {/* Password Update Section */}
          <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
              🔑 Change Login Password
            </label>
            <p style={{ margin: "0 0 12px 0", fontSize: "0.76rem", color: "#64748b" }}>
              Default password is <strong>123456</strong>. Enter a new password below or leave blank to keep current password.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "9px 12px", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "9px 12px", fontSize: "0.88rem" }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: "11px 18px",
                backgroundColor: "#8E0033",
                color: "#ffffff",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "0.92rem",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(142,0,51,0.35)",
              }}
            >
              {loading ? "Saving..." : "💾 Save & Continue"}
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn btn-ghost"
              style={{
                padding: "11px 18px",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "0.88rem",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
              }}
            >
              Skip / Later
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
