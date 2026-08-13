const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/radial-gradient\(circle at top right, #1e1b4b, #0f172a\)/g, 'linear-gradient(135deg, #f8fafc, #ffffff)');
c = c.replace(/color: 'white'/g, "color: '#0f172a'");
c = c.replace(/rgba\(15, 23, 42, 0\.4\)/g, 'rgba(255, 255, 255, 0.8)');
c = c.replace(/rgba\(255,255,255,0\.05\)/g, 'rgba(0,0,0,0.05)');
c = c.replace(/rgba\(255,255,255,0\.02\)/g, 'rgba(0,0,0,0.02)');
c = c.replace(/rgba\(255,255,255,0\.03\)/g, 'rgba(0,0,0,0.03)');
c = c.replace(/color: 'var\(--text-secondary\)'/g, "color: '#475569'");
c = c.replace(/color: 'var\(--text-muted\)'/g, "color: '#64748b'");
c = c.replace(/rgba\(15, 23, 42, 0\.6\)/g, 'rgba(241, 245, 249, 1)');

// Smart counters style
c = c.replace(/backgroundColor: 'rgba\(0,0,0,0\.02\)', padding: '8px', borderRadius: 'var\(--radius-sm\)', textAlign: 'center', border: '1px solid rgba\(0,0,0,0\.02\)'/g, 
"backgroundColor: '#ffffff', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'");

fs.writeFileSync('src/app/page.tsx', c);
console.log('Done!');
