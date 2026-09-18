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

// ── Clean, Crisp Olympic Prize Medal (1st Gold, 2nd Silver, 3rd Bronze) ──
function CleanRankMedal({ rank, isGoldBg }: { rank: number; isGoldBg?: boolean }) {
  if (rank === 1) {
    if (isGoldBg) {
      // Inside gold row: Navy medallion with gold border and gold bold "1"
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "38px", height: "42px", flexShrink: 0 }}>
          <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
            {/* Ribbon */}
            <path d="M10 2L18 12L26 2H20L18 6L16 2H10Z" fill="#92400e" />
            {/* Medallion */}
            <circle cx="18" cy="24" r="14" fill="#0f172a" stroke="#ca8a04" strokeWidth="2.4" />
            <circle cx="18" cy="24" r="11" fill="#1e293b" />
            <text x="18" y="29.5" textAnchor="middle" fill="#facc15" fontSize="15" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">
              1
            </text>
          </svg>
        </div>
      );
    } else {
      // Standalone or inside glass row: Shiny Gold Medallion
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "38px", height: "42px", flexShrink: 0 }}>
          <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
            {/* Ribbon */}
            <path d="M10 2L18 12L26 2H20L18 6L16 2H10Z" fill="#eab308" />
            {/* Medallion */}
            <circle cx="18" cy="24" r="14" fill="#facc15" stroke="#fef08a" strokeWidth="2" />
            <circle cx="18" cy="24" r="11" fill="#ca8a04" />
            <text x="18" y="29.5" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">
              1
            </text>
          </svg>
        </div>
      );
    }
  }

  if (rank === 2) {
    // Silver Medallion
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "38px", height: "42px", flexShrink: 0 }}>
        <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
          {/* Ribbon */}
          <path d="M10 2L18 12L26 2H20L18 6L16 2H10Z" fill="#94a3b8" />
          {/* Medallion */}
          <circle cx="18" cy="24" r="14" fill="#e2e8f0" stroke="#f8fafc" strokeWidth="2" />
          <circle cx="18" cy="24" r="11" fill="#64748b" />
          <text x="18" y="29.5" textAnchor="middle" fill="#0f172a" fontSize="15" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">
            2
          </text>
        </svg>
      </div>
    );
  }

  if (rank === 3) {
    // Bronze Medallion
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "38px", height: "42px", flexShrink: 0 }}>
        <svg width="36" height="40" viewBox="0 0 36 40" fill="none">
          {/* Ribbon */}
          <path d="M10 2L18 12L26 2H20L18 6L16 2H10Z" fill="#c2410c" />
          {/* Medallion */}
          <circle cx="18" cy="24" r="14" fill="#ea580c" stroke="#fed7aa" strokeWidth="2" />
          <circle cx="18" cy="24" r="11" fill="#9a3412" />
          <text x="18" y="29.5" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">
            3
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "1.5px solid rgba(255,255,255,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: "0.95rem",
        color: isGoldBg ? "#0f172a" : "#ffffff",
        flexShrink: 0
      }}
    >
      {rank}
    </div>
  );
}

// Slide definition: Dual-category side-by-side OR Full-width General
type ProgramSlide =
  | {
      type: "DUAL_INDIVIDUAL";
      fadhila?: PublishedProgram | null;
      fadheela?: PublishedProgram | null;
    }
  | {
      type: "GENERAL";
      program: PublishedProgram;
    };

