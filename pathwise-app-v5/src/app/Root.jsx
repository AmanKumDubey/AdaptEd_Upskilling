import { useLocation } from "react-router-dom";
import App from "./App";
import { LoadingState } from "../components/LoadingAndError";
import { AuthProvider } from "../context/AuthProvider";
import { useAuth } from "../hooks/useAuth";
import { LoginPage } from "../pages/Login";
import { OAuthCallbackPage } from "../pages/OAuthCallback";

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

function AuthenticatedApp() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Must win regardless of isAuthenticated/loading - this is the one route
  // that's still mid-login when it first renders, so neither branch below
  // should get a chance to bounce it to the login screen first.
  if (location.pathname === "/auth/callback") {
    return <OAuthCallbackPage />;
  }

  // An invited person often has no session yet - let the full app (and
  // AcceptInvitationPage's own logged-out state) handle this path instead of
  // bouncing straight to the login screen, which would lose the ?token=
  // query string with no way back to it.
  if (location.pathname === "/invitations/accept" && !loading) {
    return <App />;
  }

  if (loading) {
    return (
      <main className="app-loading-shell">
        <LoadingState message="Loading Pathwise..." />
      </main>
    );
  }

  return isAuthenticated ? <App /> : <LoginPage />;
}

export default function Root() {
  if (!authEnabled) {
    return <App />;
  }

  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
