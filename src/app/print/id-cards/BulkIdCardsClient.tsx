"use client";

import React, { useState, useMemo } from "react";
import PrintButton from "@/components/PrintButton";
import CandidateIdCard from "@/components/CandidateIdCard";

type PaperSize = "A4" | "A3";
type LayoutMode = "MAX" | "GRID";

export default function BulkIdCardsClient({
  candidates,
  settings,
}: {
  candidates: any[];
  settings: any;
}) {
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("MAX");
  const [showCutBorders, setShowCutBorders] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"SHEET" | "GRID">("SHEET");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");

  // Determine capacity per sheet
  // A4 MAX: 5 cards (3 portrait top + 2 landscape bottom) - A4 Landscape
  // A4 GRID: 4 cards (2x2 portrait grid) - A4 Portrait
  // A3 MAX: 10 cards (5x2 portrait grid) - A3 Landscape
  // A3 GRID: 9 cards (3x3 portrait grid) - A3 Portrait
  const cardsPerSheet = useMemo(() => {
    if (paperSize === "A4") {
      return layoutMode === "MAX" ? 5 : 4;
    } else {
      return layoutMode === "MAX" ? 10 : 9;
    }
  }, [paperSize, layoutMode]);

  // Chunk candidates into pages
  const pages = useMemo(() => {
    const chunks: any[][] = [];
    for (let i = 0; i < candidates.length; i += cardsPerSheet) {
      chunks.push(candidates.slice(i, i + cardsPerSheet));
    }
    return chunks;
  }, [candidates, cardsPerSheet]);

  // Page setup parameters for CSS and PDF export
  const pageConfig = useMemo(() => {
    if (paperSize === "A4") {
      if (layoutMode === "MAX") {
        return {
          size: "A4 landscape",
          isLandscape: true,
          margin: "4mm 5mm",
          sheetWidthMm: 297,
          sheetHeightMm: 210,
          sheetWidthCss: "28.7cm",
          sheetHeightCss: "20.2cm",
          orientationName: "A4 Landscape",
          desc: "5 Cards / Sheet (3 Portrait Top + 2 Landscape Bottom)",
        };
      } else {
        return {
          size: "A4 portrait",
          isLandscape: false,
          margin: "8mm",
          sheetWidthMm: 210,
          sheetHeightMm: 297,
          sheetWidthCss: "19.4cm",
          sheetHeightCss: "28.1cm",
          orientationName: "A4 Portrait",
          desc: "4 Cards / Sheet (2 × 2 Portrait Grid)",
        };
      }
    } else {
      if (layoutMode === "MAX") {
        return {
          size: "A3 landscape",
          isLandscape: true,
          margin: "6mm",
          sheetWidthMm: 420,
          sheetHeightMm: 297,
          sheetWidthCss: "40.8cm",
          sheetHeightCss: "28.5cm",
          orientationName: "A3 Landscape",
          desc: "10 Cards / Sheet (5 × 2 Portrait Grid)",
        };
      } else {
        return {
          size: "A3 portrait",
          isLandscape: false,
          margin: "8mm",
          sheetWidthMm: 297,
          sheetHeightMm: 420,
          sheetWidthCss: "28.1cm",
          sheetHeightCss: "40.4cm",
          orientationName: "A3 Portrait",
          desc: "9 Cards / Sheet (3 × 3 Portrait Grid)",
        };
      }
    }
  }, [paperSize, layoutMode]);

  // High-Resolution Direct PDF Download Handler
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfProgress("Loading PDF generator...");
      const { jsPDF } = await import("jspdf");
      const { toPng } = await import("html-to-image");

      const pdf = new jsPDF({
        orientation: pageConfig.isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: paperSize.toLowerCase() as "a4" | "a3",
      });

      const sheetEls = document.querySelectorAll<HTMLElement>(".print-sheet");
      if (sheetEls.length === 0) {
        throw new Error("No print sheets found.");
      }

      for (let i = 0; i < sheetEls.length; i++) {
        setPdfProgress(`Rendering sheet ${i + 1} of ${sheetEls.length}...`);
        const sheet = sheetEls[i];
        const imgData = await toPng(sheet, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          filter: (node) => {
            if (node instanceof HTMLElement && node.classList.contains("no-print")) {
              return false;
            }
            return true;
          },
        });

        if (i > 0) {
          pdf.addPage(
            paperSize.toLowerCase() as "a4" | "a3",
            pageConfig.isLandscape ? "landscape" : "portrait"
          );
        }

        pdf.addImage(
          imgData,
          "PNG",
          0,
          0,
          pageConfig.sheetWidthMm,
          pageConfig.sheetHeightMm,
          undefined,
          "FAST"
        );
      }

      setPdfProgress("Saving PDF file...");
      pdf.save(`Candidate_ID_Cards_${paperSize}_${layoutMode}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF file automatically. Please use the Print All Cards button and select 'Save as PDF'.");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress("");
    }
  };

  return (
    <div
      className="bulk-id-cards-container"
      style={{
        padding: "24px",
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        color: "#0f172a",
        fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Top Action & Configuration Toolbar */}
      <div
        className="no-print"
        style={{
          marginBottom: "24px",
          backgroundColor: "#ffffff",
          padding: "20px 24px",
          borderRadius: "14px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Title & Primary Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "#111827" }}>
                Bulk ID Card Printing
              </h1>
              <span
                style={{
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  border: "1px solid #bfdbfe",
                }}
              >
                Fixed Physical Card: 7.5 cm (W) × 12.5 cm (H)
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "4px 0 0 0" }}>
              {candidates.length} candidates • {pages.length} {pages.length === 1 ? "sheet" : "sheets"} on{" "}
              <strong>{pageConfig.orientationName}</strong> ({cardsPerSheet} cards/sheet)
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || candidates.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                backgroundColor: isGeneratingPdf ? "#94a3b8" : "#0284c7",
                color: "#ffffff",
                fontWeight: 700,
                border: "none",
                borderRadius: "8px",
                cursor: isGeneratingPdf ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
                transition: "all 0.2s",
              }}
            >
              <span>{isGeneratingPdf ? "⏳" : "📥"}</span>
              <span>{isGeneratingPdf ? pdfProgress : "Download PDF"}</span>
            </button>

            {/* Print All Cards Button */}
            <PrintButton label="Print All Cards" color="#8E0033" />

            {/* Back Button */}
            <button
              onClick={() => window.history.back()}
              style={{
                padding: "10px 18px",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                fontWeight: 600,
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.875rem",
                transition: "all 0.2s",
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Paper & Layout Configuration Controls */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            paddingTop: "14px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px" }}>
            {/* Paper Size Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                📄 Paper Size:
              </span>
              <div
                style={{
                  display: "inline-flex",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  overflow: "hidden",
                  backgroundColor: "#f8fafc",
                }}
              >
                {(["A4", "A3"] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setPaperSize(size)}
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: paperSize === size ? "#8E0033" : "transparent",
                      color: paperSize === size ? "#ffffff" : "#475569",
                      transition: "all 0.15s",
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Mode Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                📐 Layout:
              </span>
              <div
                style={{
                  display: "inline-flex",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  overflow: "hidden",
                  backgroundColor: "#f8fafc",
                }}
              >
                <button
                  onClick={() => setLayoutMode("MAX")}
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: layoutMode === "MAX" ? "#8E0033" : "transparent",
                    color: layoutMode === "MAX" ? "#ffffff" : "#475569",
                    transition: "all 0.15s",
                  }}
                  title={paperSize === "A4" ? "5 Cards (3 Portrait + 2 Landscape)" : "10 Cards (5x2 Grid)"}
                >
                  ⭐ Max Fit ({paperSize === "A4" ? "5 Cards" : "10 Cards"})
                </button>
                <button
                  onClick={() => setLayoutMode("GRID")}
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: layoutMode === "GRID" ? "#8E0033" : "transparent",
                    color: layoutMode === "GRID" ? "#ffffff" : "#475569",
                    transition: "all 0.15s",
                  }}
                  title={paperSize === "A4" ? "4 Cards (2x2 Grid)" : "9 Cards (3x3 Grid)"}
                >
                  Standard Grid ({paperSize === "A4" ? "4 Cards" : "9 Cards"})
                </button>
              </div>
            </div>

            {/* Cut Borders Toggle */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={showCutBorders}
                onChange={(e) => setShowCutBorders(e.target.checked)}
                style={{ accentColor: "#8E0033", cursor: "pointer", width: "16px", height: "16px" }}
              />
              Show Cut Guides
            </label>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>
              View:
            </span>
            <div
              style={{
                display: "inline-flex",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                overflow: "hidden",
                backgroundColor: "#f8fafc",
              }}
            >
              <button
                onClick={() => setViewMode("SHEET")}
                style={{
                  padding: "5px 12px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: viewMode === "SHEET" ? "#1e293b" : "transparent",
                  color: viewMode === "SHEET" ? "#ffffff" : "#64748b",
                  transition: "all 0.15s",
                }}
              >
                Sheet Pages
              </button>
              <button
                onClick={() => setViewMode("GRID")}
                style={{
                  padding: "5px 12px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: viewMode === "GRID" ? "#1e293b" : "transparent",
                  color: viewMode === "GRID" ? "#ffffff" : "#64748b",
                  transition: "all 0.15s",
                }}
              >
                Cards Flow
              </button>
            </div>
          </div>
        </div>

        {/* Helpful Orientation Banner for Native Browser Printing */}
        {pageConfig.isLandscape && (
          <div
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #fde68a",
              color: "#92400e",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "0.80rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>💡</span>
            <span>
              <strong>Printer Setting:</strong> When using the Print button, make sure your printer dialog layout is set to <strong>Landscape</strong> (or use the <strong>Download PDF</strong> button for an instant pre-formatted file).
            </span>
          </div>
        )}
      </div>

      {/* Main Print / Preview Content Area */}
      {viewMode === "SHEET" ? (
        /* Sheet by Sheet Preview */
        <div
          className="sheets-wrapper"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
        >
          {pages.map((pageCandidates, pageIdx) => {
            return (
              <div
                key={`page-${pageIdx}`}
                className={`print-sheet print-sheet-${paperSize.toLowerCase()}-${layoutMode.toLowerCase()}`}
                style={{
                  backgroundColor: "#ffffff",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxSizing: "border-box",
                  padding: "16px",
                  position: "relative",
                  margin: "0 auto",
                }}
              >
                {/* Sheet Header (Screen Only) */}
                <div
                  className="no-print"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: "10px",
                    marginBottom: "12px",
                    borderBottom: "1px dashed #cbd5e1",
                    fontSize: "0.78rem",
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  <span>
                    📄 Sheet {pageIdx + 1} of {pages.length} • {pageConfig.desc}
                  </span>
                  <span>{pageCandidates.length} Cards on this sheet</span>
                </div>

                {/* Content according to Layout Mode */}
                {paperSize === "A4" && layoutMode === "MAX" ? (
                  /* A4 MAX: 5 Cards (3 Portrait Top + 2 Landscape Bottom) */
                  <div
                    className="layout-a4-max-container"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "4mm",
                    }}
                  >
                    {/* Top Row: Up to 3 Portrait Cards */}
                    <div
                      className="row-top-portrait"
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "6mm",
                      }}
                    >
                      {pageCandidates.slice(0, 3).map((candidate) => {
                        const isSchedulePublished =
                          candidate.team?.event?.statusOverride === "SCHEDULE_PUBLISHED" ||
                          candidate.team?.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";
                        return (
                          <div
                            key={candidate.id}
                            className={`card-slot-portrait ${showCutBorders ? "with-cut-border" : ""}`}
                          >
                            <CandidateIdCard
                              candidate={candidate}
                              settings={settings}
                              isSchedulePublished={isSchedulePublished}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Row: Up to 2 Landscape (Rotated 90deg) Cards */}
                    {pageCandidates.length > 3 && (
                      <div
                        className="row-bottom-landscape"
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "8mm",
                        }}
                      >
                        {pageCandidates.slice(3, 5).map((candidate) => {
                          const isSchedulePublished =
                            candidate.team?.event?.statusOverride === "SCHEDULE_PUBLISHED" ||
                            candidate.team?.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";
                          return (
                            <div
                              key={candidate.id}
                              className={`card-slot-landscape ${showCutBorders ? "with-cut-border" : ""}`}
                            >
                              <CandidateIdCard
                                candidate={candidate}
                                settings={settings}
                                isSchedulePublished={isSchedulePublished}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard Grid: A4 2x2, A3 5x2, or A3 3x3 */
                  <div
                    className={`layout-grid-container grid-cols-${
                      paperSize === "A4" ? "2" : layoutMode === "MAX" ? "5" : "3"
                    }`}
                  >
                    {pageCandidates.map((candidate) => {
                      const isSchedulePublished =
                        candidate.team?.event?.statusOverride === "SCHEDULE_PUBLISHED" ||
                        candidate.team?.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";
                      return (
                        <div
                          key={candidate.id}
                          className={`card-slot-portrait ${showCutBorders ? "with-cut-border" : ""}`}
                        >
                          <CandidateIdCard
                            candidate={candidate}
                            settings={settings}
                            isSchedulePublished={isSchedulePublished}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Continuous Cards Flow View */
        <div
          className="id-cards-grid-flow"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "24px",
            justifyContent: "center",
            alignItems: "flex-start",
            backgroundColor: "#ffffff",
          }}
        >
          {candidates.map((candidate) => {
            const isSchedulePublished =
              candidate.team?.event?.statusOverride === "SCHEDULE_PUBLISHED" ||
              candidate.team?.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";
            return (
              <div
                key={candidate.id}
                className={`card-slot-portrait ${showCutBorders ? "with-cut-border" : ""}`}
              >
                <CandidateIdCard
                  candidate={candidate}
                  settings={settings}
                  isSchedulePublished={isSchedulePublished}
                />
              </div>
            );
          })}
        </div>
      )}

      {candidates.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#6b7280",
            backgroundColor: "white",
            borderRadius: "12px",
            maxWidth: "500px",
            margin: "40px auto",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🪪</div>
          <h3 style={{ margin: "0 0 6px 0", color: "#111827" }}>No Candidates Found</h3>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            No approved candidates match the selected filter.
          </p>
        </div>
      )}

      {/* Embedded Dynamic Print Stylesheet for exact 7.5cm x 12.5cm physical cards */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Screen Card Slot Sizes: 7.5cm W x 12.5cm H */
        .card-slot-portrait {
          width: 7.5cm;
          height: 12.5cm;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          background: #ffffff;
        }
        .card-slot-portrait.with-cut-border {
          border: 1px dashed #cbd5e1;
        }
        .card-slot-portrait .candidate-id-card {
          width: 350px !important;
          height: 550px !important;
          transform: scale(calc(7.5cm / 350px), calc(12.5cm / 550px)) !important;
          transform-origin: top left !important;
          box-shadow: none !important;
        }

        /* Landscape (Rotated 90deg) Card Slot: 12.5cm W x 7.5cm H */
        .card-slot-landscape {
          width: 12.5cm;
          height: 7.5cm;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          background: #ffffff;
        }
        .card-slot-landscape.with-cut-border {
          border: 1px dashed #cbd5e1;
        }
        .card-slot-landscape .candidate-id-card {
          width: 350px !important;
          height: 550px !important;
          transform: translate(12.5cm, 0) rotate(90deg) scale(calc(7.5cm / 350px), calc(12.5cm / 550px)) !important;
          transform-origin: top left !important;
          box-shadow: none !important;
        }

        /* Screen Grid Columns Helper */
        .layout-grid-container {
          display: grid;
          justify-content: center;
          align-content: center;
          gap: 6mm;
        }
        .layout-grid-container.grid-cols-2 {
          grid-template-columns: repeat(2, 7.5cm);
        }
        .layout-grid-container.grid-cols-3 {
          grid-template-columns: repeat(3, 7.5cm);
        }
        .layout-grid-container.grid-cols-5 {
          grid-template-columns: repeat(5, 7.5cm);
        }

        /* PRINT STYLES - GUARANTEED GRAPHICS & PURE WHITE PAPER BACKGROUND */
        @media print {
          @page {
            size: ${pageConfig.size};
            margin: ${pageConfig.margin};
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body, #__next, .bulk-id-cards-container, .sheets-wrapper {
            background: #ffffff !important;
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            width: ${pageConfig.sheetWidthCss} !important;
            height: ${pageConfig.sheetHeightCss} !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
          }
          .layout-a4-max-container {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .row-top-portrait {
            display: flex !important;
            justify-content: center !important;
            gap: 6mm !important;
            width: 100% !important;
            height: 12.5cm !important;
          }
          .row-bottom-landscape {
            display: flex !important;
            justify-content: center !important;
            gap: 8mm !important;
            width: 100% !important;
            height: 7.5cm !important;
          }
          .card-slot-portrait {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 7.5cm !important;
            height: 12.5cm !important;
            background: #ffffff !important;
          }
          .card-slot-portrait.with-cut-border {
            border: 1px dashed #94a3b8 !important;
          }
          .card-slot-landscape {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 12.5cm !important;
            height: 7.5cm !important;
            background: #ffffff !important;
          }
          .card-slot-landscape.with-cut-border {
            border: 1px dashed #94a3b8 !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
