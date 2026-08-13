export default function PublicFooter({ eventName }: { eventName?: string }) {
  return (
    <footer
      className="no-print"
      style={{
        background: "#17111A",
        borderTop: "1px solid rgba(214, 22, 92, 0.15)",
        padding: "1.5rem 1.25rem",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.3)",
          margin: 0,
          lineHeight: 1.8,
        }}
      >
        © {new Date().getFullYear()}{" "}
        <span style={{ color: "#FF3D80" }}>
          {eventName || "CSWC Hiya Fiesta 2026"}
        </span>{" "}
        · Council of Samastha Women&apos;s Colleges, Chelari
        <br />
        Official Centralized ArtsFest Platform
      </p>
    </footer>
  );
}
