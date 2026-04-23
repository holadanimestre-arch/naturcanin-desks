"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskCard } from "./task-card";
import { IMore, IPlus } from "./icons";
import { updateTaskState } from "@/app/tablero/actions";
import type { Task, TaskState } from "@/lib/data";

type Col = { title: string; state: TaskState; color: string };

const COLUMNS: Col[] = [
  { title: "Pendiente",  state: "pending",  color: "#C8C6B8" },
  { title: "En curso",   state: "progress", color: "var(--nc-yellow)" },
  { title: "Completada", state: "done",     color: "var(--nc-green)" },
];

export function KanbanBoard({ initialTasks }: { initialTasks: Task[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<TaskState | null>(null);
  const [, startTransition] = useTransition();

  function handleDragStart(e: React.DragEvent, id: number) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverCol(null);
  }

  function handleDragOver(e: React.DragEvent, col: TaskState) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== col) setOverCol(col);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear when leaving the actual column container
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setOverCol(null);
  }

  function handleDrop(e: React.DragEvent, state: TaskState) {
    e.preventDefault();
    const id = draggingId ?? Number(e.dataTransfer.getData("text/plain"));
    setDraggingId(null);
    setOverCol(null);
    if (!id) return;

    const task = tasks.find((t) => t.id === id);
    if (!task || task.state === state) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, state } : t)));

    startTransition(async () => {
      const res = await updateTaskState(id, state);
      if ((res as any)?.error) {
        // Revert on error
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
      {COLUMNS.map((c) => {
        const list = tasks.filter((t) => t.state === c.state);
        const isOver = overCol === c.state;
        return (
          <div
            key={c.state}
            onDragOver={(e) => handleDragOver(e, c.state)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, c.state)}
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
                  Suelta aquí
                </div>
              ) : (
                list.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      cursor: "grab",
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
