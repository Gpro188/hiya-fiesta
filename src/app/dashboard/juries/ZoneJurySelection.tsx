"use client";

import { useState } from "react";
import { toggleJurySelection, assignJudgesToProgram, assignJudgesToVenue } from "./actions";
import VenueLoginsTab from "./VenueLoginsTab";

export default function ZoneJurySelection({ 
  allJudges, 
  selectedJudges, 
  programs = [],
  eventId,
  venues = [],
  venueUsers = [],
  programCountsByVenue = {},
  zoneCode = "",
  zoneName = ""
}: { 
  allJudges: any[], 
  selectedJudges: any[], 
  programs?: any[],
  eventId: string,
  venues?: string[],
  venueUsers?: any[],
  programCountsByVenue?: Record<string, number>,
  zoneCode?: string,
  zoneName?: string
}) {
  const [activeTab, setActiveTab] = useState<'selection' | 'assignment' | 'venue-logins'>('selection');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  
  // New filters for Assignment Tab
  const [selectedCategory, setSelectedCategory] = useState("FADHILA");
  const [selectedStage, setSelectedStage] = useState("On Stage");

  // Batch Venue Assignment state
  const [batchVenue, setBatchVenue] = useState(venues[0] || "");
  const [batchJury1, setBatchJury1] = useState("");
  const [batchJury2, setBatchJury2] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
    const res = await assignJudgesToVenue(eventId, batchVenue, chosenIds);
    if (res.success) {
      setBatchMessage({ 
        type: 'success', 
        text: `✅ Successfully assigned ${chosenIds.length} jury/juries to all ${res.count || ''} programs in "${batchVenue}"!` 
      });
    } else {
      setBatchMessage({ type: 'error', text: res.error || 'Failed to assign juries to venue.' });
    }
    setBatchLoading(false);
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

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(programSearch.toLowerCase())
  );

  // Group programs by Category, then by Stage Type
  const groupedPrograms = filteredPrograms.reduce((acc, p) => {
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

  // Sort Categories: FADHILA, FADHEELA, then General
  const categoryOrder = ["FADHILA", "FADHEELA", "GENERAL PROGRAMS"];

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: 'var(--spacing-lg)' }}>
        <button 
          onClick={() => setActiveTab('selection')} 
          className={`btn ${activeTab === 'selection' ? 'btn-primary' : 'btn-secondary'}`}
        >
          1. Select Zone Juries
        </button>
        <button 
          onClick={() => setActiveTab('assignment')} 
          className={`btn ${activeTab === 'assignment' ? 'btn-primary' : 'btn-secondary'}`}
        >
          2. Assign to Programs
        </button>
        <button 
          onClick={() => setActiveTab('venue-logins')} 
          className={`btn ${activeTab === 'venue-logins' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>🏛️</span>
          <span>3. Venue / Stage Logins ({venues.length})</span>
        </button>
      </div>

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
                    border: isSelected ? '1px solid var(--primary)' : '1px solid transparent'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{judge.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {(judge.phone || judge.place) ? `${judge.phone || ''} ${judge.place ? `(${judge.place})` : ''}` : 'No contact info'}
                      </div>
                      {isSelected && <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Added to your Zone</span>}
                    </div>
                    <button 
                      onClick={() => handleToggle(judge.id, isSelected)}
                      disabled={loadingId === judge.id}
                      className={`btn ${isSelected ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      {loadingId === judge.id ? "..." : (isSelected ? "Remove" : "Add to My Zone")}
                    </button>
                  </div>
                );
              })}
              {filteredJudges.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No juries found.</div>}
            </div>
          </div>

          {/* Selected Juries for this Zone */}
          <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>
              My Zone Jury Pool ({selectedJudges.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}>
              These juries are available to be assigned to programs in the Assignment tab.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                  You haven't selected any juries yet.<br />Add them from the Global list.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assignment' && (
        <div className="glass-panel" style={{ padding: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
            <div>
              <h3 style={{ marginBottom: '8px' }}>Assign Juries to Programs</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Juries must be in your Zone Pool to appear here. Edits are saved automatically.
              </p>
            </div>
            <input 
              type="text"
              className="form-input"
              placeholder="Search programs..."
              value={programSearch}
              onChange={e => setProgramSearch(e.target.value)}
              style={{ width: '250px' }}
            />
          </div>

          {/* BATCH ASSIGN TO VENUE */}
          {venues.length > 0 && (
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
                    {venues.map(v => (
                      <option key={v} value={v}>
                        {v} ({programCountsByVenue[v] || 0} programs)
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

          <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Category:</span>
              {categoryOrder.map(cat => (
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
                    return (
                      <div key={program.id} style={{ 
                        display: 'flex',
                        flexWrap: 'wrap', 
                        gap: '16px',
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        padding: '16px', 
                        backgroundColor: 'rgba(255,255,255,0.02)', 
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{program.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {program.type}
                          </div>
                        </div>
                        
                        <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                          {selectedJudges.length === 0 ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No juries in Zone Pool</span>
                          ) : (
                            selectedJudges.map(judge => {
                              const isAssigned = currentJudgeIds.includes(judge.id);
                              return (
                                <label key={judge.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                  <div style={{ position: 'relative', width: '36px', height: '20px', flexShrink: 0 }}>
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
                                      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                    />
                                    <div style={{ 
                                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                                      backgroundColor: isAssigned ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                                      borderRadius: '20px', transition: '0.3s',
                                      border: isAssigned ? 'none' : '1px solid var(--border-color)'
                                    }} />
                                    <div style={{ 
                                      position: 'absolute', top: '2px', left: isAssigned ? '18px' : '2px', 
                                      width: '16px', height: '16px', backgroundColor: 'white', 
                                      borderRadius: '50%', transition: '0.3s',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }} />
                                  </div>
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

      {activeTab === 'venue-logins' && (
        <VenueLoginsTab
          eventId={eventId}
          zoneCode={zoneCode}
          zoneName={zoneName}
          venues={venues}
          venueUsers={venueUsers}
          programCountsByVenue={programCountsByVenue}
        />
      )}
    </div>
  );
}
