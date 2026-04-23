import Link from "next/link";
import { Avatar, Due, Priority, State, Tag } from "./primitives";
import type { Task } from "@/lib/data";

type PersonGroup = {
  id: string;
  name: string;
  tasks: Task[];
};

const UNASSIGNED_ID = "__unassigned__";

export function BoardPeopleView({ tasks }: { tasks: Task[] }) {
  const groupsMap = new Map<string, PersonGroup>();

  for (const t of tasks) {
    if (t.assignee.length === 0) {
      const g = groupsMap.get(UNASSIGNED_ID) ?? { id: UNASSIGNED_ID, name: "Sin asignar", tasks: [] };
      g.tasks.push(t);
      groupsMap.set(UNASSIGNED_ID, g);
      continue;
    }
    for (let i = 0; i < t.assignee.length; i++) {
      const id = t.assignee[i];
      const name = t.assigneeNames?.[i] ?? "—";
      const g = groupsMap.get(id) ?? { id, name, tasks: [] };
      g.tasks.push(t);
      groupsMap.set(id, g);
    }
  }

  const groups = Array.from(groupsMap.values()).sort((a, b) => {
    if (a.id === UNASSIGNED_ID) return 1;
    if (b.id === UNASSIGNED_ID) return -1;
    return b.tasks.length - a.tasks.length;
  });

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)" }}>
      {groups.length === 0 && (
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
            Crea tareas y asígnalas al equipo para verlas agrupadas aquí.
          </div>
        </div>
      )}

      {groups.map((g) => {
        const active = g.tasks.filter((t) => t.state !== "done").length;
        const done = g.tasks.filter((t) => t.state === "done").length;
        return (
          <div key={g.id} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              {g.id === UNASSIGNED_ID ? (
                <span
                  className="nc-avatar"
                  style={{
                    background: "var(--nc-line-2)",
                    color: "var(--nc-mute)",
                    fontSize: 10,
                  }}
                >
                  ?
                </span>
              ) : (
                <Avatar id={g.id} name={g.name} />
              )}
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nc-ink)" }}>{g.name}</div>
              <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>
                {active} activa{active !== 1 ? "s" : ""} · {done} hecha{done !== 1 ? "s" : ""}
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
              {g.tasks.map((t, j) => (
                <Link
                  key={`${g.id}-${t.id}`}
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
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
