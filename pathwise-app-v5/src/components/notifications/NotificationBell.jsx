import { useEffect, useRef, useState } from "react";
import { T } from "../../theme";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../../hooks";

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";
const POLL_MS = 45000;

// Phase B13: notifications only exist server-side (there's nothing to poll
// or show in demo mode) - unlike most Real/Demo splits in this app, the demo
// side here is just "render nothing" rather than static sample data.
export function NotificationBell({ collapsed }) {
  if (!authEnabled) return null;
  return <RealNotificationBell collapsed={collapsed} />;
}

function RealNotificationBell({ collapsed }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { data: countData, refetch: refetchCount } = useUnreadNotificationCount();
  const { data: items, loading, refetch: refetchList } = useNotifications();
  const { execute: markRead } = useMarkNotificationRead();
  const { execute: markAllRead } = useMarkAllNotificationsRead();

  // The bell needs to reflect events OTHER users caused (someone else
  // accepted your invite) - there's no push channel anywhere in this app, so
  // a light poll is the simplest fit for the existing plain-REST pattern.
  useEffect(() => {
    const interval = setInterval(() => refetchCount(), POLL_MS);
    return () => clearInterval(interval);
  }, [refetchCount]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) refetchList();
  };

  const handleItemClick = async (item) => {
    if (!item.readAt) {
      await markRead(item.id);
      refetchCount();
      refetchList();
    }
  };

  const handleMarkAll = async () => {
    await markAllRead();
    refetchCount();
    refetchList();
  };

  const unread = countData?.count || 0;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="nav-item"
        onClick={handleToggle}
        title={collapsed ? "Notifications" : undefined}
      >
        <span className="nav-icon" aria-hidden="true" style={{ position: "relative" }}>
          🔔
          {unread > 0 && (
            <span style={{ position: "absolute", top: -5, right: -8, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 8, background: T.rose, color: "white", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        {!collapsed && <span>Notifications</span>}
      </button>

      {open && (
        <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 8, width: 320, maxWidth: "80vw", maxHeight: 380, overflowY: "auto", background: "white", borderRadius: 14, border: "1px solid rgba(148,163,184,0.2)", boxShadow: "0 12px 32px rgba(0,0,0,0.16)", zIndex: 60, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em" }}>Notifications</span>
            {unread > 0 && (
              <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={handleMarkAll}>Mark all read</button>
            )}
          </div>

          {loading && <p style={{ fontSize: 12.5, color: T.muted, padding: "8px 4px" }}>Loading…</p>}
          {!loading && (items || []).length === 0 && <p style={{ fontSize: 12.5, color: T.muted, padding: "8px 4px" }}>No notifications yet.</p>}

          {(items || []).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 8px",
                borderRadius: 10,
                border: "none",
                background: item.readAt ? "transparent" : "rgba(37,99,235,0.06)",
                marginBottom: 4,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 11.5, color: T.muted }}>{item.message}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
