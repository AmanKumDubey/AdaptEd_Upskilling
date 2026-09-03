import App from "./App";
import { LoadingState } from "../components/LoadingAndError";
import { AuthProvider } from "../context/AuthProvider";
import { useAuth } from "../hooks/useAuth";
import { LoginPage } from "../pages/Login";

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

function AuthenticatedApp() {
  const { isAuthenticated, loading } = useAuth();

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
