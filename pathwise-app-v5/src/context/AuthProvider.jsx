import { useCallback, useEffect, useState } from "react";
import { auth } from "../api/endpoints";
import { clearToken, getToken, setToken } from "../api/client";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    auth
      .getProfile()
      .then((data) => setUser(data.user || data))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setError("Session expired. Please log in again.");
    };
    window.addEventListener("auth:expired", handleExpiredSession);
    return () => window.removeEventListener("auth:expired", handleExpiredSession);
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await auth.login(email, password);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  }, []);

  // fields: { username?, email, password, firstName?, lastName?, phone?,
  // goals?, interests?, experienceLevel?, themePreference? } - matches
  // adapted-backend's registerSchema, not a generic { name, email, password }.
  const register = useCallback(async (fields) => {
    setError(null);
    try {
      const data = await auth.register(fields);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // Local logout must still complete when the backend is unavailable.
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback(async (data) => {
    const updated = await auth.updateProfile(data);
    setUser(updated.user || updated);
    return updated;
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await auth.getProfile();
    setUser(data.user || data);
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    isOnboarded: user?.onboarded ?? false,
    isEmployer: user?.role === "employer" || user?.role === "admin",
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
