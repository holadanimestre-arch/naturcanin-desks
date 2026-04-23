"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ICheck, IPlus, IX } from "./icons";
import { addSubtask, toggleSubtask, deleteSubtask } from "@/app/tareas/[id]/actions";
import type { SubtaskRow } from "@/lib/supabase/queries";

export function SubtasksPanel({
  taskId,
  initial,
}: {
  taskId: number;
  initial: SubtaskRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<SubtaskRow[]>(initial);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();

  const done = items.filter((s) => s.done).length;

  function handleToggle(s: SubtaskRow) {
    const next = !s.done;
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: next } : x)));
    startTransition(async () => {
      const res = await toggleSubtask(s.id, next);
      if ((res as any)?.error) {
        setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: s.done } : x)));
        alert("Error: " + (res as any).error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete(s: SubtaskRow) {
    const prevItems = items;
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    startTransition(async () => {
      const res = await deleteSubtask(s.id);
      if ((res as any)?.error) {
        setItems(prevItems);
        alert("Error: " + (res as any).error);
      } else {
        router.refresh();
      }
    });
  }

  async function handleAdd() {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    const optimisticId = -Date.now();
    const optimistic: SubtaskRow = {
      id: optimisticId,
      text: t,
      done: false,
      position: items.length,
    };
    setItems((prev) => [...prev, optimistic]);
    const res = await addSubtask(taskId, t);
    if ((res as any)?.error) {
      setItems((prev) => prev.filter((x) => x.id !== optimisticId));
      alert("Error: " + (res as any).error);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div
          style={{
            fontSize: 11, fontWeight: 600, color: "var(--nc-mute)",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}
        >
          Subtareas · {done}/{items.length}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: 11.5, color: "var(--nc-mute)", marginBottom: 8 }}>
          Sin subtareas todavía.
        </div>
      ) : (
        <div
          style={{
            background: "var(--nc-surface)",
            border: "1px solid var(--nc-line)",
            borderRadius: "var(--r-sm)",
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          {items.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px",
                borderTop: i === 0 ? "none" : "1px solid var(--nc-line-2)",
              }}
            >
              <button
                type="button"
                onClick={() => handleToggle(s)}
                aria-label={s.done ? "Marcar pendiente" : "Marcar hecha"}
                style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: "1.5px solid var(--nc-line)",
                  background: s.done ? "var(--nc-green)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", flexShrink: 0, cursor: "pointer",
                }}
              >
                {s.done && <ICheck size={10} />}
              </button>
              <div
                style={{
                  flex: 1, minWidth: 0,
                  fontSize: 12.5,
                  color: "var(--nc-ink)",
                  textDecoration: s.done ? "line-through" : "none",
                  opacity: s.done ? 0.55 : 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.text}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(s)}
                className="nc-icon-btn"
                style={{ width: 20, height: 20 }}
                aria-label="Eliminar subtarea"
              >
                <IX size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Añadir subtarea y pulsa Enter"
          className="nc-input"
          style={{ flex: 1, fontSize: 12 }}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="nc-btn secondary"
          style={{ fontSize: 11.5, padding: "5px 10px" }}
          disabled={!draft.trim()}
        >
          <IPlus size={11} /> Añadir
        </button>
      </div>
    </div>
  );
}
