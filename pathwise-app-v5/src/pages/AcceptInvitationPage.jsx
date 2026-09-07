import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GlassCard } from "../components/UIKit";
import { T } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { useAcceptInvitation } from "../hooks";
import { authEnabled } from "../features/employer/employerAccess";

// Phase B12: the other half of the invite flow (see InviteMemberPanel.jsx).
// Reachable while logged out (see app/Root.jsx's exception for this path,
// same treatment as /auth/callback) since an invited person often has no
// session yet - in that case this just asks them to log in and reopen the
// email link, rather than losing the token on a silent redirect.
//
// Split into two full components (rather than an early return before
// useAuth()) because in demo mode Root.jsx never mounts AuthProvider at all -
// calling useAuth() unconditionally here would throw. Organizations/invites
// aren't a demo-mode concept anyway (see employerAccess.js), so the demo
// side is just an honest "not available" message.
export function AcceptInvitationPage() {
  return authEnabled ? <RealAcceptInvitationPage /> : <DemoAcceptInvitationPage />;
}

function DemoAcceptInvitationPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <GlassCard style={{ padding: 40, textAlign: "center", maxWidth: 440 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✉️</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Not available in demo mode</div>
        <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.55 }}>Organization invitations need a real account.</p>
      </GlassCard>
    </div>
  );
}

function RealAcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { execute: accept, loading, error, data } = useAcceptInvitation();
  // A ref (not state) so the guard is visible synchronously to a second
  // effect run before any state update from the first has committed - in
  // dev, React 18 StrictMode double-invokes effects, and acceptInvitation()
  // isn't safe to call twice (the second call sees the invitation already
  // accepted and errors) - confirmed live: without this both the success and
  // error UI rendered at once.
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && token && !attemptedRef.current) {
      attemptedRef.current = true;
      accept(token).catch(() => {});
    }
  }, [isAuthenticated, token, accept]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <GlassCard style={{ padding: 40, textAlign: "center", maxWidth: 440 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✉️</div>

        {!token && (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Invalid invitation link</div>
            <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.55 }}>This link is missing its invitation token.</p>
          </>
        )}

        {token && authLoading && (
          <p style={{ fontSize: 13.5, color: T.muted }}>Loading…</p>
        )}

        {token && !authLoading && !isAuthenticated && (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Log in to accept this invitation</div>
            <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.55, marginBottom: 20 }}>
              Log in (or create an account) using the email address this invite was sent to, then open this link again.
            </p>
            <Link to="/" className="btn-primary" style={{ display: "inline-block", fontSize: 13, textDecoration: "none" }}>Go to login →</Link>
          </>
        )}

        {/* data/error are mutually exclusive in the UI even though the
            underlying mutation state technically isn't (useMutation resets
            `error` on each call but never clears a previous `data`) - a
            success always wins over a later error here. */}
        {token && isAuthenticated && data && (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 8 }}>You're in!</div>
            <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.55, marginBottom: 20 }}>Invitation accepted — you're now a member of this organization.</p>
            <Link to="/employer" className="btn-primary" style={{ display: "inline-block", fontSize: 13, textDecoration: "none" }}>Go to Employer Dashboard →</Link>
          </>
        )}

        {token && isAuthenticated && !data && error && (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Couldn't accept this invitation</div>
            <p style={{ fontSize: 13.5, color: T.rose, lineHeight: 1.55, marginBottom: 20 }}>{error}</p>
            {user?.email && (
              <p style={{ fontSize: 12, color: T.faint }}>Logged in as {user.email}. If the invite was sent to a different address, log in with that account instead.</p>
            )}
          </>
        )}

        {token && isAuthenticated && !data && !error && (
          <p style={{ fontSize: 13.5, color: T.muted }}>{loading ? "Accepting invitation…" : "Preparing…"}</p>
        )}
      </GlassCard>
    </div>
  );
}
