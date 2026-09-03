// ─────────────────────────────────────────────────────────────────────
// src/components/LoadingAndError.jsx — Shared loading/error states
// ─────────────────────────────────────────────────────────────────────

import { T } from "../theme";

export function LoadingSpinner({ size = 24, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color || "rgba(148,163,184,0.2)"} strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color || T.blue} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingState({ message = "Loading..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 60, gap: 16 }}>
      <LoadingSpinner size={32} />
      <span style={{ fontSize: 14, color: T.muted }}>{message}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 60, gap: 12,
      background: "rgba(244,63,94,0.04)", borderRadius: 16,
      border: "1px solid rgba(244,63,94,0.1)",
    }}>
      <span style={{ fontSize: 28 }}>⚠</span>
      <span style={{ fontSize: 14, color: T.rose, fontWeight: 600 }}>
        {message || "Something went wrong"}
      </span>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost"
          style={{ marginTop: 8, fontSize: 13 }}>
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "◇", title, message, action }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 60, gap: 8,
    }}>
      <span style={{ fontSize: 36, opacity: 0.3 }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>{title}</span>
      {message && (
        <span style={{ fontSize: 13, color: T.muted, textAlign: "center", maxWidth: 300 }}>
          {message}
        </span>
      )}
      {action}
    </div>
  );
}

/**
 * Wrapper that handles loading/error/empty states for any data-driven component.
 *
 * Usage:
 *   <DataGuard loading={loading} error={error} data={courses} onRetry={refetch}>
 *     {(courses) => <CourseList courses={courses} />}
 *   </DataGuard>
 */
export function DataGuard({ loading, error, data, onRetry, empty, children }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (empty && (!data || (Array.isArray(data) && data.length === 0))) return empty;
  return typeof children === "function" ? children(data) : children;
}

