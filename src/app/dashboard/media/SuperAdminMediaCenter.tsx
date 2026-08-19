"use client";

import { useState } from "react";
import PosterSettingsForm from "./PosterSettingsForm";
import InteractivePosterStudio from "./InteractivePosterStudio";
import ImageUpload from "../../components/ImageUpload";

export default function SuperAdminMediaCenter({
  allEventsWithCategories,
  initialSettings,
}: {
  allEventsWithCategories: any[];
  initialSettings: any;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Separate state event vs zone events
  const stateEvents = allEventsWithCategories.filter(e => e.type !== "ZONE" && !e.parentId);
  const zoneEvents = allEventsWithCategories.filter(e => e.type === "ZONE" || e.parentId);

  const allSections = [
    ...stateEvents.map(e => ({ ...e, label: "State Fest" })),
    ...zoneEvents.map(e => ({ ...e, label: "Zone Fest" })),
  ];

  const selectedEvent = selectedEventId
    ? allSections.find(e => e.id === selectedEventId)
    : allSections[0];

  return (
    <div className="superadmin-media-layout" style={{ display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", gap: "20px", alignItems: "start", width: "100%" }}>
      {/* Left: Event Selector */}
      <div className="glass-panel" style={{ padding: "16px", position: "sticky", top: "20px" }}>
        <h3 style={{ marginBottom: "var(--spacing-md)", fontSize: "1rem" }}>📋 Select Event</h3>

        {stateEvents.length > 0 && (
          <div style={{ marginBottom: "var(--spacing-md)" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              State Fest
            </div>
            {stateEvents.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedEventId(e.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid",
                  borderColor: (selectedEvent?.id === e.id) ? "var(--primary)" : "var(--border-color)",
                  backgroundColor: (selectedEvent?.id === e.id) ? "rgba(236,72,153,0.1)" : "transparent",
                  color: (selectedEvent?.id === e.id) ? "var(--primary)" : "var(--text-primary)",
                  cursor: "pointer",
                  marginBottom: "6px",
                  fontWeight: (selectedEvent?.id === e.id) ? 700 : 400,
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>🏛️</span>
                <span>{e.name}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.7rem", opacity: 0.6 }}>{e.categories?.length || 0} cats</span>
              </button>
            ))}
          </div>
        )}

        {zoneEvents.length > 0 && (
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              Zone Fests
            </div>
            {zoneEvents.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedEventId(e.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid",
                  borderColor: (selectedEvent?.id === e.id) ? "var(--primary)" : "var(--border-color)",
                  backgroundColor: (selectedEvent?.id === e.id) ? "rgba(236,72,153,0.1)" : "transparent",
                  color: (selectedEvent?.id === e.id) ? "var(--primary)" : "var(--text-primary)",
                  cursor: "pointer",
                  marginBottom: "6px",
                  fontWeight: (selectedEvent?.id === e.id) ? 700 : 400,
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>🗺️</span>
                <span style={{ flex: 1 }}>{e.name}</span>
                <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>{e.categories?.length || 0} cats</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Settings for selected event */}
      {selectedEvent ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)" }}>
          {/* Event Header */}
          <div style={{
            padding: "16px 20px",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(59,130,246,0.1))",
            border: "1px solid rgba(236,72,153,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <span style={{ fontSize: "2rem" }}>{selectedEvent.type === "ZONE" || selectedEvent.parentId ? "🗺️" : "🏛️"}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>{selectedEvent.name}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                {selectedEvent.type === "ZONE" || selectedEvent.parentId ? "Zone Festival" : "State Festival"} • {selectedEvent.categories?.length || 0} categories
              </div>
            </div>
          </div>

          {/* Interactive Poster Studio for Selected Event */}
          <div data-tour="media-poster">
            <InteractivePosterStudio
              key={selectedEvent.id}
              initialSettings={{ targetEventId: selectedEvent.id, ...(selectedEvent.globalSetting || {}) }}
              categories={selectedEvent.categories || []}
              zoneName={selectedEvent.name}
            />
          </div>

          {/* Category-specific backgrounds for this event */}
          {selectedEvent.categories && selectedEvent.categories.length > 0 ? (
            <div className="glass-panel" style={{ padding: "var(--spacing-lg)" }}>
              <h3 style={{ marginBottom: "8px" }}>📂 Category Backgrounds</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "var(--spacing-md)" }}>
                Set a <strong>different poster background</strong> for each category in <strong>{selectedEvent.name}</strong>.
                Category backgrounds override the event default above.
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px"
              }}>
                {selectedEvent.categories.map((cat: any) => (
                  <div key={cat.id} style={{
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "rgba(255,255,255,0.02)"
                  }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "var(--primary)",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span>🏷️</span> {cat.name}
                      {cat.posterBgUrl && (
                        <span style={{
                          marginLeft: "auto",
                          fontSize: "0.65rem",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          backgroundColor: "rgba(16,185,129,0.1)",
                          color: "var(--success)",
                          border: "1px solid rgba(16,185,129,0.2)"
                        }}>
                          ✓ BG SET
                        </span>
                      )}
                    </div>
                    <SingleCategoryUpload category={cat} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--text-muted)" }}>
              No categories found for this event.
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>👈</div>
          <p>Select an event from the left to manage its poster backgrounds.</p>
        </div>
      )}
    </div>
  );
}

// Inline single-category upload with full edit/remove support
function SingleCategoryUpload({ category }: { category: any }) {
  const [url, setUrl] = useState(category.posterBgUrl || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showUploader, setShowUploader] = useState(!category.posterBgUrl);

  const saveToDb = async (newUrl: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/category-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: category.id, posterBgUrl: newUrl })
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Error: " + data.error);
      }
    } catch {
      alert("Failed to save.");
    }
    setSaving(false);
  };

  const handleUploadComplete = async (newUrl: string) => {
    setUrl(newUrl);
    setShowUploader(false);
    await saveToDb(newUrl);
  };

  const handleRemove = async () => {
    if (!confirm("Remove this background image?")) return;
    setRemoving(true);
    setUrl("");
    setShowUploader(true);
    await saveToDb("");
    setRemoving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Current saved image preview */}
      {url && !showUploader ? (
        <div style={{ position: "relative" }}>
          {/* Preview thumbnail */}
          <div style={{
            width: "100%",
            height: "120px",
            borderRadius: "8px",
            overflow: "hidden",
            border: "2px solid rgba(16,185,129,0.4)",
            position: "relative"
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Saved background"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Saved overlay label */}
            <div style={{
              position: "absolute", top: "6px", left: "6px",
              backgroundColor: "rgba(16,185,129,0.85)",
              color: "white", padding: "2px 8px",
              borderRadius: "10px", fontSize: "0.65rem", fontWeight: 700
            }}>
              ✓ SAVED
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={() => setShowUploader(true)}
              className="btn btn-secondary"
              style={{ flex: 1, padding: "6px 10px", fontSize: "0.75rem" }}
            >
              🔄 Change Image
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              style={{
                padding: "6px 10px", fontSize: "0.75rem",
                backgroundColor: "rgba(239,68,68,0.1)",
                color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-md)", cursor: "pointer"
              }}
            >
              {removing ? "..." : "🗑️"}
            </button>
          </div>

          {saved && (
            <div style={{ color: "var(--success)", fontSize: "0.75rem", fontWeight: 600, textAlign: "center", marginTop: "4px" }}>
              ✓ Background updated successfully!
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Show cancel button if there was an existing image */}
          {url && showUploader && (
            <button
              onClick={() => setShowUploader(false)}
              style={{
                width: "100%", marginBottom: "8px", padding: "5px",
                fontSize: "0.75rem", backgroundColor: "transparent",
                border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)",
                color: "var(--text-muted)", cursor: "pointer"
              }}
            >
              ← Cancel (keep current)
            </button>
          )}

          <ImageUpload
            label={url ? "Upload New Image" : `Upload Background`}
            folder="posters"
            initialUrl={null}
            onUploadComplete={handleUploadComplete}
          />

          {saving && (
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "center", marginTop: "4px" }}>
              Saving...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
