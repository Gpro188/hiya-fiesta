"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";

export type GalleryItem = {
  url: string;
  title?: string;
  category?: string;
  isHighlighted?: boolean;
};

interface GalleryClientProps {
  items: GalleryItem[];
  festName: string;
  festMoto: string;
}

const CATEGORY_TABS = [
  { key: "ALL", label: "✨ All Moments" },
  { key: "HIGHLIGHTED", label: "⭐ Featured Highlights" },
  { key: "Stage", label: "🎭 Stage Competitions" },
  { key: "Off-Stage", label: "🎨 Off-Stage Events" },
  { key: "Ceremony", label: "🏆 Ceremonies & Awards" },
  { key: "Campus", label: "🏛️ Campus & Moments" },
  { key: "Volunteers", label: "🦺 Organizing Crew" },
];

export default function GalleryClient({
  items,
  festName,
  festMoto,
}: GalleryClientProps) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchCategory = true;
      if (selectedCategory === "HIGHLIGHTED") {
        matchCategory = item.isHighlighted !== false;
      } else if (selectedCategory !== "ALL") {
        matchCategory =
          (item.category && item.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
          false;
      }

      return matchSearch && matchCategory;
    });
  }, [items, selectedCategory, searchQuery]);

  // Lightbox keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % filteredItems.length : null
        );
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : null
        );
      }
    },
    [lightboxIndex, filteredItems]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const activePhoto = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b050c", color: "#ffffff", fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      {/* ── TOP HEADER / NAVBAR ── */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          backgroundColor: "rgba(18, 10, 20, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1300px",
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <img
                src="/icon.png"
                alt="CSWC Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.5px" }}>
                {festName || "CSWC Hiya Fiesta 2026"}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#f472b6", fontWeight: 600 }}>
                Official Photo & Moments Gallery
              </div>
            </div>
          </Link>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              href="/"
              style={{
                padding: "8px 16px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
            >
              <span>← Back to Home</span>
            </Link>
            <Link
              href="/hub"
              style={{
                padding: "8px 16px",
                backgroundColor: "#8E0033",
                color: "#ffffff",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 10px rgba(142,0,51,0.4)",
              }}
            >
              <span>📡 Live Standings</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section
        style={{
          padding: "48px 20px 32px",
          textAlign: "center",
          background: "radial-gradient(ellipse at 50% 0%, rgba(225, 29, 72, 0.25) 0%, transparent 70%)",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "0.78rem",
              fontWeight: 800,
              color: "#fb7185",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            <span>📸 FESTIVAL MEDIA ARCHIVE</span>
          </div>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 900,
              margin: "0 0 10px 0",
              background: "linear-gradient(135deg, #ffffff 40%, #f472b6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}
          >
            Memories & Captured Moments
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 24px 0", lineHeight: 1.6 }}>
            Browse high-resolution photographs, stage performances, certificate distributions, and vibrant campus life from across all 8 zones and State Finals.
          </p>

          {/* Search Bar */}
          <div
            style={{
              maxWidth: "500px",
              margin: "0 auto 20px",
              position: "relative",
            }}
          >
            <input
              type="text"
              placeholder="🔍 Search photos by title, ceremony, stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: "30px",
                backgroundColor: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: "0.9rem",
                outline: "none",
                backdropFilter: "blur(8px)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "center",
            }}
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: isActive
                      ? "1px solid #f43f5e"
                      : "1px solid rgba(255, 255, 255, 0.12)",
                    backgroundColor: isActive ? "#8E0033" : "rgba(255, 255, 255, 0.05)",
                    color: isActive ? "#ffffff" : "#cbd5e1",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: isActive ? "0 4px 14px rgba(142,0,51,0.4)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── GALLERY GRID SECTION ── */}
      <section style={{ maxWidth: "1300px", margin: "0 auto", padding: "16px 20px 60px" }}>
        {/* Count Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "0.85rem",
            color: "#94a3b8",
          }}
        >
          <div>
            Showing <strong style={{ color: "#ffffff" }}>{filteredItems.length}</strong> of{" "}
            <strong style={{ color: "#ffffff" }}>{items.length}</strong> total photographs
          </div>
          {selectedCategory !== "ALL" && (
            <button
              onClick={() => setSelectedCategory("ALL")}
              style={{
                background: "transparent",
                border: "none",
                color: "#f472b6",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.82rem",
              }}
            >
              Reset Filters ↺
            </button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderRadius: "18px",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
              maxWidth: "500px",
              margin: "30px auto",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🖼️</div>
            <h3 style={{ margin: "0 0 6px 0", color: "#ffffff" }}>No Photos Found</h3>
            <p style={{ margin: "0 0 16px 0", color: "#94a3b8", fontSize: "0.88rem" }}>
              {items.length === 0
                ? "Festival moments and gallery photos will appear here as they are uploaded."
                : "No photos match your selected filter or search keyword."}
            </p>
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSearchQuery("");
              }}
              style={{
                padding: "8px 18px",
                backgroundColor: "#8E0033",
                color: "#ffffff",
                border: "none",
                borderRadius: "20px",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              View All Photos
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                style={{
                  position: "relative",
                  borderRadius: "16px",
                  overflow: "hidden",
                  aspectRatio: "16/11",
                  backgroundColor: "#1e1420",
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  transition: "transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 16px 36px rgba(225, 29, 72, 0.3)";
                  e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.3)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                }}
              >
                {/* Edge-to-Edge Frameless Photo */}
                <img
                  src={item.url}
                  alt={item.title || `Hiya Fiesta Photo ${idx + 1}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transition: "transform 0.5s ease",
                  }}
                />

                {/* Category Badge */}
                {item.category && (
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      backgroundColor: "rgba(142, 0, 51, 0.85)",
                      backdropFilter: "blur(8px)",
                      color: "#ffffff",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      zIndex: 3,
                    }}
                  >
                    {item.category}
                  </div>
                )}

                {/* Highlight Star */}
                {item.isHighlighted && (
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      backgroundColor: "rgba(0, 0, 0, 0.65)",
                      backdropFilter: "blur(6px)",
                      color: "#fbbf24",
                      padding: "3px 8px",
                      borderRadius: "20px",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      border: "1px solid rgba(251, 191, 36, 0.4)",
                      zIndex: 3,
                    }}
                  >
                    ⭐ Featured
                  </div>
                )}

                {/* Bottom Overlay & Caption */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, transparent 50%, rgba(10, 5, 12, 0.85) 100%)",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: "14px",
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "#ffffff",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: "8px",
                      }}
                    >
                      {item.title || "Hiya Fiesta Moments"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#f472b6",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      🔍 View
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── LIGHTBOX MODAL ── */}
      {activePhoto && lightboxIndex !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(5, 2, 7, 0.94)",
            backdropFilter: "blur(14px)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "16px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 10,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#ffffff" }}>
                {activePhoto.title || "Hiya Fiesta Moment"}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                {activePhoto.category ? `${activePhoto.category} · ` : ""}Photo {lightboxIndex + 1} of{" "}
                {filteredItems.length}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <a
                href={activePhoto.url}
                target="_blank"
                download={`hiya-fiesta-${lightboxIndex + 1}.jpg`}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                ⬇️ Full Resolution
              </a>
              <button
                onClick={() => setLightboxIndex(null)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Main Image Container */}
          <div
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "82vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activePhoto.url}
              alt={activePhoto.title || "Photo"}
              style={{
                maxWidth: "100%",
                maxHeight: "82vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
              }}
            />
          </div>

          {/* Prev / Next Controls */}
          {filteredItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : null
                  );
                }}
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.2s",
                }}
                title="Previous Photo (Left Arrow)"
              >
                ‹
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev + 1) % filteredItems.length : null
                  );
                }}
                style={{
                  position: "absolute",
                  right: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.2s",
                }}
                title="Next Photo (Right Arrow)"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
