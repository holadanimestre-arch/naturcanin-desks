import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { TaskCard } from "@/components/task-card";
import { IChev, IFilter, IMore, IPlus, ITag, IUsers } from "@/components/icons";
import type { TaskState, Task } from "@/lib/data";
import { getTasks } from "@/lib/supabase/queries";

type Col = { title: string; state: TaskState; color: string; list: Task[] };

function Column({ c }: { c: Col }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--nc-line-2)",
        borderRadius: "var(--r-lg)",
        padding: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 10px" }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--nc-ink)" }}>{c.title}</div>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            color: "var(--nc-mute)",
            background: "var(--nc-surface)",
            padding: "1px 6px",
            borderRadius: 999,
          }}
        >
          {c.list.length}
        </span>
        <div style={{ flex: 1 }} />
        <button className="nc-icon-btn" style={{ width: 22, height: 22 }} aria-label="Añadir">
          <IPlus size={12} />
        </button>
        <button className="nc-icon-btn" style={{ width: 22, height: 22 }} aria-label="Más">
          <IMore size={12} />
        </button>
      </div>
      <div className="nc-scroll" style={{ flex: 1, minHeight: 0 }}>
        {c.list.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 12px",
              fontSize: 11.5,
              color: "var(--nc-mute)",
            }}
          >
            Sin tareas
          </div>
        ) : (
          c.list.map((t) => <TaskCard key={t.id} t={t} />)
        )}
      </div>
    </div>
  );
}

export default async function BoardPage() {
  const tasks = await getTasks();

  const cols: Col[] = [
    { title: "Pendiente",  state: "pending",  color: "#C8C6B8",            list: tasks.filter((t) => t.state === "pending") },
    { title: "En curso",   state: "progress", color: "var(--nc-yellow)",   list: tasks.filter((t) => t.state === "progress") },
    { title: "Completada", state: "done",     color: "var(--nc-green)",    list: tasks.filter((t) => t.state === "done") },
  ];

  return (
    <div className="nc-app-shell">
      <Sidebar active="board" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Tablero general" subtitle={`Vista admin · ${tasks.length} tareas activas`} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderBottom: "1px solid var(--nc-line)",
            background: "var(--nc-surface)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 4, background: "var(--nc-line-2)", padding: 3, borderRadius: "var(--r-sm)" }}>
            <button
              style={{
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 500,
                background: "var(--nc-surface)",
                borderRadius: 4,
                color: "var(--nc-ink)",
                boxShadow: "var(--sh-1)",
              }}
            >
              Tablero
            </button>
            <button style={{ padding: "4px 10px", fontSize: 11.5, color: "var(--nc-text)" }}>Lista</button>
            <button style={{ padding: "4px 10px", fontSize: 11.5, color: "var(--nc-text)" }}>Calendario</button>
            <button style={{ padding: "4px 10px", fontSize: 11.5, color: "var(--nc-text)" }}>Personas</button>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--nc-line)", margin: "0 4px" }} />
          <button className="nc-btn secondary" style={{ padding: "5px 10px", fontSize: 11.5 }}>
            <IFilter size={12} /> Filtros
          </button>
          <button className="nc-btn secondary" style={{ padding: "5px 10px", fontSize: 11.5 }}>
            <IUsers size={12} /> Todas las personas
          </button>
          <button className="nc-btn secondary" style={{ padding: "5px 10px", fontSize: 11.5 }}>
            <ITag size={11} /> Todas las categorías
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--nc-mute)" }}>
            <span>Agrupar por:</span>
            <button className="nc-btn ghost" style={{ padding: "4px 8px", fontSize: 11.5, color: "var(--nc-ink)" }}>
              Estado <IChev dir="down" />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            gap: 12,
            padding: 14,
            minHeight: 0,
            background: "var(--nc-bg)",
            overflow: "auto",
          }}
        >
          {cols.map((c) => (
            <Column key={c.state} c={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
