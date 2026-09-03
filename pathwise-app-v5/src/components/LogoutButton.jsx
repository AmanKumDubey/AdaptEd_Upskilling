// Only ever mounted when VITE_AUTH_ENABLED="true" (see ProfilePage.jsx) -
// useAuth() throws outside an AuthProvider, which only wraps the app in that
// mode (see src/app/Root.jsx).
import { useAuth } from "../hooks/useAuth";

export function LogoutButton({ style, className = "" }) {
  const { logout } = useAuth();
  return (
    <button type="button" className={`btn-ghost ${className}`.trim()} style={style} onClick={() => logout()}>
      Log out
    </button>
  );
}
