import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Notification } from "../lib/types";

// Real in-app notifications (booking confirmed/cancelled, progress logged, new message,
// verification updated) — see backend/src/routes/notifications.ts for the events that
// create these. Polls every 30s rather than a websocket, which is plenty for this MVP's
// scale and avoids a new infra dependency.
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    api<Notification[]>("/notifications/me").then(setNotifications).catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markAllRead() {
    await api("/notifications/read-all", { method: "PATCH" });
    load();
  }

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="notif-bell" ref={ref}>
      <button type="button" className="notif-bell-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="notif-mark-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 && <p className="empty-state" style={{ padding: "1rem" }}>Nothing yet.</p>}
          {notifications.slice(0, 8).map((n) => (
            <Link
              key={n.id}
              to={n.link || "#"}
              className={`notif-item ${!n.readAt ? "is-unread" : ""}`}
              onClick={() => setOpen(false)}
            >
              <strong>{n.title}</strong>
              <div className="muted" style={{ fontSize: "0.8rem" }}>{n.body}</div>
              <div className="muted" style={{ fontSize: "0.7rem" }}>{new Date(n.createdAt).toLocaleString()}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
