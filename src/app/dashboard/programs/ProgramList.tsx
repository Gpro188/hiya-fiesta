"use client";

import { useState } from "react";
import { deleteProgram } from "./actions";
import EditProgramModal from "./EditProgramModal";

import AssignJudgesModal from "./AssignJudgesModal";
import { isInstitutionProgram } from "@/lib/programUtils";

type ProgramType = {
  id: string;
  programCode: string | null;
  name: string;
  type: string;
  stageType?: string | null;
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
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  if (programs.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No programs created yet.</div>;
  }

  const isZoneAdmin = role === "ZONE_ADMIN";

  // Filter programs by selected category, stage & search
  const filteredPrograms = programs.filter(p => {
    // Category / General Filter
    if (filterCategory === "GENERAL") {
      if (p.type !== "GENERAL" && p.categoryId) return false;
    } else if (filterCategory !== "ALL") {
      if (p.categoryId !== filterCategory) return false;
    }

    // Stage Filter
    if (filterStage === "ON_STAGE" && p.stageType !== "ON_STAGE") return false;
    if (filterStage === "OFF_STAGE" && p.stageType !== "OFF_STAGE") return false;
    if (filterStage === "INSTITUTION" && !isInstitutionProgram(p)) return false;

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

  const onStageCount = programs.filter(p => p.stageType === "ON_STAGE").length;
  const offStageCount = programs.filter(p => p.stageType === "OFF_STAGE").length;
  const instCount = programs.filter(p => isInstitutionProgram(p)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Category, Stage & Search Filter Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--surface-color)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        
        {/* Row 1: Category Filter & Search */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Category:</span>
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

        {/* Row 2: Prominent Stage Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Stage:</span>
          <button
            type="button"
            onClick={() => setFilterStage("ALL")}
            style={{
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '20px',
              border: filterStage === "ALL" ? '1.5px solid var(--text-primary)' : '1px solid var(--border-color)',
              backgroundColor: filterStage === "ALL" ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: filterStage === "ALL" ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            All Stages
          </button>
          <button
            type="button"
            onClick={() => setFilterStage("ON_STAGE")}
            style={{
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 800,
              borderRadius: '20px',
              border: filterStage === "ON_STAGE" ? '1.5px solid #db2777' : '1px solid rgba(236, 72, 153, 0.3)',
              backgroundColor: filterStage === "ON_STAGE" ? '#db2777' : 'rgba(236, 72, 153, 0.1)',
              color: filterStage === "ON_STAGE" ? '#fff' : '#db2777',
              cursor: 'pointer'
            }}
          >
            🎭 ON-STAGE ({onStageCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStage("OFF_STAGE")}
            style={{
              padding: '3px 10px',
              fontSize: '0.75rem',
              fontWeight: 800,
              borderRadius: '20px',
              border: filterStage === "OFF_STAGE" ? '1.5px solid #0284c7' : '1px solid rgba(14, 165, 233, 0.3)',
              backgroundColor: filterStage === "OFF_STAGE" ? '#0284c7' : 'rgba(14, 165, 233, 0.1)',
              color: filterStage === "OFF_STAGE" ? '#fff' : '#0284c7',
              cursor: 'pointer'
            }}
          >
            🎨 OFF-STAGE ({offStageCount})
          </button>
          {instCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStage("INSTITUTION")}
              style={{
                padding: '3px 10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                borderRadius: '20px',
                border: filterStage === "INSTITUTION" ? '1.5px solid #9333ea' : '1px solid rgba(168, 85, 247, 0.3)',
                backgroundColor: filterStage === "INSTITUTION" ? '#9333ea' : 'rgba(168, 85, 247, 0.1)',
                color: filterStage === "INSTITUTION" ? '#fff' : '#9333ea',
                cursor: 'pointer'
              }}
            >
              🏛️ INSTITUTION ({instCount})
            </button>
          )}
        </div>
      </div>

      {filteredPrograms.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          No programs found for the selected filter.
        </div>
      ) : (
        filteredPrograms.map((program) => {
          const isInst = isInstitutionProgram(program);
          return (
          <div key={program.id} style={{ 
            padding: 'var(--spacing-md)', 
            border: isInst ? '1.5px solid #9333ea' : '1px solid #e2e8f0', 
            borderLeft: isInst ? '5px solid #9333ea' : undefined,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-sm)',
            backgroundColor: isInst ? '#faf5ff' : '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
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
                  
                  {/* High-visibility ON STAGE / OFF STAGE Badge */}
                  <span style={{ 
                    fontSize: '0.74rem', 
                    fontWeight: 800, 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: program.stageType === "OFF_STAGE" ? 'rgba(14, 165, 233, 0.16)' : 'rgba(236, 72, 153, 0.16)', 
                    color: program.stageType === "OFF_STAGE" ? '#0284c7' : '#db2777',
                    border: `1.5px solid ${program.stageType === "OFF_STAGE" ? '#0284c7' : '#db2777'}`
                  }}>
                    {program.stageType === "OFF_STAGE" ? "🎨 OFF STAGE" : "🎭 ON STAGE"}
                  </span>

                  {isInst ? (
                    <span style={{ 
                      fontSize: '0.74rem', 
                      fontWeight: 800, 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      letterSpacing: '0.04em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'rgba(168, 85, 247, 0.16)', 
                      color: '#9333ea',
                      border: '1.5px solid #9333ea'
                    }}>
                      🏛️ INSTITUTION
                    </span>
                  ) : (
                    <span style={{ color: 'var(--secondary)', fontSize: '0.8rem', padding: '2px 6px', backgroundColor: 'rgba(14, 165, 233, 0.1)', borderRadius: '4px', fontWeight: 600 }}>
                      {program.type}
                    </span>
                  )}

                  {program.category && (
                    <span style={{ color: 'var(--success)', fontSize: '0.8rem', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', fontWeight: 600 }}>
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
                {isInst && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#9333ea', fontWeight: 700 }}>
                    🏛️ INSTITUTION LEVEL: Evaluated on College Name (No student registration needed).
                  </div>
                )}
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
          );
        })
      )}

      {editingProgram && (
        <EditProgramModal 
          program={editingProgram} 
          categories={categories}
          userRole={role}
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
