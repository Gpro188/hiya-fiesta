"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBranding } from "./branding";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSuperAdmin = searchParams.get("callbackUrl")?.includes("super-admin");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({
    name: "Artsfest Central Portal",
    moto: "Central Festival Management",
  });

  useEffect(() => {
    getBranding().then(setBranding);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid username or password");
      setLoading(false);
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "var(--bg-color)",
      }}
    >
      {/* Left decorative panel (hidden on mobile) */}
      <div
        className="login-left-panel"
        style={{
          width: "45%",
          position: "relative",
          background: "linear-gradient(145deg, #5A0019 0%, #8E0033 40%, #A5003A 70%, #818cf8 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "3rem",
          overflow: "hidden",
        }}
      >
        {/* Decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-10%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-5%",
            left: "-5%",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "20%",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "white" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <img
              src="/icon.png"
              alt="Logo"
              style={{ width: "50px", height: "50px", objectFit: "contain" }}
            />
          </div>

          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.75rem", lineHeight: 1.1 }}>
            CSWC Hiya Fiesta 2026
          </h1>
          <p style={{ fontSize: "1rem", opacity: 0.8, lineHeight: 1.6, maxWidth: "280px" }}>
            She Can. She Will.
          </p>

          {/* Feature bullets */}
          <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", gap: "0.875rem", textAlign: "left" }}>
            {[
              { icon: "🏆", text: "Live standings & results broadcasting" },
              { icon: "📅", text: "Program scheduling & venue planning" },
              { icon: "👥", text: "Multi-role team management" },
              { icon: "🎨", text: "Automated poster & ID card generation" },
            ].map((f) => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: "0.75rem", opacity: 0.9 }}>
                <span
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </span>
                <span style={{ fontSize: "0.875rem", lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div
        className="login-right-panel"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "2.5rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "420px" }} className="animate-fade-in">
          {/* Header */}
          <div style={{ marginBottom: "2rem" }} data-tour="login-branding">
            <h2 style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.375rem" }}>
              Sign in to your account
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {branding.name} · {branding.moto}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                backgroundColor: "rgba(239,68,68,0.08)",
                color: "#dc2626",
                padding: "0.875rem 1rem",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.5rem",
                border: "1px solid rgba(239,68,68,0.2)",
                fontSize: "0.875rem",
              }}
            >
              <span style={{ fontSize: "1rem" }}>⚠️</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div data-tour="login-username">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "1rem",
                    pointerEvents: "none",
                  }}
                >
                  👤
                </span>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "2.5rem" }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter your assigned username"
                />
              </div>
            </div>

            <div data-tour="login-password">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "1rem",
                    pointerEvents: "none",
                  }}
                >
                  🔒
                </span>
                <input
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    padding: 0,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div data-tour="login-submit">
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{
                  width: "100%",
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "0.95rem",
                  gap: "0.625rem",
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Authenticating...
                  </>
                ) : (
                  "Sign In to Portal"
                )}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <p
            style={{
              marginTop: "2rem",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
            }}
          >
            🔐 Secure Portal Area · Authorized Access Only
          </p>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 768px) {
            .login-left-panel { display: none !important; }
            .login-right-panel { padding: 1.5rem !important; }
          }
          `
        }} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
