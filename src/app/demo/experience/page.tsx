"use client";

import { useState } from "react";

export default function DemoExperience() {
  const [step, setStep] = useState(1);
  const [festName, setFestName] = useState("My Demo Fest");
  const [programName, setProgramName] = useState("Quran Recitation");
  
  // Need at least 4 candidates
  const [candidates, setCandidates] = useState([
    { name: "Abdullah", team: "Al-Fatah" },
    { name: "Muhammad", team: "Al-Noor" },
    { name: "Fatima", team: "Al-Badr" },
    { name: "Aisha", team: "Al-Huda" }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3); // Go to results simulation directly
  };

  const updateCandidate = (index: number, field: 'name' | 'team', value: string) => {
    const newCandidates = [...candidates];
    newCandidates[index][field] = value;
    setCandidates(newCandidates);
  };

  // Pre-calculate points for the demo display
  const results = [
    { rank: 1, grade: "A", points: 6, ...candidates[0] },
    { rank: 2, grade: "A", points: 4, ...candidates[1] },
    { rank: 3, grade: "A", points: 2, ...candidates[2] },
    { rank: null, grade: "A", points: 1, ...candidates[3] }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: step === 3 ? '1200px' : '600px', padding: '40px', transition: 'max-width 0.3s ease' }}>
        
        {step < 3 && (
          <>
            <h1 style={{ textAlign: 'center', marginBottom: '10px', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Interactive Demo Generator
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>
              Experience the full power of Artsfest. We will generate a custom live festival preview for you!
            </p>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="fade-in">
              <h3 style={{ marginBottom: '20px' }}>Step 1: Festival Details</h3>
              <div className="form-group">
                <label className="form-label">Demo Festival Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={festName} 
                  onChange={(e) => setFestName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">A Demo Program Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={programName} 
                  onChange={(e) => setProgramName(e.target.value)} 
                  required 
                  placeholder="e.g. Essay Writing, Elocution"
                />
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(2)}>
                Next: Add Candidates
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <h3 style={{ marginBottom: '20px' }}>Step 2: Add Minimum 4 Candidates</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                We need at least 4 candidates in different teams to show you a proper results poster and points table!
              </p>
              
              <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                {candidates.map((cand, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '5px', color: 'var(--text-muted)' }}>Candidate {i + 1} Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={cand.name} 
                        onChange={(e) => updateCandidate(i, 'name', e.target.value)} 
                        required 
                        style={{ margin: 0 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '5px', color: 'var(--text-muted)' }}>Team Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={cand.team} 
                        onChange={(e) => updateCandidate(i, 'team', e.target.value)} 
                        required 
                        style={{ margin: 0 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  🚀 Generate Live Preview
                </button>
              </div>
            </div>
          )}
        </form>

        {step === 3 && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--primary)' }}>{festName}</h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Live Results Preview: {programName}</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Start Over</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              
              {/* Poster Output */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ 
                  width: '100%', 
                  maxWidth: '400px', 
                  aspectRatio: '4/5', 
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', 
                  position: 'relative',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  border: '8px solid #000',
                  overflow: 'hidden'
                }}>
                  {/* Poster Decorations */}
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: '#8b5cf6', filter: 'blur(40px)', opacity: 0.5 }}></div>
                  <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '200px', height: '200px', background: '#ec4899', filter: 'blur(50px)', opacity: 0.4 }}></div>
                  
                  <div style={{ position: 'relative', zIndex: 1, padding: '2.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>{festName}</div>
                      <h2 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: 900, margin: 0, lineHeight: 1.1, textTransform: 'uppercase' }}>{programName}</h2>
                      <div style={{ fontSize: '0.9rem', color: '#a78bfa', marginTop: '0.25rem' }}>Category: General</div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem' }}>
                      
                      {/* 1st Place */}
                      <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '2rem' }}>🥇</div>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>{results[0].name}</div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{results[0].team}</div>
                        </div>
                      </div>

                      {/* 2nd Place */}
                      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '1.5rem' }}>🥈</div>
                        <div>
                          <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>{results[1].name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{results[1].team}</div>
                        </div>
                      </div>

                      {/* 3rd Place */}
                      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '1.5rem' }}>🥉</div>
                        <div>
                          <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>{results[2].name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{results[2].team}</div>
                        </div>
                      </div>

                    </div>

                    <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '1px' }}>GENERATED BY CSWC SYSTEM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ID Card Output & Points Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>ID Card Example</h3>
                  <div style={{ 
                    width: '240px', 
                    height: '380px', 
                    background: '#ffffff', 
                    borderRadius: '16px', 
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)', 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e2e8f0',
                    margin: '0 auto'
                  }}>
                    <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', padding: '1rem', textAlign: 'center', color: '#fff' }}>
                      <div style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '0.9rem' }}>{festName.toUpperCase()}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>PARTICIPANT</div>
                    </div>
                    
                    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', marginBottom: '1rem', border: '3px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                        👨‍🎓
                      </div>
                      <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}>{results[0].name}</h3>
                      <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>{results[0].team}</p>
                      
                      <div style={{ marginTop: 'auto', width: '100%', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '60px', height: '60px', background: 'repeating-linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%, #0f172a), repeating-linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%, #0f172a)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px', borderRadius: '4px', opacity: 0.8 }}></div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', letterSpacing: '1px' }}>ID: T1-100</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Points Update Output</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Team</th>
                        <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px', fontWeight: 500 }}>{r.name}</td>
                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{r.team}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: 'var(--primary)', fontWeight: 600 }}>+{r.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
