"use client";

export default function DemoIDCardPage() {
  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-1px' }}>Smart ID Cards</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Instantly generate scannable, high-quality ID cards for participants, team managers, and staff members.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', justifyContent: 'center' }}>
        
        {/* Participant ID Card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: '240px', 
            height: '380px', 
            background: '#ffffff', 
            borderRadius: '16px', 
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', padding: '1rem', textAlign: 'center', color: '#fff' }}>
              <div style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '0.9rem' }}>CSWC Hiya Fiesta '26</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>PARTICIPANT</div>
            </div>
            
            <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', marginBottom: '1rem', border: '3px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                👨‍🎓
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}>Ayaan R.</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Team Alpha</p>
              
              <div style={{ marginTop: 'auto', width: '100%', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Mock QR Code */}
                <div style={{ width: '60px', height: '60px', background: 'repeating-linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%, #0f172a), repeating-linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%, #0f172a)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px', borderRadius: '4px', opacity: 0.8 }}></div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', letterSpacing: '1px' }}>ID: CSWC-1042</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              Print Participant ID
            </button>
          </div>
        </div>

        {/* Manager ID Card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: '240px', 
            height: '380px', 
            background: '#ffffff', 
            borderRadius: '16px', 
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)', padding: '1rem', textAlign: 'center', color: '#fff' }}>
              <div style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '0.9rem' }}>CSWC Hiya Fiesta '26</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>TEAM MANAGER</div>
            </div>
            
            <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', marginBottom: '1rem', border: '3px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                👩‍💼
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}>Sarah K.</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 700 }}>Team Delta (Manager)</p>
              
              <div style={{ marginTop: 'auto', width: '100%', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Mock QR Code */}
                <div style={{ width: '60px', height: '60px', background: 'repeating-linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%, #0f172a), repeating-linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%, #0f172a)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px', borderRadius: '4px', opacity: 0.8 }}></div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', letterSpacing: '1px' }}>ID: CSWC-M-04</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              Print Manager ID
            </button>
          </div>
        </div>

      </div>

      <div style={{ marginTop: '4rem', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <h3 style={{ color: '#fff', fontSize: '1.25rem', margin: '0 0 1rem 0' }}>Bulk Printing Made Easy</h3>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '600px', marginInline: 'auto' }}>
          Select all participants in a team and generate a single PDF document perfectly formatted for standard ID card printers (CR80 size).
        </p>
        <button style={{ padding: '0.875rem 2rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
          Simulate Bulk Export
        </button>
      </div>
    </div>
  );
}
