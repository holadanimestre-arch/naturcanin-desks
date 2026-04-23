import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { AvStack, Due, Priority, State, Tag } from "@/components/primitives";
import { ICheck } from "@/components/icons";
import { getMyTasks } from "@/lib/supabase/queries";
import type { Task } from "@/lib/data";

type Group = { label: string; list: Task[] };

export default async function MyTasksPage() {
  const tasks = await getMyTasks();

  const today = tasks.filter((t) => (t.due === "Hoy" || t.due === "Mañana") && t.state !== "done");
  const week = tasks.filter(
    (t) => t.due !== "Hoy" && t.due !== "Mañana" && t.due !== "Sin fecha" && t.state !== "done"
  );
  const noDate = tasks.filter((t) => t.due === "Sin fecha" && t.state !== "done");
  const done = tasks.filter((t) => t.state === "done");

  const groups: Group[] = [
    { label: "Hoy y mañana", list: today },
    { label: "Próximas", list: week },
    { label: "Sin fecha", list: noDate },
    { label: "Completadas", list: done },
  ].filter((g) => g.list.length > 0);

  const todayCount = today.length;
  const weekCount = week.length + today.length;
  const doneCount = done.length;

  const kpis = [
    { n: String(todayCount), l: "Hoy / Mañana", c: "var(--pr-high)" },
    { n: String(weekCount), l: "Esta semana", c: "var(--nc-yellow)" },
    { n: String(doneCount), l: "Completadas", c: "var(--nc-green)" },
  ];

  return (
    <div className="nc-app-shell">
      <Sidebar active="my" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Mis tareas" subtitle={`${tasks.length} asignada${tasks.length !== 1 ? "s" : ""}`} />
        <div style={{ flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)" }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
            {kpis.map((k) => (
              <div
                key={k.l}
                style={{
                  background: "var(--nc-surface)",
                  border: "1px solid var(--nc-line)",
                  borderRadius: "var(--r-lg)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: k.c, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {k.n}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--nc-mute)", marginTop: 4 }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {tasks.length === 0 && (
            <div
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: "var(--r-lg)",
                padding: "48px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sin tareas asignadas</div>
              <div style={{ fontSize: 12, color: "var(--nc-mute)", marginBottom: 16 }}>
                Cuando alguien te asigne una tarea, aparecerá aquí.
              </div>
              <Link href="/tareas/nueva" className="nc-btn primary" style={{ fontSize: 12, display: "inline-flex" }}>
                Crear tarea
              </Link>
            </div>
          )}

          {/* Groups */}
          {groups.map((g) => (
            <div key={g.label} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nc-ink)" }}>{g.label}</div>
                <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>
                  {g.list.length} tarea{g.list.length !== 1 ? "s" : ""}
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
                {g.list.map((t, j) => (
                  <Link
                    key={t.id}
                    href={`/tareas/${t.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderTop: j === 0 ? "none" : "1px solid var(--nc-line-2)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span
                      style={{
                        width: 16, height: 16, borderRadius: "50%",
                        border: "1.5px solid var(--nc-line)",
                        background: t.state === "done" ? "var(--nc-green)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", flexShrink: 0,
                      }}
                    >
                      {t.state === "done" && <ICheck size={9} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--nc-ink)",
                          fontWeight: 500,
                          textDecoration: t.state === "done" ? "line-through" : "none",
                          opacity: t.state === "done" ? 0.55 : 1,
                        }}
                      >
                        {t.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                        <Tag k={t.tag} />
                        <State s={t.state} />
                        {t.subs && (
                          <span style={{ fontSize: 10, color: "var(--nc-mute)" }}>
                            {t.subs.d}/{t.subs.t} subtareas
                          </span>
                        )}
                      </div>
                    </div>
                    <Priority level={t.prio} />
                    {t.due && t.due !== "Sin fecha" && <Due text={t.due} overdue={t.due === "Hoy" && t.state !== "done"} />}
                    <AvStack ids={t.assignee} names={t.assigneeNames} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
