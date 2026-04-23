"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Priority, Tag } from "./primitives";
import { ICal, ICheck, IClip, IPlus, IX } from "./icons";
import { createTask } from "@/app/tareas/nueva/actions";
import type { TagKey } from "@/lib/data";

type TeamPick = { id: string; name: string; department: string | null };
type Prio = "low" | "med" | "high";

export function NewTaskForm({
  team,
  me,
}: {
  team: TeamPick[];
  me: { id: string; name: string };
}) {
  const router = useRouter();
  const [prio, setPrio] = useState<Prio>("med");
  const [tag, setTag] = useState<TagKey>("produccion");
  const [assignees, setAssignees] = useState<string[]>([me.id]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const teamById = new Map(team.map((p) => [p.id, p]));
  const selected = assignees
    .map((id) => teamById.get(id) ?? (id === me.id ? { id: me.id, name: me.name, department: null } : null))
    .filter(Boolean) as TeamPick[];
  const available = team.filter((p) => !assignees.includes(p.id));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("priority", prio);
    fd.set("tag", tag);
    // Borrar y volver a insertar los assignee_ids (excluimos al creador, que se añade server-side)
    fd.delete("assignee_ids");
    for (const uid of assignees) if (uid !== me.id) fd.append("assignee_ids", uid);
    const res = await createTask(fd);
    if ((res as any)?.error) {
      alert("Error: " + (res as any).error);
      setLoading(false);
      return;
    }
    router.push("/tablero");
    router.refresh();
  }

  function toggle(uid: string) {
    setAssignees((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  }
  function remove(uid: string) {
    if (uid === me.id) return; // no puede quitarse a sí mismo
    setAssignees((prev) => prev.filter((x) => x !== uid));
  }

  const prioLabels: Record<Prio, string> = { low: "Baja", med: "Media", high: "Alta" };
  const tags: TagKey[] = ["produccion", "logistica", "ventas", "calidad", "admin"];

  return (
    <div className="nc-app-shell" style={{ position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(28,31,26,0.35)", zIndex: 10 }} />

      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, zIndex: 11,
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: 520,
            background: "var(--nc-surface)",
            borderRadius: "var(--r-lg)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--nc-line)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>Nueva tarea</div>
            <Link href="/tablero" className="nc-icon-btn" aria-label="Cerrar">
              <IX size={14} />
            </Link>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: "16px 18px" }}>
            <input
              name="title"
              className="nc-input"
              placeholder="Título de la tarea"
              required
              autoFocus
              style={{ fontSize: 15, fontWeight: 500, border: "none", padding: "4px 0", marginBottom: 8 }}
            />
            <textarea
              name="desc"
              className="nc-input"
              placeholder="Descripción (opcional)…"
              rows={3}
              style={{ border: "none", padding: "4px 0", fontSize: 12.5, color: "var(--nc-text)", resize: "none" }}
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
                      <span>
                        {p.name}
                        {p.id === me.id && <span style={{ color: "var(--nc-mute)" }}> (tú)</span>}
                      </span>
                      {p.id !== me.id && (
                        <button
                          type="button"
                          onClick={() => remove(p.id)}
                          className="nc-icon-btn"
                          style={{ width: 16, height: 16 }}
                          aria-label={`Quitar ${p.name}`}
                        >
                          <IX size={9} />
                        </button>
                      )}
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
                          onClick={() => {
                            toggle(p.id);
                          }}
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
                  name="due_date"
                  className="nc-btn secondary"
                  style={{ padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}
                />
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
                    {prioLabels[p]}
                  </button>
                ))}
              </div>

              {/* Categoría */}
              <div style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>Categoría</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {tags.map((k) => (
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

            <div style={{ display: "flex", gap: 6, padding: "4px 0 0" }}>
              <button type="button" className="nc-btn ghost" style={{ fontSize: 11.5 }} disabled>
                <IClip size={12} /> Adjuntar (próximamente)
              </button>
              <button type="button" className="nc-btn ghost" style={{ fontSize: 11.5 }} disabled>
                <ICheck size={12} /> Subtareas (próximamente)
              </button>
            </div>

            <div
              style={{
                padding: "12px 0 0", marginTop: 8,
                borderTop: "1px solid var(--nc-line)",
                display: "flex", justifyContent: "flex-end", gap: 8,
              }}
            >
              <Link href="/tablero" className="nc-btn ghost" style={{ fontSize: 12 }}>
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="nc-btn primary"
                style={{ fontSize: 12 }}
              >
                {loading ? "Creando…" : "Crear tarea"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
