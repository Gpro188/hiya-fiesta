import Link from "next/link";

export default function PublicNav({
  eventName,
  showSearch = true,
  showLogin = true,
}: {
  eventName?: string;
  showSearch?: boolean;
  showLogin?: boolean;
}) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--ink, #1a1420)",
        borderBottom: "1px solid rgba(255, 79, 163, 0.2)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0.6rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.25)",
              flexShrink: 0,
            }}
          >
            <img
              src="/icon.png"
              alt="CSWC Fiesta Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {eventName || "Hiya Fiesta 2026"}
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  background: "rgba(230, 0, 126, 0.2)",
                  color: "var(--gold-light, #ff8fc4)",
                  border: "1px solid rgba(255, 79, 163, 0.4)",
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  textTransform: "uppercase",
                  fontFamily: "'IBM Plex Mono', monospace",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "var(--gold, #ff4fa3)",
                    display: "inline-block",
                    boxShadow: "0 0 6px var(--gold, #ff4fa3)",
                  }}
                />
                LIVE
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                color: "var(--slate, #7a7480)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
              className="public-nav-sub"
            >
              Council of Samastha Women&apos;s Colleges
            </div>
          </div>
        </Link>

        {(showSearch || showLogin) && (
          <div className="public-nav-actions" style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
            {showSearch && (
              <Link
                href="/search"
                className="btn-header-search"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#f2ead9",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "9999px",
                  padding: "0.45rem 1rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                🔍 Search
              </Link>
            )}
            {showLogin && (
              <Link
                href="/login"
                className="btn-header-login"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "var(--gold, #ff4fa3)",
                  borderRadius: "9999px",
                  padding: "0.45rem 1.1rem",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(230, 0, 126, 0.35)",
                  transition: "transform 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                Portal Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
