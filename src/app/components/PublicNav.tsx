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
            gap: "10px",
            textDecoration: "none",
            minWidth: 0,
            flex: "1 1 auto",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "8px",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                className="public-nav-title"
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "0.95rem",
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
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  background: "rgba(230, 0, 126, 0.2)",
                  color: "var(--gold-light, #ff8fc4)",
                  border: "1px solid rgba(255, 79, 163, 0.4)",
                  padding: "1px 5px",
                  borderRadius: "9999px",
                  textTransform: "uppercase",
                  fontFamily: "'IBM Plex Mono', monospace",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
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
              className="public-nav-sub"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.65rem",
                color: "var(--slate, #7a7480)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Council of Samastha Women&apos;s Colleges
            </div>
          </div>
        </Link>

        {(showSearch || showLogin) && (
          <div className="public-nav-actions" style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            {showSearch && (
              <Link
                href="/search"
                className="btn-header-search"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#f2ead9",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "9999px",
                  padding: "0.4rem 0.75rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  textDecoration: "none",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                🔍 <span className="nav-search-text">Search</span>
              </Link>
            )}
            {showLogin && (
              <Link
                href="/login"
                className="btn-header-login"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "var(--gold, #ff4fa3)",
                  borderRadius: "9999px",
                  padding: "0.4rem 0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(230, 0, 126, 0.35)",
                  transition: "transform 0.15s ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
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
