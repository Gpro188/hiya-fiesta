"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface CandidateProgramInfo {
  id: string;
  code: string;
  name: string;
  stageType: string;
  type: string;
  slotNumber?: number | null;
}

export interface StateParticipant {
  id: string;
  name: string;
  chestNumber: string | null;
  uid: string | null;
  photoUrl: string | null;
  category: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  institutionPlace: string;
  institutionDistrict: string;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  onStageCount: number;
  offStageCount: number;
  generalCount: number;
  programs: CandidateProgramInfo[];
}

export interface InstitutionFacilitiesSummary {
  id: string;
  name: string;
  code: string;
  place: string;
  district: string;
  candidatesCount: number;
  onStageCount: number;
  offStageCount: number;
  generalCount: number;
  totalAssignmentsCount: number;
}

export interface ZoneFacilitiesSummary {
  id: string;
  name: string;
  code: string;
  totalInstitutions: number;
  totalCandidates: number;
  onStageCandidates: number;
  offStageCandidates: number;
  bothStageCandidates: number;
  generalCandidates: number;
  categoryBreakdown: {
    fadhila: number;
    fadheela: number;
    general: number;
  };
  totalAssignments: number;
  institutions: InstitutionFacilitiesSummary[];
  facilities: {
    recommendedBeds: number;
    dailyMealsEstimate: number;
    idBadgesCount: number;
    kitBagsCount: number;
  };
}

export interface GrandFacilitiesTotals {
  totalZones: number;
  totalInstitutions: number;
  totalCandidates: number;
  totalOnStageCandidates: number;
  totalOffStageCandidates: number;
  totalBothStageCandidates: number;
  totalGeneralCandidates: number;
  totalAssignments: number;
  totalFadhilaCandidates: number;
  totalFadheelaCandidates: number;
  totalGeneralCategoryCandidates: number;
  facilities: {
    recommendedBeds: number;
    dailyMealsEstimate: number;
    idBadgesCount: number;
    kitBagsCount: number;
  };
}

