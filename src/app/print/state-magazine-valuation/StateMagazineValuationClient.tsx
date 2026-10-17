"use client";

import React, { useState, useMemo } from "react";
import PrintButton from "@/components/PrintButton";

export type MagazineEntry = {
  teamId: string;
  teamName: string;
  institutionId: string | null;
  institutionName: string;
  institutionCode: string | null;
  institutionPlace: string | null;
  zoneId: string | null;
  zoneName: string;
  zoneCode: string;
  zonalMagazineCode: string | null;
  isZonalWinner: boolean;
  zonalRank: number | null;
  zonalGrade: string | null;
  isKarnataka: boolean;
};

interface StateMagazineValuationClientProps {
  initialMagazines: MagazineEntry[];
  festName: string;
  festMoto?: string;
  programDetails: {
    id: string;
    programCode: string;
    name: string;
    description?: string | null;
    evaluationCriteria?: string | null;
  };
}

export default function StateMagazineValuationClient({
  initialMagazines,
  festName,
  festMoto,
  programDetails,
}: StateMagazineValuationClientProps) {
  const [filterMode, setFilterMode] = useState<"winners" | "kerala_all" | "all">("winners");
  const [codeScheme, setCodeScheme] = useState<"SMAG" | "NUM" | "ZONE" | "CUSTOM">("SMAG");
  const [customPrefix, setCustomPrefix] = useState<string>("ST-MAG-");
  const [blindMode, setBlindMode] = useState<boolean>(false);
  const [showZonalCode, setShowZonalCode] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [selectedZone, setSelectedZone] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"zone" | "name" | "zonalCode">("zone");

  // User manual overrides for any row: teamId -> custom code
  const [manualCodes, setManualCodes] = useState<Record<string, string>>({});

  // Unique list of zones for zone filter dropdown
  const availableZones = useMemo(() => {
    const map = new Map<string, string>();
    initialMagazines.forEach((m) => {
      if (m.zoneName) map.set(m.zoneName, m.zoneName);
    });
    return Array.from(map.values()).sort();
  }, [initialMagazines]);

  // Filtered list based on filterMode and selectedZone
  const displayedMagazines = useMemo(() => {
    let list = initialMagazines.filter((m) => {
      if (filterMode === "winners") {
        return m.isZonalWinner && !m.isKarnataka;
      }
      if (filterMode === "kerala_all") {
        return !m.isKarnataka;
      }
      return true; // 'all'
    });

    if (selectedZone !== "ALL") {
      list = list.filter((m) => m.zoneName === selectedZone);
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "zone") {
        const cmp = a.zoneName.localeCompare(b.zoneName);
        if (cmp !== 0) return cmp;
        return a.institutionName.localeCompare(b.institutionName);
      }
      if (sortBy === "name") {
        return a.institutionName.localeCompare(b.institutionName);
      }
      if (sortBy === "zonalCode") {
        return (a.zonalMagazineCode || "").localeCompare(b.zonalMagazineCode || "");
      }
      return 0;
    });

    return sorted;
  }, [initialMagazines, filterMode, selectedZone, sortBy]);

  // Compute assigned State Code for each item
  const getAssignedCode = (item: MagazineEntry, index: number) => {
    if (manualCodes[item.teamId] !== undefined) {
      return manualCodes[item.teamId];
    }
    const num = String(index + 1).padStart(2, "0");
    if (codeScheme === "SMAG") {
      return `SMAG-${num}`;
    }
    if (codeScheme === "NUM") {
      return `${index + 1}`;
    }
    if (codeScheme === "ZONE") {
      const zPrefix = (item.zoneCode || item.zoneName.substring(0, 3)).toUpperCase();
      return `${zPrefix}-${num}`;
    }
    if (codeScheme === "CUSTOM") {
      return `${customPrefix}${num}`;
    }
    return `SMAG-${num}`;
  };

  const handleManualCodeChange = (teamId: string, val: string) => {
    setManualCodes((prev) => ({
      ...prev,
      [teamId]: val,
    }));
  };

  const resetCodes = () => {
    setManualCodes({});
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", padding: "16px", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ─── Screen Controls (Hidden during Print) ─── */}
      <div className="no-print" style={{
        maxWidth: "1280px",
        margin: "0 auto 20px auto",
        backgroundColor: "#ffffff",
        border: "1.5px solid #7e22ce",
        borderRadius: "10px",
        padding: "16px 20px",
        boxShadow: "0 4px 16px rgba(126, 34, 206, 0.08)",
      }}>
        {/* Top Bar: Title & Primary Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #f3e8ff", paddingBottom: "12px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.8rem" }}>📖</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "#581c87" }}>
                  State Magazine Valuation Sheet
                </h1>
                <span style={{ backgroundColor: "#7e22ce", color: "#ffffff", fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: "12px", letterSpacing: "0.5px" }}>
                  NEW CODE ASSIGNMENT
                </span>
                <span style={{ backgroundColor: "#f3e8ff", color: "#7e22ce", border: "1px solid #d8b4fe", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
                  PROGRAM 43
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
                Resolves duplicate zonal codes by assigning distinct New State Codes for anonymous or standard judging.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <PrintButton />
            <button
              onClick={() => window.history.back()}
              style={{
                padding: "8px 14px",
                backgroundColor: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Filter & Code Options Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", fontSize: "0.85rem" }}>
          {/* 1. Scope / Candidates Filter */}
          <div>
            <label style={{ display: "block", fontWeight: 800, color: "#374151", marginBottom: "6px" }}>
              📋 Magazine Participant Scope:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setFilterMode("winners")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: filterMode === "winners" ? "2px solid #7e22ce" : "1px solid #cbd5e1",
                  backgroundColor: filterMode === "winners" ? "#faf5ff" : "#ffffff",
                  color: filterMode === "winners" ? "#7e22ce" : "#475569",
                  fontWeight: filterMode === "winners" ? 800 : 500,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>★ 1st Place Zone Winners (State Finalists)</span>
                <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "8px", backgroundColor: filterMode === "winners" ? "#7e22ce" : "#e2e8f0", color: filterMode === "winners" ? "#ffffff" : "#475569", fontWeight: 800 }}>
                  {initialMagazines.filter((m) => m.isZonalWinner && !m.isKarnataka).length} Mags
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("kerala_all")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: filterMode === "kerala_all" ? "2px solid #7e22ce" : "1px solid #cbd5e1",
                  backgroundColor: filterMode === "kerala_all" ? "#faf5ff" : "#ffffff",
                  color: filterMode === "kerala_all" ? "#7e22ce" : "#475569",
                  fontWeight: filterMode === "kerala_all" ? 800 : 500,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>All Submitted Magazines (Kerala 7 Zones)</span>
                <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "8px", backgroundColor: filterMode === "kerala_all" ? "#7e22ce" : "#e2e8f0", color: filterMode === "kerala_all" ? "#ffffff" : "#475569", fontWeight: 800 }}>
                  {initialMagazines.filter((m) => !m.isKarnataka).length} Mags
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("all")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: filterMode === "all" ? "2px solid #7e22ce" : "1px solid #cbd5e1",
                  backgroundColor: filterMode === "all" ? "#faf5ff" : "#ffffff",
                  color: filterMode === "all" ? "#7e22ce" : "#475569",
                  fontWeight: filterMode === "all" ? 800 : 500,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>All Zones (Include Karnataka / PG)</span>
                <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "8px", backgroundColor: filterMode === "all" ? "#7e22ce" : "#e2e8f0", color: filterMode === "all" ? "#ffffff" : "#475569", fontWeight: 800 }}>
                  {initialMagazines.length} Mags
                </span>
              </button>
            </div>
          </div>

          {/* 2. New Code Format Scheme */}
          <div>
            <label style={{ display: "block", fontWeight: 800, color: "#374151", marginBottom: "6px" }}>
              🏷️ New State Code Format:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <select
                value={codeScheme}
                onChange={(e) => setCodeScheme(e.target.value as any)}
                style={{
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1.5px solid #7e22ce",
                  backgroundColor: "#faf5ff",
                  fontWeight: 700,
                  color: "#581c87",
                  cursor: "pointer",
                }}
              >
                <option value="SMAG">SMAG-01, SMAG-02... (Recommended)</option>
                <option value="NUM">1, 2, 3... (Simple Numbers)</option>
                <option value="ZONE">PKD-01, TSR-01... (Zone Prefixed)</option>
                <option value="CUSTOM">Custom Prefix...</option>
              </select>

              {codeScheme === "CUSTOM" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#475569" }}>Prefix:</span>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder="e.g. ST-MAG-"
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  />
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={resetCodes}
                  title="Reset any manual edits back to sequential generated codes"
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  ↺ Reset Manual Overrides
                </button>
                <span style={{ fontSize: "0.72rem", color: "#64748b", fontStyle: "italic" }}>
                  (You can also edit any code in table)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Valuation Mode & Display Options */}
          <div>
            <label style={{ display: "block", fontWeight: 800, color: "#374151", marginBottom: "6px" }}>
              ⚙️ Valuation Options:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem" }}>
                <input
                  type="checkbox"
                  checked={blindMode}
                  onChange={(e) => setBlindMode(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#7e22ce" }}
                />
                <span style={{ fontWeight: blindMode ? 800 : 500, color: blindMode ? "#b45309" : "#334155" }}>
                  🙈 Blind Valuation Mode (Hide Institution &amp; Zone)
                </span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem" }}>
                <input
                  type="checkbox"
                  checked={showZonalCode}
                  onChange={(e) => setShowZonalCode(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#7e22ce" }}
                />
                <span style={{ fontWeight: 500, color: "#334155" }}>
                  Show Zonal Magazine Code Column
                </span>
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                <span style={{ fontSize: "0.78rem", color: "#475569" }}>Layout:</span>
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: orientation === "landscape" ? "1.5px solid #7e22ce" : "1px solid #cbd5e1",
                    backgroundColor: orientation === "landscape" ? "#f3e8ff" : "#ffffff",
                    fontSize: "0.75rem",
                    fontWeight: orientation === "landscape" ? 800 : 500,
                    cursor: "pointer",
                  }}
                >
                  Landscape (Wide)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: orientation === "portrait" ? "1.5px solid #7e22ce" : "1px solid #cbd5e1",
                    backgroundColor: orientation === "portrait" ? "#f3e8ff" : "#ffffff",
                    fontSize: "0.75rem",
                    fontWeight: orientation === "portrait" ? 800 : 500,
                    cursor: "pointer",
                  }}
                >
                  Portrait
                </button>
              </div>
            </div>
          </div>

          {/* 4. Zone Filter & Sorting */}
          <div>
            <label style={{ display: "block", fontWeight: 800, color: "#374151", marginBottom: "6px" }}>
              🔍 Filter &amp; Sort:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "#475569", width: "42px" }}>Zone:</span>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  style={{ flex: 1, padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", fontWeight: 600 }}
                >
                  <option value="ALL">All Zones ({availableZones.length})</option>
                  {availableZones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "#475569", width: "42px" }}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{ flex: 1, padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", fontWeight: 600 }}
                >
                  <option value="zone">Sort by Zone</option>
                  <option value="name">Sort by Institution Name</option>
                  <option value="zonalCode">Sort by Zonal Code</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Printable Document ─── */}
      <div style={{
        maxWidth: orientation === "landscape" ? "1240px" : "900px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        padding: "24px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}>
        {/* Header */}
        <div style={{ borderBottom: "2px solid #581c87", paddingBottom: "10px", marginBottom: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "#581c87" }}>
            {festName}
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#374151", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: "2px" }}>
            CSWC STATE FESTIVAL 2026 • STATE MAGAZINE VALUATION &amp; MARK ENTRY RECORD
          </div>
          {festMoto && (
            <div style={{ fontSize: "0.74rem", fontStyle: "italic", color: "#6b7280", marginTop: "1px" }}>
              &ldquo;{festMoto}&rdquo;
            </div>
          )}
        </div>

        {/* Program Meta Box */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.8fr 1fr",
          gap: "12px",
          backgroundColor: "#faf5ff",
          border: "1.5px solid #7e22ce",
          borderRadius: "6px",
          padding: "10px 14px",
          marginBottom: "10px",
          fontSize: "0.82rem",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
              <span style={{ backgroundColor: "#7e22ce", color: "#ffffff", padding: "2px 8px", borderRadius: "4px", fontWeight: 900, fontSize: "0.82rem", fontFamily: "monospace" }}>
                CODE: {programDetails.programCode || "43"}
              </span>
              <strong style={{ fontSize: "1.08rem", color: "#581c87" }}>
                {programDetails.name} (മാഗസിൻ മൂല്യനിർണ്ണയം)
              </strong>
              <span style={{ backgroundColor: "#f3e8ff", color: "#7e22ce", border: "1px solid #d8b4fe", fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: "4px" }}>
                📖 STATE FINAL EVALUATION
              </span>
              {blindMode && (
                <span style={{ backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: "4px" }}>
                  🙈 BLIND VALUATION ACTIVE
                </span>
              )}
            </div>
            <div style={{ color: "#334155", fontSize: "0.78rem" }}>
              <strong>Category:</strong> General &bull; <strong>Stage Type:</strong> Off-Stage &bull; <strong>Maximum Marks:</strong> 100 &bull; <strong>Evaluation Mode:</strong> Physical Copy Review
            </div>
          </div>

          <div style={{ textAlign: "right", borderLeft: "1px solid #e9d5ff", paddingLeft: "12px" }}>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#581c87" }}>
              {filterMode === "winners" ? "★ ZONE 1ST PLACE FINALISTS" : "STATE PARTICIPATING INSTITUTIONS"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
              Total Evaluated Magazines: <strong style={{ color: "#7e22ce", fontSize: "0.95rem" }}>{displayedMagazines.length}</strong>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "2px" }}>
              Code Scheme: <strong>{codeScheme === "SMAG" ? "State Magazine (SMAG)" : codeScheme}</strong>
            </div>
          </div>
        </div>

        {/* Valuation Protocol Instructions */}
        <div style={{
          padding: "8px 12px",
          backgroundColor: "#faf5ff",
          border: "1.5px solid #d8b4fe",
          borderRadius: "6px",
          fontSize: "0.74rem",
          color: "#581c87",
          marginBottom: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
            <span>
              <strong>📖 State Magazine Valuation Protocol:</strong> Evaluate physical copies by the assigned <strong>New State Code</strong>. Mark entry must be in ink without overwriting.
            </span>
            <span>
              <strong>Evaluation Scheme:</strong> Maximum Score (100) &bull; Obtained Score &bull; Grade (A/B/C) &bull; Place (1st, 2nd, 3rd)
            </span>
          </div>
          {programDetails.evaluationCriteria ? (
            <div style={{ fontSize: "0.72rem", color: "#6b21a8", borderTop: "1px dashed #d8b4fe", paddingTop: "4px" }}>
              <strong>മൂല്യനിർണ്ണയ മാനദണ്ഡങ്ങൾ (Official Criteria):</strong> {programDetails.evaluationCriteria}
            </div>
          ) : (
            <div style={{ fontSize: "0.72rem", color: "#6b21a8", borderTop: "1px dashed #d8b4fe", paddingTop: "4px" }}>
              <strong>മൂല്യനിർണ്ണയ മാനദണ്ഡങ്ങൾ (Evaluation Criteria):</strong> ആശയപരമായ ഉള്ളടക്കം &bull; ഭാഷാശുദ്ധിയും സാഹിത്യമൂല്യവും &bull; ഡിസൈൻ, ലേഔട്ട് &bull; എഡിറ്റിംഗ് മികവ്.
            </div>
          )}
        </div>

        {/* Mark Entry Table */}
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: orientation === "landscape" ? "0.85rem" : "0.8rem",
          border: "1.5px solid #0f172a",
          marginBottom: "14px",
        }}>
          <thead>
            <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center" }}>
              <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "32px" }}>Sl</th>
              <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "130px", backgroundColor: "#581c87" }}>
                New State Code
              </th>
              {showZonalCode && (
                <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "100px", backgroundColor: "#1e1b4b" }}>
                  Zonal Code
                </th>
              )}
              {!blindMode && (
                <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "120px" }}>
                  Zone
                </th>
              )}
              <th style={{ border: "1px solid #0f172a", padding: "8px 8px", textAlign: "left" }}>
                {blindMode ? "Magazine Identification Token" : "Institution / Magazine Name"}
              </th>
              {!blindMode && (
                <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "85px" }}>
                  Inst. Code
                </th>
              )}
              <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "95px" }}>
                Max Score
              </th>
              <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "115px", backgroundColor: "#1e293b" }}>
                Obtained Score
              </th>
              <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "65px" }}>
                Grade
              </th>
              <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "65px" }}>
                Place
              </th>
              <th style={{ border: "1px solid #0f172a", padding: "8px 6px", textAlign: "left", width: "120px" }}>
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedMagazines.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  No magazines found matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              displayedMagazines.map((m, idx) => {
                const assignedCode = getAssignedCode(m, idx);
                return (
                  <tr key={m.teamId} style={{ borderBottom: "1px solid #94a3b8" }}>
                    {/* Sl No */}
                    <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>
                      {idx + 1}
                    </td>

                    {/* New State Code */}
                    <td style={{ border: "1px solid #0f172a", padding: "4px 6px", textAlign: "center" }}>
                      <span className="print-only" style={{
                        display: "inline-block",
                        backgroundColor: "#faf5ff",
                        border: "2px solid #7e22ce",
                        color: "#581c87",
                        fontWeight: 900,
                        fontSize: "0.95rem",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        letterSpacing: "0.5px",
                      }}>
                        {assignedCode}
                      </span>
                      {/* On-screen editable code */}
                      <span className="no-print">
                        <input
                          type="text"
                          value={assignedCode}
                          onChange={(e) => handleManualCodeChange(m.teamId, e.target.value)}
                          title="Click to customize this New State Code"
                          style={{
                            width: "95px",
                            textAlign: "center",
                            backgroundColor: "#faf5ff",
                            border: "1.5px solid #7e22ce",
                            color: "#581c87",
                            fontWeight: 900,
                            fontSize: "0.9rem",
                            padding: "2px 4px",
                            borderRadius: "4px",
                            fontFamily: "monospace",
                          }}
                        />
                      </span>
                    </td>

                    {/* Zonal Magazine Code */}
                    {showZonalCode && (
                      <td style={{ border: "1px solid #0f172a", padding: "6px 6px", textAlign: "center" }}>
                        {m.zonalMagazineCode ? (
                          <span style={{
                            display: "inline-block",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #64748b",
                            color: "#334155",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontFamily: "monospace",
                          }}>
                            {m.zonalMagazineCode}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.75rem", fontStyle: "italic" }}>—</span>
                        )}
                      </td>
                    )}

                    {/* Zone */}
                    {!blindMode && (
                      <td style={{ border: "1px solid #0f172a", padding: "6px 6px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block",
                          backgroundColor: "#f1f5f9",
                          color: "#1e293b",
                          fontWeight: 800,
                          fontSize: "0.78rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}>
                          {m.zoneName}
                        </span>
                        {m.isZonalWinner && (
                          <div style={{ fontSize: "0.68rem", color: "#15803d", fontWeight: 800, marginTop: "2px" }}>
                            ★ Zone 1st Place
                          </div>
                        )}
                      </td>
                    )}

                    {/* Institution Name */}
                    <td style={{ border: "1px solid #0f172a", padding: "6px 8px", textAlign: "left" }}>
                      {blindMode ? (
                        <div style={{ color: "#475569", fontStyle: "italic", fontSize: "0.82rem" }}>
                          [Hidden in Blind Judging Mode] &bull; Ref: {assignedCode}
                        </div>
                      ) : (
                        <div>
                          <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>
                            {m.institutionName}
                          </strong>
                          {m.institutionPlace && (
                            <span style={{ color: "#64748b", fontSize: "0.75rem", marginLeft: "6px" }}>
                              ({m.institutionPlace})
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Institution Code */}
                    {!blindMode && (
                      <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontFamily: "monospace", fontSize: "0.78rem", color: "#475569" }}>
                        {m.institutionCode || "—"}
                      </td>
                    )}

                    {/* Maximum Score */}
                    <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                      100
                    </td>

                    {/* Obtained Score Box */}
                    <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}>
                      <div style={{ height: "26px", border: "1px dashed #cbd5e1", borderRadius: "3px" }} />
                    </td>

                    {/* Grade Box */}
                    <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}>
                      <div style={{ height: "26px", border: "1px dashed #cbd5e1", borderRadius: "3px" }} />
                    </td>

                    {/* Place Box */}
                    <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}>
                      <div style={{ height: "26px", border: "1px dashed #cbd5e1", borderRadius: "3px" }} />
                    </td>

                    {/* Remarks */}
                    <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "left" }}>
                      <div style={{ height: "26px", border: "1px dashed #cbd5e1", borderRadius: "3px" }} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Official Signatures ── */}
        <div style={{
          marginTop: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "14px",
          borderTop: "1.5px solid #0f172a",
          paddingTop: "14px",
          fontSize: "0.78rem",
          pageBreakInside: "avoid",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px dashed #0f172a", paddingTop: "4px", fontWeight: 700 }}>
              Judge 1 Signature
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Name &amp; Designation</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px dashed #0f172a", paddingTop: "4px", fontWeight: 700 }}>
              Judge 2 Signature
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Name &amp; Designation</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px dashed #0f172a", paddingTop: "4px", fontWeight: 700 }}>
              Judge 3 Signature
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Name &amp; Designation</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ height: "45px" }} />
            <div style={{ borderTop: "1px dashed #0f172a", paddingTop: "4px", fontWeight: 700 }}>
              Chief Evaluator / Convener
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Date &amp; Official Seal</div>
          </div>
        </div>

        {/* Footer Audit Notice */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", borderTop: "1px solid #e2e8f0", paddingTop: "6px", fontSize: "0.68rem", color: "#64748b" }}>
          <span>CSWC Hiya Fiesta 2026 State Final &bull; State Magazine Evaluation Record (Program 43)</span>
          <span>Printed on: {new Date().toLocaleString()} &bull; Total Entries: {displayedMagazines.length}</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: inline-block !important;
          }
          body {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: ${orientation === "landscape" ? "A4 landscape" : "A4 portrait"};
            margin: 10mm 12mm;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
