import Link from "next/link";
import { AvStack, Due, Priority, State, Tag } from "./primitives";
import { ICheck } from "./icons";
import type { Task, TaskState } from "@/lib/data";

type Col = { title: string; state: TaskState; color: string };

const COLUMNS: Col[] = [
  { title: "Pendiente", state: "pending", color: "#C8C6B8" },
  { title: "En curso", state: "progress", color: "var(--nc-yellow)" },
  { title: "Completadas", state: "done", color: "var(--nc-green)" },
];

export function BoardListView({ tasks }: { tasks: Task[] }) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)" }}>
      {tasks.length === 0 ? (
        <div
          style={{
            background: "var(--nc-surface)",
            border: "1px solid var(--nc-line)",
            borderRadius: "var(--r-lg)",
            padding: "48px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sin tareas</div>
          <div style={{ fontSize: 12, color: "var(--nc-mute)" }}>
            Crea tu primera tarea desde el botón superior.
          </div>
        </div>
      ) : (
        COLUMNS.map((c) => {
          const list = tasks.filter((t) => t.state === c.state);
          if (list.length === 0) return null;
          return (
            <div key={c.state} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nc-ink)" }}>{c.title}</div>
                <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>
                  {list.length} tarea{list.length !== 1 ? "s" : ""}
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
                {list.map((t, j) => (
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
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                        <Tag k={t.tag} />
                        <State s={t.state} />
                      </div>
                    </div>
                    <Priority level={t.prio} />
                    {t.due && t.due !== "Sin fecha" && (
                      <Due text={t.due} overdue={t.due === "Hoy" && t.state !== "done"} />
                    )}
                    <AvStack ids={t.assignee} names={t.assigneeNames} />
                  </Link>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
