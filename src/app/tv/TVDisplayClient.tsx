"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface Winner {
  rank: number;
  name: string;
  college?: string;
  place?: string;
  chestNumber?: string | null;
  grade?: string | null;
  points: number;
}

interface PublishedProgram {
  id: string;
  code: string;
  name: string;
  categoryType: "FADHILA" | "FADHEELA" | "GENERAL";
  categoryTitle: string;
  winners: Winner[];
}

interface TVDisplayClientProps {
  event: any;
  settings: any;
  leaderboard: any[];
  champions: {
    overallChampion?: any;
    overallRunnerUp?: any;
    overallSecondRunnerUp?: any;
    fadhilaTopInstitution?: any;
    fadheelaTopInstitution?: any;
    generalTopInstitution?: any;
    fadhilaStar?: any;
    fadheelaStar?: any;
    overallStar?: any;
  };
  publishedPrograms: PublishedProgram[];
  allEvents: any[];
}

// ── Institution Logo / Avatar ──────────────────────────────────────────────
function InstitutionLogo({
  logoUrl,
  name,
  size = 48,
  bg = "#1e3a8a"
}: {
  logoUrl?: string | null;
  name?: string;
  size?: number;
  bg?: string;
}) {
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2.5px solid rgba(255,255,255,0.35)",
          flexShrink: 0,
          background: bg
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: bg,
        border: "2.5px solid rgba(255,255,255,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: size * 0.33,
        color: "#ffffff",
        flexShrink: 0,
        letterSpacing: "-0.5px"
      }}
    >
      {initials}
    </div>
  );
}

