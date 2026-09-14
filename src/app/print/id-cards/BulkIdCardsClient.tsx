"use client";

import React, { useState, useMemo } from "react";
import PrintButton from "@/components/PrintButton";
import CandidateIdCard from "@/components/CandidateIdCard";

type PaperSize = "CARD" | "A4" | "A3";
type LayoutMode = "MAX" | "GRID";
type StageFilter = "ALL" | "ON_STAGE" | "OFF_STAGE";

export default function BulkIdCardsClient({
  candidates,
  settings,
  initialStageType = "ALL",
}: {
  candidates: any[];
  settings: any;
  initialStageType?: string;
}) {
  const [stageFilter, setStageFilter] = useState<StageFilter>(
    initialStageType === "ON_STAGE" ? "ON_STAGE" : initialStageType === "OFF_STAGE" ? "OFF_STAGE" : "ALL"
  );
  const [paperSize, setPaperSize] = useState<PaperSize>("CARD");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("MAX");
  const [showCutBorders, setShowCutBorders] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"SHEET" | "GRID">("SHEET");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");

  // Calculate counts for badges
  const totalCount = candidates.length;
  const onStageCount = useMemo(() => {
    return candidates.filter((c) =>
      c.programs?.some((p: any) => {
        const st = (p.program?.stageType || p.stageType || "").toUpperCase();
        return st === "ON_STAGE" || st.includes("ON");
      })
    ).length;
  }, [candidates]);

  const offStageCount = useMemo(() => {
    return candidates.filter((c) =>
      c.programs?.some((p: any) => {
        const st = (p.program?.stageType || p.stageType || "").toUpperCase();
        return st === "OFF_STAGE" || st.includes("OFF");
      })
    ).length;
  }, [candidates]);

  // Filter candidates by Stage Type
  const filteredCandidates = useMemo(() => {
    if (stageFilter === "ALL") return candidates;
    if (stageFilter === "ON_STAGE") {
      return candidates.filter((c) =>
        c.programs?.some((p: any) => {
          const st = (p.program?.stageType || p.stageType || "").toUpperCase();
          return st === "ON_STAGE" || st.includes("ON");
        })
      );
    }
    if (stageFilter === "OFF_STAGE") {
      return candidates.filter((c) =>
        c.programs?.some((p: any) => {
          const st = (p.program?.stageType || p.stageType || "").toUpperCase();
          return st === "OFF_STAGE" || st.includes("OFF");
        })
      );
    }
    return candidates;
  }, [candidates, stageFilter]);

  // Determine capacity per sheet
  // CARD: 1 card per page (Exact 7.5cm x 12.5cm fitting type)
  // A4 MAX: 5 cards (3 portrait top + 2 landscape bottom) - A4 Landscape
  // A4 GRID: 4 cards (2x2 portrait grid) - A4 Portrait
  // A3 MAX: 10 cards (5x2 portrait grid) - A3 Landscape
  // A3 GRID: 9 cards (3x3 portrait grid) - A3 Portrait
  const cardsPerSheet = useMemo(() => {
    if (paperSize === "CARD") return 1;
    if (paperSize === "A4") {
      return layoutMode === "MAX" ? 5 : 4;
    } else {
      return layoutMode === "MAX" ? 10 : 9;
    }
  }, [paperSize, layoutMode]);

  // Chunk filtered candidates into pages
  const pages = useMemo(() => {
    const chunks: any[][] = [];
    for (let i = 0; i < filteredCandidates.length; i += cardsPerSheet) {
      chunks.push(filteredCandidates.slice(i, i + cardsPerSheet));
    }
    return chunks;
  }, [filteredCandidates, cardsPerSheet]);

  // Page setup parameters for CSS and PDF export
  const pageConfig = useMemo(() => {
    if (paperSize === "CARD") {
      return {
        size: "7.5cm 12.5cm",
        isLandscape: false,
        margin: "0",
        sheetWidthMm: 75,
        sheetHeightMm: 125,
        sheetWidthCss: "7.5cm",
        sheetHeightCss: "12.5cm",
        orientationName: "Exact Card (7.5 × 12.5 cm)",
        desc: "Exact 7.5cm × 12.5cm (Fitting Type • 1 Card / Page)",
      };
    } else if (paperSize === "A4") {
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

  // Exact Fitting 7.5cm x 12.5cm PDF Download Handler (1 Card Per Page, Zero Margins)
  const handleDownloadExactPdf = async () => {
    if (filteredCandidates.length === 0) return;
    try {
      setIsGeneratingPdf(true);
      setPdfProgress("Switching to exact 7.5 × 12.5 cm mode...");

      if (paperSize !== "CARD") {
        setPaperSize("CARD");
        // Give React time to render all cards in 1-per-page portrait mode
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      setPdfProgress("Loading PDF engine...");
      const { jsPDF } = await import("jspdf");
      const { toPng } = await import("html-to-image");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [75, 125], // Exact 7.5 cm × 12.5 cm fitting dimensions
      });

      // Query card elements in the document
      const cardEls = document.querySelectorAll<HTMLElement>(".exact-card-slot, .card-slot-portrait");
      if (cardEls.length === 0) {
        throw new Error("No card elements found on page.");
      }

      for (let i = 0; i < cardEls.length; i++) {
        setPdfProgress(`Rendering card ${i + 1} of ${cardEls.length}...`);
        const card = cardEls[i];
        const imgData = await toPng(card, {
          quality: 0.98,
          pixelRatio: 3, // High DPI rendering
          backgroundColor: "#ffffff",
          filter: (node) => {
            if (node instanceof HTMLElement && node.classList.contains("no-print")) {
              return false;
            }
            return true;
          },
        });

        if (i > 0) {
          pdf.addPage([75, 125], "portrait");
        }

        // Add image fitting 100% of 75mm x 125mm with 0 margins
        pdf.addImage(imgData, "PNG", 0, 0, 75, 125, undefined, "FAST");
      }

      setPdfProgress("Saving exact fitting PDF...");
      const stageLabel = stageFilter === "ALL" ? "All" : stageFilter === "ON_STAGE" ? "OnStage" : "OffStage";
      pdf.save(`Candidate_ID_Cards_7.5x12.5cm_${stageLabel}.pdf`);
    } catch (err) {
      console.error("Exact PDF generation failed:", err);
      alert("Could not generate PDF file automatically. Please use the Print button and select 'Save as PDF'.");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress("");
    }
  };

  // Sheet-based PDF Download Handler (A4 / A3 sheets)
  const handleDownloadSheetPdf = async () => {
    if (paperSize === "CARD") {
      return handleDownloadExactPdf();
    }
    try {
      setIsGeneratingPdf(true);
      setPdfProgress("Loading PDF engine...");
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
      const stageLabel = stageFilter === "ALL" ? "All" : stageFilter === "ON_STAGE" ? "OnStage" : "OffStage";
      pdf.save(`Candidate_ID_Cards_${paperSize}_${stageLabel}.pdf`);
    } catch (err) {
      console.error("Sheet PDF generation failed:", err);
      alert("Could not generate PDF file automatically. Please use the Print button and select 'Save as PDF'.");
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
                Candidate ID Card Printing &amp; PDF Export
              </h1>
              <span
                style={{
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  border: "1px solid #bfdbfe",
                }}
              >
                Exact Physical Card Size: 7.5 cm (W) × 12.5 cm (H)
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "4px 0 0 0" }}>
              Showing <strong>{filteredCandidates.length}</strong> candidates • {pages.length} {pages.length === 1 ? "page" : "pages"} on{" "}
              <strong>{pageConfig.orientationName}</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Direct Exact 7.5 x 12.5 cm PDF Download Button */}
            <button
              onClick={handleDownloadExactPdf}
              disabled={isGeneratingPdf || filteredCandidates.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                backgroundColor: isGeneratingPdf ? "#94a3b8" : "#8E0033",
                color: "#ffffff",
                fontWeight: 800,
                border: "none",
                borderRadius: "8px",
                cursor: isGeneratingPdf ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                boxShadow: "0 2px 6px rgba(142, 0, 51, 0.3)",
                transition: "all 0.2s",
              }}
              title="Download exact 7.5cm (W) x 12.5cm (H) fitting PDF (1 Card per Page, Zero Margins)"
            >
              <span>{isGeneratingPdf ? "⏳" : "📥"}</span>
              <span>{isGeneratingPdf ? pdfProgress : "Download Exact PDF (7.5 × 12.5 cm)"}</span>
            </button>

            {/* Sheet PDF download if A4 or A3 */}
            {paperSize !== "CARD" && (
              <button
                onClick={handleDownloadSheetPdf}
                disabled={isGeneratingPdf || filteredCandidates.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  backgroundColor: isGeneratingPdf ? "#94a3b8" : "#0284c7",
                  color: "#ffffff",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "8px",
                  cursor: isGeneratingPdf ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
                }}
              >
                <span>📄</span>
                <span>Download {paperSize} Sheet PDF</span>
              </button>
            )}

            <PrintButton label={`Print Cards (${pageConfig.orientationName})`} />

            <a
              href="/dashboard/reports"
              style={{
                padding: "10px 16px",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              ← Reports
            </a>
          </div>
        </div>

        {/* Filter Controls Row: Stage Filter, Paper Size, Layout */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            paddingTop: "14px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          {/* Stage Filter: All, On-Stage Only, Off-Stage Only */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
              🎭 Stage Filter:
            </span>
            <div
              style={{
                display: "inline-flex",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                overflow: "hidden",
                backgroundColor: "#f8fafc",
              }}
            >
              <button
                onClick={() => setStageFilter("ALL")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: stageFilter === "ALL" ? "#0f172a" : "transparent",
                  color: stageFilter === "ALL" ? "#ffffff" : "#475569",
                  transition: "all 0.15s",
                }}
              >
                All Candidates ({totalCount})
              </button>
              <button
                onClick={() => setStageFilter("ON_STAGE")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: stageFilter === "ON_STAGE" ? "#4f46e5" : "transparent",
                  color: stageFilter === "ON_STAGE" ? "#ffffff" : "#475569",
                  borderLeft: "1px solid #cbd5e1",
                  transition: "all 0.15s",
                }}
              >
                🎭 On-Stage Only ({onStageCount})
              </button>
              <button
                onClick={() => setStageFilter("OFF_STAGE")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: stageFilter === "OFF_STAGE" ? "#059669" : "transparent",
                  color: stageFilter === "OFF_STAGE" ? "#ffffff" : "#475569",
                  borderLeft: "1px solid #cbd5e1",
                  transition: "all 0.15s",
                }}
              >
                📝 Off-Stage Only ({offStageCount})
              </button>
            </div>
          </div>

          {/* Paper Size / Exact Size Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
              🖨️ Print Format:
            </span>
            <div
              style={{
                display: "inline-flex",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                overflow: "hidden",
                backgroundColor: "#f8fafc",
              }}
            >
              <button
                onClick={() => setPaperSize("CARD")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: paperSize === "CARD" ? "#8E0033" : "transparent",
                  color: paperSize === "CARD" ? "#ffffff" : "#475569",
                  transition: "all 0.15s",
                }}
                title="Exact 7.5cm (W) × 12.5cm (H) card size (1 Card per Page, Fitting Type)"
              >
                ⭐ Exact Card (7.5 × 12.5 cm)
              </button>
              <button
                onClick={() => setPaperSize("A4")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: paperSize === "A4" ? "#8E0033" : "transparent",
                  color: paperSize === "A4" ? "#ffffff" : "#475569",
                  borderLeft: "1px solid #cbd5e1",
                  transition: "all 0.15s",
                }}
              >
                A4 Sheets
              </button>
              <button
                onClick={() => setPaperSize("A3")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: paperSize === "A3" ? "#8E0033" : "transparent",
                  color: paperSize === "A3" ? "#ffffff" : "#475569",
                  borderLeft: "1px solid #cbd5e1",
                  transition: "all 0.15s",
                }}
              >
                A3 Sheets
              </button>
            </div>

            {/* Layout Mode Selector (For A4 and A3) */}
            {paperSize !== "CARD" && (
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
                    padding: "6px 12px",
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: layoutMode === "MAX" ? "#334155" : "transparent",
                    color: layoutMode === "MAX" ? "#ffffff" : "#64748b",
                  }}
                >
                  Max Fit ({paperSize === "A4" ? "5 Cards" : "10 Cards"})
                </button>
                <button
                  onClick={() => setLayoutMode("GRID")}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: layoutMode === "GRID" ? "#334155" : "transparent",
                    color: layoutMode === "GRID" ? "#ffffff" : "#64748b",
                  }}
                >
                  Standard Grid ({paperSize === "A4" ? "4 Cards" : "9 Cards"})
                </button>
              </div>
            )}

            {/* Cut Borders Toggle */}
            {paperSize !== "CARD" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.80rem",
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
                  style={{ accentColor: "#8E0033", cursor: "pointer" }}
                />
                Cut Guides
              </label>
            )}
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "0.80rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            💡 <strong>Exact 7.5cm (W) × 12.5cm (H) PDF:</strong> Click <strong>&quot;Download Exact PDF&quot;</strong> to export high-resolution zero-margin fitting PDF. When printing via browser print dialog, select <strong>Save as PDF</strong> with paper size matching <strong>Exact Card (7.5 × 12.5 cm)</strong>.
          </div>
          <div style={{ fontWeight: 800, color: "#8E0033" }}>
            Active Stage: {stageFilter === "ALL" ? "All Programs" : stageFilter === "ON_STAGE" ? "On-Stage Only" : "Off-Stage Only"}
          </div>
        </div>
      </div>

      {/* ── ID Card Rendering Canvas ── */}
      {filteredCandidates.length > 0 ? (
        <div className="sheets-wrapper" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {pages.map((pageCandidates, pageIdx) => {
            return (
              <div
                key={`page-${pageIdx}`}
                className={`print-sheet print-sheet-${paperSize.toLowerCase()}`}
                style={{
                  backgroundColor: "#ffffff",
                  boxShadow: paperSize === "CARD" ? "0 4px 15px rgba(0,0,0,0.08)" : "0 4px 20px rgba(0,0,0,0.06)",
                  borderRadius: "8px",
                  border: paperSize === "CARD" ? "none" : "1px solid #e2e8f0",
                  boxSizing: "border-box",
                  padding: paperSize === "CARD" ? "0" : "16px",
                  position: "relative",
                  margin: "0 auto",
                  width: paperSize === "CARD" ? "7.5cm" : undefined,
                  height: paperSize === "CARD" ? "12.5cm" : undefined,
                }}
              >
                {/* Sheet Header (Screen Only - for A4/A3 multi-card sheets) */}
                {paperSize !== "CARD" && (
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
                )}

                {/* Content according to Paper Size and Layout Mode */}
                {paperSize === "CARD" ? (
                  /* Exact Card Mode: 1 Card per Page, Fitting Type */
                  <div
                    className="card-slot-portrait exact-card-slot"
                    style={{
                      width: "7.5cm",
                      height: "12.5cm",
                      overflow: "hidden",
                      position: "relative",
                      margin: "0 auto",
                      boxSizing: "border-box",
                    }}
                  >
                    <CandidateIdCard
                      candidate={pageCandidates[0]}
                      settings={settings}
                      isSchedulePublished={
                        pageCandidates[0]?.team?.event?.statusOverride === "SCHEDULE_PUBLISHED" ||
                        pageCandidates[0]?.team?.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED"
                      }
                    />
                  </div>
                ) : paperSize === "A4" && layoutMode === "MAX" ? (
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

                    {/* Bottom Row: Up to 2 Landscape Cards */}
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
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#6b7280",
            backgroundColor: "white",
            borderRadius: "12px",
            maxWidth: "500px",
            margin: "40px auto",
            border: "1px dashed #cbd5e1",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🪪</div>
          <h3 style={{ margin: "0 0 6px 0", color: "#111827" }}>No Candidates Found</h3>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            No candidates match the stage filter <strong>&quot;{stageFilter}&quot;</strong>. Try switching back to <strong>&quot;All Candidates&quot;</strong>.
          </p>
        </div>
      )}

      {/* Embedded Dynamic Print Stylesheet */}
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

        /* Landscape Card Slot */
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

        /* Grid Layouts */
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

        /* PRINT STYLES */
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
            overflow: hidden !important;
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
            border: ${paperSize === "CARD" ? "none !important" : "1px dashed #94a3b8 !important"};
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
