"use client";

import React, { useState } from "react";

export default function SingleCardDownloadButton({ candidateName }: { candidateName: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const { jsPDF } = await import("jspdf");
      const { toPng } = await import("html-to-image");

      const cardEl = document.querySelector<HTMLElement>(".id-card-print-item");
      if (!cardEl) throw new Error("Card element not found");

      const imgData = await toPng(cardEl, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [75, 125], // Exact 7.5cm x 12.5cm
      });

      pdf.addImage(imgData, "PNG", 0, 0, 75, 125, undefined, "FAST");
      const cleanName = candidateName.replace(/[^a-zA-Z0-9]/g, "_") || "Candidate";
      pdf.save(`ID_Card_${cleanName}_7.5x12.5cm.pdf`);
    } catch (err) {
      console.error("Single card PDF generation failed:", err);
      alert("Could not generate PDF. Please use the Print button and select 'Save as PDF'.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "10px 18px",
        backgroundColor: isGenerating ? "#94a3b8" : "#0284c7",
        color: "#ffffff",
        fontWeight: 700,
        border: "none",
        borderRadius: "5px",
        cursor: isGenerating ? "not-allowed" : "pointer",
        fontSize: "0.85rem",
        boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
      }}
    >
      <span>{isGenerating ? "⏳" : "📥"}</span>
      <span>{isGenerating ? "Generating..." : "Download PDF (Exact 7.5 × 12.5 cm)"}</span>
    </button>
  );
}
