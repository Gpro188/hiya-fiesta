"use client";

import { useRef } from "react";

export default function GalleryMarquee({ images }: { images: string[] }) {
  if (!images || images.length === 0) return null;

  // Triple the images so the loop has enough content regardless of count
  const tripled = [...images, ...images, ...images];

  return (
    <div
      className="hf-gmarquee-outer"
      style={{
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* left/right gradient fade */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, var(--ink) 0%, transparent 10%, transparent 90%, var(--ink) 100%)",
        }}
      />
      <div
        className="hf-gmarquee-track"
        style={{ display: "flex", gap: 14, width: "max-content" }}
      >
        {tripled.map((url, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: "auto",
              height: 210,
              borderRadius: 14,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <img
              src={url}
              alt={`Gallery photo ${(i % images.length) + 1}`}
              loading="lazy"
              style={{ width: "auto", height: "100%", objectFit: "contain", display: "block" }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, transparent 50%, rgba(214,22,92,0.35) 100%)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
