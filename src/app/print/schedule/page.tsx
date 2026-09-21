import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";
import { formatTimeAmPm } from "@/lib/scheduleCalculator";

export const dynamic = 'force-dynamic';

export default async function PrintSchedulePage(props: {
  searchParams: Promise<{ eventId?: string; teamId?: string }>;
}) {
  const searchParams = await props.searchParams;
  let eventId = searchParams.eventId;
  const teamId = searchParams.teamId;

  let team: any = null;
  if (teamId) {
    team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: {
          include: { parent: true, zone: true }
        },
        institution: true
      }
    });
    if (team) {
      eventId = team.eventId;
    }
  }

  // If printing for a team/institution, verify schedule is published by Zone Admin
  if (teamId && team) {
    const isSchedulePublished = team.event?.statusOverride === "SCHEDULE_PUBLISHED" || 
      team.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";
    
    if (!isSchedulePublished) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: '#b45309', marginBottom: '8px' }}>On-Stage Schedule Not Yet Published</h2>
          <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6 }}>
            The official On-Stage program schedule is currently being finalized by the Zone Admin. 
            Schedule printing will become available immediately after the Zone Admin updates and publishes the final timings.
          </p>
          <div style={{ marginTop: '24px' }}>
            <a href="/dashboard/schedule" style={{ padding: '8px 16px', backgroundColor: '#8E0033', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              &larr; Back to Schedule Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  // If eventId is not provided, resolve it
  if (!eventId) {
    const latestScheduledProg = await prisma.program.findFirst({
      where: { stageType: 'ON_STAGE', venue: { not: null }, startTime: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: { eventId: true }
    });
    if (latestScheduledProg) {
      eventId = latestScheduledProg.eventId;
    } else {
      const defaultEv = await prisma.event.findFirst({
        where: { parentId: { not: null } },
        orderBy: { createdAt: 'desc' }
      });
      eventId = defaultEv?.id;
    }
  }

  const settings = await getSettings(eventId);

  let activeEv: any = null;
  if (eventId) {
    activeEv = await prisma.event.findUnique({ 
      where: { id: eventId },
      include: { zone: true }
    });
  }

  // Fetch only legitimately SCHEDULED ON_STAGE programs for this specific event
  const programWhere: any = {
    stageType: "ON_STAGE",
    venue: { not: null },
    startTime: { not: null }
  };

  if (eventId) {
    programWhere.eventId = eventId;
  }

  const rawPrograms = await prisma.program.findMany({
    where: programWhere,
    orderBy: [
      { venue: 'asc' },
      { startTime: 'asc' },
      { programCode: 'asc' }
    ],
    include: { 
      category: true, 
      event: true,
      assignments: {
        include: {
          candidate: {
            include: {
              team: { include: { institution: true } },
              institution: { include: { zone: true } }
            }
          }
        }
      }
    }
  });

  // If candidate assignments are in parent event, merge assignments into zone programs
  if (activeEv?.parentId) {
    const parentPrograms = await prisma.program.findMany({
      where: {
        eventId: activeEv.parentId,
        stageType: 'ON_STAGE'
      },
      include: {
        assignments: {
          include: {
            candidate: {
              include: {
                team: { include: { institution: true } },
                institution: { include: { zone: true } }
              }
            }
          }
        }
      }
    });

    const parentMap = new Map<string, any[]>();
    for (const pp of parentPrograms) {
      const codeKey = pp.programCode ? `code_${pp.programCode.trim()}` : null;
      const nameKey = `name_${pp.name.trim().toLowerCase()}_${pp.categoryId || ''}`;
      if (codeKey) parentMap.set(codeKey, pp.assignments);
      parentMap.set(nameKey, pp.assignments);
    }

    for (const zp of rawPrograms) {
      if (zp.assignments.length === 0) {
        const codeKey = zp.programCode ? `code_${zp.programCode.trim()}` : null;
        const nameKey = `name_${zp.name.trim().toLowerCase()}_${zp.categoryId || ''}`;
        if (codeKey && parentMap.has(codeKey)) {
          zp.assignments = parentMap.get(codeKey) || [];
        } else if (parentMap.has(nameKey)) {
          zp.assignments = parentMap.get(nameKey) || [];
        }
      }
    }
  }

  // Filter ONLY scheduled programs (must have valid stage venue and startTime)
  let programs = rawPrograms.filter(p => {
    return Boolean(p.venue && p.venue.trim() && p.venue !== "Unassigned" && p.startTime);
  });

  // If filtered for a specific team, filter to programs that team is participating in
  if (teamId) {
    programs = programs.filter(p => 
      p.assignments.some((a: any) => a.candidate?.teamId === teamId)
    );
  }

  programs.sort((a, b) => {
    const venueA = a.venue || "";
    const venueB = b.venue || "";
    if (venueA !== venueB) return venueA.localeCompare(venueB);

    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.programCode || a.name || "").localeCompare(b.programCode || b.name || "");
  });

  // Group strictly by assigned stage
  const venueGroups: Record<string, any[]> = {};
  for (const p of programs) {
    const v = p.venue!;
    if (!venueGroups[v]) venueGroups[v] = [];
    venueGroups[v].push(p);
  }

  const zoneName = activeEv?.zone?.name || activeEv?.name || team?.event?.zone?.name || "";

  return (
    <div style={{ padding: '30px 40px', backgroundColor: 'white', color: 'black', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Official Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2.5px solid #8E0033', paddingBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '1.8rem', fontWeight: 900, color: '#8E0033' }}>{settings.festName}</h1>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#1e293b' }}>
          Official On-Stage Program Schedule {zoneName ? `• ${zoneName}` : ""}
        </h2>
        {team ? (
          <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>
            Institution / Team: {team.institution?.name || team.name} ({team.prefixCode})
          </p>
        ) : (
          <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '0.85rem', color: '#64748b' }}>
            {settings.festMoto || "Official Festival Timeline"}
          </p>
        )}
      </div>

      {/* Venues Schedule Sections */}
      {Object.keys(venueGroups).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗓️</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}>No Programs Scheduled on Stages Yet</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Only programs with assigned venues and start times appear on this official schedule print.
          </p>
        </div>
      ) : (
        Object.entries(venueGroups).map(([venueName, venueProgs]) => (
        <div key={venueName} style={{ marginBottom: '28px', pageBreakInside: 'avoid' }}>
          <div style={{ 
            backgroundColor: '#8E0033', 
            color: '#ffffff', 
            padding: '6px 14px', 
            borderRadius: '4px 4px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 800,
            fontSize: '0.95rem'
          }}>
            <span>📍 {venueName}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{venueProgs.length} Program(s)</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px 10px', width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px 10px', width: '130px', textAlign: 'center' }}>Time (IST)</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px 10px', width: '90px', textAlign: 'center' }}>Code</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px 10px', textAlign: 'left' }}>Program Name</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px 10px', width: '130px' }}>Category</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px 10px', width: '80px', textAlign: 'center' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {venueProgs.map((p, idx) => {
                const startTimeStr = formatTimeAmPm(p.startTime);
                const endTimeStr = p.startTime && p.duration
                  ? formatTimeAmPm(new Date(new Date(p.startTime).getTime() + p.duration * 60000))
                  : null;

                return (
                  <tr key={p.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                      {idx + 1}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#047857' }}>
                      {startTimeStr} {endTimeStr ? ` - ${endTimeStr}` : ""}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                      {p.programCode || '-'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 800, color: '#0f172a' }}>
                      {p.name}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', color: '#475569' }}>
                      {p.category?.name || 'General'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>
                      {p.duration ? `${p.duration}m` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )))}

      {/* Footer */}
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.85rem' }}>
        <div>
          Generated on: {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long" })} at {new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", timeStyle: "short" })}
        </div>
        <div style={{ borderTop: '1.5px solid black', width: '220px', textAlign: 'center', paddingTop: '6px', fontWeight: 700 }}>
          General Convener / Stage Manager
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
        }
      `}} />
      
      <div className="no-print" style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
        <PrintButton label="🖨️ Print Schedule" />
      </div>
    </div>
  );
}
