"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { batchSubmitProgramMarks } from "./actions";

interface ScoringEntry {
  participantId: string;
  candidateId?: string;
  teamId?: string;
  name: string;
  chestNumber?: string;
  teamName?: string;
  marks: string;
  rank: string;
  grade: string;
  points: number;
}

export default function ScoringForm({ events }: { events: any[] }) {
  const [eventId, setEventId] = useState(events[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [programId, setProgramId] = useState("");
  const [entries, setEntries] = useState<ScoringEntry[]>([]);
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  useEffect(() => {
    if (events.length > 0) {
      setEventId(events[0].id);
      setCategoryId("");
      setProgramId("");
      setEntries([]);
    }
  }, [events]);

  const searchParams = useSearchParams();
  const urlProgramId = searchParams.get('programId');
  const router = useRouter();
  const pathname = usePathname();

  const selectedEvent = events.find(e => e.id === eventId);
  const allPrograms = selectedEvent?.programs || [];

  // Auto-populate based on URL programId
  useEffect(() => {
    if (urlProgramId && allPrograms.length > 0) {
      const p = allPrograms.find((p: any) => p.id === urlProgramId);
      if (p) {
        setCategoryId(p.categoryId || "general-cat");
        setProgramId(p.id);
        
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('programId');
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
      }
    }
  }, [urlProgramId, allPrograms, router, pathname, searchParams]);

  // Extract unique categories
  const categoryMap = new Map();
  allPrograms.forEach((p: any) => {
    if (p.category) {
      categoryMap.set(p.category.id, p.category.name);
    } else if (p.type === 'GENERAL') {
      categoryMap.set("general-cat", "GENERAL");
    }
  });
  const categories = Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));

  // Filtered programs for selected category
  const programs = allPrograms.filter((p: any) => {
    if (categoryId === "general-cat") return !p.category && p.type === 'GENERAL';
    if (categoryId) return p.category?.id === categoryId;
    return true;
  });

  const selecteCSWCgram = allPrograms.find((p: any) => p.id === programId);
  const isIndividual = selecteCSWCgram?.type === "INDIVIDUAL";

  // When selected program changes, build list of all candidates / teams with existing scores
  useEffect(() => {
    if (!selecteCSWCgram) {
      setEntries([]);
      return;
    }

    const existingResults = selecteCSWCgram.results || [];
    let initialEntries: ScoringEntry[] = [];

    if (isIndividual) {
      const assignments = selecteCSWCgram.assignments || [];
      initialEntries = assignments.map((a: any) => {
        const cand = a.candidate;
        const res = existingResults.find((r: any) => r.candidateId === cand.id);
        return {
          participantId: cand.id,
          candidateId: cand.id,
          name: cand.name,
          chestNumber: cand.chestNumber,
          teamName: cand.team?.name,
          marks: res ? res.marks.toString() : "",
          rank: res?.rank ? res.rank.toString() : "",
          grade: res?.grade || "",
          points: res?.points || 0
        };
      });
    } else {
      const teams = selectedEvent?.teams || [];
      initialEntries = teams.map((t: any) => {
        const res = existingResults.find((r: any) => r.teamId === t.id);
        return {
          participantId: t.id,
          teamId: t.id,
          name: t.name,
          teamName: t.name,
          marks: res ? res.marks.toString() : "",
          rank: res?.rank ? res.rank.toString() : "",
          grade: res?.grade || "",
          points: res?.points || 0
        };
      });
    }

    setEntries(initialEntries);
  }, [programId, selecteCSWCgram, isIndividual, selectedEvent]);

  // Points matrix calculation
  const calculatePoints = (r: string, g: string) => {
    let pointsConfig: any = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
    if (!isIndividual) {
      pointsConfig = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };
    }
    if (selecteCSWCgram?.category?.pointMatrix) {
      const matrix = selecteCSWCgram.category.pointMatrix;
      const str = isIndividual ? matrix.individualPoints : matrix.groupPoints;
      if (str) {
        try { pointsConfig = JSON.parse(str); } catch (e) {}
      }
    }

    let total = 0;
    if (r === "1") total += pointsConfig.rank1 || 0;
    else if (r === "2") total += pointsConfig.rank2 || 0;
    else if (r === "3") total += pointsConfig.rank3 || 0;

    if (g === "A") total += pointsConfig.gradeA || 0;
    else if (g === "B") total += pointsConfig.gradeB || 0;
    else if (g === "C") total += pointsConfig.gradeC || 0;

    return total;
  };

  const handleEntryChange = (index: number, field: 'marks' | 'rank' | 'grade', value: string) => {
    setEntries(prev => {
      const copy = [...prev];
      const current = { ...copy[index], [field]: value };

      // If user typed marks and didn't manually specify grade, auto-suggest grade
      if (field === 'marks') {
        const numMarks = parseFloat(value);
        if (!isNaN(numMarks) && numMarks > 0) {
          if (!current.grade || current.grade === "") {
            if (numMarks >= 80) current.grade = "A";
            else if (numMarks >= 60) current.grade = "B";
            else current.grade = "C";
          }
        }
      }

      current.points = calculatePoints(current.rank, current.grade);
      copy[index] = current;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (!programId) {
      setStatus({ type: 'error', message: 'Please select a program first.' });
      setLoading(false);
      return;
    }

    const validEntries = entries
      .filter(item => item.marks !== "" || item.rank !== "" || item.grade !== "")
      .map(item => ({
        candidateId: item.candidateId,
        teamId: item.teamId,
        marks: parseFloat(item.marks) || 0,
        rank: item.rank ? parseInt(item.rank) : null,
        grade: item.grade || null,
        points: item.points
      }));

    if (validEntries.length === 0) {
      setStatus({ type: 'error', message: 'Please enter marks, place or grade for at least one participant.' });
      setLoading(false);
      return;
    }

    const result = await batchSubmitProgramMarks({
      eventId,
      programId,
      publishImmediately,
      entries: validEntries
    });

    if (result.success) {
      setStatus({ 
        type: 'success', 
        message: `Saved marks for ${validEntries.length} participants successfully! ${publishImmediately ? '(Published to Live Standings)' : ''}` 
      });
    } else {
      setStatus({ type: 'error', message: result.error || "Failed to save results." });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {status && (
        <div style={{ 
          color: status.type === 'error' ? '#dc2626' : '#059669', 
          backgroundColor: status.type === 'error' ? '#fef2f2' : '#f0fdf4',
          padding: '14px 18px', 
          borderRadius: '12px',
          border: `1px solid ${status.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          fontSize: '0.95rem',
          fontWeight: 600,
          boxShadow: 'var(--shadow-sm)'
        }}>
          {status.type === 'error' ? '❌ ' : '✅ '} {status.message}
        </div>
      )}

      {/* Program Selector Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: 'var(--spacing-md)',
        backgroundColor: '#fff',
        padding: '16px',
        borderRadius: '14px',
        border: '1px solid #f2d9e6',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#332938' }}>1. EVENT / ZONE</label>
          <select 
            className="form-input" 
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              setCategoryId("");
              setProgramId("");
              setEntries([]);
            }}
            required
            style={{ padding: '9px 12px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#332938' }}>2. CATEGORY</label>
          <select 
            className="form-input" 
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setProgramId("");
              setEntries([]);
            }}
            required
            style={{ padding: '9px 12px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <option value="">-- Choose Category --</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary, #e6007e)' }}>3. COMPETITION PROGRAM</label>
          <select 
            className="form-input" 
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            required
            disabled={!categoryId}
            style={{ 
              padding: '9px 12px', 
              fontSize: '0.9rem', 
              fontWeight: 700, 
              border: programId ? '2px solid var(--primary)' : '1px solid #d1d5db' 
            }}
          >
            <option value="">-- Select Program to Score --</option>
            {programs.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Program Candidates Total Marks Grid */}
      {selecteCSWCgram && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1.5px solid #f2d9e6',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(230, 0, 126, 0.04)'
        }}>
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#FFF8FA',
            borderBottom: '1.5px solid #f2d9e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#1a1420', fontSize: '1.2rem', fontWeight: 800 }}>
                {selecteCSWCgram.name}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#7a7480' }}>
                Category: <strong>{selecteCSWCgram.category?.name || 'General'}</strong> • Type: <strong>{selecteCSWCgram.type}</strong> • Candidates Enrolled: <strong>{entries.length}</strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#332938', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={publishImmediately} 
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                />
                Publish Immediately to Live Results
              </label>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading || entries.length === 0}
                style={{
                  padding: '9px 24px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(230,0,126,0.3)',
                  textTransform: 'uppercase'
                }}
              >
                {loading ? "Saving All..." : "💾 Save All Marks (One-Click)"}
              </button>
            </div>
          </div>

          {entries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#7a7480' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
              <strong>No participants assigned to this program in this zone.</strong>
              <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>Assign candidates from Program Assignments tab first.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF5F8', borderBottom: '1.5px solid #f2d9e6', color: '#554a5c', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center' }}>#</th>
                    {isIndividual && <th style={{ padding: '12px 16px', width: '110px' }}>Chest No</th>}
                    <th style={{ padding: '12px 16px' }}>Participant / Candidate</th>
                    <th style={{ padding: '12px 16px' }}>Institution / Team</th>
                    <th style={{ padding: '12px 16px', width: '140px' }}>Total Marks</th>
                    <th style={{ padding: '12px 16px', width: '130px' }}>Place (Rank)</th>
                    <th style={{ padding: '12px 16px', width: '120px' }}>Grade</th>
                    <th style={{ padding: '12px 16px', width: '100px', textAlign: 'right' }}>Calculated Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={entry.participantId} style={{ borderBottom: '1px solid #fbf0f5', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#9ca3af' }}>
                        {idx + 1}
                      </td>

                      {isIndividual && (
                        <td style={{ padding: '12px 16px', fontWeight: 900, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--primary, #e6007e)' }}>
                          {entry.chestNumber || '-'}
                        </td>
                      )}

                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1a1420' }}>
                        {entry.name}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: '0.82rem' }}>
                        {entry.teamName || '-'}
                      </td>

                      {/* Total Marks Input */}
                      <td style={{ padding: '8px 16px' }}>
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={entry.marks}
                          onChange={(e) => handleEntryChange(idx, 'marks', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1.5px solid #d1d5db',
                            fontWeight: 800,
                            fontSize: '1rem',
                            color: '#111827',
                            backgroundColor: entry.marks ? '#FEF2F6' : '#fff',
                            textAlign: 'center'
                          }}
                        />
                      </td>

                      {/* Place / Rank Select */}
                      <td style={{ padding: '8px 16px' }}>
                        <select
                          value={entry.rank}
                          onChange={(e) => handleEntryChange(idx, 'rank', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: entry.rank ? '2px solid #F59E0B' : '1px solid #d1d5db',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            backgroundColor: entry.rank === "1" ? '#FFFBEB' : entry.rank === "2" ? '#F8FAFC' : entry.rank === "3" ? '#FFF7ED' : '#fff',
                            color: entry.rank ? '#B45309' : '#374151'
                          }}
                        >
                          <option value="">-- None --</option>
                          <option value="1">🥇 1st Place</option>
                          <option value="2">🥈 2nd Place</option>
                          <option value="3">🥉 3rd Place</option>
                        </select>
                      </td>

                      {/* Grade Select */}
                      <td style={{ padding: '8px 16px' }}>
                        <select
                          value={entry.grade}
                          onChange={(e) => handleEntryChange(idx, 'grade', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: entry.grade ? '1.5px solid var(--primary)' : '1px solid #d1d5db',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            backgroundColor: entry.grade ? '#FDF2F8' : '#fff',
                            color: entry.grade ? '#BE185D' : '#374151'
                          }}
                        >
                          <option value="">-- None --</option>
                          <option value="A">⭐ Grade A</option>
                          <option value="B">✨ Grade B</option>
                          <option value="C">Grade C</option>
                        </select>
                      </td>

                      {/* Calculated Points */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, fontSize: '1.05rem', color: entry.points > 0 ? 'var(--primary, #e6007e)' : '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {entry.points} <span style={{ fontSize: '0.7rem', color: '#7a7480', fontWeight: 600 }}>pts</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {entries.length > 0 && (
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#FFF8FA',
              borderTop: '1.5px solid #f2d9e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#7a7480' }}>
                💡 <strong>Tip:</strong> Entering marks automatically calculates the grade (A ≥ 80, B ≥ 60). Points update dynamically in real time.
              </p>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
                style={{
                  padding: '10px 28px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(230,0,126,0.35)',
                  textTransform: 'uppercase'
                }}
              >
                {loading ? "Saving All..." : "🚀 Save & Submit All Marks"}
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

