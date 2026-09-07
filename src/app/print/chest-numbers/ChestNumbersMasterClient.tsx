"use client";

import React, { useState, useTransition } from "react";
import PrintButton from "@/components/PrintButton";
import { confirmTeamRegistration } from "@/app/dashboard/teams/actions";

type PendingInstitution = {
  institutionId: string;
  teamId: string;
  code: string;
  name: string;
  place: string | null;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  magazineCode: string | null;
  isOffConfirmed: boolean;
  isOnConfirmed: boolean;
  totalCandidates: number;
  pendingCount: number;
  confirmedCount: number;
  pendingList: {
    id: string;
    name: string;
    uid: string | null;
    photo: string | null;
    categoryName: string;
    programs: { code: string | null; name: string; stageType: string }[];
  }[];
};

type CandidateItem = {
  id: string;
  name: string;
  uid: string | null;
  chestNumber: string | null;
  photo: string | null;
  categoryId: string;
  categoryName: string;
  institutionId: string;
  institutionCode: string | null;
  institutionName: string;
  institutionPlace: string | null;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  teamId: string;
  isConfirmed: boolean;
  programs: { id?: string; code?: string | null; name?: string; stageType?: string }[];
};

interface Props {
  festName: string;
  festMoto?: string;
  userRole: string;
  userZoneId: string | null;
  totalCandidatesCount: number;
  confirmedCount: number;
  pendingCount: number;
  duplicateCount: number;
  duplicateNumbers: string[];
  pendingByZone: Record<string, { zoneCode: string; zoneName: string; institutions: PendingInstitution[] }>;
  pendingInstitutions: PendingInstitution[];
  allCandidates: CandidateItem[];
  zones: { id: string; code: string; name: string }[];
  institutions: { id: string; code: string; name: string; place: string | null; zoneId: string; zoneCode: string; zoneName: string }[];
  initialTab?: string;
  initialZoneId?: string | null;
  initialInstitutionId?: string | null;
}

