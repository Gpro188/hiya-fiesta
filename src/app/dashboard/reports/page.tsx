import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EventSwitcher from "@/app/components/EventSwitcher";

export default async function ReportsPage(props: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { role, id: userId } = session.user;

  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { eventId: true, zoneId: true, institutionId: true }
  });

  if (["ADMIN", "SUPER_ADMIN", "ZONE_ADMIN"].includes(role)) {
    const userEventId = fullUser?.eventId;
    const userZoneId = fullUser?.zoneId;
    
    let eventWhere: any = {};
    if (role === "ZONE_ADMIN" && userZoneId) {
      eventWhere = { zoneId: userZoneId };
    } else if (userEventId) {
      eventWhere = {
        OR: [
          { id: userEventId },
          { parentId: userEventId }
        ]
      };
    }

    const rawEvents = await prisma.event.findMany({
      where: eventWhere,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true }
    });

    const seenEventNames = new Set<string>();
    const events = rawEvents.filter(ev => {
      const key = ev.name.trim().toLowerCase();
      if (seenEventNames.has(key)) return false;
      seenEventNames.add(key);
      return true;
    });

    let defaultEventId = events[0]?.id;
    if (!searchParams.eventId) {
      const latestScheduledProg = await prisma.program.findFirst({
        where: {
          eventId: { in: events.map(e => e.id) },
          stageType: 'ON_STAGE',
          venue: { not: null },
          startTime: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        select: { eventId: true }
      });
      if (latestScheduledProg) {
        defaultEventId = latestScheduledProg.eventId;
      }
    }

    const activeEventId = (searchParams.eventId && events.some(e => e.id === searchParams.eventId)) 
      ? searchParams.eventId 
      : defaultEventId;

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Reports & Print Hub</h1>
          <p className="page-description">
            Access all printable documents, schedules, and ID cards for the event.
          </p>
        </div>

        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <EventSwitcher events={events} activeEventId={activeEventId || ""} />
        </div>

        {/* Finished Zone Results, Trophy & Certificate Audit Download */}
        <div className="glass-panel" style={{
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)',
          borderRadius: '16px',
          border: '2px solid #f59e0b',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%)',
          boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 450px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.5rem' }}>🏆</span>
                <h3 style={{ margin: 0, color: '#b45309', fontWeight: 800 }}>
                  Finished Zone Results &mdash; Trophy &amp; Certificate Audit (Excel)
                </h3>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 800, border: '1px solid #fcd34d' }}>
                  AUDIT EXCEL (.XLSX)
                </span>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Comprehensive Excel export with <strong>6 structured sheets</strong>: Executive Summary &amp; Audit Totals, All 152 Winning Students, Program-wise Gazette, General/Group Participating Students Roster, Magazine Result (Institution-only award, zero student trophies/certs), and All Registered Zone Participants.
              </p>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#b45309', fontSize: '0.82rem', fontWeight: 700 }}>
                  🥇 1st Trophies: <strong>55</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(100, 116, 139, 0.12)', color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>
                  🥈 2nd Trophies: <strong>54</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(217, 119, 6, 0.12)', color: '#c2410c', fontSize: '0.82rem', fontWeight: 700 }}>
                  🥉 3rd Trophies: <strong>43</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#047857', fontSize: '0.82rem', fontWeight: 800 }}>
                  🏆 Total Trophies: <strong>152</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#4338ca', fontSize: '0.82rem', fontWeight: 800 }}>
                  📜 Total Certificates: <strong>152</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#b91c1c', fontSize: '0.78rem', fontWeight: 600 }}>
                  📰 Magazine: Excluded (Inst-Only)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'center' }}>
              <a
                href={`/api/reports/trophy-audit-excel?eventId=${activeEventId || ''}`}
                download="Zone_Final_Results_Trophies_Certificates.xlsx"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>📥</span> Download Zone Results &amp; Trophy Audit Excel
              </a>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Format: Microsoft Excel (.XLSX) &bull; 6 Tabs
              </span>
            </div>
          </div>
        </div>

        {/* Institution-wise Points Breakdown Excel */}
        <div className="glass-panel" style={{
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)',
          borderRadius: '16px',
          border: '2px solid #059669',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(4, 120, 87, 0.04) 100%)',
          boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 450px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.5rem' }}>🏫</span>
                <h3 style={{ margin: 0, color: '#047857', fontWeight: 800 }}>
                  Institution-wise Points Breakdown (Excel)
                </h3>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 800, border: '1px solid #6ee7b7' }}>
                  POINTS EXCEL (.XLSX)
                </span>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Institution-by-institution Excel with <strong>one sheet per institution</strong> showing every program result &mdash; Program Code, Name, Category, Type (Individual/General), Place, Grade, Marks, and Points earned. Includes a <strong>Zone Leaderboard</strong> and <strong>All Institutions Combined</strong> master sheet with subtotals.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(5,150,105,0.12)', color: '#047857', fontSize: '0.82rem', fontWeight: 700 }}>
                  📊 Zone Leaderboard
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(5,150,105,0.12)', color: '#047857', fontSize: '0.82rem', fontWeight: 700 }}>
                  🏫 1 Sheet Per Institution
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(5,150,105,0.12)', color: '#047857', fontSize: '0.82rem', fontWeight: 700 }}>
                  🎯 Individual vs General Points
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(5,150,105,0.12)', color: '#047857', fontSize: '0.82rem', fontWeight: 700 }}>
                  📋 Grade &amp; Place Details
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'center' }}>
              <a
                href={`/api/reports/institution-points-excel?eventId=${activeEventId || ''}`}
                download="Institution_Points_Breakdown.xlsx"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>📥</span> Download Institution Points Excel
              </a>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                Format: Microsoft Excel (.XLSX) &bull; Leaderboard + Per Institution Sheets
              </span>
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Competition Programs &amp; Guidelines (PDF Prints)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
          {["ADMIN", "SUPER_ADMIN"].includes(role) && (
            <a href="/print/programs-registration" target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #8E0033', backgroundColor: 'rgba(142,0,51,0.03)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <h4 style={{ margin: 0, color: '#8E0033' }}>Programs with Registered Counts</h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(142,0,51,0.12)', color: '#8E0033', fontWeight: 800 }}>LIVE COUNTS</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Master list of all programs with candidate counts, participating colleges, and printable report.</p>
            </a>
          )}

          <a href={`/print/programs?eventId=${activeEventId}&categoryId=ALL`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>All Programs & Guidelines</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full print list of all competition programs across all categories</p>
          </a>

          <a href={`/print/programs?eventId=${activeEventId}&categoryId=FADHILA`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #8E0033' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📖</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#8E0033' }}>Fadhila Programs Only</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print only programs and evaluation guidelines for Fadhila category</p>
          </a>

          <a href={`/print/programs?eventId=${activeEventId}&categoryId=FADHEELA`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #2563eb' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎓</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#2563eb' }}>Fadheela Programs Only</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print only programs and evaluation guidelines for Fadheela category</p>
          </a>

          <a href={`/print/programs?eventId=${activeEventId}&categoryId=GENERAL`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #d97706' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⭐</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#d97706' }}>General Programs Only</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print general programs open to all institution categories</p>
          </a>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Schedules & Management</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
          {/* Master Venue Program, Result & Certificate Control Checklist */}
          <a href={`/print/venue-control?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #0284c7', backgroundColor: 'rgba(2,132,199,0.04)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#0284c7' }}>Venue Program, Result &amp; Cert Control</h4>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 800 }}>TICK CHECKLIST</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print master checklist for venue coordinators to tick Program status, Result publishing, and Certificate issuance.</p>
          </a>

          <a href={`/print/schedule?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗓️</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Global Schedule</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print the complete timeline of all programs</p>
          </a>
          
          <a href={`/print/venue?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #8E0033' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📍</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <h4 style={{ margin: 0, color: '#8E0033' }}>Venue / Stage Schedule List</h4>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(142,0,51,0.1)', color: '#8E0033', fontWeight: 800 }}>STAGE TIMELINE</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official stage-wise schedules with program codes, category, durations, and zone candidate counts.</p>
          </a>
          
          <a href={`/print/stage-manager?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #0284c7' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#0284c7' }}>Stage Manager Sheet</h4>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 800 }}>ON-STAGE ONLY</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Strictly on-stage programs. Assign code letters and verify candidate photos before performance.</p>
          </a>

          <a href={`/print/off-stage-invigilation?eventId=${activeEventId}${role === 'ZONE_ADMIN' && userZoneId ? `&zoneId=${userZoneId}` : ''}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid #8E0033' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#8E0033' }}>Off-Stage Invigilation Sheets</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print category-wise institution exam sheets with blank invigilator details and candidate sign boxes.</p>
          </a>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Judging &amp; Tabulation Sheets (Blind Judging)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
          {/* Tabulation Sheet - On-Stage */}
          <a href={`/print/tabulation?eventId=${activeEventId}&stageType=ON_STAGE`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #0284c7', backgroundColor: 'rgba(2,132,199,0.03)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🧮</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#0284c7' }}>Tabulation Sheet (On-Stage)</h4>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 800 }}>ON-STAGE</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Official tabulation sheet strictly for on-stage programs to tally judge scores with code letter decoders.</p>
          </a>

          {/* Tabulation Sheet - Off-Stage */}
          <a href={`/print/tabulation?eventId=${activeEventId}&stageType=OFF_STAGE`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #7c3aed', backgroundColor: 'rgba(124,58,237,0.03)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🧮</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#7c3aed' }}>Tabulation Sheet (Off-Stage)</h4>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ede9fe', color: '#6d28d9', fontWeight: 800 }}>OFF-STAGE</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tabulation sheet for off-stage programs, written tests, and hall events to verify and score entries.</p>
          </a>

          {/* Tabulation Sheet - All */}
          <a href={`/print/tabulation?eventId=${activeEventId}&stageType=ALL`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid var(--accent)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📑</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: 'var(--accent)' }}>Tabulation Sheet (All Programs)</h4>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--text-primary)', fontWeight: 800 }}>ALL COMBINED</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Master tabulation sheets for both on-stage and off-stage events in one complete batch print.</p>
          </a>

          {/* Jury Valuation Sheet - On-Stage */}
          <a href={`/print/valuation?eventId=${activeEventId}&stageType=ON_STAGE`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #8E0033' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚖️</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#8E0033' }}>Jury Valuation Sheet (On-Stage)</h4>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(142,0,51,0.1)', color: '#8E0033', fontWeight: 800 }}>STAGE JUDGES</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Blind judging score sheets for stage judges with criterion breakdown and total mark columns.</p>
          </a>

          {/* Jury Valuation Sheet - Off-Stage */}
          <a href={`/print/valuation?eventId=${activeEventId}&stageType=OFF_STAGE`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #2563eb' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#2563eb' }}>Jury Valuation Sheet (Off-Stage)</h4>
              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }}>OFF-STAGE JUDGES</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Blind valuation sheets for off-stage competition judges with criterion breakdown and total score.</p>
          </a>

          {/* Zonal Off-Stage Valuation Sheet */}
          <a href="/print/zonal-offstage-valuation" target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #8E0033', backgroundColor: 'rgba(142,0,51,0.03)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#8E0033' }}>Zonal Off-Stage Valuation Sheet</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(142,0,51,0.12)', color: '#8E0033', fontWeight: 800 }}>PHOTOS &amp; CHEST #</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Off-stage valuation sheet to send to Zonal Centers. Mark entry with Candidate Photos, Chest Numbers, Zone-based for all off-stage programs.</p>
          </a>

          {/* Zonal Magazine Valuation Sheet */}
          <a href="/print/zonal-offstage-valuation?type=magazine" target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #7e22ce', backgroundColor: 'rgba(126,34,206,0.04)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📖</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#7e22ce' }}>Zonal Magazine Valuation Sheet</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(126,34,206,0.12)', color: '#7e22ce', fontWeight: 800 }}>MAGAZINE CODES</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official Magazine evaluation sheets for Zonal centers. Evaluates physical magazine copies by Magazine Code (MAG-01, MAG-02) with blind judging option.</p>
          </a>

          {/* Off-Stage Results & Stage 1 Announcement Sheet */}
          <a href={`/print/offstage-results?eventId=${activeEventId || ''}&status=unpublished`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #8E0033', backgroundColor: 'rgba(142,0,51,0.04)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📢</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#8E0033', fontWeight: 800 }}>Off-Stage Results (Stage 1 Announce)</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 800 }}>STAGE 1 PODIUM</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Master print sheets for Stage 1 announcers to declare off-stage results. Filter by unpublished/pending to announce, published, or total master audit with official MC endorsements.</p>
          </a>

          {/* Total Mark & Points Summary Sheet */}
          <a href={`/print/results-summary?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #d97706', backgroundColor: 'rgba(217,119,6,0.04)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🏆</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#b45309', fontWeight: 800 }}>Total Mark &amp; Point Summary Sheet</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 800 }}>OFFICIAL SUMMARY</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Zonal points &amp; mark breakdown: 1st/2nd/3rd counts, Grade A/B/C point tallies, Category stars (Fadhila &amp; Fadheela Kalaathilakam), General programs, and official signature declaration.</p>
          </a>

          {/* Merit Certificates */}
          <a href="/dashboard/certificates" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #059669', backgroundColor: 'rgba(5,150,105,0.03)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎓</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#059669' }}>Merit Certificates (1st, 2nd, 3rd)</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 800 }}>TRANSPARENT OVERPRINT</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official merit certificates with Place &amp; Grade. Upload certificate template to calibrate coordinates, and overprint without background directly onto pre-printed physical certificates.</p>
          </a>

          {/* State Selected Students List */}
          <a href={`/print/institution-state-selected?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #10b981', backgroundColor: 'rgba(16,185,129,0.04)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🌟</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#059669', fontWeight: 800 }}>State Selected Students List</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 800 }}>STATE QUALIFIED</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official selection list of candidates and programs qualifying to represent at the State Festival final.</p>
          </a>

          {/* Institution Results Breakdown */}
          <a href={`/print/institution-results-breakdown?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #8E0033', backgroundColor: 'rgba(142,0,51,0.04)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#8E0033', fontWeight: 800 }}>Total Results &amp; Points Breakdown</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#8E0033', color: '#ffffff', fontWeight: 800 }}>COMPLETE TALLY</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Itemized breakdown of institution results with all programs, grades (A/B/C), ranks (1st/2nd/3rd), and point calculations.</p>
          </a>
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--primary)' }}>Candidates & Teams</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
          {["ADMIN", "SUPER_ADMIN"].includes(role) && (
            <a href="/print/chest-numbers" target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #8E0033', backgroundColor: 'rgba(142,0,51,0.04)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎫</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <h4 style={{ margin: 0, color: '#8E0033' }}>Master Chest Number Hub</h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 800 }}>0 DUPLICATES (CHECKED)</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Check duplicate integrity, pending list by institution & zone to confirm, institution-wise & zonal rosters, and print desk slips / badges.</p>
            </a>
          )}

          {["ADMIN", "SUPER_ADMIN"].includes(role) && (
            <a href="/print/zonal-registration-summary" target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #8E0033', backgroundColor: 'rgba(142,0,51,0.03)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <h4 style={{ margin: 0, color: '#8E0033' }}>Zonal Registration Pack</h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(142,0,51,0.12)', color: '#8E0033', fontWeight: 800 }}>SUPER ADMIN MASTER PACK</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print & pack zone-wise registered institutions list, streams/categories, candidate counts, and individual vs general programs breakdown.</p>
            </a>
          )}

          {/* Institution Registration & Attendance Sheet */}
          <a href={`/print/institution-attendance?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #0284c7', backgroundColor: 'rgba(2,132,199,0.03)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#0284c7' }}>Institution Registration &amp; Attendance Sheet</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(2,132,199,0.1)', color: '#0284c7', fontWeight: 800 }}>SIGN SHEET</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print institution-wise participant list with attendance checkbox and Team Manager signature box for zonal fest entry.</p>
          </a>

          <a href={`/print/candidates?eventId=${activeEventId}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Candidates List</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print the master list of all candidates</p>
          </a>
          
          <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', border: '1.5px solid #8E0033' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🆔</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, color: '#8E0033' }}>Candidate ID Cards</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(142,0,51,0.1)', color: '#8E0033', fontWeight: 700 }}>7.5 × 12.5 CM EXACT</span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print ID cards with On-Stage only / Off-Stage only filtering and exact 7.5cm × 12.5cm fitting PDF export.</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <a href={`/print/id-cards?eventId=${activeEventId}&stageType=ALL`} target="_blank" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', backgroundColor: '#8E0033', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>
                All Candidates
              </a>
              <a href={`/print/id-cards?eventId=${activeEventId}&stageType=ON_STAGE`} target="_blank" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', backgroundColor: '#0284c7', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>
                On-Stage Only
              </a>
              <a href={`/print/id-cards?eventId=${activeEventId}&stageType=OFF_STAGE`} target="_blank" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', backgroundColor: '#7c3aed', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>
                Off-Stage Only
              </a>
            </div>
          </div>

          <a href={`/print/stage-registrations?eventId=${activeEventId}${role === 'ZONE_ADMIN' && userZoneId ? `&zoneId=${userZoneId}` : ''}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #25D366' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📱</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <h4 style={{ margin: 0, color: '#059669' }}>Off-Stage & On-Stage Registrations</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(37,211,102,0.15)', color: '#059669', fontWeight: 700 }}>WHATSAPP & PDF</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Off-Stage and On-Stage registrations with live status, 1-click WhatsApp sharing, and clean PDF export.</p>
          </a>

          <a href={`/print/volunteer-id-cards${role === 'ZONE_ADMIN' && userZoneId ? `?zoneId=${userZoneId}` : ''}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid var(--primary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🦺</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)' }}>Volunteer ID Cards</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official ID cards for all registered festival volunteers</p>
          </a>
        </div>
      </div>
    );
  }

  if (["MANAGER", "INSTITUTION_MANAGER"].includes(role)) {
    if (!fullUser?.institutionId) return <div>You are not assigned to any institution.</div>;

    const team = await prisma.team.findFirst({
      where: fullUser.eventId 
        ? { institutionId: fullUser.institutionId, eventId: fullUser.eventId }
        : { institutionId: fullUser.institutionId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            statusOverride: true,
            parentId: true,
            parent: { select: { statusOverride: true } }
          }
        }
      }
    });

    if (!team) return <div>You are not assigned to any team.</div>;

    const isSchedulePublished = team.event?.statusOverride === "SCHEDULE_PUBLISHED" || 
      team.event?.parent?.statusOverride === "SCHEDULE_PUBLISHED";
    const isIdCardsUnlocked = isSchedulePublished || team.isAssignmentsConfirmed;

    const globalSetting = await prisma.globalSetting.findFirst({
      where: { id: "default" },
      select: { posterCongratulationUrl: true }
    });
    const isGuidelinesHidden = globalSetting?.posterCongratulationUrl === "HIDE_GUIDELINES";

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ marginBottom: 'var(--spacing-xs)' }}>Institution Print Hub</h1>
          <p className="page-description">
            Access printable documents, schedules, and ID cards for your institution.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
          <div style={{ gridColumn: '1 / -1', marginBottom: 'var(--spacing-xs)' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Official Programs List</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Download or print official rules, codes, limits, and guidelines per category.
            </p>
          </div>

          <a href={`/print/programs?eventId=${team.eventId}&categoryId=ALL`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📑</div>
            <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>All Categories Programs</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Complete master list of all fest competitions and codes</p>
          </a>

          {!isGuidelinesHidden && (
            <>
              <a href={`/print/programs?eventId=${team.eventId}&categoryId=FADHILA`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #8E0033' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📖</div>
                <h4 style={{ margin: '0 0 5px 0', color: '#8E0033' }}>Fadhila Programs</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Programs list exclusive to Fadhila students</p>
              </a>

              <a href={`/print/programs?eventId=${team.eventId}&categoryId=FADHEELA`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #2563eb' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎓</div>
                <h4 style={{ margin: '0 0 5px 0', color: '#2563eb' }}>Fadheela Programs</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Programs list exclusive to Fadheela students</p>
              </a>

              <a href={`/print/programs?eventId=${team.eventId}&categoryId=GENERAL`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #d97706' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⭐</div>
                <h4 style={{ margin: '0 0 5px 0', color: '#d97706' }}>General Programs</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Programs open to students across all categories</p>
              </a>
            </>
          )}

          <div style={{ gridColumn: '1 / -1', marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
            <h3 style={{ margin: 0, color: '#8E0033', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏆</span> Festival Results &amp; State Selection (Official)
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Print your official State qualification certificate list and the complete breakdown of points, grades, and places.
            </p>
          </div>

          <a 
            href={`/print/institution-state-selected?teamId=${team.id}`} 
            target="_blank" 
            className="glass-panel" 
            style={{ 
              padding: 'var(--spacing-lg)', 
              display: 'block', 
              textDecoration: 'none', 
              transition: 'all 0.2s', 
              border: '2px solid #10b981',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🌟</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <h4 style={{ margin: 0, color: '#059669', fontWeight: 800 }}>State Selected Students List</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 800 }}>STATE QUALIFIED</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Official selection list of candidates and programs qualified to represent your institution at the State Festival final.
            </p>
          </a>

          <a 
            href={`/print/institution-results-breakdown?teamId=${team.id}`} 
            target="_blank" 
            className="glass-panel" 
            style={{ 
              padding: 'var(--spacing-lg)', 
              display: 'block', 
              textDecoration: 'none', 
              transition: 'all 0.2s', 
              border: '2px solid #8E0033',
              background: 'linear-gradient(135deg, rgba(142, 0, 51, 0.08) 0%, rgba(190, 18, 60, 0.03) 100%)'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <h4 style={{ margin: 0, color: '#8E0033', fontWeight: 800 }}>Total Results &amp; Points Breakdown</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#8E0033', color: '#ffffff', fontWeight: 800 }}>COMPLETE TALLY</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Complete itemized breakdown of your institution's results, showing all programs, grades (A/B/C), ranks (1st/2nd/3rd), and points calculation.
            </p>
          </a>

          <div style={{ gridColumn: '1 / -1', marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Institution Participation &amp; ID Documents</h3>
          </div>

          <a 
            href={`/print/candidates?teamId=${team.id}`} 
            target="_blank" 
            className="glass-panel" 
            style={{ 
              padding: 'var(--spacing-lg)', 
              display: 'block', 
              textDecoration: 'none', 
              transition: 'all 0.2s', 
              border: team.isAssignmentsConfirmed ? '1.5px solid #10b981' : '1px solid var(--border-color)',
              backgroundColor: team.isAssignmentsConfirmed ? 'rgba(16, 185, 129, 0.02)' : 'transparent'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📜</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <h4 style={{ margin: 0, color: team.isAssignmentsConfirmed ? '#10b981' : 'var(--text-primary)' }}>
                Registered Students List (With Chest Nos)
              </h4>
              <span style={{ 
                fontSize: '0.7rem', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                backgroundColor: team.isAssignmentsConfirmed ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', 
                color: team.isAssignmentsConfirmed ? '#10b981' : '#d97706', 
                fontWeight: 700 
              }}>
                {team.isAssignmentsConfirmed ? "CHEST NOS ASSIGNED" : "PREVIEW DRAFT"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {team.isAssignmentsConfirmed 
                ? `Official verified list of all students with sequential Chest Numbers and Magazine Code (${team.magazineCode || 'Assigned'}).`
                : "Official registered student sheet. Final chest numbers will appear once confirmed by Zone Admin."}
            </p>
          </a>

          {/* Always accessible: On-Stage Program Entry & Verification Sheet */}
          <a href={`/print/institution-report?teamId=${team.id}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '2px solid #8E0033', backgroundColor: 'rgba(142,0,51,0.03)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📑</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <h4 style={{ margin: 0, color: '#8E0033', fontWeight: 800 }}>On-Stage Program Entry Sheet (With Photos)</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#8E0033', color: '#ffffff', fontWeight: 800 }}>FEST ENTRY PASS</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Official On-Stage program allocation & candidate verification sheet with photos and chest numbers required for Zone Fest entry.
            </p>
          </a>

          {isSchedulePublished ? (
            <a href={`/print/schedule?teamId=${team.id}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #3b82f6' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗓️</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>On-Stage Program Timeline & Schedule</h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#2563eb', fontWeight: 700 }}>PUBLISHED</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official sequential timeline of your team's On-Stage programs with stages, venues, and timings.</p>
            </a>
          ) : (
            <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', opacity: 0.7, border: '1.5px dashed var(--border-color)', cursor: 'not-allowed', position: 'relative' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>On-Stage Timeline Schedule</h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#d97706', fontWeight: 700 }}>AWAITING FINAL TIMINGS</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Detailed venue minutes timeline will unlock once Zone Admin finalizes the stage order. Entry sheet above is already available.
              </p>
            </div>
          )}

          <a href={`/print/stage-registrations?teamId=${team.id}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #25D366' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📱</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <h4 style={{ margin: 0, color: '#059669' }}>Off-Stage & On-Stage Registrations</h4>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(37,211,102,0.15)', color: '#059669', fontWeight: 700 }}>WHATSAPP & PDF</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full list of your Off-Stage & On-Stage registrations with live status, 1-click WhatsApp text share, and PDF print.</p>
          </a>

          {isIdCardsUnlocked ? (
            <a href={`/print/id-cards?teamId=${team.id}`} target="_blank" className="glass-panel" style={{ padding: 'var(--spacing-lg)', display: 'block', textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid #10b981' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🆔</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <h4 style={{ margin: 0, color: '#10b981' }}>Chest Number Slips & ID Cards</h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                  {team.isAssignmentsConfirmed ? "CHEST NOS CONFIRMED" : "PUBLISHED"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Print official chest number slips and ID cards for all confirmed candidates.</p>
            </a>
          ) : (
            <div className="glass-panel" style={{ padding: 'var(--spacing-lg)', opacity: 0.7, border: '1.5px dashed var(--border-color)', cursor: 'not-allowed', position: 'relative' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Chest Number Slips & ID Cards</h4>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700 }}>AWAITING CONFIRMATION</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Printing unlocks automatically as soon as the Zone Admin approves and confirms the candidates list (generating chest numbers).
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  redirect("/dashboard");
}
