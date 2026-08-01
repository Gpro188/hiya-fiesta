'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Calendar, ChevronRight, User, Shield } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="glass-header" style={{ 
      padding: '0.75rem 0', 
      position: 'fixed',
      width: '100%',
      top: 0,
      zIndex: 50
    }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1rem' }}>
              CS
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>CSWC Hiya Fiesta 2026</h1>
              <div style={{ fontSize: '0.68rem', color: '#ec4899', fontWeight: 600 }}>Council of Samastha Women's Colleges</div>
            </div>
          </div>
          
          {/* Desktop Nav */}
          <div className="desktop-nav" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link href="/demo" style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>Explore Demo Fest</Link>
            <Link href="/login" style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none' }}>Client Login</Link>
            <Link href="/super-admin" className="btn-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, borderRadius: '8px', textDecoration: 'none' }}>Admin Panel</Link>
            <ThemeToggle />
          </div>

          {/* Mobile Nav Toggle */}
          <div className="mobile-nav-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ThemeToggle />
            <button onClick={() => setIsOpen(!isOpen)} style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Expanded Menu */}
        {isOpen && (
          <div className="mobile-menu" style={{ paddingTop: '1.5rem', paddingBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/demo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #38bdf8', borderRadius: '12px', color: '#38bdf8', textDecoration: 'none', fontWeight: 600, backgroundColor: 'rgba(56, 189, 248, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={18} /> Explore Demo Fest</div>
              <ChevronRight size={18} />
            </Link>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/login" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.8rem', border: '1px solid var(--border-color-strong)', borderRadius: '12px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                <User size={16} /> Client Login
              </Link>
              <Link href="/super-admin" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.8rem', backgroundColor: '#2563eb', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                <Shield size={16} /> Admin Panel
              </Link>
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .desktop-nav { display: flex !important; }
        .mobile-nav-toggle { display: none !important; }
        .mobile-menu { display: none !important; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav-toggle { display: flex !important; }
          .mobile-menu { display: flex !important; }
        }
      `}} />
    </header>
  );
}
