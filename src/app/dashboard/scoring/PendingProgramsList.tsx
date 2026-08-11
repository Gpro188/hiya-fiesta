"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PendingProgramsList({ programs }: { programs: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (programs.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--success)' }}>
        🎉 All programs have results entered!
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-outline"
        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
      >
        View {programs.length} Pending Programs
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px' }}>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Hide List ▲
        </button>
      </div>
      {programs.map((program) => (
        <button 
          key={program.id} 
          onClick={() => {
            router.push(`?programId=${program.id}#scoring-form`);
          }}
          style={{ 
            padding: 'var(--spacing-sm) var(--spacing-md)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{program.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {program.category?.name || 'General'} • {program.type} • {program._count?.assignments} Candidates
            </div>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--error)', fontWeight: 'bold' }}>
            ENTER MARKS
          </div>
        </button>
      ))}
    </div>
  );
}
