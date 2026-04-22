import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Avatar, AvStack, Due, Priority, Tag } from "@/components/primitives";
import { IBell, IChev } from "@/components/icons";
import { getTasks, getMyNotifications } from "@/lib/supabase/queries";

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default async function HomePage() {
  const [tasks, notifications] = await Promise.all([getTasks(), getMyNotifications()]);

  const todayTasks = tasks.filter((t) => t.state !== "done").slice(0, 4);
  const todayCount = tasks.filter((t) => t.due === "Hoy" && t.state !== "done").length;
  const weekCount = tasks.filter((t) => t.state !== "done").length;
  const doneCount = tasks.filter((t) => t.state === "done").length;
  const unread = notifications.filter((n: any) => !n.read).length;

  const kpis: { n: string; l: string; c: string }[] = [
    { n: String(todayCount || 0),  l: "Hoy",    c: "var(--pr-high)" },
    { n: String(weekCount || 0),   l: "Activas", c: "var(--nc-yellow)" },
    { n: String(doneCount || 0),   l: "Hechas",  c: "var(--nc-green)" },
  ];

  return (
    <div className="nc-app-shell">
      <Sidebar active="home" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Inicio" subtitle="Naturcanin Tasks" />
        <div style={{ flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
            {/* LEFT */}
            <div>
              <div
                style={{
                  background: "var(--nc-surface)",
                  border: "1px solid var(--nc-line)",
                  borderRadius: "var(--r-lg)",
                  padding: "18px 20px",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 2 }}>
                  Bienvenido 👋
                </div>
                <div style={{ fontSize: 12, color: "var(--nc-mute)" }}>
                  {todayCount > 0
                    ? <>Hoy tienes <b style={{ color: "var(--nc-ink)", fontWeight: 600 }}>{todayCount} tarea{todayCount !== 1 ? "s" : ""}</b> pendiente{todayCount !== 1 ? "s" : ""}</>
                    : "No hay tareas urgentes para hoy"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
                  {kpis.map((k) => (
                    <div
                      key={k.l}
                      style={{
                        background: "var(--nc-line-2)",
                        borderRadius: "var(--r-sm)",
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: k.c,
                          letterSpacing: "-0.02em",
                          lineHeight: 1,
                        }}
                      >
                        {k.n}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--nc-mute)", marginTop: 2 }}>{k.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: "var(--nc-surface)",
                  border: "1px solid var(--nc-line)",
                  borderRadius: "var(--r-lg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--nc-line)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Tareas activas</div>
                  <div style={{ flex: 1 }} />
                  <Link href="/tablero" className="nc-btn ghost" style={{ fontSize: 11 }}>
                    Ver tablero <IChev dir="right" />
                  </Link>
                </div>
                {todayTasks.length === 0 ? (
                  <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--nc-mute)" }}>
                    No hay tareas activas — <Link href="/tareas/nueva" style={{ color: "var(--nc-green-dark)" }}>crear una</Link>
                  </div>
                ) : (
                  todayTasks.map((t, i) => (
                    <Link
                      key={t.id}
                      href={`/tareas/${t.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderTop: i === 0 ? "none" : "1px solid var(--nc-line-2)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "1.5px solid var(--nc-line)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t.title}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                          <Tag k={t.tag} />
                          <Due text={t.due} overdue={t.due === "Hoy"} />
                        </div>
                      </div>
                      <Priority level={t.prio} />
                      <AvStack ids={t.assignee} names={t.assigneeNames} />
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: Notifications */}
            <div
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
                alignSelf: "flex-start",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--nc-line)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <IBell size={14} />
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Notificaciones</div>
                {unread > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
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

              {notifications.length === 0 ? (
                <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--nc-mute)" }}>
                  Sin notificaciones
                </div>
              ) : (
                notifications.map((n: any, i: number) => (
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
                      <div style={{ fontSize: 10, color: "var(--nc-mute)", marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.read && (
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--nc-yellow)", marginTop: 4, flexShrink: 0 }} />
                    )}
                  </div>
                ))
              )}

              <div style={{ padding: "8px 14px", borderTop: "1px solid var(--nc-line)", textAlign: "center" }}>
                <button style={{ fontSize: 11, color: "var(--nc-green-dark)", fontWeight: 500 }}>
                  Ver todas →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
