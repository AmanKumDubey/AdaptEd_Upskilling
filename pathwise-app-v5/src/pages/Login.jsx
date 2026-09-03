// ─────────────────────────────────────────────────────────────────────
// src/pages/Login.jsx — Auth page (login + register)
// ─────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../api/endpoints";
import { T } from "../theme";
import { LoadingSpinner } from "../components/LoadingAndError";

export function LoginPage() {
  const { login, register, error, clearError } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        // Backend's registerSchema takes { email, password, firstName?, ... }
        // - no single "name" field, and username is optional (auto-generated
        // if omitted).
        await register({ email, password, firstName: name });
      }
    } catch {
      // error is set in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const data = await auth.signInWithSocial("google", `${window.location.origin}/auth/callback`);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setGoogleLoading(false);
      }
    } catch {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: `linear-gradient(160deg, #F0F7FF, ${T.bg}, #F5F0FF, #F0FFFE)`,
      position: "relative",
    }}>
      {/* Background orbs */}
      <div style={{ position: "absolute", top: -120, right: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.08), transparent 70%)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: -80, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06), transparent 65%)", filter: "blur(50px)" }} />

      <div style={{
        width: 400, padding: 40, borderRadius: 24,
        background: T.surface, backdropFilter: T.blur,
        border: `1px solid ${T.border}`, boxShadow: T.shadowLg,
        position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${T.blue}, #6366F1)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'General Sans'", fontWeight: 700, fontSize: 22, color: "white",
            boxShadow: "0 8px 28px rgba(37,99,235,0.3)",
          }}>P</div>
          <h1 style={{
            fontFamily: "'General Sans'", fontSize: 26, fontWeight: 700,
            letterSpacing: "-0.02em", color: T.navy, marginBottom: 4,
          }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ fontSize: 14, color: T.muted }}>
            {mode === "login" ? "Sign in to continue your journey" : "Start your learning journey"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", marginBottom: 16, borderRadius: 12,
            background: T.roseBg, border: "1px solid rgba(244,63,94,0.12)",
            fontSize: 13, color: T.rose, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <input type="text" placeholder="Full name" value={name}
              onChange={(e) => { setName(e.target.value); clearError(); }}
              required
              style={{
                background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.7)", borderRadius: 14,
                padding: "12px 16px", color: T.navy, fontSize: 14,
                fontFamily: "'Outfit'", outline: "none", width: "100%",
              }}
            />
          )}
          <input type="email" placeholder="Email address" value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            required
            style={{
              background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.7)", borderRadius: 14,
              padding: "12px 16px", color: T.navy, fontSize: 14,
              fontFamily: "'Outfit'", outline: "none", width: "100%",
            }}
          />
          <input type="password" placeholder="Password" value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            required minLength={8}
            style={{
              background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.7)", borderRadius: 14,
              padding: "12px 16px", color: T.navy, fontSize: 14,
              fontFamily: "'Outfit'", outline: "none", width: "100%",
            }}
          />
          <button type="submit" disabled={loading} className="btn-primary"
            style={{
              width: "100%", padding: "13px 0", fontSize: 15, borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: loading ? 0.7 : 1, cursor: loading ? "wait" : "pointer",
              fontFamily: "'Outfit'",
            }}>
            {loading && <LoadingSpinner size={18} color="white" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: 12, color: T.muted }}>or</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        {/* Google sign-in */}
        <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading}
          style={{
            width: "100%", padding: "12px 0", fontSize: 14, borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            background: "rgba(255,255,255,0.8)", border: `1px solid ${T.border}`,
            color: T.navy, fontWeight: 600, fontFamily: "'Outfit'",
            opacity: googleLoading ? 0.7 : 1, cursor: googleLoading ? "wait" : "pointer",
          }}>
          {googleLoading ? (
            <LoadingSpinner size={16} color={T.navy} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
            </svg>
          )}
          Continue with Google
        </button>

        {/* Toggle */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.muted }}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <span onClick={() => { setMode(mode === "login" ? "register" : "login"); clearError(); }}
            style={{ color: T.blue, fontWeight: 600, cursor: "pointer" }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}
