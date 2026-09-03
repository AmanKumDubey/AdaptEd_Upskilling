// ─────────────────────────────────────────────────────────────────────
// src/pages/OAuthCallback.jsx — lands here right after Google/LinkedIn
// redirects back from better-auth's /api/auth/callback/:provider. That
// redirect already set better-auth's session as an HttpOnly cookie on the
// backend's own origin; this page's only job is to trade that cookie for
// the same bearer token every other login flow stores, then hand off to
// the normal app bootstrap - see setToken() usage in AuthProvider.
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { auth } from "../api/endpoints";
import { setToken } from "../api/client";
import { LoadingState } from "../components/LoadingAndError";

export function OAuthCallbackPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    auth
      .getBetterAuthSession()
      .then((data) => {
        if (cancelled) return;
        const token = data?.session?.token;
        if (!token) throw new Error("No session returned");
        setToken(token);
        // Full reload (not navigate()) so AuthProvider re-runs its bootstrap
        // effect and picks up the freshly-stored token from scratch.
        window.location.replace("/");
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'Outfit', sans-serif" }}>
        <p>Sign-in didn't complete. Please try again.</p>
        <a href="/" style={{ color: "#2563EB", fontWeight: 600 }}>Back to sign in</a>
      </main>
    );
  }

  return (
    <main className="app-loading-shell">
      <LoadingState message="Finishing sign-in..." />
    </main>
  );
}
