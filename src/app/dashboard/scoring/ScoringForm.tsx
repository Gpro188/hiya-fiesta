"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { submitMarks } from "./actions";

export default function ScoringForm({ events }: { events: any[] }) {
  const [eventId, setEventId] = useState(events[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [programId, setProgramId] = useState("");
  const [participantId, setParticipantId] = useState(""); 
  const [marks, setMarks] = useState("");
  const [rank, setRank] = useState<string>(""); 
  const [grade, setGrade] = useState<string>(""); 
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  // Sync state with props when switching events
  useEffect(() => {
    if (events.length > 0) {
      setEventId(events[0].id);
      setCategoryId("");
      setProgramId("");
      setParticipantId("");
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
        setParticipantId("");
        
        // Remove it from URL so we don't get stuck if user changes category manually
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('programId');
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
      }
    }
  }, [urlProgramId, allPrograms, router, pathname, searchParams]);

  // Extract unique categories from all programs
  const categoryMap = new Map();
  allPrograms.forEach((p: any) => {
    if (p.category) {
      categoryMap.set(p.category.id, p.category.name);
    } else if (p.type === 'GENERAL') {
      categoryMap.set("general-cat", "GENERAL");
    }
  });
  const categories = Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));

  // Final filtered programs for step 3
  const programs = allPrograms.filter((p: any) => {
    if (categoryId === "general-cat") return !p.category && p.type === 'GENERAL';
    if (categoryId) return p.category?.id === categoryId;
    return true;
  });

  const selecteCSWCgram = programs.find((p: any) => p.id === programId);
  const isIndividual = selecteCSWCgram?.type === "INDIVIDUAL";

  // Cumulative Point Calculation
  const updateMarks = (newRank: string, newGrade: string) => {
    setRank(newRank);
    setGrade(newGrade);

    if (!newRank && !newGrade) return;

    let pointsConfig: any = { rank1: 5, rank2: 3, rank3: 1, gradeA: 5, gradeB: 3, gradeC: 1 };
    if (selecteCSWCgram?.type !== "INDIVIDUAL") {
      pointsConfig = { rank1: 10, rank2: 6, rank3: 3, gradeA: 5, gradeB: 3, gradeC: 1 };
    }
    if (selecteCSWCgram?.type === "GENERAL") {
      const eventMatrix = selectedEvent?.generalPointMatrix;
      if (eventMatrix?.generalPoints) {
        try { pointsConfig = JSON.parse(eventMatrix.generalPoints); } catch (e) {}
      }
    } else if (selecteCSWCgram?.category?.pointMatrix) {
      const matrix = selecteCSWCgram.category.pointMatrix;
      const str = selecteCSWCgram.type === "INDIVIDUAL" ? matrix.individualPoints : matrix.groupPoints;
      if (str) {
        try { pointsConfig = JSON.parse(str); } catch (e) {}
      }
    }

    let total = 0;
    if (newRank === "1") total += pointsConfig.rank1 || 0;
    else if (newRank === "2") total += pointsConfig.rank2 || 0;
    else if (newRank === "3") total += pointsConfig.rank3 || 0;

    if (newGrade === "A") total += pointsConfig.gradeA || 0;
    else if (newGrade === "B") total += pointsConfig.gradeB || 0;
    else if (newGrade === "C") total += pointsConfig.gradeC || 0;

    setMarks(total.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    
    if (!programId) {
      setStatus({ type: 'error', message: 'Please select a program' });
      setLoading(false);
      return;
    }

    if (!participantId) {
      setStatus({ type: 'error', message: `Please select a ${isIndividual ? 'candidate' : 'team'}` });
      setLoading(false);
      return;
    }
    
    const result = await submitMarks({
      eventId,
      programId,
      chestNumber: isIndividual ? participantId : undefined,
      teamId: !isIndividual ? participantId : undefined,
      marks: parseFloat(marks) || 0,
      manualRank: rank ? parseInt(rank) : null,
      manualGrade: grade || null
    });
    
    if (result.success) {
      setStatus({ type: 'success', message: 'Result recorded successfully!' });
      setParticipantId("");
      setMarks("");
      setRank("");
      setGrade("");
    } else {
      setStatus({ type: 'error', message: result.error || "Failed to submit result" });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {status && (
        <div style={{ 
          color: status.type === 'error' ? '#dc2626' : '#059669', 
          backgroundColor: status.type === 'error' ? '#fef2f2' : '#f0fdf4',
          padding: '12px 16px', 
          borderRadius: '10px',
          border: `1px solid ${status.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          fontSize: '0.95rem',
          fontWeight: 500,
          boxShadow: 'var(--shadow-sm)'
        }}>
          {status.type === 'error' ? '❌ ' : '✅ '} {status.message}
        </div>
      )}
      
      {/* 4-Step Selection Flow */}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 var(--spacing-sm) 0' }}>
        Follow the 4 steps below to record a result: select the event, category, specific program, and then the participant.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 2fr 1.5fr', gap: 'var(--spacing-sm)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.65rem', fontWeight: 800 }}>1. EVENT</label>
          <select 
            className="form-input" 
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              setCategoryId("");
              setProgramId("");
              setParticipantId("");
            }}
            required
            style={{ padding: '8px', fontSize: '0.85rem' }}
          >
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.65rem', fontWeight: 800 }}>2. CATEGORY</label>
          <select 
            className="form-input" 
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setProgramId("");
              setParticipantId("");
            }}
            required
            style={{ padding: '8px', fontSize: '0.85rem' }}
          >
            <option value="">-- Cat --</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.65rem', fontWeight: 800 }}>3. PROGRAM</label>
          <select 
            className="form-input" 
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setParticipantId("");
            }}
            required
            disabled={!categoryId}
            style={{ padding: '8px', fontSize: '0.85rem' }}
          >
            <option value="">-- Choose Program --</option>
            {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.65rem', fontWeight: 800 }}>4. PARTICIPANT</label>
          <select 
            className="form-input" 
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            required
            disabled={!programId}
            style={{ padding: '8px', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <option value="">-- Select --</option>
            {isIndividual ? (
              selecteCSWCgram?.assignments?.map((a: any) => (
                <option key={a.candidate.id} value={a.candidate.chestNumber}>
                  {a.candidate.chestNumber} - {a.candidate.name}
                </option>
              ))
            ) : (
              selectedEvent?.teams?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Entry Row */}
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 var(--spacing-sm) 0' }}>
        Assign a place (1st/2nd/3rd) and/or a grade (A/B). Points are calculated automatically from the event's point matrix and can be manually adjusted.
      </p>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1.2fr 1.5fr', 
        gap: 'var(--spacing-md)', 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        padding: '15px', 
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        alignItems: 'flex-end'
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 800 }}>PLACE</label>
          <select 
            className="form-input" 
            value={rank} 
            onChange={(e) => updateMarks(e.target.value, grade)}
            style={{ padding: '10px', height: '45px', backgroundColor: '#fff', color: '#1f2937', border: '2px solid #e5e7eb' }}
          >
            <option value="">-- No Rank --</option>
            <option value="1">1st Place</option>
            <option value="2">2nd Place</option>
            <option value="3">3rd Place</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 800 }}>GRADE</label>
          <select 
            className="form-input" 
            value={grade} 
            onChange={(e) => updateMarks(rank, e.target.value)}
            style={{ padding: '10px', height: '45px', backgroundColor: '#fff', color: '#1f2937', border: '2px solid #e5e7eb' }}
          >
            <option value="">-- No Grade --</option>
            <option value="A">A Grade</option>
            <option value="B">B Grade</option>
            <option value="C">C Grade</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 900 }}>TOTAL MARKS</label>
          <input 
            type="number" 
            step="0.01"
            className="form-input" 
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            placeholder="0.00"
            required
            style={{ 
              padding: '10px', 
              height: '45px', 
              fontSize: '1.2rem', 
              backgroundColor: '#fff', 
              color: '#1f2937', 
              border: '3px solid var(--primary)', 
              fontWeight: 800,
              textAlign: 'center'
            }}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ height: '45px', width: '100%', fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase' }} 
          disabled={loading}
        >
          {loading ? "Recording..." : "🚀 Submit Result"}
        </button>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-xl)', opacity: 0.7 }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
          💡 <strong>Tip:</strong> Rank + Grade points are combined automatically (e.g. 1st + Grade A = 10pts).
        </p>
      </div>
    </form>
  );
}
