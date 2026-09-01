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

export default function GalleryClient({
  items,
  festName,
  festMoto,
}: GalleryClientProps) {
  const [selectedTab, setSelectedTab] = useState<"ALL" | "HIGHLIGHTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filtered items (2 types: All Photos or Featured Highlights)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTab =
        selectedTab === "ALL" ? true : item.isHighlighted !== false;

      return matchSearch && matchTab;
    });
  }, [items, selectedTab, searchQuery]);

  const highlightedCount = useMemo(() => {
    return items.filter((item) => item.isHighlighted !== false).length;
  }, [items]);

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
    <div className="gallery-page-root">
      {/* ── TOP HEADER / NAVBAR ── */}
      <header className="gallery-nav">
        <div className="gallery-nav-inner">
          <Link href="/" className="gallery-brand">
            <div className="brand-logo-wrap">
              <img
                src="/icon.png"
                alt="CSWC Logo"
                className="brand-logo-img"
              />
            </div>
            <div className="brand-text">
              <div className="brand-title">
                {festName || "CSWC Hiya Fiesta 2026"}
              </div>
              <div className="brand-sub">
                Official Photo Gallery
              </div>
            </div>
          </Link>

          <div className="nav-actions">
            <Link href="/" className="nav-btn nav-btn-ghost">
              <span>← Home</span>
            </Link>
            <Link href="/hub" className="nav-btn nav-btn-primary">
              <span>📡 Standings</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section className="gallery-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span>📸 FESTIVAL MEDIA ARCHIVE</span>
          </div>
          <h1 className="hero-title">
            Memories & Moments
          </h1>
          <p className="hero-subtitle">
            {festMoto || "She Can. She Will."} · Council of Samastha Women&apos;s Colleges
          </p>

          {/* Search Bar */}
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search moments by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="search-clear-btn"
              >
                ✕
              </button>
            )}
          </div>

          {/* ── 2 TYPE SEGMENTED FILTER PILL (MOBILE & DESKTOP OPTIMIZED) ── */}
          <div className="segment-control-container">
            <div className="segment-control">
              <button
                type="button"
                onClick={() => setSelectedTab("ALL")}
                className={`segment-btn ${selectedTab === "ALL" ? "active" : ""}`}
              >
                <span>✨ All Photos</span>
                <span className="count-tag">{items.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab("HIGHLIGHTED")}
                className={`segment-btn ${selectedTab === "HIGHLIGHTED" ? "active" : ""}`}
              >
                <span>⭐ Highlights</span>
                <span className="count-tag">{highlightedCount}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALLERY GRID SECTION ── */}
      <main className="gallery-main">
        {/* Count Bar */}
        <div className="results-bar">
          <div>
            Showing <strong className="white-txt">{filteredItems.length}</strong> {selectedTab === "HIGHLIGHTED" ? "highlighted" : ""} photos
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="reset-btn"
            >
              Clear Search ↺
            </button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <h3 className="empty-title">No Photos Found</h3>
            <p className="empty-desc">
              {items.length === 0
                ? "Festival moments and gallery photos will appear here as they are uploaded."
                : "No photos match your current search query."}
            </p>
            <button
              onClick={() => {
                setSelectedTab("ALL");
                setSearchQuery("");
              }}
              className="view-all-btn"
            >
              View All Photos
            </button>
          </div>
        ) : (
          <div className="photo-grid">
            {filteredItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                className="photo-card"
              >
                {/* Edge-to-Edge Frameless Photo */}
                <img
                  src={item.url}
                  alt={item.title || `Photo ${idx + 1}`}
                  loading="lazy"
                  className="photo-img"
                />

                {/* Highlight Star Badge */}
                {item.isHighlighted !== false && (
                  <div className="photo-star-badge" title="Featured Highlight">
                    ⭐
                  </div>
                )}

                {/* Bottom Caption Gradient Overlay */}
                <div className="photo-caption-gradient">
                  <div className="photo-title">
                    {item.title || "Festival Moment"}
                  </div>
                  <div className="photo-view-action">
                    <span>Tap to view full photo</span>
                    <span className="expand-arrow">↗</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── LIGHTBOX MODAL (HIGH-RES PHOTO VIEWER) ── */}
      {activePhoto && lightboxIndex !== null && (
        <div
          className="lightbox-backdrop"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close Button */}
          <button
            className="lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            title="Close (Esc)"
          >
            ✕
          </button>

          {/* Left / Prev Arrow */}
          {filteredItems.length > 1 && (
            <button
              className="lightbox-nav-btn prev"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (lightboxIndex - 1 + filteredItems.length) % filteredItems.length
                );
              }}
              title="Previous (←)"
            >
              ‹
            </button>
          )}

          {/* Center Image Container */}
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lightbox-img-wrap">
              <img
                src={activePhoto.url}
                alt={activePhoto.title || "Festival Photo"}
                className="lightbox-img"
              />
            </div>

            {/* Bottom Details & Download Action */}
            <div className="lightbox-footer">
              <div>
                <h3 className="lightbox-title">
                  {activePhoto.title || "Festival Moment"}
                </h3>
                <div className="lightbox-counter">
                  Photo {lightboxIndex + 1} of {filteredItems.length}
                  {activePhoto.isHighlighted !== false && (
                    <span className="lightbox-featured-tag">
                      ⭐ Featured Highlight
                    </span>
                  )}
                </div>
              </div>

              <div className="lightbox-actions">
                <a
                  href={activePhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="download-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>⬇ Full Res</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right / Next Arrow */}
          {filteredItems.length > 1 && (
            <button
              className="lightbox-nav-btn next"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
              }}
              title="Next (→)"
            >
              ›
            </button>
          )}
        </div>
      )}

      {/* ── EMBEDDED MOBILE-FIRST STYLES ── */}
      <style jsx global>{`
        .gallery-page-root {
          min-height: 100vh;
          background-color: #0b050c;
          color: #ffffff;
          font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-tap-highlight-color: transparent;
        }

        /* ── NAVBAR ── */
        .gallery-nav {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background-color: rgba(18, 10, 20, 0.9);
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .gallery-nav-inner {
          max-width: 1300px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .gallery-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #ffffff;
        }
        .brand-logo-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .brand-title {
          font-weight: 800;
          font-size: 1rem;
          line-height: 1.2;
        }
        .brand-sub {
          font-size: 0.72rem;
          color: #f472b6;
          font-weight: 600;
        }
        .nav-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .nav-btn {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: all 0.2s ease;
        }
        .nav-btn-ghost {
          background-color: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .nav-btn-primary {
          background-color: #8E0033;
          color: #ffffff;
          box-shadow: 0 2px 10px rgba(142, 0, 51, 0.4);
        }

        /* ── HERO ── */
        .gallery-hero {
          padding: 32px 16px 20px;
          text-align: center;
          background: radial-gradient(ellipse at 50% 0%, rgba(225, 29, 72, 0.25) 0%, transparent 70%);
        }
        .hero-content {
          max-width: 650px;
          margin: 0 auto;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.3);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 800;
          color: #fb7185;
          letter-spacing: 0.8px;
          margin-bottom: 10px;
        }
        .hero-title {
          font-size: clamp(1.8rem, 5vw, 2.6rem);
          font-weight: 900;
          margin: 0 0 6px 0;
          background: linear-gradient(135deg, #ffffff 40%, #f472b6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
          line-height: 1.15;
        }
        .hero-subtitle {
          color: #94a3b8;
          font-size: 0.88rem;
          margin: 0 0 18px 0;
          line-height: 1.4;
        }

        /* ── SEARCH BAR ── */
        .search-wrap {
          max-width: 440px;
          margin: 0 auto 16px;
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          font-size: 0.85rem;
          color: #94a3b8;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 10px 38px 10px 38px;
          border-radius: 30px;
          background-color: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #ffffff;
          font-size: 0.88rem;
          outline: none;
          backdrop-filter: blur(8px);
          transition: border-color 0.2s, background-color 0.2s;
        }
        .search-input:focus {
          border-color: #f43f5e;
          background-color: rgba(255, 255, 255, 0.12);
        }
        .search-clear-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 4px;
        }

        /* ── 2 TYPE SEGMENTED FILTER PILL ── */
        .segment-control-container {
          display: flex;
          justify-content: center;
          margin-top: 4px;
        }
        .segment-control {
          display: inline-flex;
          background-color: rgba(255, 255, 255, 0.06);
          padding: 4px;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
          max-width: 100%;
        }
        .segment-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 24px;
          border: none;
          background: transparent;
          color: #cbd5e1;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .segment-btn.active {
          background-color: #8E0033;
          color: #ffffff;
          box-shadow: 0 3px 12px rgba(142, 0, 51, 0.6);
        }
        .count-tag {
          background-color: rgba(255, 255, 255, 0.15);
          font-size: 0.72rem;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 10px;
          color: inherit;
        }

        /* ── MAIN CONTENT & GRID ── */
        .gallery-main {
          max-width: 1300px;
          margin: 0 auto;
          padding: 12px 16px 60px;
        }
        .results-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .white-txt {
          color: #ffffff;
        }
        .reset-btn {
          background: transparent;
          border: none;
          color: #f472b6;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.8rem;
        }

        /* Responsive Grid: 2 columns on Mobile, 3-4 on Tablet/Desktop */
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .photo-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 18px;
          }
        }
        @media (min-width: 1024px) {
          .photo-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 22px;
          }
        }

        /* Photo Card */
        .photo-card {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          aspect-ratio: 4 / 3;
          background-color: #1a101c;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
        }
        @media (hover: hover) {
          .photo-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 28px rgba(225, 29, 72, 0.25);
            border-color: rgba(244, 63, 94, 0.4);
          }
        }

        .photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }
        @media (hover: hover) {
          .photo-card:hover .photo-img {
            transform: scale(1.04);
          }
        }

        .photo-star-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background-color: rgba(18, 10, 20, 0.75);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          z-index: 2;
        }

        .photo-caption-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px 10px 8px 10px;
          background: linear-gradient(to top, rgba(11, 5, 12, 0.92) 0%, rgba(11, 5, 12, 0.6) 60%, transparent 100%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .photo-title {
          font-weight: 700;
          font-size: 0.82rem;
          color: #ffffff;
          line-height: 1.25;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .photo-view-action {
          display: none;
          align-items: center;
          justify-content: space-between;
          font-size: 0.7rem;
          color: #f472b6;
          font-weight: 600;
          margin-top: 2px;
        }
        @media (min-width: 768px) {
          .photo-view-action {
            display: flex;
          }
        }

        /* ── EMPTY STATE ── */
        .empty-state {
          text-align: center;
          padding: 60px 16px;
          background-color: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.12);
          max-width: 440px;
          margin: 20px auto;
        }
        .empty-icon {
          font-size: 2.6rem;
          margin-bottom: 8px;
        }
        .empty-title {
          margin: 0 0 6px 0;
          color: #ffffff;
        }
        .empty-desc {
          margin: 0 0 16px 0;
          color: #94a3b8;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .view-all-btn {
          padding: 8px 20px;
          background-color: #8E0033;
          color: #ffffff;
          border: none;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
        }

        /* ── LIGHTBOX ── */
        .lightbox-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(6, 2, 8, 0.95);
          backdrop-filter: blur(16px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .lightbox-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background-color: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 110;
        }
        .lightbox-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 1.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 110;
          transition: background-color 0.2s;
        }
        .lightbox-nav-btn.prev {
          left: 12px;
        }
        .lightbox-nav-btn.next {
          right: 12px;
        }
        .lightbox-content {
          max-width: 1000px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .lightbox-img-wrap {
          max-height: 75vh;
          width: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lightbox-img {
          max-height: 75vh;
          max-width: 100%;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
        }
        .lightbox-footer {
          width: 100%;
          max-width: 800px;
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          backdrop-filter: blur(8px);
        }
        .lightbox-title {
          margin: 0 0 2px 0;
          font-size: 1rem;
          font-weight: 800;
          color: #ffffff;
        }
        .lightbox-counter {
          font-size: 0.78rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lightbox-featured-tag {
          color: #f59e0b;
          font-weight: 700;
        }
        .download-btn {
          padding: 6px 14px;
          background-color: #8E0033;
          color: #ffffff;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
