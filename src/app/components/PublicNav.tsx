import Link from "next/link";

/**
 * Shared themed nav/header for all public-facing pages
 * (results, search, hub, TV, etc.)
 */
export default function PublicNav({
  eventName,
  showSearch = true,
}: {
  eventName?: string;
  showSearch?: boolean;
}) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(23, 17, 26, 0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(214, 22, 92, 0.18)",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 1.25rem",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <img
            src="/icon.png"
            alt="CSWC"
            style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 8 }}
          />
          <div>
            <div
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: "0.88rem",
                color: "#fff",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                lineHeight: 1.2,
              }}
            >
              {eventName || "CSWC Hiya Fiesta 2026"}
            </div>
            <div
              style={{
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              Official Results Portal
            </div>
          </div>
        </Link>

        <div style={{ display: "flex", gap: 10 }}>
          {showSearch && (
            <Link
              href="/search"
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 40,
                padding: "0 1rem",
                height: 36,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                transition: "border-color 0.2s",
              }}
            >
              🔍 Search
            </Link>
          )}
          <Link
            href="/login"
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: "0.8rem",
              fontWeight: 800,
              color: "#fff",
              background: "#D6165C",
              borderRadius: 40,
              padding: "0 1.2rem",
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
