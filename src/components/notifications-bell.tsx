"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IBell } from "./icons";
import {
  fetchNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/app/actions/notifications";

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchNotifications();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const unread = items?.filter((n) => !n.read).length ?? 0;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    await load();
    if (unread > 0) {
      await markAllNotificationsRead();
      setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
      router.refresh();
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggle}
        className="nc-icon-btn"
        style={{ position: "relative" }}
        aria-label="Notificaciones"
        aria-expanded={open}
      >
        <IBell size={15} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--nc-danger)",
              border: "1.5px solid var(--nc-surface)",
            }}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 320,
            maxHeight: 420,
            background: "var(--nc-surface)",
            border: "1px solid var(--nc-line)",
            borderRadius: "var(--r-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 40,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--nc-line)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--nc-ink)" }}>
              Notificaciones
            </div>
            {unread > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "white",
                  background: "var(--nc-danger)",
                  padding: "1px 6px",
                  borderRadius: 999,
                }}
              >
                {unread}
              </span>
            )}
          </div>

          <div style={{ overflow: "auto", flex: 1 }}>
            {loading && !items ? (
              <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--nc-mute)" }}>
                Cargando…
              </div>
            ) : !items || items.length === 0 ? (
              <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--nc-mute)" }}>
                Sin notificaciones
              </div>
            ) : (
              items.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "10px 14px",
                    borderTop: i === 0 ? "none" : "1px solid var(--nc-line-2)",
                    background: !n.read ? "var(--nc-yellow-tint)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "var(--nc-green-soft)", color: "var(--nc-green-dark)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <IBell size={11} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: "var(--nc-ink)", lineHeight: 1.4 }}>{n.text}</div>
                    <div style={{ fontSize: 10, color: "var(--nc-mute)", marginTop: 2 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {!n.read && (
                    <div
                      style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: "var(--nc-yellow)", marginTop: 4, flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