export default function TVDisplayClient({
  event,
  settings,
  leaderboard,
  champions,
  publishedPrograms,
  allEvents
}: TVDisplayClientProps) {
  const router = useRouter();

  // Clock
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  // Slide Rotation States
  const [leftIndex, setLeftIndex] = useState(0); // 0: Overall, 1: Category, 2: Kalathilakam
  const [rightIndex, setRightIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fade trigger states for smooth 4s transitions
  const [leftFade, setLeftFade] = useState(true);
  const [rightFade, setRightFade] = useState(true);

  // Clock Timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }).toLowerCase()
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh server data every 12 seconds to pick up newly declared results live
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      router.refresh();
    }, 12000);
    return () => clearInterval(refreshInterval);
  }, [router]);

  // Left Card 4-Second Rotation: (0: Overall -> 1: Category -> 2: Kalathilakam)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setLeftFade(false);
      setTimeout(() => {
        setLeftIndex((prev) => (prev + 1) % 3);
        setLeftFade(true);
      }, 350);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Build Slides Queue:
  // - Individual Programs: Fadhila and Fadheela split side-by-side simultaneously
  // - General Programs: Full-width shift spanning both columns
  const slides = useMemo<ProgramSlide[]>(() => {
    const fadhilaList = publishedPrograms.filter(
      (p) => p.categoryType === "FADHILA" || p.categoryTitle?.toLowerCase().includes("fadhila")
    );
    const fadheelaList = publishedPrograms.filter(
      (p) => p.categoryType === "FADHEELA" || p.categoryTitle?.toLowerCase().includes("fadheela")
    );
    const generalList = publishedPrograms.filter(
      (p) => p.categoryType === "GENERAL" || (!fadhilaList.includes(p) && !fadheelaList.includes(p))
    );

    const slideQueue: ProgramSlide[] = [];

    // Smart pairing: match programs with identical names (e.g. Arabic Song) first
    const usedFadhila = new Set<string>();
    const usedFadheela = new Set<string>();

    fadhilaList.forEach((fa) => {
      const normName = fa.name.trim().toLowerCase();
      const matched = fadheelaList.find(
        (fd) => !usedFadheela.has(fd.id) && fd.name.trim().toLowerCase() === normName
      );
      if (matched) {
        usedFadhila.add(fa.id);
        usedFadheela.add(matched.id);
        slideQueue.push({
          type: "DUAL_INDIVIDUAL",
          fadhila: fa,
          fadheela: matched
        });
      }
    });

    // Pair up remaining individual programs
    const remainingFadhila = fadhilaList.filter((fa) => !usedFadhila.has(fa.id));
    const remainingFadheela = fadheelaList.filter((fd) => !usedFadheela.has(fd.id));
    const maxRemaining = Math.max(remainingFadhila.length, remainingFadheela.length);

    for (let i = 0; i < maxRemaining; i++) {
      slideQueue.push({
        type: "DUAL_INDIVIDUAL",
        fadhila: remainingFadhila.length > 0 ? remainingFadhila[i % remainingFadhila.length] : null,
        fadheela: remainingFadheela.length > 0 ? remainingFadheela[i % remainingFadheela.length] : null
      });
    }

    // Add General programs (full-width single column shift)
    for (const gen of generalList) {
      slideQueue.push({
        type: "GENERAL",
        program: gen
      });
    }

    // Fallback if no categorized items exist
    if (slideQueue.length === 0 && publishedPrograms.length > 0) {
      for (const prog of publishedPrograms) {
        slideQueue.push({
          type: "GENERAL",
          program: prog
        });
      }
    }

    return slideQueue;
  }, [publishedPrograms]);

  // Right Card 4-Second Rotation: Cycles through slides
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(() => {
      setRightFade(false);
      setTimeout(() => {
        setRightIndex((prev) => (prev + 1) % slides.length);
        setRightFade(true);
      }, 350);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  // Keyboard navigation: Spacebar toggles pause, Arrow keys skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setRightIndex((prev) => (prev + 1) % Math.max(1, slides.length));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setRightIndex((prev) => (prev - 1 + slides.length) % Math.max(1, slides.length));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length]);

  const currentSlide = slides[rightIndex] || null;

  // Champions Data for Left Card
  const overall1 = champions.overallChampion || leaderboard[0] || null;
  const overall2 = champions.overallRunnerUp || leaderboard[1] || null;
  const overall3 = champions.overallSecondRunnerUp || leaderboard[2] || null;

  const fadhilaTop = champions.fadhilaTopInstitution || leaderboard[0] || null;
  const fadheelaTop = champions.fadheelaTopInstitution || leaderboard[1] || null;
  const generalTop = champions.generalTopInstitution || leaderboard[0] || null;

  const fadhilaStar = champions.fadhilaStar || null;
  const fadheelaStar = champions.fadheelaStar || null;
  const overallStar = champions.overallStar || null;

  // Helper to render a single sub-column for Fadhila or Fadheela
  const renderCategoryColumn = (
    prog: PublishedProgram | null | undefined,
    categoryName: "FADHILA" | "FADHEELA",
    badgeBg: string,
    badgeColor: string
  ) => {
    if (!prog) {
      return (
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px dashed rgba(255, 255, 255, 0.18)",
            borderRadius: "18px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center"
          }}
        >
          <span
            style={{
              backgroundColor: badgeBg,
              color: badgeColor,
              padding: "3px 12px",
              borderRadius: "9999px",
              fontSize: "0.74rem",
              fontWeight: 900,
              textTransform: "uppercase",
              marginBottom: "12px"
            }}
          >
            {categoryName}
          </span>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
            Awaiting Next Result
          </span>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          minHeight: 0
        }}
      >
        {/* Column Header */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.07)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: "16px",
            padding: "10px 14px",
            marginBottom: "12px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span
              style={{
                backgroundColor: badgeBg,
                color: badgeColor,
                padding: "2px 10px",
                borderRadius: "9999px",
                fontSize: "0.72rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.4px"
              }}
            >
              {categoryName}
            </span>
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.16)",
                color: "#ffffff",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "0.74rem",
                fontWeight: 800,
                fontFamily: "monospace"
              }}
            >
              #{prog.code}
            </span>
          </div>
          <div
            style={{
              fontSize: "1.18rem",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {prog.name}
          </div>
        </div>

        {/* Winners List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, justifyContent: "center" }}>
          {prog.winners.map((w, idx) => {
            const is1st = w.rank === 1;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: is1st ? "#facc15" : "rgba(255, 255, 255, 0.08)",
                  border: is1st ? "none" : "1px solid rgba(255, 255, 255, 0.16)",
                  color: is1st ? "#0f172a" : "#ffffff",
                  borderRadius: "14px",
                  padding: "9px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: is1st ? "0 6px 18px rgba(250, 204, 21, 0.35)" : "none"
                }}
              >
                {/* Left: Medal + Candidate & College */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                  <CleanRankMedal rank={w.rank} isGoldBg={is1st} />
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: "1.02rem",
                        fontWeight: 900,
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {w.name}
                      {w.chestNumber && (
                        <span style={{ fontSize: "0.78rem", fontWeight: 800, opacity: 0.82, marginLeft: "6px" }}>
                          (#{w.chestNumber})
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        color: is1st ? "#451a03" : "rgba(255, 255, 255, 0.72)",
                        marginTop: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {w.college}
                    </div>
                  </div>
                </div>

                {/* Right: Grade Pill & Points */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "8px", flexShrink: 0 }}>
                  {w.grade && (
                    <div
                      style={{
                        backgroundColor: is1st ? "rgba(0, 0, 0, 0.09)" : "rgba(255, 255, 255, 0.15)",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        fontSize: "0.72rem",
                        fontWeight: 800
                      }}
                    >
                      {w.grade}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: "1.45rem",
                      fontWeight: 900,
                      fontFamily: "monospace",
                      lineHeight: 1,
                      minWidth: "26px",
                      textAlign: "right"
                    }}
                  >
                    {w.points}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#1e3a8a",
        backgroundImage: `
          radial-gradient(rgba(255, 255, 255, 0.14) 1.2px, transparent 1.2px),
          linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #1d4ed8 100%)
        `,
        backgroundSize: "22px 22px, 100% 100%",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "22px 30px",
        overflow: "hidden",
        boxSizing: "border-box"
      }}
    >
      {/* ── Decorative Background Sun Rings (Bottom-Left) ── */}
      <div
        style={{
          position: "absolute",
          bottom: "-180px",
          left: "-100px",
          width: "540px",
          height: "540px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #facc15 0%, #facc15 50%, #f43f5e 50%, #f43f5e 72%, #e11d48 72%, #e11d48 100%)",
          filter: "blur(4px)",
          opacity: 0.82,
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      {/* ── Decorative White Asterisks ── */}
      <div
        style={{
          position: "absolute",
          bottom: "190px",
          left: "80px",
          fontSize: "3.5rem",
          color: "rgba(255, 255, 255, 0.85)",
          fontWeight: 900,
          pointerEvents: "none",
          zIndex: 1,
          userSelect: "none"
        }}
      >
        ✱
      </div>

      {/* ── Decorative Botanical Petals (Bottom-Right) ── */}
      <div
        style={{
          position: "absolute",
          bottom: "-20px",
          right: "-20px",
          width: "360px",
          height: "360px",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.75
        }}
      >
        <svg viewBox="0 0 200 200" fill="none" style={{ width: "100%", height: "100%" }}>
          <path d="M120 180C140 150 160 120 170 80C150 95 130 110 115 140" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
          <circle cx="165" cy="85" r="14" fill="#c084fc" />
          <circle cx="145" cy="115" r="12" fill="#e879f9" />
          <circle cx="178" cy="110" r="10" fill="#a855f7" />
          <path d="M140 160C165 155 185 140 190 120" stroke="#16a34a" strokeWidth="3" />
        </svg>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── TOP HEADER BAR ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
          marginBottom: "14px"
        }}
      >
        {/* Left Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.95 }}>
            <span style={{ fontSize: "2.1rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
              Hiya
            </span>
            <span style={{ fontSize: "2.1rem", fontWeight: 900, color: "#facc15", letterSpacing: "-0.5px" }}>
              Fiesta
            </span>
          </div>

          {/* Zone Badge */}
          <div
            style={{
              backgroundColor: "#ef4444",
              color: "#ffffff",
              padding: "5px 14px",
              borderRadius: "9999px",
              fontSize: "0.86rem",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)"
            }}
          >
            {event?.zone?.name || event?.name || "A Zone"}
          </div>

          {/* Vertical Separator */}
          <div style={{ width: "2px", height: "38px", backgroundColor: "rgba(255, 255, 255, 0.28)" }} />

          {/* Venue & Fest Details */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#ffffff", letterSpacing: "0.2px" }}>
              {settings?.venueName || event?.venue || "Thaqwa Arabic College, Andathode"}
            </span>
            <span style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.72)", fontWeight: 600 }}>
              {settings?.festName || "CSWC Hiya Fiesta '26"} · {settings?.festMoto || "Third Edition"}
            </span>
          </div>
        </div>

        {/* Right: Digital Clock & Date */}
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "1.85rem", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>
            {currentTime || "12:00 pm"}
          </div>
          <div style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.75)", fontWeight: 700, marginTop: "3px" }}>
            {currentDate || "Friday, 18 Sept 2026"}
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── MAIN CONTENT (2 CARDS SPLIT: LEFT ~36%, RIGHT ~64%) ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "36% 62%",
          gap: "24px",
          flex: 1,
          position: "relative",
          zIndex: 10,
          minHeight: 0
        }}
      >
        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* ── LEFT CARD: Overall -> Category -> Kalathilakam (Fades in 4s) ── */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1.5px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "24px",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.25)",
            transition: "opacity 0.35s ease",
            opacity: leftFade ? 1 : 0
          }}
        >
          {/* 1. OVERALL CHAMPIONS VIEW */}
          {leftIndex === 0 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#facc15", fontSize: "1.1rem" }}>▶</span>
                  <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "#ffffff", letterSpacing: "0.3px" }}>
                    Overall champions
                  </h2>
                </div>
                <span style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.65)", fontWeight: 700 }}>
                  Category + General
                </span>
              </div>

              {/* Podium Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, justifyContent: "center" }}>
                {/* 1st Place (Gold Highlight) */}
                {overall1 && (
                  <div
                    style={{
                      backgroundColor: "#facc15",
                      color: "#0f172a",
                      borderRadius: "16px",
                      padding: "12px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: "0 6px 18px rgba(250, 204, 21, 0.35)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                      <CleanRankMedal rank={1} isGoldBg />
                      <div style={{ minWidth: 0, overflow: "hidden" }}>
                        <div style={{ fontSize: "1.18rem", fontWeight: 900, lineHeight: 1.15, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {overall1.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#713f12", marginTop: "2px" }}>
                          {overall1.place || "Zone Center"} · Champion
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "12px", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.75rem", fontWeight: 900, lineHeight: 1, fontFamily: "monospace" }}>
                        {overall1.points}
                      </div>
                      <div style={{ fontSize: "0.62rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        POINTS
                      </div>
                    </div>
                  </div>
                )}

                {/* 2nd Place (Glass) */}
                {overall2 && (
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.16)",
                      borderRadius: "16px",
                      padding: "12px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                      <CleanRankMedal rank={2} />
                      <div style={{ minWidth: 0, overflow: "hidden" }}>
                        <div style={{ fontSize: "1.15rem", fontWeight: 900, lineHeight: 1.15, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {overall2.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.72)", marginTop: "2px" }}>
                          {overall2.place || "Zone Center"} · Runner-up
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "12px", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.75rem", fontWeight: 900, lineHeight: 1, fontFamily: "monospace" }}>
                        {overall2.points}
                      </div>
                      <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        POINTS
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Glass) */}
                {overall3 && (
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.16)",
                      borderRadius: "16px",
                      padding: "12px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                      <CleanRankMedal rank={3} />
                      <div style={{ minWidth: 0, overflow: "hidden" }}>
                        <div style={{ fontSize: "1.15rem", fontWeight: 900, lineHeight: 1.15, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {overall3.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.72)", marginTop: "2px" }}>
                          {overall3.place || "Zone Center"} · 2nd Runner-up
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "12px", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.75rem", fontWeight: 900, lineHeight: 1, fontFamily: "monospace" }}>
                        {overall3.points}
                      </div>
                      <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        POINTS
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom mini list (Ranks 4, 5) */}
              {leaderboard.length > 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.12)", marginTop: "8px" }}>
                  {leaderboard.slice(3, 5).map((team, idx) => (
                    <div key={team.id || idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.78)", fontWeight: 700 }}>
                      <span>{idx + 4}. {team.name}</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 800 }}>{team.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. CATEGORY CHAMPIONS VIEW */}
          {leftIndex === 1 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#facc15", fontSize: "1.1rem" }}>▶</span>
                  <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "#ffffff", letterSpacing: "0.3px" }}>
                    Category champions
                  </h2>
                </div>
                <span style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.65)", fontWeight: 700 }}>
                  Fadhila · Fadheela · General
                </span>
              </div>

              {/* 3 Category Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1, justifyContent: "center" }}>
                {/* Fadhila Champion */}
                <div
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    border: "1.2px solid rgba(255, 255, 255, 0.16)",
                    borderRadius: "18px",
                    padding: "16px 20px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span
                      style={{
                        backgroundColor: "#facc15",
                        color: "#0f172a",
                        padding: "2px 10px",
                        borderRadius: "9999px",
                        fontSize: "0.74rem",
                        fontWeight: 900,
                        textTransform: "uppercase"
                      }}
                    >
                      Fadhila
                    </span>
                    <span style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", lineHeight: 1 }}>
                      {fadhilaTop?.fadhilaPoints || fadhilaTop?.points || 0}
                    </span>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>
                    {fadhilaTop?.name || "—"}
                  </div>
                  <div style={{ fontSize: "0.80rem", color: "rgba(255, 255, 255, 0.68)", fontWeight: 700, marginTop: "2px" }}>
                    {fadhilaTop?.place || "Zone Center"}
                  </div>
                </div>

                {/* Fadheela Champion */}
                <div
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    border: "1.2px solid rgba(255, 255, 255, 0.16)",
                    borderRadius: "18px",
                    padding: "16px 20px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span
                      style={{
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                        padding: "2px 10px",
                        borderRadius: "9999px",
                        fontSize: "0.74rem",
                        fontWeight: 900,
                        textTransform: "uppercase"
                      }}
                    >
                      Fadheela
                    </span>
                    <span style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", lineHeight: 1 }}>
                      {fadheelaTop?.fadheelaPoints || fadheelaTop?.points || 0}
                    </span>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>
                    {fadheelaTop?.name || "—"}
                  </div>
                  <div style={{ fontSize: "0.80rem", color: "rgba(255, 255, 255, 0.68)", fontWeight: 700, marginTop: "2px" }}>
                    {fadheelaTop?.place || "Zone Center"}
                  </div>
                </div>

                {/* General Champion */}
                <div
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    border: "1.2px solid rgba(255, 255, 255, 0.16)",
                    borderRadius: "18px",
                    padding: "16px 20px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span
                      style={{
                        backgroundColor: "#ffffff",
                        color: "#0f172a",
                        padding: "2px 10px",
                        borderRadius: "9999px",
                        fontSize: "0.74rem",
                        fontWeight: 900,
                        textTransform: "uppercase"
                      }}
                    >
                      General
                    </span>
                    <span style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff", lineHeight: 1 }}>
                      {generalTop?.generalPoints || generalTop?.points || 0}
                    </span>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>
                    {generalTop?.name || "—"}
                  </div>
                  <div style={{ fontSize: "0.80rem", color: "rgba(255, 255, 255, 0.68)", fontWeight: 700, marginTop: "2px" }}>
                    {generalTop?.place || "Zone Center"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. KALATHILAKAM VIEW (No candidate photos as specified) */}
          {leftIndex === 2 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#facc15", fontSize: "1.1rem" }}>▶</span>
                  <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "#ffffff", letterSpacing: "0.3px" }}>
                    Kalathilakam
                  </h2>
                </div>
                <span style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.65)", fontWeight: 700 }}>
                  Individual championship
                </span>
              </div>

              {/* Body */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, justifyContent: "center" }}>
                {/* Title indicator */}
                <div style={{ textAlign: "center", color: "#fde047", fontWeight: 900, fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Kalathilakam of the zone
                </div>

                {/* If announced */}
                {fadhilaStar || fadheelaStar || overallStar ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* Fadhila Kalathilakam */}
                    {fadhilaStar && (
                      <div
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          border: "1.2px solid rgba(255, 255, 255, 0.18)",
                          borderRadius: "18px",
                          padding: "16px 20px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "2px 10px", borderRadius: "9999px", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>
                            Fadhila Star · #{fadhilaStar.chestNumber || "—"}
                          </span>
                          <span style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "monospace", color: "#facc15" }}>
                            {fadhilaStar.totalPoints || fadhilaStar.points} PTS
                          </span>
                        </div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>
                          {fadhilaStar.name}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.72)", fontWeight: 700, marginTop: "2px" }}>
                          {fadhilaStar.institutionName || fadhilaStar.teamName} {fadhilaStar.institutionPlace && `(${fadhilaStar.institutionPlace})`}
                        </div>
                      </div>
                    )}

                    {/* Fadheela Kalathilakam */}
                    {fadheelaStar && (
                      <div
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          border: "1.2px solid rgba(255, 255, 255, 0.18)",
                          borderRadius: "18px",
                          padding: "16px 20px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ backgroundColor: "#ef4444", color: "#ffffff", padding: "2px 10px", borderRadius: "9999px", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>
                            Fadheela Star · #{fadheelaStar.chestNumber || "—"}
                          </span>
                          <span style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "monospace", color: "#fca5a5" }}>
                            {fadheelaStar.totalPoints || fadheelaStar.points} PTS
                          </span>
                        </div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.2 }}>
                          {fadheelaStar.name}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.72)", fontWeight: 700, marginTop: "2px" }}>
                          {fadheelaStar.institutionName || fadheelaStar.teamName} {fadheelaStar.institutionPlace && `(${fadheelaStar.institutionPlace})`}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* If awaiting results */
                  <div style={{ textAlign: "center", padding: "30px 0" }}>
                    <div style={{ fontSize: "3rem", fontWeight: 900, color: "rgba(255, 255, 255, 0.6)", lineHeight: 1 }}>
                      —
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.75)", marginTop: "8px" }}>
                      To be announced
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* ── RIGHT CARD: Published Program Results (Fades in 4s) ───────────── */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1.5px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "24px",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.25)",
            transition: "opacity 0.35s ease",
            opacity: rightFade ? 1 : 0,
            minHeight: 0
          }}
        >
          {currentSlide ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", minHeight: 0 }}>
              {/* Top Title Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#facc15", fontSize: "1.1rem" }}>▶</span>
                  <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#ffffff", letterSpacing: "0.2px" }}>
                    {currentSlide.type === "DUAL_INDIVIDUAL"
                      ? "Individual program results"
                      : "General program results"}
                  </h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.80rem", color: "rgba(255, 255, 255, 0.68)", fontWeight: 700 }}>
                    {currentSlide.type === "DUAL_INDIVIDUAL"
                      ? "Fadhila & Fadheela simultaneous"
                      : "Open to all institutions"}
                  </span>
                  <span
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      fontFamily: "monospace"
                    }}
                  >
                    {rightIndex + 1}/{slides.length}
                  </span>
                </div>
              </div>

              {/* ── CASE A: DUAL_INDIVIDUAL (Split Fadhila & Fadheela on same screen) ── */}
              {currentSlide.type === "DUAL_INDIVIDUAL" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    flex: 1,
                    minHeight: 0
                  }}
                >
                  {/* Left Column: Fadhila */}
                  {renderCategoryColumn(currentSlide.fadhila, "FADHILA", "#facc15", "#0f172a")}

                  {/* Right Column: Fadheela */}
                  {renderCategoryColumn(currentSlide.fadheela, "FADHEELA", "#ef4444", "#ffffff")}
                </div>
              )}

              {/* ── CASE B: GENERAL (Full-width shift across both sides) ── */}
              {currentSlide.type === "GENERAL" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    flex: 1,
                    minHeight: 0
                  }}
                >
                  {/* Program Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.16)",
                      borderRadius: "18px",
                      padding: "12px 18px",
                      marginBottom: "12px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.18)",
                          color: "#ffffff",
                          padding: "4px 12px",
                          borderRadius: "9999px",
                          fontSize: "1.05rem",
                          fontWeight: 900,
                          fontFamily: "monospace",
                          flexShrink: 0
                        }}
                      >
                        #{currentSlide.program.code}
                      </div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.65rem",
                          fontWeight: 900,
                          color: "#ffffff",
                          letterSpacing: "-0.3px",
                          lineHeight: 1.15,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {currentSlide.program.name}
                      </h3>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        padding: "4px 14px",
                        borderRadius: "9999px",
                        fontSize: "0.80rem",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        flexShrink: 0
                      }}
                    >
                      General
                    </div>
                  </div>

                  {/* Full-width Winners 1, 2, 3 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, justifyContent: "center" }}>
                    {currentSlide.program.winners.map((w, idx) => {
                      const is1st = w.rank === 1;
                      return (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: is1st ? "#facc15" : "rgba(255, 255, 255, 0.08)",
                            border: is1st ? "none" : "1px solid rgba(255, 255, 255, 0.16)",
                            color: is1st ? "#0f172a" : "#ffffff",
                            borderRadius: "16px",
                            padding: "12px 18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            boxShadow: is1st ? "0 6px 20px rgba(250, 204, 21, 0.35)" : "none"
                          }}
                        >
                          {/* Left: Medal & Name */}
                          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0, flex: 1 }}>
                            <CleanRankMedal rank={w.rank} isGoldBg={is1st} />
                            <div style={{ minWidth: 0, overflow: "hidden" }}>
                              <div
                                style={{
                                  fontSize: "1.25rem",
                                  fontWeight: 900,
                                  lineHeight: 1.15,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {w.name}
                                {w.chestNumber && (
                                  <span style={{ fontSize: "0.85rem", fontWeight: 800, opacity: 0.82, marginLeft: "8px" }}>
                                    (#{w.chestNumber})
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.84rem",
                                  fontWeight: 700,
                                  color: is1st ? "#451a03" : "rgba(255, 255, 255, 0.72)",
                                  marginTop: "3px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {w.college}
                              </div>
                            </div>
                          </div>

                          {/* Right: Grade & Points */}
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginLeft: "14px", flexShrink: 0 }}>
                            {w.grade && (
                              <div
                                style={{
                                  backgroundColor: is1st ? "rgba(0, 0, 0, 0.09)" : "rgba(255, 255, 255, 0.14)",
                                  padding: "4px 12px",
                                  borderRadius: "9999px",
                                  fontSize: "0.80rem",
                                  fontWeight: 800
                                }}
                              >
                                {w.grade}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: "1.9rem",
                                fontWeight: 900,
                                fontFamily: "monospace",
                                lineHeight: 1,
                                minWidth: "36px",
                                textAlign: "right"
                              }}
                            >
                              {w.points}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Progress dots at bottom of Right Card */}
              {slides.length > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "10px" }}>
                  {slides.slice(0, 15).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i === rightIndex ? "24px" : "6px",
                        height: "6px",
                        borderRadius: "9999px",
                        backgroundColor: i === rightIndex ? "#facc15" : "rgba(255, 255, 255, 0.25)",
                        transition: "all 0.3s ease"
                      }}
                    />
                  ))}
                  {slides.length > 15 && (
                    <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", alignSelf: "center" }}>
                      +{slides.length - 15}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>⏳</div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Awaiting Live Program Results</h3>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", maxWidth: "340px" }}>
                Results will automatically stream and rotate here in published order as soon as they are announced.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── BOTTOM STATUS BAR ── */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
          marginTop: "14px",
          paddingTop: "6px",
          fontSize: "0.82rem",
          color: "rgba(255, 255, 255, 0.75)"
        }}
      >
        {/* Left: Pulsing Live Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#ef4444",
              display: "inline-block",
              boxShadow: "0 0 10px #ef4444",
              animation: "pulse 1.5s infinite"
            }}
          />
          <span style={{ fontWeight: 800, color: "#ffffff", letterSpacing: "0.3px" }}>
            Live results
          </span>
        </div>

        {/* Center: Disclaimer */}
        <div style={{ textAlign: "center", fontWeight: 600, color: "rgba(255, 255, 255, 0.65)" }}>
          Results are provisional until announced from the stage · Appeals close 30 minutes after publication
        </div>

        {/* Right: Pause / Resume Button & Zone Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {allEvents.length > 1 && (
            <select
              value={event?.id}
              onChange={(e) => (window.location.href = `/tv?eventId=${e.target.value}`)}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                padding: "4px 10px",
                borderRadius: "9999px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                outline: "none"
              }}
            >
              {allEvents.map((ev) => (
                <option key={ev.id} value={ev.id} style={{ color: "#000" }}>
                  {ev.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsPaused((p) => !p)}
            style={{
              backgroundColor: isPaused ? "#facc15" : "rgba(255, 255, 255, 0.15)",
              color: isPaused ? "#0f172a" : "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              padding: "4px 18px",
              borderRadius: "9999px",
              fontSize: "0.80rem",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </footer>

      {/* Pulse Keyframe Animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(1.15); }
              100% { opacity: 1; transform: scale(1); }
            }
          `
        }}
      />
    </div>
  );
}
