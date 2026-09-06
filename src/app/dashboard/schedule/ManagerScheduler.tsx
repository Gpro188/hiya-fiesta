"use client";

import { useState } from "react";

export default function ManagerScheduler({ initialPrograms, teamId, isSchedulePublished }: { initialPrograms: any[], teamId: string, isSchedulePublished?: boolean }) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const categories = Array.from(new Set(initialPrograms.map(p => p.category?.name || "General Event").filter(Boolean)));
  const types = Array.from(new Set(initialPrograms.map(p => p.type)));

  const filtereCSWCgrams = programs.filter(p => {
    const pCat = p.category?.name || "General Event";
    const categoryMatch = selectedCategory === "all" || pCat === selectedCategory;
    const typeMatch = selectedType === "all" || p.type === selectedType;
    return categoryMatch && typeMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div className="glass-panel" style={{ padding: 'var(--spacing-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Category:</label>
            <select 
              className="form-input" 
              style={{ width: '150px', padding: '4px 8px' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Type:</label>
            <select 
              className="form-input" 
              style={{ width: '150px', padding: '4px 8px' }}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              {types.map((type: any) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        {isSchedulePublished && (
          <button 
            className="btn btn-secondary"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🖨️ Print View
          </button>
        )}
      </div>

      <div className="print-area">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filtereCSWCgrams.length === 0 ? (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No programs found for these filters.
            </div>
          ) : (
            filtereCSWCgrams.map((p) => {
              const hasAssignments = p.assignments && p.assignments.length > 0;
              return (
                <div key={p.id} className="glass-panel" style={{ 
                  padding: 'var(--spacing-md)', 
                  breakInside: 'avoid',
                  borderLeft: hasAssignments ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: hasAssignments ? 'rgba(79, 70, 229, 0.03)' : 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          backgroundColor: p.type === 'GENERAL' ? '#f3f4f6' : (p.type === 'GROUP' ? '#eef2ff' : '#ecfdf5'),
                          color: p.type === 'GENERAL' ? '#4b5563' : (p.type === 'GROUP' ? '#4338ca' : '#059669'),
                          fontWeight: 700
                        }}>
                          {p.type}
                        </span>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{p.name}</h4>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {p.category?.name || 'General Event'}
                      </div>
                      
                      {hasAssignments && (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Your Participants:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {p.assignments.map((as: any) => (
                              <div key={as.id} style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', color: '#1f2937', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                                👤 {as.candidate.name} {as.slotNumber ? `(Slot #${as.slotNumber})` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      {p.startTime ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {new Date(p.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {new Date(p.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            {p.venue && ` @ ${p.venue}`}
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Time Not Set</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .glass-panel { border: 1px solid #eee !important; box-shadow: none !important; color: black !important; background: white !important; }
          h4, div, span { color: black !important; }
        }
      `}</style>
    </div>
  );
}
