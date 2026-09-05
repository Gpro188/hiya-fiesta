"use client";

import { useState } from "react";
import { deleteCandidate, approveCandidate } from "./actions";
import EditCandidateModal from "./EditCandidateModal";

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
};

export default function CandidateList({ 
  candidates, 
  role, 
  categories,
  isSchedulePublished = true 
}: { 
  candidates: CandidateType[], 
  role: string, 
  categories: any[],
  isSchedulePublished?: boolean 
}) {
  const [editingCandidate, setEditingCandidate] = useState<CandidateType | null>(null);

  if (candidates.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No candidates registered yet.</div>;
  }

  const isInstitutionRole = ["MANAGER", "INSTITUTION_MANAGER"].includes(role);

  return (
    <div style={{ overflowX: 'auto' }}>
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
                      {candidate.chestNumber}
                    </span>
                  ) : (
                    <span style={{ 
                      color: 'var(--text-muted)', 
                      fontSize: '0.75rem', 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                      padding: '3px 6px', 
                      borderRadius: '4px',
                      border: '1px dashed var(--border-color)'
                    }}>
                      Pending
                    </span>
                  )}
                </td>

                {/* Photo Column */}
                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                  {photoSrc ? (
                    <img 
                      src={photoSrc} 
                      alt={candidate.name} 
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '6px', 
                        objectFit: 'cover', 
                        border: '1.5px solid var(--border-color)',
                        display: 'block',
                        margin: '0 auto'
                      }} 
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div style={{ 
                      width: '38px', 
                      height: '38px', 
                      borderRadius: '6px', 
                      backgroundColor: 'rgba(255,255,255,0.05)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.9rem',
                      margin: '0 auto',
                      border: '1px dashed var(--border-color)'
                    }}>
                      👤
                    </div>
                  )}
                </td>

                {/* Candidate Name & UID */}
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}>
                    {candidate.name}
                  </div>
                  {candidate.uid && (
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                      UID: {candidate.uid}
                    </div>
                  )}
                </td>

                {!isInstitutionRole && (
                  <td style={{ padding: 'var(--spacing-sm)', fontSize: '0.85rem' }}>
                    {candidate.team.name}
                  </td>
                )}

                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <span style={{ 
                    fontSize: '0.78rem', 
                    fontWeight: 600, 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {candidate.category.name}
                  </span>
                </td>

                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <span style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    <span>📜</span> {candidate._count.programs}
                  </span>
                </td>

                {/* Approval Status */}
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  {candidate.isApproved ? (
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--success)', 
                      fontSize: '0.8rem', 
                      fontWeight: 700,
                      backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                      padding: '3px 8px', 
                      borderRadius: '4px' 
                    }}>
                      ✓ Confirmed
                    </span>
                  ) : (
                    <span style={{ 
                      color: 'var(--warning)', 
                      fontSize: '0.75rem', 
                      backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                      padding: '3px 8px', 
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      ⏳ Pending Zone Admin
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: 'var(--spacing-sm)' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && !candidate.isApproved && (
                      <button 
                        onClick={async () => {
                          const result = await approveCandidate(candidate.id);
                          if (!result.success) {
                            alert(result.error || "Failed to approve candidate");
                          }
                        }}
                        className="btn btn-primary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Approve
                      </button>
                    )}
                    
                    {["MANAGER", "INSTITUTION_MANAGER", "ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && (
                      <a 
                        href={`/dashboard/assignments?candidateId=${candidate.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none' }}
                      >
                        Programs
                      </a>
                    )}

                    {/* Only allow editing if not approved (for Manager) or always (for Admin) */}
                    {(role === "ADMIN" || !candidate.isApproved) && (
                      <button 
                        onClick={() => setEditingCandidate(candidate)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                    )}
                    
                    {/* Only allow deletion if not approved yet or if Admin */}
                    {(!candidate.isApproved || role === "ADMIN") && (
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
    </div>
  );
}
