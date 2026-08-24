"use client";

import React from "react";

export type CandidateIdCardProps = {
  candidate: {
    id: string;
    name: string;
    chestNumber?: string | null;
    photo?: string | null;
    photoUrl?: string | null;
    category?: { name: string };
    team?: { name: string; flagColor?: string | null; prefixCode?: string; event?: { name: string } };
    institution?: { name: string } | null;
    programs?: Array<{
      id: string;
      scheduledTime?: string | Date | null;
      program: {
        id?: string;
        name: string;
        programCode?: string | null;
        venue?: string | null;
        startTime?: string | Date | null;
      };
    }>;
  };
  settings?: {
    festName?: string;
    festMoto?: string;
  };
  eventName?: string;
};

function ProgramItem({
  program,
  isCenter = false,
}: {
  program: any;
  isCenter?: boolean;
}) {
  const displayTime = program.scheduledTime || program.program?.startTime;
  const formattedTime = displayTime
    ? `${new Date(displayTime).toLocaleDateString([], {
        day: "2-digit",
        month: "short",
      })} ${new Date(displayTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  const subText = formattedTime
    ? `${formattedTime}${program.program?.venue ? ` • ${program.program.venue}` : ""}`
    : "As per Syllabus and Mark list";

  return (
    <div
      style={{
        textAlign: "center",
        width: "100%",
        padding: isCenter ? "2px 4px" : "1px 2px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: isCenter ? "0.66rem" : "0.58rem",
          fontWeight: 800,
          color: "#111827",
          textTransform: "uppercase",
          lineHeight: 1.15,
          wordBreak: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "normal",
        }}
      >
        {program.program?.name}
      </div>
      <div
        style={{
          fontSize: isCenter ? "0.48rem" : "0.44rem",
          color: "#e11d48",
          fontWeight: 600,
          lineHeight: 1.15,
          marginTop: "1px",
          wordBreak: "break-word",
        }}
      >
        {subText}
      </div>
    </div>
  );
}

export default function CandidateIdCard({ candidate }: CandidateIdCardProps) {
  const photoSrc = candidate.photo || candidate.photoUrl;
  const teamName = candidate.institution?.name || candidate.team?.name || "INSTITUTION";
  const categoryName = candidate.category?.name || "FADHILA";
  const chestNo = candidate.chestNumber ? candidate.chestNumber : "---";
  const allPrograms = candidate.programs || [];
  const list = allPrograms.slice(0, 5);
  const count = list.length;

  return (
    <div
      className="candidate-id-card"
      style={{
        width: "350px",
        height: "550px",
        position: "relative",
        borderRadius: "18px",
        overflow: "hidden",
        backgroundImage: "url('/HIya ID blank.png')",
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
      {/* Curved SVG Text "CANDIDATE CARD" centered precisely inside the purple arc */}
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
          <path id="candArcPath" d="M 200 306 A 147 147 0 0 1 461 306" fill="none" />
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
          <textPath href="#candArcPath" startOffset="50%" textAnchor="middle">
            CANDIDATE CARD
          </textPath>
        </text>
      </svg>

      {/* Circular Candidate Photo Container (Shifted slightly up for clean distance) */}
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
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          backgroundColor: photoSrc ? "#f43f5e" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {photoSrc && (
          <img
            src={photoSrc}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </div>

      {/* Candidate Identification Section (Separated with clean distance from Photo) */}
      <div
        style={{
          position: "absolute",
          top: "49.0%",
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
        {/* Pink Rounded Badge for Chest Number */}
        <div
          style={{
            backgroundColor: "#f43f5e",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "2px 14px",
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "1px",
            textTransform: "uppercase",
            lineHeight: 1.2,
            boxShadow: "0 2px 5px rgba(244,63,94,0.25)",
            display: "inline-block",
          }}
        >
          CHES NO. {chestNo}
        </div>

        {/* Candidate Name in Bold Indigo/Purple */}
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
          title={candidate.name}
        >
          {candidate.name}
        </div>

        {/* Institution / Team Name in Bold Black/Charcoal */}
        <div
          style={{
            fontSize: "0.68rem",
            fontWeight: 800,
            color: "#1f2937",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            lineHeight: 1.2,
            marginTop: "2px",
            maxWidth: "92%",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
          title={teamName}
        >
          {teamName}
        </div>
      </div>

      {/* Category & Event Section (Divided with Center Vertical Line, Left & Right aligned) */}
      <div
        style={{
          position: "absolute",
          top: "64.2%",
          left: "12%",
          right: "12%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          zIndex: 4,
        }}
      >
        {/* Category (Left-aligned on left side) */}
        <div
          style={{
            textAlign: "left",
            borderRight: "1px solid rgba(0, 0, 0, 0.12)",
            paddingRight: "10px",
          }}
        >
          <div
            style={{
              fontSize: "0.55rem",
              fontWeight: 800,
              color: "#4f46e5",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              lineHeight: 1.1,
            }}
          >
            CATEGORY
          </div>
          <div
            style={{
              fontSize: "0.80rem",
              fontWeight: 900,
              color: "#000000",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              lineHeight: 1.15,
              marginTop: "2px",
              whiteSpace: "nowrap",
            }}
            title={categoryName}
          >
            {categoryName}
          </div>
        </div>

        {/* Event (Right-aligned on right side) */}
        <div
          style={{
            textAlign: "right",
            paddingLeft: "10px",
          }}
        >
          <div
            style={{
              fontSize: "0.55rem",
              fontWeight: 800,
              color: "#4f46e5",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              lineHeight: 1.1,
            }}
          >
            EVENT
          </div>
          <div
            style={{
              fontSize: "0.80rem",
              fontWeight: 900,
              color: "#000000",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              lineHeight: 1.15,
              marginTop: "2px",
              whiteSpace: "nowrap",
            }}
          >
            PROGRAM ZONE
          </div>
        </div>
      </div>

      {/* Assigned Programs Section (Clean Inside Light Pink Area, Max 5 Programs) */}
      <div
        style={{
          position: "absolute",
          top: "74.2%",
          bottom: "7%",
          left: "14%",
          right: "14%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 4,
          overflow: "hidden",
        }}
      >
        {count === 0 && (
          <div
            style={{
              fontSize: "0.68rem",
              color: "#9ca3af",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            No programs assigned
          </div>
        )}

        {/* 1 Program: Centered Layout */}
        {count === 1 && <ProgramItem program={list[0]} isCenter={true} />}

        {/* 2 Programs: Vertically Stacked with Divider */}
        {count === 2 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              width: "100%",
              alignItems: "center",
            }}
          >
            <ProgramItem program={list[0]} isCenter={true} />
            <div
              style={{
                width: "50%",
                height: "1px",
                backgroundColor: "rgba(142, 0, 51, 0.15)",
              }}
            />
            <ProgramItem program={list[1]} isCenter={true} />
          </div>
        )}

        {/* 3 Programs: Top 2 with Vertical Line + Bottom 1 Centered */}
        {count === 3 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                alignItems: "start",
              }}
            >
              <div
                style={{
                  borderRight: "1px solid rgba(142, 0, 51, 0.18)",
                  paddingRight: "4px",
                }}
              >
                <ProgramItem program={list[0]} />
              </div>
              <div style={{ paddingLeft: "4px" }}>
                <ProgramItem program={list[1]} />
              </div>
            </div>
            <div
              style={{
                width: "100%",
                textAlign: "center",
                borderTop: "1px solid rgba(142, 0, 51, 0.12)",
                paddingTop: "3px",
              }}
            >
              <ProgramItem program={list[2]} isCenter={true} />
            </div>
          </div>
        )}

        {/* 4 Programs: 2x2 Grid with Center Divider Line */}
        {count === 4 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              rowGap: "5px",
              width: "100%",
              alignItems: "start",
            }}
          >
            <div
              style={{
                borderRight: "1px solid rgba(142, 0, 51, 0.18)",
                paddingRight: "4px",
              }}
            >
              <ProgramItem program={list[0]} />
            </div>
            <div style={{ paddingLeft: "4px" }}>
              <ProgramItem program={list[1]} />
            </div>
            <div
              style={{
                borderRight: "1px solid rgba(142, 0, 51, 0.18)",
                paddingRight: "4px",
              }}
            >
              <ProgramItem program={list[2]} />
            </div>
            <div style={{ paddingLeft: "4px" }}>
              <ProgramItem program={list[3]} />
            </div>
          </div>
        )}

        {/* 5 Programs: Top 4 (2x2 Grid with Divider) + Bottom 1 Centered */}
        {count === 5 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                rowGap: "3px",
                alignItems: "start",
              }}
            >
              <div
                style={{
                  borderRight: "1px solid rgba(142, 0, 51, 0.18)",
                  paddingRight: "4px",
                }}
              >
                <ProgramItem program={list[0]} />
              </div>
              <div style={{ paddingLeft: "4px" }}>
                <ProgramItem program={list[1]} />
              </div>
              <div
                style={{
                  borderRight: "1px solid rgba(142, 0, 51, 0.18)",
                  paddingRight: "4px",
                }}
              >
                <ProgramItem program={list[2]} />
              </div>
              <div style={{ paddingLeft: "4px" }}>
                <ProgramItem program={list[3]} />
              </div>
            </div>
            <div
              style={{
                width: "100%",
                textAlign: "center",
                borderTop: "1px solid rgba(142, 0, 51, 0.12)",
                paddingTop: "2px",
              }}
            >
              <ProgramItem program={list[4]} isCenter={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