// ── Olympic Medal Badge ────────────────────────────────────────────────────
function MedalBadge({ rank, small = false }: { rank: number; small?: boolean }) {
  const sz = small ? 32 : 40;
  const fs = small ? 12 : 14;

  if (rank === 1) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: sz, height: sz + 4, flexShrink: 0 }}>
      <svg width={sz} height={sz + 4} viewBox="0 0 40 44" fill="none">
        <path d="M13 2L20 13L27 2H22L20 7L18 2H13Z" fill="#d97706" />
        <circle cx="20" cy="28" r="14" fill="#fbbf24" stroke="#fef3c7" strokeWidth="2" />
        <circle cx="20" cy="28" r="10" fill="#d97706" />
        <text x="20" y="32.5" textAnchor="middle" fill="#fff" fontSize={fs + 1} fontWeight="900" fontFamily="system-ui">1</text>
      </svg>
    </div>
  );

  if (rank === 2) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: sz, height: sz + 4, flexShrink: 0 }}>
      <svg width={sz} height={sz + 4} viewBox="0 0 40 44" fill="none">
        <path d="M13 2L20 13L27 2H22L20 7L18 2H13Z" fill="#94a3b8" />
        <circle cx="20" cy="28" r="14" fill="#e2e8f0" stroke="#f8fafc" strokeWidth="2" />
        <circle cx="20" cy="28" r="10" fill="#64748b" />
        <text x="20" y="32.5" textAnchor="middle" fill="#fff" fontSize={fs} fontWeight="900" fontFamily="system-ui">2</text>
      </svg>
    </div>
  );

  if (rank === 3) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: sz, height: sz + 4, flexShrink: 0 }}>
      <svg width={sz} height={sz + 4} viewBox="0 0 40 44" fill="none">
        <path d="M13 2L20 13L27 2H22L20 7L18 2H13Z" fill="#c2410c" />
        <circle cx="20" cy="28" r="14" fill="#f97316" stroke="#fed7aa" strokeWidth="2" />
        <circle cx="20" cy="28" r="10" fill="#9a3412" />
        <text x="20" y="32.5" textAnchor="middle" fill="#fff" fontSize={fs} fontWeight="900" fontFamily="system-ui">3</text>
      </svg>
    </div>
  );

  return (
    <div style={{ width: small ? 28 : 36, height: small ? 28 : 36, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.9rem", color: "#ffffff", flexShrink: 0 }}>
      {rank}
    </div>
  );
}

// ── Trophy SVG Icon ────────────────────────────────────────────────────────
function TrophyIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 2h12v8a6 6 0 01-12 0V2z" fill="#facc15" />
      <path d="M6 4H3a2 2 0 000 4h3" stroke="#d97706" strokeWidth="1.5" />
      <path d="M18 4h3a2 2 0 010 4h-3" stroke="#d97706" strokeWidth="1.5" />
      <path d="M12 16v3" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 22h8" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 19h6" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Star SVG ───────────────────────────────────────────────────────────────
function StarIcon({ color = "#facc15", size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l2.9 8.5H23l-7.2 5.2 2.9 8.8L12 19.1l-6.7 5.4 2.9-8.8L1 8.5h8.1z" />
    </svg>
  );
}

// ── Program Results Column for Fadhila / Fadheela side-by-side ─────────────
function ProgramColumn({
  prog,
  categoryName,
  badgeBg,
  badgeColor,
  compact = false
}: {
  prog: PublishedProgram | null | undefined;
  categoryName: string;
  badgeBg: string;
  badgeColor: string;
  compact?: boolean;
}) {
  if (!prog) return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.18)", borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
      <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: "3px 12px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase", marginBottom: 12 }}>
        {categoryName}
      </span>
      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>Awaiting result</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: compact ? "8px 12px" : "10px 14px", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: "2px 10px", borderRadius: 9999, fontSize: "0.70rem", fontWeight: 900, textTransform: "uppercase" }}>
            {categoryName}
          </span>
          <span style={{ backgroundColor: "rgba(255,255,255,0.16)", color: "#fff", padding: "2px 8px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 800, fontFamily: "monospace" }}>
            #{prog.code}
          </span>
        </div>
        <div style={{ fontSize: compact ? "1.0rem" : "1.12rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prog.name}
        </div>
      </div>

      {/* Winners */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, justifyContent: "center" }}>
        {prog.winners.map((w, i) => {
          const is1 = w.rank === 1;
          return (
            <div key={i} style={{ backgroundColor: is1 ? "#facc15" : "rgba(255,255,255,0.08)", border: is1 ? "none" : "1px solid rgba(255,255,255,0.14)", color: is1 ? "#0f172a" : "#ffffff", borderRadius: 12, padding: compact ? "8px 10px" : "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: is1 ? "0 4px 16px rgba(250,204,21,0.35)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                <MedalBadge rank={w.rank} small />
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontSize: compact ? "0.88rem" : "0.96rem", fontWeight: 900, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.name}
                    {w.chestNumber && <span style={{ fontSize: "0.72rem", fontWeight: 800, opacity: 0.8, marginLeft: 5 }}>#{w.chestNumber}</span>}
                  </div>
                  <div style={{ fontSize: "0.70rem", fontWeight: 700, color: is1 ? "#451a03" : "rgba(255,255,255,0.7)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.college}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6, flexShrink: 0 }}>
                {w.grade && <span style={{ backgroundColor: is1 ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.15)", padding: "2px 7px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800 }}>{w.grade}</span>}
                <span style={{ fontSize: "1.3rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>{w.points}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main TV Display Component ──────────────────────────────────────────────
export default function TVDisplayClient({
  event, settings, leaderboard, champions, publishedPrograms, allEvents
}: TVDisplayClientProps) {
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [leftIndex, setLeftIndex] = useState(0);    // 0: Overall, 1: Category, 2: Kalathilakam
  const [rightIndex, setRightIndex] = useState(0);  // index into slides[]
  const [isPaused, setIsPaused] = useState(false);
  const [leftFade, setLeftFade] = useState(true);
  const [rightFade, setRightFade] = useState(true);

  // Clock
  useEffect(() => {
    const upd = () => {
      const n = new Date();
      setCurrentTime(n.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase());
      setCurrentDate(n.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" }));
    };
    upd();
    const id = setInterval(upd, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-refresh live data every 12 seconds
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 12000);
    return () => clearInterval(id);
  }, [router]);

  // Left card 4s rotation
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setLeftFade(false);
      setTimeout(() => { setLeftIndex(p => (p + 1) % 3); setLeftFade(true); }, 380);
    }, 4000);
    return () => clearInterval(id);
  }, [isPaused]);

  // Build slide queue:
  //  - Pair Fadhila + Fadheela programs side-by-side (DUAL slide)
  //  - General programs full-width (GENERAL slide)
  const slides = useMemo(() => {
    const fadhila = publishedPrograms.filter(p => p.categoryType === "FADHILA");
    const fadheela = publishedPrograms.filter(p => p.categoryType === "FADHEELA");
    const general = publishedPrograms.filter(p => p.categoryType === "GENERAL");

    const out: Array<
      | { type: "DUAL"; fadhila?: PublishedProgram; fadheela?: PublishedProgram }
      | { type: "GENERAL"; prog: PublishedProgram }
    > = [];

    // Smart-match programs by name first
    const usedFa = new Set<string>();
    const usedFd = new Set<string>();
    fadhila.forEach(fa => {
      const match = fadheela.find(fd => !usedFd.has(fd.id) && fd.name.trim().toLowerCase() === fa.name.trim().toLowerCase());
      if (match) { usedFa.add(fa.id); usedFd.add(match.id); out.push({ type: "DUAL", fadhila: fa, fadheela: match }); }
    });
    // Remaining unmatched
    const remFa = fadhila.filter(f => !usedFa.has(f.id));
    const remFd = fadheela.filter(f => !usedFd.has(f.id));
    const maxRem = Math.max(remFa.length, remFd.length);
    for (let i = 0; i < maxRem; i++) {
      out.push({ type: "DUAL", fadhila: remFa[i] || undefined, fadheela: remFd[i] || undefined });
    }
    // General programs
    general.forEach(g => out.push({ type: "GENERAL", prog: g }));

    // Fallback: show any programs
    if (out.length === 0) {
      publishedPrograms.forEach(p => out.push({ type: "GENERAL", prog: p }));
    }
    return out;
  }, [publishedPrograms]);

  // Right card 5s rotation through slides
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const id = setInterval(() => {
      setRightFade(false);
      setTimeout(() => { setRightIndex(p => (p + 1) % slides.length); setRightFade(true); }, 380);
    }, 5000);
    return () => clearInterval(id);
  }, [isPaused, slides.length]);

  // Keyboard nav
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setIsPaused(p => !p); }
      else if (e.code === "ArrowRight") { e.preventDefault(); setRightIndex(p => (p + 1) % Math.max(1, slides.length)); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); setRightIndex(p => (p - 1 + slides.length) % Math.max(1, slides.length)); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [slides.length]);

  const currentSlide = slides[rightIndex] || null;

  const overall1 = champions.overallChampion || leaderboard[0] || null;
  const overall2 = champions.overallRunnerUp || leaderboard[1] || null;
  const overall3 = champions.overallSecondRunnerUp || leaderboard[2] || null;
  const fadhilaTop = champions.fadhilaTopInstitution || null;
  const fadheelaTop = champions.fadheelaTopInstitution || null;
  const generalTop = champions.generalTopInstitution || null;
  const fadhilaStar = champions.fadhilaStar || null;
  const fadheelaStar = champions.fadheelaStar || null;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#0f172a", backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column", padding: "18px 28px", overflow: "hidden", boxSizing: "border-box" }}>

      {/* ── Decorative background elements ── */}
      <div style={{ position: "absolute", bottom: -200, left: -120, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, #facc15 0%, #facc15 46%, #f43f5e 46%, #f43f5e 70%, #e11d48 70%)", filter: "blur(6px)", opacity: 0.75, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: -60, right: -60, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ════ HEADER ════ */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ lineHeight: 0.95 }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>Hiya</div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#facc15", letterSpacing: "-0.5px" }}>Fiesta</div>
          </div>
          <div style={{ backgroundColor: "#ef4444", color: "#fff", padding: "5px 14px", borderRadius: 9999, fontSize: "0.84rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, boxShadow: "0 2px 8px rgba(239,68,68,0.4)" }}>
            {event?.zone?.name || event?.name || "A Zone"}
          </div>
          <div style={{ width: 2, height: 36, backgroundColor: "rgba(255,255,255,0.25)" }} />
          <div>
            <div style={{ fontSize: "1.0rem", fontWeight: 800, color: "#ffffff" }}>{settings?.venueName || event?.venue || "Thaqwa Arabic College, Andathode"}</div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{settings?.festName || "CSWC Hiya Fiesta '26"} · {settings?.festMoto || "Third Edition"}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1 }}>{currentTime || "12:00 pm"}</div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.72)", fontWeight: 700, marginTop: 3 }}>{currentDate || "Friday, 18 Sept 2026"}</div>
        </div>
      </header>

      {/* ════ MAIN CONTENT ════ */}
      <main style={{ display: "grid", gridTemplateColumns: "37% 61%", gap: 22, flex: 1, position: "relative", zIndex: 10, minHeight: 0 }}>

        {/* ── LEFT CARD (Champions & Kalathilakam, 4s fade) ── */}
        <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 26, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: "18px 20px", display: "flex", flexDirection: "column", boxShadow: "0 16px 40px rgba(0,0,0,0.3)", transition: "opacity 0.38s ease", opacity: leftFade ? 1 : 0, minHeight: 0 }}>

          {/* ── SLIDE 0: OVERALL CHAMPIONS (Trophy design) ── */}
          {leftIndex === 0 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ backgroundColor: "#facc15", borderRadius: 12, padding: "6px 8px", display: "flex", alignItems: "center", boxShadow: "0 4px 12px rgba(250,204,21,0.45)" }}>
                    <TrophyIcon size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.70rem", fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1 }}>Overall</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#ffffff", lineHeight: 1, letterSpacing: "-0.2px" }}>Champions</div>
                  </div>
                </div>
                <div style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "4px 12px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 900, letterSpacing: 0.5, boxShadow: "0 2px 8px rgba(250,204,21,0.4)" }}>
                  GRAND TROPHY
                </div>
              </div>

              {/* Champion cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
                {/* 1st – Grand Champion */}
                {overall1 && (
                  <div style={{ background: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #fbbf24 100%)", borderRadius: 18, padding: "14px 16px", boxShadow: "0 8px 24px rgba(251,191,36,0.4)", border: "1.5px solid rgba(255,255,255,0.25)" }}>
                    <div style={{ fontSize: "0.62rem", fontWeight: 900, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Grand Champion</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <InstitutionLogo logoUrl={overall1.logoUrl} name={overall1.name} size={52} bg="#92400e" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
                          {overall1.name}
                        </div>
                        <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                          📍 {overall1.place || "Zone Center"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 1, color: "#ffffff", textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>{overall1.points}</div>
                        <div style={{ fontSize: "0.58rem", fontWeight: 900, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.8 }}>POINTS</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2nd */}
                {overall2 && (
                  <div style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 16, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <MedalBadge rank={2} />
                    <InstitutionLogo logoUrl={overall2.logoUrl} name={overall2.name} size={36} bg="#334155" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1.0rem", fontWeight: 900, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{overall2.name}</div>
                      <div style={{ fontSize: "0.70rem", color: "rgba(255,255,255,0.65)", fontWeight: 700, marginTop: 1 }}>{overall2.place || "Zone Center"} · Runner-up</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.55rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>{overall2.points}</div>
                      <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>PTS</div>
                    </div>
                  </div>
                )}

                {/* 3rd */}
                {overall3 && (
                  <div style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 16, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <MedalBadge rank={3} />
                    <InstitutionLogo logoUrl={overall3.logoUrl} name={overall3.name} size={36} bg="#334155" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1.0rem", fontWeight: 900, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{overall3.name}</div>
                      <div style={{ fontSize: "0.70rem", color: "rgba(255,255,255,0.65)", fontWeight: 700, marginTop: 1 }}>{overall3.place || "Zone Center"} · 2nd Runner-up</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.55rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>{overall3.points}</div>
                      <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>PTS</div>
                    </div>
                  </div>
                )}

                {/* Ranks 4-5 */}
                {leaderboard.length > 3 && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {leaderboard.slice(3, 5).map((t, i) => (
                      <div key={t.id || i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.80rem", color: "rgba(255,255,255,0.72)", fontWeight: 700 }}>
                        <span>{i + 4}. {t.name}</span>
                        <span style={{ fontFamily: "monospace", fontWeight: 800 }}>{t.points}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SLIDE 1: CATEGORY CHAMPIONS ── */}
          {leftIndex === 1 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#facc15", fontSize: "1.1rem" }}>▶</span>
                  <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#ffffff" }}>Category champions</h2>
                </div>
                <span style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>Fadhila · Fadheela · General</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, justifyContent: "center" }}>
                {/* Fadhila */}
                {fadhilaTop && (
                  <div style={{ background: "linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(250,204,21,0.06) 100%)", border: "1.5px solid rgba(250,204,21,0.4)", borderRadius: 18, padding: "13px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "2px 10px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>Fadhila</span>
                      <span style={{ fontSize: "1.7rem", fontWeight: 900, fontFamily: "monospace", color: "#facc15", lineHeight: 1 }}>{fadhilaTop.fadhilaPoints || fadhilaTop.points || 0}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <InstitutionLogo logoUrl={fadhilaTop.logoUrl} name={fadhilaTop.name} size={38} bg="#78350f" />
                      <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>{fadhilaTop.name || "—"}</div>
                        <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>{fadhilaTop.place || "Zone Center"}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fadheela */}
                {fadheelaTop && (
                  <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.06) 100%)", border: "1.5px solid rgba(239,68,68,0.4)", borderRadius: 18, padding: "13px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ backgroundColor: "#ef4444", color: "#fff", padding: "2px 10px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>Fadheela</span>
                      <span style={{ fontSize: "1.7rem", fontWeight: 900, fontFamily: "monospace", color: "#fca5a5", lineHeight: 1 }}>{fadheelaTop.fadheelaPoints || fadheelaTop.points || 0}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <InstitutionLogo logoUrl={fadheelaTop.logoUrl} name={fadheelaTop.name} size={38} bg="#7f1d1d" />
                      <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>{fadheelaTop.name || "—"}</div>
                        <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>{fadheelaTop.place || "Zone Center"}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* General */}
                {generalTop && (
                  <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.06) 100%)", border: "1.5px solid rgba(16,185,129,0.4)", borderRadius: 18, padding: "13px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ backgroundColor: "#10b981", color: "#fff", padding: "2px 10px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>General</span>
                      <span style={{ fontSize: "1.7rem", fontWeight: 900, fontFamily: "monospace", color: "#6ee7b7", lineHeight: 1 }}>{generalTop.generalPoints || generalTop.points || 0}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <InstitutionLogo logoUrl={generalTop.logoUrl} name={generalTop.name} size={38} bg="#064e3b" />
                      <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>{generalTop.name || "—"}</div>
                        <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>{generalTop.place || "Zone Center"}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SLIDE 2: KALATHILAKAM (bold/highlighted) ── */}
          {leftIndex === 2 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "rgba(250,204,21,0.15)", border: "1.5px solid rgba(250,204,21,0.45)", borderRadius: 14, padding: "8px 18px" }}>
                  <StarIcon size={22} color="#facc15" />
                  <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#facc15", letterSpacing: "0.3px" }}>Kalathilakam</span>
                  <StarIcon size={22} color="#facc15" />
                </div>
                <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.6)", fontWeight: 700, marginTop: 5, textTransform: "uppercase", letterSpacing: 1.2 }}>Individual championship · Zone</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
                {fadhilaStar || fadheelaStar ? (
                  <>
                    {/* Fadhila Kalathilakam */}
                    {fadhilaStar && (
                      <div style={{ background: "linear-gradient(135deg, #78350f 0%, #d97706 60%, #fbbf24 100%)", borderRadius: 20, padding: "16px 18px", boxShadow: "0 8px 28px rgba(251,191,36,0.35)", border: "1.5px solid rgba(255,255,255,0.25)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <StarIcon size={18} color="#fff" />
                            <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "rgba(255,255,255,0.9)", textTransform: "uppercase", letterSpacing: 1 }}>Fadhila Star</span>
                          </div>
                          <span style={{ backgroundColor: "rgba(0,0,0,0.25)", color: "#fff", padding: "2px 10px", borderRadius: 9999, fontSize: "0.70rem", fontWeight: 900 }}>
                            #{fadhilaStar.chestNumber || "—"}
                          </span>
                        </div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.25)", marginBottom: 4 }}>
                          {fadhilaStar.name}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
                            {fadhilaStar.institutionName || fadhilaStar.teamName} {fadhilaStar.institutionPlace && `· ${fadhilaStar.institutionPlace}`}
                          </span>
                          <span style={{ fontSize: "1.55rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
                            {fadhilaStar.totalPoints || fadhilaStar.points} <span style={{ fontSize: "0.65rem", fontWeight: 800, opacity: 0.85 }}>PTS</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Fadheela Kalathilakam */}
                    {fadheelaStar && (
                      <div style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 60%, #f87171 100%)", borderRadius: 20, padding: "16px 18px", boxShadow: "0 8px 28px rgba(239,68,68,0.35)", border: "1.5px solid rgba(255,255,255,0.25)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <StarIcon size={18} color="#fff" />
                            <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "rgba(255,255,255,0.9)", textTransform: "uppercase", letterSpacing: 1 }}>Fadheela Star</span>
                          </div>
                          <span style={{ backgroundColor: "rgba(0,0,0,0.25)", color: "#fff", padding: "2px 10px", borderRadius: 9999, fontSize: "0.70rem", fontWeight: 900 }}>
                            #{fadheelaStar.chestNumber || "—"}
                          </span>
                        </div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.25)", marginBottom: 4 }}>
                          {fadheelaStar.name}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
                            {fadheelaStar.institutionName || fadheelaStar.teamName} {fadheelaStar.institutionPlace && `· ${fadheelaStar.institutionPlace}`}
                          </span>
                          <span style={{ fontSize: "1.55rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
                            {fadheelaStar.totalPoints || fadheelaStar.points} <span style={{ fontSize: "0.65rem", fontWeight: 800, opacity: 0.85 }}>PTS</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(255,255,255,0.55)" }}>
                    <StarIcon size={48} color="rgba(255,255,255,0.2)" />
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 12 }}>To be announced</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Left card dot indicators */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} onClick={() => setLeftIndex(i)} style={{ width: i === leftIndex ? 22 : 7, height: 7, borderRadius: 9999, backgroundColor: i === leftIndex ? "#facc15" : "rgba(255,255,255,0.25)", transition: "all 0.3s ease", cursor: "pointer" }} />
            ))}
          </div>
        </div>

        {/* ── RIGHT CARD (Program Results, 5s fade) ── */}
        <div style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 26, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: "18px 22px", display: "flex", flexDirection: "column", boxShadow: "0 16px 40px rgba(0,0,0,0.3)", transition: "opacity 0.38s ease", opacity: rightFade ? 1 : 0, minHeight: 0 }}>

          {currentSlide ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              {/* Right card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#facc15", fontSize: "1.05rem" }}>▶</span>
                  <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "#ffffff" }}>
                    {currentSlide.type === "DUAL" ? "Individual program results" : "General program results"}
                  </h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {currentSlide.type === "DUAL" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "2px 8px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 900 }}>Fadhila</span>
                      <span style={{ backgroundColor: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 900 }}>Fadheela</span>
                    </div>
                  )}
                  {currentSlide.type === "GENERAL" && (
                    <span style={{ backgroundColor: "#10b981", color: "#fff", padding: "2px 8px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 900 }}>General · All institutions</span>
                  )}
                  <span style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#fff", padding: "2px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800, fontFamily: "monospace" }}>
                    {rightIndex + 1}/{slides.length}
                  </span>
                </div>
              </div>

              {/* ── DUAL: Fadhila | Fadheela side by side ── */}
              {currentSlide.type === "DUAL" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
                  <ProgramColumn prog={currentSlide.fadhila} categoryName="FADHILA" badgeBg="#facc15" badgeColor="#0f172a" />
                  <ProgramColumn prog={currentSlide.fadheela} categoryName="FADHEELA" badgeBg="#ef4444" badgeColor="#ffffff" />
                </div>
              )}

              {/* ── GENERAL: Full-width ── */}
              {currentSlide.type === "GENERAL" && (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                  {/* Program header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(16,185,129,0.1)", border: "1.5px solid rgba(16,185,129,0.35)", borderRadius: 16, padding: "11px 16px", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <span style={{ backgroundColor: "rgba(255,255,255,0.16)", color: "#fff", padding: "4px 12px", borderRadius: 9999, fontSize: "1.0rem", fontWeight: 900, fontFamily: "monospace", flexShrink: 0 }}>
                        #{currentSlide.prog.code}
                      </span>
                      <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {currentSlide.prog.name}
                      </h3>
                    </div>
                    <span style={{ backgroundColor: "#10b981", color: "#fff", padding: "4px 14px", borderRadius: 9999, fontSize: "0.76rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>
                      General
                    </span>
                  </div>

                  {/* General winners full-width */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
                    {currentSlide.prog.winners.map((w, i) => {
                      const is1 = w.rank === 1;
                      return (
                        <div key={i} style={{ backgroundColor: is1 ? "#facc15" : "rgba(255,255,255,0.08)", border: is1 ? "none" : "1px solid rgba(255,255,255,0.15)", color: is1 ? "#0f172a" : "#ffffff", borderRadius: 16, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: is1 ? "0 6px 20px rgba(250,204,21,0.38)" : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                            <MedalBadge rank={w.rank} />
                            <div style={{ minWidth: 0, overflow: "hidden" }}>
                              <div style={{ fontSize: "1.18rem", fontWeight: 900, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {w.name}
                                {w.chestNumber && <span style={{ fontSize: "0.82rem", opacity: 0.82, marginLeft: 8 }}>#{w.chestNumber}</span>}
                              </div>
                              <div style={{ fontSize: "0.80rem", fontWeight: 700, color: is1 ? "#451a03" : "rgba(255,255,255,0.7)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {w.college}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 12, flexShrink: 0 }}>
                            {w.grade && <span style={{ backgroundColor: is1 ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.14)", padding: "3px 10px", borderRadius: 9999, fontSize: "0.76rem", fontWeight: 800 }}>{w.grade}</span>}
                            <span style={{ fontSize: "1.85rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 1, minWidth: 32, textAlign: "right" }}>{w.points}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Progress dots */}
              {slides.length > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
                  {slides.slice(0, 18).map((_, i) => (
                    <div key={i} onClick={() => setRightIndex(i)} style={{ width: i === rightIndex ? 22 : 6, height: 6, borderRadius: 9999, backgroundColor: i === rightIndex ? "#facc15" : "rgba(255,255,255,0.22)", transition: "all 0.3s ease", cursor: "pointer" }} />
                  ))}
                  {slides.length > 18 && <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", alignSelf: "center" }}>+{slides.length - 18}</span>}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: 12, opacity: 0.6 }}>⏳</div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>Awaiting Live Program Results</h3>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", maxWidth: 340, marginTop: 8 }}>
                Results will automatically stream and rotate here as they are published.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ════ FOOTER STATUS BAR ════ */}
      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10, marginTop: 12, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block", boxShadow: "0 0 10px #ef4444", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontWeight: 800, color: "#ffffff", fontSize: "0.82rem" }}>Live results</span>
        </div>
        <div style={{ textAlign: "center", fontWeight: 600, color: "rgba(255,255,255,0.58)", fontSize: "0.74rem" }}>
          Results are provisional until announced from stage · Appeals close 30 minutes after publication
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {allEvents.length > 1 && (
            <select value={event?.id} onChange={e => (window.location.href = `/tv?eventId=${e.target.value}`)} style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "4px 10px", borderRadius: 9999, fontSize: "0.74rem", fontWeight: 700, cursor: "pointer", outline: "none" }}>
              {allEvents.map(ev => <option key={ev.id} value={ev.id} style={{ color: "#000" }}>{ev.name}</option>)}
            </select>
          )}
          <button onClick={() => setIsPaused(p => !p)} style={{ backgroundColor: isPaused ? "#facc15" : "rgba(255,255,255,0.14)", color: isPaused ? "#0f172a" : "#fff", border: "1px solid rgba(255,255,255,0.22)", padding: "4px 16px", borderRadius: 9999, fontSize: "0.76rem", fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse { 0% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.15); } 100% { opacity:1; transform:scale(1); } }` }} />
    </div>
  );
}
