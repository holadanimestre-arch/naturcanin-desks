import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { KanbanBoard } from "@/components/kanban-board";
import { IChev, IFilter, ITag, IUsers } from "@/components/icons";
import { getTasks } from "@/lib/supabase/queries";

export default async function BoardPage() {
  const tasks = await getTasks();

  return (
    <div className="nc-app-shell">
      <Sidebar active="board" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Tablero general" subtitle={`${tasks.length} tarea${tasks.length !== 1 ? "s" : ""}`} />
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
            <span>Arrastra las tarjetas entre columnas</span>
          </div>
          <button className="nc-btn ghost" style={{ padding: "4px 8px", fontSize: 11.5, color: "var(--nc-ink)" }}>
            Agrupar: Estado <IChev dir="down" />
          </button>
        </div>

        <KanbanBoard initialTasks={tasks} />
      </div>
    </div>
  );
}
