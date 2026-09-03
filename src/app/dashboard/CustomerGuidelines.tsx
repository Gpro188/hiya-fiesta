"use client";

import { useState, useEffect } from "react";
import { toggleGuidelinesVisibility } from "./settings/actions";

export default function CustomerGuidelines({ role, initialHidden = false }: { role: string; initialHidden?: boolean }) {
  const isZoneAdmin = role === "ZONE_ADMIN";
  const isInstitutionManager = ["MANAGER", "INSTITUTION_MANAGER"].includes(role);
  const isSuperAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);

  const [activeTab, setActiveTab] = useState<string>("setup");
  const [collapsed, setCollapsed] = useState(initialHidden);
  const [loading, setLoading] = useState(false);

  const handleToggleGlobalHide = async () => {
    setLoading(true);
    const newHidden = !collapsed;
    setCollapsed(newHidden);
    const res = await toggleGuidelinesVisibility(newHidden);
    if (!res.success) {
      alert("Failed to update visibility: " + res.error);
      setCollapsed(!newHidden);
    }
    setLoading(false);
  };

  if (collapsed && !isSuperAdmin) {
    return null;
  }

  const getTabs = () => {
    if (isZoneAdmin) {
      return [
        { id: "setup", label: "🚀 Zone Fest Workflow", icon: "📋" },
        { id: "schedule", label: "📅 Schedule & Local Changes", icon: "⏱️" },
        { id: "print", label: "🖨️ Reports & Print Hub", icon: "📄" },
        { id: "juries", label: "⚖️ Jury Selection & Juries", icon: "👥" },
        { id: "scratch", label: "🃏 Code Letters & Scratch Cards", icon: "🎲" },
      ];
    } else if (isInstitutionManager) {
      return [
        { id: "setup", label: "🚀 Manager Workflow", icon: "⚙️" },
        { id: "cards", label: "💳 Participant ID Cards", icon: "🪪" },
        { id: "schedule", label: "📅 Timetable & Programs", icon: "🗓️" },
        { id: "print", label: "🖨️ Printables & Reports", icon: "📄" },
      ];
    } else {
      // Super Admin
      return [
        { id: "setup", label: "🚀 Festival Overview", icon: "⚙️" },
        { id: "schedule", label: "📅 Master Schedule Sync", icon: "📢" },
        { id: "print", label: "🖨️ Print Hub & Central Reports", icon: "📄" },
        { id: "scratch", label: "🃏 Anonymous Scratch Cards", icon: "🎲" },
        { id: "poster", label: "🎨 Poster Customizer", icon: "🖼️" },
      ];
    }
  };

  const tabs = getTabs();

  const getHeaderTitle = () => {
    if (isZoneAdmin) return "Zonal Admin Operational Guideline";
    if (isInstitutionManager) return "Institution Manager Guideline";
    return "Master Festival Administration Guideline";
  };

  const getHeaderSubtitle = () => {
    if (isZoneAdmin) return "Comprehensive operational guide on zone workflows, master schedule inheritance, local modifications, and print options.";
    if (isInstitutionManager) return "Instructions on candidate registration, program enrollment, ID card generation, and schedule viewing.";
    return "Instructions on system-wide configuration, master schedule publishing, global jury allocation, and data management.";
  };

  return (
    <div data-tour="dash-guidelines" className="glass-panel animate-fade-in" style={{ padding: 'var(--spacing-lg)', border: '1px solid var(--border-color)', marginTop: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '1.75rem' }}>📖</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{getHeaderTitle()}</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{getHeaderSubtitle()}</p>
          </div>
        </div>

        {isSuperAdmin && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: collapsed ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
              {collapsed ? "👁️‍🗨️ Guidelines HIDDEN from Institutions" : "👁️ Guidelines VISIBLE to Institutions"}
            </span>
            <button 
              onClick={handleToggleGlobalHide} 
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '4px 10px', borderColor: collapsed ? '#10b981' : '#f59e0b', color: collapsed ? '#10b981' : '#f59e0b' }}
            >
              {collapsed ? "Show to Institutions" : "Hide from Institutions"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        paddingBottom: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === tab.id ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
              background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(163, 0, 92, 0.15), rgba(59, 130, 246, 0.15))' : 'rgba(255,255,255,0.02)',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
        
        {/* ======================= TAB: SETUP (WORKFLOW) ======================= */}
        {activeTab === "setup" && (
          <div className="animate-fade-in">
            {isZoneAdmin ? (
              <div>
                <h3 style={{ color: 'var(--text-primary)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📋 Complete Zone Festival Progression
                </h3>
                <p>
                  As a <strong>Zonal Admin</strong>, you coordinate all participating institutions, schedules, venues, and live scoring in your zone. Follow this standard step-by-step workflow:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', marginTop: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>1. Verify Teams & Chest Numbers</div>
                    <div style={{ fontSize: '0.825rem' }}>
                      Navigate to <strong>Teams & Institutions</strong> to confirm institution rosters, ensure all candidate enrollments are finalized, and verify chest number allocations.
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>2. Review & Adjust Festival Schedule</div>
                    <div style={{ fontSize: '0.825rem' }}>
                      The <strong>Master Schedule is already published by Super Admin</strong> as default. Open <strong>Scheduling & Stages</strong> to review timings and make local adjustments if required.
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>3. Jury Panel & Program Mapping</div>
                    <div style={{ fontSize: '0.825rem' }}>
                      Check <strong>Jury Selection</strong> to view judges assigned by Super Admin or select additional judges from the global master list for your zone's programs.
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>4. Stage Manager & Print Sheets</div>
                    <div style={{ fontSize: '0.825rem' }}>
                      Open <strong>Reports & Print Hub</strong> to generate stage manager call sheets, valuation sheets, tabulation formats, and print all participant ID badges in bulk.
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>5. Rapid Live Scoring & Results</div>
                    <div style={{ fontSize: '0.825rem' }}>
                      Use <strong>Results & Scoring</strong> to enter judge scores during live competitions, calculate ranks/grades automatically, and publish results to the live zone portal.
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>6. Institution Credentials</div>
                    <div style={{ fontSize: '0.825rem' }}>
                      Use <strong>User Credentials</strong> to generate and share login accounts for the colleges and institutions belonging to your zone.
                    </div>
                  </div>
                </div>
              </div>
            ) : isInstitutionManager ? (
              <div>
                <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>🚀 Institution Manager Workflow</h3>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><strong>Register Candidates:</strong> Navigate to <strong>Candidates</strong> tab and register your students.</li>
                  <li><strong>Assign Programs:</strong> Go to <strong>Program Assignments</strong> and enroll candidates up to the team limit.</li>
                  <li><strong>Print ID Cards:</strong> Download and print official participant credentials in bulk.</li>
                  <li><strong>Track Schedule:</strong> View program time slots and venues assigned for your college.</li>
                </ol>
              </div>
            ) : (
              <div>
                <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>🚀 Master Festival Setup Progression</h3>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><strong>Master Programs & Categories:</strong> Configure competition items, durations, and criteria.</li>
                  <li><strong>Publish Master Schedule:</strong> Set default stages/timings and push to all zones via <code>/dashboard/schedule</code>.</li>
                  <li><strong>Master Jury Directory:</strong> Register judges and assign them to Zone and State fests.</li>
                  <li><strong>Supervise Zone Progress:</strong> Monitor registrations, score entries, and state promotions.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB: SCHEDULE & LOCAL CHANGES ======================= */}
        {activeTab === "schedule" && (
          <div className="animate-fade-in">
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⏱️ Festival Schedule: Master Inheritance & Local Customization
            </h3>
            
            <div style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>📌 Master Schedule Synchronization Rule:</div>
              <div style={{ fontSize: '0.85rem' }}>
                The <strong>Super Admin publishes the official Master Schedule</strong> (Program order, default venues, start times, durations, and stage types). This Master Schedule automatically becomes the default timeline for your Zone Fest.
              </div>
            </div>

            <h4 style={{ color: 'var(--text-primary)', margin: '14px 0 8px 0', fontSize: '1rem' }}>✏️ What can you modify as a Zonal Admin?</h4>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Stage / Venue Names:</strong> You can add local venues (e.g. <em>Stage 1 - Main Auditorium, Stage 2 - Seminar Hall</em>) and reassign programs to match your actual festival venue layout.
              </li>
              <li>
                <strong>Adjust Start Times & Durations:</strong> If an event starts earlier or later, modify the start time or duration directly in the schedule card.
              </li>
              <li>
                <strong>Handle Live Delays (Advance / Delay 15m):</strong> Use the one-click <strong>Delay 15m</strong> or <strong>Advance 15m</strong> buttons on any stage to shift all upcoming programs automatically when live stage delays occur.
              </li>
              <li>
                <strong>Add Breaks (+ Add Break):</strong> Insert lunch breaks, tea breaks, or prayer intervals into any venue timeline without disrupting program slots.
              </li>
              <li>
                <strong>Individual Candidate Slots:</strong> Candidate slot numbers and sequential times are computed automatically based on the program start time and duration.
              </li>
            </ul>

            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.825rem' }}>
              💡 <strong>Note:</strong> Changes made by Zone Admins in their Zone Dashboard only apply locally to their Zone Fest and will not affect the Master Schedule or other zones.
            </div>
          </div>
        )}

        {/* ======================= TAB: PRINT HUB & REPORTS ======================= */}
        {activeTab === "print" && (
          <div className="animate-fade-in">
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🖨️ Reports & Print Hub: All Printables for Zone Operations
            </h3>
            <p>
              The system provides dedicated, high-contrast, print-optimized document formats for offline festival coordination and live stage management:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '12px' }}>
              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>🎭 Stage Manager Sheets</div>
                <div style={{ fontSize: '0.825rem' }}>
                  Sequential candidate lists grouped by program, venue, and slot number. Includes chest numbers, institution names, and check-in boxes for stage coordinators.
                </div>
              </div>

              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>⚖️ Judge Valuation & Mark Sheets</div>
                <div style={{ fontSize: '0.825rem' }}>
                  Printable score recording sheets for jury members with criteria breakdown (e.g. Melody, Rhythm, Presentation) and signature lines for verification.
                </div>
              </div>

              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>📊 Tabulation & Final Result Sheets</div>
                <div style={{ fontSize: '0.825rem' }}>
                  Comprehensive multi-judge mark tabulation matrices with calculated total marks, computed grades (A/B/C), and final ranks (1st/2nd/3rd).
                </div>
              </div>

              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>💳 Participant ID Cards & Badges</div>
                <div style={{ fontSize: '0.825rem' }}>
                  Bulk ID badge generator featuring candidate photo, chest number, category, institution flag, barcode, and enrolled program list.
                </div>
              </div>

              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>📍 Venue-wise Complete Schedule</div>
                <div style={{ fontSize: '0.825rem' }}>
                  Complete festival timetable formatted for venue notice boards, displaying program codes, names, categories, and exact start times.
                </div>
              </div>

              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>🏛️ Institution Master Rosters</div>
                <div style={{ fontSize: '0.825rem' }}>
                  Complete team-wise reports listing all registered candidates and their assignments for team managers and college principals.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: JURIES (ZONE ADMIN SPECIFIC) ======================= */}
        {activeTab === "juries" && (
          <div className="animate-fade-in">
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              👥 Jury Selection & Program Assignment
            </h3>
            <p>
              Judges can be allocated both centrally by the Super Admin and managed locally by the Zonal Admin:
            </p>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Master Jury Directory:</strong> Browse the global list of qualified judges published by the Super Admin in <strong>Jury Selection</strong>.
              </li>
              <li>
                <strong>Select Zone Juries:</strong> Toggle the <em>Select for Zone</em> switch to add master judges to your zone festival panel.
              </li>
              <li>
                <strong>Assign to Programs:</strong> Under the <em>Assign to Programs</em> tab, select judges for specific on-stage and off-stage competition items.
              </li>
              <li>
                <strong>Judge Score Entry Access:</strong> Assigned judges will receive their programs automatically on their scoring sheets and judge evaluation interfaces.
              </li>
            </ol>
          </div>
        )}

        {/* ======================= TAB: SCRATCH CARDS ======================= */}
        {activeTab === "scratch" && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>🃏 Anonymous Code Letters & Scratch Cards</h3>
              <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>CONFIDENTIALITY</span>
            </div>
            <p>
              To guarantee 100% impartial and fair evaluations, judges evaluate performances using secret <strong>Code Letters (A, B, C...)</strong> rather than student names or chest numbers.
            </p>
            <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: 'var(--radius-md)', marginTop: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '0.95rem' }}>⚙️ How to use the Interactive Scratch Tool:</h4>
              <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Stage managers can open the scratch screen on a tablet or mobile screen before each event starts.</li>
                <li>Each contestant scratches their virtual card to reveal their secret stage performance letter.</li>
                <li>The system securely pairs the code letter with the candidate's chest number in the backend for automatic result computation.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ======================= TAB: CARDS (MANAGER) ======================= */}
        {activeTab === "cards" && (
          <div className="animate-fade-in">
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>💳 Participant ID Cards</h3>
            <p>
              Print identity cards and event passes for contestants directly from the system, formatted automatically for fast laminating.
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Go to <strong>Candidates</strong> and click <strong>Bulk ID Cards</strong>.</li>
              <li>Cards include contestant photo, chest number, category, team flag, and enrolled programs.</li>
              <li>Press <kbd style={{ background: '#334155', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>Ctrl + P</kbd> to launch print mode (custom stylesheets fit multiple badges per sheet).</li>
            </ul>
          </div>
        )}

        {/* ======================= TAB: POSTER (SUPER ADMIN) ======================= */}
        {activeTab === "poster" && (
          <div className="animate-fade-in">
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>🎨 Result Poster Branding</h3>
            <p>
              Design result announcement images and posters visually to share on social channels or print.
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Navigate to <strong>Poster Branding</strong> in the sidebar.</li>
              <li>Upload custom festival background posters, sponsor logos, and congratulations banners.</li>
              <li>Results generated by judges will automatically overlay winner details, photos, points, and grades.</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

