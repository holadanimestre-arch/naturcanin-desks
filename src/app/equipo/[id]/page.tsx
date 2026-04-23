import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Avatar, Due, Priority, State, Tag } from "@/components/primitives";
import { IChev, IMore } from "@/components/icons";
import { getTeamMember, getTasksAssignedTo } from "@/lib/supabase/team";

type Params = Promise<{ id: string }>;

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "done" ? "done" : "active";

  const [person, tasks] = await Promise.all([
    getTeamMember(id),
    getTasksAssignedTo(id),
  ]);
  if (!person) return notFound();

  const active = tasks.filter((t) => t.state !== "done");
  const done = tasks.filter((t) => t.state === "done");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = active.filter((t) => {
    if (t.due === "Sin fecha" || t.due === "Hoy" || t.due === "Mañana") return false;
    // approximate: if due contains a date earlier than today
    return false; // we don't have raw date here — detailed overdue shown in list itself
  }).length;

  const list = tab === "done" ? done : active;

  return (
    <div className="nc-app-shell">
      <Sidebar active="team" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Equipo" showAdd={false} />

        <div style={{ flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)" }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 11.5, color: "var(--nc-mute)" }}>
            <Link href="/equipo" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "inherit", textDecoration: "none" }}>
              <IChev dir="left" size={12} /> Volver al equipo
            </Link>
          </div>

          {/* Profile header */}
          <div
            style={{
              background: "var(--nc-surface)",
              border: "1px solid var(--nc-line)",
              borderRadius: "var(--r-lg)",
              padding: 18,
              marginBottom: 14,
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <Avatar id={person.id} name={person.name} size="xl" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{person.name}</div>
                {person.role === "admin" && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, color: "var(--nc-green-dark)",
                      background: "var(--nc-green-soft)", padding: "2px 7px", borderRadius: 999,
                    }}
                  >
                    ★ Admin
                  </span>
                )}
                {person.status === "Invitado" && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 600,
                      background: "var(--nc-yellow-soft)", color: "var(--nc-ink)",
                      padding: "2px 7px", borderRadius: 999,
                    }}
                  >
                    Invitado — pendiente de aceptar
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--nc-mute)" }}>
                {person.department || "Sin departamento"} · {person.email}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11.5 }}>
                <div>
                  <b style={{ fontWeight: 600 }}>{active.length}</b>{" "}
                  <span style={{ color: "var(--nc-mute)" }}>activas</span>
                </div>
                <div>
                  <b style={{ fontWeight: 600 }}>{done.length}</b>{" "}
                  <span style={{ color: "var(--nc-mute)" }}>completadas</span>
                </div>
                {overdue > 0 && (
                  <div>
                    <b style={{ fontWeight: 600, color: "var(--nc-danger)" }}>{overdue}</b>{" "}
                    <span style={{ color: "var(--nc-mute)" }}>vencida{overdue !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            </div>
            <Link href={`/tareas/nueva`} className="nc-btn primary" style={{ fontSize: 12 }}>
              Asignar tarea
            </Link>
          </div>

          {/* Tasks with tabs */}
          <div style={{ background: "var(--nc-surface)", border: "1px solid var(--nc-line)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 14, padding: "10px 14px", borderBottom: "1px solid var(--nc-line)", fontSize: 12 }}>
              <Tab href={`/equipo/${id}`} active={tab === "active"}>
                Activas · {active.length}
              </Tab>
              <Tab href={`/equipo/${id}?tab=done`} active={tab === "done"}>
                Completadas · {done.length}
              </Tab>
            </div>

            {list.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", fontSize: 12, color: "var(--nc-mute)" }}>
                {tab === "done" ? "Aún no hay tareas completadas" : "Sin tareas activas"}
              </div>
            ) : (
              list.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/tareas/${t.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    borderTop: i === 0 ? "none" : "1px solid var(--nc-line-2)",
                    textDecoration: "none", color: "inherit",
                  }}
                >
                  <State s={t.state} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5, fontWeight: 500,
                        textDecoration: t.state === "done" ? "line-through" : "none",
                        opacity: t.state === "done" ? 0.6 : 1,
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <Tag k={t.tag} />
                      {t.due && t.due !== "Sin fecha" && <Due text={t.due} overdue={t.due === "Hoy" && t.state !== "done"} />}
                    </div>
                  </div>
                  <Priority level={t.prio} />
                  <span className="nc-icon-btn" style={{ width: 26, height: 26 }}>
                    <IMore size={13} />
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        fontWeight: active ? 600 : 500,
        color: active ? "var(--nc-green-dark)" : "var(--nc-text)",
        borderBottom: active ? "2px solid var(--nc-green)" : "2px solid transparent",
        padding: "2px 0",
        marginBottom: -11,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}
