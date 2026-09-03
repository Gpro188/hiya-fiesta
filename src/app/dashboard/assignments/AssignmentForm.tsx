"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignProgram, unassignProgram } from "./actions";

export default function AssignmentForm({ candidates, programs, isAssignmentOpen = true, statusMessage = "", initialCandidateId, teamId, isAssignmentsConfirmed = false }: { candidates: any[], programs: any[], isAssignmentOpen?: boolean, statusMessage?: string, initialCandidateId?: string, teamId?: string | null, isAssignmentsConfirmed?: boolean }) {
  const router = useRouter();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(initialCandidateId || candidates[0]?.id || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
  
  if (!selectedCandidate) return null;

  if (!isAssignmentOpen) {
    return (
      <div style={{ 
        padding: 'var(--spacing-lg)', 
        backgroundColor: 'rgba(239, 68, 68, 0.05)', 
        border: '1px dashed var(--error)', 
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
        color: 'var(--error)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🕒</div>
        <strong>Assignment Closed / Not Started</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem' }}>{statusMessage || "The deadline for assigning programs has passed. Please contact the administrator for any urgent changes."}</p>
      </div>
    );
  }

  const assigneCSWCgramIds = selectedCandidate.programs.map((p: any) => p.programId);
  // Default individual program limit per candidate
  const maxIndividualLimit = 4;
  
  const currentIndividualCount = selectedCandidate.programs.filter(
    (p: any) => p.program.type === "INDIVIDUAL"
  ).length;

  const handleAssign = async (programId: string) => {
    setLoading(true);
    setStatus(null);
    const result = await assignProgram(selectedCandidateId, programId);
    if (result.success) {
      router.refresh();
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to assign' });
    }
    setLoading(false);
  };

  const handleUnassign = async (programId: string) => {
    setLoading(true);
    setStatus(null);
    const result = await unassignProgram(selectedCandidateId, programId);
    if (result.success) {
      router.refresh();
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to unassign' });
    }
    setLoading(false);
  };

  const [mode, setMode] = useState<'BY_STUDENT' | 'BY_PROGRAM'>('BY_STUDENT');
  const [selectedProgramId, setSelectedProgramId] = useState<string>(programs[0]?.id || "");
  const [programSearchTerm, setProgramSearchTerm] = useState("");

  // Determine the institution's relevant category from their registered candidates
  const institutionCategories = Array.from(
    new Set(candidates.map(c => c.category?.name?.toUpperCase()).filter(Boolean))
  );
  // Default mark sheet filter to the institution's category (e.g. FADHILA) if singular, otherwise 'ALL'
  const defaultCategoryFilter = institutionCategories.length === 1 ? institutionCategories[0] : 'ALL';
  const [markSheetCategoryFilter, setMarkSheetCategoryFilter] = useState<string>(defaultCategoryFilter);

  const selectedProgram = programs.find(p => p.id === selectedProgramId) || programs[0];

  // Calculate team assignments for all programs
  const teamProgramCounts: Record<string, number> = {};
  const teamProgramAssignments: Record<string, any[]> = {};
  candidates.forEach(c => {
    c.programs.forEach((p: any) => {
      teamProgramCounts[p.programId] = (teamProgramCounts[p.programId] || 0) + 1;
      if (!teamProgramAssignments[p.programId]) {
        teamProgramAssignments[p.programId] = [];
      }
      teamProgramAssignments[p.programId].push(c);
    });
  });

  const handleAssignCandidate = async (candidateId: string, programId: string) => {
    setLoading(true);
    setStatus(null);
    const result = await assignProgram(candidateId, programId);
    if (result.success) {
      router.refresh();
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to assign' });
    }
    setLoading(false);
  };

  const handleUnassignCandidate = async (candidateId: string, programId: string) => {
    setLoading(true);
    setStatus(null);
    const result = await unassignProgram(candidateId, programId);
    if (result.success) {
      router.refresh();
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to unassign' });
    }
    setLoading(false);
  };

  // Stage Badge helper
  const renderStageBadge = (stageType?: string, type?: string) => {
    const isOffStage = stageType === "OFF_STAGE";
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 7px',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 700,
        backgroundColor: isOffStage ? 'rgba(14, 165, 233, 0.12)' : 'rgba(236, 72, 153, 0.12)',
        color: isOffStage ? '#0284c7' : '#db2777',
        border: `1px solid ${isOffStage ? 'rgba(14, 165, 233, 0.3)' : 'rgba(236, 72, 153, 0.3)'}`
      }}>
        {isOffStage ? "📝 OFF-STAGE" : "🎤 ON-STAGE"}
      </span>
    );
  };

  return (
    <div>
      {status && (
        <div style={{ color: 'var(--error)', marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-xs)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)' }}>
          {status.message}
        </div>
      )}

      {/* Dual Assignment Mode Selector */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setMode('BY_STUDENT')}
          className="btn"
          style={{
            backgroundColor: mode === 'BY_STUDENT' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: mode === 'BY_STUDENT' ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700
          }}
        >
          👤 Assign by Student (Candidate-First)
        </button>
        <button
          type="button"
          onClick={() => setMode('BY_PROGRAM')}
          className="btn"
          style={{
            backgroundColor: mode === 'BY_PROGRAM' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: mode === 'BY_PROGRAM' ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700
          }}
        >
          📋 Assign by Program (Program-First)
        </button>
      </div>

      {mode === 'BY_STUDENT' ? (
        /* MODE 1: BY STUDENT */
        <>
          <div className="form-group" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <label className="form-label">Search & Select Candidate</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search candidate by UID, Name, or Chest No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ marginBottom: '8px' }}
            />
            <select 
              className="form-input" 
              value={selectedCandidateId}
              onChange={(e) => {
                setSelectedCandidateId(e.target.value);
                setStatus(null);
              }}
            >
              <option value="">-- Choose a Candidate --</option>
              {candidates.filter(c => 
                !searchTerm || 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (c.uid && c.uid.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.chestNumber && c.chestNumber.toLowerCase().includes(searchTerm.toLowerCase()))
              ).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.uid ? `(${c.uid})` : ''} - Chest: {c.chestNumber || 'None'} - ({c.category?.name || 'General'})
                </option>
              ))}
            </select>
            <span className="field-helper">Choose a student to view and manage their program assignments.</span>
            <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span>Category: <strong>{selectedCandidate.category?.name}</strong></span>
              <span>Individual Total Limit: <strong style={{ color: currentIndividualCount >= maxIndividualLimit ? 'var(--error)' : 'var(--success)' }}>{currentIndividualCount} / {maxIndividualLimit}</strong></span>
              <span>
                (On-Stage: <strong>{selectedCandidate.programs.filter((p: any) => p.program.stageType === "ON_STAGE" && p.program.category?.name?.toUpperCase() !== "GENERAL").length}/2</strong>, 
                Off-Stage: <strong>{selectedCandidate.programs.filter((p: any) => p.program.stageType === "OFF_STAGE" && p.program.category?.name?.toUpperCase() !== "GENERAL").length}/2</strong>, 
                General: <strong>{selectedCandidate.programs.filter((p: any) => !p.program.category || p.program.category?.name?.toUpperCase() === "GENERAL").length}/1</strong>)
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
            <div>
              <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Available Programs</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 var(--spacing-sm) 0' }}>Programs matching {selectedCandidate.name}'s category. Click "Assign" to register.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: '420px', overflowY: 'auto', paddingRight: '10px' }}>
                {programs
                  .filter(p => !assigneCSWCgramIds.includes(p.id))
                  .filter(p => p.type === "GENERAL" || p.categoryId === selectedCandidate.categoryId || (p.category?.name === selectedCandidate.category?.name))
                  .filter(p => {
                    const teamLimit = p.candidateLimitPerTeam || 1;
                    const currentTeamCount = teamProgramCounts[p.id] || 0;
                    return currentTeamCount < teamLimit;
                  })
                  .map(program => {
                    const isLimitReached = program.type === "INDIVIDUAL" && currentIndividualCount >= maxIndividualLimit;
                    const canAssign = !isLimitReached;

                    return (
                      <div key={program.id} style={{ 
                        padding: 'var(--spacing-sm)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: canAssign ? 1 : 0.5,
                        backgroundColor: 'rgba(255, 255, 255, 0.02)'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{program.name}</span>
                            {renderStageBadge(program.stageType, program.type)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            <span style={{ fontWeight: 600 }}>{program.type}</span> {program.category && `• ${program.category.name}`}
                          </div>
                          {!canAssign && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '2px' }}>
                              Individual limit reached ({maxIndividualLimit}/{maxIndividualLimit})
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleAssign(program.id)}
                          className="btn btn-primary" 
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                          disabled={!canAssign || loading || isAssignmentsConfirmed}
                        >
                          Assign
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--success)' }}>Assigned Programs ({selectedCandidate.programs.length})</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 var(--spacing-sm) 0' }}>Registered for {selectedCandidate.name}. Click "Remove" to unassign.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {selectedCandidate.programs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No programs assigned yet.</div>
                ) : (
                  selectedCandidate.programs.map((p: any) => (
                    <div key={p.programId} style={{ 
                      padding: 'var(--spacing-sm)', 
                      border: '1px solid var(--success)', 
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(16, 185, 129, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{p.program.name}</span>
                          {renderStageBadge(p.program.stageType, p.program.type)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {p.program.type} {p.program.category && `• ${p.program.category.name}`}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUnassign(p.programId)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--error)' }}
                        disabled={loading || isAssignmentsConfirmed}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* MODE 2: BY PROGRAM */
        <>
          <div className="form-group" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <label className="form-label">Search & Select Competition Program</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search program by name, category, or type..."
              value={programSearchTerm}
              onChange={(e) => setProgramSearchTerm(e.target.value)}
              style={{ marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Show Programs:</span>
              {institutionCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMarkSheetCategoryFilter(institutionCategories[0])}
                  style={{
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: markSheetCategoryFilter === institutionCategories[0] ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: markSheetCategoryFilter === institutionCategories[0] ? 'rgba(165,0,58,0.15)' : 'transparent',
                    color: markSheetCategoryFilter === institutionCategories[0] ? 'var(--primary)' : 'var(--text-secondary)'
                  }}
                >
                  ⭐ {institutionCategories[0]} & General
                </button>
              )}
              <button
                type="button"
                onClick={() => setMarkSheetCategoryFilter('ALL')}
                style={{
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: markSheetCategoryFilter === 'ALL' ? 'var(--primary)' : 'var(--border-color)',
                  backgroundColor: markSheetCategoryFilter === 'ALL' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: markSheetCategoryFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                All Categories
              </button>
            </div>

            <select 
              className="form-input" 
              value={selectedProgram?.id || ""}
              onChange={(e) => {
                setSelectedProgramId(e.target.value);
                setStatus(null);
              }}
            >
              {programs.filter(p => {
                const pCatName = (p.category?.name || '').toUpperCase();
                const isGeneral = p.type === 'GENERAL' || pCatName === 'GENERAL' || !p.category;

                // Category filter check
                if (markSheetCategoryFilter !== 'ALL') {
                  const matchCategory = markSheetCategoryFilter === 'GENERAL_ONLY' 
                    ? isGeneral 
                    : (pCatName === markSheetCategoryFilter || isGeneral);
                  if (!matchCategory) return false;
                }

                if (!programSearchTerm) return true;
                return (
                  p.name.toLowerCase().includes(programSearchTerm.toLowerCase()) || 
                  (p.category?.name && p.category.name.toLowerCase().includes(programSearchTerm.toLowerCase())) ||
                  p.type.toLowerCase().includes(programSearchTerm.toLowerCase()) ||
                  (p.stageType && p.stageType.toLowerCase().includes(programSearchTerm.toLowerCase()))
                );
              }).map(p => {
                const assignedCount = teamProgramCounts[p.id] || 0;
                const limit = p.candidateLimitPerTeam || 1;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.stageType === 'OFF_STAGE' ? 'OFF-STAGE' : 'ON-STAGE'}) - {p.type} - [{p.category?.name || 'General'}] • Slot: {assignedCount}/{limit} {assignedCount >= limit ? '✅ FULL' : '⚡ OPEN'}
                  </option>
                );
              })}
            </select>
            {selectedProgram && (
              <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedProgram.name}</span>
                {renderStageBadge(selectedProgram.stageType, selectedProgram.type)}
                <span>Type: <strong>{selectedProgram.type}</strong></span>
                <span>Category: <strong>{selectedProgram.category?.name || 'General'}</strong></span>
                <span>
                  Team Limit: <strong style={{ color: (teamProgramCounts[selectedProgram.id] || 0) >= (selectedProgram.candidateLimitPerTeam || 1) ? 'var(--error)' : 'var(--success)' }}>
                    {teamProgramCounts[selectedProgram.id] || 0} / {selectedProgram.candidateLimitPerTeam || 1}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {selectedProgram && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
              {/* Eligible Candidates for this Program */}
              <div>
                <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Eligible Candidates to Assign</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 var(--spacing-sm) 0' }}>Students in your team eligible for {selectedProgram.name}:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: '420px', overflowY: 'auto', paddingRight: '10px' }}>
                  {candidates
                    .filter(c => {
                      // Must not already be assigned to THIS program
                      const isAssigned = c.programs.some((p: any) => p.programId === selectedProgram.id);
                      if (isAssigned) return false;
                      // Category match
                      if (selectedProgram.type === "GENERAL") return true;
                      return c.categoryId === selectedProgram.categoryId || c.category?.name === selectedProgram.category?.name;
                    })
                    .map(candidate => {
                      const indivCount = candidate.programs.filter((p: any) => p.program.type === "INDIVIDUAL").length;
                      const isLimitReached = selectedProgram.type === "INDIVIDUAL" && indivCount >= maxIndividualLimit;
                      const isTeamSlotFull = (teamProgramCounts[selectedProgram.id] || 0) >= (selectedProgram.candidateLimitPerTeam || 1);
                      const canAssign = !isLimitReached && !isTeamSlotFull;

                      return (
                        <div key={candidate.id} style={{ 
                          padding: 'var(--spacing-sm)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          opacity: canAssign ? 1 : 0.5,
                          backgroundColor: 'rgba(255, 255, 255, 0.02)'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                              {candidate.name} {candidate.uid ? `(${candidate.uid})` : ''}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Category: {candidate.category?.name} • Indiv: {indivCount}/{maxIndividualLimit}
                            </div>
                            {isTeamSlotFull && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--error)' }}>Team program slot is full</div>
                            )}
                            {!isTeamSlotFull && isLimitReached && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Candidate reached individual limit</div>
                            )}
                          </div>
                          <button
                            onClick={() => handleAssignCandidate(candidate.id, selectedProgram.id)}
                            className="btn btn-primary"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                            disabled={!canAssign || loading || isAssignmentsConfirmed}
                          >
                            Assign
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Already Assigned to this Program */}
              <div>
                <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--success)' }}>
                  Assigned Candidates ({teamProgramAssignments[selectedProgram.id]?.length || 0} / {selectedProgram.candidateLimitPerTeam || 1})
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 var(--spacing-sm) 0' }}>Students registered for {selectedProgram.name}:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {(!teamProgramAssignments[selectedProgram.id] || teamProgramAssignments[selectedProgram.id].length === 0) ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No candidates assigned to this program yet.</div>
                  ) : (
                    teamProgramAssignments[selectedProgram.id].map(c => (
                      <div key={c.id} style={{ 
                        padding: 'var(--spacing-sm)', 
                        border: '1px solid var(--success)', 
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{c.name} {c.uid ? `(${c.uid})` : ''}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Chest: {c.chestNumber || 'None'} • {c.category?.name}</div>
                        </div>
                        <button 
                          onClick={() => handleUnassignCandidate(c.id, selectedProgram.id)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--error)' }}
                          disabled={loading || isAssignmentsConfirmed}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* COMPLETE TOTAL PROGRAM LIST & ASSIGNED MARK SHEET */}
      <div style={{ marginTop: 'var(--spacing-xxl)', paddingTop: 'var(--spacing-lg)', borderTop: '2px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊 Institution Program Registration & Confirmation Mark Sheet</span>
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Check all competition programs, assigned student names, and verify all categories are filled before final submission.
            </p>
          </div>
          {teamId && (
            <button 
              className="btn btn-secondary"
              onClick={() => window.open(`/print/assignments?teamId=${teamId}`, '_blank')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              🖨️ Print Mark Sheet
            </button>
          )}
        </div>

        {/* CATEGORY FILTER TABS FOR MARK SHEET */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>Filter Programs:</span>
          
          {institutionCategories.length > 0 && (
            <button
              type="button"
              onClick={() => setMarkSheetCategoryFilter(institutionCategories[0])}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: markSheetCategoryFilter === institutionCategories[0] ? 'var(--primary)' : 'var(--border-color)',
                backgroundColor: markSheetCategoryFilter === institutionCategories[0] ? 'var(--primary)' : 'transparent',
                color: markSheetCategoryFilter === institutionCategories[0] ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              ⭐ {institutionCategories[0]} + General Only
            </button>
          )}

          {['FADHILA', 'FADHEELA'].map(cat => {
            const isSelected = markSheetCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setMarkSheetCategoryFilter(cat)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isSelected ? (cat === 'FADHILA' ? '#e11d5a' : '#2563eb') : 'var(--border-color)',
                  backgroundColor: isSelected ? (cat === 'FADHILA' ? 'rgba(225,29,90,0.15)' : 'rgba(37,99,235,0.15)') : 'transparent',
                  color: isSelected ? (cat === 'FADHILA' ? '#e11d5a' : '#2563eb') : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMarkSheetCategoryFilter('GENERAL_ONLY')}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: markSheetCategoryFilter === 'GENERAL_ONLY' ? '#d97706' : 'var(--border-color)',
              backgroundColor: markSheetCategoryFilter === 'GENERAL_ONLY' ? 'rgba(217,119,6,0.15)' : 'transparent',
              color: markSheetCategoryFilter === 'GENERAL_ONLY' ? '#d97706' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            General Only
          </button>

          <button
            type="button"
            onClick={() => setMarkSheetCategoryFilter('ALL')}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: markSheetCategoryFilter === 'ALL' ? 'var(--text-primary)' : 'var(--border-color)',
              backgroundColor: markSheetCategoryFilter === 'ALL' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: markSheetCategoryFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            Show All ({programs.length})
          </button>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px' }}>#</th>
                <th style={{ padding: '10px' }}>Program Code</th>
                <th style={{ padding: '10px' }}>Program Name</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Type</th>
                <th style={{ padding: '10px' }}>Stage</th>
                <th style={{ padding: '10px' }}>Slot Status</th>
                <th style={{ padding: '10px' }}>Assigned Candidates</th>
              </tr>
            </thead>
            <tbody>
              {programs
                .filter(p => {
                  const pCatName = (p.category?.name || '').toUpperCase();
                  const isGeneral = p.type === 'GENERAL' || pCatName === 'GENERAL' || !p.category;

                  if (markSheetCategoryFilter === 'ALL') {
                    return true;
                  }
                  if (markSheetCategoryFilter === 'GENERAL_ONLY') {
                    return isGeneral;
                  }
                  // If filter is specific category (e.g. FADHILA or FADHEELA):
                  // Include that specific category OR any General program
                  if (markSheetCategoryFilter === 'FADHILA') {
                    return pCatName === 'FADHILA' || isGeneral;
                  }
                  if (markSheetCategoryFilter === 'FADHEELA') {
                    return pCatName === 'FADHEELA' || isGeneral;
                  }
                  // Fallback: matches filter name or general
                  return pCatName === markSheetCategoryFilter || isGeneral;
                })
                .map((p, idx) => {
                const assignedList = teamProgramAssignments[p.id] || [];
                const limit = p.candidateLimitPerTeam || 1;
                const isFulfilled = assignedList.length >= limit;
                const isEmpty = assignedList.length === 0;

                return (
                  <tr key={p.id} style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: isFulfilled ? 'rgba(16, 185, 129, 0.02)' : (isEmpty ? 'rgba(239, 68, 68, 0.02)' : 'transparent')
                  }}>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                      {p.programCode || '-'}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        backgroundColor: p.category?.name === 'FADHILA' ? 'rgba(142,0,51,0.1)' : (p.category?.name === 'FADHEELA' ? 'rgba(37,99,235,0.1)' : 'rgba(217,119,6,0.1)'),
                        color: p.category?.name === 'FADHILA' ? '#e11d5a' : (p.category?.name === 'FADHEELA' ? '#2563eb' : '#d97706')
                      }}>
                        {p.category?.name || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{p.type}</td>
                    <td style={{ padding: '10px' }}>{renderStageBadge(p.stageType, p.type)}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        backgroundColor: isFulfilled ? 'rgba(16, 185, 129, 0.15)' : (isEmpty ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.15)'),
                        color: isFulfilled ? '#10b981' : (isEmpty ? '#ef4444' : '#f59e0b')
                      }}>
                        {assignedList.length} / {limit} {isFulfilled ? '✓ Filled' : (isEmpty ? '⭕ Empty' : '⏳ Partial')}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {assignedList.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None assigned</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {assignedList.map(c => (
                            <span key={c.id} style={{ 
                              padding: '2px 8px', 
                              backgroundColor: 'rgba(255,255,255,0.08)', 
                              borderRadius: '4px', 
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              border: '1px solid var(--border-color)'
                            }}>
                              {c.name} {c.chestNumber ? `[${c.chestNumber}]` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {teamId && (
        <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => window.open(`/print/assignments?teamId=${teamId}`, '_blank')}
            style={{ padding: 'var(--spacing-sm) var(--spacing-xl)', fontSize: '1rem' }}
          >
            🖨️ Print List
          </button>
          {!isAssignmentsConfirmed ? (
            <button 
              className="btn btn-primary"
              onClick={() => setShowConfirmModal(true)}
              disabled={loading}
              style={{ padding: 'var(--spacing-sm) var(--spacing-xl)', fontSize: '1rem', backgroundColor: 'var(--success)' }}
            >
              Confirm & Submit to Zone
            </button>
          ) : (
            <div style={{ padding: 'var(--spacing-sm) var(--spacing-xl)', color: 'var(--success)', fontWeight: 600, border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16,185,129,0.1)' }}>
              ✅ Assignments Submitted & Locked
            </div>
          )}
        </div>
      )}

      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: 'var(--spacing-xl)', borderRadius: 'var(--radius-lg)', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0, color: 'var(--primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--spacing-sm)' }}>Review Assignments</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Please review the final list of assigned candidates and their programs. <strong>This action cannot be undone online!</strong></p>
            
            <div style={{ marginTop: 'var(--spacing-md)', display: 'grid', gap: 'var(--spacing-md)' }}>
              {candidates.filter(c => c.programs.length > 0).map(c => (
                <div key={c.id} style={{ border: '1px solid var(--border-color)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>{c.name} {c.uid ? `(${c.uid})` : ''} - {c.category?.name}</div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
                    {c.programs.map((p: any) => (
                      <li key={p.programId}>{p.program.name} ({p.program.type})</li>
                    ))}
                  </ul>
                </div>
              ))}
              {candidates.filter(c => c.programs.length > 0).length === 0 && (
                <div style={{ color: 'var(--warning)', padding: 'var(--spacing-md)', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)' }}>
                  You have not assigned any programs to your candidates. If you submit now, your team will have 0 entries.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
              <a 
                href={`/print/assignments${teamId ? `?teamId=${teamId}` : ''}`}
                target="_blank"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print List
              </a>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--success)' }}
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const { confirmTeamAssignments } = await import('./actions');
                  const res = await confirmTeamAssignments(teamId!);
                  if(res.success) {
                    window.location.reload();
                  } else {
                    setStatus({ type: 'error', message: res.error || "Failed to confirm." });
                    setLoading(false);
                    setShowConfirmModal(false);
                  }
                }}
              >
                {loading ? "Submitting..." : "Yes, Lock and Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
