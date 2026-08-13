"use client";

import { useState } from "react";

export default function CustomerGuidelines({ role }: { role: string }) {
  const [activeTab, setActiveTab] = useState<string>("setup");

  const tabs = [
    { id: "setup", label: ["MANAGER", "INSTITUTION_MANAGER"].includes(role) ? "🚀 Getting Started" : "🚀 Getting Started", icon: "⚙️" },
    { id: "scratch", label: "Interactive Scratch Cards", icon: "🃏" },
    { id: "cards", label: "Participant ID Cards", icon: "💳" },
    { id: "sorting", label: "Team Priority Sorting", icon: "📊" },
    { id: "poster", label: "Poster Customizer", icon: "🎨" }
  ];

  return (
    <div data-tour="dash-guidelines" className="glass-panel animate-fade-in" style={{ padding: 'var(--spacing-lg)', border: '1px solid var(--border-color)', marginTop: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ fontSize: '1.5rem' }}>📖</div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Customer Control Guideline</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Learn how to manage and leverage your premium ArtsFest suite features effectively.</p>
        </div>
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
              background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(59, 130, 246, 0.15))' : 'rgba(255,255,255,0.02)',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
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
        {activeTab === "setup" && (
          <div className="animate-fade-in">
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {["MANAGER", "INSTITUTION_MANAGER"].includes(role) ? "🚀 Getting Started as Team Manager" : "🚀 Quick-Start Dashboard Setup"}
            </h3>
            {["MANAGER", "INSTITUTION_MANAGER"].includes(role) ? (
              <p>
                As a Team Manager, you are in charge of registering your candidates, assigning them to programs, and printing ID cards and schedules. Follow this simple guide to get set up:
              </p>
            ) : (
              <p>
                Setting up your festival is structured logically to prevent configuration conflicts. Follow this progression to get your tenant system up and running with confidence:
              </p>
            )}
            {["MANAGER", "INSTITUTION_MANAGER"].includes(role) ? (
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Register Candidates:</strong> Navigate to the <strong>Candidates</strong> tab and register your team's contestants. Be sure to select the correct age group category for each contestant.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Assign Programs:</strong> Go to the <strong>Program Assignments</strong> section to enroll your candidates into specific stage or off-stage programs. Candidate limits per team are enforced.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Generate ID Cards:</strong> In the <strong>Candidates</strong> list, click the <strong>Bulk ID Cards</strong> button to print passes and credentials in bulk for all of your team's contestants.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Print Schedule:</strong> Go to the <strong>Print Team Schedule</strong> section to print a custom, neat overview of when and where your team's candidates are competing.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>View Live Standings:</strong> Check the public standings pages or the <strong>Live Hub</strong> to see announced results and overall team points in real time.
                </li>
              </ol>
            ) : (
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Configure Divisions & Settings:</strong> Go to <strong>Settings</strong> to customize your festival name, motto, logo, and registration deadlines.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Define Participating Teams:</strong> In the <strong>Teams</strong> section, add teams and associate prefix codes (e.g., TM1, TM2) and flag colors. This enables automated point accumulation.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Build Categories & Programs:</strong> Register categories (e.g., Sub-Junior, Junior) and add individual or group programs (Stage or Off-Stage).
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Onboard Candidates:</strong> As Team Managers upload candidates, review and approve them in the <strong>Candidates Approval</strong> dashboard.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Rapid Marks Entry:</strong> Use the <strong>Results & Scoring</strong> interface during the live events to enter scores, assign ranks/grades, and calculate points instantly.
                </li>
              </ol>
            )}
          </div>
        )}

        {activeTab === "scratch" && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>🃏 Interactive Scratch Cards</h3>
              <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>NEW FEATURE</span>
            </div>
            <p>
              To guarantee absolute, unbiased evaluations, judges should grade performance based on anonymous <strong>Code Letters</strong> (e.g. A, B, C) instead of chest numbers or candidate names. Our system introduces a virtual scratch card game to pick letters!
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
              <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '0.95rem' }}>⚙️ How to use:</h4>
                <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Go to <strong>Programs</strong> and assign candidate slots.</li>
                  <li>Click on the <strong>Interactive Scratch Cards</strong> tool.</li>
                  <li>Open the scratch screen on a tablet, mouse, or touch device.</li>
                  <li>Let contestants scratch the virtual card directly to reveal their anonymous code.</li>
                </ul>
              </div>
              <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                {/* Visual Simulation of Scratch Card */}
                <div style={{ width: '120px', height: '80px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #8E0033, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 800, cursor: 'pointer', border: '2px dashed rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
                  Scratch Here!
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>Auto-reveals once 40% is scratched.</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cards" && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>💳 Participant ID Cards</h3>
              <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>NEW FEATURE</span>
            </div>
            <p>
              Print beautiful, professional identity cards/passes for contestants directly from the system, formatted automatically for fast laminating.
            </p>
            <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: 'var(--radius-md)', marginTop: '15px' }}>
              <h4 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '0.95rem' }}>⚙️ Printing Procedure:</h4>
              <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Navigate to the <strong>Print ID Cards</strong> panel from the sidebar (or Candidates list).</li>
                <li>Filter by division, category, or specific teams to narrow down the printing list.</li>
                <li>Review the individual cards, which display the contestant photo, chest number, category, team flag color, and assigned programs.</li>
                <li>Press <kbd style={{ background: '#334155', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>Ctrl + P</kbd> to launch print mode (custom stylesheets optimize layout to fit multiple badges per sheet).</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "sorting" && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>📊 Team Priority Sorting</h3>
              <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>NEW FEATURE</span>
            </div>
            <p>
              To encourage balanced competition and ensure minor or weaker teams receive motivation, the system includes a proprietary sorting algorithm that identifies programs where weaker teams have scored high points.
            </p>
            <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: 'var(--radius-md)', marginTop: '15px' }}>
              <h4 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '0.95rem' }}>⚙️ How it works:</h4>
              <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>The system tracks cumulative team scores across all published results.</li>
                <li>When displaying standings, it highlights programs where the bottom-ranked teams succeeded.</li>
                <li>This gives festival leaders strategic guidance on which results to announce first during ceremonies to keep the audience and teams motivated.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "poster" && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ color: 'var(--text-primary)', marginTop: 0 }}>🎨 Poster Customizer</h3>
              <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>NEW FEATURE</span>
            </div>
            <p>
              Design result announcement images and posters visually to share directly on social channels or print.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
              <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '0.95rem' }}>⚙️ How to use:</h4>
                <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Go to <strong>Media Branding</strong> in the sidebar.</li>
                  <li>Upload a custom banner background, logo, or congrats graphic.</li>
                  <li>Set your brand colors (Primary, Secondary, Text) matching your school or sponsor.</li>
                  <li>Preview the dynamic result poster template generated with real candidate details and ranks.</li>
                </ul>
              </div>
              <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.9rem' }}>CONGRATULATIONS</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Oppana (Girls) Junior Results</div>
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--surface-hover)' }}>
                    <span>Rank 1: Fathima</span>
                    <span style={{ color: '#10b981' }}>Grade A</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>Dynamic image rendering with `html-to-image`</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
