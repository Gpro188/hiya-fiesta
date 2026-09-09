"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function CandidateFilter({ 
  teams, 
  categories, 
  zones = [],
  currentTeamId, 
  currentCategoryId,
  currentZoneId,
  showTeamFilter,
  showZoneFilter = false,
}: { 
  teams: any[], 
  categories: any[], 
  zones?: any[],
  currentTeamId?: string, 
  currentCategoryId?: string,
  currentZoneId?: string,
  showTeamFilter: boolean,
  showZoneFilter?: boolean,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // If zone changed, clear team filter
    if (key === "zoneId") {
      params.delete("teamId");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
      {showZoneFilter && zones.length > 0 && (
        <select 
          className="form-input" 
          value={currentZoneId || ""} 
          onChange={(e) => handleFilterChange('zoneId', e.target.value)}
          style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '150px', borderColor: '#3b82f6', fontWeight: 600 }}
        >
          <option value="">🌐 All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.code})</option>)}
        </select>
      )}

      {showTeamFilter && (
        <select 
          className="form-input" 
          value={currentTeamId || ""} 
          onChange={(e) => handleFilterChange('teamId', e.target.value)}
          style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '150px' }}
        >
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}

      <select 
        className="form-input" 
        value={currentCategoryId || ""} 
        onChange={(e) => handleFilterChange('categoryId', e.target.value)}
        style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: '150px' }}
      >
        <option value="">All Categories</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {(currentTeamId || currentCategoryId || currentZoneId) && (
        <button 
          onClick={() => router.push(pathname)}
          className="btn btn-secondary" 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--error)' }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

