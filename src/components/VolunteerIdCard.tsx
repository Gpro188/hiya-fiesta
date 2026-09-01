"use client";

import React from "react";

export type VolunteerIdCardProps = {
  volunteer: {
    id: string;
    volunteerNo?: string | null;
    name: string;
    phone: string;
    address: string;
    photo?: string | null;
    roleTitle?: string | null;
    dutyArea?: string | null;
    bloodGroup?: string | null;
    zone?: { name: string; code?: string } | null;
    event?: { name: string } | null;
  };
  settings?: {
    festName?: string;
    festMoto?: string;
  };
  eventName?: string;
};

export default function VolunteerIdCard({ volunteer, settings, eventName }: VolunteerIdCardProps) {
  const photoSrc = volunteer.photo;
  const volNo = volunteer.volunteerNo || `VOL-${volunteer.id.slice(0, 4).toUpperCase()}`;
  const roleTitle = volunteer.roleTitle || "OFFICIAL VOLUNTEER";
  const dutyArea = volunteer.dutyArea || "";
  const zoneName = volunteer.zone?.name || volunteer.event?.name || "STATE VOLUNTEER CORPS";
  const eventTitle = eventName || volunteer.event?.name || settings?.festName || "HIYA FIESTA 2026";

  return (
    <div
      className="volunteer-id-card"
      style={{
        width: "350px",
        height: "550px",
        position: "relative",
        borderRadius: "18px",
        overflow: "hidden",
        backgroundImage: "url('/hiya-id-blank.png'), url('/HIya%20ID%20blank.png'), url('/HIya ID blank.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
        fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#111827",
        userSelect: "none",
        boxSizing: "border-box",
      }}
    >
      {/* Curved SVG Text "VOLUNTEER CARD" centered inside the purple arc */}
      <svg
        viewBox="0 0 661 1039"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        <defs>
          <path id="volArcPath" d="M 200 306 A 147 147 0 0 1 461 306" fill="none" />
        </defs>
        <text
          fill="#ffffff"
          fontSize="18.5"
          fontWeight="900"
          letterSpacing="2.2"
          dominantBaseline="central"
          alignmentBaseline="central"
          style={{ textTransform: "uppercase" }}
        >
          <textPath href="#volArcPath" startOffset="50%" textAnchor="middle">
            VOLUNTEER CARD
          </textPath>
        </text>
      </svg>

      {/* Circular Volunteer Photo Container */}
      <div
        style={{
          position: "absolute",
          top: "24.6%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "34.5%",
          aspectRatio: "1/1",
          borderRadius: "50%",
          overflow: "hidden",
          border: "3px solid #ffffff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          backgroundColor: photoSrc ? "#8E0033" : "#f43f5e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={volunteer.name}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{ color: "#ffffff", fontSize: "2.8rem", fontWeight: 700 }}>
            {volunteer.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Volunteer Identification Section */}
      <div
        style={{
          position: "absolute",
          top: "48.5%",
          left: "6%",
          right: "6%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 4,
        }}
      >
        {/* Pink / Magenta Rounded Badge for Volunteer Number */}
        <div
          style={{
            backgroundColor: "#8E0033",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "2px 14px",
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "1px",
            textTransform: "uppercase",
            lineHeight: 1.2,
            boxShadow: "0 2px 5px rgba(142,0,51,0.25)",
            display: "inline-block",
          }}
        >
          {volNo}
        </div>

        {/* Volunteer Name in Bold Indigo/Purple */}
        <div
          style={{
            fontSize: "1.05rem",
            fontWeight: 900,
            color: "#312e81",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            lineHeight: 1.15,
            marginTop: "4px",
            maxWidth: "100%",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
          title={volunteer.name}
        >
          {volunteer.name}
        </div>

        {/* Role Title / Duty Area Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "rgba(244, 63, 94, 0.12)",
            color: "#e11d48",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "8px",
            padding: "2px 8px",
            fontSize: "0.62rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginTop: "3px",
            maxWidth: "92%",
          }}
        >
          <span>⭐</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {roleTitle} {dutyArea ? `• ${dutyArea}` : ""}
          </span>
        </div>
      </div>

      {/* Volunteer Contact Details & Zone Section (Distinct from Candidate's Program Syllabus) */}
      <div
        style={{
          position: "absolute",
          top: "64.0%",
          left: "8%",
          right: "8%",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          zIndex: 4,
        }}
      >
        {/* Info Card Container */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(4px)",
            borderRadius: "10px",
            padding: "8px 10px",
            border: "1px solid rgba(244, 63, 94, 0.2)",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {/* Phone Number */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.66rem",
              fontWeight: 700,
              color: "#1f2937",
            }}
          >
            <span style={{ fontSize: "0.75rem" }}>📞</span>
            <span style={{ color: "#312e81", fontWeight: 800 }}>Phone:</span>
            <span style={{ letterSpacing: "0.3px" }}>{volunteer.phone || "---"}</span>
          </div>

          {/* Address */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              fontSize: "0.62rem",
              fontWeight: 600,
              color: "#374151",
              lineHeight: 1.25,
            }}
          >
            <span style={{ fontSize: "0.75rem", marginTop: "-1px" }}>📍</span>
            <div style={{ flex: 1 }}>
              <span style={{ color: "#312e81", fontWeight: 800 }}>Address: </span>
              <span
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
                {volunteer.address || "---"}
              </span>
            </div>
          </div>

          {/* Zone / Event & Blood Group Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px dashed rgba(0, 0, 0, 0.1)",
              paddingTop: "4px",
              marginTop: "2px",
              fontSize: "0.58rem",
              fontWeight: 700,
            }}
          >
            <div style={{ color: "#4f46e5", textTransform: "uppercase" }}>
              🏛️ {zoneName}
            </div>
            {volunteer.bloodGroup && (
              <div
                style={{
                  color: "#e11d48",
                  backgroundColor: "rgba(225, 29, 72, 0.1)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                🩸 {volunteer.bloodGroup}
              </div>
            )}
          </div>
        </div>

        {/* Security & Access Badge Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(49, 46, 129, 0.06)",
            borderRadius: "6px",
            padding: "3px 8px",
            border: "1px solid rgba(49, 46, 129, 0.15)",
          }}
        >
          <div
            style={{
              fontSize: "0.52rem",
              fontWeight: 800,
              color: "#312e81",
              letterSpacing: "0.4px",
              textTransform: "uppercase",
            }}
          >
            OFFICIAL FESTIVAL PASS
          </div>
          <div
            style={{
              fontSize: "0.50rem",
              fontWeight: 700,
              color: "#e11d48",
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            ALL-ACCESS CREW
          </div>
        </div>
      </div>

      {/* Footer Event Title */}
      <div
        style={{
          position: "absolute",
          bottom: "3.2%",
          left: "5%",
          right: "5%",
          textAlign: "center",
          zIndex: 4,
        }}
      >
        <div
          style={{
            fontSize: "0.58rem",
            fontWeight: 800,
            color: "#6b7280",
            letterSpacing: "0.6px",
            textTransform: "uppercase",
          }}
        >
          {eventTitle}
        </div>
      </div>
    </div>
  );
}
