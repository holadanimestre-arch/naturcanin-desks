import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { KanbanBoard } from "@/components/kanban-board";
import { BoardListView } from "@/components/board-list-view";
import { BoardCalendarView } from "@/components/board-calendar-view";
import { BoardPeopleView } from "@/components/board-people-view";
import { BoardFilters } from "@/components/board-filters";
import { IChev } from "@/components/icons";
import { getTasks } from "@/lib/supabase/queries";
import { getTeam } from "@/lib/supabase/team";
import { tags as TAG_META } from "@/lib/data";
import type { Task, TagKey, Priority, TaskState } from "@/lib/data";

type ViewKey = "tablero" | "lista" | "calendario" | "personas";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "tablero", label: "Tablero" },
  { key: "lista", label: "Lista" },
  { key: "calendario", label: "Calendario" },
  { key: "personas", label: "Personas" },
];

function parseView(v: string | string[] | undefined): ViewKey {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === "lista" || s === "calendario" || s === "personas") return s;
  return "tablero";
}

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s !== "all" ? s : undefined;
}

function buildQS(params: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `?${s}` : "";
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string; y?: string; m?: string;
    person?: string; tag?: string; prio?: string; state?: string;
  }>;
}) {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const person = str(sp.person);
  const tagF = str(sp.tag);
  const prioF = str(sp.prio);
  const stateF = str(sp.state);

  const [allTasks, team] = await Promise.all([getTasks(), getTeam()]);

  const tasks: Task[] = allTasks.filter((t) => {
    if (person && !t.assignee.includes(person)) return false;
    if (tagF && t.tag !== (tagF as TagKey)) return false;
    if (prioF && t.prio !== (prioF as Priority)) return false;
    if (stateF && t.state !== (stateF as TaskState)) return false;
    return true;
  });

  const now = new Date();
  const year = Number(sp.y) || now.getFullYear();
  const month = Number(sp.m) || now.getMonth() + 1;

  const people = team.map((m) => ({ value: m.id, label: m.name }));
  const tagOptions = (Object.keys(TAG_META) as TagKey[]).map((k) => ({
    value: k,
    label: TAG_META[k].label,
  }));

  const hasAnyFilter = Boolean(person || tagF || prioF || stateF);

  return (
    <div className="nc-app-shell">
      <Sidebar active="board" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          title="Tablero general"
          subtitle={
            hasAnyFilter
              ? `${tasks.length} de ${allTasks.length} tarea${allTasks.length !== 1 ? "s" : ""}`
              : `${tasks.length} tarea${tasks.length !== 1 ? "s" : ""}`
          }
        />
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
            {VIEWS.map((v) => {
              const active = view === v.key;
              const viewParam = v.key === "tablero" ? undefined : v.key;
              const href = `/tablero${buildQS({
                view: viewParam,
                person,
                tag: tagF,
                prio: prioF,
                state: stateF,
              })}`;
              return (
                <Link
                  key={v.key}
                  href={href}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11.5,
                    fontWeight: active ? 500 : 400,
                    background: active ? "var(--nc-surface)" : "transparent",
                    borderRadius: 4,
                    color: active ? "var(--nc-ink)" : "var(--nc-text)",
                    boxShadow: active ? "var(--sh-1)" : "none",
                    textDecoration: "none",
                  }}
                >
                  {v.label}
                </Link>
              );
            })}
          </div>
          <div style={{ width: 1, height: 20, background: "var(--nc-line)", margin: "0 4px" }} />
          <BoardFilters
            view={view}
            y={sp.y}
            m={sp.m}
            person={person}
            tag={tagF}
            prio={prioF}
            state={stateF}
            people={people}
            tags={tagOptions}
          />
          <div style={{ flex: 1 }} />
          {view === "tablero" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--nc-mute)" }}>
                <span>Arrastra las tarjetas entre columnas</span>
              </div>
              <button className="nc-btn ghost" style={{ padding: "4px 8px", fontSize: 11.5, color: "var(--nc-ink)" }}>
                Agrupar: Estado <IChev dir="down" />
              </button>
            </>
          )}
        </div>

        {view === "tablero" && <KanbanBoard initialTasks={tasks} />}
        {view === "lista" && <BoardListView tasks={tasks} />}
        {view === "calendario" && <BoardCalendarView tasks={tasks} year={year} month={month} />}
        {view === "personas" && <BoardPeopleView tasks={tasks} />}
      </div>
    </div>
  );
}
