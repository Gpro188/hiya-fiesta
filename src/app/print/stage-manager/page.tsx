import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";
import { isProgramGeneral } from "@/lib/programUtils";

export const dynamic = 'force-dynamic';

export default async function PrintStageManagerPage(props: {
  searchParams: Promise<{
    eventId?: string;
    programId?: string;
    venue?: string;
    categoryId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const eventId = searchParams.eventId;
  const programId = searchParams.programId;
  const activeVenue = searchParams.venue || "ALL";
  const activeCategory = searchParams.categoryId || "ALL";
  const settings = await getSettings(eventId);

  let activeEv: any = null;
  // Strictly ON_STAGE programs only for Stage Manager
  let whereClause: any = {
    stageType: 'ON_STAGE'
  };

  if (eventId) {
    activeEv = await prisma.event.findUnique({
      where: { id: eventId },
      include: { zone: true },
    });
    if (activeEv?.parentId) {
      whereClause.OR = [
        { eventId: eventId },
        { eventId: activeEv.parentId }
      ];
    } else {
      whereClause.eventId = eventId;
    }
  }

  if (programId) {
    whereClause.id = programId;
  }
  if (activeCategory !== "ALL") {
    whereClause.categoryId = activeCategory;
  }

  // Fetch categories for filtering
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });

  const rawPrograms = await prisma.program.findMany({
    where: whereClause,
    orderBy: [
      { venue: 'asc' },
      { startTime: 'asc' },
      { programCode: 'asc' }
    ],
    include: { 
      category: true,
      assignments: {
        include: {
          candidate: {
            include: { 
              team: { include: { institution: true } },
              institution: { include: { zone: true } }
            }
          }
        },
        orderBy: { slotNumber: 'asc' }
      }
    }
  });

  const targetZoneId = activeEv?.zoneId || activeEv?.zone?.id;

  // Deduplicate programs across parent & child events by programCode (or name_category)
  const mergedMap = new Map<string, any>();
  for (const p of rawPrograms) {
    const key = p.programCode ? `code_${p.programCode}` : `name_${p.name}_${p.categoryId || ''}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...p, assignments: [...p.assignments] });
    } else {
      const existing = mergedMap.get(key);
      // Merge unique candidate assignments
      const existingIds = new Set(existing.assignments.map((a: any) => a.id));
      for (const a of p.assignments) {
        if (!existingIds.has(a.id)) {
          existing.assignments.push(a);
        }
      }
      // Inherit venue and timing (prefer zonal if set, otherwise parent)
      if (!existing.venue && p.venue) existing.venue = p.venue;
      if (!existing.startTime && p.startTime) existing.startTime = p.startTime;
      if (p.eventId === eventId && p.venue) existing.venue = p.venue;
      if (p.eventId === eventId && p.startTime) existing.startTime = p.startTime;
    }
  }

  let deduplicatedPrograms = Array.from(mergedMap.values());

  // Distinct venues for filter bar
  const allVenues = Array.from(
    new Set(deduplicatedPrograms.map(p => p.venue || "Main Stage").filter(Boolean))
  ).sort();

  // Filter by venue if selected
  if (activeVenue !== "ALL") {
    deduplicatedPrograms = deduplicatedPrograms.filter(p => (p.venue || "Main Stage") === activeVenue);
  }

  // Filter candidates per zone and eliminate empty duplicate pages
  const printablePrograms = deduplicatedPrograms.map(prog => {
    let candidateAssignments = prog.assignments.filter((a: any) => Boolean(a.candidate));

    if (targetZoneId) {
      candidateAssignments = candidateAssignments.filter((a: any) => {
        const c = a.candidate;
        const zId =
          c?.institution?.zoneId ||
          c?.institution?.zone?.id ||
          c?.team?.institution?.zoneId ||
          c?.team?.event?.zoneId;
        return zId === targetZoneId;
      });
    }

    // Sort by slotNumber or numeric chest number
    candidateAssignments.sort((a: any, b: any) => {
      if (a.slotNumber && b.slotNumber) return a.slotNumber - b.slotNumber;
      const cA = a.candidate;
      const cB = b.candidate;
      if (cA?.chestNumber && cB?.chestNumber) {
        const numA = parseInt(cA.chestNumber, 10);
        const numB = parseInt(cB.chestNumber, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return cA.chestNumber.localeCompare(cB.chestNumber);
      }
      return (a.slotNumber || 0) - (b.slotNumber || 0);
    });

    return {
      ...prog,
      filteredAssignments: candidateAssignments
    };
  }).filter(prog => {
    // If a specific single programId was requested, display it even if 0 candidates
    if (programId) return true;
    // When printing in bulk/stage list, omit programs with 0 candidates in this zone
    return prog.filteredAssignments.length > 0;
  });

  // Group by venue
  const venues: Record<string, any[]> = {};
  printablePrograms.forEach(p => {
    const v = p.venue || "Main Stage";
    if (!venues[v]) venues[v] = [];
    venues[v].push(p);
  });

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (searchParams.programId && overrides.programId !== "") {
      params.set("programId", overrides.programId ?? searchParams.programId);
    }
    const vn = overrides.venue !== undefined ? overrides.venue : activeVenue;
    if (vn && vn !== "ALL") params.set("venue", vn);

    const cat = overrides.categoryId !== undefined ? overrides.categoryId : activeCategory;
    if (cat && cat !== "ALL") params.set("categoryId", cat);

    return `/print/stage-manager?${params.toString()}`;
  };

  return (
    <div style={{ padding: '24px', backgroundColor: 'white', color: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ── Screen Controls / Filter Bar (Hidden on Print) ── */}
      <div 
        className="no-print" 
        style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          padding: '14px 20px', 
          backgroundColor: '#f8fafc', 
          border: '1.5px solid #e2e8f0', 
          borderRadius: '10px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#8E0033', textTransform: 'uppercase' }}>
              🎭 Stage Manager & Call Sheet
            </span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, marginLeft: '8px', border: '1px solid #bae6fd' }}>
              ON-STAGE ONLY
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}>
              ({printablePrograms.length} Programs)
            </span>
          </div>

          {/* Venue / Stage Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Stage:</label>
            <select
              id="sm-venue-select"
              defaultValue={buildUrl({ venue: activeVenue })}
              style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
            >
              <option value={buildUrl({ venue: "ALL" })}>All Stages ({allVenues.length})</option>
              {allVenues.map(v => (
                <option key={v} value={buildUrl({ venue: v })}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Category:</label>
            <select
              id="sm-category-select"
              defaultValue={buildUrl({ categoryId: activeCategory })}
              style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
            >
              <option value={buildUrl({ categoryId: "ALL" })}>All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={buildUrl({ categoryId: c.id })}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PrintButton label="🖨️ Print Call Sheets" />
        </div>

        <script dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('sm-venue-select')?.addEventListener('change', function(e) {
              if (e.target.value) window.location.href = e.target.value;
            });
            document.getElementById('sm-category-select')?.addEventListener('change', function(e) {
              if (e.target.value) window.location.href = e.target.value;
            });
          `
        }} />
      </div>

      {/* ── Content: Program Sheets ── */}
      {printablePrograms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e293b" }}>No On-Stage programs found for this selection</h2>
          <p style={{ fontSize: "0.9rem" }}>Please adjust your Stage or Category filters.</p>
        </div>
      ) : (
        Object.entries(venues).map(([venueName, venuePrograms]) => (
          <div key={venueName}>
            {venuePrograms.map((program) => {
              const isGeneral = isProgramGeneral(program);
              const candidateAssignments = program.filteredAssignments;

              type TeamGroup = {
                id: string;
                teamId: string;
                teamName: string;
                slotNumber?: number;
                candidates: Array<{
                  id: string;
                  name: string;
                  chestNumber?: string;
                  uid?: string;
                  photo?: string;
                  photoUrl?: string;
                }>;
              };

              let teamGroups: TeamGroup[] = [];
              if (isGeneral) {
                const teamMap = new Map<string, TeamGroup>();
                for (const a of candidateAssignments) {
                  const c = a.candidate;
                  const t = c.team;
                  const tId = t?.id || c.teamId || c.institutionId || c.name;
                  const tName = t?.name || c.institution?.name || c.team?.institution?.name || "Team";
                  if (!teamMap.has(tId)) {
                    teamMap.set(tId, {
                      id: a.id,
                      teamId: tId,
                      teamName: tName,
                      slotNumber: a.slotNumber,
                      candidates: [c]
                    });
                  } else {
                    teamMap.get(tId)!.candidates.push(c);
                  }
                }
                teamGroups = Array.from(teamMap.values());
              }

              return (
                <div 
                  key={program.id} 
                  style={{ 
                    marginBottom: '40px', 
                    pageBreakAfter: 'always',
                    breakAfter: 'page',
                    paddingBottom: '20px'
                  }}
                >
                  {/* Header repeated for every program */}
                  <div style={{ textAlign: 'center', marginBottom: '14px', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', color: '#8E0033', letterSpacing: '0.5px' }}>
                      {settings.festName}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginTop: '2px' }}>
                      STAGE MANAGER & CALL SHEET
                    </div>
                    {activeEv && (
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
                        {activeEv.name} {activeEv.zone ? `(${activeEv.zone.name})` : ''}
                      </div>
                    )}
                    <div style={{ display: 'inline-block', backgroundColor: '#0f172a', color: '#ffffff', padding: '4px 14px', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 800, marginTop: '6px' }}>
                      STAGE: {venueName}
                    </div>
                  </div>

                  <div>
                    <div style={{ border: '1.5px solid #0f172a', backgroundColor: '#f8fafc', borderRadius: '4px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ backgroundColor: '#8E0033', color: '#fff', padding: '2px 8px', borderRadius: '3px', fontWeight: 900, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                            CODE: {program.programCode || 'P'}
                          </span>
                          <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                            {program.name}
                          </h4>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                          Category: <strong style={{ color: '#0f172a' }}>{program.category?.name || 'General'}</strong> • Stage: <strong>{program.stageType}</strong> • Type: <strong>{program.type}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', borderLeft: '1px solid #cbd5e1', paddingLeft: '14px' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                          Stage: {program.venue || 'Main Stage'}
                        </div>
                        {program.startTime && (
                          <div style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 800, fontFamily: 'monospace' }}>
                            🕒 {new Date(program.startTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        )}
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Duration: <strong>{program.duration} min</strong></div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {isGeneral ? (
                            <>Total Teams: <strong>{teamGroups.length}</strong> (Candidates: {candidateAssignments.length})</>
                          ) : (
                            <>Total Candidates: <strong>{candidateAssignments.length}</strong></>
                          )}
                        </div>
                      </div>
                    </div>

                    {(isGeneral ? teamGroups.length === 0 : candidateAssignments.length === 0) ? (
                      <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '30px', border: '1px dashed #cbd5e1', borderRadius: '4px' }}>
                        {isGeneral ? 'No teams assigned to this general program yet.' : 'No candidates assigned yet.'}
                      </div>
                    ) : isGeneral ? (
                      /* GENERAL PROGRAM: 1 ENTRY PER TEAM WITH PARTICIPANT PHOTOS FOR CODE LETTER VERIFICATION */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {teamGroups.map((group, index) => {
                          return (
                            <div 
                              key={group.id} 
                              style={{ 
                                border: '1.5px solid #0f172a', 
                                borderRadius: '4px', 
                                padding: '10px 14px', 
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                                pageBreakInside: 'avoid',
                                breakInside: 'avoid',
                              }}
                            >
                              {/* Team Control Header Row */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                  {/* Slot Number */}
                                  <div style={{ textAlign: 'center', minWidth: '40px' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Slot</div>
                                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0f172a' }}>{group.slotNumber || index + 1}</div>
                                  </div>

                                  {/* Code Letter Entry Box for this Team */}
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#8E0033', fontWeight: 800, textTransform: 'uppercase' }}>Code Letter</div>
                                    <div style={{ width: '58px', height: '34px', border: '2px dashed #0f172a', borderRadius: '4px', backgroundColor: '#ffffff', margin: '0 auto' }}></div>
                                  </div>

                                  {/* Team Name */}
                                  <div>
                                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Team / Institution</div>
                                    <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>🏛️ {group.teamName}</div>
                                  </div>
                                </div>

                                {/* Present Checkbox & Remarks */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a' }}>Present:</span>
                                    <div style={{ width: '24px', height: '24px', border: '1.5px solid #0f172a', borderRadius: '3px', backgroundColor: '#ffffff' }}></div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Remarks:</span>
                                    <div style={{ width: '130px', borderBottom: '1px solid #94a3b8', height: '20px' }}></div>
                                  </div>
                                </div>
                              </div>

                              {/* Team Participants List with Photo for Verification */}
                              <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                  Team Participants for Code Letter Verification ({group.candidates.length}):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                  {group.candidates.map((c) => {
                                    const photoSrc = c.photo || c.photoUrl;
                                    return (
                                      <div 
                                        key={c.id} 
                                        style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '8px', 
                                          border: '1px solid #cbd5e1', 
                                          borderRadius: '4px', 
                                          padding: '5px 8px', 
                                          backgroundColor: '#ffffff',
                                          minWidth: '180px'
                                        }}
                                      >
                                        {photoSrc ? (
                                          <img 
                                            src={photoSrc} 
                                            alt={c.name} 
                                            style={{ width: '38px', height: '46px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #cbd5e1', flexShrink: 0 }} 
                                          />
                                        ) : (
                                          <div style={{ width: '38px', height: '46px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', fontSize: '1.1rem', border: '1px dashed #cbd5e1', flexShrink: 0 }}>
                                            👤
                                          </div>
                                        )}
                                        <div>
                                          <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#8E0033', fontFamily: 'monospace' }}>
                                            #{c.chestNumber || '-'}
                                          </div>
                                          <div style={{ fontWeight: 800, fontSize: '0.80rem', color: '#0f172a', lineHeight: 1.2 }}>
                                            {c.name}
                                          </div>
                                          {c.uid && (
                                            <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                                              UID: {c.uid}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* INDIVIDUAL PROGRAM: 1 ROW PER CANDIDATE TABLE */
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1.5px solid #0f172a' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                            <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '45px', textAlign: 'center' }}>Slot</th>
                            <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '70px', textAlign: 'center' }}>Code</th>
                            <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '60px', textAlign: 'center' }}>Photo</th>
                            <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '90px', textAlign: 'center' }}>Chest No.</th>
                            <th style={{ border: '1px solid #334155', padding: '8px 8px' }}>Candidate Name</th>
                            <th style={{ border: '1px solid #334155', padding: '8px 8px' }}>Institution / Team</th>
                            <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '70px', textAlign: 'center' }}>Present</th>
                            <th style={{ border: '1px solid #334155', padding: '8px 6px', width: '90px', textAlign: 'center' }}>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidateAssignments.map((assignment: any, index: number) => {
                            const c = assignment.candidate;
                            const photoSrc = c.photo || c.photoUrl;
                            const instName = c.institution?.name || c.team?.institution?.name || c.team?.name || '-';

                            return (
                              <tr key={assignment.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', height: '48px' }}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 800, textAlign: 'center' }}>
                                  {assignment.slotNumber || index + 1}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>
                                  <div style={{ width: '32px', height: '32px', border: '1.5px dashed #94a3b8', margin: '0 auto', borderRadius: '3px' }}></div>
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px', textAlign: 'center' }}>
                                  {photoSrc ? (
                                    <img 
                                      src={photoSrc} 
                                      alt={c.name} 
                                      style={{ width: '36px', height: '42px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #cbd5e1', margin: '0 auto', display: 'block' }} 
                                    />
                                  ) : (
                                    <div style={{ width: '36px', height: '42px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', fontSize: '1rem', border: '1px dashed #cbd5e1', margin: '0 auto' }}>
                                      👤
                                    </div>
                                  )}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 900, fontSize: '0.95rem', color: '#8E0033', textAlign: 'center', fontFamily: 'monospace' }}>
                                  {c.chestNumber || '-'}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>
                                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{c.name}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>UID: {c.uid || '-'}</div>
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.78rem', color: '#334155' }}>
                                  {instName}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>
                                  <div style={{ width: '22px', height: '22px', border: '1.5px solid #475569', borderRadius: '3px', margin: '0 auto' }}></div>
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* Stage Manager Sign-off */}
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date & Stage Verified: _________________</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ borderBottom: '1.5px solid #0f172a', width: '180px', marginBottom: '4px', height: '24px' }}></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>Stage Manager Signature</div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          @page { margin: 10mm; size: A4 portrait; }
        }
      `}} />
    </div>
  );
}
