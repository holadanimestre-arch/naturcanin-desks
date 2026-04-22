"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Priority, Tag } from "@/components/primitives";
import { ICal, ICheck, IClip, IX } from "@/components/icons";
import { createTask } from "./actions";
import type { TagKey } from "@/lib/data";

type Prio = "low" | "med" | "high";

export default function NewTaskPage() {
  const router = useRouter();
  const [prio, setPrio] = useState<Prio>("med");
  const [tag, setTag] = useState<TagKey>("produccion");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("priority", prio);
    fd.set("tag", tag);
    await createTask(fd);
    router.push("/tablero");
    router.refresh();
  }

  const prioLabels: Record<Prio, string> = { low: "Baja", med: "Media", high: "Alta" };
  const tags: TagKey[] = ["produccion", "logistica", "ventas", "calidad", "admin"];

  return (
    <div className="nc-app-shell" style={{ position: "relative" }}>
      <Sidebar active="board" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Tablero general" subtitle="Nueva tarea" />

        {/* Dimmed backdrop */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(28,31,26,0.35)", zIndex: 10 }} />

        {/* Modal */}
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
            {/* Header */}
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
                {/* Fecha límite */}
                <div style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>Fecha límite</div>
                <div>
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

              {/* Extra actions */}
              <div style={{ display: "flex", gap: 6, padding: "4px 0 0" }}>
                <button type="button" className="nc-btn ghost" style={{ fontSize: 11.5 }} disabled>
                  <IClip size={12} /> Adjuntar (próximamente)
                </button>
                <button type="button" className="nc-btn ghost" style={{ fontSize: 11.5 }} disabled>
                  <ICheck size={12} /> Subtareas (próximamente)
                </button>
              </div>

              {/* Footer */}
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
    </div>
  );
}