export default function ChestNumbersMasterClient({
  festName,
  festMoto,
  userRole,
  userZoneId,
  totalCandidatesCount,
  confirmedCount,
  pendingCount,
  duplicateCount,
  duplicateNumbers,
  pendingByZone,
  pendingInstitutions,
  allCandidates,
  zones,
  institutions,
  initialTab,
  initialZoneId,
  initialInstitutionId,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>(initialTab || "pending");
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialZoneId || "ALL");
  const [selectedInstId, setSelectedInstId] = useState<string>(initialInstitutionId || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "badges">("table");
  const [expandedInsts, setExpandedInsts] = useState<Record<string, boolean>>({});
  const [isPendingConfirm, startTransition] = useTransition();
  const [confirmFeedback, setConfirmFeedback] = useState<{ id: string; msg: string; error?: boolean } | null>(null);

  // Toggle accordion in Pending tab
  const toggleExpand = (teamId: string) => {
    setExpandedInsts((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Confirm Team Action handler
  const handleConfirmTeam = (teamId: string, stageType: "OFF_STAGE" | "ALL") => {
    if (!confirm(`Are you sure you want to confirm this institution and generate official consecutive chest numbers for its candidates?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await confirmTeamRegistration(teamId, stageType);
        if (res.success) {
          setConfirmFeedback({ id: teamId, msg: `✅ Successfully confirmed! Chest numbers assigned.` });
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setConfirmFeedback({ id: teamId, msg: `❌ Error: ${res.error || "Failed to confirm"}`, error: true });
        }
      } catch (err: any) {
        setConfirmFeedback({ id: teamId, msg: `❌ Error: ${err?.message || "Failed"}`, error: true });
      }
    });
  };

  // Filter candidates for Master / Zone / Institution views
  const filteredCandidates = allCandidates.filter((c) => {
    // Tab specific filter
    if (activeTab === "institution") {
      if (selectedInstId !== "ALL" && c.institutionId !== selectedInstId) return false;
    } else if (activeTab === "zone") {
      if (selectedZoneId !== "ALL" && c.zoneId !== selectedZoneId) return false;
      if (!c.chestNumber) return false; // Zone roster usually shows confirmed candidates
    } else if (activeTab === "master") {
      if (!c.chestNumber) return false; // Master roster is sequentially ordered confirmed chest numbers
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchChest = c.chestNumber?.toLowerCase().includes(q);
      const matchName = c.name.toLowerCase().includes(q);
      const matchUid = c.uid?.toLowerCase().includes(q);
      const matchInst = c.institutionName.toLowerCase().includes(q) || c.institutionCode?.toLowerCase().includes(q);
      const matchZone = c.zoneCode.toLowerCase().includes(q) || c.zoneName.toLowerCase().includes(q);
      const matchCat = c.categoryName.toLowerCase().includes(q);
      if (!matchChest && !matchName && !matchUid && !matchInst && !matchZone && !matchCat) {
        return false;
      }
    }

    return true;
  });

  // Group candidates by institution for multi-institution printing
  const candidatesGroupedByInst = React.useMemo(() => {
    const map = new Map<string, { inst: typeof institutions[0]; candidates: CandidateItem[] }>();
    for (const c of filteredCandidates) {
      if (!map.has(c.institutionId)) {
        const instObj = institutions.find((i) => i.id === c.institutionId) || {
          id: c.institutionId,
          code: c.institutionCode || "—",
          name: c.institutionName,
          place: c.institutionPlace,
          zoneId: c.zoneId,
          zoneCode: c.zoneCode,
          zoneName: c.zoneName,
        };
        map.set(c.institutionId, { inst: instObj, candidates: [] });
      }
      map.get(c.institutionId)!.candidates.push(c);
    }
    return Array.from(map.values()).sort((a, b) => a.inst.name.localeCompare(b.inst.name));
  }, [filteredCandidates, institutions]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Screen Header & Topbar ── */}
      <div className="no-print" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#1e293b",
        color: "#f8fafc",
        padding: "16px 24px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.6rem" }}>🎫</span>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900, letterSpacing: "0.5px" }}>
                  MASTER CHEST NUMBER & PENDING CONFIRMATION HUB
                </h1>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                  Super Admin Management • Zone & Institution Rosters • Official Identity Print Sheets
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links / Print Button */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            <PrintButton label={`Print Active Sheet (${filteredCandidates.length})`} />
            <a
              href="/print/zonal-offstage-valuation"
              style={{
                padding: "6px 12px",
                backgroundColor: "#8E0033",
                color: "#ffffff",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📝</span> Zonal Off-Stage Valuation Sheet
            </a>
            <a
              href="/dashboard/reports"
              style={{
                padding: "6px 12px",
                backgroundColor: "#475569",
                color: "#f8fafc",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              Reports Hub
            </a>
          </div>
        </div>

        {/* ── Real-Time Chest Number Integrity & Counter Ticker ── */}
        <div style={{ maxWidth: "1320px", margin: "14px auto 0", paddingTop: "12px", borderTop: "1px solid #334155", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <div style={{ backgroundColor: "#0f172a", padding: "8px 12px", borderRadius: "6px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Total Candidates</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#ffffff" }}>{totalCandidatesCount}</div>
          </div>

          <div style={{ backgroundColor: "#0f172a", padding: "8px 12px", borderRadius: "6px", border: "1px solid #166534" }}>
            <div style={{ fontSize: "0.7rem", color: "#86efac", textTransform: "uppercase", fontWeight: 700 }}>Confirmed with Chest #</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#4ade80" }}>{confirmedCount}</div>
          </div>

          <div style={{ backgroundColor: "#0f172a", padding: "8px 12px", borderRadius: "6px", border: `1px solid ${pendingCount > 0 ? "#854d0e" : "#334155"}` }}>
            <div style={{ fontSize: "0.7rem", color: "#fde047", textTransform: "uppercase", fontWeight: 700 }}>Pending Confirmation</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: pendingCount > 0 ? "#facc15" : "#94a3b8" }}>{pendingCount}</div>
          </div>

          <div style={{
            backgroundColor: duplicateCount === 0 ? "rgba(22, 101, 52, 0.4)" : "rgba(153, 27, 27, 0.4)",
            padding: "8px 12px",
            borderRadius: "6px",
            border: `1.5px solid ${duplicateCount === 0 ? "#22c55e" : "#ef4444"}`,
          }}>
            <div style={{ fontSize: "0.7rem", color: duplicateCount === 0 ? "#86efac" : "#fca5a5", textTransform: "uppercase", fontWeight: 800 }}>
              Duplicate Chest Number Check
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 900, color: duplicateCount === 0 ? "#22c55e" : "#ef4444", marginTop: "2px" }}>
              {duplicateCount === 0 ? "✅ 0 DUPLICATES (100% Unique)" : `⚠️ ${duplicateCount} DUPLICATES FOUND!`}
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div style={{ maxWidth: "1320px", margin: "16px auto 0", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("pending")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px 6px 0 0",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: "none",
              cursor: "pointer",
              backgroundColor: activeTab === "pending" ? "#f8fafc" : "#334155",
              color: activeTab === "pending" ? "#0f172a" : "#cbd5e1",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⚠️</span> Pending to Confirm
            {pendingCount > 0 && (
              <span style={{
                backgroundColor: activeTab === "pending" ? "#e11d48" : "#f43f5e",
                color: "#ffffff",
                padding: "1px 6px",
                borderRadius: "10px",
                fontSize: "0.72rem",
                fontWeight: 900,
              }}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("institution")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px 6px 0 0",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: "none",
              cursor: "pointer",
              backgroundColor: activeTab === "institution" ? "#f8fafc" : "#334155",
              color: activeTab === "institution" ? "#0f172a" : "#cbd5e1",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🏛️</span> Institution-wise Roster
          </button>

          <button
            onClick={() => setActiveTab("zone")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px 6px 0 0",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: "none",
              cursor: "pointer",
              backgroundColor: activeTab === "zone" ? "#f8fafc" : "#334155",
              color: activeTab === "zone" ? "#0f172a" : "#cbd5e1",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🗺️</span> Zone-wise Roster
          </button>

          <button
            onClick={() => setActiveTab("master")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px 6px 0 0",
              fontWeight: 800,
              fontSize: "0.85rem",
              border: "none",
              cursor: "pointer",
              backgroundColor: activeTab === "master" ? "#f8fafc" : "#334155",
              color: activeTab === "master" ? "#0f172a" : "#cbd5e1",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📋</span> Total Master Chest Roster (101 &rarr;)
          </button>
        </div>
      </div>

      {/* ── Sub-toolbar for Filtering (Active for Institution, Zone, and Master tabs) ── */}
      {activeTab !== "pending" && (
        <div className="no-print" style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px" }}>
          <div style={{ maxWidth: "1320px", margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
              {/* Institution Filter */}
              {activeTab === "institution" && (
                <div>
                  <label style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "2px" }}>
                    INSTITUTION
                  </label>
                  <select
                    value={selectedInstId}
                    onChange={(e) => setSelectedInstId(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      maxWidth: "340px",
                    }}
                  >
                    <option value="ALL">All Institutions (Print Multi-Page)</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        [{i.code}] {i.name} ({i.zoneCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Zone Filter */}
              {(activeTab === "zone" || activeTab === "institution") && (
                <div>
                  <label style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "2px" }}>
                    ZONE
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                    }}
                  >
                    <option value="ALL">All Zones (8 Zones)</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} — {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Live Search */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "2px" }}>
                  SEARCH (Chest #, Name, UID, Inst)
                </label>
                <input
                  type="text"
                  placeholder="Filter roster..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    width: "220px",
                  }}
                />
              </div>
            </div>

            {/* View Mode: Table vs Photo Badges / Identity Desk Cards */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>IDENTITY TYPE:</span>
              <button
                onClick={() => setViewMode("table")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  backgroundColor: viewMode === "table" ? "#0f172a" : "#f1f5f9",
                  color: viewMode === "table" ? "#ffffff" : "#334155",
                }}
              >
                📋 Identity Table
              </button>
              <button
                onClick={() => setViewMode("badges")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  backgroundColor: viewMode === "badges" ? "#0f172a" : "#f1f5f9",
                  color: viewMode === "badges" ? "#ffffff" : "#334155",
                }}
              >
                🪪 Desk Slip / Badge Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Body ── */}
      <div style={{ maxWidth: "1280px", margin: "24px auto", padding: "0 16px" }}>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: ⚠️ PENDING BY ZONE & INSTITUTION (TO CONFIRM)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "pending" && (
          <div>
            <div className="no-print" style={{
              backgroundColor: "#ffffff",
              border: "1px solid #fde68a",
              borderLeft: "6px solid #eab308",
              padding: "16px 20px",
              borderRadius: "8px",
              marginBottom: "24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#854d0e" }}>
                    ⚠️ PENDING CONFIRMATIONS — ZONE-BASED BREAKDOWN
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#713f12" }}>
                    The following institutions have registered candidates who are waiting for chest numbers. Confirming assigns guaranteed consecutive unique chest numbers per category with zero duplicate collisions.
                  </p>
                </div>
                <div style={{ backgroundColor: "#fef3c7", padding: "6px 14px", borderRadius: "6px", border: "1px solid #fde68a", fontSize: "0.88rem", fontWeight: 800, color: "#92400e" }}>
                  {pendingCount} Candidates Pending in {pendingInstitutions.length} Institutions
                </div>
              </div>
            </div>

            {confirmFeedback && (
              <div style={{
                padding: "12px 18px",
                marginBottom: "20px",
                borderRadius: "6px",
                backgroundColor: confirmFeedback.error ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${confirmFeedback.error ? "#fecaca" : "#bbf7d0"}`,
                color: confirmFeedback.error ? "#991b1b" : "#166534",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}>
                {confirmFeedback.msg}
              </div>
            )}

            {Object.keys(pendingByZone).length === 0 ? (
              <div style={{ backgroundColor: "#ffffff", padding: "60px 20px", textAlign: "center", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <span style={{ fontSize: "3rem" }}>🎉</span>
                <h3 style={{ color: "#166534", margin: "12px 0 6px" }}>All Institutions and Candidates are 100% Confirmed!</h3>
                <p style={{ color: "#64748b", margin: 0, fontSize: "0.85rem" }}>
                  There are no pending registrations. All 849 candidates have official unique chest numbers.
                </p>
              </div>
            ) : (
              Object.entries(pendingByZone).map(([zoneId, zoneData]) => (
                <div key={zoneId} style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "24px", overflow: "hidden" }}>
                  {/* Zone Header Bar */}
                  <div style={{
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    padding: "12px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ backgroundColor: "#8E0033", padding: "2px 8px", borderRadius: "4px", fontWeight: 900, fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                        ZONE: {zoneData.zoneCode}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>{zoneData.zoneName}</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                      {zoneData.institutions.length} Institutions with Pending Candidates
                    </div>
                  </div>

                  {/* Institutions List in this Zone */}
                  <div style={{ padding: "16px 20px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                          <th style={{ padding: "8px 6px", width: "40px" }}>#</th>
                          <th style={{ padding: "8px 10px" }}>Institution Code & Name</th>
                          <th style={{ padding: "8px 10px", width: "140px" }}>Location</th>
                          <th style={{ padding: "8px 10px", width: "100px", textAlign: "center" }}>Total Stud.</th>
                          <th style={{ padding: "8px 10px", width: "100px", textAlign: "center" }}>Confirmed</th>
                          <th style={{ padding: "8px 10px", width: "110px", textAlign: "center" }}>Pending</th>
                          <th style={{ padding: "8px 10px", width: "260px", textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zoneData.institutions.map((inst, iIdx) => {
                          const isExpanded = Boolean(expandedInsts[inst.teamId]);
                          return (
                            <React.Fragment key={inst.institutionId || inst.teamId}>
                              <tr style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: iIdx % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                                <td style={{ padding: "10px 6px", fontWeight: 700, color: "#64748b" }}>{iIdx + 1}</td>
                                <td style={{ padding: "10px 10px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{
                                      backgroundColor: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      color: "#334155",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontFamily: "monospace",
                                      fontWeight: 800,
                                      fontSize: "0.78rem",
                                    }}>
                                      {inst.code}
                                    </span>
                                    <strong style={{ color: "#0f172a" }}>{inst.name}</strong>
                                  </div>
                                </td>
                                <td style={{ padding: "10px 10px", color: "#64748b" }}>{inst.place || "—"}</td>
                                <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700 }}>{inst.totalCandidates}</td>
                                <td style={{ padding: "10px 10px", textAlign: "center", color: "#166534", fontWeight: 800 }}>
                                  {inst.confirmedCount}
                                </td>
                                <td style={{ padding: "10px 10px", textAlign: "center" }}>
                                  <span style={{
                                    backgroundColor: "#fef3c7",
                                    color: "#b45309",
                                    border: "1px solid #fde68a",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontWeight: 900,
                                    fontSize: "0.82rem",
                                  }}>
                                    {inst.pendingCount} Pending
                                  </span>
                                </td>
                                <td style={{ padding: "10px 10px", textAlign: "center" }}>
                                  <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(inst.teamId)}
                                      style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#f1f5f9",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "4px",
                                        fontSize: "0.75rem",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {isExpanded ? "Hide List ▲" : `View List (${inst.pendingList.length}) ▼`}
                                    </button>

                                    {inst.teamId && (
                                      <button
                                        type="button"
                                        disabled={isPendingConfirm}
                                        onClick={() => handleConfirmTeam(inst.teamId, "OFF_STAGE")}
                                        style={{
                                          padding: "4px 10px",
                                          backgroundColor: "#8E0033",
                                          color: "#ffffff",
                                          border: "none",
                                          borderRadius: "4px",
                                          fontSize: "0.75rem",
                                          fontWeight: 800,
                                          cursor: isPendingConfirm ? "not-allowed" : "pointer",
                                          opacity: isPendingConfirm ? 0.6 : 1,
                                        }}
                                        title="Confirm off-stage candidates and assign sequential chest numbers"
                                      >
                                        Confirm Team ⚡
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded list of pending candidates for this institution */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={7} style={{ backgroundColor: "#f8fafc", padding: "14px 20px", borderBottom: "2px solid #e2e8f0" }}>
                                    <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#475569", marginBottom: "8px" }}>
                                      Pending Candidates in {inst.name} ({inst.pendingList.length}):
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                                      {inst.pendingList.map((pc) => (
                                        <div key={pc.id} style={{
                                          backgroundColor: "#ffffff",
                                          border: "1px solid #e2e8f0",
                                          borderRadius: "6px",
                                          padding: "8px 12px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                        }}>
                                          {pc.photo ? (
                                            <img
                                              src={pc.photo}
                                              alt={pc.name}
                                              style={{ width: "36px", height: "44px", objectFit: "cover", borderRadius: "3px", border: "1px solid #cbd5e1" }}
                                            />
                                          ) : (
                                            <div style={{ width: "36px", height: "44px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "3px", color: "#94a3b8", fontSize: "0.8rem" }}>
                                              👤
                                            </div>
                                          )}
                                          <div style={{ overflow: "hidden" }}>
                                            <div style={{ fontWeight: 800, fontSize: "0.84rem", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                              {pc.name}
                                            </div>
                                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                              UID: {pc.uid || "—"} • {pc.categoryName}
                                            </div>
                                            <div style={{ fontSize: "0.7rem", color: "#8E0033", marginTop: "2px", fontWeight: 600 }}>
                                              {pc.programs.length} Programs ({pc.programs.map((p) => p.code || p.name).slice(0, 2).join(", ")})
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2, 3, 4: CHEST NUMBER ROSTER & IDENTITY PRINTING
        ══════════════════════════════════════════════════════════ */}
        {activeTab !== "pending" && (
          <div>
            {/* If Identity Cards / Desk Slips mode is selected */}
            {viewMode === "badges" ? (
              <div className="desk-slips-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {filteredCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="desk-slip-item"
                    style={{
                      backgroundColor: "#ffffff",
                      border: "2px solid #0f172a",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      {/* Top Bar: Zone & Category */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #0f172a", paddingBottom: "6px", marginBottom: "10px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#8E0033", textTransform: "uppercase" }}>
                          {festName}
                        </span>
                        <span style={{
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: "3px",
                        }}>
                          {c.zoneCode}
                        </span>
                      </div>

                      {/* Main Candidate Info: Photo + Chest Badge */}
                      <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "10px" }}>
                        {c.photo ? (
                          <img
                            src={c.photo}
                            alt={c.name}
                            style={{
                              width: "56px",
                              height: "68px",
                              objectFit: "cover",
                              borderRadius: "4px",
                              border: "1.5px solid #0f172a",
                            }}
                          />
                        ) : (
                          <div style={{
                            width: "56px",
                            height: "68px",
                            backgroundColor: "#f1f5f9",
                            border: "1.5px dashed #94a3b8",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#94a3b8",
                            fontSize: "1.2rem",
                          }}>
                            👤
                          </div>
                        )}

                        <div>
                          <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                            OFFICIAL CHEST NO.
                          </div>
                          <div style={{
                            fontSize: "1.6rem",
                            fontWeight: 900,
                            color: "#8E0033",
                            letterSpacing: "1px",
                            lineHeight: 1.1,
                          }}>
                            {c.chestNumber || "PENDING"}
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "#475569", fontFamily: "monospace", marginTop: "2px" }}>
                            UID: {c.uid || "—"}
                          </div>
                        </div>
                      </div>

                      {/* Candidate Name & Category */}
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a", marginBottom: "2px" }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 600 }}>
                        Category: <strong style={{ color: "#334155" }}>{c.categoryName}</strong>
                      </div>
                    </div>

                    {/* Footer: Institution */}
                    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "10px" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.institutionName}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                        <span>CODE: {c.institutionCode || "—"}</span>
                        <span>{c.programs.length} Programs Assigned</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Table Mode: Clean Printable Roster grouped by Institution (or Flat sequentially for Master) */
              activeTab === "institution" ? (
                candidatesGroupedByInst.map(({ inst, candidates }) => (
                  <div
                    key={inst.id}
                    className="institution-print-sheet"
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "30px 36px",
                      marginBottom: "32px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* Header */}
                    <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "1.35rem", fontWeight: 900, textTransform: "uppercase", color: "#8E0033" }}>
                        {festName}
                      </div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginTop: "2px" }}>
                        OFFICIAL INSTITUTION CHEST NUMBER ROSTER
                      </div>
                    </div>

                    {/* Institution Meta Box */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      backgroundColor: "#f8fafc",
                      border: "1.5px solid #0f172a",
                      borderRadius: "4px",
                      padding: "10px 16px",
                      marginBottom: "16px",
                      fontSize: "0.86rem",
                    }}>
                      <div>
                        <div>
                          <strong>Institution:</strong> <span style={{ fontWeight: 800 }}>{inst.name}</span>
                        </div>
                        <div style={{ color: "#475569", fontSize: "0.8rem", marginTop: "2px" }}>
                          Code: <strong>{inst.code}</strong> {inst.place ? `• Place: ${inst.place}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div>
                          <strong>Zone:</strong> <span style={{ fontWeight: 800 }}>{inst.zoneName} ({inst.zoneCode})</span>
                        </div>
                        <div style={{ color: "#475569", fontSize: "0.8rem", marginTop: "2px" }}>
                          Total Candidates: <strong>{candidates.length}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Candidates Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", border: "1.5px solid #0f172a" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "left" }}>
                          <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "32px", textAlign: "center" }}>#</th>
                          <th style={{ border: "1px solid #0f172a", padding: "8px 8px", width: "95px", textAlign: "center" }}>Chest No.</th>
                          <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "50px", textAlign: "center" }}>Photo</th>
                          <th style={{ border: "1px solid #0f172a", padding: "8px 10px" }}>Candidate Name & UID</th>
                          <th style={{ border: "1px solid #0f172a", padding: "8px 8px", width: "110px" }}>Category</th>
                          <th style={{ border: "1px solid #0f172a", padding: "8px 10px" }}>Allocated Programs</th>
                          <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "90px", textAlign: "center" }}>Sign / Check</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((c, cIdx) => (
                          <tr key={c.id} style={{ borderBottom: "1px solid #94a3b8" }}>
                            <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>
                              {cIdx + 1}
                            </td>
                            <td style={{ border: "1px solid #0f172a", padding: "6px 6px", textAlign: "center" }}>
                              {c.chestNumber ? (
                                <span style={{
                                  display: "inline-block",
                                  backgroundColor: "#fdf2f4",
                                  border: "1.5px solid #8E0033",
                                  color: "#8E0033",
                                  fontWeight: 900,
                                  fontSize: "0.95rem",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  letterSpacing: "0.5px",
                                }}>
                                  {c.chestNumber}
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "0.72rem", fontStyle: "italic" }}>
                                  [PENDING]
                                </span>
                              )}
                            </td>
                            <td style={{ border: "1px solid #0f172a", padding: "4px 2px", textAlign: "center", verticalAlign: "middle" }}>
                              {c.photo ? (
                                <img
                                  src={c.photo}
                                  alt={c.name}
                                  style={{ width: "36px", height: "44px", objectFit: "cover", borderRadius: "3px", border: "1px solid #334155", display: "block", margin: "0 auto" }}
                                />
                              ) : (
                                <div style={{ width: "36px", height: "44px", backgroundColor: "#f1f5f9", border: "1px dashed #94a3b8", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: "#94a3b8", fontSize: "0.75rem" }}>
                                  👤
                                </div>
                              )}
                            </td>
                            <td style={{ border: "1px solid #0f172a", padding: "6px 10px" }}>
                              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.86rem" }}>{c.name}</div>
                              <div style={{ fontSize: "0.74rem", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>
                                UID: {c.uid || "—"}
                              </div>
                            </td>
                            <td style={{ border: "1px solid #0f172a", padding: "6px 8px", fontWeight: 700, color: "#334155" }}>
                              {c.categoryName}
                            </td>
                            <td style={{ border: "1px solid #0f172a", padding: "6px 10px", fontSize: "0.75rem" }}>
                              {c.programs.length === 0 ? (
                                <span style={{ color: "#94a3b8" }}>No programs</span>
                              ) : (
                                <div>
                                  {c.programs.map((p, pIdx) => (
                                    <span key={p.id || pIdx} style={{
                                      display: "inline-block",
                                      backgroundColor: "#f1f5f9",
                                      color: "#334155",
                                      padding: "1px 5px",
                                      borderRadius: "3px",
                                      margin: "1px 3px 1px 0",
                                      fontSize: "0.7rem",
                                      border: "1px solid #e2e8f0",
                                    }}>
                                      {p.code ? `[${p.code}] ` : ""}{p.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center" }}>
                              <div style={{ minHeight: "22px", borderBottom: "1px dotted #94a3b8" }}></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Footer Certification */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "20px", fontSize: "0.8rem", color: "#475569" }}>
                      <div>
                        <div>Institutional Coordinator / Principal: ____________________</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>Signature & Verification</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div>Zone Admin Verification Seal & Signature</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>Hiya Fiesta 2026 Zonal Council</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Flat Table for Zone and Master Roster */
                <div
                  className="institution-print-sheet"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "30px 36px",
                    marginBottom: "32px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, textTransform: "uppercase", color: "#8E0033" }}>
                      {festName}
                    </div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginTop: "2px" }}>
                      {activeTab === "zone" ? "ZONE-WISE CHEST NUMBER MASTER ROSTER" : "TOTAL MASTER CANDIDATE CHEST NUMBER DIRECTORY"}
                    </div>
                    {selectedZoneId !== "ALL" && activeTab === "zone" && (
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                        ZONE: {zones.find((z) => z.id === selectedZoneId)?.name} ({zones.find((z) => z.id === selectedZoneId)?.code})
                      </div>
                    )}
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", border: "1.5px solid #0f172a" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#0f172a", color: "#ffffff", textAlign: "left" }}>
                        <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "32px", textAlign: "center" }}>#</th>
                        <th style={{ border: "1px solid #0f172a", padding: "8px 8px", width: "95px", textAlign: "center" }}>Chest No.</th>
                        <th style={{ border: "1px solid #0f172a", padding: "8px 4px", width: "46px", textAlign: "center" }}>Photo</th>
                        <th style={{ border: "1px solid #0f172a", padding: "8px 10px" }}>Candidate Name & UID</th>
                        <th style={{ border: "1px solid #0f172a", padding: "8px 10px", width: "190px" }}>Institution</th>
                        <th style={{ border: "1px solid #0f172a", padding: "8px 6px", width: "60px", textAlign: "center" }}>Zone</th>
                        <th style={{ border: "1px solid #0f172a", padding: "8px 8px", width: "95px" }}>Category</th>
                        <th style={{ border: "1px solid #0f172a", padding: "8px 10px" }}>Allocated Programs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((c, idx) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid #94a3b8" }}>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>
                            {idx + 1}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 6px", textAlign: "center" }}>
                            {c.chestNumber ? (
                              <span style={{
                                display: "inline-block",
                                backgroundColor: "#fdf2f4",
                                border: "1.5px solid #8E0033",
                                color: "#8E0033",
                                fontWeight: 900,
                                fontSize: "0.95rem",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                letterSpacing: "0.5px",
                              }}>
                                {c.chestNumber}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "0.72rem", fontStyle: "italic" }}>
                                [PENDING]
                              </span>
                            )}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "4px 2px", textAlign: "center", verticalAlign: "middle" }}>
                            {c.photo ? (
                              <img
                                src={c.photo}
                                alt={c.name}
                                style={{ width: "34px", height: "42px", objectFit: "cover", borderRadius: "3px", border: "1px solid #334155", display: "block", margin: "0 auto" }}
                              />
                            ) : (
                              <div style={{ width: "34px", height: "42px", backgroundColor: "#f1f5f9", border: "1px dashed #94a3b8", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: "#94a3b8", fontSize: "0.7rem" }}>
                                👤
                              </div>
                            )}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 10px" }}>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>{c.name}</div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>
                              UID: {c.uid || "—"}
                            </div>
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 10px", fontSize: "0.78rem" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{c.institutionName}</div>
                            {c.institutionCode && (
                              <span style={{
                                display: "inline-block",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                marginTop: "2px",
                              }}>
                                [{c.institutionCode}]
                              </span>
                            )}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 4px", textAlign: "center", fontWeight: 800, color: "#334155" }}>
                            {c.zoneCode}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 8px", fontWeight: 700, color: "#334155" }}>
                            {c.categoryName}
                          </td>
                          <td style={{ border: "1px solid #0f172a", padding: "6px 10px", fontSize: "0.72rem" }}>
                            {c.programs.length === 0 ? (
                              <span style={{ color: "#94a3b8" }}>None</span>
                            ) : (
                              c.programs.map((p, pIdx) => (
                                <span key={p.id || pIdx} style={{
                                  display: "inline-block",
                                  backgroundColor: "#f1f5f9",
                                  padding: "1px 4px",
                                  borderRadius: "3px",
                                  margin: "1px 2px",
                                  border: "1px solid #e2e8f0",
                                }}>
                                  {p.code || p.name}
                                </span>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

      </div>

      {/* ── Print Specific Stylesheet ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .institution-print-sheet {
              box-shadow: none !important;
              border: none !important;
              padding: 8mm 10mm !important;
              margin: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
            }
            .desk-slips-container {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 8mm !important;
            }
            .desk-slip-item {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-shadow: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 6mm;
            }
          }
        `,
      }} />
    </div>
  );
}
