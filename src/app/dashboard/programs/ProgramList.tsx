"use client";

import { useState } from "react";
import { deleteProgram } from "./actions";
import EditProgramModal from "./EditProgramModal";

import AssignJudgesModal from "./AssignJudgesModal";

type ProgramType = {
  id: string;
  programCode: string | null;
  name: string;
  type: string;
  categoryId: string | null;
  category: { name: string } | null;
  event: { name: string };
  judges?: { id: string; username: string }[];
  _count: { assignments: number };
};

export default function ProgramList({ programs, categories, role = "ADMIN", judges = [] }: { programs: ProgramType[], categories: any[], role?: string, judges?: any[] }) {
  const [editingProgram, setEditingProgram] = useState<ProgramType | null>(null);
  const [assigningProgram, setAssigningProgram] = useState<ProgramType | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  if (programs.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No programs created yet.</div>;
  }

  const isZoneAdmin = role === "ZONE_ADMIN";

  // Filter programs by selected category & search
  const filteredPrograms = programs.filter(p => {
    // Category / General Filter
    if (filterCategory === "GENERAL") {
      if (p.type !== "GENERAL" && p.categoryId) return false;
    } else if (filterCategory !== "ALL") {
      if (p.categoryId !== filterCategory) return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const code = p.programCode?.toLowerCase() || "";
      const name = p.name.toLowerCase();
      const cat = p.category?.name.toLowerCase() || "";
      return code.includes(q) || name.includes(q) || cat.includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Category & Search Filter Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--surface-color)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Category:</span>
            <button
              type="button"
              onClick={() => setFilterCategory("ALL")}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '20px',
                border: filterCategory === "ALL" ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: filterCategory === "ALL" ? 'var(--primary)' : 'transparent',
                color: filterCategory === "ALL" ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              All ({programs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory("GENERAL")}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '20px',
                border: filterCategory === "GENERAL" ? '1px solid #D97706' : '1px solid var(--border-color)',
                backgroundColor: filterCategory === "GENERAL" ? '#F59E0B' : 'transparent',
                color: filterCategory === "GENERAL" ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              ⭐ General ({programs.filter(p => p.type === "GENERAL" || !p.categoryId).length})
            </button>
            {categories
              .filter(cat => cat.name.trim().toUpperCase() !== "GENERAL")
              .map(cat => {
                const count = programs.filter(p => p.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFilterCategory(cat.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '20px',
                      border: filterCategory === cat.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: filterCategory === cat.id ? 'var(--primary)' : 'transparent',
                      color: filterCategory === cat.id ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
          </div>

          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search program name, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '220px', padding: '4px 8px', fontSize: '0.8rem', borderRadius: '20px' }}
          />
        </div>
      </div>

      {filteredPrograms.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          No programs found for the selected filter.
        </div>
      ) : (
        filteredPrograms.map((program) => (
          <div key={program.id} style={{ 
            padding: 'var(--spacing-md)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-sm)',
            backgroundColor: 'rgba(15, 23, 42, 0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {program.programCode && (
                    <span style={{ 
                      backgroundColor: 'var(--primary)', 
                      color: 'white', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 800,
                      letterSpacing: '0.05em'
                    }}>
                      {program.programCode}
                    </span>
                  )}
                  {program.name} 
                  <span style={{ color: 'var(--secondary)', fontSize: '0.8rem', padding: '2px 6px', backgroundColor: 'rgba(14, 165, 233, 0.1)', borderRadius: '4px' }}>
                    {program.type}
                  </span>
                  {program.category && (
                    <span style={{ color: 'var(--success)', fontSize: '0.8rem', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px' }}>
                      {program.category.name}
                    </span>
                  )}
                </h4>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Event: {program.event.name} • Assignments: {program._count.assignments}
                  {program.judges && program.judges.length > 0 && (
                     <span style={{ marginLeft: '12px', color: 'var(--brand)' }}>
                       Judges: {program.judges.map(j => j.username).join(", ")}
                     </span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                {isZoneAdmin ? (
                  <>
                    <button 
                      onClick={() => setAssigningProgram(program)}
                      className="btn btn-primary" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Assign Judges
                    </button>
                    <a 
                      href={`/dashboard/programs/${program.id}/print-score-sheet`}
                      target="_blank"
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Score Sheet
                    </a>
                    <a 
                      href={`/dashboard/programs/${program.id}/print-tabulation`}
                      target="_blank"
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Tabulation Sheet
                    </a>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setEditingProgram(program)}
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this program?')) {
                          deleteProgram(program.id);
                        }
                      }}
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {editingProgram && (
        <EditProgramModal 
          program={editingProgram} 
          categories={categories}
          onClose={() => setEditingProgram(null)} 
        />
      )}

      {assigningProgram && (
        <AssignJudgesModal 
          program={assigningProgram} 
          judges={judges}
          onClose={() => setAssigningProgram(null)} 
        />
      )}
    </div>
  );
}
