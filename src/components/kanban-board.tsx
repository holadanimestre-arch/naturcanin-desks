"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskCard } from "./task-card";
import { IMore, IPlus } from "./icons";
import { updateTaskState } from "@/app/tablero/actions";
import { tags as TAG_META } from "@/lib/data";
import type { Task, TaskState, TagKey } from "@/lib/data";
import type { GroupKey } from "./board-grouping";

type Col = { key: string; title: string; color: string; matches: (t: Task) => boolean };

const STATE_COLUMNS: Col[] = [
  { key: "pending",  title: "Pendiente",  color: "#C8C6B8",            matches: (t) => t.state === "pending" },
  { key: "progress", title: "En curso",   color: "var(--nc-yellow)",   matches: (t) => t.state === "progress" },
  { key: "done",     title: "Completada", color: "var(--nc-green)",    matches: (t) => t.state === "done" },
];

const PRIO_COLUMNS: Col[] = [
  { key: "high", title: "Alta",  color: "var(--nc-danger)",   matches: (t) => t.prio === "high" },
  { key: "med",  title: "Media", color: "var(--nc-yellow)",   matches: (t) => t.prio === "med" },
  { key: "low",  title: "Baja",  color: "#C8C6B8",            matches: (t) => t.prio === "low" },
];

const TAG_COLUMNS: Col[] = (Object.keys(TAG_META) as TagKey[]).map((k) => ({
  key: k,
  title: TAG_META[k].label,
  color: `var(--tag-${k})`,
  matches: (t) => t.tag === k,
}));

function buildColumns(
  groupBy: GroupKey,
  team: { id: string; name: string }[],
): Col[] {
  if (groupBy === "prio") return PRIO_COLUMNS;
  if (groupBy === "tag") return TAG_COLUMNS;
  if (groupBy === "person") {
    return [
      ...team.map((p) => ({
        key: p.id,
        title: p.name,
        color: "var(--nc-green)",
        matches: (t: Task) => t.assignee.includes(p.id),
      })),
      {
        key: "__none__",
        title: "Sin asignar",
        color: "#C8C6B8",
        matches: (t: Task) => t.assignee.length === 0,
      },
    ];
  }
  return STATE_COLUMNS;
}

export function KanbanBoard({
  initialTasks,
  groupBy = "state",
  team = [],
}: {
  initialTasks: Task[];
  groupBy?: GroupKey;
  team?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const columns = buildColumns(groupBy, team);
  const dragEnabled = groupBy === "state";

  function handleDragStart(e: React.DragEvent, id: number) {
    if (!dragEnabled) return;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverCol(null);
  }

  function handleDragOver(e: React.DragEvent, colKey: string) {
    if (!dragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== colKey) setOverCol(colKey);
  }

  function handleDragLeave(e: React.DragEvent) {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setOverCol(null);
  }

  function handleDrop(e: React.DragEvent, colKey: string) {
    if (!dragEnabled) return;
    e.preventDefault();
    const id = draggingId ?? Number(e.dataTransfer.getData("text/plain"));
    setDraggingId(null);
    setOverCol(null);
    if (!id) return;

    const state = colKey as TaskState;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.state === state) return;

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, state } : t)));

    startTransition(async () => {
      const res = await updateTaskState(id, state);
      if ((res as any)?.error) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, state: task.state } : t)));
        alert("Error al mover la tarea: " + (res as any).error);
      } else {
        router.refresh();
      }
    });
  }

  return (
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
      {columns.map((c) => {
        const list = tasks.filter((t) => c.matches(t));
        const isOver = overCol === c.key;
        return (
          <div
            key={c.key}
            className="nc-kanban-col"
            onDragOver={(e) => handleDragOver(e, c.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, c.key)}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              background: isOver ? "var(--nc-green-soft)" : "var(--nc-line-2)",
              borderRadius: "var(--r-lg)",
              padding: 10,
              outline: isOver ? "2px dashed var(--nc-green)" : "2px dashed transparent",
              outlineOffset: -4,
              transition: "background 0.15s, outline-color 0.15s",
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
                {list.length}
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
              {list.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 12px",
                    fontSize: 11.5,
                    color: "var(--nc-mute)",
                    border: "1px dashed var(--nc-line)",
                    borderRadius: "var(--r-sm)",
                  }}
                >
                  {dragEnabled ? "Suelta aquí" : "Sin tareas"}
                </div>
              ) : (
                list.map((t) => (
                  <div
                    key={t.id}
                    draggable={dragEnabled}
                    onDragStart={dragEnabled ? (e) => handleDragStart(e, t.id) : undefined}
                    onDragEnd={dragEnabled ? handleDragEnd : undefined}
                    style={{
                      cursor: dragEnabled ? "grab" : "default",
                      opacity: draggingId === t.id ? 0.4 : 1,
                      transition: "opacity 0.1s",
                    }}
                  >
                    <TaskCard t={t} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
