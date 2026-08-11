"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function HeroCarousel({ slides, fallbackTitle, fallbackSubtitle, primaryColor }: { slides: any[], fallbackTitle: string, fallbackSubtitle: string, primaryColor: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides]);

  if (!slides || slides.length === 0) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--text-primary)' }}>{fallbackTitle}</h2>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)' }}>{fallbackSubtitle}</p>
      </div>
    );
  }

  const slide = slides[currentIndex];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Background Images */}
      {slides.map((s, idx) => (
        <div 
          key={s.id} 
          style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.95)), url(${s.image_url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: idx === currentIndex ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
            zIndex: 1
          }} 
        />
      ))}

      {/* Content */}
      <div className="container" style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '850px' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', backgroundColor: 'rgba(236, 72, 153, 0.15)', border: `1px solid ${primaryColor}40`, color: primaryColor, fontWeight: 700, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          • She Can. She Will. •
        </div>
        
        <h2 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1rem', color: 'white', lineHeight: 1.15, textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          {slide.title || fallbackTitle}
        </h2>
        
        <p style={{ fontSize: '1.25rem', color: '#cbd5e1', marginBottom: '2.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {slide.subtitle || fallbackSubtitle}
        </p>

        {slide.enable_countdown && slide.target_date && (
          <CountdownTimer targetDate={slide.target_date} primaryColor={primaryColor} />
        )}

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
          {slide.cta_link && slide.cta_text && (
            <Link href={slide.cta_link} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', backgroundColor: primaryColor, borderColor: primaryColor, color: 'white', borderRadius: '30px' }}>
              {slide.cta_text}
            </Link>
          )}
        </div>
      </div>

      {/* Dots Indicator */}
      {slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: '2rem', left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 10 }}>
          {slides.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => setCurrentIndex(idx)}
              style={{ 
                width: '10px', height: '10px', borderRadius: '50%', border: 'none', 
                backgroundColor: idx === currentIndex ? primaryColor : 'rgba(255,255,255,0.3)',
                cursor: 'pointer', transition: 'background-color 0.3s'
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CountdownTimer({ targetDate, primaryColor }: { targetDate: string, primaryColor: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;
      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
      {[
        { label: 'DAYS', value: timeLeft.days },
        { label: 'HOURS', value: timeLeft.hours },
        { label: 'MINUTES', value: timeLeft.minutes },
        { label: 'SECONDS', value: timeLeft.seconds }
      ].map(unit => (
        <div key={unit.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', border: `1px solid ${primaryColor}60`, borderRadius: '12px', fontSize: '2rem', fontWeight: 800, color: 'white', backdropFilter: 'blur(4px)' }}>
            {unit.value.toString().padStart(2, '0')}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '6px', fontWeight: 600, letterSpacing: '1px' }}>{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
