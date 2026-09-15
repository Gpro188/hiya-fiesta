"use client";

export default function VenuePrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      style={{
        padding: "6px 16px",
        borderRadius: "6px",
        backgroundColor: "#059669",
        color: "#ffffff",
        border: "none",
        fontSize: "0.85rem",
        fontWeight: 800,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "0 2px 8px rgba(5,150,105,0.4)",
      }}
    >
      <span>🖨️</span> PRINT MASTER CHECKLIST
    </button>
  );
}
