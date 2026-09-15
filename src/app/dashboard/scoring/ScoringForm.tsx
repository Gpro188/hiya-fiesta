"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { batchSubmitProgramMarks, assignJudgesToVenueAction } from "./actions";
import { isInstitutionProgram } from "@/lib/programUtils";

interface ScoringEntry {
  participantId: string;
  candidateId?: string;
  teamId?: string;
  name: string;
  chestNumber?: string;
  magazineCode?: string;
  teamName?: string;
  marks: string;
  rank: string;
  grade: string;
  points: number;
}

export default function ScoringForm({ 
  events, 
  availableJudges = [],
  userRole = "SUPER_ADMIN",
  userVenue = null
}: { 
  events: any[];
  availableJudges?: any[];
  userRole?: string;
  userVenue?: string | null;
}) {
  const isStageJury = userRole === "JUDGE" || Boolean(userVenue);
  const [eventId, setEventId] = useState(events[0]?.id || "");
  const [selectedVenue, setSelectedVenue] = useState<string>(userVenue || "");
  const [categoryId, setCategoryId] = useState("");
  const [programId, setProgramId] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [evaluator1, setEvaluator1] = useState("");
  const [evaluator2, setEvaluator2] = useState("");
  const [assignToVenue, setAssignToVenue] = useState(true);
  const [assigningVenueJuries, setAssigningVenueJuries] = useState(false);
  const [venueAssignMessage, setVenueAssignMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<ScoringEntry[]>([]);
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  useEffect(() => {
    if (userVenue) {
      setSelectedVenue(userVenue);
    } else if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cswc_scoring_venue");
      if (saved) setSelectedVenue(saved);
    }
  }, [userVenue]);

  useEffect(() => {
    if (events.length > 0) {
      setEventId(events[0].id);
      setCategoryId("");
      setProgramId("");
      setEntries([]);
      setEvaluator1("");
      setEvaluator2("");
    }
  }, [events]);

  const searchParams = useSearchParams();
  const urlProgramId = searchParams.get('programId');
  const router = useRouter();
  const pathname = usePathname();

  const selectedEvent = events.find(e => e.id === eventId);
  const allPrograms = selectedEvent?.programs || [];

  // Extract all unique venues
  const allVenues = Array.from(
    new Set(allPrograms.map((p: any) => p.venue || "Main Stage").filter(Boolean))
  ).sort() as string[];

  // Filter programs by selected venue
  const venuePrograms = selectedVenue
    ? allPrograms.filter((p: any) => (p.venue || "Main Stage") === selectedVenue)
    : allPrograms;

  // Chronologically sort programs for this venue
  const sortedVenuePrograms = [...venuePrograms].sort((a: any, b: any) => {
    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.programCode || "").localeCompare(b.programCode || "");
  });

  // Auto-populate based on URL programId
  useEffect(() => {
    if (urlProgramId && allPrograms.length > 0) {
      const p = allPrograms.find((p: any) => p.id === urlProgramId);
      if (p) {
        if (p.venue) setSelectedVenue(p.venue);
        setCategoryId(p.categoryId || "general-cat");
        setProgramId(p.id);
        
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('programId');
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
      }
    }
  }, [urlProgramId, allPrograms, router, pathname, searchParams]);

  // Extract unique categories from sorted venue programs
  const categoryMap = new Map();
  sortedVenuePrograms.forEach((p: any) => {
    if (p.category) {
      categoryMap.set(p.category.id, p.category.name);
    } else if (p.type === 'GENERAL') {
      categoryMap.set("general-cat", "GENERAL");
    }
  });
  const categories = Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));

  // Filtered programs for selected category in venue (or all in venue if category not selected)
  const programs = sortedVenuePrograms.filter((p: any) => {
    if (!categoryId) return true;
    if (categoryId === "general-cat") return !p.category && p.type === 'GENERAL';
    return p.category?.id === categoryId;
  });

  // Further filter by search term (searches programCode number or name across category or whole venue)
  const searchedPrograms = programs.filter((p: any) => {
    if (!programSearch.trim()) return true;
    const q = programSearch.trim().toLowerCase();
    const code = (p.programCode || "").toString().toLowerCase();
    const name = (p.name || "").toLowerCase();
    const cat = (p.category?.name || "").toLowerCase();
    return code.includes(q) || name.includes(q) || cat.includes(q);
  });

  const selecteCSWCgram = allPrograms.find((p: any) => p.id === programId);
  const isIndividual = selecteCSWCgram?.type === "INDIVIDUAL" && !isInstitutionProgram(selecteCSWCgram);

  // When selected program changes, build list of all candidates / teams with existing scores
  useEffect(() => {
    if (!selecteCSWCgram) {
      setEntries([]);
      setEvaluator1("");
      setEvaluator2("");
      return;
    }

    // Pre-select program judges if assigned
    if (selecteCSWCgram.judges && selecteCSWCgram.judges.length >= 2) {
      setEvaluator1(selecteCSWCgram.judges[0]?.username || "");
      setEvaluator2(selecteCSWCgram.judges[1]?.username || "");
    } else if (selecteCSWCgram.judges && selecteCSWCgram.judges.length === 1) {
      setEvaluator1(selecteCSWCgram.judges[0]?.username || "");
      setEvaluator2("");
    } else {
      setEvaluator1("");
      setEvaluator2("");
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
          magazineCode: t.magazineCode,
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
            if (numMarks > 100) {
              if (numMarks >= 160) current.grade = "A";
              else if (numMarks >= 120) current.grade = "B";
              else if (numMarks >= 80) current.grade = "C";
              else current.grade = "";
            } else {
              if (numMarks >= 80) current.grade = "A";
              else if (numMarks >= 60) current.grade = "B";
              else if (numMarks >= 40) current.grade = "C";
              else current.grade = "";
            }
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

    const isJudge = userRole === "JUDGE";
    const currentVenue = selecteCSWCgram?.venue || selectedVenue;
    const result = await batchSubmitProgramMarks({
      eventId,
      programId,
      venue: currentVenue,
      assignToVenue,
      publishImmediately: isJudge ? false : publishImmediately,
      evaluator1,
      evaluator2,
      entries: validEntries
    });

    if (result.success) {
      const pubNotice = isJudge 
        ? "(Submitted as PENDING for Zonal Admin physical verification)" 
        : publishImmediately 
        ? "(Published to Live Standings)" 
        : "(Saved as PENDING for verification)";
      setStatus({ 
        type: 'success', 
        message: `Saved marks for ${validEntries.length} participants successfully! ${pubNotice}` 
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

      {/* Assigned Venue Banner for Stage Juries */}
      {userVenue && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1.5px solid #bfdbfe',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>🏛️</span>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Assigned Venue / Stage Jury Portal
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a' }}>
                {userVenue}
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '6px', fontWeight: 800 }}>
            🟢 STAGE ACTIVE
          </span>
        </div>
      )}

      {/* Program Selector Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
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
              setEvaluator1("");
              setEvaluator2("");
            }}
            required
            style={{ padding: '9px 12px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#332938' }}>2. VENUE / STAGE</label>
          <select 
            className="form-input" 
            value={selectedVenue}
            disabled={Boolean(userVenue)}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedVenue(v);
              if (typeof window !== "undefined") {
                localStorage.setItem("cswc_scoring_venue", v);
              }
              setProgramId("");
              setEntries([]);
            }}
            style={{ 
              padding: '9px 12px', 
              fontSize: '0.9rem', 
              fontWeight: 700,
              backgroundColor: userVenue ? '#f8fafc' : '#fff',
              color: userVenue ? '#1e3a8a' : '#111827'
            }}
          >
            {userVenue ? (
              <option value={userVenue}>📍 {userVenue} (Assigned)</option>
            ) : (
              <>
                <option value="">-- All Stages / Venues --</option>
                {allVenues.map(v => (
                  <option key={v} value={v}>
                    {v} ({allPrograms.filter((p: any) => (p.venue || "Main Stage") === v).length} Programs)
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#332938' }}>3. CATEGORY (OPTIONAL)</label>
          <select 
            className="form-input" 
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setProgramId("");
              setEntries([]);
              setEvaluator1("");
              setEvaluator2("");
            }}
            style={{ padding: '9px 12px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <option value="">-- All Categories in Venue --</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary, #e6007e)', marginBottom: 0 }}>
              4. COMPETITION PROGRAM
            </label>
            {programSearch && (
              <button
                type="button"
                onClick={() => setProgramSearch("")}
                style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                ✕ Clear search
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <input
              type="text"
              placeholder="🔍 Search Program # / Code or Name..."
              value={programSearch}
              onChange={(e) => {
                const val = e.target.value;
                setProgramSearch(val);
                // If exact code match found, auto-select it!
                if (val.trim()) {
                  const exactMatch = allPrograms.find((p: any) => 
                    (p.programCode && p.programCode.trim().toLowerCase() === val.trim().toLowerCase())
                  );
                  if (exactMatch) {
                    setProgramId(exactMatch.id);
                    if (exactMatch.venue) setSelectedVenue(exactMatch.venue);
                    if (exactMatch.categoryId) setCategoryId(exactMatch.categoryId);
                  }
                }
              }}
              className="form-input"
              style={{
                padding: '6px 10px',
                fontSize: '0.8rem',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                fontWeight: 600
              }}
            />
          </div>

          <select 
            className="form-input" 
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            required
            style={{ 
              padding: '9px 12px', 
              fontSize: '0.9rem', 
              fontWeight: 700, 
              border: programId ? '2px solid var(--primary)' : '1px solid #d1d5db' 
            }}
          >
            <option value="">-- Select Program ({searchedPrograms.length} Available) --</option>
            {searchedPrograms.map((p: any) => {
              const timeStr = p.startTime ? new Date(p.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <option key={p.id} value={p.id}>
                  {timeStr ? `${timeStr} • ` : ''}{p.programCode ? `[#${p.programCode}] ` : ''}{p.name} ({p.category?.name || 'General'}) [{p.stageType === 'OFF_STAGE' ? 'OFF' : 'ON'}]
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Evaluating Juries Consensus Banner */}
      {selecteCSWCgram && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          border: '1.5px solid #cbd5e1',
          padding: '16px 20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚖️</span>
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Venue Juries & Consensus Valuation</strong>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Stage / Venue: <strong>{selecteCSWCgram.venue || selectedVenue || "Main Stage"}</strong> • Select which <strong>2 Juries</strong> evaluated this session
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.74rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
              Venue Juries Consensus Mode
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af' }}>
                👤 EVALUATOR 1 (JURY 1)
              </label>
              <select
                className="form-input"
                value={evaluator1}
                onChange={(e) => setEvaluator1(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.88rem', fontWeight: 600, border: evaluator1 ? '2px solid #3b82f6' : '1px solid #cbd5e1' }}
              >
                <option value="">-- Choose Evaluator 1 --</option>
                {selecteCSWCgram.judges && selecteCSWCgram.judges.length > 0 && (
                  <optgroup label={`🏛️ Current Program / Venue Juries`}>
                    {selecteCSWCgram.judges.map((j: any) => (
                      <option key={`prog_j1_${j.id}`} value={j.username}>
                        ⭐ Assigned Venue Jury: {j.username}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📋 All Available Fest Juries">
                  {availableJudges.filter((j: any) => !selecteCSWCgram.judges?.some((pj: any) => pj.id === j.id)).map((j: any) => (
                    <option key={`all_j1_${j.id}`} value={j.username}>
                      {j.place ? `[${j.place}] ` : ''}{j.username} {j.phone && j.phone !== "ACTIVE" ? `(${j.phone})` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9d174d' }}>
                👤 EVALUATOR 2 (JURY 2)
              </label>
              <select
                className="form-input"
                value={evaluator2}
                onChange={(e) => setEvaluator2(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.88rem', fontWeight: 600, border: evaluator2 ? '2px solid #ec4899' : '1px solid #cbd5e1' }}
              >
                <option value="">-- Choose Evaluator 2 --</option>
                {selecteCSWCgram.judges && selecteCSWCgram.judges.length > 0 && (
                  <optgroup label={`🏛️ Current Program / Venue Juries`}>
                    {selecteCSWCgram.judges.map((j: any) => (
                      <option key={`prog_j2_${j.id}`} value={j.username}>
                        ⭐ Assigned Venue Jury: {j.username}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📋 All Available Fest Juries">
                  {availableJudges.filter((j: any) => !selecteCSWCgram.judges?.some((pj: any) => pj.id === j.id)).map((j: any) => (
                    <option key={`all_j2_${j.id}`} value={j.username}>
                      {j.place ? `[${j.place}] ` : ''}{j.username} {j.phone && j.phone !== "ACTIVE" ? `(${j.phone})` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Option to assign selected juries to Venue */}
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 700, color: '#1e3a8a' }}>
              <input
                type="checkbox"
                checked={assignToVenue}
                onChange={(e) => setAssignToVenue(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#2563eb' }}
              />
              <span>
                🏛️ Assign selected juries to Venue &quot;{selecteCSWCgram.venue || selectedVenue || "Main Stage"}&quot; (Applies when saving result)
              </span>
            </label>

            {(evaluator1 || evaluator2) && (
              <button
                type="button"
                disabled={assigningVenueJuries}
                onClick={async () => {
                  setAssigningVenueJuries(true);
                  setVenueAssignMessage(null);
                  const currentV = selecteCSWCgram.venue || selectedVenue || "Main Stage";
                  const res = await assignJudgesToVenueAction(eventId, currentV, [evaluator1, evaluator2].filter(Boolean));
                  if (res.success) {
                    setVenueAssignMessage(`✅ Successfully assigned to all ${res.count} programs at ${currentV}!`);
                    setTimeout(() => setVenueAssignMessage(null), 4500);
                  } else {
                    setVenueAssignMessage(`❌ ${res.error}`);
                  }
                  setAssigningVenueJuries(false);
                }}
                className="btn"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #3b82f6',
                  color: '#1d4ed8',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {assigningVenueJuries ? "Assigning..." : "📌 Assign Juries to Venue Now"}
              </button>
            )}
          </div>

          {venueAssignMessage && (
            <div style={{ marginTop: '8px', fontSize: '0.82rem', fontWeight: 700, color: venueAssignMessage.startsWith('✅') ? '#15803d' : '#b91c1c' }}>
              {venueAssignMessage}
            </div>
          )}

          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '0.74rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span>
            <span>
              <strong>Consensus Rule:</strong> Both evaluators score on their individual physical sheets, then jointly discuss and calculate consolidated marks on the physical <strong>Tabulation Sheet</strong>. The agreed final marks are entered here.
            </span>
          </div>
        </div>
      )}

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
              <h3 style={{ margin: '0 0 6px 0', color: '#1a1420', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{selecteCSWCgram.name}</span>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.03em',
                  backgroundColor: selecteCSWCgram.stageType === "OFF_STAGE" ? 'rgba(14, 165, 233, 0.16)' : 'rgba(236, 72, 153, 0.16)',
                  color: selecteCSWCgram.stageType === "OFF_STAGE" ? '#0284c7' : '#db2777',
                  border: `1.5px solid ${selecteCSWCgram.stageType === "OFF_STAGE" ? '#0284c7' : '#db2777'}`
                }}>
                  {selecteCSWCgram.stageType === "OFF_STAGE" ? "🎨 OFF STAGE" : "🎭 ON STAGE"}
                </span>
                {isInstitutionProgram(selecteCSWCgram) && (
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(168, 85, 247, 0.16)',
                    color: '#9333ea',
                    border: '1.5px solid #9333ea'
                  }}>
                    🏛️ INSTITUTION ENTRY
                  </span>
                )}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#7a7480' }}>
                Category: <strong>{selecteCSWCgram.category?.name || 'General'}</strong> • Type: <strong>{isInstitutionProgram(selecteCSWCgram) ? 'INSTITUTION' : selecteCSWCgram.type}</strong> • Entries: <strong>{entries.length}</strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {userRole === "JUDGE" ? (
                <div style={{
                  fontSize: '0.78rem',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  🔒 Submission goes to <strong>Pending</strong> for Zonal Admin physical verification
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#332938', cursor: 'pointer' }} title="Keep unchecked to verify physical sheet before publishing">
                  <input 
                    type="checkbox" 
                    checked={publishImmediately} 
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                  />
                  <span>Publish Immediately <em style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>(Uncheck to verify physical sheet first)</em></span>
                </label>
              )}
              
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
                {loading ? "Saving All..." : userRole === "JUDGE" ? "📤 Submit Marks to Zonal Admin" : "💾 Save All Marks"}
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
                    {isIndividual ? (
                      <th style={{ padding: '12px 16px', width: '110px' }}>Chest No</th>
                    ) : isInstitutionProgram(selecteCSWCgram) ? (
                      <th style={{ padding: '12px 16px', width: '130px', color: '#9333ea' }}>Magazine Code</th>
                    ) : null}
                    <th style={{ padding: '12px 16px' }}>Participant / Candidate</th>
                    <th style={{ padding: '12px 16px' }}>Institution / Team</th>
                    <th style={{ padding: '12px 16px', width: '150px', color: '#b45309' }}>🥇 Place (Rank)</th>
                    <th style={{ padding: '12px 16px', width: '135px', color: '#be185d' }}>⭐ Grade</th>
                    {!isStageJury && (
                      <th style={{ padding: '12px 16px', width: '115px', textAlign: 'center' }}>Points</th>
                    )}
                    <th style={{ padding: '12px 16px', width: '135px' }}>Marks (Optional)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={entry.participantId} style={{ borderBottom: '1px solid #fbf0f5', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#9ca3af' }}>
                        {idx + 1}
                      </td>

                      {isIndividual ? (
                        <td style={{ padding: '12px 16px', fontWeight: 900, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--primary, #e6007e)' }}>
                          {entry.chestNumber || '-'}
                        </td>
                      ) : isInstitutionProgram(selecteCSWCgram) ? (
                        <td style={{ padding: '12px 16px', fontWeight: 900, fontFamily: "'IBM Plex Mono', monospace", color: '#9333ea' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                            {entry.magazineCode || '-'}
                          </span>
                        </td>
                      ) : null}

                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1a1420' }}>
                        {entry.name}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#4b5563', fontWeight: 600, fontSize: '0.82rem' }}>
                        {entry.teamName || '-'}
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
                            border: entry.rank ? '2px solid #F59E0B' : '1.5px solid #d1d5db',
                            fontWeight: 800,
                            fontSize: '0.88rem',
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
                            border: entry.grade ? '2px solid var(--primary)' : '1.5px solid #d1d5db',
                            fontWeight: 800,
                            fontSize: '0.88rem',
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

                      {/* Calculated Points - Hidden in Stage Jury Portal */}
                      {!isStageJury && (
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 900, fontSize: '1.05rem', color: entry.points > 0 ? 'var(--primary, #e6007e)' : '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {entry.points} <span style={{ fontSize: '0.72rem', color: '#7a7480', fontWeight: 600 }}>pts</span>
                        </td>
                      )}

                      {/* Optional Tabulation Total Marks Input */}
                      <td style={{ padding: '8px 16px' }}>
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="Optional"
                          value={entry.marks}
                          onChange={(e) => handleEntryChange(idx, 'marks', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#111827',
                            backgroundColor: entry.marks ? '#FEF2F6' : '#fff',
                            textAlign: 'center'
                          }}
                        />
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
                💡 <strong>Tip:</strong> Entering marks automatically calculates the grade (A ≥ 80, B ≥ 60).{!isStageJury && " Points update dynamically in real time."}
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

