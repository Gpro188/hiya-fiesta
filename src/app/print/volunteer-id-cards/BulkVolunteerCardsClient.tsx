"use client";

import React from "react";
import PrintButton from "@/components/PrintButton";
import VolunteerIdCard from "@/components/VolunteerIdCard";

export default function BulkVolunteerCardsClient({
  volunteers,
  settings,
  zoneName,
}: {
  volunteers: any[];
  settings: any;
  zoneName?: string;
}) {
  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      {/* Top Action Bar */}
      <div
        className="no-print"
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "white",
          padding: "16px 24px",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, color: "#111827" }}>
            Bulk Volunteer ID Card Printing
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "4px 0 0 0" }}>
            {zoneName ? `${zoneName} · ` : ""}Found {volunteers.length} volunteer ID cards ready to print
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <PrintButton label="Print All Cards" color="#8E0033" />
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "10px 18px",
              backgroundColor: "#e5e7eb",
              color: "#374151",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.875rem",
              transition: "background-color 0.2s",
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div
        className="id-cards-grid"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {volunteers.map((vol) => (
          <div key={vol.id} className="id-card-print-item">
            <VolunteerIdCard volunteer={vol} settings={settings} />
          </div>
        ))}
      </div>

      {volunteers.length === 0 && (
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
          <h3 style={{ margin: "0 0 6px 0", color: "#111827" }}>No Volunteers Found</h3>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            No volunteers match the selected filter criteria.
          </p>
        </div>
      )}

      {/* Optimized Print Styles for 5.6cm x 8.8cm standard card size */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          .id-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 5.6cm) !important;
            gap: 6mm !important;
            justify-content: center !important;
            padding: 0 !important;
          }
          .id-card-print-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 5.6cm !important;
            height: 8.8cm !important;
          }
          .volunteer-id-card { 
            width: 5.6cm !important;
            height: 8.8cm !important;
            box-shadow: none !important; 
            border: 1px solid #e5e7eb !important;
            border-radius: 4mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
