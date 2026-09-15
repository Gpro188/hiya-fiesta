"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  CertificateLayoutConfig, 
  CertificateWinner, 
  CertificateFieldConfig, 
  DEFAULT_CERTIFICATE_LAYOUT 
} from "@/types/certificate";
import { saveCertificateLayout, getCertificateWinners } from "./actions";
import ImageUpload from "@/app/components/ImageUpload";
import Link from "next/link";

interface CertificateStudioClientProps {
  initialEvents: any[];
  allZones: any[];
  userRole: string;
  userZoneId?: string | null;
  userEventId?: string | null;
  initialLayout: CertificateLayoutConfig;
  initialWinners: CertificateWinner[];
}

export default function CertificateStudioClient({
  initialEvents,
  allZones,
  userRole,
  userZoneId,
  userEventId,
  initialLayout,
  initialWinners
}: CertificateStudioClientProps) {
  // Event & Fest Selection
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEvents[0]?.id || ""
  );

  // Active Tab: 'PRINT' (Winner list & batch printing) vs 'STUDIO' (Template calibration & area positioning)
  const [activeTab, setActiveTab] = useState<'PRINT' | 'STUDIO'>('PRINT');

  // Layout Configuration
  const [layout, setLayout] = useState<CertificateLayoutConfig>(() => {
    return initialLayout || DEFAULT_CERTIFICATE_LAYOUT;
  });

  // Selected field for calibration
  const [selectedFieldKey, setSelectedFieldKey] = useState<keyof CertificateLayoutConfig['fields']>('candidateName');

  // Winner data state
  const [winners, setWinners] = useState<CertificateWinner[]>(initialWinners);
  const [loadingWinners, setLoadingWinners] = useState(false);

  // Filters
  const [filterProgramId, setFilterProgramId] = useState<string>("ALL");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("ALL");
  const [filterStageType, setFilterStageType] = useState<string>("ALL"); // 'ALL', 'ON_STAGE', 'OFF_STAGE'
  const [filterRank, setFilterRank] = useState<string>("ALL"); // 'ALL', '1', '2', '3'
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selected winners for printing (checkboxes)
  const [selectedWinnerIds, setSelectedWinnerIds] = useState<Set<string>>(new Set());

  // Currently previewed winner
  const [previewWinner, setPreviewWinner] = useState<CertificateWinner | null>(null);

  // Save status
  const [savingLayout, setSavingLayout] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Show template background on screen in Studio
  const [showTemplateBgInStudio, setShowTemplateBgInStudio] = useState(true);

  // Full capital letters option (enabled by default for printing)
  const [fullCapitalLetters, setFullCapitalLetters] = useState(true);

  // Dragging state on canvas
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Determine active event object
  const currentEvent = useMemo(() => {
    return initialEvents.find(e => e.id === selectedEventId) || initialEvents[0];
  }, [initialEvents, selectedEventId]);

  // Load layout from localStorage if available on mount
  useEffect(() => {
    if (typeof window !== "undefined" && selectedEventId) {
      try {
        const local = localStorage.getItem(`cert_layout_${selectedEventId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.fields?.categoryName && parsed.fields.categoryName.prefix === "Category: ") {
            parsed.fields.categoryName.prefix = "";
          }
          setLayout(parsed);
        }
      } catch (e) {
        console.error("Failed to load layout from localStorage", e);
      }
    }
  }, [selectedEventId]);

  // Refresh winners when event, program, category, or stage type changes
  const refreshWinners = async (
    eventId: string, 
    progId = filterProgramId, 
    catId = filterCategoryId, 
    stgType = filterStageType,
    rank = filterRank, 
    search = searchQuery
  ) => {
    if (!eventId) return;
    setLoadingWinners(true);
    try {
      const data = await getCertificateWinners({
        eventId,
        programId: progId,
        categoryId: catId,
        stageType: stgType,
        rankFilter: rank !== "ALL" ? parseInt(rank) : undefined,
        searchQuery: search
      });
      setWinners(data);
      // Select all by default
      setSelectedWinnerIds(new Set(data.map(w => w.id)));
      if (data.length > 0 && !previewWinner) {
        setPreviewWinner(data[0]);
      }
    } catch (err) {
      console.error("Failed to load winners:", err);
    } finally {
      setLoadingWinners(false);
    }
  };

  // Handle Event Switch (e.g. Super Admin switching between State and Zones)
  const handleEventChange = (newId: string) => {
    setSelectedEventId(newId);
    setFilterProgramId("ALL");
    setFilterCategoryId("ALL");
    setFilterRank("ALL");
    setSearchQuery("");
    refreshWinners(newId, "ALL", "ALL", "ALL", "");
  };

  // Sample winner fallback for previewing calibration when no results are entered yet
  const sampleWinner: CertificateWinner = useMemo(() => ({
    id: "sample-preview",
    candidateName: "Fathima Noor",
    chestNumber: "104",
    institutionName: "WMO Arts & Science Academy",
    institutionPlace: "Thrissur",
    programId: "prog-sample",
    programName: "Elocution (English)",
    categoryName: "Fadhila",
    rank: 1,
    placeText: "1st Place",
    grade: "A",
    gradeText: "A Grade",
    zoneName: currentEvent?.zone?.name || "Thrissur Zone",
    eventId: currentEvent?.id || "event-sample",
    eventName: currentEvent?.name || "CSWC Hiya Fiesta 2026",
    type: "INDIVIDUAL"
  }), [currentEvent]);

  // Effective winner for preview in studio
  const activeWinnerForStudio = previewWinner || winners[0] || sampleWinner;

  // Save layout action
  const handleSaveLayout = async () => {
    setSavingLayout(true);
    setSaveMessage(null);
    try {
      // Save locally
      if (typeof window !== "undefined") {
        localStorage.setItem(`cert_layout_${selectedEventId}`, JSON.stringify(layout));
      }
      // Save to server
      const res = await saveCertificateLayout(selectedEventId, layout);
      if (res.success) {
        setSaveMessage("✅ Certificate layout & calibration saved successfully!");
      } else {
        setSaveMessage("⚠️ Saved to browser, but server save had an issue.");
      }
    } catch (err) {
      setSaveMessage("⚠️ Saved to local browser.");
    } finally {
      setSavingLayout(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  // Reset to default layout
  const handleResetLayout = () => {
    if (confirm("Reset calibration to default A4 certificate positions?")) {
      setLayout(DEFAULT_CERTIFICATE_LAYOUT);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`cert_layout_${selectedEventId}`);
      }
    }
  };

  // Update specific field config
  const updateFieldConfig = (fieldKey: keyof CertificateLayoutConfig['fields'], updates: Partial<CertificateFieldConfig>) => {
    setLayout(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldKey]: {
          ...prev.fields[fieldKey],
          ...updates
        }
      }
    }));
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedWinnerIds.size === winners.length) {
      setSelectedWinnerIds(new Set());
    } else {
      setSelectedWinnerIds(new Set(winners.map(w => w.id)));
    }
  };

  // Toggle single winner selection
  const toggleSelectWinner = (id: string) => {
    setSelectedWinnerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Candidates to print: only selected winners who placed 1, 2, or 3
  const candidatesToPrint = useMemo(() => {
    if (selectedWinnerIds.size === 0) return winners;
    return winners.filter(w => selectedWinnerIds.has(w.id));
  }, [winners, selectedWinnerIds]);

  // Execute Browser Print
  const handlePrint = (singleWinner?: CertificateWinner) => {
    if (singleWinner) {
      setPreviewWinner(singleWinner);
    }
    // Small delay to ensure state settles, then trigger print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Format Place Value based on formatType
  const formatPlace = (rank: number, formatType?: string, uppercase = false) => {
    let val = '';
    if (formatType === 'word') {
      val = rank === 1 ? 'First Place' : rank === 2 ? 'Second Place' : 'Third Place';
    } else if (formatType === 'wordonly') {
      val = rank === 1 ? 'First' : rank === 2 ? 'Second' : 'Third';
    } else if (formatType === 'number') {
      val = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
    } else {
      val = rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place';
    }
    return uppercase ? val.toUpperCase() : val;
  };

  // Format Grade Value (Crucial: omit if null)
  const formatGrade = (grade: string | null | undefined, prefix = 'With ', suffix = ' Grade', uppercase = false) => {
    if (!grade || grade.trim() === '' || grade === '-') return '';
    const text = `${prefix}${grade.trim()}${suffix}`;
    return uppercase ? text.toUpperCase() : text;
  };

  // Available font families
  const fontFamilies = [
    { label: "Neulis (Modern Script-Sans Hybrid)", value: "Neulis, sans-serif" },
    { label: "Neulis Alt (Geometric Clean)", value: "Neulis Alt, sans-serif" },
    { label: "Fraunces (Classic Elegant Serif)", value: "Fraunces, serif" },
    { label: "Playfair Display (Calligraphic Serif)", value: "Playfair Display, serif" },
    { label: "Cinzel (Traditional Roman Serif)", value: "Cinzel, serif" },
    { label: "Times New Roman (Formal Serif)", value: "Times New Roman, serif" },
    { label: "Georgia (Clean Serif)", value: "Georgia, serif" },
    { label: "Inter (Modern Sans-serif)", value: "Inter, sans-serif" },
    { label: "Arial (Standard Sans)", value: "Arial, sans-serif" },
  ];

  return (
    <div className="certificate-page-container">
      {/* ========================================================================= */}
      {/* 1. SCREEN-ONLY TOP HEADER & EVENT SELECTOR                                */}
      {/* ========================================================================= */}
      <div className="no-print" style={{ marginBottom: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "15px", marginBottom: "15px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "1.8rem" }}>🎓</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>
                Fest Merit Certificates
              </h1>
              <span style={{ 
                fontSize: "0.75rem", 
                fontWeight: 800, 
                padding: "3px 10px", 
                borderRadius: "20px", 
                backgroundColor: "#ecfdf5", 
                color: "#059669", 
                border: "1px solid #a7f3d0" 
              }}>
                1ST, 2ND & 3RD PLACED ONLY
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Print official merit certificates with Place & Grade. Calibrate exact text areas to overprint onto your pre-printed physical certificate stock.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link 
              href="/dashboard/reports" 
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              ← Reports Hub
            </Link>
          </div>
        </div>

        {/* Scope / Event Selector (For Super Admin or Multi-Event) */}
        {initialEvents.length > 1 && (
          <div className="glass-panel" style={{ padding: "12px 18px", marginBottom: "15px", display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
            <label style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🏛️ Fest Scope:</span>
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => handleEventChange(e.target.value)}
              className="input"
              style={{ maxWidth: "320px", fontWeight: 600 }}
            >
              {initialEvents.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.type === "STATE" ? "🌟 State Fest Final" : `🏛️ ${evt.name}`} {evt.zone ? `(${evt.zone.name})` : ""}
                </option>
              ))}
            </select>

            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {currentEvent?.type === "STATE" ? "State-level championship certificates" : `Zonal festival certificates for ${currentEvent?.zone?.name || currentEvent?.name}`}
            </span>
          </div>
        )}

        {/* Tab Navigation: Print Winners vs Studio Calibration */}
        <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={() => setActiveTab('PRINT')}
            className={`btn ${activeTab === 'PRINT' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}
          >
            <span>🖨️ Print Certificates</span>
            <span style={{ 
              fontSize: "0.75rem", 
              padding: "2px 8px", 
              borderRadius: "12px", 
              backgroundColor: activeTab === 'PRINT' ? "rgba(255,255,255,0.25)" : "var(--bg-card)",
              color: activeTab === 'PRINT' ? "#fff" : "var(--text-secondary)"
            }}>
              {winners.length} Winners
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STUDIO')}
            className={`btn ${activeTab === 'STUDIO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}
          >
            <span>📐 Calibrate Positions & Template</span>
            <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", backgroundColor: "#fef3c7", color: "#b45309" }}>
              Visual Area Alignment
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB A: WINNERS LIST & PRINT ACTIONS                                    */}
      {/* ========================================================================= */}
      {activeTab === 'PRINT' && (
        <div className="no-print">
          {/* Overprint Mode Notice Card */}
          <div style={{ 
            backgroundColor: layout.printMode === 'transparent' ? "#eff6ff" : "#f8fafc", 
            border: `1.5px solid ${layout.printMode === 'transparent' ? '#60a5fa' : '#cbd5e1'}`, 
            borderRadius: "10px", 
            padding: "14px 18px", 
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, color: layout.printMode === 'transparent' ? "#1d4ed8" : "#334155" }}>
                <span>{layout.printMode === 'transparent' ? "🖨️ Overprint Mode Active (Transparent Background)" : "🖼️ Full Template Print Mode"}</span>
                <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", backgroundColor: "#dbeafe", color: "#1e40af", fontWeight: 700 }}>
                  FOR PRE-PRINTED PHYSICAL CERTIFICATE STOCK
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {layout.printMode === 'transparent'
                  ? "When printing, the background template is hidden. ONLY the result details (Name, Place, Grade, Program, Category) will print cleanly into your blank certificate spaces."
                  : "Template image is printed along with the result text."}
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setLayout(prev => ({ ...prev, printMode: prev.printMode === 'transparent' ? 'full' : 'transparent' }))}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.8rem", fontWeight: 600 }}
              >
                Switch to {layout.printMode === 'transparent' ? 'Full Image Mode' : 'Transparent Overprint'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STUDIO')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--primary)" }}
              >
                📐 Adjust Alignment
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-panel" style={{ padding: "16px", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px", color: "var(--text-secondary)" }}>
                  Search Program # / Candidate / Chest #
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type program #, name, chest #, college..."
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px", color: "var(--text-secondary)" }}>
                  Program Filter
                </label>
                <select
                  value={filterProgramId}
                  onChange={(e) => setFilterProgramId(e.target.value)}
                  className="input"
                >
                  <option value="ALL">All Programs</option>
                  {currentEvent?.programs?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.programCode ? `[${p.programCode}] ` : ""}{p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px", color: "var(--text-secondary)" }}>
                  Category
                </label>
                <select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="input"
                >
                  <option value="ALL">All Categories</option>
                  {currentEvent?.categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px", color: "var(--text-secondary)" }}>
                  Stage Type
                </label>
                <select
                  value={filterStageType}
                  onChange={(e) => setFilterStageType(e.target.value)}
                  className="input"
                >
                  <option value="ALL">All Stages (On & Off)</option>
                  <option value="ON_STAGE">🎭 On Stage Only</option>
                  <option value="OFF_STAGE">📝 Off Stage Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px", color: "var(--text-secondary)" }}>
                  Place / Rank
                </label>
                <select
                  value={filterRank}
                  onChange={(e) => setFilterRank(e.target.value)}
                  className="input"
                >
                  <option value="ALL">All Winners (1st, 2nd, 3rd)</option>
                  <option value="1">🥇 1st Place Only</option>
                  <option value="2">🥈 2nd Place Only</option>
                  <option value="3">🥉 3rd Place Only</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => refreshWinners(selectedEventId, filterProgramId, filterCategoryId, filterStageType, filterRank, searchQuery)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  🔄 Filter
                </button>
              </div>
            </div>
          </div>

          {/* Action Header: Bulk Print Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 600 }}
              >
                {selectedWinnerIds.size === winners.length ? "Deselect All" : "Select All"}
              </button>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Selected: <strong style={{ color: "var(--primary)" }}>{selectedWinnerIds.size}</strong> of {winners.length} winners
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setFullCapitalLetters(prev => !prev)}
                className={`btn btn-sm ${fullCapitalLetters ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 800,
                  backgroundColor: fullCapitalLetters ? "#1e40af" : undefined,
                  color: fullCapitalLetters ? "#ffffff" : undefined,
                  borderColor: fullCapitalLetters ? "#1d4ed8" : undefined,
                }}
                title="When ON, all printed certificate fields (Candidate Name, Institution, Place, Program, Category, Grade) print in uppercase capital letters"
              >
                <span>🔠 FULL CAPITAL LETTERS:</span>
                <span style={{
                  backgroundColor: fullCapitalLetters ? "#10b981" : "#94a3b8",
                  color: "#fff",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.7rem"
                }}>
                  {fullCapitalLetters ? "ON" : "OFF"}
                </span>
              </button>

              <button
                type="button"
                disabled={winners.length === 0}
                onClick={() => handlePrint()}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, padding: "10px 20px" }}
              >
                <span>🖨️ Print Selected ({candidatesToPrint.length} Certificates)</span>
              </button>
            </div>
          </div>

          {/* Winners Table */}
          {loadingWinners ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
              <p>Loading winners...</p>
            </div>
          ) : winners.length === 0 ? (
            <div className="glass-panel" style={{ padding: "50px", textAlign: "center" }}>
              <span style={{ fontSize: "3rem" }}>🏆</span>
              <h3 style={{ margin: "10px 0 6px 0" }}>No 1st, 2nd, or 3rd Placed Results Yet</h3>
              <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 20px auto" }}>
                Results have not been entered or finalized for this fest yet. You can still calibrate your certificate template and text positions using the Calibration Studio below!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('STUDIO')}
                className="btn btn-primary"
              >
                📐 Open Calibration Studio (With Sample Data)
              </button>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(0,0,0,0.02)" }}>
                    <th style={{ padding: "12px 16px", width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedWinnerIds.size === winners.length && winners.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: "0.85rem" }}>Place</th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: "0.85rem" }}>Grade</th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: "0.85rem" }}>Candidate / Team Name</th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: "0.85rem" }}>Chest #</th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: "0.85rem" }}>Program & Category</th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: "0.85rem" }}>Institution</th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, fontSize: "0.85rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((winner) => {
                    const isSelected = selectedWinnerIds.has(winner.id);
                    return (
                      <tr 
                        key={winner.id}
                        style={{ 
                          borderBottom: "1px solid var(--border-color)",
                          backgroundColor: isSelected ? "rgba(142,0,51,0.02)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectWinner(winner.id)}
                          />
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: "4px",
                            padding: "4px 8px", 
                            borderRadius: "6px", 
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            backgroundColor: winner.rank === 1 ? "#fef3c7" : winner.rank === 2 ? "#f1f5f9" : "#ffedd5",
                            color: winner.rank === 1 ? "#b45309" : winner.rank === 2 ? "#475569" : "#c2410c",
                            border: `1px solid ${winner.rank === 1 ? '#fde68a' : winner.rank === 2 ? '#e2e8f0' : '#fed7aa'}`
                          }}>
                            {winner.rank === 1 ? "🥇 1st Place" : winner.rank === 2 ? "🥈 2nd Place" : "🥉 3rd Place"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {winner.grade ? (
                            <span style={{ 
                              padding: "3px 8px", 
                              borderRadius: "4px", 
                              fontWeight: 700, 
                              fontSize: "0.8rem", 
                              backgroundColor: "#ecfdf5", 
                              color: "#059669", 
                              border: "1px solid #a7f3d0" 
                            }}>
                              ⭐ {winner.grade} Grade
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                              Without Grade
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                          {winner.candidateName}
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                          {winner.chestNumber}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{winner.programName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap", marginTop: "2px" }}>
                            <span>{winner.categoryName} {winner.programCode ? `• [${winner.programCode}]` : ""}</span>
                            {winner.stageType && (
                              <span style={{
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                backgroundColor: winner.stageType === "ON_STAGE" ? "rgba(79, 70, 229, 0.1)" : "rgba(100, 116, 139, 0.1)",
                                color: winner.stageType === "ON_STAGE" ? "#4f46e5" : "#475569"
                              }}>
                                {winner.stageType === "ON_STAGE" ? "On Stage" : "Off Stage"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "0.85rem" }}>
                          <div>{winner.institutionName}</div>
                          {winner.institutionPlace && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{winner.institutionPlace}</div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handlePrint(winner)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontWeight: 600 }}
                          >
                            🖨️ Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB B: TEMPLATE & AREA POSITION CALIBRATION STUDIO                     */}
      {/* ========================================================================= */}
      {activeTab === 'STUDIO' && (
        <div className="no-print">
          <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: "24px", alignItems: "start" }}>
            
            {/* Left Column: Calibration Controls & Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Template Upload & Canvas Options */}
              <div className="glass-panel" style={{ padding: "18px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", fontWeight: 700, color: "var(--primary)" }}>
                  1. Certificate Template & Dimensions
                </h3>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "6px" }}>
                    Physical Certificate Template Image (Scan / Layout)
                  </label>
                  <p style={{ margin: "0 0 10px 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    Upload a high-res photo or scan of your blank certificate. This helps you visually line up the text fields to your printed certificate lines.
                  </p>
                  <ImageUpload
                    folder="certificates"
                    label="Upload Template Image"
                    initialUrl={layout.templateImageUrl}
                    maxSizeKb={5120}
                    onUploadComplete={(url) => setLayout(prev => ({ ...prev, templateImageUrl: url }))}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px" }}>
                      Orientation
                    </label>
                    <select
                      value={layout.orientation}
                      onChange={(e) => setLayout(prev => ({ ...prev, orientation: e.target.value as any }))}
                      className="input"
                    >
                      <option value="landscape">Landscape (A4 - 297 × 210 mm)</option>
                      <option value="portrait">Portrait (A4 - 210 × 297 mm)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px" }}>
                      Paper Size
                    </label>
                    <select
                      value={layout.paperSize}
                      onChange={(e) => setLayout(prev => ({ ...prev, paperSize: e.target.value as any }))}
                      className="input"
                    >
                      <option value="A4">Standard A4</option>
                      <option value="A3">Large A3</option>
                    </select>
                  </div>
                </div>

                {/* Print Mode Switch */}
                <div style={{ 
                  padding: "12px", 
                  backgroundColor: layout.printMode === 'transparent' ? "#eff6ff" : "#f8fafc", 
                  border: `1.5px solid ${layout.printMode === 'transparent' ? '#3b82f6' : '#cbd5e1'}`,
                  borderRadius: "8px",
                  marginBottom: "14px"
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={layout.printMode === 'transparent'}
                      onChange={(e) => setLayout(prev => ({ ...prev, printMode: e.target.checked ? 'transparent' : 'full' }))}
                    />
                    <span>Transparent Print Mode (Pre-Printed Paper)</span>
                  </label>
                  <p style={{ margin: "4px 0 0 24px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    When checked, the background template is invisible on paper. Only the result text prints.
                  </p>
                </div>

                {/* Global Printer Offsets */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px" }}>
                    Global Printer Alignment Offsets (mm)
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Shift Horizontal (X):</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          value={layout.globalOffsetX}
                          onChange={(e) => setLayout(prev => ({ ...prev, globalOffsetX: parseFloat(e.target.value) || 0 }))}
                          className="input"
                          style={{ padding: "4px 8px" }}
                        />
                        <span style={{ fontSize: "0.75rem" }}>mm</span>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Shift Vertical (Y):</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          value={layout.globalOffsetY}
                          onChange={(e) => setLayout(prev => ({ ...prev, globalOffsetY: parseFloat(e.target.value) || 0 }))}
                          className="input"
                          style={{ padding: "4px 8px" }}
                        />
                        <span style={{ fontSize: "0.75rem" }}>mm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Positioning & Size Controls */}
              <div className="glass-panel" style={{ padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--primary)" }}>
                    2. Field Area Positioning
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const allCaps = Object.values(layout.fields).every(f => f.textTransform === 'uppercase');
                      const newTransform = allCaps ? 'none' : 'uppercase';
                      setLayout(prev => {
                        const updatedFields: any = { ...prev.fields };
                        Object.keys(updatedFields).forEach(k => {
                          updatedFields[k] = { ...updatedFields[k], textTransform: newTransform };
                        });
                        return { ...prev, fields: updatedFields };
                      });
                    }}
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, borderColor: "var(--primary)", color: "var(--primary)" }}
                    title="Toggle all fields to full capital letters"
                  >
                    🔠 {Object.values(layout.fields).every(f => f.textTransform === 'uppercase') ? "Reset Capitalization" : "All Fields UPPERCASE"}
                  </button>
                </div>

                {/* Field Selector Tabs */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                  {(Object.keys(layout.fields) as Array<keyof CertificateLayoutConfig['fields']>).map((fKey) => {
                    const f = layout.fields[fKey];
                    const isSelected = selectedFieldKey === fKey;
                    return (
                      <button
                        key={fKey}
                        type="button"
                        onClick={() => setSelectedFieldKey(fKey)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                          backgroundColor: isSelected ? "rgba(142,0,51,0.08)" : "var(--bg-card)",
                          color: isSelected ? "var(--primary)" : "var(--text-primary)",
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: "0.75rem",
                          cursor: "pointer"
                        }}
                      >
                        {f.name}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Field Controls */}
                {selectedFieldKey && layout.fields[selectedFieldKey] && (() => {
                  const field = layout.fields[selectedFieldKey];
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "rgba(0,0,0,0.02)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>{field.name}</span>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={(e) => updateFieldConfig(selectedFieldKey, { enabled: e.target.checked })}
                          />
                          <span>Enabled</span>
                        </label>
                      </div>

                      {/* Top Position Slider */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                          <span>Vertical Position (Top %)</span>
                          <span style={{ color: "var(--primary)" }}>{field.top}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={field.top}
                          onChange={(e) => updateFieldConfig(selectedFieldKey, { top: parseFloat(e.target.value) })}
                          style={{ width: "100%" }}
                        />
                      </div>

                      {/* Left Position Slider */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                          <span>Horizontal Position (Left %)</span>
                          <span style={{ color: "var(--primary)" }}>{field.left}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={field.left}
                          onChange={(e) => updateFieldConfig(selectedFieldKey, { left: parseFloat(e.target.value) })}
                          style={{ width: "100%" }}
                        />
                      </div>

                      {/* Font Size & Weight */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                            Font Size (px)
                          </label>
                          <input
                            type="number"
                            min={8}
                            max={72}
                            value={field.fontSize}
                            onChange={(e) => updateFieldConfig(selectedFieldKey, { fontSize: parseInt(e.target.value) || 16 })}
                            className="input"
                            style={{ padding: "4px 8px" }}
                          />
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                            Font Weight
                          </label>
                          <select
                            value={field.fontWeight}
                            onChange={(e) => updateFieldConfig(selectedFieldKey, { fontWeight: e.target.value as any })}
                            className="input"
                            style={{ padding: "4px 8px" }}
                          >
                            <option value="400">Regular (400)</option>
                            <option value="500">Medium (500)</option>
                            <option value="600">Semi-Bold (600)</option>
                            <option value="700">Bold (700)</option>
                            <option value="800">Extra Bold (800)</option>
                          </select>
                        </div>
                      </div>

                      {/* Font Family */}
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                          Font Family
                        </label>
                        <select
                          value={field.fontFamily}
                          onChange={(e) => updateFieldConfig(selectedFieldKey, { fontFamily: e.target.value as any })}
                          className="input"
                        >
                          {fontFamilies.map(ff => (
                            <option key={ff.value} value={ff.value}>{ff.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Text Alignment & Color */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                            Text Align
                          </label>
                          <select
                            value={field.textAlign}
                            onChange={(e) => updateFieldConfig(selectedFieldKey, { textAlign: e.target.value as any })}
                            className="input"
                            style={{ padding: "4px 8px" }}
                          >
                            <option value="center">Center</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                            Color
                          </label>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input
                              type="color"
                              value={field.color}
                              onChange={(e) => updateFieldConfig(selectedFieldKey, { color: e.target.value })}
                              style={{ width: "32px", height: "32px", padding: 0, border: "none", borderRadius: "4px", cursor: "pointer" }}
                            />
                            <input
                              type="text"
                              value={field.color}
                              onChange={(e) => updateFieldConfig(selectedFieldKey, { color: e.target.value })}
                              className="input"
                              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Text Transform / Casing */}
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                          Text Casing (Capitalization)
                        </label>
                        <select
                          value={field.textTransform || 'none'}
                          onChange={(e) => updateFieldConfig(selectedFieldKey, { textTransform: e.target.value as any })}
                          className="input"
                          style={{ padding: "4px 8px" }}
                        >
                          <option value="none">Normal (As Entered)</option>
                          <option value="uppercase">UPPERCASE (FULL CAPITAL LETTERS)</option>
                          <option value="capitalize">Capitalize (Title Case)</option>
                          <option value="lowercase">lowercase</option>
                        </select>
                      </div>

                      {/* Place-specific format options */}
                      {selectedFieldKey === 'place' && (
                        <div>
                          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, marginBottom: "4px" }}>
                            Place Format
                          </label>
                          <select
                            value={field.formatType || 'ordinal'}
                            onChange={(e) => updateFieldConfig('place', { formatType: e.target.value })}
                            className="input"
                          >
                            <option value="ordinal">Ordinal Place (e.g., 1st Place, 2nd Place)</option>
                            <option value="word">Word + Place (e.g., First Place, Second Place)</option>
                            <option value="wordonly">Word Only (e.g., First, Second, Third)</option>
                            <option value="number">Short Number (e.g., 1st, 2nd, 3rd)</option>
                          </select>
                        </div>
                      )}

                      {/* Prefix & Suffix options for fields that support them */}
                      {(selectedFieldKey === 'grade' || selectedFieldKey === 'categoryName' || selectedFieldKey === 'chestNumber') && (
                        <div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
                                Prefix Text
                              </label>
                              <input
                                type="text"
                                value={field.prefix || ""}
                                onChange={(e) => updateFieldConfig(selectedFieldKey, { prefix: e.target.value })}
                                className="input"
                                placeholder={selectedFieldKey === 'grade' ? "With " : (selectedFieldKey === 'chestNumber' ? "Chest: " : "None")}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
                                Suffix Text
                              </label>
                              <input
                                type="text"
                                value={field.suffix || ""}
                                onChange={(e) => updateFieldConfig(selectedFieldKey, { suffix: e.target.value })}
                                className="input"
                                placeholder={selectedFieldKey === 'grade' ? " Grade" : "None"}
                              />
                            </div>
                          </div>
                          {selectedFieldKey === 'grade' && (
                            <p style={{ margin: "4px 0 0 0", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                              Note: If candidate has no grade, this field is automatically completely hidden.
                            </p>
                          )}
                          {selectedFieldKey === 'categoryName' && (
                            <p style={{ margin: "4px 0 0 0", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                              Leave prefix blank if you only want the category name (e.g. Fadhila, Fadheela) to print without the word &quot;Category:&quot;.
                            </p>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* Save and Reset Buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={handleSaveLayout}
                    disabled={savingLayout}
                    className="btn btn-primary"
                    style={{ flex: 1, fontWeight: 700 }}
                  >
                    {savingLayout ? "Saving..." : "💾 Save Layout for Fest"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetLayout}
                    className="btn btn-secondary btn-sm"
                  >
                    ↺ Reset
                  </button>
                </div>

                {saveMessage && (
                  <div style={{ marginTop: "10px", fontSize: "0.85rem", fontWeight: 700, color: saveMessage.includes('✅') ? '#059669' : '#d97706' }}>
                    {saveMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Visual Canvas Preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontWeight: 800, fontSize: "1rem" }}>Visual Calibration Canvas</span>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={showTemplateBgInStudio}
                      onChange={(e) => setShowTemplateBgInStudio(e.target.checked)}
                    />
                    <span>Show Template BG in Preview</span>
                  </label>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handlePrint(activeWinnerForStudio)}
                    className="btn btn-primary btn-sm"
                    style={{ fontWeight: 700 }}
                  >
                    🖨️ Test Print Sample
                  </button>
                </div>
              </div>

              {/* Responsive Container for A4 Certificate Aspect Ratio */}
              <div 
                ref={canvasRef}
                style={{
                  position: "relative",
                  width: "100%",
                  paddingBottom: layout.orientation === 'portrait' ? "141.4%" : "70.7%", // Standard A4 Aspect Ratio (1 : 1.414 or 1.414 : 1)
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                  border: "1px solid var(--border-color)",
                  overflow: "hidden"
                }}
              >
                {/* Background Template (Optional in preview) */}
                {layout.templateImageUrl && showTemplateBgInStudio && (
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
                      pointerEvents: "none",
                      opacity: 0.95
                    }}
                  />
                )}

                {/* If no template uploaded, show guidelines overlay */}
                {(!layout.templateImageUrl || !showTemplateBgInStudio) && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "2px dashed #e2e8f0",
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: "0.85rem"
                  }}>
                    {!layout.templateImageUrl && "Upload your certificate scan on the left to visually calibrate text positions"}
                  </div>
                )}

                {/* Render All Enabled Fields on the Interactive Canvas */}
                {(Object.keys(layout.fields) as Array<keyof CertificateLayoutConfig['fields']>).map((fKey) => {
                  const field = layout.fields[fKey];
                  if (!field.enabled) return null;

                  let textToDisplay = "";
                  if (fKey === 'candidateName') textToDisplay = activeWinnerForStudio.candidateName;
                  else if (fKey === 'institutionName') textToDisplay = activeWinnerForStudio.institutionName;
                  else if (fKey === 'place') textToDisplay = formatPlace(activeWinnerForStudio.rank, field.formatType, fullCapitalLetters || field.textTransform === 'uppercase');
                  else if (fKey === 'grade') textToDisplay = formatGrade(activeWinnerForStudio.grade, field.prefix, field.suffix, fullCapitalLetters || field.textTransform === 'uppercase');
                  else if (fKey === 'programName') textToDisplay = activeWinnerForStudio.programName;
                  else if (fKey === 'categoryName') textToDisplay = `${field.prefix || ''}${activeWinnerForStudio.categoryName}${field.suffix || ''}`;
                  else if (fKey === 'chestNumber') textToDisplay = `${field.prefix || ''}${activeWinnerForStudio.chestNumber}${field.suffix || ''}`;
                  else if (fKey === 'zoneName') textToDisplay = activeWinnerForStudio.zoneName || "CSWC Hiya Fiesta";
                  else if (fKey === 'dateYear') textToDisplay = "September 2026";

                  if (fullCapitalLetters || field.textTransform === 'uppercase') {
                    textToDisplay = textToDisplay.toUpperCase();
                  }

                  // Skip rendering grade if candidate has none
                  if (fKey === 'grade' && (!activeWinnerForStudio.grade || activeWinnerForStudio.grade === '-')) {
                    return null;
                  }

                  const isSelected = selectedFieldKey === fKey;

                  return (
                    <div
                      key={fKey}
                      onClick={() => setSelectedFieldKey(fKey)}
                      style={{
                        position: "absolute",
                        top: `${field.top}%`,
                        left: `${field.left}%`,
                        transform: field.textAlign === 'center' 
                          ? 'translate(-50%, -50%)' 
                          : field.textAlign === 'right' 
                          ? 'translate(-100%, -50%)' 
                          : 'translate(0, -50%)',
                        maxWidth: field.width ? `${field.width}%` : '80%',
                        fontSize: `${field.fontSize * 0.8}px`, // Scaled for preview container
                        fontWeight: field.fontWeight,
                        fontFamily: field.fontFamily,
                        color: field.color,
                        textAlign: field.textAlign,
                        letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : undefined,
                        textTransform: fullCapitalLetters ? 'uppercase' : (field.textTransform || 'none'),
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: isSelected ? "2px solid #2563eb" : "1px dashed transparent",
                        backgroundColor: isSelected ? "rgba(37,99,235,0.12)" : "transparent",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                        transition: "border 0.15s, background 0.15s"
                      }}
                    >
                      {textToDisplay}
                      {isSelected && (
                        <div style={{
                          position: "absolute",
                          top: "-18px",
                          left: "0",
                          backgroundColor: "#2563eb",
                          color: "#fff",
                          fontSize: "10px",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          fontWeight: 700
                        }}>
                          {field.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <span>💡 Click on any text on the canvas to select and adjust its area.</span>
                <span>Previewing with: <strong>{activeWinnerForStudio.candidateName} ({formatPlace(activeWinnerForStudio.rank)})</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRINT-ONLY RENDERING ENGINE (@media print)                             */}
      {/* ========================================================================= */}
      {/* 
        CRITICAL USER REQUIREMENT:
        "note: there is no the bg the template in print the result data only need with need print it in trasprent to the alredy printed certificate wihtout the result data to make it easy"
        
        When layout.printMode === 'transparent':
        - The template image is completely excluded / hidden!
        - Only pure result data prints onto the blank certificate paper.
        - Each certificate is exactly one physical page (break-after: page).
      */}
      <div className="print-certificates-container">
        {(previewWinner ? [previewWinner] : candidatesToPrint).map((candidate, idx) => {
          return (
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
                transform: (layout.globalOffsetX !== 0 || layout.globalOffsetY !== 0)
                  ? `translate(${layout.globalOffsetX}mm, ${layout.globalOffsetY}mm)`
                  : undefined
              }}
            >
              {/* If Full mode is explicitly requested, include template background */}
              {layout.printMode === 'full' && layout.templateImageUrl && (
                <img
                  src={layout.templateImageUrl}
                  alt="Template"
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
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.candidateName.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {(fullCapitalLetters || layout.fields.candidateName.textTransform === 'uppercase') 
                    ? (candidate.candidateName || '').toUpperCase() 
                    : candidate.candidateName}
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
                    letterSpacing: layout.fields.institutionName.letterSpacing ? `${layout.fields.institutionName.letterSpacing}px` : undefined,
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.institutionName.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {(() => {
                    const inst = `${candidate.institutionName || ''}${candidate.institutionPlace ? `, ${candidate.institutionPlace}` : ''}`;
                    return (fullCapitalLetters || layout.fields.institutionName.textTransform === 'uppercase') ? inst.toUpperCase() : inst;
                  })()}
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
                    letterSpacing: layout.fields.place.letterSpacing ? `${layout.fields.place.letterSpacing}px` : undefined,
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.place.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {formatPlace(candidate.rank, layout.fields.place.formatType, fullCapitalLetters || layout.fields.place.textTransform === 'uppercase')}
                </div>
              )}

              {/* Grade (A, B) - OMITTED IF NO GRADE */}
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
                    letterSpacing: layout.fields.grade.letterSpacing ? `${layout.fields.grade.letterSpacing}px` : undefined,
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.grade.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {formatGrade(candidate.grade, layout.fields.grade.prefix, layout.fields.grade.suffix, fullCapitalLetters || layout.fields.grade.textTransform === 'uppercase')}
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
                    letterSpacing: layout.fields.programName.letterSpacing ? `${layout.fields.programName.letterSpacing}px` : undefined,
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.programName.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {(fullCapitalLetters || layout.fields.programName.textTransform === 'uppercase') 
                    ? (candidate.programName || '').toUpperCase() 
                    : candidate.programName}
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
                    letterSpacing: layout.fields.categoryName.letterSpacing ? `${layout.fields.categoryName.letterSpacing}px` : undefined,
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.categoryName.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {(() => {
                    const cat = `${layout.fields.categoryName.prefix || ''}${candidate.categoryName || ''}${layout.fields.categoryName.suffix || ''}`;
                    return (fullCapitalLetters || layout.fields.categoryName.textTransform === 'uppercase') ? cat.toUpperCase() : cat;
                  })()}
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
                    letterSpacing: layout.fields.chestNumber.letterSpacing ? `${layout.fields.chestNumber.letterSpacing}px` : undefined,
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.chestNumber.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {(() => {
                    const chest = `${layout.fields.chestNumber.prefix || ''}${candidate.chestNumber || ''}${layout.fields.chestNumber.suffix || ''}`;
                    return (fullCapitalLetters || layout.fields.chestNumber.textTransform === 'uppercase') ? chest.toUpperCase() : chest;
                  })()}
                </div>
              )}

              {/* Zone Name */}
              {layout.fields.zoneName && layout.fields.zoneName.enabled && (
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
                    letterSpacing: layout.fields.zoneName.letterSpacing ? `${layout.fields.zoneName.letterSpacing}px` : undefined,
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.zoneName.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {(() => {
                    const zone = candidate.zoneName || "CSWC Fest";
                    return (fullCapitalLetters || layout.fields.zoneName.textTransform === 'uppercase') ? zone.toUpperCase() : zone;
                  })()}
                </div>
              )}

              {/* Date / Year */}
              {layout.fields.dateYear && layout.fields.dateYear.enabled && (
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
                    letterSpacing: layout.fields.dateYear.letterSpacing ? `${layout.fields.dateYear.letterSpacing}px` : undefined,
                    textTransform: fullCapitalLetters ? 'uppercase' : (layout.fields.dateYear.textTransform || 'none'),
                    whiteSpace: "nowrap"
                  }}
                >
                  {(fullCapitalLetters || layout.fields.dateYear.textTransform === 'uppercase') ? "SEPTEMBER 2026" : "September 2026"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 5. CSS PRINT STYLING RULES                                                */}
      {/* ========================================================================= */}
      <style jsx global>{`
        @media screen {
          .print-certificates-container {
            display: none !important;
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

          /* Hide all UI elements */
          .no-print, nav, header, aside, .sidebar, .navbar, .btn {
            display: none !important;
          }

          .print-certificates-container {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .certificate-print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
