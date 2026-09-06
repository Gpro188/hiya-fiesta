"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { assignProgram, unassignProgram, toggleMagazineParticipation } from "./actions";
import { isProgramGeneral, isInstitutionProgram } from "@/lib/programUtils";

export default function AssignmentForm({ 
  candidates, 
  programs, 
  isAssignmentOpen = true, 
  statusMessage = "", 
  initialCandidateId, 
  teamId, 
  isAssignmentsConfirmed = false,
  isOnStageConfirmed = false,
  isMagazineParticipating = false,
  magazineCode = null,
  teamName = "",
  limits,
  isOffStageOpen = true,
  isOnStageOpen = true,
  offStageDeadline = null,
  onStageDeadline = null,
  offStageUnlocked = false,
  onStageUnlocked = false,
  role = "INSTITUTION_MANAGER"
}: { 
  candidates: any[], 
  programs: any[], 
  isAssignmentOpen?: boolean, 
  statusMessage?: string, 
  initialCandidateId?: string, 
  teamId?: string | null, 
  isAssignmentsConfirmed?: boolean,
  isOnStageConfirmed?: boolean,
  isMagazineParticipating?: boolean,
  magazineCode?: string | null,
  teamName?: string,
  limits?: {
    maxIndividualPrograms?: number;
    maxIndividualOnStage?: number;
    maxIndividualOffStage?: number;
    maxGeneralTotal?: number;
    maxGeneralOnStage?: number;
    maxGeneralOffStage?: number;
  };
  isOffStageOpen?: boolean;
  isOnStageOpen?: boolean;
  offStageDeadline?: string | null;
  onStageDeadline?: string | null;
  offStageUnlocked?: boolean;
  onStageUnlocked?: boolean;
  role?: string;
}) {
  const router = useRouter();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(initialCandidateId || candidates[0]?.id || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingStage, setConfirmingStage] = useState<"OFF_STAGE" | "ON_STAGE" | "ALL">("OFF_STAGE");
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showConfirmModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showConfirmModal]);

  const handleToggleMagazine = async (participating: boolean) => {
    if (!teamId) return;
    setLoading(true);
    setStatus(null);
    const res = await toggleMagazineParticipation(teamId, participating);
    if (res.success) {
      setStatus({ 
        type: 'success', 
        message: participating 
          ? 'Successfully confirmed Magazine competition participation for your institution!' 
          : 'Magazine participation removed.' 
      });
      router.refresh();
    } else {
      setStatus({ type: 'error', message: res.error || 'Failed to update magazine status' });
    }
    setLoading(false);
  };

  const [candidatesList, setCandidatesList] = useState<any[]>(candidates);

  useEffect(() => {
    setCandidatesList(candidates);
  }, [candidates]);

  const selectedCandidate = candidatesList.find(c => c.id === selectedCandidateId) || candidatesList[0];
  
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
  
  // Program registration limits
  const maxIndividualLimit = limits?.maxIndividualPrograms ?? 4;
  const maxIndividualOnStage = limits?.maxIndividualOnStage ?? 2;
  const maxIndividualOffStage = limits?.maxIndividualOffStage ?? 2;
  const maxGeneralTotal = limits?.maxGeneralTotal ?? 2;
  const maxGeneralOnStage = limits?.maxGeneralOnStage ?? 1;
  const maxGeneralOffStage = limits?.maxGeneralOffStage ?? 1;
  
  const currentIndividualCount = selectedCandidate.programs.filter(
    (p: any) => !isProgramGeneral(p.program) && p.program.type === "INDIVIDUAL"
  ).length;

  const currentIndividualOnStage = selectedCandidate.programs.filter(
    (p: any) => !isProgramGeneral(p.program) && p.program.stageType === "ON_STAGE"
  ).length;

  const currentIndividualOffStage = selectedCandidate.programs.filter(
    (p: any) => !isProgramGeneral(p.program) && p.program.stageType === "OFF_STAGE"
  ).length;

  const currentGeneralTotal = selectedCandidate.programs.filter(
    (p: any) => isProgramGeneral(p.program)
  ).length;

  const currentGeneralOnStage = selectedCandidate.programs.filter(
    (p: any) => isProgramGeneral(p.program) && p.program.stageType === "ON_STAGE"
  ).length;

  const currentGeneralOffStage = selectedCandidate.programs.filter(
    (p: any) => isProgramGeneral(p.program) && p.program.stageType === "OFF_STAGE"
  ).length;

  const handleAssign = async (programId: string) => {
    const prog = programs.find(p => p.id === programId);
    if (!prog) return;

    setStatus(null);
    const prevCandidates = candidatesList;
    // Optimistic UI update: 0ms lag
    setCandidatesList(prev => prev.map(c => {
      if (c.id === selectedCandidateId) {
        return {
          ...c,
          programs: [...c.programs, { id: `temp-${Date.now()}`, candidateId: c.id, programId, program: prog }]
        };
      }
      return c;
    }));

    const result = await assignProgram(selectedCandidateId, programId);
    if (!result.success) {
      setCandidatesList(prevCandidates);
      setStatus({ type: 'error', message: result.error || 'Failed to assign' });
    }
  };

  const handleUnassign = async (programId: string) => {
    setStatus(null);
    const prevCandidates = candidatesList;
    // Optimistic UI update: 0ms lag
    setCandidatesList(prev => prev.map(c => {
      if (c.id === selectedCandidateId) {
        return {
          ...c,
          programs: c.programs.filter((p: any) => p.programId !== programId)
        };
      }
      return c;
    }));

    const result = await unassignProgram(selectedCandidateId, programId);
    if (!result.success) {
      setCandidatesList(prevCandidates);
      setStatus({ type: 'error', message: result.error || 'Failed to unassign' });
    }
  };

  const [mode, setMode] = useState<'BY_STUDENT' | 'BY_PROGRAM'>('BY_STUDENT');
  const [selectedProgramId, setSelectedProgramId] = useState<string>(programs[0]?.id || "");
  const [programSearchTerm, setProgramSearchTerm] = useState("");

  // Determine the institution's relevant category from their registered candidates
  const institutionCategories = Array.from(
    new Set(candidatesList.map(c => c.category?.name?.toUpperCase()).filter(Boolean))
  );
  // Default mark sheet filter to the institution's category (e.g. FADHILA) if singular, otherwise 'ALL'
  const defaultCategoryFilter = institutionCategories.length === 1 ? institutionCategories[0] : 'ALL';
  const [markSheetCategoryFilter, setMarkSheetCategoryFilter] = useState<string>(defaultCategoryFilter);

  const selectedProgram = programs.find(p => p.id === selectedProgramId) || programs[0];

  // Calculate team assignments for all programs
  const teamProgramCounts: Record<string, number> = {};
  const teamProgramAssignments: Record<string, any[]> = {};
  candidatesList.forEach(c => {
    c.programs.forEach((p: any) => {
      teamProgramCounts[p.programId] = (teamProgramCounts[p.programId] || 0) + 1;
      if (!teamProgramAssignments[p.programId]) {
        teamProgramAssignments[p.programId] = [];
      }
      teamProgramAssignments[p.programId].push(c);
    });
  });

  const handleAssignCandidate = async (candidateId: string, programId: string) => {
    const prog = programs.find(p => p.id === programId);
    if (!prog) return;

    setStatus(null);
    const prevCandidates = candidatesList;
    // Optimistic UI update
    setCandidatesList(prev => prev.map(c => {
      if (c.id === candidateId) {
        return {
          ...c,
          programs: [...c.programs, { id: `temp-${Date.now()}`, candidateId: c.id, programId, program: prog }]
        };
      }
      return c;
    }));

    const result = await assignProgram(candidateId, programId);
    if (!result.success) {
      setCandidatesList(prevCandidates);
      setStatus({ type: 'error', message: result.error || 'Failed to assign' });
    }
  };

  const handleUnassignCandidate = async (candidateId: string, programId: string) => {
    setStatus(null);
    const prevCandidates = candidatesList;
    // Optimistic UI update
    setCandidatesList(prev => prev.map(c => {
      if (c.id === candidateId) {
        return {
          ...c,
          programs: c.programs.filter((p: any) => p.programId !== programId)
        };
      }
      return c;
    }));

    const result = await unassignProgram(candidateId, programId);
    if (!result.success) {
      setCandidatesList(prevCandidates);
      setStatus({ type: 'error', message: result.error || 'Failed to unassign' });
    }
  };

  // Stage Badge helper
  const renderStageBadge = (stageType?: string, type?: string) => {
    const isOffStage = stageType === "OFF_STAGE";
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '0.74rem',
        fontWeight: 800,
        letterSpacing: '0.03em',
        backgroundColor: isOffStage ? 'rgba(14, 165, 233, 0.16)' : 'rgba(236, 72, 153, 0.16)',
        color: isOffStage ? '#0284c7' : '#db2777',
        border: `1.5px solid ${isOffStage ? '#0284c7' : '#db2777'}`
      }}>
        {isOffStage ? "🎨 OFF STAGE" : "🎭 ON STAGE"}
      </span>
    );
  };

  // Stage allowed check
  const isStageAllowed = (prog: any) => {
    if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
    if (prog.stageType === "OFF_STAGE") return isOffStageOpen;
    if (prog.stageType === "ON_STAGE") return isOnStageOpen;
    return isOffStageOpen || isOnStageOpen;
  };

  return (
    <div>
      {status && (
        <div style={{ color: 'var(--error)', marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-xs)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)' }}>
          {status.message}
        </div>
      )}

      {/* Split Stage Registration Status Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-lg)',
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)'
      }}>
        {/* Off-Stage Card */}
        <div style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderRadius: '8px',
          backgroundColor: offStageUnlocked ? 'rgba(16, 185, 129, 0.1)' : isOffStageOpen ? 'rgba(14, 165, 233, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1.5px solid ${offStageUnlocked ? '#10b981' : isOffStageOpen ? 'rgba(14, 165, 233, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0284c7' }}>🎨 OFF-STAGE PROGRAMS</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 800,
              backgroundColor: offStageUnlocked ? '#10b981' : isOffStageOpen ? '#0284c7' : '#ef4444',
              color: '#fff'
            }}>
              {offStageUnlocked ? '⚡ ZONE UNLOCKED' : isOffStageOpen ? '🟢 OPEN' : '🔒 CLOSED'}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {offStageUnlocked
              ? 'Zone Admin granted special editing access for off-stage programs.'
              : offStageDeadline
                ? `Deadline: ${new Date(offStageDeadline).toLocaleString()}`
                : 'Registration is open according to general schedule.'}
          </div>
        </div>

        {/* On-Stage Card */}
        <div style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderRadius: '8px',
          backgroundColor: onStageUnlocked ? 'rgba(16, 185, 129, 0.1)' : isOnStageOpen ? 'rgba(236, 72, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1.5px solid ${onStageUnlocked ? '#10b981' : isOnStageOpen ? 'rgba(236, 72, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#db2777' }}>🎭 ON-STAGE PROGRAMS</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 800,
              backgroundColor: onStageUnlocked ? '#10b981' : isOnStageOpen ? '#db2777' : '#ef4444',
              color: '#fff'
            }}>
              {onStageUnlocked ? '⚡ ZONE UNLOCKED' : isOnStageOpen ? '🟢 OPEN' : '🔒 CLOSED'}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {onStageUnlocked
              ? 'Zone Admin granted special editing access for on-stage programs.'
              : onStageDeadline
                ? `Deadline: ${new Date(onStageDeadline).toLocaleString()}`
                : 'Registration is open according to general schedule.'}
          </div>
        </div>
      </div>

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
              {candidatesList.filter(c => 
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
            <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span>Category: <strong>{selectedCandidate.category?.name}</strong></span>
                <span>Individual Limit: <strong style={{ color: currentIndividualCount >= maxIndividualLimit ? 'var(--error)' : 'var(--success)' }}>{currentIndividualCount} / {maxIndividualLimit}</strong></span>
                <span>General Limit: <strong style={{ color: currentGeneralTotal >= maxGeneralTotal ? 'var(--error)' : 'var(--success)' }}>{currentGeneralTotal} / {maxGeneralTotal}</strong></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.8rem', paddingLeft: '2px' }}>
                <span style={{ color: '#0284c7' }}>
                  🎨 <strong>Off-Stage:</strong> Individual: <strong>{currentIndividualOffStage}/{maxIndividualOffStage}</strong> • General: <strong>{currentGeneralOffStage}/{maxGeneralOffStage}</strong>
                </span>
                <span style={{ color: '#db2777' }}>
                  🎭 <strong>On-Stage:</strong> Individual: <strong>{currentIndividualOnStage}/{maxIndividualOnStage}</strong> • General: <strong>{currentGeneralOnStage}/{maxGeneralOnStage}</strong>
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
            <div>
              <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Available Programs</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 var(--spacing-sm) 0' }}>Programs matching {selectedCandidate.name}'s category. Click "Assign" to register.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: '420px', overflowY: 'auto', paddingRight: '10px' }}>
                {programs
                  .filter(p => !assigneCSWCgramIds.includes(p.id))
                  .filter(p => !isInstitutionProgram(p))
                  .filter(p => isProgramGeneral(p) || p.categoryId === selectedCandidate.categoryId || (p.category?.name === selectedCandidate.category?.name))
                  .filter(p => {
                    const teamLimit = p.candidateLimitPerTeam || 1;
                    const currentTeamCount = teamProgramCounts[p.id] || 0;
                    return currentTeamCount < teamLimit;
                  })
                  .map(program => {
                    const isGen = isProgramGeneral(program);
                    let isLimitReached = false;
                    let limitReason = "";

                    if (isGen) {
                      if (program.stageType === "ON_STAGE" && currentGeneralOnStage >= maxGeneralOnStage) {
                        isLimitReached = true;
                        limitReason = `General On-Stage limit reached (${maxGeneralOnStage}/${maxGeneralOnStage})`;
                      } else if (program.stageType === "OFF_STAGE" && currentGeneralOffStage >= maxGeneralOffStage) {
                        isLimitReached = true;
                        limitReason = `General Off-Stage limit reached (${maxGeneralOffStage}/${maxGeneralOffStage})`;
                      } else if (currentGeneralTotal >= maxGeneralTotal) {
                        isLimitReached = true;
                        limitReason = `General limit reached (${maxGeneralTotal}/${maxGeneralTotal})`;
                      }
                    } else {
                      if (program.stageType === "ON_STAGE" && currentIndividualOnStage >= maxIndividualOnStage) {
                        isLimitReached = true;
                        limitReason = `Individual On-Stage limit reached (${maxIndividualOnStage}/${maxIndividualOnStage})`;
                      } else if (program.stageType === "OFF_STAGE" && currentIndividualOffStage >= maxIndividualOffStage) {
                        isLimitReached = true;
                        limitReason = `Individual Off-Stage limit reached (${maxIndividualOffStage}/${maxIndividualOffStage})`;
                      } else if (program.type === "INDIVIDUAL" && currentIndividualCount >= maxIndividualLimit) {
                        isLimitReached = true;
                        limitReason = `Individual limit reached (${maxIndividualLimit}/${maxIndividualLimit})`;
                      }
                    }

                    const isStageOpen = isStageAllowed(program);
                    if (!isStageOpen && !isLimitReached) {
                      limitReason = program.stageType === "OFF_STAGE" ? "🔒 Off-Stage Registration Closed" : "🔒 On-Stage Registration Closed";
                    }
                    const canAssign = !isLimitReached && isStageOpen;

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
                            <span style={{ fontWeight: 600 }}>{isGen ? 'GENERAL' : program.type}</span> {program.category && `• ${program.category.name}`}
                          </div>
                          {!canAssign && (
                            <div style={{ fontSize: '0.7rem', color: !isStageOpen ? 'var(--error)' : 'var(--warning)', marginTop: '2px', fontWeight: !isStageOpen ? 700 : 400 }}>
                              {limitReason}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleAssign(program.id)}
                          className="btn btn-primary" 
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                          disabled={!canAssign || loading || !isStageOpen}
                        >
                          {isStageOpen ? "Assign" : "Locked"}
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
                  selectedCandidate.programs.map((p: any) => {
                    const isStageOpen = isStageAllowed(p.program);
                    return (
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
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: isStageOpen ? 'var(--error)' : 'var(--text-muted)' }}
                          disabled={loading || !isStageOpen}
                          title={!isStageOpen ? "Registration for this stage is closed/locked" : undefined}
                        >
                          {isStageOpen ? "Remove" : "🔒 Locked"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* MODE 2: BY PROGRAM */
        <>
          {/* Magazine Institution Program Special Card in Mode 2 */}
          {programs.some(p => isInstitutionProgram(p)) && (
            <div style={{
              marginBottom: 'var(--spacing-lg)',
              padding: '16px 20px',
              borderRadius: '8px',
              backgroundColor: isMagazineParticipating ? 'rgba(147, 51, 234, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1.5px solid ${isMagazineParticipating ? '#9333ea' : '#f59e0b'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.4rem' }}>📖</span>
                  <strong style={{ fontSize: '1rem', color: isMagazineParticipating ? '#9333ea' : '#d97706' }}>
                    Institution Program: College Magazine (Off-Stage)
                  </strong>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    backgroundColor: isMagazineParticipating ? '#9333ea' : '#f59e0b',
                    color: '#fff'
                  }}>
                    {isMagazineParticipating ? 'ENROLLED & CONFIRMED' : 'PENDING REGISTRATION'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Evaluated on the Institution Name. No candidate selection required.
                  {magazineCode ? ` Official Magazine Code to write on cover: ${magazineCode}` : ' Code will be assigned upon Zone Admin approval.'}
                </p>
              </div>
              {!isAssignmentsConfirmed && isOffStageOpen && (
                <div>
                  {isMagazineParticipating ? (
                    <button
                      type="button"
                      onClick={() => handleToggleMagazine(false)}
                      disabled={loading}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                      Withdraw Magazine
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleMagazine(true)}
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem', padding: '6px 16px', backgroundColor: '#9333ea', borderColor: '#9333ea' }}
                    >
                      ✓ Confirm Magazine Participation
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 'var(--spacing-xl)' }}>
            {/* STEP 1: SELECT CATEGORY */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>1️⃣ Select Category</span>
                </label>
                <select
                  className="form-input"
                  style={{ fontWeight: 600 }}
                  value={markSheetCategoryFilter}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setMarkSheetCategoryFilter(newCat);
                    // Automatically auto-select the first program in that category
                    const matchedProgram = programs.find(p => {
                      const pCatName = (p.category?.name || '').toUpperCase();
                      const isGen = p.type === 'GENERAL' || pCatName === 'GENERAL' || !p.category;
                      if (newCat === 'ALL') return true;
                      if (newCat === 'GENERAL_ONLY') return isGen;
                      return pCatName === newCat || isGen;
                    });
                    if (matchedProgram) {
                      setSelectedProgramId(matchedProgram.id);
                    }
                  }}
                >
                  {institutionCategories.length > 0 && (
                    <option value={institutionCategories[0]}>
                      ⭐ My Category ({institutionCategories[0]}) & General
                    </option>
                  )}
                  <option value="FADHILA">FADHILA & General</option>
                  <option value="FADHEELA">FADHEELA & General</option>
                  <option value="GENERAL_ONLY">General Programs Only</option>
                  <option value="ALL">Show All Categories</option>
                </select>
                <span className="field-helper">Choose the category to filter all matching competition programs.</span>
              </div>

              {/* STEP 2: SEARCH PROGRAM */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>2️⃣ Filter / Search Program</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search program by name or code..."
                  value={programSearchTerm}
                  onChange={(e) => setProgramSearchTerm(e.target.value)}
                />
                <span className="field-helper">Type program name or stage (On-Stage / Off-Stage).</span>
              </div>
            </div>

            {/* STEP 3: SELECT SPECIFIC PROGRAM */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>3️⃣ Choose Program to Assign</span>
              </label>
              <select 
                className="form-input" 
                value={selectedProgram?.id || ""}
                onChange={(e) => {
                  setSelectedProgramId(e.target.value);
                  setStatus(null);
                }}
                style={{ fontSize: '0.95rem', padding: '10px' }}
              >
                {programs.filter(p => !isInstitutionProgram(p)).filter(p => {
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
                      {p.programCode ? `[#${p.programCode}] ` : ''}{p.name} ({p.stageType === 'OFF_STAGE' ? 'OFF-STAGE' : 'ON-STAGE'}) - [{p.category?.name || 'General'}] • Slot: {assignedCount}/{limit} {assignedCount >= limit ? '✅ FILLED' : '⚡ OPEN'}
                    </option>
                  );
                })}
              </select>
            </div>
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
                      if (isProgramGeneral(selectedProgram)) return true;
                      return c.categoryId === selectedProgram.categoryId || c.category?.name === selectedProgram.category?.name;
                    })
                    .map(candidate => {
                      const isGen = isProgramGeneral(selectedProgram);
                      const cIndivCount = candidate.programs.filter((p: any) => !isProgramGeneral(p.program) && p.program.type === "INDIVIDUAL").length;
                      const cIndivOn = candidate.programs.filter((p: any) => !isProgramGeneral(p.program) && p.program.stageType === "ON_STAGE").length;
                      const cIndivOff = candidate.programs.filter((p: any) => !isProgramGeneral(p.program) && p.program.stageType === "OFF_STAGE").length;
                      const cGenTotal = candidate.programs.filter((p: any) => isProgramGeneral(p.program)).length;
                      const cGenOn = candidate.programs.filter((p: any) => isProgramGeneral(p.program) && p.program.stageType === "ON_STAGE").length;
                      const cGenOff = candidate.programs.filter((p: any) => isProgramGeneral(p.program) && p.program.stageType === "OFF_STAGE").length;

                      let isLimitReached = false;
                      let limitReason = "";

                      if (isGen) {
                        if (selectedProgram.stageType === "ON_STAGE" && cGenOn >= maxGeneralOnStage) {
                          isLimitReached = true;
                          limitReason = `General On-Stage reached (${maxGeneralOnStage}/${maxGeneralOnStage})`;
                        } else if (selectedProgram.stageType === "OFF_STAGE" && cGenOff >= maxGeneralOffStage) {
                          isLimitReached = true;
                          limitReason = `General Off-Stage reached (${maxGeneralOffStage}/${maxGeneralOffStage})`;
                        } else if (cGenTotal >= maxGeneralTotal) {
                          isLimitReached = true;
                          limitReason = `General limit reached (${maxGeneralTotal}/${maxGeneralTotal})`;
                        }
                      } else {
                        if (selectedProgram.stageType === "ON_STAGE" && cIndivOn >= maxIndividualOnStage) {
                          isLimitReached = true;
                          limitReason = `On-Stage limit reached (${maxIndividualOnStage}/${maxIndividualOnStage})`;
                        } else if (selectedProgram.stageType === "OFF_STAGE" && cIndivOff >= maxIndividualOffStage) {
                          isLimitReached = true;
                          limitReason = `Off-Stage limit reached (${maxIndividualOffStage}/${maxIndividualOffStage})`;
                        } else if (selectedProgram.type === "INDIVIDUAL" && cIndivCount >= maxIndividualLimit) {
                          isLimitReached = true;
                          limitReason = `Individual limit reached (${maxIndividualLimit}/${maxIndividualLimit})`;
                        }
                      }

                      const isTeamSlotFull = (teamProgramCounts[selectedProgram.id] || 0) >= (selectedProgram.candidateLimitPerTeam || 1);
                      const isStageOpen = isStageAllowed(selectedProgram);
                      if (!isStageOpen && !isLimitReached) {
                        limitReason = selectedProgram.stageType === "OFF_STAGE" ? "🔒 Off-Stage Registration Closed" : "🔒 On-Stage Registration Closed";
                      }
                      const canAssign = !isLimitReached && !isTeamSlotFull && isStageOpen;

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
                              Category: <strong>{candidate.category?.name}</strong> • Stream: <strong>{candidate.masterStudent?.stream || 'N/A'}</strong>
                            </div>
                            {!canAssign && (
                              <div style={{ fontSize: '0.7rem', color: !isStageOpen ? 'var(--error)' : 'var(--warning)', marginTop: '2px', fontWeight: !isStageOpen ? 700 : 400 }}>
                                {isTeamSlotFull ? "Team program slot full" : limitReason}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleAssignCandidate(candidate.id, selectedProgram.id)}
                            className="btn btn-primary"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                            disabled={!canAssign || loading || !isStageOpen}
                          >
                            {isStageOpen ? "Assign" : "Locked"}
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
                    teamProgramAssignments[selectedProgram.id].map(c => {
                      const isStageOpen = isStageAllowed(selectedProgram);
                      return (
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
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: isStageOpen ? 'var(--error)' : 'var(--text-muted)' }}
                          disabled={loading || !isStageOpen}
                          title={!isStageOpen ? "Registration for this stage is closed/locked" : undefined}
                        >
                          {isStageOpen ? "Remove" : "🔒 Locked"}
                        </button>
                      </div>
                      );
                    })
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

        {programs.some(p => isInstitutionProgram(p)) && (
          <div style={{
            marginBottom: 'var(--spacing-md)',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '1.4rem' }}>🏛️</span>
            <div style={{ fontSize: '0.85rem' }}>
              <strong style={{ color: '#9333ea' }}>Institution-Level Programs:</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                Programs such as <strong>Magazine</strong> are evaluated directly on the Institution Name. Individual student registration is not required.
              </span>
            </div>
          </div>
        )}

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
                const isInst = isInstitutionProgram(p);
                const assignedList = teamProgramAssignments[p.id] || [];
                const limit = p.candidateLimitPerTeam || 1;
                const isFulfilled = isInst || assignedList.length >= limit;
                const isEmpty = !isInst && assignedList.length === 0;

                return (
                  <tr key={p.id} style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: isInst 
                      ? (isMagazineParticipating ? 'rgba(147, 51, 234, 0.08)' : 'rgba(245, 158, 11, 0.06)') 
                      : (isFulfilled ? 'rgba(16, 185, 129, 0.02)' : (isEmpty ? 'rgba(239, 68, 68, 0.02)' : 'transparent')),
                    borderLeft: isInst ? `4px solid ${isMagazineParticipating ? '#9333ea' : '#f59e0b'}` : undefined
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
                        backgroundColor: isInst ? 'rgba(168, 85, 247, 0.12)' : (p.category?.name === 'FADHILA' ? 'rgba(142,0,51,0.1)' : (p.category?.name === 'FADHEELA' ? 'rgba(37,99,235,0.1)' : 'rgba(217,119,6,0.1)')),
                        color: isInst ? '#9333ea' : (p.category?.name === 'FADHILA' ? '#e11d5a' : (p.category?.name === 'FADHEELA' ? '#2563eb' : '#d97706'))
                      }}>
                        {isInst ? 'INSTITUTION' : (p.category?.name || 'General')}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{isInst ? 'INSTITUTION' : p.type}</td>
                    <td style={{ padding: '10px' }}>{renderStageBadge(p.stageType, p.type)}</td>
                    <td style={{ padding: '10px' }}>
                      {isInst ? (
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800,
                          backgroundColor: isMagazineParticipating ? 'rgba(147, 51, 234, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isMagazineParticipating ? '#9333ea' : '#d97706',
                          border: `1px solid ${isMagazineParticipating ? '#9333ea' : '#f59e0b'}`
                        }}>
                          {isMagazineParticipating ? '✓ Confirmed Entry' : '⏳ Pending Confirmation'}
                        </span>
                      ) : (
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
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {isInst ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <span style={{ color: '#9333ea', fontWeight: 700, fontSize: '0.85rem' }}>
                              🏛️ Evaluated on Institution Name (No student registration needed)
                            </span>
                            {magazineCode && (
                              <div style={{ marginTop: '2px', color: '#10b981', fontWeight: 800, fontSize: '0.82rem' }}>
                                📖 Official Magazine Code: <span style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{magazineCode}</span> (Mark on physical magazine)
                              </div>
                            )}
                          </div>
                          {!isAssignmentsConfirmed && isOffStageOpen && (
                            <button
                              type="button"
                              onClick={() => handleToggleMagazine(!isMagazineParticipating)}
                              disabled={loading}
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: 'none',
                                backgroundColor: isMagazineParticipating ? 'rgba(239, 68, 68, 0.15)' : '#9333ea',
                                color: isMagazineParticipating ? '#ef4444' : '#fff',
                                transition: 'all 0.2s'
                              }}
                            >
                              {isMagazineParticipating ? 'Withdraw Entry' : '✓ Confirm Magazine Participation'}
                            </button>
                          )}
                        </div>
                      ) : assignedList.length === 0 ? (
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
        <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => window.open(`/print/assignments?teamId=${teamId}`, '_blank')}
            style={{ padding: 'var(--spacing-sm) var(--spacing-lg)', fontSize: '0.9rem' }}
          >
            🖨️ Print List
          </button>

          {/* Off-Stage Status / Action */}
          {!isAssignmentsConfirmed ? (
            isOffStageOpen && (
              <button 
                className="btn btn-primary"
                onClick={() => { setConfirmingStage("OFF_STAGE"); setShowConfirmModal(true); }}
                disabled={loading}
                style={{ padding: 'var(--spacing-sm) var(--spacing-lg)', fontSize: '0.9rem', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              >
                🎨 Confirm Off-Stage to Zone
              </button>
            )
          ) : (
            <div style={{ padding: '6px 14px', color: '#0369a1', fontWeight: 600, border: '1px solid #bae6fd', borderRadius: '6px', backgroundColor: '#f0f9ff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔒</span> Off-Stage Confirmed & Locked
            </div>
          )}

          {/* On-Stage Status / Action */}
          {isOnStageConfirmed ? (
            <div style={{ padding: '6px 14px', color: '#be185d', fontWeight: 600, border: '1px solid #fbcfe8', borderRadius: '6px', backgroundColor: '#fdf2f8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔒</span> On-Stage Confirmed & Locked
            </div>
          ) : isOnStageOpen ? (
            <button 
              className="btn btn-primary"
              onClick={() => { setConfirmingStage("ON_STAGE"); setShowConfirmModal(true); }}
              disabled={loading}
              style={{ padding: 'var(--spacing-sm) var(--spacing-lg)', fontSize: '0.9rem', backgroundColor: '#db2777', borderColor: '#db2777' }}
            >
              🎭 Confirm On-Stage to Zone
            </button>
          ) : isAssignmentsConfirmed ? (
            <div style={{ padding: '6px 14px', color: '#b45309', fontWeight: 600, border: '1px solid #fde68a', borderRadius: '6px', backgroundColor: '#fffbeb', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⏳</span> On-Stage Registration Pending Start
            </div>
          ) : null}

          {isAssignmentsConfirmed && isOnStageConfirmed && (
            <div style={{ padding: '6px 14px', color: 'var(--success)', fontWeight: 700, border: '1px solid var(--success)', borderRadius: '6px', backgroundColor: 'rgba(16,185,129,0.1)', fontSize: '0.85rem' }}>
              ✅ All Registrations Confirmed
            </div>
          )}
        </div>
      )}

      {mounted && showConfirmModal && createPortal(
        <div 
          onClick={() => setShowConfirmModal(false)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.7)', 
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 999999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              backgroundColor: '#ffffff', 
              color: '#0f172a',
              borderRadius: '16px', 
              maxWidth: '780px', 
              width: '100%', 
              maxHeight: '88vh', 
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#ffffff' }}>
              <div>
                <h3 style={{ margin: 0, color: confirmingStage === "OFF_STAGE" ? '#0284c7' : '#db2777', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔒</span> {confirmingStage === "OFF_STAGE" ? "Review & Confirm Off-Stage Registration" : "Review & Confirm On-Stage Registration"}
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {confirmingStage === "OFF_STAGE" 
                    ? "Please review your Off-Stage entries. Once confirmed, Off-Stage programs are strictly locked and submitted to the Zone Admin to generate chest numbers and print invigilation sheets. On-Stage registration will open separately."
                    : "Please review your On-Stage entries. Once confirmed, On-Stage programs are locked and submitted to the Zone Admin. Your previously confirmed Off-Stage data and chest numbers remain untouched."
                  }
                </p>
              </div>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.25rem', 
                  cursor: 'pointer', 
                  color: '#64748b',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Candidate Program List */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {candidates.filter(c => c.programs.length > 0).map(c => {
                const offStageProgs = c.programs.filter((p: any) => p.program?.stageType === "OFF_STAGE");
                const onStageProgs = c.programs.filter((p: any) => p.program?.stageType === "ON_STAGE" || !p.program?.stageType);

                return (
                  <div key={c.id} style={{ border: '1px solid #e2e8f0', padding: '14px 16px', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px', color: '#0f172a', fontSize: '0.95rem' }}>
                      {c.name} {c.uid ? `(${c.uid})` : ''} - <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{c.category?.name}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {offStageProgs.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🎨</span> OFF-STAGE PROGRAMS:
                          </div>
                          <ul style={{ margin: '2px 0 0 0', paddingLeft: '20px', fontSize: '0.85rem', color: '#334155' }}>
                            {offStageProgs.map((p: any) => (
                              <li key={p.programId} style={{ marginTop: '2px' }}>
                                <strong>{p.program.name}</strong> <span style={{ color: '#64748b' }}>({p.program.type})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {onStageProgs.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#db2777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🎭</span> ON-STAGE PROGRAMS:
                          </div>
                          <ul style={{ margin: '2px 0 0 0', paddingLeft: '20px', fontSize: '0.85rem', color: '#334155' }}>
                            {onStageProgs.map((p: any) => (
                              <li key={p.programId} style={{ marginTop: '2px' }}>
                                <strong>{p.program.name}</strong> <span style={{ color: '#64748b' }}>({p.program.type})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {candidates.filter(c => c.programs.length > 0).length === 0 && (
                <div style={{ color: 'var(--warning)', padding: '16px', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.9rem' }}>
                  ⚠️ You have not assigned any programs to your candidates. If you submit now, your team will have 0 entries.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', flexWrap: 'wrap', gap: '10px' }}>
              <a 
                href={`/print/assignments${teamId ? `?teamId=${teamId}` : ''}`}
                target="_blank"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print List
              </a>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  style={{ backgroundColor: confirmingStage === "OFF_STAGE" ? '#0284c7' : '#db2777', borderColor: confirmingStage === "OFF_STAGE" ? '#0284c7' : '#db2777', fontSize: '0.85rem', fontWeight: 700 }}
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { confirmTeamAssignments } = await import('./actions');
                    const res = await confirmTeamAssignments(teamId!, confirmingStage);
                    if (res.success) {
                      window.location.reload();
                    } else {
                      setStatus({ type: 'error', message: res.error || "Failed to confirm." });
                      setLoading(false);
                      setShowConfirmModal(false);
                    }
                  }}
                >
                  {loading ? "Submitting..." : `✅ Yes, Lock & Submit ${confirmingStage === "OFF_STAGE" ? "Off-Stage" : "On-Stage"}`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