export default function StateParticipantsClient({
  festName,
  zones,
  grandTotals,
  participants,
  initialZoneId = "ALL",
  initialStageType = "ALL",
}: {
  festName: string;
  zones: ZoneFacilitiesSummary[];
  grandTotals: GrandFacilitiesTotals;
  participants: StateParticipant[];
  initialZoneId?: string;
  initialStageType?: string;
}) {
  const [activeTab, setActiveTab] = useState<"FACILITIES" | "ROSTER" | "ZONE_PACK">("FACILITIES");
  const [selectedZone, setSelectedZone] = useState<string>(initialZoneId);
  const [selectedStageType, setSelectedStageType] = useState<string>(initialStageType);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Zone filter
      if (selectedZone !== "ALL" && p.zoneName !== selectedZone && p.zoneId !== selectedZone) {
        return false;
      }

      // Stage type filter
      if (selectedStageType === "ON_STAGE" && p.onStageCount === 0) return false;
      if (selectedStageType === "OFF_STAGE" && p.offStageCount === 0) return false;
      if (selectedStageType === "BOTH" && (p.onStageCount === 0 || p.offStageCount === 0)) return false;

      // Category filter
      if (selectedCategory !== "ALL") {
        const cat = p.category.toUpperCase();
        if (selectedCategory === "FADHILA" && (!cat.includes("FADHILA") || cat.includes("FADHEELA"))) return false;
        if (selectedCategory === "FADHEELA" && !cat.includes("FADHEELA")) return false;
        if (selectedCategory === "GENERAL" && (cat.includes("FADHILA") || cat.includes("FADHEELA"))) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesChest = (p.chestNumber || "").toLowerCase().includes(q);
        const matchesUid = (p.uid || "").toLowerCase().includes(q);
        const matchesInst = p.institutionName.toLowerCase().includes(q) || p.institutionCode.toLowerCase().includes(q);
        const matchesZone = p.zoneName.toLowerCase().includes(q);
        const matchesProgram = p.programs.some(
          (pr) => pr.name.toLowerCase().includes(q) || pr.code.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesChest && !matchesUid && !matchesInst && !matchesZone && !matchesProgram) {
          return false;
        }
      }

      return true;
    });
  }, [participants, selectedZone, selectedStageType, selectedCategory, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Sl No",
      "Chest No",
      "Candidate Name",
      "UID",
      "Category",
      "Zone",
      "Institution Code",
      "Institution Name",
      "District",
      "On-Stage Items Count",
      "Off-Stage Items Count",
      "Total Programs Count",
      "Assigned Programs",
    ];

    const rows = filteredParticipants.map((p, idx) => [
      idx + 1,
      p.chestNumber || "N/A",
      `"${p.name.replace(/"/g, '""')}"`,
      p.uid || "",
      p.category,
      p.zoneName,
      p.institutionCode,
      `"${p.institutionName.replace(/"/g, '""')}"`,
      p.institutionDistrict || "",
      p.onStageCount,
      p.offStageCount,
      p.programs.length,
      `"${p.programs.map((pr) => `[#${pr.code}] ${pr.name} (${pr.stageType})`).join("; ").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `State_Participants_Register_${festName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (tab?: "FACILITIES" | "ROSTER" | "ZONE_PACK") => {
    if (tab) setActiveTab(tab);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="state-participants-root" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .table-print {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8.5pt !important;
          }
          .table-print th, .table-print td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 6px !important;
          }
          .table-print th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }
          .state-participants-root {
            background: #ffffff !important;
            padding: 0 !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Top Navigation Bar */}
      <div className="no-print" style={{ backgroundColor: "#8E0033", color: "#ffffff", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", boxShadow: "0 4px 12px rgba(142,0,51,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/dashboard/reports" style={{ color: "#ffffff", textDecoration: "none", fontSize: "0.85rem", padding: "6px 12px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.15)", fontWeight: 700 }}>
            ← Back to Reports
          </Link>
          <Link href="/dashboard/promotions" style={{ color: "#ffffff", textDecoration: "none", fontSize: "0.85rem", padding: "6px 12px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.15)", fontWeight: 700 }}>
            ⚡ Promotions Manager
          </Link>
          <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>🏛️ State Festival Facilities &amp; Participants Register</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => handlePrint("FACILITIES")}
            style={{ backgroundColor: "#ffffff", color: "#8E0033", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
          >
            🖨️ Print Facilities Summary
          </button>
          <button
            onClick={() => handlePrint("ROSTER")}
            style={{ backgroundColor: "#0284c7", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
          >
            🖨️ Print Full Roster
          </button>
          <a
            href="/api/reports/state-participants-excel"
            style={{ backgroundColor: "#15803d", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
          >
            📊 Download Excel (.xlsx)
          </a>
          <button
            onClick={handleExportCSV}
            style={{ backgroundColor: "#059669", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        {/* Official Festival Document Header (Visible in print and screen) */}
        <div style={{ textAlign: "center", borderBottom: "3px double #8E0033", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, letterSpacing: "1.5px", color: "#8E0033", textTransform: "uppercase" }}>
            CSWC - COUNCIL OF SHARIAH WOMEN COLLEGES
          </div>
          <h1 style={{ margin: "4px 0", fontSize: "1.8rem", fontWeight: 900, color: "#1e293b", letterSpacing: "-0.5px" }}>
            {festName.toUpperCase()}
          </h1>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#8E0033" }}>
            STATE PARTICIPANTS REGISTER &amp; FACILITIES LOGISTICS SUMMARY
          </div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>
            Official Headcount for Accommodation, Meals, ID Badges &amp; Stage Scheduling • Karnataka Excluded (Central State Final)
          </div>
        </div>

        {/* Tab Controls (Screen only) */}
        <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("FACILITIES")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                backgroundColor: activeTab === "FACILITIES" ? "#8E0033" : "#e2e8f0",
                color: activeTab === "FACILITIES" ? "#ffffff" : "#334155",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: activeTab === "FACILITIES" ? "0 4px 12px rgba(142,0,51,0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              🏢 Zone Facilities &amp; Headcount Summary
            </button>
            <button
              onClick={() => setActiveTab("ROSTER")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                backgroundColor: activeTab === "ROSTER" ? "#8E0033" : "#e2e8f0",
                color: activeTab === "ROSTER" ? "#ffffff" : "#334155",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: activeTab === "ROSTER" ? "0 4px 12px rgba(142,0,51,0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              📋 Master State Registration Roster ({filteredParticipants.length})
            </button>
            <button
              onClick={() => setActiveTab("ZONE_PACK")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                backgroundColor: activeTab === "ZONE_PACK" ? "#8E0033" : "#e2e8f0",
                color: activeTab === "ZONE_PACK" ? "#ffffff" : "#334155",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: activeTab === "ZONE_PACK" ? "0 4px 12px rgba(142,0,51,0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              🗂️ Zone-Wise Registration Pack
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b" }}>
              Total Headcount: <strong style={{ color: "#8E0033", fontSize: "1.05rem" }}>{grandTotals.totalCandidates} Candidates</strong>
            </span>
          </div>
        </div>

        {/* Executive KPI Metric Cards (Facilities Planning) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }} className="page-break-inside-avoid">
          {/* Total Candidates (Headcount) */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #8E0033", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#8E0033", textTransform: "uppercase" }}>Candidate Headcount</span>
              <span style={{ fontSize: "1.4rem" }}>👥</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#8E0033", marginTop: "4px" }}>
              {grandTotals.totalCandidates}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Distinct candidates across {grandTotals.totalZones} zones
            </div>
          </div>

          {/* Accommodation & Beds Required */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #0284c7", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0284c7", textTransform: "uppercase" }}>Accommodation (Beds)</span>
              <span style={{ fontSize: "1.4rem" }}>🛏️</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0284c7", marginTop: "4px" }}>
              {grandTotals.facilities.recommendedBeds}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Candidate stay capacity (+ staff buffer)
            </div>
          </div>

          {/* Food / Daily Meals Estimate */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #059669", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>Estimated Daily Meals</span>
              <span style={{ fontSize: "1.4rem" }}>🍱</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#059669", marginTop: "4px" }}>
              {grandTotals.facilities.dailyMealsEstimate}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Breakfast + Lunch + Dinner plates/day
            </div>
          </div>

          {/* Participating Institutions */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #d97706", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#d97706", textTransform: "uppercase" }}>Colleges Represented</span>
              <span style={{ fontSize: "1.4rem" }}>🏛️</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#d97706", marginTop: "4px" }}>
              {grandTotals.totalInstitutions}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Institutions qualifying to State Final
            </div>
          </div>

          {/* On-Stage Performers */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #7c3aed", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase" }}>On-Stage Performers</span>
              <span style={{ fontSize: "1.4rem" }}>🎭</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#7c3aed", marginTop: "4px" }}>
              {grandTotals.totalOnStageCandidates}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              {grandTotals.totalOffStageCandidates} Off-Stage • {grandTotals.totalBothStageCandidates} Both
            </div>
          </div>
        </div>

        {/* SECTION 1: ZONE FACILITIES & HEADCOUNT SUMMARY (Primary request) */}
        {(activeTab === "FACILITIES" || activeTab === "ZONE_PACK") && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #cbd5e1", padding: "20px", marginBottom: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }} className="page-break-after">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🏢</span> Zone-Wise Facilities &amp; Candidate Arrival Summary
                </h2>
                <p style={{ margin: "3px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                  Exact physical candidate headcounts per zone for allocating dormitories, beds, catering counters, and delegate kit bags.
                </p>
              </div>
              <div className="no-print" style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handlePrint("FACILITIES")}
                  style={{ padding: "6px 14px", borderRadius: "6px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                >
                  🖨️ Print Facilities Table
                </button>
              </div>
            </div>

            {/* Zone Facilities Master Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="table-print" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#8E0033", color: "#ffffff", fontSize: "0.85rem" }}>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028" }}>SL</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028" }}>ZONE / DISTRICT</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>COLLEGES</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center", backgroundColor: "#700028", fontWeight: 900 }}>TOTAL CANDIDATES (HEADCOUNT)</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>ON-STAGE</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>OFF-STAGE</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>BOTH</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>GENERAL</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>PROGRAM ENTRIES</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>BEDS NEEDED</th>
                    <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>DAILY MEALS</th>
                    <th className="no-print" style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z, idx) => (
                    <tr
                      key={z.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                        fontSize: "0.88rem",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <td style={{ padding: "10px 12px", fontWeight: 700, border: "1px solid #cbd5e1", textAlign: "center" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#8E0033" }}>{z.name}</span>
                          <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", fontWeight: 700 }}>
                            {z.code}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 700 }}>
                        {z.totalInstitutions}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", backgroundColor: "rgba(142,0,51,0.06)", fontWeight: 900, color: "#8E0033", fontSize: "1.05rem" }}>
                        {z.totalCandidates}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", color: "#7c3aed", fontWeight: 700 }}>
                        {z.onStageCandidates}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", color: "#059669", fontWeight: 700 }}>
                        {z.offStageCandidates}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", color: "#d97706", fontWeight: 700 }}>
                        {z.bothStageCandidates}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", color: "#475569" }}>
                        {z.generalCandidates}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 700 }}>
                        {z.totalAssignments}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 800, color: "#0284c7" }}>
                        {z.facilities.recommendedBeds} beds
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 800, color: "#059669" }}>
                        {z.facilities.dailyMealsEstimate} plates
                      </td>
                      <td className="no-print" style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1" }}>
                        <button
                          type="button"
                          onClick={() => setExpandedZone(expandedZone === z.id ? null : z.id)}
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            borderRadius: "4px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: expandedZone === z.id ? "#8E0033" : "#f1f5f9",
                            color: expandedZone === z.id ? "#ffffff" : "#0f172a",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {expandedZone === z.id ? "Hide Colleges" : "View Colleges (" + z.institutions.length + ")"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#1e293b", color: "#ffffff", fontWeight: 900, fontSize: "0.95rem" }}>
                    <td colSpan={2} style={{ padding: "12px", textAlign: "right", border: "1px solid #0f172a" }}>
                      GRAND TOTAL (ALL 7 ZONES):
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                      {grandTotals.totalInstitutions}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a", backgroundColor: "#8E0033", fontSize: "1.2rem", fontWeight: 900 }}>
                      {grandTotals.totalCandidates}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                      {grandTotals.totalOnStageCandidates}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                      {grandTotals.totalOffStageCandidates}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                      {grandTotals.totalBothStageCandidates}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                      {grandTotals.totalGeneralCandidates}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                      {grandTotals.totalAssignments}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                      {grandTotals.facilities.recommendedBeds} beds
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                      {grandTotals.facilities.dailyMealsEstimate} plates
                    </td>
                    <td className="no-print" style={{ border: "1px solid #0f172a" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Zone-by-Zone College Breakdown Details */}
            {zones.map((z) => (
              <div
                key={`inst-list-${z.id}`}
                style={{
                  display: (expandedZone === z.id || activeTab === "ZONE_PACK") ? "block" : "none",
                  marginTop: "16px",
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1.5px solid #e2e8f0",
                }}
                className="page-break-inside-avoid"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0, color: "#8E0033", fontSize: "1rem", fontWeight: 800 }}>
                    🏛️ {z.name} ZONE — Participating Institutions &amp; Headcount Breakdown
                  </h4>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {z.institutions.length} Colleges • {z.totalCandidates} Total Candidates
                  </span>
                </div>
                <table className="table-print" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#e2e8f0", color: "#1e293b" }}>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1" }}>Sl</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1" }}>College Code</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1" }}>College / Institution Name</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1" }}>Place / District</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center" }}>Candidates Headcount</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center" }}>On-Stage</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center" }}>Off-Stage</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center" }}>Program Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {z.institutions.map((inst, iIdx) => (
                      <tr key={inst.id} style={{ backgroundColor: iIdx % 2 === 0 ? "#ffffff" : "#f1f5f9" }}>
                        <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center" }}>{iIdx + 1}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", fontWeight: 700, color: "#8E0033" }}>{inst.code}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", fontWeight: 600 }}>{inst.name}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", color: "#475569" }}>{inst.place || inst.district || "-"}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 800, color: "#8E0033" }}>{inst.candidatesCount}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center" }}>{inst.onStageCount}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center" }}>{inst.offStageCount}</td>
                        <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700 }}>{inst.totalAssignmentsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* SECTION 2: MASTER STATE REGISTRATION ROSTER */}
        {(activeTab === "ROSTER" || activeTab === "ZONE_PACK") && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #cbd5e1", padding: "20px", marginBottom: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📋</span> Master State Participant Registration Roster
                </h2>
                <p style={{ margin: "3px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                  Complete list of all qualified and assigned candidates participating in the Central State Final.
                </p>
              </div>

              {/* Action buttons (Screen) */}
              <div className="no-print" style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handlePrint("ROSTER")}
                  style={{ padding: "6px 14px", borderRadius: "6px", backgroundColor: "#0284c7", color: "#ffffff", border: "none", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}
                >
                  🖨️ Print Participant List
                </button>
                <button
                  onClick={handleExportCSV}
                  style={{ padding: "6px 14px", borderRadius: "6px", backgroundColor: "#059669", color: "#ffffff", border: "none", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}
                >
                  📥 Download CSV
                </button>
              </div>
            </div>

            {/* Filter Controls Bar (Screen only) */}
            <div className="no-print" style={{ backgroundColor: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "18px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              {/* Search Box */}
              <div style={{ flex: "1 1 240px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search name, chest no, college, program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Zone Filter */}
              <div>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">All Zones ({zones.length})</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>
                      {z.name} Zone ({z.totalCandidates})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stage Type Filter */}
              <div>
                <select
                  value={selectedStageType}
                  onChange={(e) => setSelectedStageType(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">All Stage Types</option>
                  <option value="ON_STAGE">On-Stage Only</option>
                  <option value="OFF_STAGE">Off-Stage Only</option>
                  <option value="BOTH">Both On &amp; Off Stage</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="FADHILA">Fadhila</option>
                  <option value="FADHEELA">Fadheela</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>

              {/* Reset Filter Button */}
              {(selectedZone !== "ALL" || selectedStageType !== "ALL" || selectedCategory !== "ALL" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedZone("ALL");
                    setSelectedStageType("ALL");
                    setSelectedCategory("ALL");
                    setSearchQuery("");
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#ef4444",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✕ Clear Filters
                </button>
              )}

              <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#64748b", fontWeight: 700 }}>
                Showing <strong>{filteredParticipants.length}</strong> of {participants.length} Candidates
              </div>
            </div>

            {/* Master Roster Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="table-print" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1e293b", color: "#ffffff", fontSize: "0.82rem" }}>
                    <th style={{ padding: "8px 10px", border: "1px solid #334155", textAlign: "center", width: "40px" }}>SL</th>
                    <th style={{ padding: "8px 10px", border: "1px solid #334155", textAlign: "center", width: "80px" }}>CHEST NO</th>
                    <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "220px" }}>CANDIDATE NAME</th>
                    <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "90px" }}>CATEGORY</th>
                    <th style={{ padding: "8px 10px", border: "1px solid #334155", width: "120px" }}>ZONE</th>
                    <th style={{ padding: "8px 10px", border: "1px solid #334155" }}>INSTITUTION / COLLEGE</th>
                    <th style={{ padding: "8px 10px", border: "1px solid #334155" }}>ASSIGNED STATE PROGRAMS</th>
                    <th style={{ padding: "8px 10px", border: "1px solid #334155", textAlign: "center", width: "60px" }}>ITEMS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "30px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                        No candidates match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p, idx) => (
                      <tr
                        key={p.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                          fontSize: "0.85rem",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                        className="page-break-inside-avoid"
                      >
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, border: "1px solid #cbd5e1" }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1" }}>
                          {p.chestNumber ? (
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(142,0,51,0.08)", color: "#8E0033", fontWeight: 900, border: "1px solid rgba(142,0,51,0.2)" }}>
                              #{p.chestNumber}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {p.photoUrl && (
                              <img
                                src={p.photoUrl}
                                alt={p.name}
                                style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: "1px solid #cbd5e1" }}
                                className="no-print"
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 800, color: "#0f172a" }}>{p.name}</div>
                              {p.uid && <div style={{ fontSize: "0.72rem", color: "#64748b" }}>UID: {p.uid}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>
                          <span style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#f1f5f9", color: "#334155", fontWeight: 700 }}>
                            {p.category}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>
                          <span style={{ fontWeight: 700, color: "#8E0033" }}>{p.zoneName}</span>
                        </td>
                        <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{p.institutionName}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                            Code: <strong>{p.institutionCode}</strong> {p.institutionDistrict ? `• ${p.institutionDistrict}` : ""}
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {p.programs.map((pr) => {
                              const isOnStage = pr.stageType === "ON_STAGE";
                              return (
                                <span
                                  key={pr.id + pr.code}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "0.74rem",
                                    fontWeight: 700,
                                    backgroundColor: isOnStage ? "#f5f3ff" : "#ecfdf5",
                                    color: isOnStage ? "#6d28d9" : "#047857",
                                    border: `1px solid ${isOnStage ? "#ddd6fe" : "#a7f3d0"}`,
                                  }}
                                >
                                  <span>#{pr.code}</span>
                                  <span>{pr.name}</span>
                                  <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>({isOnStage ? "ON" : "OFF"})</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 800, border: "1px solid #cbd5e1" }}>
                          {p.programs.length}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: OFFICIAL SIGNATURES & VERIFICATION (Included in print) */}
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "2px dashed #cbd5e1" }} className="page-break-inside-avoid">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", textAlign: "center" }}>
            <div>
              <div style={{ height: "45px" }}></div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 800, fontSize: "0.85rem", color: "#1e293b" }}>
                Facilities &amp; Stay Convener
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>CSWC Hiya Fiesta 2026</div>
            </div>
            <div>
              <div style={{ height: "45px" }}></div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 800, fontSize: "0.85rem", color: "#1e293b" }}>
                Food &amp; Catering In-Charge
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>State Festival Committee</div>
            </div>
            <div>
              <div style={{ height: "45px" }}></div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px", fontWeight: 800, fontSize: "0.85rem", color: "#1e293b" }}>
                General Convener / President
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Kerala State Wakf Board / CSWC</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
