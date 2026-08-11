"use client";

import { useState } from "react";
import { assignProgram, unassignProgram } from "./actions";

export default function AssignmentForm({ candidates, programs, isAssignmentOpen = true, statusMessage = "", initialCandidateId, teamId, isAssignmentsConfirmed = false }: { candidates: any[], programs: any[], isAssignmentOpen?: boolean, statusMessage?: string, initialCandidateId?: string, teamId?: string | null, isAssignmentsConfirmed?: boolean }) {
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
      window.location.reload();
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to assign' });
      setLoading(false);
    }
  };

  const handleUnassign = async (programId: string) => {
    setLoading(true);
    setStatus(null);
    const result = await unassignProgram(selectedCandidateId, programId);
    if (result.success) {
      window.location.reload();
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to unassign' });
      setLoading(false);
    }
  };

  return (
    <div>
      {status && (
        <div style={{ color: 'var(--error)', marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-xs)', border: '1px solid var(--error)', borderRadius: 'var(--radius-md)' }}>
          {status.message}
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <label className="form-label">Search & Select Candidate</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Search by UID, Name, or Chest No..."
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
              {c.name} {c.uid ? `(${c.uid})` : ''} - Chest: {c.chestNumber || 'None'}
            </option>
          ))}
        </select>
        <span className="field-helper">Choose a student to view and manage their program assignments. Students you added in the Students List will appear here.</span>
        <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Category: <strong>{selectedCandidate.category?.name}</strong> • Individual Limit: <strong style={{ color: currentIndividualCount >= maxIndividualLimit ? 'var(--error)' : 'var(--success)' }}>{currentIndividualCount} / {maxIndividualLimit}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        <div>
          <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Available Programs</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 var(--spacing-sm) 0' }}>Programs that match the candidate's category. Click "Assign" to register them.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
            {(() => {
              // Calculate how many candidates from this team are already assigned to each program
              const teamProgramCounts: Record<string, number> = {};
              candidates.forEach(c => {
                c.programs.forEach((p: any) => {
                  teamProgramCounts[p.programId] = (teamProgramCounts[p.programId] || 0) + 1;
                });
              });

              return programs
                .filter(p => !assigneCSWCgramIds.includes(p.id)) // Not already assigned to THIS candidate
                .filter(p => p.type === "GENERAL" || p.categoryId === selectedCandidate.categoryId || (p.category?.name === selectedCandidate.category?.name))
                .filter(p => {
                  // Filter out if team limit is reached
                  const teamLimit = p.candidateLimitPerTeam || 1;
                  const currentTeamCount = teamProgramCounts[p.id] || 0;
                  return currentTeamCount < teamLimit;
                })
                .map(program => {
                // Validations
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
                    opacity: canAssign ? 1 : 0.5
                  }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{program.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {program.type} {program.category && `• ${program.category.name}`}
                    </div>
                    {!canAssign && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '2px' }}>
                        Limit reached
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleAssign(program.id)}
                    className="btn btn-primary" 
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    disabled={!canAssign || loading || isAssignmentsConfirmed}
                  >
                    Assign
                  </button>
                </div>
              );
            })})()}
          </div>
        </div>

        <div>
          <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--success)' }}>Assigned Programs</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 var(--spacing-sm) 0' }}>Programs this candidate is registered for. Click "Remove" to unassign.</p>
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
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{p.program.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.program.type}</div>
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
