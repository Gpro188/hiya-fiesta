"use client";

import { useState } from "react";
import { deleteTeam } from "./actions";
import EditTeamModal from "./EditTeamModal";
import RegistrationAccessModal from "./RegistrationAccessModal";
import { formatInstitutionDisplay } from "@/lib/formatUtils";

type TeamType = {
  id: string;
  name: string;
  prefixCode: string;
  eventId?: string;
  event: { 
    id?: string;
    name: string;
    offStageRegistrationEnd?: string | Date | null;
    onStageRegistrationEnd?: string | Date | null;
    institutionRegistrationEndDate?: string | Date | null;
    registrationEnd?: string | Date | null;
    parent?: {
      offStageRegistrationEnd?: string | Date | null;
      onStageRegistrationEnd?: string | Date | null;
      institutionRegistrationEndDate?: string | Date | null;
      registrationEnd?: string | Date | null;
    } | null;
  };
  institution?: { id: string; name: string; code?: string | null; place?: string | null } | null;
  manager?: { username: string } | null;
  leaderName: string | null;
  leaderPhoto: string | null;
  flagColor: string | null;
  isAssignmentsConfirmed: boolean;
  isOnStageConfirmed?: boolean;
  offStageUnlocked?: boolean;
  onStageUnlocked?: boolean;
  registrationUnlocked?: boolean;
  offStageUnlockStart?: string | Date | null;
  offStageUnlockEnd?: string | Date | null;
  onStageUnlockStart?: string | Date | null;
  onStageUnlockEnd?: string | Date | null;
  magazineCode?: string | null;
  _count: { candidates: number };
  candidates?: {
    id: string;
    chestNumber?: string | null;
    _count: { programs: number };
    programs?: { program: { stageType: string } }[];
  }[];
};

