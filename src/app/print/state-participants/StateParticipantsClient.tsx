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
  isPg?: boolean;
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
  isPg?: boolean;
  onStageCount: number;
  offStageCount: number;
  generalCount: number;
  pgOnStageCount: number;
  pgOffStageCount: number;
  needsVenueFacilities: boolean;
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
  venueFacilitiesCount: number;
  completedOffStageOnlyCount: number;
  totalAssignmentsCount: number;
}

export interface ZoneFacilitiesSummary {
  id: string;
  name: string;
  code: string;
  isPgZone?: boolean;
  totalInstitutions: number;
  totalCandidates: number;
  venueFacilitiesCandidates: number;
  completedOffStageOnlyCandidates: number;
  onStageCandidates: number;
  offStageCandidates: number;
  bothStageCandidates: number;
  generalCandidates: number;
  categoryBreakdown: {
    fadhila: number;
    fadheela: number;
    pg: number;
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
  totalVenueFacilitiesCandidates: number;
  totalCompletedOffStageOnlyCandidates: number;
  totalOnStageCandidates: number;
  totalOffStageCandidates: number;
  totalBothStageCandidates: number;
  totalGeneralCandidates: number;
  totalAssignments: number;
  totalFadhilaCandidates: number;
  totalFadheelaCandidates: number;
  totalPgCandidates: number;
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
  initialFacilityScope = "VENUE_ATTENDEES",
}: {
  festName: string;
  zones: ZoneFacilitiesSummary[];
  grandTotals: GrandFacilitiesTotals;
  participants: StateParticipant[];
  initialZoneId?: string;
  initialStageType?: string;
  initialFacilityScope?: string;
}) {
  const [activeTab, setActiveTab] = useState<"FACILITIES" | "ROSTER" | "ZONE_PACK">("FACILITIES");
  const [selectedZone, setSelectedZone] = useState<string>(initialZoneId);
  const [selectedStageType, setSelectedStageType] = useState<string>(initialStageType);
  const [facilityScope, setFacilityScope] = useState<string>(initialFacilityScope);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Facility scope filter
      if (facilityScope === "VENUE_ATTENDEES" && !p.needsVenueFacilities) return false;
      if (facilityScope === "COMPLETED_OFFSTAGE_ONLY" && p.needsVenueFacilities) return false;
      if (facilityScope === "STATE_ON_STAGE" && p.onStageCount === 0) return false;
      if (facilityScope === "PG_FEST" && !p.isPg) return false;

      // Zone filter
      if (selectedZone !== "ALL" && p.zoneName !== selectedZone && p.zoneId !== selectedZone) {
        return false;
      }

      // Stage type filter
      if (selectedStageType === "ON_STAGE" && p.onStageCount === 0 && (p.pgOnStageCount ?? 0) === 0) return false;
      if (selectedStageType === "OFF_STAGE" && p.offStageCount === 0 && (p.pgOffStageCount ?? 0) === 0) return false;
      if (
        selectedStageType === "BOTH" &&
        ((p.onStageCount === 0 && (p.pgOnStageCount ?? 0) === 0) ||
          (p.offStageCount === 0 && (p.pgOffStageCount ?? 0) === 0))
      )
        return false;

      // Category filter
      if (selectedCategory !== "ALL") {
        const cat = p.category.toUpperCase();
        if (selectedCategory === "FADHILA" && (!cat.includes("FADHILA") || cat.includes("FADHEELA"))) return false;
        if (selectedCategory === "FADHEELA" && !cat.includes("FADHEELA")) return false;
        if (selectedCategory === "PG" && !p.isPg) return false;
        if (selectedCategory === "GENERAL" && (cat.includes("FADHILA") || cat.includes("FADHEELA") || p.isPg)) return false;
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
  }, [participants, facilityScope, selectedZone, selectedStageType, selectedCategory, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Sl No",
      "Chest No",
      "Candidate Name",
      "UID",
      "Category",
      "Zone",
      "Venue Facilities Required?",
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
      p.needsVenueFacilities ? "YES (VENUE ATTENDEE)" : "NO (COMPLETED OFF-STAGE ONLY)",
      p.institutionCode,
      `"${p.institutionName.replace(/"/g, '""')}"`,
      p.institutionDistrict || "",
      p.onStageCount + (p.pgOnStageCount ?? 0),
      p.offStageCount + (p.pgOffStageCount ?? 0),
      p.programs.length,
      `"${p.programs.map((pr) => `[#${pr.code}] ${pr.name} (${pr.stageType}${pr.isPg ? " PG" : ""})`).join("; ").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `State_Venue_Participants_Register_${festName.replace(/\s+/g, "_")}.csv`);
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
            🖨️ Print Master Roster
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
            STATE FESTIVAL VENUE FACILITIES LOGISTICS &amp; PARTICIPANTS REGISTER
          </div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>
            Official Accommodation, Meals &amp; ID Badges Calculation • State On-Stage &amp; PG Fest Physical Attendees
          </div>
        </div>

        {/* LOGISTICS ALLOCATION POLICY BANNER */}
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1.5px solid #fde68a",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
          className="page-break-inside-avoid"
        >
          <span style={{ fontSize: "1.4rem" }}>📌</span>
          <div style={{ fontSize: "0.85rem", color: "#92400e", lineHeight: 1.5 }}>
            <strong style={{ fontSize: "0.92rem", color: "#b45309" }}>Facilities Allocation Policy for State Festival:</strong><br />
            • Regular State Off-Stage programs (23 programs) are <b>already completed</b> prior to the festival.<br />
            • Bed accommodation, meal catering, and physical ID badges are strictly calculated for <b>Physical Venue Attendees:</b>
            <span style={{ fontWeight: 800, color: "#8E0033", marginLeft: "4px" }}>
              State On-Stage Performers ({grandTotals.totalOnStageCandidates}) + Fadheela PG Fest Participants ({grandTotals.totalPgCandidates}) = {grandTotals.totalVenueFacilitiesCandidates} Total Venue Attendees (Beds)
            </span>.<br />
            • The <b>{grandTotals.totalCompletedOffStageOnlyCandidates} candidates</b> who only participated in completed regular off-stage programs are excluded from bed and catering counts to ensure zero facility waste.
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
              }}
            >
              📋 Master Registration Roster ({filteredParticipants.length})
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
              }}
            >
              🗂️ Zone-Wise Registration Pack
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b" }}>
              Active Venue Attendees: <strong style={{ color: "#059669", fontSize: "1.1rem" }}>{grandTotals.totalVenueFacilitiesCandidates} Beds Needed</strong>
            </span>
          </div>
        </div>

        {/* Executive KPI Metric Cards (Facilities Planning) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }} className="page-break-inside-avoid">
          {/* Active Venue Attendees (Beds) */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "2px solid #059669", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#059669", textTransform: "uppercase" }}>Venue Beds Required</span>
              <span style={{ fontSize: "1.4rem" }}>🛏️</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#059669", marginTop: "4px" }}>
              {grandTotals.facilities.recommendedBeds} Beds
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              {grandTotals.totalOnStageCandidates} State On-Stage + {grandTotals.totalPgCandidates} PG Fest
            </div>
          </div>

          {/* Daily Meals Estimate */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #0284c7", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0284c7", textTransform: "uppercase" }}>Estimated Daily Meals</span>
              <span style={{ fontSize: "1.4rem" }}>🍱</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0284c7", marginTop: "4px" }}>
              {grandTotals.facilities.dailyMealsEstimate} Meals
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              3 meals/day for {grandTotals.totalVenueFacilitiesCandidates} physical attendees
            </div>
          </div>

          {/* State On-Stage Performers */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #7c3aed", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase" }}>State On-Stage</span>
              <span style={{ fontSize: "1.4rem" }}>🎭</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#7c3aed", marginTop: "4px" }}>
              {grandTotals.totalOnStageCandidates}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Performers across 21 stage events
            </div>
          </div>

          {/* Fadheela PG Fest */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #b45309", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#b45309", textTransform: "uppercase" }}>Fadheela PG Fest</span>
              <span style={{ fontSize: "1.4rem" }}>🎓</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#b45309", marginTop: "4px" }}>
              {grandTotals.totalPgCandidates}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              PG Off-Stage &amp; On-Stage participants
            </div>
          </div>

          {/* Excluded: Completed Regular Off-Stage Only */}
          <div style={{ backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1.5px solid #94a3b8", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Completed Offstage Only</span>
              <span style={{ fontSize: "1.4rem" }}>🏁</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#64748b", marginTop: "4px" }}>
              {grandTotals.totalCompletedOffStageOnlyCandidates}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
              Already completed • No beds needed
            </div>
          </div>
        </div>

        {/* TAB 1: FACILITIES HEADCOUNT SUMMARY */}
        {activeTab === "FACILITIES" && (
          <div>
            <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: "30px" }}>
              <div style={{ padding: "14px 20px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "#8E0033" }}>
                  🏢 Zone-Wise Facilities &amp; Bed Requirements (Venue Attendees)
                </span>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Includes 7 Non-Karnataka Regular Zones + Fadheela PG Fest
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="table-print" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#8E0033", color: "#ffffff", fontSize: "0.78rem" }}>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028", width: "40px", textAlign: "center" }}>#</th>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028" }}>ZONE / CONTINGENT</th>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>COLLEGES</th>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center", backgroundColor: "#059669" }}>VENUE BEDS NEEDED</th>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center", backgroundColor: "#0284c7" }}>DAILY MEALS</th>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>STATE ON-STAGE</th>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>PG FEST</th>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center", color: "#fca5a5" }}>COMPLETED OFFSTAGE ONLY</th>
                      <th style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>TOTAL ENROLLED</th>
                      <th className="no-print" style={{ padding: "10px 12px", border: "1px solid #700028", textAlign: "center" }}>COLLEGES</th>
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
                            <span style={{ color: z.isPgZone ? "#b45309" : "#8E0033" }}>{z.name}</span>
                            <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", backgroundColor: z.isPgZone ? "#fef3c7" : "#f1f5f9", color: z.isPgZone ? "#b45309" : "#475569", border: "1px solid #cbd5e1", fontWeight: 700 }}>
                              {z.code}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 700 }}>
                          {z.totalInstitutions}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", backgroundColor: "rgba(5,150,105,0.08)", fontWeight: 900, color: "#059669", fontSize: "1.1rem" }}>
                          {z.facilities.recommendedBeds} beds
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 800, color: "#0284c7" }}>
                          {z.facilities.dailyMealsEstimate} plates
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", color: "#7c3aed", fontWeight: 700 }}>
                          {z.isPgZone ? "-" : z.onStageCandidates}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", color: "#b45309", fontWeight: 700 }}>
                          {z.isPgZone ? z.totalCandidates : "-"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", color: "#64748b", fontWeight: 600 }}>
                          {z.completedOffStageOnlyCandidates}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 700, color: "#334155" }}>
                          {z.totalCandidates}
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
                            {expandedZone === z.id ? "Hide" : `View (${z.institutions.length})`}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "#1e293b", color: "#ffffff", fontWeight: 900, fontSize: "0.95rem" }}>
                      <td colSpan={2} style={{ padding: "12px", textAlign: "right", border: "1px solid #0f172a" }}>
                        GRAND TOTAL (VENUE LOGISTICS):
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                        {grandTotals.totalInstitutions}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a", backgroundColor: "#059669", fontSize: "1.25rem", fontWeight: 900 }}>
                        {grandTotals.facilities.recommendedBeds} BEDS
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a", color: "#38bdf8" }}>
                        {grandTotals.facilities.dailyMealsEstimate}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                        {grandTotals.totalOnStageCandidates}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                        {grandTotals.totalPgCandidates}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a", color: "#cbd5e1" }}>
                        {grandTotals.totalCompletedOffStageOnlyCandidates}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", border: "1px solid #0f172a" }}>
                        {grandTotals.totalCandidates}
                      </td>
                      <td className="no-print" style={{ border: "1px solid #0f172a" }} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* College breakdown for expanded zone */}
            {expandedZone && (
              <div className="no-print" style={{ backgroundColor: "#ffffff", padding: "18px 20px", borderRadius: "10px", border: "1.5px solid #8E0033", marginBottom: "24px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#8E0033", fontSize: "1rem" }}>
                  🏛️ Participating Colleges Breakdown: {zones.find((z) => z.id === expandedZone)?.name}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                  {zones
                    .find((z) => z.id === expandedZone)
                    ?.institutions.map((inst) => (
                      <div key={inst.id} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#1e293b" }}>{inst.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Code: {inst.code} • {inst.place}</div>
                        <div style={{ marginTop: "6px", fontSize: "0.8rem", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ color: "#059669", fontWeight: 700 }}>Venue Beds: {inst.venueFacilitiesCount}</span>
                          <span style={{ color: "#7c3aed" }}>On-Stage: {inst.onStageCount}</span>
                          <span style={{ color: "#64748b" }}>Total Cands: {inst.candidatesCount}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MASTER PARTICIPANTS REGISTRATION ROSTER */}
        {(activeTab === "ROSTER" || activeTab === "ZONE_PACK") && (
          <div>
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>
                  📋 Master State Participants Roster
                </h3>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                  Showing <b>{filteredParticipants.length}</b> candidates (Filtered by venue facility attendance and zone)
                </div>
              </div>

              {/* Action buttons (Screen) */}
              <div className="no-print" style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handlePrint("ROSTER")}
                  style={{ padding: "6px 14px", borderRadius: "6px", backgroundColor: "#0284c7", color: "#ffffff", border: "none", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}
                >
                  🖨️ Print List
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
              {/* Facility Scope Filter Buttons */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", width: "100%", paddingBottom: "8px", borderBottom: "1px solid #cbd5e1" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Attendance Scope:</span>
                <button
                  onClick={() => setFacilityScope("VENUE_ATTENDEES")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    border: facilityScope === "VENUE_ATTENDEES" ? "2px solid #059669" : "1px solid #cbd5e1",
                    backgroundColor: facilityScope === "VENUE_ATTENDEES" ? "#059669" : "#ffffff",
                    color: facilityScope === "VENUE_ATTENDEES" ? "#ffffff" : "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  🎯 Active Venue Facilities Required ({grandTotals.totalVenueFacilitiesCandidates})
                </button>
                <button
                  onClick={() => setFacilityScope("ALL")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    border: facilityScope === "ALL" ? "2px solid #1e293b" : "1px solid #cbd5e1",
                    backgroundColor: facilityScope === "ALL" ? "#1e293b" : "#ffffff",
                    color: facilityScope === "ALL" ? "#ffffff" : "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  All Registered Roster ({grandTotals.totalCandidates})
                </button>
                <button
                  onClick={() => setFacilityScope("STATE_ON_STAGE")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    border: facilityScope === "STATE_ON_STAGE" ? "2px solid #7c3aed" : "1px solid #cbd5e1",
                    backgroundColor: facilityScope === "STATE_ON_STAGE" ? "#7c3aed" : "#ffffff",
                    color: facilityScope === "STATE_ON_STAGE" ? "#ffffff" : "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  🎭 State On-Stage ({grandTotals.totalOnStageCandidates})
                </button>
                <button
                  onClick={() => setFacilityScope("PG_FEST")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    border: facilityScope === "PG_FEST" ? "2px solid #b45309" : "1px solid #cbd5e1",
                    backgroundColor: facilityScope === "PG_FEST" ? "#b45309" : "#ffffff",
                    color: facilityScope === "PG_FEST" ? "#ffffff" : "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  🎓 Fadheela PG Fest ({grandTotals.totalPgCandidates})
                </button>
                <button
                  onClick={() => setFacilityScope("COMPLETED_OFFSTAGE_ONLY")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    border: facilityScope === "COMPLETED_OFFSTAGE_ONLY" ? "2px solid #64748b" : "1px solid #cbd5e1",
                    backgroundColor: facilityScope === "COMPLETED_OFFSTAGE_ONLY" ? "#64748b" : "#ffffff",
                    color: facilityScope === "COMPLETED_OFFSTAGE_ONLY" ? "#ffffff" : "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  🏁 Completed Off-Stage Only ({grandTotals.totalCompletedOffStageOnlyCandidates})
                </button>
              </div>

              {/* Search Box */}
              <div style={{ flex: "1 1 240px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search candidate name, chest no, college, program..."
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
                      {z.name} ({z.totalCandidates})
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

              {/* Reset Filter Button */}
              {(selectedZone !== "ALL" || selectedStageType !== "ALL" || facilityScope !== "VENUE_ATTENDEES" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedZone("ALL");
                    setSelectedStageType("ALL");
                    setFacilityScope("VENUE_ATTENDEES");
                    setSearchQuery("");
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Roster Table */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #cbd5e1", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="table-print" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", color: "#1e293b", fontSize: "0.78rem", borderBottom: "2px solid #cbd5e1" }}>
                      <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1", width: "40px", textAlign: "center" }}>#</th>
                      <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1", width: "80px", textAlign: "center" }}>CHEST NO</th>
                      <th style={{ padding: "8px 12px", border: "1px solid #cbd5e1" }}>CANDIDATE NAME</th>
                      <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1", textAlign: "center" }}>ZONE</th>
                      <th style={{ padding: "8px 12px", border: "1px solid #cbd5e1" }}>COLLEGE / INSTITUTION</th>
                      <th style={{ padding: "8px 10px", border: "1px solid #cbd5e1", textAlign: "center" }}>VENUE ATTENDANCE</th>
                      <th style={{ padding: "8px 12px", border: "1px solid #cbd5e1" }}>ASSIGNED PROGRAMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                          No candidates found matching the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((p, idx) => (
                        <tr
                          key={p.id}
                          style={{
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                            fontSize: "0.82rem",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <td style={{ padding: "7px 10px", border: "1px solid #cbd5e1", textAlign: "center", color: "#64748b", fontWeight: 700 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "7px 10px", border: "1px solid #cbd5e1", textAlign: "center" }}>
                            <span style={{ display: "inline-block", padding: "2px 8px", backgroundColor: "#f1f5f9", color: "#0f172a", borderRadius: "4px", fontWeight: 900, border: "1px solid #cbd5e1" }}>
                              {p.chestNumber || "N/A"}
                            </span>
                          </td>
                          <td style={{ padding: "7px 12px", border: "1px solid #cbd5e1" }}>
                            <div style={{ fontWeight: 800, color: "#0f172a" }}>{p.name}</div>
                            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                              {p.category} {p.uid ? `• UID: ${p.uid}` : ""}
                            </div>
                          </td>
                          <td style={{ padding: "7px 10px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700, color: p.isPg ? "#b45309" : "#8E0033" }}>
                            {p.zoneName}
                          </td>
                          <td style={{ padding: "7px 12px", border: "1px solid #cbd5e1" }}>
                            <div style={{ fontWeight: 700, color: "#1e293b" }}>{p.institutionName}</div>
                            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{p.institutionPlace || p.institutionDistrict}</div>
                          </td>
                          <td style={{ padding: "7px 10px", border: "1px solid #cbd5e1", textAlign: "center" }}>
                            {p.needsVenueFacilities ? (
                              <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 800, backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                                🎪 Bed Required ({p.onStageCount + (p.pgOnStageCount ?? 0)} Stage)
                              </span>
                            ) : (
                              <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1" }}>
                                🏁 Completed Offstage Only
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "7px 12px", border: "1px solid #cbd5e1" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {p.programs.map((pr) => (
                                <span
                                  key={pr.id}
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    backgroundColor: pr.stageType === "ON_STAGE" ? "#fdf2f8" : "#f0fdf4",
                                    color: pr.stageType === "ON_STAGE" ? "#8E0033" : "#15803d",
                                    border: `1px solid ${pr.stageType === "ON_STAGE" ? "#fbcfe8" : "#bbf7d0"}`,
                                  }}
                                >
                                  #{pr.code} {pr.name} ({pr.stageType === "ON_STAGE" ? "Stage" : "Off"})
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Printable Official Signatory Block */}
        <div
          style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1.5px dashed #cbd5e1",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            textAlign: "center",
          }}
          className="page-break-inside-avoid"
        >
          <div>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px solid #64748b", paddingTop: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
              Convenor / Reception Committee
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>CSWC Hiya Fiesta 2026</div>
          </div>
          <div>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px solid #64748b", paddingTop: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
              General Secretary
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Council of Shariah Women Colleges</div>
          </div>
          <div>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px solid #64748b", paddingTop: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
              State Festival Director
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Hiya Fiesta State Finals</div>
          </div>
        </div>
      </div>
    </div>
  );
}
