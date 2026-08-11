import Link from "next/link";

export default function DemoGuidePage() {
  return (
    <div style={{ padding: '4rem 1.5rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-1px' }}>
          Interactive Demo Guide
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#94a3b8', lineHeight: 1.6 }}>
          Welcome to the CSWC Hiya Fiesta System Demo. Here you can explore the automated features without altering live data.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Interactive Experience Guide */}
        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(249,115,22,0.3)', borderRadius: '16px', display: 'flex', gap: '2rem', alignItems: 'center', boxShadow: '0 10px 30px -10px rgba(249,115,22,0.2)' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Interactive Demo Wizard <span style={{ fontSize: '0.8rem', padding: '4px 8px', background: '#f97316', borderRadius: '20px', fontWeight: 800 }}>NEW</span>
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Create a custom live festival preview right now! Input your own fest name, program, and candidates to instantly see the generated ID cards, point tables, and posters in action.
            </p>
            <Link href="/demo/experience" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: 'linear-gradient(45deg, #f97316, #ea580c)', color: '#fff', fontWeight: 600, borderRadius: '8px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(249,115,22,0.4)' }}>
              Launch Interactive Demo &rarr;
            </Link>
          </div>
          <div style={{ flex: 1, height: '200px', background: 'linear-gradient(45deg, rgba(249,115,22,0.1), rgba(234,88,12,0.2))', borderRadius: '12px', border: '1px dashed rgba(249,115,22,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '4rem' }}>🚀</span>
          </div>
        </div>
        {/* Results Guide */}
        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>Live Results & Leaderboards</h2>
            <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Experience the adrenaline of real-time point tracking. The system automatically calculates overall standings based on first, second, and third placements across diverse programs.
            </p>
            <Link href="/demo/results" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: '#fff', fontWeight: 600, borderRadius: '8px', textDecoration: 'none' }}>
              View Results Demo &rarr;
            </Link>
          </div>
          <div style={{ flex: 1, height: '200px', background: 'linear-gradient(45deg, rgba(37,99,235,0.2), rgba(56,189,248,0.2))', borderRadius: '12px', border: '1px dashed rgba(56,189,248,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '4rem' }}>📊</span>
          </div>
        </div>

        {/* Poster Guide */}
        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', gap: '2rem', alignItems: 'center', flexDirection: 'row-reverse' }}>
           <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>Automated Posters</h2>
            <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Stop using complex design software for every result. The system instantly generates stunning, social-media-ready winner posters the moment a result is published.
            </p>
            <Link href="/demo/poster" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 600, borderRadius: '8px', textDecoration: 'none' }}>
              View Poster Demo &rarr;
            </Link>
          </div>
          <div style={{ flex: 1, height: '200px', background: 'linear-gradient(45deg, rgba(139,92,246,0.2), rgba(192,132,252,0.2))', borderRadius: '12px', border: '1px dashed rgba(192,132,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '4rem' }}>🖼️</span>
          </div>
        </div>

        {/* ID Card Guide */}
        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>Smart ID Cards</h2>
            <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Generate participant and team manager ID cards in bulk. Features QR code integration for quick scanning and verification at venues.
            </p>
            <Link href="/demo/idcard" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: '#fff', fontWeight: 600, borderRadius: '8px', textDecoration: 'none' }}>
              View ID Card Demo &rarr;
            </Link>
          </div>
          <div style={{ flex: 1, height: '200px', background: 'linear-gradient(45deg, rgba(16,185,129,0.2), rgba(52,211,153,0.2))', borderRadius: '12px', border: '1px dashed rgba(52,211,153,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '4rem' }}>🪪</span>
          </div>
        </div>

      </div>
    </div>
  );
}
