"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IPipeline, IPlus, ITrash } from "./icons";

type Pipeline = { id: string; name: string; created_at: string };

export function PipelineListClient({
  meId,
  initialPipelines,
}: {
  meId: string;
  initialPipelines: Pipeline[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [pipelines, setPipelines] = useState<Pipeline[]>(initialPipelines);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("pipelines")
      .insert({ name, owner_id: meId })
      .select("id, name, created_at")
      .single();

    if (!error && data) {
      router.push(`/pipeline/${data.id}`);
    }
    setCreating(false);
  }

  async function handleDelete(e: React.MouseEvent, pipelineId: string) {
    e.stopPropagation();
    if (
      !window.confirm(
        "¿Eliminar este pipeline? Se eliminarán todas sus columnas y tarjetas."
      )
    )
      return;
    setDeletingId(pipelineId);
    await supabase.from("pipelines").delete().eq("id", pipelineId);
    setPipelines((prev) => prev.filter((p) => p.id !== pipelineId));
    setDeletingId(null);
  }

  function formatDate(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <main
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "32px 40px",
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "var(--nc-ink)",
            }}
          >
            Pipelines
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--nc-mute)" }}>
            Gestiona tus procesos de venta y seguimiento de leads.
          </p>
        </div>

        <button
          className="nc-btn primary"
          onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <IPlus size={14} />
          Nuevo pipeline
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div
          style={{
            background: "var(--nc-surface)",
            border: "1px solid var(--nc-line)",
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 24,
            maxWidth: 440,
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--nc-ink)",
            }}
          >
            Nuevo pipeline
          </p>
          <input
            autoFocus
            className="nc-input"
            placeholder="Nombre del pipeline…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setShowCreate(false);
                setNewName("");
              }
            }}
            style={{ width: "100%", marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="nc-btn primary"
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              style={{ fontSize: 13 }}
            >
              {creating ? "Creando…" : "Crear"}
            </button>
            <button
              className="nc-btn"
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
              style={{ fontSize: 13 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Pipeline list */}
      {pipelines.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--nc-mute)",
          }}
        >
          <IPipeline
            size={36}
            style={{ opacity: 0.25, display: "block", margin: "0 auto 14px" }}
          />
          <p style={{ fontSize: 14, margin: 0 }}>
            No tienes pipelines aún. Crea uno para empezar.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {pipelines.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/pipeline/${p.id}`)}
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: 10,
                padding: "18px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--nc-green)";
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 0 0 3px var(--nc-green-soft)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--nc-line)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "var(--nc-green-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--nc-green-dark)",
                  }}
                >
                  <IPipeline size={16} />
                </span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--nc-ink)",
                    }}
                  >
                    {p.name}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "var(--nc-mute)",
                    }}
                  >
                    Creado el {formatDate(p.created_at)}
                  </p>
                </div>
              </div>

              <button
                className="nc-icon-btn"
                title="Eliminar pipeline"
                disabled={deletingId === p.id}
                onClick={(e) => handleDelete(e, p.id)}
                style={{
                  flexShrink: 0,
                  color: "var(--nc-danger)",
                  opacity: deletingId === p.id ? 0.5 : 1,
                }}
              >
                <ITrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
