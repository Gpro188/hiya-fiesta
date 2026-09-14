"use client";

import { useState } from "react";
import {
  createOrUpdateVenueLogin,
  toggleVenueLoginStatus,
  toggleAllVenueLogins,
  deleteVenueLogin,
} from "./actions";

interface VenueUser {
  id: string;
  username: string;
  place: string | null;
  phone: string | null; // "ACTIVE" | "INACTIVE"
  createdAt: any;
}

interface VenueLoginsTabProps {
  eventId: string;
  zoneCode: string;
  zoneName: string;
  venues: string[];
  venueUsers: VenueUser[];
  programCountsByVenue: Record<string, number>;
}

export default function VenueLoginsTab({
  eventId,
  zoneCode,
  zoneName,
  venues,
  venueUsers,
  programCountsByVenue,
}: VenueLoginsTabProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [customFormVenue, setCustomFormVenue] = useState<string | null>(null);
  const [customUsername, setCustomUsername] = useState("");
  const [customPassword, setCustomPassword] = useState("123456");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Map venue users by normalized venue name
  const userMapByVenue = new Map<string, VenueUser>();
  venueUsers.forEach((u) => {
    if (u.place) {
      userMapByVenue.set(u.place.trim().toLowerCase(), u);
    }
  });

  const activeCount = venueUsers.filter((u) => u.phone !== "INACTIVE").length;
  const inactiveCount = venueUsers.filter((u) => u.phone === "INACTIVE").length;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleQuickCreate = async (venue: string) => {
    setLoadingId(venue);
    const sanitizedVenue = venue.toLowerCase().replace(/[^a-z0-9]/g, "");
    const defaultUsername = `${(zoneCode || "zone").toLowerCase()}_${sanitizedVenue}`;
    await createOrUpdateVenueLogin({
      eventId,
      venue,
      username: defaultUsername,
      password: "123456",
    });
    setLoadingId(null);
  };

  const handleCustomSubmit = async (e: React.FormEvent, venue: string) => {
    e.preventDefault();
    setLoadingId(venue);
    await createOrUpdateVenueLogin({
      eventId,
      venue,
      username: customUsername,
      password: customPassword,
    });
    setCustomFormVenue(null);
    setCustomUsername("");
    setCustomPassword("123456");
    setLoadingId(null);
  };

  const handleToggle = async (userId: string, currentStatus: string | null) => {
    setLoadingId(userId);
    const willBeActive = currentStatus === "INACTIVE";
    await toggleVenueLoginStatus(userId, willBeActive);
    setLoadingId(null);
  };

  const handleToggleAll = async (activate: boolean) => {
    if (
      !confirm(
        activate
          ? "Are you sure you want to ACTIVATE all venue logins?"
          : "Are you sure you want to DEACTIVATE all venue logins? Stage juries will no longer be able to log in."
      )
    ) {
      return;
    }
    setGlobalLoading(true);
    await toggleAllVenueLogins(eventId, activate);
    setGlobalLoading(false);
  };

  const handleDelete = async (userId: string, venue: string) => {
    if (!confirm(`Delete login credentials for ${venue}?`)) return;
    setLoadingId(userId);
    await deleteVenueLogin(userId);
    setLoadingId(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Overview & Quick Control Bar */}
      <div
        className="glass-panel"
        style={{
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          border: "1.5px solid #e2e8f0",
          backgroundColor: "#ffffff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 6px 0", color: "#111827", fontSize: "1.2rem", fontWeight: 800 }}>
            🏛️ Venue / Stage Jury Logins
          </h3>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "#64748b" }}>
            Assign dedicated logins for each Stage/Venue in <strong>{zoneName}</strong>. Juries use these to enter marks for their assigned venue during fest hours.
          </p>
          <div style={{ display: "flex", gap: "14px", marginTop: "8px", fontSize: "0.82rem" }}>
            <span style={{ color: "#374151" }}>
              Total Stages: <strong>{venues.length}</strong>
            </span>
            <span>•</span>
            <span style={{ color: "#059669", fontWeight: 700 }}>
              🟢 Active: {activeCount}
            </span>
            <span>•</span>
            <span style={{ color: "#dc2626", fontWeight: 700 }}>
              🔴 Deactivated: {inactiveCount}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => handleToggleAll(true)}
            disabled={globalLoading}
            className="btn"
            style={{
              backgroundColor: "#10b981",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.84rem",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
          >
            🟢 Activate All Venues
          </button>
          <button
            onClick={() => handleToggleAll(false)}
            disabled={globalLoading}
            className="btn"
            style={{
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.84rem",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
          >
            🔴 Deactivate All Venues (Close Logins)
          </button>
        </div>
      </div>

      {copiedText && (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            padding: "10px 16px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          ✓ Copied {copiedText} to clipboard!
        </div>
      )}

      {/* Venues Grid */}
      {venues.length === 0 ? (
        <div
          className="glass-panel"
          style={{ padding: "40px", textAlign: "center", color: "#64748b" }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📍</div>
          <h4 style={{ margin: "0 0 6px 0", color: "#111827" }}>
            No Venues Found in Schedule
          </h4>
          <p style={{ margin: 0, fontSize: "0.88rem" }}>
            Assign venues (e.g. Stage 1, Stage 2) to your programs in Global Festival Schedule first.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "18px",
          }}
        >
          {venues.map((venueName) => {
            const user = userMapByVenue.get(venueName.trim().toLowerCase());
            const progCount = programCountsByVenue[venueName] || 0;
            const isActive = user ? user.phone !== "INACTIVE" : false;
            const isLoading = loadingId === (user?.id || venueName);

            return (
              <div
                key={venueName}
                className="glass-panel"
                style={{
                  padding: "20px",
                  borderRadius: "14px",
                  border: user
                    ? isActive
                      ? "1.5px solid #10b981"
                      : "1.5px solid #ef4444"
                    : "1.5px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Status Indicator Bar */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "4px",
                    backgroundColor: user
                      ? isActive
                        ? "#10b981"
                        : "#ef4444"
                      : "#cbd5e1",
                  }}
                />

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "1.15rem",
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        {venueName}
                      </h4>
                      <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                        <strong>{progCount}</strong> Scheduled Programs
                      </div>
                    </div>

                    {user ? (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          backgroundColor: isActive ? "#dcfce7" : "#fee2e2",
                          color: isActive ? "#15803d" : "#b91c1c",
                          border: `1px solid ${isActive ? "#bbf7d0" : "#fecaca"}`,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {isActive ? "🟢 ACTIVE" : "🔴 CLOSED"}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                        }}
                      >
                        NO LOGIN
                      </span>
                    )}
                  </div>

                  {user ? (
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        borderRadius: "10px",
                        padding: "12px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "#64748b", fontWeight: 600 }}>Username:</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <code
                            style={{
                              backgroundColor: "#ffffff",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              border: "1px solid #cbd5e1",
                              fontWeight: 800,
                              color: "#8E0033",
                            }}
                          >
                            {user.username}
                          </code>
                          <button
                            onClick={() => handleCopy(user.username, `Username for ${venueName}`)}
                            title="Copy username"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                            }}
                          >
                            📋
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "#64748b", fontWeight: 600 }}>Password:</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <code
                            style={{
                              backgroundColor: "#ffffff",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              border: "1px solid #cbd5e1",
                              fontWeight: 700,
                              color: "#374151",
                            }}
                          >
                            123456
                          </code>
                          <button
                            onClick={() => handleCopy("123456", `Password for ${venueName}`)}
                            title="Copy password"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                            }}
                          >
                            📋
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: isActive ? "#059669" : "#dc2626",
                          marginTop: "2px",
                        }}
                      >
                        {isActive
                          ? "✓ Ready for stage juries to log in and score"
                          : "⚠️ Login is currently blocked by Zonal Admin"}
                      </div>
                    </div>
                  ) : customFormVenue === venueName ? (
                    <form
                      onSubmit={(e) => handleCustomSubmit(e, venueName)}
                      style={{
                        backgroundColor: "#f8fafc",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>
                          Username:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={customUsername}
                          onChange={(e) => setCustomUsername(e.target.value)}
                          placeholder="e.g. tcr_stage1"
                          required
                          style={{ padding: "6px 8px", fontSize: "0.85rem", width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>
                          Password:
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="Default 123456"
                          required
                          style={{ padding: "6px 8px", fontSize: "0.85rem", width: "100%" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="btn btn-primary"
                          style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1 }}
                        >
                          {isLoading ? "Creating..." : "Save Login"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomFormVenue(null)}
                          className="btn btn-secondary"
                          style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p style={{ margin: "10px 0", fontSize: "0.82rem", color: "#64748b" }}>
                      No operator or jury login generated for this venue yet.
                    </p>
                  )}
                </div>

                {/* Actions Footer */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  {user ? (
                    <>
                      <button
                        onClick={() => handleToggle(user.id, user.phone)}
                        disabled={isLoading}
                        className="btn"
                        style={{
                          flex: 1,
                          padding: "7px 12px",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          backgroundColor: isActive ? "#fee2e2" : "#dcfce7",
                          color: isActive ? "#b91c1c" : "#15803d",
                          border: `1px solid ${isActive ? "#fca5a5" : "#86efac"}`,
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        {isLoading ? "..." : isActive ? "🔴 Deactivate" : "🟢 Activate"}
                      </button>

                      <button
                        onClick={() => handleDelete(user.id, venueName)}
                        disabled={isLoading}
                        title="Delete Login"
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "7px 10px",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: "0.85rem",
                        }}
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleQuickCreate(venueName)}
                        disabled={isLoading}
                        className="btn btn-primary"
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          fontSize: "0.82rem",
                          fontWeight: 800,
                        }}
                      >
                        {isLoading ? "Generating..." : `⚡ Quick Create Login`}
                      </button>
                      <button
                        onClick={() => {
                          const sanitized = venueName.toLowerCase().replace(/[^a-z0-9]/g, "");
                          setCustomUsername(`${(zoneCode || "zone").toLowerCase()}_${sanitized}`);
                          setCustomFormVenue(venueName);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                        title="Custom Username/Password"
                      >
                        ✏️ Custom
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
