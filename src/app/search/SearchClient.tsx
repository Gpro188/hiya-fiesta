"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchClient({ 
  initialQuery, 
  initialType,
  events,
  categories,
  initialEventId,
  activeEventName,
  initialCategoryId,
  initialStageType,
  initialSortBy
}: { 
  initialQuery: string, 
  initialType: string,
  events: any[],
  categories: any[],
  initialEventId: string,
  activeEventName?: string,
  initialCategoryId: string,
  initialStageType: string,
  initialSortBy?: string
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType || "chestNumber");
  const [eventId, setEventId] = useState(initialEventId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [stageType, setStageType] = useState(initialStageType);
  const [sortBy, setSortBy] = useState(initialSortBy || "code");

  const executeSearch = (paramsToApply?: {
    newQuery?: string;
    newType?: string;
    newEventId?: string;
    newCategory?: string;
    newStage?: string;
    newSort?: string;
  }) => {
    const qVal = paramsToApply?.newQuery !== undefined ? paramsToApply.newQuery : query;
    const typeVal = paramsToApply?.newType !== undefined ? paramsToApply.newType : type;
    const eventVal = paramsToApply?.newEventId !== undefined ? paramsToApply.newEventId : eventId;
    const catVal = paramsToApply?.newCategory !== undefined ? paramsToApply.newCategory : categoryId;
    const stageVal = paramsToApply?.newStage !== undefined ? paramsToApply.newStage : stageType;
    const sortVal = paramsToApply?.newSort !== undefined ? paramsToApply.newSort : sortBy;

    const params = new URLSearchParams();
    if (qVal.trim()) params.append('q', qVal.trim());
    params.append('type', typeVal);
    if (eventVal) params.append('eventId', eventVal);
    if (catVal && catVal !== "ALL") params.append('categoryId', catVal);
    if (stageVal) params.append('stageType', stageVal);
    if (sortVal) params.append('sortBy', sortVal);

    router.push(`/search?${params.toString()}`);
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    executeSearch();
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #f2d9e6', boxShadow: '0 4px 20px -2px rgba(230, 0, 126, 0.06)' }}>
      {/* Active Zone Banner if inside a specific zone portal */}
      {initialEventId && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          padding: '10px 16px',
          backgroundColor: '#fff0f6',
          borderRadius: '10px',
          border: '1.5px solid #fbcfe8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🏛️</span>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#9d174d', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Zone Results</span>
              <strong style={{ fontSize: '1rem', color: '#831843' }}>{activeEventName || "Selected Zone"}</strong>
            </div>
          </div>
          <span style={{
            fontSize: '0.72rem',
            padding: '3px 10px',
            borderRadius: '9999px',
            backgroundColor: '#10b981',
            color: '#FFFFFF',
            fontWeight: 800,
            letterSpacing: '0.03em'
          }}>
            ZONE LOCKED
          </span>
        </div>
      )}

      <form onSubmit={handleSearch}>
        {/* Main Search Input Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr auto', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
          
          {/* Search By: Chest Number or Program Code */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1420' }}>Search By</label>
            <select 
              className="form-input" 
              value={type}
              onChange={(e) => {
                const newType = e.target.value;
                setType(newType);
              }}
              style={{ fontWeight: 600, borderRadius: '10px', padding: '10px 12px' }}
            >
              <option value="chestNumber">👤 Chest Number</option>
              <option value="programCode">📋 Program Code</option>
            </select>
          </div>

          {/* Search Term Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1420' }}>
              {type === 'chestNumber' ? 'Enter Chest Number' : 'Enter Program Code'}
            </label>
            <input 
              type="text" 
              className="form-input" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={type === 'chestNumber' ? 'Type Chest Number (e.g. 651, 698)...' : 'Type Program Code (e.g. 1, 10, 23, 40)...'}
              style={{ borderRadius: '10px', padding: '10px 14px', fontSize: '0.95rem' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                height: '42px', 
                padding: '0 24px', 
                borderRadius: '10px', 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #e6007e, #a3005c)',
                boxShadow: '0 4px 12px rgba(230, 0, 126, 0.25)' 
              }}
            >
              🔍 Search
            </button>
          </div>
        </div>

        {/* Filter Controls Row: Category, Stage, Result Order (and Event only if not locked in zone) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: initialEventId ? 'repeat(auto-fit, minmax(170px, 1fr))' : 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '12px', 
          padding: '14px 16px', 
          backgroundColor: '#faf5f8', 
          borderRadius: '12px', 
          border: '1px solid #f5e1ed' 
        }}>
          {/* Show Select Event ONLY if NOT in a specific zone */}
          {!initialEventId && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Select Zone</label>
              <select 
                className="form-input" 
                value={eventId}
                onChange={(e) => {
                  const newEv = e.target.value;
                  setEventId(newEv);
                  executeSearch({ newEventId: newEv });
                }}
                style={{ fontSize: '0.85rem', padding: '8px 10px', borderRadius: '8px' }}
              >
                <option value="">All Zones</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
          )}

          {/* Category Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Category</label>
            <select 
              className="form-input" 
              value={categoryId}
              onChange={(e) => {
                const newCat = e.target.value;
                setCategoryId(newCat);
                executeSearch({ newCategory: newCat });
              }}
              style={{ fontSize: '0.85rem', padding: '8px 10px', borderRadius: '8px' }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>

          {/* Stage Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Stage</label>
            <select 
              className="form-input" 
              value={stageType}
              onChange={(e) => {
                const newStage = e.target.value;
                setStageType(newStage);
                executeSearch({ newStage });
              }}
              style={{ fontSize: '0.85rem', padding: '8px 10px', borderRadius: '8px' }}
            >
              <option value="">All Stages</option>
              <option value="ON_STAGE">🎭 ON-STAGE</option>
              <option value="OFF_STAGE">🎨 OFF-STAGE</option>
            </select>
          </div>

          {/* Result Order Type */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Result Order Type</label>
            <select 
              className="form-input" 
              value={sortBy}
              onChange={(e) => {
                const newSort = e.target.value;
                setSortBy(newSort);
                executeSearch({ newSort });
              }}
              style={{ fontSize: '0.85rem', padding: '8px 10px', borderRadius: '8px' }}
            >
              <option value="code">🔢 Program Code (#1, #2, #3...)</option>
              <option value="recent">🕒 Recently Published</option>
              <option value="rank">🏆 Top Ranks / Performance</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Link */}
        {(query || (categoryId && categoryId !== "ALL") || stageType || (sortBy && sortBy !== "code")) && (
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={() => {
                setQuery("");
                setCategoryId("");
                setStageType("");
                setSortBy("code");
                const p = new URLSearchParams();
                p.append('type', 'programCode');
                if (eventId) p.append('eventId', eventId);
                router.push(`/search?${p.toString()}`);
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#e11d48', 
                cursor: 'pointer', 
                fontSize: '0.8rem', 
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              ✕ Reset All Filters
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
