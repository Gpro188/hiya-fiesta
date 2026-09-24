"use client";

import React, { useState, useMemo } from "react";
import PrintButton from "@/components/PrintButton";

export interface StateWinner {
  rank: number;
  grade: string | null;
  marks: number;
  candidateName: string | null;
  chestNumber: string;
  uid?: string | null;
  institutionName: string;
  institutionCode: string;
  teamId: string;
  teamName: string;
  participants?: { name: string; chestNumber: string }[];
}

export interface StateProgram {
  id: string;
  code: string;
  name: string;
  category: "FADHILA" | "FADHEELA" | "GENERAL";
  type: string;
  stageType: string;
  isGeneral: boolean;
  isMagazine: boolean;
  qualificationRule: string;
  winners: StateWinner[];
}

export interface StateSelectedViewProps {
  programs: StateProgram[];
  zoneName: string;
  eventName: string;
  festName: string;
  festLogo: string | null;
  institutions: { id: string; name: string; code: string }[];
  initialTeamId?: string;
}

export default function ProgramStateSelectedView({
  programs,
  zoneName,
  eventName,
  festName,
  festLogo,
  institutions,
  initialTeamId
}: StateSelectedViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedInstitution, setSelectedInstitution] = useState<string>(initialTeamId || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter programs based on state
  const filteredPrograms = useMemo(() => {
    return programs
      .map(p => {
        // Filter winners by institution if selected
        let winners = p.winners;
        if (selectedInstitution !== "ALL") {
          winners = winners.filter(w => w.teamId === selectedInstitution || w.institutionCode === selectedInstitution);
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesProg = p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
          const matchingWinners = winners.filter(w => 
            (w.candidateName && w.candidateName.toLowerCase().includes(q)) ||
            w.chestNumber.toLowerCase().includes(q) ||
            w.institutionName.toLowerCase().includes(q) ||
            w.institutionCode.toLowerCase().includes(q) ||
            (w.participants && w.participants.some(pt => pt.name.toLowerCase().includes(q) || pt.chestNumber.toLowerCase().includes(q)))
          );

          if (!matchesProg && matchingWinners.length === 0) {
            return null;
          }
          if (!matchesProg && matchingWinners.length > 0) {
            winners = matchingWinners;
          }
        }

        return { ...p, winners };
      })
      .filter((p): p is StateProgram => p !== null && p.winners.length > 0)
      .filter(p => selectedCategory === "ALL" || p.category === selectedCategory);
  }, [programs, selectedCategory, selectedInstitution, searchQuery]);

  // KPIs
  const totalPrograms = filteredPrograms.length;
  const totalWinnersCount = useMemo(() => {
    let count = 0;
    for (const p of filteredPrograms) {
      for (const w of p.winners) {
        if (p.isMagazine) {
          count += 1;
        } else if (w.participants && w.participants.length > 0) {
          count += w.participants.length;
        } else {
          count += 1;
        }
      }
    }
    return count;
  }, [filteredPrograms]);

  const winningInstitutionsCount = useMemo(() => {
    const instSet = new Set<string>();
    for (const p of filteredPrograms) {
      for (const w of p.winners) {
        instSet.add(w.institutionName);
      }
    }
    return instSet.size;
  }, [filteredPrograms]);

  // Group by category
  const categories: ("FADHILA" | "FADHEELA" | "GENERAL")[] = ["FADHILA", "FADHEELA", "GENERAL"];
  const programsByCategory = useMemo(() => {
    const map = new Map<string, StateProgram[]>();
    categories.forEach(cat => map.set(cat, []));
    for (const p of filteredPrograms) {
      const list = map.get(p.category) || [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [filteredPrograms]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: programs.length, FADHILA: 0, FADHEELA: 0, GENERAL: 0 };
    for (const p of programs) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [programs]);

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#0f172a", minHeight: "100vh", padding: "28px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          .program-block { break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px; }
          @page { size: A4 portrait; margin: 10mm; }
        }
        .program-block {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 22px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
        }
      `}</style>

      {/* Control Bar (hidden in print) */}
      <div className="no-print" style={{ marginBottom: "24px", padding: "16px 20px", backgroundColor: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.3rem" }}>🌟</span>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900, color: "#8E0033" }}>
                Official State Selected Students List (Program-Wise)
              </h2>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Categorized by Fadhila, Fadheela &amp; General with Top 2 &amp; 1st Place qualification rules
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <PrintButton color="#8E0033" label="Print Official Schedule / List" />
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { id: "ALL", label: `All Categories (${categoryCounts.ALL})` },
              { id: "FADHILA", label: `Fadhila (${categoryCounts.FADHILA})` },
              { id: "FADHEELA", label: `Fadheela (${categoryCounts.FADHEELA})` },
              { id: "GENERAL", label: `General (${categoryCounts.GENERAL})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  border: selectedCategory === tab.id ? "2px solid #8E0033" : "1.5px solid #cbd5e1",
                  backgroundColor: selectedCategory === tab.id ? "#8E0033" : "#ffffff",
                  color: selectedCategory === tab.id ? "#ffffff" : "#475569",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Institution Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>College:</span>
            <select
              value={selectedInstitution}
              onChange={e => setSelectedInstitution(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                border: "1.5px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                fontWeight: 600,
                maxWidth: "260px"
              }}
            >
              <option value="ALL">All Institutions (Official Complete List)</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.code} - {inst.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <input
              type="text"
              placeholder="Search program, student name, chest no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                border: "1.5px solid #cbd5e1",
                backgroundColor: "#ffffff"
              }}
            />
          </div>

          {(selectedCategory !== "ALL" || selectedInstitution !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedInstitution("ALL");
                setSearchQuery("");
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f1f5f9",
                color: "#64748b",
                cursor: "pointer"
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Official Header */}
      <div style={{ borderBottom: "3px solid #8E0033", paddingBottom: "16px", marginBottom: "20px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "8px" }}>
          {festLogo && (
            <img src={festLogo} alt="Logo" style={{ height: "64px", objectFit: "contain" }} />
          )}
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "1.5px", color: "#8E0033", textTransform: "uppercase" }}>
              Council of Samastha Women's Colleges (CSWC)
            </div>
            <h1 style={{ margin: "3px 0", fontSize: "1.85rem", fontWeight: 900, color: "#0f172a" }}>
              {festName || "HIYA FIESTA 2026"}
            </h1>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#8E0033", letterSpacing: "0.5px" }}>
              {zoneName.toUpperCase()} &bull; OFFICIAL STATE FESTIVAL QUALIFIED LIST
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "3px" }}>
              Category-Wise &amp; Program-Wise State Selection List &bull; Rank 1 &amp; 2 for Fadhila / Fadheela &bull; 1st Place for General
            </div>
          </div>
        </div>

        {/* Selected Institution Filter Subheader (if filtered) */}
        {selectedInstitution !== "ALL" && (
          <div style={{ backgroundColor: "#eff6ff", border: "1.5px solid #bfdbfe", padding: "8px 14px", borderRadius: "6px", display: "inline-block", marginTop: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e40af" }}>
              Filtered for College:{" "}
              <strong>
                {institutions.find(i => i.id === selectedInstitution)?.name || selectedInstitution}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "24px" }}>
        <div style={{ border: "1.5px solid #bbf7d0", backgroundColor: "#f0fdf4", padding: "10px 16px", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>Qualified Programs</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#15803d", marginTop: "2px" }}>{totalPrograms}</div>
          <div style={{ fontSize: "0.72rem", color: "#166534" }}>With State Selected Winners</div>
        </div>
        <div style={{ border: "1.5px solid #fed7aa", backgroundColor: "#fff7ed", padding: "10px 16px", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#9a3412", textTransform: "uppercase" }}>Selected Candidates / Entries</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#c2410c", marginTop: "2px" }}>{totalWinnersCount}</div>
          <div style={{ fontSize: "0.72rem", color: "#9a3412" }}>Representing at State Final</div>
        </div>
        <div style={{ border: "1.5px solid #ddd6fe", backgroundColor: "#f5f3ff", padding: "10px 16px", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#5b21b6", textTransform: "uppercase" }}>Winning Colleges</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#6d28d9", marginTop: "2px" }}>{winningInstitutionsCount}</div>
          <div style={{ fontSize: "0.72rem", color: "#5b21b6" }}>Institutions Qualified</div>
        </div>
      </div>

      {/* Program Sections by Category */}
      {totalPrograms === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", border: "2px dashed #cbd5e1", borderRadius: "10px", color: "#64748b", margin: "24px 0" }}>
          <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📋</div>
          <h3 style={{ margin: "0 0 6px 0", color: "#334155" }}>No Qualified Programs Found</h3>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            No programs matching the current filters or no candidates with qualifying ranks (Rank 1 or 2).
          </p>
        </div>
      ) : (
        categories.map(categoryKey => {
          const catPrograms = programsByCategory.get(categoryKey) || [];
          if (catPrograms.length === 0) return null;

          const isGeneralCat = categoryKey === "GENERAL";
          const catTitle = isGeneralCat ? "GENERAL PROGRAMS" : `${categoryKey} CATEGORY`;
          const catSubtitle = isGeneralCat 
            ? "1st Place Only Qualified for State Final &bull; Magazine: Institution Only" 
            : "Top 2 (1st & 2nd Place Winners) Qualified for State Final";
          const catHeaderBg = isGeneralCat ? "#fdf4ff" : (categoryKey === "FADHILA" ? "#fff1f2" : "#f0fdf4");
          const catBorderColor = isGeneralCat ? "#d946ef" : (categoryKey === "FADHILA" ? "#e11d48" : "#16a34a");
          const catTextColor = isGeneralCat ? "#86198f" : (categoryKey === "FADHILA" ? "#9f1239" : "#166534");

          return (
            <div key={categoryKey} style={{ marginBottom: "36px" }}>
              {/* Category Header Banner */}
              <div
                style={{
                  backgroundColor: catHeaderBg,
                  border: `2px solid ${catBorderColor}`,
                  borderRadius: "8px",
                  padding: "10px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px"
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900, color: catTextColor, letterSpacing: "0.5px" }}>
                    🌟 {catTitle}
                  </h2>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginTop: "2px" }} dangerouslySetInnerHTML={{ __html: catSubtitle }}>
                  </div>
                </div>
                <div style={{ backgroundColor: "#ffffff", padding: "4px 12px", borderRadius: "999px", border: `1.5px solid ${catBorderColor}`, fontSize: "0.8rem", fontWeight: 800, color: catTextColor }}>
                  {catPrograms.length} {catPrograms.length === 1 ? "Program" : "Programs"}
                </div>
              </div>

              {/* Programs List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {catPrograms.map(prog => (
                  <div key={prog.id} className="program-block">
                    {/* Program Title Bar */}
                    <div style={{
                      backgroundColor: "#f8fafc",
                      borderBottom: "1.5px solid #e2e8f0",
                      padding: "10px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          backgroundColor: "#8E0033",
                          color: "#ffffff",
                          fontSize: "0.8rem",
                          fontWeight: 900,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontFamily: "monospace"
                        }}>
                          #{prog.code}
                        </span>
                        <span style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>
                          {prog.name}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Stage Badge */}
                        <span style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: prog.stageType === "OFF_STAGE" ? "#e0f2fe" : "#fce7f3",
                          color: prog.stageType === "OFF_STAGE" ? "#0369a1" : "#be185d"
                        }}>
                          {prog.stageType === "OFF_STAGE" ? "Off-Stage" : "On-Stage"}
                        </span>

                        {/* Type Badge */}
                        <span style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: prog.type === "INDIVIDUAL" ? "#f1f5f9" : "#ede9fe",
                          color: prog.type === "INDIVIDUAL" ? "#475569" : "#6d28d9"
                        }}>
                          {prog.isMagazine ? "Institution Program" : (prog.type === "INDIVIDUAL" ? "Individual" : "Group")}
                        </span>

                        {/* Rule Badge */}
                        <span style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: prog.isGeneral ? "#fef3c7" : "#dcfce7",
                          color: prog.isGeneral ? "#b45309" : "#15803d"
                        }}>
                          {prog.isGeneral ? "1st Place Only" : "Top 2 Qualified"}
                        </span>
                      </div>
                    </div>

                    {/* Winners Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#ffffff", borderBottom: "1.5px solid #cbd5e1", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px", width: "36px", textAlign: "center" }}>#</th>
                          <th style={{ padding: "8px 12px", width: "100px", textAlign: "center" }}>Rank / Place</th>
                          <th style={{ padding: "8px 12px", width: "90px", textAlign: "center" }}>Chest No</th>
                          <th style={{ padding: "8px 12px" }}>
                            {prog.isMagazine ? "Participating Entry" : (prog.type === "INDIVIDUAL" ? "Candidate Name" : "Winning Candidate(s) / Participants")}
                          </th>
                          <th style={{ padding: "8px 12px" }}>Institution / College</th>
                          <th style={{ padding: "8px 12px", width: "70px", textAlign: "center" }}>Grade</th>
                          <th style={{ padding: "8px 12px", width: "130px", textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prog.winners.map((winner, widx) => {
                          const isFirst = winner.rank === 1;
                          return (
                            <tr
                              key={`${prog.id}-${winner.teamId}-${widx}`}
                              style={{
                                borderBottom: widx < prog.winners.length - 1 ? "1px solid #f1f5f9" : "none",
                                backgroundColor: widx % 2 === 0 ? "#ffffff" : "#fbfcfe"
                              }}
                            >
                              <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                                {widx + 1}
                              </td>

                              {/* Rank */}
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 10px",
                                  borderRadius: "999px",
                                  fontWeight: 900,
                                  fontSize: "0.75rem",
                                  backgroundColor: isFirst ? "#fef3c7" : "#f1f5f9",
                                  color: isFirst ? "#b45309" : "#334155",
                                  border: isFirst ? "1px solid #fde68a" : "1px solid #cbd5e1"
                                }}>
                                  {isFirst ? "🥇 1st Place" : "🥈 2nd Place"}
                                </span>
                              </td>

                              {/* Chest Number */}
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                {prog.isMagazine ? (
                                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>&mdash;</span>
                                ) : (
                                  <span style={{
                                    fontFamily: "monospace",
                                    fontWeight: 900,
                                    fontSize: "0.95rem",
                                    color: "#8E0033",
                                    backgroundColor: "#fff1f2",
                                    padding: "2px 8px",
                                    borderRadius: "4px"
                                  }}>
                                    {winner.chestNumber !== "-" ? winner.chestNumber : (winner.participants && winner.participants.length > 0 ? "GROUP" : "-")}
                                  </span>
                                )}
                              </td>

                              {/* Candidate Name / Participants */}
                              <td style={{ padding: "10px 12px" }}>
                                {prog.isMagazine ? (
                                  <div style={{ color: "#0f172a", fontStyle: "italic", fontWeight: 700 }}>
                                    Official Campus Magazine Submission (College Entry)
                                  </div>
                                ) : winner.participants && winner.participants.length > 0 ? (
                                  <div>
                                    <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
                                      {winner.teamName} Team ({winner.participants.length} Participants):
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                      {winner.participants.map((pt, pidx) => (
                                        <span
                                          key={pidx}
                                          style={{
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            backgroundColor: "#f8fafc",
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            color: "#334155"
                                          }}
                                        >
                                          {pt.name} {pt.chestNumber && pt.chestNumber !== "-" ? `(${pt.chestNumber})` : ""}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
                                      {winner.candidateName || winner.teamName}
                                    </div>
                                    {winner.uid && (
                                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                                        UID: {winner.uid}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Institution */}
                              <td style={{ padding: "10px 12px" }}>
                                <div style={{ fontWeight: 800, color: "#0f172a" }}>
                                  {winner.institutionName}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                                  Code: <span style={{ fontFamily: "monospace", color: "#8E0033" }}>{winner.institutionCode}</span>
                                </div>
                              </td>

                              {/* Grade */}
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <span style={{
                                  fontWeight: 900,
                                  fontSize: "0.85rem",
                                  color: winner.grade === "A" ? "#15803d" : (winner.grade === "B" ? "#0284c7" : "#64748b")
                                }}>
                                  {winner.grade ? `Grade ${winner.grade}` : "-"}
                                </span>
                              </td>

                              {/* State Status */}
                              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                <span style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 900,
                                  color: "#15803d",
                                  backgroundColor: "#dcfce7",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid #86efac",
                                  display: "inline-block",
                                  whiteSpace: "nowrap"
                                }}>
                                  ✓ QUALIFIED FOR STATE
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Official Signatures Section */}
      <div style={{ marginTop: "48px", paddingTop: "20px", borderTop: "2px solid #cbd5e1", breakInside: "avoid", pageBreakInside: "avoid" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", textAlign: "center", marginTop: "32px" }}>
          <div>
            <div style={{ borderBottom: "1.5px dashed #94a3b8", width: "80%", margin: "0 auto 8px" }}></div>
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>Chief Controller / Valuator</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Zonal Valuation Board</div>
          </div>
          <div>
            <div style={{ borderBottom: "1.5px dashed #94a3b8", width: "80%", margin: "0 auto 8px" }}></div>
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>Zonal Convener / Secretary</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{zoneName} Committee</div>
          </div>
          <div>
            <div style={{ borderBottom: "1.5px dashed #94a3b8", width: "80%", margin: "0 auto 8px" }}></div>
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>General Convener / Controller</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>CSWC State Festival 2026</div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "32px", fontSize: "0.72rem", color: "#94a3b8" }}>
          Authenticated Computer-Generated Official Report &bull; Council of Samastha Women's Colleges (CSWC) &bull; {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}
