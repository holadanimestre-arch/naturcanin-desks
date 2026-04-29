"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Priority, Tag } from "./primitives";
import { IPencil, IPlus, IX } from "./icons";
import { updateTask } from "@/app/tareas/[id]/actions";
import type { TagKey } from "@/lib/data";

type Prio = "low" | "med" | "high";
type TeamPick = { id: string; name: string; department: string | null };

const PRIO_LABEL: Record<Prio, string> = { low: "Baja", med: "Media", high: "Alta" };
const TAGS: TagKey[] = [
  "fabricacion", "logistica", "comercial", "administrativo",
  "calidad", "marketing", "compras", "gerencia",
];

export function EditTaskBtn({
  taskId,
  team,
  initial,
}: {
  taskId: number;
  team: TeamPick[];
  initial: {
    title: string;
    description: string;
    priority: Prio;
    tag: TagKey;
    due_date: string;
    assignee_ids: string[];
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [desc, setDesc] = useState(initial.description);
  const [prio, setPrio] = useState<Prio>(initial.priority);
  const [tag, setTag] = useState<TagKey>(initial.tag);
  const [due, setDue] = useState(initial.due_date);
  const [assignees, setAssignees] = useState<string[]>(initial.assignee_ids);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const teamById = new Map(team.map((p) => [p.id, p]));
  const selected = assignees
    .map((id) => teamById.get(id))
    .filter(Boolean) as TeamPick[];
  const available = team.filter((p) => !assignees.includes(p.id));

  function reset() {
    setTitle(initial.title);
    setDesc(initial.description);
    setPrio(initial.priority);
    setTag(initial.tag);
    setDue(initial.due_date);
    setAssignees(initial.assignee_ids);
    setErr(null);
  }

  function close() {
    if (loading) return;
    reset();
    setOpen(false);
  }

  function toggle(uid: string) {
    setAssignees((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  }

  function remove(uid: string) {
    setAssignees((prev) => prev.filter((x) => x !== uid));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await updateTask(taskId, {
      title,
      description: desc || null,
      priority: prio,
      tag,
      due_date: due || null,
      assignee_ids: assignees,
    });
    setLoading(false);
    if (res && "error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        className="nc-icon-btn"
        aria-label="Editar tarea"
        onClick={() => setOpen(true)}
        style={{
          width: 30, height: 30,
          color: "var(--nc-ink)",
          border: "1px solid var(--nc-line)",
          borderRadius: "var(--r-sm)",
        }}
      >
        <IPencil size={14} />
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(28,31,26,0.4)",
            zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
          onClick={close}
        >
          <div
            style={{
              width: "100%", maxWidth: 520,
              background: "var(--nc-surface)",
              borderRadius: "var(--r-lg)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--nc-line)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>Editar tarea</div>
              <button
                className="nc-icon-btn"
                aria-label="Cerrar"
                onClick={close}
                disabled={loading}
              >
                <IX size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "16px 18px" }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="nc-input"
                placeholder="Título de la tarea"
                required
                style={{ fontSize: 15, fontWeight: 500, border: "none", padding: "4px 0", marginBottom: 8 }}
              />
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="nc-input"
                placeholder="Descripción (opcional)…"
                rows={3}
                style={{ border: "none", padding: "4px 0", fontSize: 12.5, color: "var(--nc-text)", resize: "none", width: "100%" }}
              />

              <div
                style={{
                  display: "grid", gridTemplateColumns: "auto 1fr",
                  gap: "10px 14px", alignItems: "center",
                  padding: "14px 0", borderTop: "1px solid var(--nc-line)", marginTop: 8,
                }}
              >
                {/* Asignar a */}
                <div style={{ fontSize: 11.5, color: "var(--nc-mute)", alignSelf: "flex-start", paddingTop: 4 }}>
                  Asignar a
                </div>
                <div style={{ position: "relative" }} ref={pickerRef}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {selected.length === 0 && (
                      <span style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>Sin asignar</span>
                    )}
                    {selected.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 6px 3px 3px",
                          background: "var(--nc-line-2)",
                          borderRadius: 999,
                          fontSize: 11,
                        }}
                      >
                        <Avatar id={p.id} name={p.name} size="sm" />
                        <span>{p.name}</span>
                        <button
                          type="button"
                          onClick={() => remove(p.id)}
                          className="nc-icon-btn"
                          style={{ width: 16, height: 16 }}
                          aria-label={`Quitar ${p.name}`}
                        >
                          <IX size={9} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPickerOpen((v) => !v)}
                      className="nc-icon-btn"
                      style={{ width: 22, height: 22 }}
                      aria-label="Añadir persona"
                      disabled={available.length === 0}
                      title={available.length === 0 ? "Sin más personas para añadir" : "Añadir persona"}
                    >
                      <IPlus size={11} />
                    </button>
                  </div>
                  {pickerOpen && available.length > 0 && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 30 }}
                        onClick={() => setPickerOpen(false)}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)", left: 0,
                          minWidth: 220, maxHeight: 240, overflow: "auto",
                          background: "var(--nc-surface)",
                          border: "1px solid var(--nc-line)",
                          borderRadius: "var(--r-sm)",
                          boxShadow: "var(--sh-2)",
                          zIndex: 31,
                          padding: 4,
                        }}
                      >
                        {available.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggle(p.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 8px", width: "100%",
                              background: "transparent",
                              borderRadius: 4,
                              fontSize: 12, textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            <Avatar id={p.id} name={p.name} size="sm" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.name}
                              </div>
                              {p.department && (
                                <div style={{ fontSize: 10, color: "var(--nc-mute)" }}>{p.department}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Fecha */}
                <div style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>Fecha límite</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                    className="nc-btn secondary"
                    style={{ padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}
                  />
                  {due && (
                    <button
                      type="button"
                      onClick={() => setDue("")}
                      className="nc-icon-btn"
                      style={{ width: 22, height: 22 }}
                      aria-label="Quitar fecha"
                    >
                      <IX size={11} />
                    </button>
                  )}
                </div>

                {/* Prioridad */}
                <div style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>Prioridad</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["low", "med", "high"] as Prio[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrio(p)}
                      style={{
                        padding: "4px 10px", borderRadius: 4, fontSize: 11,
                        display: "flex", alignItems: "center", gap: 5,
                        background: prio === p ? "var(--nc-yellow-soft)" : "var(--nc-line-2)",
                        color: prio === p ? "var(--nc-ink)" : "var(--nc-text)",
                        fontWeight: prio === p ? 600 : 500,
                        border: prio === p ? "1.5px solid var(--nc-yellow)" : "1.5px solid transparent",
                        transition: "all 0.1s",
                      }}
                    >
                      <Priority level={p} />
                      {PRIO_LABEL[p]}
                    </button>
                  ))}
                </div>

                {/* Categoría */}
                <div style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>Categoría</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {TAGS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTag(k)}
                      style={{
                        background: "none", padding: 0,
                        outline: tag === k ? "2px solid var(--nc-green)" : "2px solid transparent",
                        outlineOffset: 2, borderRadius: 4,
                        transition: "outline 0.1s",
                      }}
                    >
                      <Tag k={k} />
                    </button>
                  ))}
                </div>
              </div>

              {err && (
                <div
                  style={{
                    fontSize: 11.5, padding: "6px 10px", borderRadius: 4, marginBottom: 12,
                    background: "#fef2f2", color: "#dc2626",
                  }}
                >
                  {err}
                </div>
              )}

              <div
                style={{
                  padding: "12px 0 0", marginTop: 8,
                  borderTop: "1px solid var(--nc-line)",
                  display: "flex", justifyContent: "flex-end", gap: 8,
                }}
              >
                <button
                  type="button"
                  className="nc-btn ghost"
                  style={{ fontSize: 12 }}
                  onClick={close}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="nc-btn primary"
                  style={{ fontSize: 12 }}
                >
                  {loading ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
