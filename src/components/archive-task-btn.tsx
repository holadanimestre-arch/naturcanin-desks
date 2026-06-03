"use client";

import { useState } from "react";
import { ICheck, IX } from "./icons";
import { archiveTask } from "@/app/tareas/[id]/actions";

export function ArchiveTaskBtn({ taskId }: { taskId: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleArchive() {
    setLoading(true);
    setErr(null);
    const res = await archiveTask(taskId);
    if (res && "error" in res && res.error) {
      setErr(res.error);
      setLoading(false);
    }
    // Si tiene éxito, archiveTask hace redirect() internamente
  }

  return (
    <>
      <button
        className="nc-btn primary"
        style={{ fontSize: 11.5 }}
        onClick={() => setOpen(true)}
      >
        <ICheck size={12} /> Archivar
      </button>

      {open && (
        <div
          className="nc-modal-shell"
          style={{
            position: "fixed", inset: 0,
            background: "rgba(28,31,26,0.4)",
            zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
          onClick={() => !loading && setOpen(false)}
        >
          <div
            style={{
              background: "var(--nc-surface)",
              borderRadius: "var(--r-lg)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              width: "100%", maxWidth: 380,
              padding: "20px 22px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Archivar tarea</div>
              <button className="nc-icon-btn" onClick={() => setOpen(false)} disabled={loading}>
                <IX size={13} />
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--nc-text)", lineHeight: 1.5, marginBottom: 20 }}>
              La tarea se moverá al <b style={{ color: "var(--nc-ink)" }}>Archivo</b> y desaparecerá del tablero.
              Puedes restaurarla en cualquier momento desde ahí.
            </p>
            {err && (
              <div style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 4, marginBottom: 12, background: "#fef2f2", color: "#dc2626" }}>
                {err}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="nc-btn ghost"
                style={{ fontSize: 12 }}
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleArchive}
                disabled={loading}
                className="nc-btn primary"
                style={{ fontSize: 12 }}
              >
                {loading ? "Archivando…" : "Sí, archivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
