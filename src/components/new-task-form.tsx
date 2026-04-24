"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Priority, Tag } from "./primitives";
import { ICheck, IClip, IPlus, IX } from "./icons";
import { createTask } from "@/app/tareas/nueva/actions";
import { recordFile } from "@/app/tareas/[id]/actions";
import { createClient } from "@/lib/supabase/client";
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
  const [tag, setTag] = useState<TagKey>("fabricacion");
  const [assignees, setAssignees] = useState<string[]>([me.id]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const teamById = new Map(team.map((p) => [p.id, p]));
  const selected = assignees
    .map((id) => teamById.get(id) ?? (id === me.id ? { id: me.id, name: me.name, department: null } : null))
    .filter(Boolean) as TeamPick[];
  const available = team.filter((p) => !assignees.includes(p.id));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setUploadNote(null);
    const fd = new FormData(e.currentTarget);
    fd.set("priority", prio);
    fd.set("tag", tag);
    fd.delete("assignee_ids");
    for (const uid of assignees) if (uid !== me.id) fd.append("assignee_ids", uid);
    fd.delete("subtasks[]");
    for (const s of subtasks) fd.append("subtasks[]", s);
    // El <input type="file"> está fuera del form, así que no incluimos nada aquí.
    fd.delete("attachments");

    const res = await createTask(fd);
    if ("error" in res) {
      alert("Error: " + res.error);
      setLoading(false);
      return;
    }

    if (files.length > 0) {
      const supabase = createClient();
      let failed = 0;
      for (const f of files) {
        const path = `${res.id}/${Date.now()}-${f.name}`;
        const up = await supabase.storage.from("task-files").upload(path, f);
        if (up.error) {
          failed++;
          continue;
        }
        const rec = await recordFile(res.id, f.name, path);
        if (rec?.error) failed++;
      }
      if (failed > 0) {
        setUploadNote(`La tarea se creó, pero ${failed} archivo${failed !== 1 ? "s" : ""} no se pudo subir.`);
        setLoading(false);
        return;
      }
    }

    router.push(`/tareas/${res.id}`);
    router.refresh();
  }

  function addSubtask() {
    const t = subtaskDraft.trim();
    if (!t) return;
    setSubtasks((prev) => [...prev, t]);
    setSubtaskDraft("");
  }

  function removeSubtask(i: number) {
    setSubtasks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setFiles((prev) => [...prev, ...picked]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function fmtSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function toggle(uid: string) {
    setAssignees((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  }
  function remove(uid: string) {
    if (uid === me.id) return; // no puede quitarse a sí mismo
    setAssignees((prev) => prev.filter((x) => x !== uid));
  }

  const prioLabels: Record<Prio, string> = { low: "Baja", med: "Media", high: "Alta" };
  const tags: TagKey[] = ["fabricacion", "logistica", "comercial", "administrativo", "calidad", "marketing", "compras", "gerencia"];

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(28,31,26,0.35)", zIndex: 40 }} />

      <div
        style={{
          position: "fixed", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, zIndex: 41,
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

            {/* Subtareas */}
            <div style={{ padding: "4px 0 0" }}>
              <div style={{ fontSize: 11.5, color: "var(--nc-mute)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <ICheck size={12} /> Subtareas
                {subtasks.length > 0 && (
                  <span style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>· {subtasks.length}</span>
                )}
              </div>
              {subtasks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
                  {subtasks.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 8px",
                        background: "var(--nc-line-2)",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 12, height: 12, borderRadius: 3,
                          border: "1.5px solid var(--nc-line)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(i)}
                        className="nc-icon-btn"
                        style={{ width: 18, height: 18 }}
                        aria-label={`Quitar subtarea ${i + 1}`}
                      >
                        <IX size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                  placeholder="Añadir subtarea y pulsa Enter"
                  className="nc-input"
                  style={{ flex: 1, fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className="nc-btn secondary"
                  style={{ fontSize: 11.5, padding: "5px 10px" }}
                  disabled={!subtaskDraft.trim()}
                >
                  <IPlus size={11} /> Añadir
                </button>
              </div>
            </div>

            {/* Adjuntos */}
            <div style={{ padding: "12px 0 0" }}>
              <div style={{ fontSize: 11.5, color: "var(--nc-mute)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <IClip size={12} /> Archivos adjuntos
                {files.length > 0 && (
                  <span style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>· {files.length}</span>
                )}
              </div>
              {files.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 6px 4px 8px",
                        background: "var(--nc-line-2)",
                        borderRadius: 999,
                        fontSize: 11,
                        maxWidth: 220,
                      }}
                    >
                      <IClip size={10} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </span>
                      <span style={{ color: "var(--nc-mute)", fontSize: 10 }}>{fmtSize(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="nc-icon-btn"
                        style={{ width: 16, height: 16 }}
                        aria-label={`Quitar ${f.name}`}
                      >
                        <IX size={9} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label
                className="nc-btn secondary"
                style={{ fontSize: 11.5, padding: "5px 10px", cursor: "pointer", display: "inline-flex" }}
              >
                <IClip size={11} /> Seleccionar archivos
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={onFilesPicked}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.doc,.docx,.xlsx,.csv"
                />
              </label>
            </div>

            {uploadNote && (
              <div style={{ fontSize: 11, color: "var(--nc-danger)", marginTop: 8 }}>
                {uploadNote}
              </div>
            )}

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
    </>
  );
}