export default function TeamList({ teams, role = "ADMIN", isZoneUnlockPermitted = true }: { teams: TeamType[], role?: string, isZoneUnlockPermitted?: boolean }) {
  const [editingTeam, setEditingTeam] = useState<TeamType | null>(null);
  const [accessModalTeam, setAccessModalTeam] = useState<TeamType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  if (teams.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No teams created yet.</div>;
  }

  const now = new Date();

  const filteredTeams = teams.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const { name: instName, place: instPlace } = formatInstitutionDisplay(t);
    return (
      instName.toLowerCase().includes(q) ||
      (instPlace && instPlace.toLowerCase().includes(q)) ||
      t.name.toLowerCase().includes(q) ||
      t.prefixCode.toLowerCase().includes(q) ||
      (t.institution?.place && t.institution.place.toLowerCase().includes(q)) ||
      (t.institution?.code && t.institution.code.toLowerCase().includes(q)) ||
      (t.manager?.username && t.manager.username.toLowerCase().includes(q)) ||
      (t.leaderName && t.leaderName.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Zone Admin Action Bar: Scheduling & Batch Control */}
      {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && teams.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '6px'
        }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> Registration Access & Time Schedule Control
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
              Open Off-Stage or On-Stage registration for any specific institution with custom Start & End times, or batch open On-Stage for all.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {(["ADMIN", "SUPER_ADMIN"].includes(role) || (role === "ZONE_ADMIN" && isZoneUnlockPermitted)) && (
              <button
                onClick={() => setAccessModalTeam(teams[0])}
                className="btn"
                style={{
                  padding: '0.45rem 1.15rem',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  backgroundColor: '#8E0033',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(142,0,51,0.2)'
                }}
              >
                <span>⏱️</span> Select Institution & Schedule Time
              </button>
            )}

            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to open On-Stage registration for all colleges in this zone? All confirmed Off-Stage registrations will remain strictly locked!")) {
                  return;
                }
                setBulkLoading(true);
                const { bulkUnlockOnStageForZone } = await import("./actions");
                const res = await bulkUnlockOnStageForZone(teams[0]?.eventId || teams[0]?.event?.id || "");
                if (res.success) {
                  alert(`✅ Successfully opened On-Stage registration for ${res.count} institutions! Off-Stage registrations remain strictly locked.`);
                  window.location.reload();
                } else {
                  alert(res.error || "Failed to bulk open On-Stage.");
                  setBulkLoading(false);
                }
              }}
              disabled={bulkLoading}
              className="btn"
              style={{
                padding: '0.45rem 1.1rem',
                fontSize: '0.84rem',
                fontWeight: 800,
                backgroundColor: '#db2777',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(219,39,119,0.2)'
              }}
            >
              {bulkLoading ? "Opening..." : "🎭 Open On-Stage for All Teams"}
            </button>
          </div>
        </div>
      )}

      {/* Team Search Bar */}
      <div style={{ marginBottom: '4px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search team / college by name, code, or place..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', borderRadius: '8px' }}
        />
      </div>

      {filteredTeams.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No teams found matching &quot;{searchQuery}&quot;.
        </div>
      ) : (
        filteredTeams.map((team) => {
          const totalPrograms = team.candidates?.reduce((sum, c) => sum + c._count.programs, 0) || 0;
          const { name: instName, place: instPlace } = formatInstitutionDisplay(team);

          const offDeadline =
            team.event?.offStageRegistrationEnd ||
            team.event?.parent?.offStageRegistrationEnd ||
            team.event?.institutionRegistrationEndDate ||
            team.event?.parent?.institutionRegistrationEndDate ||
            team.event?.registrationEnd ||
            team.event?.parent?.registrationEnd;

          const onDeadline =
            team.event?.onStageRegistrationEnd ||
            team.event?.parent?.onStageRegistrationEnd ||
            team.event?.institutionRegistrationEndDate ||
            team.event?.parent?.institutionRegistrationEndDate ||
            team.event?.registrationEnd ||
            team.event?.parent?.registrationEnd;

          const isOffDeadlinePassed = offDeadline ? now > new Date(offDeadline) : false;
          const isOnDeadlinePassed = onDeadline ? now > new Date(onDeadline) : false;

          const offCandidates = team.candidates?.filter(c => c.programs?.some(p => p.program?.stageType === 'OFF_STAGE')) || [];
          const offCandidatesWithoutChest = offCandidates.filter(c => !c.chestNumber);
          const hasOffStage = offCandidates.length > 0 || Boolean(team.magazineCode);
          const isOffStageChestLoaded = hasOffStage 
            ? (offCandidates.length > 0 ? offCandidatesWithoutChest.length === 0 : Boolean(team.magazineCode))
            : true;

          const onCandidates = team.candidates?.filter(c => c.programs?.some(p => p.program?.stageType === 'ON_STAGE')) || [];
          const onCandidatesWithoutChest = onCandidates.filter(c => !c.chestNumber);
          const hasOnStage = onCandidates.length > 0;
          const isOnStageChestLoaded = hasOnStage 
            ? (onCandidatesWithoutChest.length === 0 && Boolean(team.isOnStageConfirmed))
            : Boolean(team.isOnStageConfirmed);

          // 3. Timed Unlock Windows & Scheduled Overrides
          const isOffStageActiveSchedule = Boolean(
            (team.offStageUnlockStart || team.offStageUnlockEnd) &&
            (!team.offStageUnlockStart || now >= new Date(team.offStageUnlockStart)) &&
            (!team.offStageUnlockEnd || now <= new Date(team.offStageUnlockEnd))
          );
          const isOffStagePendingSchedule = Boolean(team.offStageUnlockStart && now < new Date(team.offStageUnlockStart));
          const isOffStageExpiredSchedule = Boolean(team.offStageUnlockEnd && now > new Date(team.offStageUnlockEnd));

          const isOnStageActiveSchedule = Boolean(
            (team.onStageUnlockStart || team.onStageUnlockEnd) &&
            (!team.onStageUnlockStart || now >= new Date(team.onStageUnlockStart)) &&
            (!team.onStageUnlockEnd || now <= new Date(team.onStageUnlockEnd))
          );
          const isOnStagePendingSchedule = Boolean(team.onStageUnlockStart && now < new Date(team.onStageUnlockStart));
          const isOnStageExpiredSchedule = Boolean(team.onStageUnlockEnd && now > new Date(team.onStageUnlockEnd));

          const isOffStageUnlocked = team.registrationUnlocked || isOffStageActiveSchedule || (team.offStageUnlocked && !isOffStageExpiredSchedule);
          const isOnStageUnlocked = team.registrationUnlocked || isOnStageActiveSchedule || (team.onStageUnlocked && !isOnStageExpiredSchedule);

          const isOffStageOpen = isOffStageUnlocked || (!isOffStageChestLoaded && !isOffDeadlinePassed);
          const isOnStageOpen = isOnStageUnlocked || (!isOnStageChestLoaded && !isOnDeadlinePassed);

          const needsOffStageConfirmation = hasOffStage && !isOffStageChestLoaded;
          const needsOnStageConfirmation = isOffStageChestLoaded && hasOnStage && !isOnStageChestLoaded;

          return (
          <div key={team.id} style={{ 
            padding: '16px 20px', 
            border: '1px solid #e2e8f0', 
            borderLeft: `5px solid ${team.flagColor || '#8E0033'}`,
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
            gap: 'var(--spacing-md)',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1, minWidth: '300px' }}>
              {team.leaderPhoto && (
                <img 
                  src={team.leaderPhoto} 
                  alt={team.leaderName || "Leader"} 
                  style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                />
              )}
              <div>
                <h4 style={{ color: '#0f172a', marginBottom: '2px', fontSize: '1.05rem', fontWeight: 800 }}>
                  {instName}{" "}
                  <span style={{ color: '#8E0033', fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', padding: '2px 8px', borderRadius: '4px' }}>
                    Prefix: {team.prefixCode}
                  </span>
                  {isOffStageChestLoaded && isOnStageChestLoaded && totalPrograms > 0 ? (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: '#059669', color: 'white', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 800 }}>ZONE CONFIRMED</span>
                  ) : (isOffStageActiveSchedule || isOnStageActiveSchedule) ? (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: '#10b981', color: 'white', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 800 }}>⏱️ TIMED UNLOCK ACTIVE</span>
                  ) : isOffDeadlinePassed && isOnDeadlinePassed && !team.offStageUnlocked && !team.onStageUnlocked ? (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: '#dc2626', color: 'white', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 800 }}>DEADLINE PASSED</span>
                  ) : team.isAssignmentsConfirmed ? (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: '#0284c7', color: 'white', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 800 }}>SUBMITTED (OPEN)</span>
                  ) : null}
                </h4>
                {instPlace && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📍</span> {instPlace}
                  </div>
                )}
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                Event: <strong style={{ color: '#1e293b' }}>{team.event.name}</strong> • Manager: <strong style={{ color: '#1e293b' }}>{team.manager?.username || 'None'}</strong>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '4px' }}>
                <strong style={{ color: '#0f172a' }}>{team._count.candidates}</strong> Registered Candidates • <strong style={{ color: '#0f172a' }}>{totalPrograms}</strong> Programs Assigned
              </div>
              {team.leaderName && (
                <div style={{ fontSize: '0.8rem', color: '#8E0033', fontWeight: 600, marginTop: '4px' }}>
                  Leader: {team.leaderName}
                </div>
              )}

              {/* Off-Stage and On-Stage Status Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px', alignItems: 'flex-start' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  fontWeight: 700,
                  backgroundColor: isOffStageActiveSchedule ? '#ecfdf5' : isOffStagePendingSchedule ? '#fffbeb' : team.offStageUnlocked ? '#ecfdf5' : isOffStageOpen ? '#f0fdf4' : '#fef2f2',
                  color: isOffStageActiveSchedule ? '#047857' : isOffStagePendingSchedule ? '#b45309' : team.offStageUnlocked ? '#047857' : isOffStageOpen ? '#15803d' : '#b91c1c',
                  border: `1px solid ${isOffStageActiveSchedule ? '#6ee7b7' : isOffStagePendingSchedule ? '#fde68a' : team.offStageUnlocked ? '#6ee7b7' : isOffStageOpen ? '#86efac' : '#fecaca'}`
                }}>
                  🎨 Off-Stage: {
                    isOffStageActiveSchedule 
                      ? `⏱️ Scheduled Open (until ${new Date(team.offStageUnlockEnd!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${new Date(team.offStageUnlockEnd!).toLocaleDateString([], { month: 'short', day: 'numeric' })})`
                      : isOffStagePendingSchedule
                      ? `⌛ Scheduled (starts ${new Date(team.offStageUnlockStart!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                      : isOffStageExpiredSchedule
                      ? '🔒 Schedule Expired (Closed)'
                      : team.offStageUnlocked 
                      ? '⚡ Zone Override (Open)' 
                      : isOffStageOpen 
                      ? '🟢 Open' 
                      : '🔒 Closed'
                  }
                </span>

                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  fontWeight: 700,
                  backgroundColor: isOnStageActiveSchedule ? '#ecfdf5' : isOnStagePendingSchedule ? '#fffbeb' : team.onStageUnlocked ? '#ecfdf5' : isOnStageOpen ? '#f0fdf4' : '#fef2f2',
                  color: isOnStageActiveSchedule ? '#047857' : isOnStagePendingSchedule ? '#b45309' : team.onStageUnlocked ? '#047857' : isOnStageOpen ? '#15803d' : '#b91c1c',
                  border: `1px solid ${isOnStageActiveSchedule ? '#6ee7b7' : isOnStagePendingSchedule ? '#fde68a' : team.onStageUnlocked ? '#6ee7b7' : isOnStageOpen ? '#86efac' : '#fecaca'}`
                }}>
                  🎭 On-Stage: {
                    isOnStageActiveSchedule 
                      ? `⏱️ Scheduled Open (until ${new Date(team.onStageUnlockEnd!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${new Date(team.onStageUnlockEnd!).toLocaleDateString([], { month: 'short', day: 'numeric' })})`
                      : isOnStagePendingSchedule
                      ? `⌛ Scheduled (starts ${new Date(team.onStageUnlockStart!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                      : isOnStageExpiredSchedule
                      ? '🔒 Schedule Expired (Closed)'
                      : team.onStageUnlocked 
                      ? '⚡ Zone Override (Open)' 
                      : isOnStageOpen 
                      ? '🟢 Open' 
                      : '🔒 Closed'
                  }
                </span>
              </div>

              {isOffStageChestLoaded && isOnStageChestLoaded && (totalPrograms > 0) ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 700, padding: '4px 10px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '4px' }}>
                    ✅ Registration Confirmed & Locked (Off & On-Stage Chest Nos Assigned)
                  </div>
                  {team.magazineCode && (
                    <div style={{ fontSize: '0.8rem', color: '#7e22ce', fontWeight: 800, padding: '4px 10px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '4px' }}>
                      📖 Magazine Code: <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{team.magazineCode}</span>
                    </div>
                  )}
                </div>
              ) : isOffStageChestLoaded ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700, padding: '4px 10px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px' }}>
                    🎨 Off-Stage Confirmed ({offCandidates.length - offCandidatesWithoutChest.length} / {offCandidates.length} Chest Nos)
                  </div>
                  {team.magazineCode && (
                    <div style={{ fontSize: '0.8rem', color: '#7e22ce', fontWeight: 800, padding: '4px 10px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '4px' }}>
                      📖 Magazine Code: <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{team.magazineCode}</span>
                    </div>
                  )}
                  {hasOnStage && (
                    <div style={{ fontSize: '0.8rem', color: '#db2777', fontWeight: 700, padding: '4px 10px', backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '4px' }}>
                      🎭 On-Stage Awaiting Confirmation
                    </div>
                  )}
                </div>
              ) : totalPrograms === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '8px', fontWeight: 700, padding: '4px 10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'inline-block', borderRadius: '4px' }}>
                  🔴 Registration Pending (No programs assigned)
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '8px', fontWeight: 700, padding: '4px 10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'inline-block', borderRadius: '4px' }}>
                  {team.isAssignmentsConfirmed ? "📥 College Submitted Off-Stage (Ready for Zone Chest Nos)" : "🟡 Off-Stage Pending Zone Confirmation"}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
              <a 
                href={`/print/assignments?teamId=${team.id}`} 
                target="_blank" 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', textDecoration: 'none', backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}
              >
                Review Assignments
              </a>
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && (
                <a 
                  href={`/print/off-stage-invigilation?teamId=${team.id}`} 
                  target="_blank" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', textDecoration: 'none', borderColor: '#fecdd3', backgroundColor: '#fff1f2', color: '#9f1239', fontWeight: 700, borderRadius: '6px' }}
                  title="Print Off-Stage Invigilation Sheet with candidate photos"
                >
                  📝 Off-Stage Sheet
                </a>
              )}
              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && needsOffStageConfirmation && (
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerText = "Confirming Off-Stage...";
                    const result = await import("./actions").then(m => m.confirmTeamRegistration(team.id, "OFF_STAGE"));
                    if (!result.success) {
                      alert(result.error);
                      btn.disabled = false;
                      btn.innerText = "🎨 Confirm Off-Stage & Load Chest Nos";
                    } else if (result.count === 0) {
                      alert("No new candidates to confirm.");
                      window.location.reload();
                    } else {
                      alert(`Successfully confirmed Off-Stage for ${result.count} candidates and assigned Magazine Code: ${result.magazineCode || 'Assigned'}.`);
                      window.location.reload();
                    }
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                  title="Confirm Off-Stage candidates and assign sequential chest numbers to Off-Stage participants"
                >
                  🎨 Confirm Off-Stage & Load Chest Nos
                </button>
              )}

              {["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role) && needsOnStageConfirmation && (
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerText = "Confirming On-Stage...";
                    const result = await import("./actions").then(m => m.confirmTeamRegistration(team.id, "ON_STAGE"));
                    if (!result.success) {
                      alert(result.error);
                      btn.disabled = false;
                      btn.innerText = "🎭 Confirm On-Stage & Load Chest Nos";
                    } else {
                      alert(`Successfully confirmed On-Stage registration! Existing Off-Stage chest numbers are fixed and preserved; newly added students received sequential numbers.`);
                      window.location.reload();
                    }
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', backgroundColor: '#db2777', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                  title="Confirm On-Stage candidates. Students already numbered in Off-Stage KEEP their exact chest number. Only newly added students receive new chest numbers."
                >
                  🎭 Confirm On-Stage & Load Chest Nos
                </button>
              )}

              {isOffStageChestLoaded && isOnStageChestLoaded && totalPrograms > 0 && (
                <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                  ✅ Fully Confirmed (Off & On-Stage)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Dedicated Stage Unlock / Access Control for Zone Admins & Admins */}
              {(["ADMIN", "SUPER_ADMIN"].includes(role) || (role === "ZONE_ADMIN" && isZoneUnlockPermitted)) && (
                <button 
                  onClick={() => setAccessModalTeam(team)}
                  className="btn" 
                  style={{ 
                    padding: '0.35rem 0.95rem', 
                    fontSize: '0.82rem', 
                    backgroundColor: (isOffStageActiveSchedule || isOnStageActiveSchedule) ? '#059669' : (team.offStageUnlocked || team.onStageUnlocked || team.registrationUnlocked) ? '#047857' : '#8E0033', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '6px',
                    fontWeight: 700,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Select stage (Off/On) and schedule start & end time for this institution"
                >
                  {(isOffStageActiveSchedule || isOnStageActiveSchedule) 
                    ? "⏱️ Timed Unlock Active" 
                    : (team.offStageUnlocked || team.onStageUnlocked || team.registrationUnlocked) 
                    ? "🔓 Stage Access (Unlocked)" 
                    : "⚡ Schedule / Unlock"}
                </button>
              )}

              {/* Edit and Delete are only available for State Super Admins / Admins, NOT Zone Admins */}
              {["ADMIN", "SUPER_ADMIN"].includes(role) && (
                <>
                  <button 
                    onClick={() => setEditingTeam(team)}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', borderRadius: '6px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this team and its manager?')) {
                        deleteTeam(team.id);
                      }
                    }}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', color: '#dc2626', borderColor: '#fca5a5', borderRadius: '6px' }}
                  >
                    Delete
                  </button>
                </>
              )}

              <a href={`/print/id-cards?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', color: '#047857', textDecoration: 'none', fontWeight: 700, borderRadius: '6px' }}>
                🪪 Chest Slips & ID Cards
              </a>
              <a href={`/print/institution-report?teamId=${team.id}`} target="_blank" className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', textDecoration: 'none', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}>
                📑 Candidates Report
              </a>
            </div>
          </div>
        </div>
      );
    }))}

      {editingTeam && (
        <EditTeamModal 
          team={editingTeam} 
          onClose={() => setEditingTeam(null)} 
        />
      )}

      {accessModalTeam && (
        <RegistrationAccessModal
          team={accessModalTeam as any}
          teams={teams as any}
          onClose={() => setAccessModalTeam(null)}
          onUpdated={() => {
            setAccessModalTeam(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
