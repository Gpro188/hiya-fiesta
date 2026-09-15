"use client";

import { useState } from "react";
import { deleteCandidate, approveCandidate } from "./actions";
import EditCandidateModal from "./EditCandidateModal";
import DirectCandidateReplacementModal from "./DirectCandidateReplacementModal";
import { formatInstitutionDisplay } from "@/lib/formatUtils";

type CandidateType = {
  id: string;
  name: string;
  uid?: string | null;
  categoryId: string;
  category: { name: string };
  chestNumber: string | null;
  isApproved: boolean;
  photoUrl: string | null;
  photo?: string | null;
  team: { name: string, prefixCode: string, event: { name: string } };
  _count: { programs: number };
  replacedFromChest?: string | null;
  replacementNote?: string | null;
};

export default function CandidateList({ 
  candidates, 
  role, 
  categories,
  isSchedulePublished = true,
  zones = [] 
}: { 
  candidates: CandidateType[], 
  role: string, 
  categories: any[],
  isSchedulePublished?: boolean,
  zones?: any[] 
}) {
  const [editingCandidate, setEditingCandidate] = useState<CandidateType | null>(null);
  const [replacementModalCandidateId, setReplacementModalCandidateId] = useState<string | null>(null);

  if (candidates.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No candidates registered yet.</div>;
  }

  const isInstitutionRole = ["MANAGER", "INSTITUTION_MANAGER"].includes(role);

  return (
    <div style={{ overflowX: 'auto' }}>
      {["ADMIN", "SUPER_ADMIN"].includes(role) && (
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setReplacementModalCandidateId("SEARCH_MODE")}
            className="btn btn-secondary"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              borderColor: '#f59e0b',
              color: '#d97706',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
            }}
          >
            <span>🔄</span> Direct Candidate & Program Replacement
          </button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: 'var(--spacing-sm)', width: '90px', textAlign: 'center' }}>Chest No</th>
            <th style={{ padding: 'var(--spacing-sm)', width: '50px', textAlign: 'center' }}>Photo</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Student Name & UID</th>
            {!isInstitutionRole && <th style={{ padding: 'var(--spacing-sm)' }}>Team / Institution</th>}
            <th style={{ padding: 'var(--spacing-sm)' }}>Category</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Programs</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Approval Status</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => {
            const photoSrc = candidate.photo || candidate.photoUrl;
            return (
              <tr key={candidate.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                {/* Chest Number Column */}
                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                  {candidate.chestNumber ? (
                    <div>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '4px 10px', 
                        backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                        color: '#059669', 
                        borderRadius: 'var(--radius-md)', 
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        #{candidate.chestNumber}
                      </span>
                      {candidate.replacedFromChest && (
                        <div style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600, marginTop: '2px' }} title={candidate.replacementNote || 'Replaced'}>
                          (repl. #{candidate.replacedFromChest})
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                  )}
                </td>

                {/* Candidate Photo */}
                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                  {photoSrc ? (
                    <img 
                      src={photoSrc} 
                      alt={candidate.name}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1.5px solid var(--border-color)',
                        display: 'inline-block'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      color: 'var(--text-muted)'
                    }}>
                      👤
                    </div>
                  )}
                </td>

                {/* Candidate Name & UID */}
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <div style={{ fontWeight: 600 }}>{candidate.name}</div>
                  {candidate.uid && (
                    <span style={{ 
                      fontSize: '0.72rem', 
                      color: 'var(--text-secondary)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontFamily: 'monospace'
                    }}>
                      UID: {candidate.uid}
                    </span>
                  )}
                </td>

                {/* Team / Institution */}
                {!isInstitutionRole && (
                  <td style={{ padding: 'var(--spacing-sm)' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      {formatInstitutionDisplay(candidate.team).name}
                    </div>
                    {formatInstitutionDisplay(candidate.team).place && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        📍 {formatInstitutionDisplay(candidate.team).place}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {candidate.team.event.name}
                    </div>
                  </td>
                )}

                {/* Category */}
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                    {candidate.category.name}
                  </span>
                </td>

                {/* Programs count */}
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <span style={{ 
                    fontSize: '0.85rem',
                    fontWeight: candidate._count.programs > 0 ? 600 : 400,
                    color: candidate._count.programs > 0 ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}>
                    {candidate._count.programs} assigned
                  </span>
                </td>

                {/* Approval Status */}
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  {candidate.isApproved ? (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontSize: '0.75rem', 
                      color: 'var(--success)',
                      fontWeight: 600
                    }}>
                      <span>✓</span> Approved
                    </span>
                  ) : (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontSize: '0.75rem', 
                      color: 'var(--warning)',
                      fontWeight: 600
                    }}>
                      <span>⏳</span> Pending
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                    {/* Zone Admins or Admins can approve */}
                    {["ZONE_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(role) && !candidate.isApproved && (
                      <button 
                        onClick={async () => {
                          const result = await approveCandidate(candidate.id);
                          if (!result.success) {
                            alert(result.error || "Failed to approve candidate");
                          }
                        }}
                        className="btn btn-primary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--success)' }}
                      >
                        Approve
                      </button>
                    )}

                    {/* Allow editing candidate info */}
                    {(["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) || (!candidate.isApproved && isInstitutionRole)) && (
                      <button 
                        onClick={() => setEditingCandidate(candidate)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                    )}

                    {/* Direct Candidate & Program Replacement for Admins */}
                    {["ADMIN", "SUPER_ADMIN"].includes(role) && (
                      <button 
                        onClick={() => setReplacementModalCandidateId(candidate.id)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                        title="Replace candidate or swap program"
                      >
                        🔄 Replace
                      </button>
                    )}
                    
                    {/* Only allow deletion if not approved yet or if Admin / Super Admin */}
                    {(!candidate.isApproved || ["ADMIN", "SUPER_ADMIN"].includes(role)) && (
                      <button 
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete "${candidate.name}"?`)) {
                            const result = await deleteCandidate(candidate.id);
                            if (!result.success) {
                              alert(result.error || "Failed to delete candidate");
                            }
                          }
                        }}
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      >
                        Delete
                      </button>
                    )}

                    {isInstitutionRole && !isSchedulePublished && !candidate.chestNumber && !candidate.isApproved ? (
                      <button 
                        disabled
                        title="ID Card unlocks once Zone Admin confirms registration (generating chest numbers)"
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', opacity: 0.5, cursor: 'not-allowed' }}
                      >
                        🔒 ID Card
                      </button>
                    ) : (
                      <a 
                        href={`/print/id-card/${candidate.id}`}
                        target="_blank"
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      >
                        🆔 ID Card
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editingCandidate && (
        <EditCandidateModal 
          candidate={editingCandidate} 
          categories={categories}
          role={role}
          onClose={() => setEditingCandidate(null)} 
        />
      )}

      {replacementModalCandidateId && (
        <DirectCandidateReplacementModal
          initialCandidateId={replacementModalCandidateId}
          zones={zones}
          onClose={() => setReplacementModalCandidateId(null)}
          onReplaced={() => window.location.reload()}
        />
      )}
    </div>
  );
}
