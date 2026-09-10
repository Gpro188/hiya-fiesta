"use client";

import { useRouter } from "next/navigation";

export default function TeamSelector({
  availableTeams,
  currentTeamId,
}: {
  availableTeams: Array<{ id: string; name: string }>;
  currentTeamId: string | null;
}) {
  const router = useRouter();

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginRight: '10px' }}>Select Institution / Team:</label>
      <select 
        className="form-input" 
        style={{ maxWidth: '350px', display: 'inline-block' }}
        value={currentTeamId || ""}
        onChange={(e) => {
          router.push(`/dashboard/assignments?teamId=${e.target.value}`);
        }}
      >
        {availableTeams.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
