"use client";

import { useState } from "react";
import { deleteCandidate, approveCandidate } from "./actions";
import EditCandidateModal from "./EditCandidateModal";

type CandidateType = {
  id: string;
  name: string;
  categoryId: string;
  category: { name: string };
  chestNumber: string | null;
  isApproved: boolean;
  photoUrl: string | null;
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
    return <div style={{ color: 'var(--text-muted)' }}>No candidates found.</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: 'var(--spacing-sm)' }}>Photo</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Name</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Event</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Team</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Category</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Status / Chest No</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Programs</th>
            <th style={{ padding: 'var(--spacing-sm)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: 'var(--spacing-sm)' }}>
                 {candidate.photoUrl ? (
                   <img 
                    src={candidate.photoUrl} 
                    alt={candidate.name} 
                    style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                   />
                 ) : (
                   <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>👤</div>
                 )}
              </td>
              <td style={{ padding: 'var(--spacing-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{candidate.name}</td>
              <td style={{ padding: 'var(--spacing-sm)', fontSize: '0.8rem' }}>{candidate.team.event.name}</td>
              <td style={{ padding: 'var(--spacing-sm)' }}>{candidate.team.name}</td>
              <td style={{ padding: 'var(--spacing-sm)' }}>{candidate.category.name}</td>
              <td style={{ padding: 'var(--spacing-sm)' }}>
                {candidate.isApproved ? (
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '2px 8px', 
                    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                    color: 'var(--success)', 
                    borderRadius: 'var(--radius-md)', 
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {candidate.chestNumber}
                  </span>
                ) : (
                  <span style={{ color: 'var(--warning)', fontSize: '0.8rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    Pending Zone Approval
                  </span>
                )}
              </td>
              <td style={{ padding: 'var(--spacing-sm)' }}>{candidate._count.programs}</td>
              <td style={{ padding: 'var(--spacing-sm)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
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

                {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && candidate.isApproved && (
                  <span 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      padding: '0.2rem 0.5rem', 
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--success)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem'
                    }}
                  >
                    ✓ Approved
                  </span>
                )}
                
                {["MANAGER", "INSTITUTION_MANAGER", "ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && (
                  <a 
                    href={`/dashboard/assignments?candidateId=${candidate.id}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none' }}
                  >
                    Assign Programs
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
                      if (confirm('Are you sure you want to delete this candidate?')) {
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

                {["MANAGER", "INSTITUTION_MANAGER"].includes(role) && !isSchedulePublished && !candidate.chestNumber && !candidate.isApproved ? (
                  <button 
                    disabled
                    title="ID Card available after Zone Admin confirms candidates / assigns chest numbers"
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
              </td>
            </tr>
          ))}
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
