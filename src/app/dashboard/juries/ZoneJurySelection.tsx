"use client";

import { useState, useMemo } from "react";
import { toggleJurySelection, assignJudgesToProgram, assignJudgesToVenue } from "./actions";
import VenueLoginsTab from "./VenueLoginsTab";

interface ZoneJurySelectionProps {
  allJudges: any[];
  selectedJudges: any[];
  programs?: any[];
  eventId: string;
  venues?: string[];
  venueUsers?: any[];
  programCountsByVenue?: Record<string, number>;
  zoneCode?: string;
  zoneName?: string;
  isCollab?: boolean;
}

export default function ZoneJurySelection({ 
  allJudges, 
  selectedJudges, 
  programs = [],
  eventId,
  venues = [],
  venueUsers = [],
  programCountsByVenue = {},
  zoneCode = "",
  zoneName = "",
  isCollab = false
}: ZoneJurySelectionProps) {
  const [activeTab, setActiveTab] = useState<'selection' | 'assignment' | 'venue-logins'>('assignment');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  
  // View mode in assignment tab: 'venue' (collapsible stages) or 'category'
  const [viewMode, setViewMode] = useState<'venue' | 'category'>('venue');
  
  // Festival Filter: 'ALL' | 'STATE' | 'PG'
  const [festFilter, setFestFilter] = useState<'ALL' | 'STATE' | 'PG'>('ALL');
  
  // Category View state
  const [selectedCategory, setSelectedCategory] = useState<string>("FADHILA");
  const [selectedStage, setSelectedStage] = useState<string>("On Stage");

  // Collapsed state for venue accordion cards (venueName -> boolean)
  const [collapsedVenues, setCollapsedVenues] = useState<Record<string, boolean>>({});

  // Global Batch Venue Assignment state
  const [batchVenue, setBatchVenue] = useState<string>(venues[0] || "");
  const [batchJury1, setBatchJury1] = useState("");
  const [batchJury2, setBatchJury2] = useState("");
  const [batchTargetFest, setBatchTargetFest] = useState<'ALL' | 'STATE' | 'PG'>('ALL');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Per-venue inline assign state
  const [inlineVenueJuries, setInlineVenueJuries] = useState<Record<string, { jury1: string; jury2: string; targetFest: 'ALL' | 'STATE' | 'PG' }>>({});
  const [inlineLoadingVenue, setInlineLoadingVenue] = useState<string | null>(null);
  const [inlineMessage, setInlineMessage] = useState<Record<string, { type: 'success' | 'error', text: string }>>({});

  // Detect if there are both State and PG programs
  const hasCollabPrograms = useMemo(() => {
    return isCollab || programs.some(p => p.festType === 'PG') || eventId === 'collab_state_pg';
  }, [isCollab, programs, eventId]);

  // Unified Venues list (including unassigned if any)
  const venuesList = useMemo(() => {
    const list = Array.from(new Set([
      ...venues,
      ...programs.map(p => p.venue?.trim()).filter(Boolean)
    ])).sort();

    const hasUnassigned = programs.some(p => !p.venue || !p.venue.trim());
    if (hasUnassigned && !list.includes("Unassigned / Off-Stage")) {
      list.push("Unassigned / Off-Stage");
    }
    return list;
  }, [venues, programs]);

  // Pre-fill initial batchVenue if empty
  if (!batchVenue && venuesList.length > 0) {
    setBatchVenue(venuesList[0]);
  }

  // Derive dynamic list of categories present
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(
      programs.map(p => {
        if (p.type === 'GENERAL') return 'GENERAL PROGRAMS';
        return (p.category?.name || 'GENERAL PROGRAMS').toUpperCase();
      })
    ));

    const standardOrder = ["FADHILA", "FADHEELA", "FADHEELA PG", "GENERAL PROGRAMS"];
    return cats.sort((a, b) => {
      const iA = standardOrder.indexOf(a);
      const iB = standardOrder.indexOf(b);
      if (iA !== -1 && iB !== -1) return iA - iB;
      if (iA !== -1) return -1;
      if (iB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [programs]);

  // Ensure selectedCategory is valid
  if (availableCategories.length > 0 && !availableCategories.includes(selectedCategory)) {
    if (availableCategories.includes("FADHILA")) {
      setSelectedCategory("FADHILA");
    } else {
      setSelectedCategory(availableCategories[0]);
    }
  }

  // Toggle single venue collapse
  const toggleCollapse = (venue: string) => {
    setCollapsedVenues(prev => ({
      ...prev,
      [venue]: !prev[venue]
    }));
  };

  const expandAllVenues = () => setCollapsedVenues({});
  const collapseAllVenues = () => {
    const next: Record<string, boolean> = {};
    venuesList.forEach(v => { next[v] = true; });
    setCollapsedVenues(next);
  };

  // Group programs by venue
  const programsByVenue = useMemo(() => {
    const map: Record<string, any[]> = {};
    programs.forEach(p => {
      const v = p.venue?.trim() || "Unassigned / Off-Stage";
      if (!map[v]) map[v] = [];
      map[v].push(p);
    });
    return map;
  }, [programs]);

  // Global batch assign handler
  const handleBatchAssign = async () => {
    if (!batchVenue) {
      setBatchMessage({ type: 'error', text: 'Please select a venue first.' });
      return;
    }
    const chosenIds = [batchJury1, batchJury2].filter(Boolean);
    if (chosenIds.length === 0) {
      setBatchMessage({ type: 'error', text: 'Please select at least one jury.' });
      return;
    }
    setBatchLoading(true);
    setBatchMessage(null);
    const res = await assignJudgesToVenue(eventId, batchVenue, chosenIds, { targetFest: batchTargetFest });
    if (res.success) {
      const festSuffix = hasCollabPrograms && batchTargetFest !== 'ALL' 
        ? ` (${batchTargetFest === 'STATE' ? 'State Final only' : 'Fadheela PG only'})` 
        : (hasCollabPrograms ? ' (State Final & Fadheela PG)' : '');
      setBatchMessage({ 
        type: 'success', 
        text: `✅ Successfully assigned ${chosenIds.length} jury/juries to ${res.count || ''} programs in "${batchVenue}"${festSuffix}!` 
      });
    } else {
      setBatchMessage({ type: 'error', text: res.error || 'Failed to assign juries to venue.' });
    }
    setBatchLoading(false);
  };

  // Inline venue assign handler
  const handleInlineAssign = async (venueName: string) => {
    const current = inlineVenueJuries[venueName] || { jury1: "", jury2: "", targetFest: "ALL" };
    const chosenIds = [current.jury1, current.jury2].filter(Boolean);
    if (chosenIds.length === 0) {
      setInlineMessage(prev => ({
        ...prev,
        [venueName]: { type: 'error', text: 'Please select at least one jury.' }
      }));
      return;
    }

    setInlineLoadingVenue(venueName);
    setInlineMessage(prev => {
      const copy = { ...prev };
      delete copy[venueName];
      return copy;
    });

    const res = await assignJudgesToVenue(eventId, venueName, chosenIds, { targetFest: current.targetFest });
    if (res.success) {
      const festSuffix = hasCollabPrograms && current.targetFest !== 'ALL' 
        ? ` (${current.targetFest === 'STATE' ? 'State only' : 'PG only'})` 
        : (hasCollabPrograms ? ' (State & PG Collab)' : '');
      setInlineMessage(prev => ({
        ...prev,
        [venueName]: { 
          type: 'success', 
          text: `✅ Assigned to ${res.count || ''} programs in "${venueName}"${festSuffix}!` 
        }
      }));
    } else {
      setInlineMessage(prev => ({
        ...prev,
        [venueName]: { type: 'error', text: res.error || 'Failed to assign.' }
      }));
    }
    setInlineLoadingVenue(null);
  };

  const selectedIds = new Set(selectedJudges.map(j => j.id));

  const handleToggle = async (judgeId: string, isCurrentlySelected: boolean) => {
    setLoadingId(judgeId);
    await toggleJurySelection(eventId, judgeId, !isCurrentlySelected);
    setLoadingId(null);
  };

  const handleAssign = async (programId: string, judgeIds: string[]) => {
    setLoadingId(programId);
    await assignJudgesToProgram(programId, judgeIds);
    setLoadingId(null);
  };

  const filteredJudges = allJudges.filter(j => 
    j.username.toLowerCase().includes(search.toLowerCase())
  );

  // Group programs by Category, then by Stage Type (for Category View)
  const groupedPrograms = useMemo(() => {
    const filtered = programs.filter(p => {
      const matchSearch = !programSearch || 
        p.name.toLowerCase().includes(programSearch.toLowerCase()) || 
        (p.programCode && p.programCode.toLowerCase().includes(programSearch.toLowerCase()));
      const matchFest = festFilter === 'ALL' || 
        (festFilter === 'STATE' && p.festType !== 'PG') || 
        (festFilter === 'PG' && p.festType === 'PG');
      return matchSearch && matchFest;
    });

    return filtered.reduce((acc, p) => {
      let categoryGroup = "GENERAL PROGRAMS";
      if (p.type === 'GENERAL') {
        categoryGroup = "GENERAL PROGRAMS";
      } else if (p.category?.name) {
        categoryGroup = p.category.name.toUpperCase();
      }

      const stageGroup = p.stageType === 'ON_STAGE' ? 'On Stage' : 'Off Stage';

      if (!acc[categoryGroup]) acc[categoryGroup] = {};
      if (!acc[categoryGroup][stageGroup]) acc[categoryGroup][stageGroup] = [];
      
      acc[categoryGroup][stageGroup].push(p);
      return acc;
    }, {} as Record<string, Record<string, any[]>>);
  }, [programs, programSearch, festFilter]);

  // Overall statistics
  const totalStateProgs = programs.filter(p => p.festType !== 'PG').length;
  const totalPgProgs = programs.filter(p => p.festType === 'PG').length;
  const totalAssignedProgs = programs.filter(p => p.judges && p.judges.length > 0).length;

  return (
    <div>
      {/* Top Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('selection')} 
          className={`btn ${activeTab === 'selection' ? 'btn-primary' : 'btn-secondary'}`}
        >
          1. Select Juries (Pool: {selectedJudges.length})
        </button>
        <button 
          onClick={() => setActiveTab('assignment')} 
          className={`btn ${activeTab === 'assignment' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>2. Assign to Programs</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: activeTab === 'assignment' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
            fontWeight: 700
          }}>
            {totalAssignedProgs}/{programs.length} Assigned
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('venue-logins')} 
          className={`btn ${activeTab === 'venue-logins' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>🏛️</span>
          <span>3. Venue / Stage Logins ({venuesList.filter(v => v !== "Unassigned / Off-Stage").length})</span>
        </button>
      </div>

      {/* ─── TAB 1: JURY SELECTION ─── */}
      {activeTab === 'selection' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
          {/* Master List */}
          <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Global Jury Master List</h3>
            <input 
              type="text"
              className="form-input"
              placeholder="Search global juries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 'var(--spacing-md)' }}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
              {filteredJudges.map(judge => {
                const isSelected = selectedIds.has(judge.id);
                return (
                  <div key={judge.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px', 
                    backgroundColor: 'rgba(255,255,255,0.05)', 
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid transparent'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{judge.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {(judge.phone || judge.place) ? `${judge.phone || ''} ${judge.place ? `(${judge.place})` : ''}` : 'No contact info'}
                      </div>
                      {isSelected && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                          ✓ In Festival Jury Pool
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleToggle(judge.id, isSelected)}
                      disabled={loadingId === judge.id}
                      className={`btn ${isSelected ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      {loadingId === judge.id ? "..." : (isSelected ? "Remove" : "Add to Pool")}
                    </button>
                  </div>
                );
              })}
              {filteredJudges.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No juries found.</div>}
            </div>
          </div>

          {/* Selected Juries for this Zone / Festival */}
          <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>
              Active Jury Pool ({selectedJudges.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}>
              These juries are available to be assigned to programs and stages in the Assignment tab.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
              {selectedJudges.map(judge => (
                <div key={judge.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px', 
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(236, 72, 153, 0.3)'
                }}>
                  <div style={{ fontWeight: 600 }}>
                    {judge.username}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      {(judge.phone || judge.place) ? `${judge.phone || ''} ${judge.place ? `(${judge.place})` : ''}` : 'No contact info'}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleToggle(judge.id, true)}
                    disabled={loadingId === judge.id}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {selectedJudges.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  You haven't added any juries to the pool yet.<br />Add them from the Global list.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ASSIGNMENT TAB ─── */}
      {activeTab === 'assignment' && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          {/* Header & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Program & Venue Jury Assignment</span>
                {hasCollabPrograms && (
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    border: '1px solid #c7d2fe',
                    fontWeight: 800
                  }}>
                    🤝 State & PG Collab
                  </span>
                )}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Assign juries to an entire venue/stage with 1-click or customize individual competition programs below.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                type="text"
                className="form-input"
                placeholder="Search program or code..."
                value={programSearch}
                onChange={e => setProgramSearch(e.target.value)}
                style={{ width: '240px' }}
              />
            </div>
          </div>

          {/* ── Control Bar: View Switcher & Fest Filter ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>
                View Mode:
              </span>
              <button
                onClick={() => setViewMode('venue')}
                className={`btn ${viewMode === 'venue' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '5px 14px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 700 }}
              >
                🏛️ By Venue / Stage (Collapsible)
              </button>
              <button
                onClick={() => setViewMode('category')}
                className={`btn ${viewMode === 'category' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '5px 14px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 700 }}
              >
                📂 By Category
              </button>
            </div>

            {/* Collab Fest Filter Pills (State vs PG) */}
            {hasCollabPrograms && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>
                  Filter Fest:
                </span>
                <button
                  onClick={() => setFestFilter('ALL')}
                  className={`btn ${festFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '20px' }}
                >
                  🌟 All ({programs.length})
                </button>
                <button
                  onClick={() => setFestFilter('STATE')}
                  className={`btn ${festFilter === 'STATE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '20px' }}
                >
                  🏆 State Final ({totalStateProgs})
                </button>
                <button
                  onClick={() => setFestFilter('PG')}
                  className={`btn ${festFilter === 'PG' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '20px' }}
                >
                  🎓 Fadheela PG ({totalPgProgs})
                </button>
              </div>
            )}

            {/* Expand / Collapse All (For Venue view) */}
            {viewMode === 'venue' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={expandAllVenues}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  ▼ Expand All Stages
                </button>
                <button
                  onClick={collapseAllVenues}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  ▲ Collapse All
                </button>
              </div>
            )}
          </div>

          {/* ── BATCH ASSIGN TO VENUE (TOP QUICK BAR) ── */}
          {venuesList.length > 0 && (
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1.5px solid #0284c7',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: 'var(--spacing-lg)',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.25rem' }}>⚡</span>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0369a1' }}>
                  Quick Assign Juries to an Entire Venue / Stage
                </h4>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#475569' }}>
                Assign selected juries to <strong>all programs scheduled at a stage</strong> in one single click instead of checking them individually.
                {hasCollabPrograms && " In Collaborative Mode, both State Final and Fadheela PG programs sharing this stage will be updated."}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Venue Select */}
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    🏛️ Venue / Stage
                  </label>
                  <select
                    value={batchVenue}
                    onChange={(e) => setBatchVenue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      backgroundColor: '#fff',
                      color: '#0f172a'
                    }}
                  >
                    {venuesList.map(v => (
                      <option key={v} value={v}>
                        {v} ({(programsByVenue[v] || []).length} programs)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jury 1 Select */}
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    👤 Evaluator 1 (Jury 1)
                  </label>
                  <select
                    value={batchJury1}
                    onChange={(e) => setBatchJury1(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      backgroundColor: '#fff',
                      color: '#0f172a'
                    }}
                  >
                    <option value="">-- Select Jury 1 --</option>
                    {selectedJudges.map(j => (
                      <option key={j.id} value={j.id} disabled={j.id === batchJury2}>
                        {j.username} {j.place ? `(${j.place})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jury 2 Select */}
                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    👤 Evaluator 2 (Jury 2)
                  </label>
                  <select
                    value={batchJury2}
                    onChange={(e) => setBatchJury2(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      backgroundColor: '#fff',
                      color: '#0f172a'
                    }}
                  >
                    <option value="">-- Select Jury 2 (Optional) --</option>
                    {selectedJudges.map(j => (
                      <option key={j.id} value={j.id} disabled={j.id === batchJury1}>
                        {j.username} {j.place ? `(${j.place})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Collab Target Fest Select */}
                {hasCollabPrograms && (
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      🎯 Target Festival
                    </label>
                    <select
                      value={batchTargetFest}
                      onChange={(e: any) => setBatchTargetFest(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        backgroundColor: '#fff',
                        color: '#0f172a'
                      }}
                    >
                      <option value="ALL">Both State & PG</option>
                      <option value="STATE">State Final Only</option>
                      <option value="PG">Fadheela PG Only</option>
                    </select>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleBatchAssign}
                  disabled={batchLoading || !batchVenue || (!batchJury1 && !batchJury2)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    backgroundColor: '#0284c7',
                    borderColor: '#0369a1',
                    color: '#fff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {batchLoading ? 'Assigning...' : '⚡ Assign to Venue'}
                </button>
              </div>

              {batchMessage && (
                <div style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  backgroundColor: batchMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                  color: batchMessage.type === 'success' ? '#15803d' : '#b91c1c',
                  border: `1px solid ${batchMessage.type === 'success' ? '#86efac' : '#fca5a5'}`
                }}>
                  {batchMessage.text}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW MODE 1: BY VENUE / STAGE (COLLAPSIBLE ACCORDION CARDS)
              ═══════════════════════════════════════════════════════════════ */}
          {viewMode === 'venue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {venuesList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  No venues/stages assigned to any programs yet.
                </div>
              ) : (
                venuesList.map((venueName) => {
                  const allInThisVenue = programsByVenue[venueName] || [];
                  const matchingPrograms = allInThisVenue.filter(p => {
                    const matchSearch = !programSearch || 
                      p.name.toLowerCase().includes(programSearch.toLowerCase()) || 
                      (p.programCode && p.programCode.toLowerCase().includes(programSearch.toLowerCase()));
                    const matchFest = festFilter === 'ALL' || 
                      (festFilter === 'STATE' && p.festType !== 'PG') || 
                      (festFilter === 'PG' && p.festType === 'PG');
                    return matchSearch && matchFest;
                  });

                  const stateCount = allInThisVenue.filter(p => p.festType !== 'PG').length;
                  const pgCount = allInThisVenue.filter(p => p.festType === 'PG').length;
                  const assignedCount = allInThisVenue.filter(p => p.judges && p.judges.length > 0).length;
                  const isFullyAssigned = assignedCount === allInThisVenue.length && allInThisVenue.length > 0;
                  const isPartiallyAssigned = assignedCount > 0 && assignedCount < allInThisVenue.length;
                  const isCollapsed = Boolean(collapsedVenues[venueName]);

                  const inlineState = inlineVenueJuries[venueName] || { jury1: "", jury2: "", targetFest: "ALL" };
                  const venueMsg = inlineMessage[venueName];

                  return (
                    <div 
                      key={venueName} 
                      style={{ 
                        border: '1.5px solid var(--border-color)', 
                        borderRadius: '12px', 
                        overflow: 'hidden',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                      }}
                    >
                      {/* ── Collapsible Card Header ── */}
                      <div 
                        onClick={() => toggleCollapse(venueName)}
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.06)', 
                          padding: '14px 18px', 
                          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                            {venueName}
                          </h4>
                          <span className="badge badge-secondary" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                            {allInThisVenue.length} Programs
                          </span>

                          {/* State and PG Breakdown Badges */}
                          {hasCollabPrograms && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {stateCount > 0 && (
                                <span style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  border: '1px solid #bfdbfe',
                                  fontWeight: 700
                                }}>
                                  🏆 {stateCount} State
                                </span>
                              )}
                              {pgCount > 0 && (
                                <span style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: '#f3e8ff',
                                  color: '#6b21a8',
                                  border: '1px solid #e9d5ff',
                                  fontWeight: 700
                                }}>
                                  🎓 {pgCount} Fadheela PG
                                </span>
                              )}
                            </div>
                          )}

                          {/* Assigned Status Pill */}
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: isFullyAssigned ? '#dcfce7' : (isPartiallyAssigned ? '#fef3c7' : 'rgba(255,255,255,0.1)'),
                            color: isFullyAssigned ? '#15803d' : (isPartiallyAssigned ? '#b45309' : 'var(--text-muted)'),
                            border: `1px solid ${isFullyAssigned ? '#86efac' : (isPartiallyAssigned ? '#fde68a' : 'transparent')}`,
                            fontWeight: 700
                          }}>
                            {isFullyAssigned ? `✓ All ${allInThisVenue.length} Assigned` : `${assignedCount}/${allInThisVenue.length} with Jury`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {isCollapsed ? "Click to Expand" : "Click to Collapse"}
                          </span>
                          <span style={{
                            fontSize: '0.85rem',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            color: 'var(--text-primary)',
                            fontWeight: 700
                          }}>
                            {isCollapsed ? "▼" : "▲"}
                          </span>
                        </div>
                      </div>

                      {/* ── Collapsible Card Body ── */}
                      {!isCollapsed && (
                        <div style={{ padding: '16px' }}>
                          {/* Inline Venue Quick Setter */}
                          <div style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            backgroundColor: 'rgba(2, 132, 199, 0.05)',
                            border: '1px solid rgba(2, 132, 199, 0.2)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            marginBottom: '16px'
                          }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0284c7' }}>
                              ⚡ Quick Set Juries for {venueName}:
                            </span>
                            
                            <select
                              value={inlineState.jury1}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineVenueJuries(prev => ({
                                  ...prev,
                                  [venueName]: { ...inlineState, jury1: val }
                                }));
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                backgroundColor: '#fff',
                                color: '#0f172a'
                              }}
                            >
                              <option value="">-- Jury 1 --</option>
                              {selectedJudges.map(j => (
                                <option key={j.id} value={j.id} disabled={j.id === inlineState.jury2}>
                                  {j.username}
                                </option>
                              ))}
                            </select>

                            <select
                              value={inlineState.jury2}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineVenueJuries(prev => ({
                                  ...prev,
                                  [venueName]: { ...inlineState, jury2: val }
                                }));
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                backgroundColor: '#fff',
                                color: '#0f172a'
                              }}
                            >
                              <option value="">-- Jury 2 (Opt) --</option>
                              {selectedJudges.map(j => (
                                <option key={j.id} value={j.id} disabled={j.id === inlineState.jury1}>
                                  {j.username}
                                </option>
                              ))}
                            </select>

                            {hasCollabPrograms && (
                              <select
                                value={inlineState.targetFest}
                                onChange={(e: any) => {
                                  const val = e.target.value;
                                  setInlineVenueJuries(prev => ({
                                    ...prev,
                                    [venueName]: { ...inlineState, targetFest: val }
                                  }));
                                }}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  backgroundColor: '#fff',
                                  color: '#0f172a'
                                }}
                              >
                                <option value="ALL">Both State & PG</option>
                                <option value="STATE">State Final Only</option>
                                <option value="PG">Fadheela PG Only</option>
                              </select>
                            )}

                            <button
                              onClick={() => handleInlineAssign(venueName)}
                              disabled={inlineLoadingVenue === venueName || (!inlineState.jury1 && !inlineState.jury2)}
                              className="btn btn-primary"
                              style={{
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                backgroundColor: '#0284c7',
                                borderColor: '#0369a1',
                                color: '#fff',
                                borderRadius: '6px'
                              }}
                            >
                              {inlineLoadingVenue === venueName ? 'Assigning...' : `Apply to All in ${venueName}`}
                            </button>

                            {venueMsg && (
                              <span style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: venueMsg.type === 'success' ? '#15803d' : '#b91c1c'
                              }}>
                                {venueMsg.text}
                              </span>
                            )}
                          </div>

                          {/* List of Programs in this Venue */}
                          {matchingPrograms.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              No programs match your current filter.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {matchingPrograms.map((program: any) => {
                                const currentJudgeIds = program.judges?.map((j: any) => j.id) || [];
                                const isPgProg = program.festType === 'PG';

                                return (
                                  <div 
                                    key={program.id} 
                                    style={{ 
                                      display: 'flex',
                                      flexWrap: 'wrap', 
                                      gap: '16px',
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      padding: '12px 16px', 
                                      backgroundColor: isPgProg ? 'rgba(147, 51, 234, 0.04)' : 'rgba(255,255,255,0.02)', 
                                      borderRadius: '8px',
                                      border: isPgProg ? '1px solid rgba(147, 51, 234, 0.25)' : '1px solid var(--border-color)'
                                    }}
                                  >
                                    {/* Program Info */}
                                    <div style={{ flex: '1 1 240px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                        {/* Fest badge */}
                                        {hasCollabPrograms && (
                                          <span style={{
                                            fontSize: '0.7rem',
                                            padding: '2px 8px',
                                            borderRadius: '9999px',
                                            backgroundColor: isPgProg ? '#f3e8ff' : '#dbeafe',
                                            color: isPgProg ? '#6b21a8' : '#1e40af',
                                            border: `1px solid ${isPgProg ? '#e9d5ff' : '#bfdbfe'}`,
                                            fontWeight: 800
                                          }}>
                                            {isPgProg ? '🎓 Fadheela PG' : '🏆 State Final'}
                                          </span>
                                        )}

                                        {/* Category Badge */}
                                        <span style={{
                                          fontSize: '0.7rem',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: 'rgba(255,255,255,0.1)',
                                          color: 'var(--text-secondary)',
                                          fontWeight: 700
                                        }}>
                                          {program.category?.name || program.type || 'GENERAL'}
                                        </span>

                                        {program.programCode && (
                                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                                            #{program.programCode}
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                                        {program.name}
                                      </div>

                                      {/* Assigned Juries Pills */}
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned:</span>
                                        {currentJudgeIds.length === 0 ? (
                                          <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 600 }}>No jury assigned</span>
                                        ) : (
                                          program.judges?.map((j: any) => (
                                            <span 
                                              key={j.id}
                                              style={{
                                                fontSize: '0.72rem',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                                                color: 'var(--primary)',
                                                border: '1px solid rgba(236, 72, 153, 0.3)',
                                                fontWeight: 700
                                              }}
                                            >
                                              👤 {j.username}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    {/* Jury Checkbox / Switches Box */}
                                    <div style={{ 
                                      flex: '1 1 280px', 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      gap: '6px', 
                                      maxHeight: '130px', 
                                      overflowY: 'auto', 
                                      padding: '8px', 
                                      border: '1px solid var(--border-color)', 
                                      borderRadius: '6px', 
                                      backgroundColor: 'rgba(0,0,0,0.2)' 
                                    }}>
                                      {selectedJudges.length === 0 ? (
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No juries in Pool. Add them in Tab 1.</span>
                                      ) : (
                                        selectedJudges.map(judge => {
                                          const isAssigned = currentJudgeIds.includes(judge.id);
                                          return (
                                            <label key={judge.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                                              <input 
                                                type="checkbox" 
                                                checked={isAssigned}
                                                onChange={(e) => {
                                                  let newSelected = [...currentJudgeIds];
                                                  if (e.target.checked) {
                                                    newSelected.push(judge.id);
                                                  } else {
                                                    newSelected = newSelected.filter(id => id !== judge.id);
                                                  }
                                                  handleAssign(program.id, newSelected);
                                                }}
                                                disabled={loadingId === program.id}
                                                style={{ cursor: 'pointer' }}
                                              />
                                              <span style={{ 
                                                color: isAssigned ? 'var(--primary)' : 'var(--text-primary)', 
                                                fontWeight: isAssigned ? 700 : 400 
                                              }}>
                                                {judge.username}
                                              </span>
                                            </label>
                                          );
                                        })
                                      )}
                                      {loadingId === program.id && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Saving...</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              VIEW MODE 2: BY CATEGORY
              ═══════════════════════════════════════════════════════════════ */}
          {viewMode === 'category' && (
            <div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Category:</span>
                  {availableCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 12px', fontSize: '0.85rem', borderRadius: '20px' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                
                <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 8px' }} />

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Stage:</span>
                  {['On Stage', 'Off Stage'].map(stage => (
                    <button
                      key={stage}
                      onClick={() => setSelectedStage(stage)}
                      className={`btn ${selectedStage === stage ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 12px', fontSize: '0.85rem', borderRadius: '20px' }}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {(!groupedPrograms[selectedCategory] || !groupedPrograms[selectedCategory][selectedStage] || groupedPrograms[selectedCategory][selectedStage].length === 0) ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    No programs found for {selectedCategory} ({selectedStage}).
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: '1px' }}>
                        {selectedCategory} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'normal' }}>• {selectedStage}</span>
                      </h4>
                      <span className="badge badge-secondary">{groupedPrograms[selectedCategory][selectedStage].length} Programs</span>
                    </div>
                    
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {groupedPrograms[selectedCategory][selectedStage].map((program: any) => {
                        const currentJudgeIds = program.judges?.map((j: any) => j.id) || [];
                        const isPg = program.festType === 'PG';

                        return (
                          <div key={program.id} style={{ 
                            display: 'flex',
                            flexWrap: 'wrap', 
                            gap: '16px',
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            padding: '16px', 
                            backgroundColor: isPg ? 'rgba(147, 51, 234, 0.04)' : 'rgba(255,255,255,0.02)', 
                            borderRadius: 'var(--radius-md)',
                            border: isPg ? '1px solid rgba(147, 51, 234, 0.25)' : '1px solid var(--border-color)'
                          }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                {hasCollabPrograms && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    backgroundColor: isPg ? '#f3e8ff' : '#dbeafe',
                                    color: isPg ? '#6b21a8' : '#1e40af',
                                    fontWeight: 800
                                  }}>
                                    {isPg ? '🎓 Fadheela PG' : '🏆 State Final'}
                                  </span>
                                )}
                                {program.venue && (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                                    color: '#0284c7',
                                    fontWeight: 700
                                  }}>
                                    🏛️ {program.venue}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{program.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {program.type}
                              </div>
                            </div>
                            
                            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                              {selectedJudges.length === 0 ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No juries in Pool</span>
                              ) : (
                                selectedJudges.map(judge => {
                                  const isAssigned = currentJudgeIds.includes(judge.id);
                                  return (
                                    <label key={judge.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                      <input 
                                        type="checkbox" 
                                        checked={isAssigned}
                                        onChange={(e) => {
                                          let newSelected = [...currentJudgeIds];
                                          if (e.target.checked) {
                                            newSelected.push(judge.id);
                                          } else {
                                            newSelected = newSelected.filter(id => id !== judge.id);
                                          }
                                          handleAssign(program.id, newSelected);
                                        }}
                                        disabled={loadingId === program.id}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <span style={{ color: isAssigned ? 'var(--primary)' : 'var(--text-primary)', fontWeight: isAssigned ? 600 : 400 }}>
                                        {judge.username}
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                              {loadingId === program.id && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>Saving...</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: VENUE LOGINS ─── */}
      {activeTab === 'venue-logins' && (
        <VenueLoginsTab
          eventId={eventId}
          zoneCode={zoneCode}
          zoneName={zoneName}
          venues={venuesList.filter(v => v !== "Unassigned / Off-Stage")}
          venueUsers={venueUsers}
          programCountsByVenue={programCountsByVenue}
        />
      )}
    </div>
  );
}
