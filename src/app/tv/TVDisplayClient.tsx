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
    fadhilaRunnerUpInstitution?: any;
    fadhilaSecondRunnerUpInstitution?: any;
    fadheelaTopInstitution?: any;
    fadheelaRunnerUpInstitution?: any;
    fadheelaSecondRunnerUpInstitution?: any;
    generalTopInstitution?: any;
    generalRunnerUpInstitution?: any;
    generalSecondRunnerUpInstitution?: any;
    fadhilaStar?: any;
    fadheelaStar?: any;
    overallStar?: any;
    fadhilaStars?: any[];
    fadheelaStars?: any[];
  };
  publishedPrograms: PublishedProgram[];
  allEvents: any[];
  zoneInstitutions?: { id: string; name: string; place?: string | null }[];
  initialLocation?: string | null;
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

// ── Category Program Box (Distinct boxes, fillable cards, 3D peel animation) ──
function CategoryProgramBox({
  prog,
  categoryName,
  categoryType,
  peelKey,
  isGeneral = false
}: {
  prog: PublishedProgram | null | undefined;
  categoryName: string;
  categoryType: "FADHILA" | "FADHEELA" | "GENERAL";
  peelKey: number;
  isGeneral?: boolean;
}) {
  const isFadhila = categoryType === "FADHILA";
  const isFadheela = categoryType === "FADHEELA";

  const accentColor = isFadhila ? "#facc15" : isFadheela ? "#ef4444" : "#10b981";
  const borderColor = isFadhila
    ? "rgba(250,204,21,0.45)"
    : isFadheela
    ? "rgba(239,68,68,0.48)"
    : "rgba(16,185,129,0.45)";
  const bgGradient = isFadhila
    ? "linear-gradient(165deg, rgba(250,204,21,0.12) 0%, rgba(15,23,42,0.78) 45%, rgba(15,23,42,0.92) 100%)"
    : isFadheela
    ? "linear-gradient(165deg, rgba(239,68,68,0.12) 0%, rgba(15,23,42,0.78) 45%, rgba(15,23,42,0.92) 100%)"
    : "linear-gradient(165deg, rgba(16,185,129,0.12) 0%, rgba(15,23,42,0.78) 45%, rgba(15,23,42,0.92) 100%)";
  const glowShadow = isFadhila
    ? "0 12px 32px rgba(0,0,0,0.38), 0 0 24px rgba(250,204,21,0.14)"
    : isFadheela
    ? "0 12px 32px rgba(0,0,0,0.38), 0 0 24px rgba(239,68,68,0.14)"
    : "0 12px 32px rgba(0,0,0,0.38), 0 0 24px rgba(16,185,129,0.14)";
  const badgeBg = isFadhila ? "#facc15" : isFadheela ? "#ef4444" : "#10b981";
  const badgeColor = isFadhila ? "#0f172a" : "#ffffff";

  if (!prog) {
    return (
      <div
        key={`empty-${categoryType}-${peelKey}`}
        className="page-peel-card"
        style={{
          background: bgGradient,
          border: `1.5px dashed ${borderColor}`,
          borderRadius: 20,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          boxSizing: "border-box",
          boxShadow: glowShadow,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)"
        }}
      >
        <span
          style={{
            backgroundColor: badgeBg,
            color: badgeColor,
            padding: "4px 14px",
            borderRadius: 9999,
            fontSize: "0.74rem",
            fontWeight: 900,
            textTransform: "uppercase",
            marginBottom: 10,
            letterSpacing: 0.5
          }}
        >
          {categoryName}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.65)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
          <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>Awaiting category results</span>
        </div>
      </div>
    );
  }

  const winners = prog.winners || [];

  return (
    <div
      key={`${prog.id}-${peelKey}`}
      className="page-peel-card"
      style={{
        background: bgGradient,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 20,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        boxShadow: glowShadow,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        minHeight: 0
      }}
    >
      {/* Box Header Banner */}
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 14,
          padding: isGeneral ? "8px 14px" : "7px 12px",
          marginBottom: 8,
          flexShrink: 0
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <span
            style={{
              backgroundColor: badgeBg,
              color: badgeColor,
              padding: "2px 10px",
              borderRadius: 9999,
              fontSize: "0.70rem",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 0.5
            }}
          >
            {categoryName}
          </span>
          <span
            style={{
              backgroundColor: "rgba(255,255,255,0.18)",
              color: "#ffffff",
              padding: "2px 8px",
              borderRadius: 9999,
              fontSize: "0.72rem",
              fontWeight: 900,
              fontFamily: "monospace"
            }}
          >
            #{prog.code}
          </span>
        </div>
        <div
          style={{
            fontSize: isGeneral ? "1.22rem" : "1.08rem",
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

      {/* Fillable Winners List (maximum vertical fill without boring void) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
          minHeight: 0,
          justifyContent: "stretch"
        }}
      >
        {winners.map((w, i) => {
          const is1 = w.rank === 1;
          const is2 = w.rank === 2;

          const rowBg = is1
            ? "linear-gradient(135deg, #facc15 0%, #eab308 50%, #ca8a04 100%)"
            : is2
            ? "linear-gradient(135deg, rgba(241,245,249,0.18) 0%, rgba(148,163,184,0.08) 100%)"
            : "linear-gradient(135deg, rgba(251,146,60,0.18) 0%, rgba(194,65,12,0.08) 100%)";

          const rowBorder = is1
            ? "1px solid rgba(255,255,255,0.6)"
            : is2
            ? "1px solid rgba(226,232,240,0.3)"
            : "1px solid rgba(251,146,60,0.3)";

          const textColor = is1 ? "#0f172a" : "#ffffff";
          const subTextColor = is1 ? "#451a03" : "rgba(255,255,255,0.72)";

          return (
            <div
              key={i}
              className={is1 ? "winner-gold-glow" : ""}
              style={{
                background: rowBg,
                border: rowBorder,
                borderRadius: 12,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: is1 ? "0 6px 20px rgba(250,204,21,0.38)" : "none",
                flex: 1,
                minHeight: 46,
                boxSizing: "border-box"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                <MedalBadge rank={w.rank} small />
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: isGeneral ? "1.02rem" : "0.96rem",
                      fontWeight: 900,
                      lineHeight: 1.15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: textColor
                    }}
                  >
                    {w.name}
                    {w.chestNumber && (
                      <span
                        style={{
                          backgroundColor: is1 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.18)",
                          color: "#ffffff",
                          padding: "1px 6px",
                          borderRadius: 9999,
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          marginLeft: 6
                        }}
                      >
                        #{w.chestNumber}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.70rem",
                      fontWeight: 700,
                      color: subTextColor,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {w.college}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: 6, flexShrink: 0 }}>
                {w.grade && (
                  <span
                    style={{
                      backgroundColor: is1 ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)",
                      border: is1 ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.18)",
                      color: textColor,
                      padding: "2px 7px",
                      borderRadius: 9999,
                      fontSize: "0.68rem",
                      fontWeight: 800
                    }}
                  >
                    {w.grade}
                  </span>
                )}
                <div
                  style={{
                    fontSize: isGeneral ? "1.6rem" : "1.45rem",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    lineHeight: 1,
                    color: textColor
                  }}
                >
                  {w.points}
                </div>
              </div>
            </div>
          );
        })}

        {winners.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.88rem",
              fontWeight: 700
            }}
          >
            Awaiting official results
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main TV Display Component ──────────────────────────────────────────────
export default function TVDisplayClient({
  event, settings, leaderboard, champions, publishedPrograms, allEvents, zoneInstitutions = [], initialLocation
}: TVDisplayClientProps) {
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [leftIndex, setLeftIndex] = useState(0);    // 0: Overall, 1: Category, 2: Kalathilakam
  const [indivIndex, setIndivIndex] = useState(0);
  const [genIndex, setGenIndex] = useState(0);
  const [peelKey, setPeelKey] = useState(0);        // Increments on 5s rotation for 3D page peeling effect
  const [isPaused, setIsPaused] = useState(false);
  const [leftFade, setLeftFade] = useState(true);

  // ── Dynamic Location State & Persistence ──
  const defaultLocation = useMemo(() => {
    if (initialLocation) return initialLocation;
    if (settings?.venueName) return settings.venueName;
    if (event?.venue) return event.venue;
    const zoneName = (event?.zone?.name || event?.name || "").toUpperCase();
    if (zoneName.includes("PALAKKAD")) return "Palakkad Zone Center";
    if (zoneName.includes("THRISSUR")) return "Thaqwa Arabic College, Andathode";
    if (zoneName.includes("MALAPPURAM EAST")) return "Malappuram East Campus";
    if (zoneName.includes("MALAPPURAM WEST")) return "Malappuram West Campus";
    if (zoneName.includes("KOZHIKODE")) return "Kozhikode Zone Campus";
    if (zoneName.includes("KANNUR")) return "Kannur Zone Campus";
    if (zoneName.includes("KASARAGOD")) return "Kasaragod Zone Campus";
    if (zoneName.includes("KARNATAKA")) return "Karnataka Zone Campus";
    return event?.zone?.name ? `${event.zone.name} Campus` : "CSWC Hiya Fiesta Campus";
  }, [event, settings, initialLocation]);

  const [currentLocation, setCurrentLocation] = useState(defaultLocation);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [inputLocation, setInputLocation] = useState(defaultLocation);

  // ── TV Screen Fit & Zoom State ──
  const [zoomMode, setZoomMode] = useState<"auto" | number>("auto");
  const [scaleFactor, setScaleFactor] = useState(1);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(m => (m === msg ? null : m));
    }, 2200);
  };

  useEffect(() => {
    const savedLoc = localStorage.getItem(`cswc_tv_location_${event?.id}`);
    if (savedLoc) {
      setCurrentLocation(savedLoc);
      setInputLocation(savedLoc);
    } else {
      setCurrentLocation(defaultLocation);
      setInputLocation(defaultLocation);
    }
  }, [event?.id, defaultLocation]);

  const handleSaveLocation = (newLoc: string) => {
    const trimmed = newLoc.trim() || defaultLocation;
    setCurrentLocation(trimmed);
    setInputLocation(trimmed);
    localStorage.setItem(`cswc_tv_location_${event?.id}`, trimmed);
    setShowLocationModal(false);
    showToast(`Location set to: ${trimmed}`);
  };

  const handleResetLocation = () => {
    localStorage.removeItem(`cswc_tv_location_${event?.id}`);
    setCurrentLocation(defaultLocation);
    setInputLocation(defaultLocation);
    setShowLocationModal(false);
    showToast("Location reset to default");
  };

  // Load saved zoom mode
  useEffect(() => {
    const savedZoom = localStorage.getItem("cswc_tv_zoom_mode");
    if (savedZoom) {
      if (savedZoom === "auto") {
        setZoomMode("auto");
      } else {
        const val = parseFloat(savedZoom);
        if (!isNaN(val) && val >= 0.5 && val <= 1.4) {
          setZoomMode(val);
        }
      }
    }
  }, []);

  // Responsive dynamic fit calculation for Smart TVs and high/low DPI screens
  useEffect(() => {
    const calcScale = () => {
      if (zoomMode === "auto") {
        const targetW = 1880;
        const targetH = 940;
        const wRatio = window.innerWidth / targetW;
        const hRatio = window.innerHeight / targetH;
        // Scale down if window is smaller; keep capped between 0.60 and 1.05
        const calculated = Math.min(1.0, Math.min(wRatio, hRatio));
        setScaleFactor(Math.max(0.60, Math.min(calculated, 1.05)));
      } else {
        setScaleFactor(zoomMode);
      }
    };

    calcScale();
    window.addEventListener("resize", calcScale);
    return () => window.removeEventListener("resize", calcScale);
  }, [zoomMode]);

  const setZoom = (mode: "auto" | number) => {
    setZoomMode(mode);
    if (mode === "auto") {
      localStorage.setItem("cswc_tv_zoom_mode", "auto");
      showToast("TV Fit: Auto-Fit Mode");
    } else {
      localStorage.setItem("cswc_tv_zoom_mode", mode.toString());
      showToast(`TV Zoom: ${Math.round(mode * 100)}%`);
    }
    setShowZoomMenu(false);
  };

  const adjustZoom = (delta: number) => {
    const current = scaleFactor;
    const next = Math.max(0.60, Math.min(1.30, Math.round((current + delta) * 20) / 20));
    setZoom(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      showToast("Entered Fullscreen");
    } else {
      document.exitFullscreen().catch(() => {});
      showToast("Exited Fullscreen");
    }
  };

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

  // Left card 5s rotation
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setLeftFade(false);
      setTimeout(() => { setLeftIndex(p => (p + 1) % 3); setLeftFade(true); }, 380);
    }, 5000);
    return () => clearInterval(id);
  }, [isPaused]);

  // Build paired individual slides (Fadhila + Fadheela in distinct boxes)
  const indivSlides = useMemo(() => {
    const fadhila = publishedPrograms.filter(p => p.categoryType === "FADHILA");
    const fadheela = publishedPrograms.filter(p => p.categoryType === "FADHEELA");

    const out: Array<{ fadhila?: PublishedProgram; fadheela?: PublishedProgram }> = [];

    const usedFa = new Set<string>();
    const usedFd = new Set<string>();
    fadhila.forEach(fa => {
      const match = fadheela.find(fd => !usedFd.has(fd.id) && fd.name.trim().toLowerCase() === fa.name.trim().toLowerCase());
      if (match) {
        usedFa.add(fa.id);
        usedFd.add(match.id);
        out.push({ fadhila: fa, fadheela: match });
      }
    });

    const remFa = fadhila.filter(f => !usedFa.has(f.id));
    const remFd = fadheela.filter(f => !usedFd.has(f.id));
    const maxRem = Math.max(remFa.length, remFd.length);
    for (let i = 0; i < maxRem; i++) {
      out.push({ fadhila: remFa[i] || undefined, fadheela: remFd[i] || undefined });
    }

    return out;
  }, [publishedPrograms]);

  // General programs list
  const generalPrograms = useMemo(() => {
    return publishedPrograms.filter(p => p.categoryType === "GENERAL");
  }, [publishedPrograms]);

  // 5-second 3D page peeling rotation for individual and general programs
  useEffect(() => {
    if (isPaused) return;
    if (indivSlides.length <= 1 && generalPrograms.length <= 1) return;
    const id = setInterval(() => {
      setPeelKey(k => k + 1);
      if (indivSlides.length > 0) {
        setIndivIndex(p => (p + 1) % indivSlides.length);
      }
      if (generalPrograms.length > 0) {
        setGenIndex(p => (p + 1) % generalPrograms.length);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [isPaused, indivSlides.length, generalPrograms.length]);

  // Keyboard nav & shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        if (e.code === "Escape") {
          setShowLocationModal(false);
          setShowZoomMenu(false);
        }
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPaused(p => !p);
        showToast(isPaused ? "Broadcast Resumed" : "Broadcast Paused");
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setPeelKey(k => k + 1);
        if (indivSlides.length > 0) setIndivIndex(p => (p + 1) % indivSlides.length);
        if (generalPrograms.length > 0) setGenIndex(p => (p + 1) % generalPrograms.length);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setPeelKey(k => k + 1);
        if (indivSlides.length > 0) setIndivIndex(p => (p - 1 + indivSlides.length) % indivSlides.length);
        if (generalPrograms.length > 0) setGenIndex(p => (p - 1 + generalPrograms.length) % generalPrograms.length);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        adjustZoom(0.05);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        adjustZoom(-0.05);
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1.0);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setZoom("auto");
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setShowLocationModal(p => !p);
      } else if (e.code === "Escape") {
        setShowLocationModal(false);
        setShowZoomMenu(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [indivSlides.length, generalPrograms.length, isPaused, scaleFactor]);

  const currentIndiv = indivSlides[indivIndex] || null;
  const currentGen = generalPrograms[genIndex] || null;

  const overall1 = champions.overallChampion || leaderboard[0] || null;
  const overall2 = champions.overallRunnerUp || leaderboard[1] || null;
  const overall3 = champions.overallSecondRunnerUp || leaderboard[2] || null;
  const fadhilaTop = champions.fadhilaTopInstitution || null;
  const fadhilaTop2 = champions.fadhilaRunnerUpInstitution || null;
  const fadhilaTop3 = champions.fadhilaSecondRunnerUpInstitution || null;
  const fadheelaTop = champions.fadheelaTopInstitution || null;
  const fadheelaTop2 = champions.fadheelaRunnerUpInstitution || null;
  const fadheelaTop3 = champions.fadheelaSecondRunnerUpInstitution || null;
  const generalTop = champions.generalTopInstitution || null;
  const generalTop2 = champions.generalRunnerUpInstitution || null;
  const generalTop3 = champions.generalSecondRunnerUpInstitution || null;
  const fadhilaStar = champions.fadhilaStar || null;
  const fadheelaStar = champions.fadheelaStar || null;
  const fadhilaStars: any[] = (champions.fadhilaStars && champions.fadhilaStars.length > 0)
    ? champions.fadhilaStars
    : (fadhilaStar ? [fadhilaStar] : []);
  const fadheelaStars: any[] = (champions.fadheelaStars && champions.fadheelaStars.length > 0)
    ? champions.fadheelaStars
    : (fadheelaStar ? [fadheelaStar] : []);

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#0f172a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Scaled TV broadcast viewport canvas */}
      <div
        style={{
          width: `${(100 / scaleFactor).toFixed(3)}%`,
          height: `${(100 / scaleFactor).toFixed(3)}%`,
          transform: `scale(${scaleFactor})`,
          transformOrigin: "top left",
          backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: "16px 24px",
          overflow: "hidden",
          boxSizing: "border-box",
          position: "relative"
        }}
      >
        {/* ── Decorative background ambient glows ── */}
        <div style={{ position: "absolute", bottom: -200, left: -120, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, #facc15 0%, #facc15 46%, #f43f5e 46%, #f43f5e 70%, #e11d48 70%)", filter: "blur(6px)", opacity: 0.75, pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", top: -60, right: -60, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        {/* ════ HEADER ════ */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ lineHeight: 0.95 }}>
              <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>Hiya</div>
              <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#facc15", letterSpacing: "-0.5px" }}>Fiesta</div>
            </div>
            <div style={{ backgroundColor: "#ef4444", color: "#fff", padding: "5px 14px", borderRadius: 9999, fontSize: "0.82rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, boxShadow: "0 2px 8px rgba(239,68,68,0.4)" }}>
              {event?.zone?.name || event?.name || "A Zone"}
            </div>
            <div style={{ width: 2, height: 36, backgroundColor: "rgba(255,255,255,0.25)" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  onClick={() => setShowLocationModal(true)}
                  title="Click to change TV location / venue"
                  style={{
                    fontSize: "0.98rem",
                    fontWeight: 800,
                    color: "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s"
                  }}
                >
                  <span style={{ color: "#facc15" }}>📍</span>
                  <span style={{ borderBottom: "1px dashed rgba(255,255,255,0.5)" }}>{currentLocation}</span>
                </div>
                <button
                  onClick={() => setShowLocationModal(true)}
                  title="Change TV Location"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#facc15",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 9999,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    transition: "all 0.15s"
                  }}
                >
                  <span>✏️</span> Edit
                </button>
              </div>
              <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.7)", fontWeight: 600, marginTop: 2 }}>{settings?.festName || "CSWC Hiya Fiesta '26"} · {settings?.festMoto || "Third Edition"}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, lineHeight: 1 }}>{currentTime || "12:00 pm"}</div>
            <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.72)", fontWeight: 700, marginTop: 3 }}>{currentDate || "Friday, 18 Sept 2026"}</div>
          </div>
        </header>

      {/* ════ MAIN CONTENT ════ */}
      <main style={{ display: "grid", gridTemplateColumns: "37% 61%", gap: 20, flex: 1, position: "relative", zIndex: 10, minHeight: 0 }}>

        {/* ── LEFT CARD (Champions & Kalathilakam, 5s fade) ── */}
        <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 24, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: "16px 18px", display: "flex", flexDirection: "column", boxShadow: "0 16px 40px rgba(0,0,0,0.3)", transition: "opacity 0.38s ease", opacity: leftFade ? 1 : 0, minHeight: 0 }}>

          {/* ── SLIDE 0: OVERALL CHAMPIONS (Big beautiful champion points) ── */}
          {leftIndex === 0 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ backgroundColor: "#facc15", borderRadius: 12, padding: "6px 8px", display: "flex", alignItems: "center", boxShadow: "0 4px 14px rgba(250,204,21,0.5)" }}>
                    <TrophyIcon size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1.2 }}>Overall</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#ffffff", lineHeight: 1, letterSpacing: "-0.2px" }}>Champions</div>
                  </div>
                </div>
                <div style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "4px 12px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 900, letterSpacing: 0.5, boxShadow: "0 2px 10px rgba(250,204,21,0.45)" }}>
                  GRAND TROPHY
                </div>
              </div>

              {/* Champion cards with BIG, EYE-CATCHING POINTS */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
                {/* 1st – Grand Champion */}
                {overall1 && (
                  <div style={{ background: "linear-gradient(135deg, #78350f 0%, #b45309 40%, #f59e0b 85%, #fbbf24 100%)", borderRadius: 18, padding: "14px 18px", boxShadow: "0 10px 28px rgba(245,158,11,0.45)", border: "1.5px solid rgba(255,255,255,0.35)", position: "relative", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.64rem", fontWeight: 900, color: "#fef08a", textTransform: "uppercase", letterSpacing: 1.5 }}>★ Grand Champion ★</span>
                      <span style={{ backgroundColor: "rgba(0,0,0,0.25)", color: "#fff", padding: "1px 8px", borderRadius: 9999, fontSize: "0.64rem", fontWeight: 800 }}>RANK 1</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <InstitutionLogo logoUrl={overall1.logoUrl} name={overall1.name} size={54} bg="#92400e" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "1.18rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                          {overall1.name}
                        </div>
                        <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "rgba(255,255,255,0.9)", marginTop: 2 }}>
                          📍 {overall1.place || "Zone Center"}
                        </div>
                      </div>
                      {/* HUGE POINTS FONT */}
                      <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: 8 }}>
                        <div style={{ fontSize: "3.1rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 0.9, color: "#ffffff", textShadow: "0 0 20px rgba(250,204,21,0.8), 0 3px 8px rgba(0,0,0,0.5)", letterSpacing: "-1px" }}>
                          {overall1.points}
                        </div>
                        <div style={{ fontSize: "0.62rem", fontWeight: 900, color: "#fef08a", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 3 }}>
                          POINTS
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2nd Runner Up */}
                {overall2 && (
                  <div style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(226,232,240,0.3)", borderRadius: 16, padding: "11px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <MedalBadge rank={2} />
                    <InstitutionLogo logoUrl={overall2.logoUrl} name={overall2.name} size={40} bg="#334155" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1.02rem", fontWeight: 900, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{overall2.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, marginTop: 1 }}>{overall2.place || "Zone Center"} · Runner-up</div>
                    </div>
                    {/* Big Runner Up points */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "2.1rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 0.95, color: "#e2e8f0", textShadow: "0 0 14px rgba(255,255,255,0.4)" }}>
                        {overall2.points}
                      </div>
                      <div style={{ fontSize: "0.58rem", fontWeight: 900, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1 }}>PTS</div>
                    </div>
                  </div>
                )}

                {/* 3rd Runner Up */}
                {overall3 && (
                  <div style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(251,146,60,0.3)", borderRadius: 16, padding: "11px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <MedalBadge rank={3} />
                    <InstitutionLogo logoUrl={overall3.logoUrl} name={overall3.name} size={40} bg="#334155" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1.02rem", fontWeight: 900, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{overall3.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, marginTop: 1 }}>{overall3.place || "Zone Center"} · 2nd Runner-up</div>
                    </div>
                    {/* Big 3rd points */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "2.1rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 0.95, color: "#fed7aa", textShadow: "0 0 14px rgba(249,115,22,0.4)" }}>
                        {overall3.points}
                      </div>
                      <div style={{ fontSize: "0.58rem", fontWeight: 900, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1 }}>PTS</div>
                    </div>
                  </div>
                )}

                {/* Ranks 4-5 */}
                {leaderboard.length > 3 && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {leaderboard.slice(3, 5).map((t, i) => (
                      <div key={t.id || i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>
                        <span>{i + 4}. {t.name}</span>
                        <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#ffffff" }}>{t.points} PTS</span>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#facc15", fontSize: "1.1rem" }}>▶</span>
                  <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900, color: "#ffffff" }}>Category champions</h2>
                </div>
                <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>Fadhila & Fadheela Top 3</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, justifyContent: "center" }}>

                {/* ── Fadhila Top 3 ── */}
                <div style={{ background: "linear-gradient(135deg, rgba(250,204,21,0.14) 0%, rgba(250,204,21,0.04) 100%)", border: "1.5px solid rgba(250,204,21,0.4)", borderRadius: 18, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "3px 12px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>Fadhila</span>
                    <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>Individual category</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { data: fadhilaTop, pts: fadhilaTop?.fadhilaPoints || fadhilaTop?.points },
                      { data: fadhilaTop2, pts: fadhilaTop2?.fadhilaPoints || fadhilaTop2?.points },
                      { data: fadhilaTop3, pts: fadhilaTop3?.fadhilaPoints || fadhilaTop3?.points }
                    ].filter(r => r.data).map((row, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: i === 0 ? "rgba(250,204,21,0.22)" : "rgba(255,255,255,0.06)", border: i === 0 ? "1px solid rgba(250,204,21,0.45)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "7px 12px" }}>
                        <MedalBadge rank={i + 1} small />
                        <InstitutionLogo logoUrl={row.data.logoUrl} name={row.data.name} size={32} bg="#78350f" />
                        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                          <div style={{ fontSize: "0.94rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.data.name}</div>
                          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, marginTop: 1 }}>{row.data.place || ""}</div>
                        </div>
                        <span style={{ fontSize: "1.55rem", fontWeight: 900, fontFamily: "monospace", color: i === 0 ? "#facc15" : "rgba(255,255,255,0.9)", flexShrink: 0 }}>{row.pts || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Fadheela Top 3 ── */}
                <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(239,68,68,0.04) 100%)", border: "1.5px solid rgba(239,68,68,0.4)", borderRadius: 18, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ backgroundColor: "#ef4444", color: "#fff", padding: "3px 12px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>Fadheela</span>
                    <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>Individual category</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { data: fadheelaTop, pts: fadheelaTop?.fadheelaPoints || fadheelaTop?.points },
                      { data: fadheelaTop2, pts: fadheelaTop2?.fadheelaPoints || fadheelaTop2?.points },
                      { data: fadheelaTop3, pts: fadheelaTop3?.fadheelaPoints || fadheelaTop3?.points }
                    ].filter(r => r.data).map((row, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: i === 0 ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.06)", border: i === 0 ? "1px solid rgba(239,68,68,0.45)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "7px 12px" }}>
                        <MedalBadge rank={i + 1} small />
                        <InstitutionLogo logoUrl={row.data.logoUrl} name={row.data.name} size={32} bg="#7f1d1d" />
                        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                          <div style={{ fontSize: "0.94rem", fontWeight: 900, color: "#ffffff", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.data.name}</div>
                          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{row.data.place || ""}</div>
                        </div>
                        <span style={{ fontSize: "1.55rem", fontWeight: 900, fontFamily: "monospace", color: i === 0 ? "#fca5a5" : "rgba(255,255,255,0.9)", flexShrink: 0 }}>{row.pts || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── SLIDE 2: KALATHILAKAM (Regal fillable layout for viewers watching from distance) ── */}
          {leftIndex === 2 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Grand Regal Header */}
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div className="kalathilakam-crown-banner" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(90deg, rgba(250,204,21,0.2) 0%, rgba(250,204,21,0.35) 50%, rgba(250,204,21,0.2) 100%)", border: "1.5px solid rgba(250,204,21,0.6)", borderRadius: 16, padding: "6px 20px", boxShadow: "0 4px 16px rgba(250,204,21,0.3)" }}>
                  <span style={{ fontSize: "1.3rem" }}>👑</span>
                  <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "#facc15", letterSpacing: "0.8px" }}>KALATHILAKAM</span>
                  <span style={{ fontSize: "1.3rem" }}>👑</span>
                </div>
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.7)", fontWeight: 800, marginTop: 3, textTransform: "uppercase", letterSpacing: 1.5 }}>
                  Individual Excellence · Festival Star Standings
                </div>
              </div>

              {/* Two Fillable Star Sections (Fadhila & Fadheela) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0, justifyContent: "space-between" }}>

                {/* ── Fadhila Star Section (Fillable Card) ── */}
                <div style={{ background: "linear-gradient(135deg, rgba(250,204,21,0.14) 0%, rgba(15,23,42,0.85) 100%)", border: "1.5px solid rgba(250,204,21,0.4)", borderRadius: 16, padding: "9px 12px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "2px 10px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        ★ Fadhila Star
                      </span>
                      <span style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>Individual race</span>
                    </div>
                    <span style={{ fontSize: "0.64rem", color: "#facc15", fontWeight: 800 }}>Top 3 Standings</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, justifyContent: "space-around" }}>
                    {fadhilaStars.slice(0, 3).map((cand, i) => {
                      const is1 = i === 0;
                      const pts = cand.totalPoints || cand.points || 0;
                      return (
                        <div
                          key={cand.id || i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            backgroundColor: is1 ? "rgba(250,204,21,0.22)" : "rgba(255,255,255,0.06)",
                            border: is1 ? "1.5px solid rgba(250,204,21,0.55)" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 10,
                            padding: "6px 10px",
                            boxShadow: is1 ? "0 4px 14px rgba(250,204,21,0.25)" : "none"
                          }}
                        >
                          <MedalBadge rank={i + 1} small />
                          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ fontSize: is1 ? "0.98rem" : "0.90rem", fontWeight: 900, color: is1 ? "#fef08a" : "#ffffff", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {cand.name}
                              </span>
                              {cand.chestNumber && (
                                <span style={{ backgroundColor: is1 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.16)", color: "#fff", padding: "1px 6px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 800, flexShrink: 0 }}>
                                  #{cand.chestNumber}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.72)", fontWeight: 700, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {cand.institutionName || cand.teamName}{cand.institutionPlace ? ` · ${cand.institutionPlace}` : ""}
                            </div>
                          </div>
                          {/* Large points badge for distance viewing */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: is1 ? "1.65rem" : "1.35rem", fontWeight: 900, fontFamily: "monospace", color: is1 ? "#facc15" : "rgba(255,255,255,0.9)", lineHeight: 1 }}>
                              {pts}
                            </div>
                            <div style={{ fontSize: "0.50rem", fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
                              PTS
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {fadhilaStars.length === 0 && (
                      <div style={{ textAlign: "center", padding: "8px", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)" }}>
                        Awaiting results
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Fadheela Star Section (Fillable Card) ── */}
                <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(15,23,42,0.85) 100%)", border: "1.5px solid rgba(239,68,68,0.4)", borderRadius: 16, padding: "9px 12px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ backgroundColor: "#ef4444", color: "#ffffff", padding: "2px 10px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        ★ Fadheela Star
                      </span>
                      <span style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>Individual race</span>
                    </div>
                    <span style={{ fontSize: "0.64rem", color: "#f87171", fontWeight: 800 }}>Top 3 Standings</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, justifyContent: "space-around" }}>
                    {fadheelaStars.slice(0, 3).map((cand, i) => {
                      const is1 = i === 0;
                      const pts = cand.totalPoints || cand.points || 0;
                      return (
                        <div
                          key={cand.id || i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            backgroundColor: is1 ? "rgba(239,68,68,0.24)" : "rgba(255,255,255,0.06)",
                            border: is1 ? "1.5px solid rgba(239,68,68,0.55)" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 10,
                            padding: "6px 10px",
                            boxShadow: is1 ? "0 4px 14px rgba(239,68,68,0.25)" : "none"
                          }}
                        >
                          <MedalBadge rank={i + 1} small />
                          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ fontSize: is1 ? "0.98rem" : "0.90rem", fontWeight: 900, color: is1 ? "#fca5a5" : "#ffffff", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {cand.name}
                              </span>
                              {cand.chestNumber && (
                                <span style={{ backgroundColor: is1 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.16)", color: "#fff", padding: "1px 6px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 800, flexShrink: 0 }}>
                                  #{cand.chestNumber}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.72)", fontWeight: 700, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {cand.institutionName || cand.teamName}{cand.institutionPlace ? ` · ${cand.institutionPlace}` : ""}
                            </div>
                          </div>
                          {/* Large points badge for distance viewing */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: is1 ? "1.65rem" : "1.35rem", fontWeight: 900, fontFamily: "monospace", color: is1 ? "#fca5a5" : "rgba(255,255,255,0.9)", lineHeight: 1 }}>
                              {pts}
                            </div>
                            <div style={{ fontSize: "0.50rem", fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
                              PTS
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {fadheelaStars.length === 0 && (
                      <div style={{ textAlign: "center", padding: "8px", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)" }}>
                        Awaiting results
                      </div>
                    )}
                  </div>
                </div>
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

        {/* ── RIGHT COLUMN (Individual & General Program Results in distinct boxes, 5s 3D page peeling) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", minHeight: 0 }}>

          {/* ── 1. TOP SECTION: INDIVIDUAL PROGRAM RESULTS (Two Distinct Boxes: Fadhila & Fadheela) ── */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {/* Top Subheader Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#facc15", fontSize: "1.05rem" }}>▶</span>
                <h2 style={{ margin: 0, fontSize: "1.18rem", fontWeight: 900, color: "#ffffff" }}>
                  Individual program results
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "2px 8px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 900 }}>Fadhila Box</span>
                <span style={{ backgroundColor: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 900 }}>Fadheela Box</span>
                {indivSlides.length > 0 && (
                  <span style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "#fff", padding: "2px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800, fontFamily: "monospace" }}>
                    {indivIndex + 1}/{indivSlides.length}
                  </span>
                )}
              </div>
            </div>

            {/* TWO DISTINCT SIDE-BY-SIDE BOXES (Fadhila on left, Fadheela on right) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
              <CategoryProgramBox
                prog={currentIndiv?.fadhila}
                categoryName="FADHILA"
                categoryType="FADHILA"
                peelKey={peelKey}
              />
              <CategoryProgramBox
                prog={currentIndiv?.fadheela}
                categoryName="FADHEELA"
                categoryType="FADHEELA"
                peelKey={peelKey}
              />
            </div>
          </div>

          {/* ── 2. BOTTOM SECTION: GENERAL PROGRAM RESULTS (Distinct Emerald Box) ── */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {/* Bottom Subheader Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#10b981", fontSize: "1.05rem" }}>▶</span>
                <h2 style={{ margin: 0, fontSize: "1.18rem", fontWeight: 900, color: "#ffffff" }}>
                  General program results
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ backgroundColor: "#10b981", color: "#fff", padding: "2px 10px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 900 }}>
                  General · All institutions
                </span>
                {generalPrograms.length > 0 && (
                  <span style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "#fff", padding: "2px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800, fontFamily: "monospace" }}>
                    {genIndex + 1}/{generalPrograms.length}
                  </span>
                )}
              </div>
            </div>

            {/* DISTINCT GENERAL PROGRAM BOX */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <CategoryProgramBox
                prog={currentGen}
                categoryName="GENERAL"
                categoryType="GENERAL"
                peelKey={peelKey}
                isGeneral
              />
            </div>
          </div>

        </div>
      </main>

      {/* ════ FOOTER STATUS BAR ════ */}
      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10, marginTop: 10, fontSize: "0.76rem", color: "rgba(255,255,255,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block", boxShadow: "0 0 10px #ef4444", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontWeight: 800, color: "#ffffff", fontSize: "0.82rem" }}>Live results broadcast</span>
          {isPaused && (
            <span style={{ backgroundColor: "#facc15", color: "#0f172a", padding: "1px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 900 }}>PAUSED</span>
          )}
        </div>
        <div style={{ textAlign: "center", fontWeight: 600, color: "rgba(255,255,255,0.6)", fontSize: "0.74rem" }}>
          Shortcuts: Space (Pause), +/- (Zoom TV), 0 (Reset 100%), F (Auto-Fit TV), L (Location)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Location button */}
          <button
            onClick={() => setShowLocationModal(true)}
            title="Set TV Broadcast Venue / Location (L)"
            style={{
              backgroundColor: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#facc15",
              padding: "4px 12px",
              borderRadius: 9999,
              fontSize: "0.74rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s"
            }}
          >
            <span>📍</span> Location
          </button>

          {/* TV Fit / Zoom button with Popover */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowZoomMenu(p => !p)}
              title="Adjust TV Screen Fit / Zoom (+ / - keys)"
              style={{
                backgroundColor: zoomMode === "auto" ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.14)",
                border: "1px solid " + (zoomMode === "auto" ? "rgba(96,165,250,0.6)" : "rgba(255,255,255,0.25)"),
                color: "#fff",
                padding: "4px 12px",
                borderRadius: 9999,
                fontSize: "0.74rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5
              }}
            >
              <span>🖥️ Fit: {zoomMode === "auto" ? `Auto (${Math.round(scaleFactor * 100)}%)` : `${Math.round(scaleFactor * 100)}%`}</span>
              <span style={{ fontSize: "0.6rem" }}>▼</span>
            </button>

            {showZoomMenu && (
              <div
                style={{
                  position: "absolute",
                  bottom: "115%",
                  right: 0,
                  backgroundColor: "rgba(15,23,42,0.96)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  width: 215,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.7)",
                  backdropFilter: "blur(14px)",
                  zIndex: 9999,
                  display: "flex",
                  flexDirection: "column",
                  gap: 5
                }}
              >
                <div style={{ fontSize: "0.68rem", fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  TV Screen Fit
                </div>
                <button
                  type="button"
                  onClick={() => setZoom("auto")}
                  style={{
                    backgroundColor: zoomMode === "auto" ? "#2563eb" : "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 8,
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>Auto-Fit (Recommended)</span>
                  {zoomMode === "auto" && <span>✓</span>}
                </button>

                <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
                  Preset Scales
                </div>
                {[1.0, 0.90, 0.85, 0.80, 0.75].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setZoom(lvl)}
                    style={{
                      backgroundColor: zoomMode === lvl ? "#2563eb" : "rgba(255,255,255,0.06)",
                      border: "none",
                      color: "#fff",
                      padding: "5px 10px",
                      borderRadius: 8,
                      fontSize: "0.73rem",
                      fontWeight: 700,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span>{Math.round(lvl * 100)}% {lvl === 0.85 ? "(Best for Smart TV)" : lvl === 1.0 ? "(1080p)" : ""}</span>
                    {zoomMode === lvl && <span>✓</span>}
                  </button>
                ))}

                <div style={{ display: "flex", gap: 6, marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => adjustZoom(-0.05)}
                    style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "5px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    - Zoom Out
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustZoom(0.05)}
                    style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "5px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    + Zoom In
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            style={{
              backgroundColor: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: 9999,
              fontSize: "0.74rem",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            ⛶
          </button>

          {/* Event selector with LIVE indicator */}
          {allEvents.length > 1 && (
            <select
              value={event?.id}
              onChange={e => (window.location.href = `/tv?eventId=${e.target.value}`)}
              style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "4px 10px", borderRadius: 9999, fontSize: "0.74rem", fontWeight: 700, cursor: "pointer", outline: "none" }}
            >
              {allEvents.map(ev => (
                <option key={ev.id} value={ev.id} style={{ color: "#000" }}>
                  {ev.name} {ev.statusOverride === "LIVE" ? "🔴 (LIVE)" : ""}
                </option>
              ))}
            </select>
          )}

          {/* Pause / Resume */}
          <button onClick={() => setIsPaused(p => !p)} style={{ backgroundColor: isPaused ? "#facc15" : "rgba(255,255,255,0.14)", color: isPaused ? "#0f172a" : "#fff", border: "1px solid rgba(255,255,255,0.22)", padding: "4px 14px", borderRadius: 9999, fontSize: "0.76rem", fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </footer>

      {/* ── Close Scaled TV Display Canvas ── */}
      </div>

      {/* ════ LOCATION SETTING MODAL ════ */}
      {showLocationModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
          onClick={() => setShowLocationModal(false)}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              border: "1.5px solid rgba(250,204,21,0.45)",
              borderRadius: 20,
              padding: "24px 28px",
              width: "100%",
              maxWidth: 540,
              boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
              color: "#fff"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "#facc15", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📍</span> Set TV Broadcast Location
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
                  Active Zone: <strong>{event?.zone?.name || event?.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontWeight: 900 }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, marginBottom: 6, color: "#93c5fd", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Custom Venue / College Name
              </label>
              <input
                type="text"
                value={inputLocation}
                onChange={e => setInputLocation(e.target.value)}
                placeholder="e.g. Maryam Girls Campus, Koppam or Palakkad Zone"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  backgroundColor: "rgba(15,23,42,0.8)",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box"
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSaveLocation(inputLocation);
                }}
                autoFocus
              />
            </div>

            {/* Quick Suggestions / Colleges in this zone */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Suggested Venues / Institutions for this Zone:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                {zoneInstitutions && zoneInstitutions.length > 0 ? (
                  zoneInstitutions.map(inst => {
                    const label = inst.place ? `${inst.name}, ${inst.place}` : inst.name;
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => setInputLocation(label)}
                        style={{
                          backgroundColor: inputLocation === label ? "#ca8a04" : "rgba(255,255,255,0.08)",
                          border: "1px solid " + (inputLocation === label ? "#facc15" : "rgba(255,255,255,0.15)"),
                          color: "#fff",
                          padding: "5px 10px",
                          borderRadius: 8,
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        {label}
                      </button>
                    );
                  })
                ) : null}
                <button
                  type="button"
                  onClick={() => setInputLocation(`${event?.zone?.name || event?.name} Campus`)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "5px 10px",
                    borderRadius: 8,
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {event?.zone?.name || event?.name} Campus
                </button>
                <button
                  type="button"
                  onClick={() => setInputLocation("Thaqwa Arabic College, Andathode")}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    padding: "5px 10px",
                    borderRadius: 8,
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Thaqwa Arabic College, Andathode (Thrissur)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 14 }}>
              <button
                type="button"
                onClick={handleResetLocation}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "0.76rem",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Reset to default
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveLocation(inputLocation)}
                  style={{
                    backgroundColor: "#facc15",
                    border: "none",
                    color: "#0f172a",
                    padding: "8px 20px",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(250,204,21,0.4)"
                  }}
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ FLOATING TOAST NOTIFICATION ════ */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999999,
            backgroundColor: "rgba(15,23,42,0.94)",
            color: "#ffffff",
            border: "1.5px solid rgba(250,204,21,0.6)",
            borderRadius: 9999,
            padding: "8px 22px",
            fontSize: "0.84rem",
            fontWeight: 800,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            letterSpacing: "0.3px"
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ── CSS KEYFRAMES: 3D Page Peeling, Glow & Pulse ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pagePeel3D {
          0% {
            opacity: 0.15;
            transform: perspective(1400px) rotateY(-22deg) scale(0.97);
            transform-origin: left center;
            box-shadow: -24px 12px 40px rgba(0,0,0,0.65);
            filter: brightness(1.25);
          }
          50% {
            filter: brightness(1.12);
          }
          100% {
            opacity: 1;
            transform: perspective(1400px) rotateY(0deg) scale(1);
            transform-origin: left center;
            box-shadow: 0 12px 32px rgba(0,0,0,0.38);
            filter: brightness(1);
          }
        }
        .page-peel-card {
          animation: pagePeel3D 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes pulse {
          0% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(1.15); }
          100% { opacity:1; transform:scale(1); }
        }

        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 4px 16px rgba(250,204,21,0.35); }
          50% { box-shadow: 0 6px 24px rgba(250,204,21,0.6); }
        }
        .winner-gold-glow {
          animation: goldGlow 3s ease-in-out infinite;
        }

        @keyframes crownPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); filter: drop-shadow(0 0 12px rgba(250,204,21,0.6)); }
        }
        .kalathilakam-crown-banner {
          animation: crownPulse 3.5s ease-in-out infinite;
        }
      ` }} />
    </div>
  );
}

