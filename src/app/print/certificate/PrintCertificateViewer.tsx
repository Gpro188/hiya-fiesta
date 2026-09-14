"use client";

import React, { useState } from "react";
import { CertificateLayoutConfig, CertificateWinner } from "@/types/certificate";
import Link from "next/link";

interface PrintCertificateViewerProps {
  winners: CertificateWinner[];
  initialLayout: CertificateLayoutConfig;
  eventId: string;
}

export default function PrintCertificateViewer({
  winners,
  initialLayout,
  eventId
}: PrintCertificateViewerProps) {
  const [layout, setLayout] = useState<CertificateLayoutConfig>(initialLayout);

  const formatPlace = (rank: number, formatType?: string) => {
    if (formatType === 'word') {
      return rank === 1 ? 'First Place' : rank === 2 ? 'Second Place' : 'Third Place';
    }
    if (formatType === 'number') {
      return rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
    }
    return rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place';
  };

  const formatGrade = (grade: string | null | undefined, prefix = 'With ', suffix = ' Grade') => {
    if (!grade || grade.trim() === '' || grade === '-') return '';
    return `${prefix}${grade.trim()}${suffix}`;
  };

  return (
    <div>
      {/* Floating Toolbar (Hidden when printing) */}
      <div className="no-print" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#1e293b",
        color: "#fff",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link 
            href="/dashboard/certificates" 
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem", fontWeight: 700 }}
          >
            ← Certificate Studio
          </Link>
          <span style={{ color: "#475569" }}>|</span>
          <span style={{ fontWeight: 800, fontSize: "1rem" }}>
            🎓 Printing {winners.length} Merit Certificates
          </span>
          <span style={{
            fontSize: "0.75rem",
            padding: "2px 8px",
            borderRadius: "12px",
            backgroundColor: layout.printMode === 'transparent' ? "#1d4ed8" : "#334155",
            color: "#fff",
            fontWeight: 700
          }}>
            {layout.printMode === 'transparent' ? "TRANSPARENT OVERPRINT" : "FULL TEMPLATE"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={layout.printMode === 'transparent'}
              onChange={(e) => setLayout(prev => ({ ...prev, printMode: e.target.checked ? 'transparent' : 'full' }))}
            />
            <span>Transparent (Pre-printed Paper)</span>
          </label>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "8px 18px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            🖨️ Print All ({winners.length})
          </button>
        </div>
      </div>

      {/* When no winners found */}
      {winners.length === 0 && (
        <div className="no-print" style={{ padding: "60px", textAlign: "center" }}>
          <h2>No 1st, 2nd, or 3rd Placed Winners Found</h2>
          <p style={{ color: "#64748b" }}>
            There are no qualified merit winners to print for this selection.
          </p>
          <Link href="/dashboard/certificates" style={{ color: "#2563eb", fontWeight: 700 }}>
            Return to Certificate Studio
          </Link>
        </div>
      )}

      {/* Certificate Pages */}
      <div className="certificate-print-collection">
        {winners.map((candidate, idx) => (
          <div
            key={`${candidate.id}-${idx}`}
            className="certificate-print-sheet"
            style={{
              position: "relative",
              width: layout.orientation === 'portrait' ? "210mm" : "297mm",
              height: layout.orientation === 'portrait' ? "297mm" : "210mm",
              pageBreakAfter: "always",
              breakAfter: "page",
              overflow: "hidden",
              boxSizing: "border-box",
              backgroundColor: "transparent",
              margin: "0 auto",
              transform: (layout.globalOffsetX !== 0 || layout.globalOffsetY !== 0)
                ? `translate(${layout.globalOffsetX}mm, ${layout.globalOffsetY}mm)`
                : undefined
            }}
          >
            {/* Full mode template background if enabled */}
            {layout.printMode === 'full' && layout.templateImageUrl && (
              <img
                src={layout.templateImageUrl}
                alt="Certificate Template"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  pointerEvents: "none"
                }}
              />
            )}

            {/* Candidate / Team Name */}
            {layout.fields.candidateName.enabled && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.candidateName.top}%`,
                  left: `${layout.fields.candidateName.left}%`,
                  transform: layout.fields.candidateName.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.candidateName.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.candidateName.width ? `${layout.fields.candidateName.width}%` : '80%',
                  fontSize: `${layout.fields.candidateName.fontSize}px`,
                  fontWeight: layout.fields.candidateName.fontWeight,
                  fontFamily: layout.fields.candidateName.fontFamily,
                  color: layout.fields.candidateName.color,
                  textAlign: layout.fields.candidateName.textAlign,
                  letterSpacing: layout.fields.candidateName.letterSpacing ? `${layout.fields.candidateName.letterSpacing}px` : undefined,
                  textTransform: layout.fields.candidateName.textTransform || 'none',
                  whiteSpace: "nowrap"
                }}
              >
                {candidate.candidateName}
              </div>
            )}

            {/* Institution Name */}
            {layout.fields.institutionName.enabled && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.institutionName.top}%`,
                  left: `${layout.fields.institutionName.left}%`,
                  transform: layout.fields.institutionName.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.institutionName.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.institutionName.width ? `${layout.fields.institutionName.width}%` : '80%',
                  fontSize: `${layout.fields.institutionName.fontSize}px`,
                  fontWeight: layout.fields.institutionName.fontWeight,
                  fontFamily: layout.fields.institutionName.fontFamily,
                  color: layout.fields.institutionName.color,
                  textAlign: layout.fields.institutionName.textAlign,
                  whiteSpace: "nowrap"
                }}
              >
                {candidate.institutionName}{candidate.institutionPlace ? `, ${candidate.institutionPlace}` : ''}
              </div>
            )}

            {/* Place (1st, 2nd, 3rd) */}
            {layout.fields.place.enabled && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.place.top}%`,
                  left: `${layout.fields.place.left}%`,
                  transform: layout.fields.place.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.place.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.place.width ? `${layout.fields.place.width}%` : '40%',
                  fontSize: `${layout.fields.place.fontSize}px`,
                  fontWeight: layout.fields.place.fontWeight,
                  fontFamily: layout.fields.place.fontFamily,
                  color: layout.fields.place.color,
                  textAlign: layout.fields.place.textAlign,
                  whiteSpace: "nowrap"
                }}
              >
                {formatPlace(candidate.rank, layout.fields.place.formatType)}
              </div>
            )}

            {/* Grade (A, B) - OMITTED COMPLETELY IF NO GRADE */}
            {layout.fields.grade.enabled && candidate.grade && candidate.grade.trim() !== '' && candidate.grade !== '-' && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.grade.top}%`,
                  left: `${layout.fields.grade.left}%`,
                  transform: layout.fields.grade.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.grade.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.grade.width ? `${layout.fields.grade.width}%` : '35%',
                  fontSize: `${layout.fields.grade.fontSize}px`,
                  fontWeight: layout.fields.grade.fontWeight,
                  fontFamily: layout.fields.grade.fontFamily,
                  color: layout.fields.grade.color,
                  textAlign: layout.fields.grade.textAlign,
                  whiteSpace: "nowrap"
                }}
              >
                {formatGrade(candidate.grade, layout.fields.grade.prefix, layout.fields.grade.suffix)}
              </div>
            )}

            {/* Program Name */}
            {layout.fields.programName.enabled && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.programName.top}%`,
                  left: `${layout.fields.programName.left}%`,
                  transform: layout.fields.programName.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.programName.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.programName.width ? `${layout.fields.programName.width}%` : '80%',
                  fontSize: `${layout.fields.programName.fontSize}px`,
                  fontWeight: layout.fields.programName.fontWeight,
                  fontFamily: layout.fields.programName.fontFamily,
                  color: layout.fields.programName.color,
                  textAlign: layout.fields.programName.textAlign,
                  whiteSpace: "nowrap"
                }}
              >
                {candidate.programName}
              </div>
            )}

            {/* Category Name */}
            {layout.fields.categoryName.enabled && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.categoryName.top}%`,
                  left: `${layout.fields.categoryName.left}%`,
                  transform: layout.fields.categoryName.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.categoryName.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.categoryName.width ? `${layout.fields.categoryName.width}%` : '50%',
                  fontSize: `${layout.fields.categoryName.fontSize}px`,
                  fontWeight: layout.fields.categoryName.fontWeight,
                  fontFamily: layout.fields.categoryName.fontFamily,
                  color: layout.fields.categoryName.color,
                  textAlign: layout.fields.categoryName.textAlign,
                  whiteSpace: "nowrap"
                }}
              >
                {layout.fields.categoryName.prefix || ''}{candidate.categoryName}{layout.fields.categoryName.suffix || ''}
              </div>
            )}

            {/* Chest Number */}
            {layout.fields.chestNumber.enabled && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.chestNumber.top}%`,
                  left: `${layout.fields.chestNumber.left}%`,
                  transform: layout.fields.chestNumber.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.chestNumber.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.chestNumber.width ? `${layout.fields.chestNumber.width}%` : '25%',
                  fontSize: `${layout.fields.chestNumber.fontSize}px`,
                  fontWeight: layout.fields.chestNumber.fontWeight,
                  fontFamily: layout.fields.chestNumber.fontFamily,
                  color: layout.fields.chestNumber.color,
                  textAlign: layout.fields.chestNumber.textAlign,
                  whiteSpace: "nowrap"
                }}
              >
                {layout.fields.chestNumber.prefix || ''}{candidate.chestNumber}{layout.fields.chestNumber.suffix || ''}
              </div>
            )}

            {/* Zone Name */}
            {layout.fields.zoneName.enabled && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.zoneName.top}%`,
                  left: `${layout.fields.zoneName.left}%`,
                  transform: layout.fields.zoneName.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.zoneName.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.zoneName.width ? `${layout.fields.zoneName.width}%` : '40%',
                  fontSize: `${layout.fields.zoneName.fontSize}px`,
                  fontWeight: layout.fields.zoneName.fontWeight,
                  fontFamily: layout.fields.zoneName.fontFamily,
                  color: layout.fields.zoneName.color,
                  textAlign: layout.fields.zoneName.textAlign,
                  whiteSpace: "nowrap"
                }}
              >
                {candidate.zoneName || "CSWC Fest"}
              </div>
            )}

            {/* Date / Year */}
            {layout.fields.dateYear.enabled && (
              <div
                style={{
                  position: "absolute",
                  top: `${layout.fields.dateYear.top}%`,
                  left: `${layout.fields.dateYear.left}%`,
                  transform: layout.fields.dateYear.textAlign === 'center'
                    ? 'translate(-50%, -50%)'
                    : layout.fields.dateYear.textAlign === 'right'
                    ? 'translate(-100%, -50%)'
                    : 'translate(0, -50%)',
                  maxWidth: layout.fields.dateYear.width ? `${layout.fields.dateYear.width}%` : '30%',
                  fontSize: `${layout.fields.dateYear.fontSize}px`,
                  fontWeight: layout.fields.dateYear.fontWeight,
                  fontFamily: layout.fields.dateYear.fontFamily,
                  color: layout.fields.dateYear.color,
                  textAlign: layout.fields.dateYear.textAlign,
                  whiteSpace: "nowrap"
                }}
              >
                September 2026
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media screen {
          body {
            background-color: #0f172a;
          }
          .certificate-print-sheet {
            background-color: #ffffff !important;
            margin: 20px auto !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            border-radius: 4px;
          }
        }

        @media print {
          @page {
            size: ${layout.orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'};
            margin: 0 !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            background-color: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .certificate-print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background-color: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
