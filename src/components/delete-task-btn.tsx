"use client";

import { useState } from "react";
import { ITrash, IX } from "./icons";
import { deleteTask } from "@/app/tareas/[id]/actions";

export function DeleteTaskBtn({ taskId, title }: { taskId: number; title: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await deleteTask(taskId);
  }

  return (
    <>
      <button
        className="nc-icon-btn"
        aria-label="Eliminar tarea"
        onClick={() => setOpen(true)}
        style={{
          width: 30, height: 30,
          color: "var(--nc-danger, #dc2626)",
          border: "1px solid var(--nc-danger, #dc2626)",
          borderRadius: "var(--r-sm)",
        }}
      >
        <ITrash size={14} />
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
              <div style={{ fontSize: 14, fontWeight: 600 }}>Eliminar tarea</div>
              <button className="nc-icon-btn" onClick={() => setOpen(false)} disabled={loading}>
                <IX size={13} />
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--nc-text)", lineHeight: 1.5, marginBottom: 20 }}>
              ¿Seguro que quieres eliminar <b style={{ color: "var(--nc-ink)" }}>"{title}"</b>?
              Esta acción no se puede deshacer.
            </p>
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
                onClick={handleDelete}
                disabled={loading}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: loading ? "#fca5a5" : "var(--nc-danger, #dc2626)",
                  color: "white",
                  borderRadius: "var(--r-sm)",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
