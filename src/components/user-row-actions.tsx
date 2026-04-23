"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IMore, IX } from "./icons";
import { changeUserRole, deleteUser } from "@/app/usuarios/actions";

export function UserRowActions({
  userId,
  userName,
  currentRole,
  isSelf,
}: {
  userId: string;
  userName: string;
  currentRole: "admin" | "usuario";
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleRole() {
    const next = currentRole === "admin" ? "usuario" : "admin";
    startTransition(async () => {
      await changeUserRole(userId, next);
      setOpen(false);
      router.refresh();
    });
  }

  function doDelete() {
    startTransition(async () => {
      await deleteUser(userId);
      setConfirmDel(false);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        className="nc-icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Acciones"
        disabled={pending}
      >
        <IMore size={14} />
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 20 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 28,
              minWidth: 180,
              background: "var(--nc-surface)",
              border: "1px solid var(--nc-line)",
              borderRadius: "var(--r-sm)",
              boxShadow: "var(--sh-2)",
              zIndex: 21,
              overflow: "hidden",
            }}
          >
            <button
              onClick={toggleRole}
              disabled={pending || isSelf}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", fontSize: 12,
                background: "transparent",
                color: isSelf ? "var(--nc-mute)" : "var(--nc-text)",
                cursor: isSelf ? "not-allowed" : "pointer",
              }}
            >
              {currentRole === "admin" ? "Quitar admin" : "Hacer admin"}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirmDel(true); }}
              disabled={pending || isSelf}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", fontSize: 12,
                borderTop: "1px solid var(--nc-line-2)",
                background: "transparent",
                color: isSelf ? "var(--nc-mute)" : "var(--nc-danger, #dc2626)",
                cursor: isSelf ? "not-allowed" : "pointer",
              }}
            >
              Eliminar usuario
            </button>
          </div>
        </>
      )}

      {confirmDel && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(28,31,26,0.4)", zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
          onClick={() => !pending && setConfirmDel(false)}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Eliminar usuario</div>
              <button className="nc-icon-btn" onClick={() => setConfirmDel(false)} disabled={pending}>
                <IX size={13} />
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--nc-text)", lineHeight: 1.5, marginBottom: 20 }}>
              ¿Eliminar a <b style={{ color: "var(--nc-ink)" }}>{userName}</b>? Sus tareas asignadas
              quedarán sin asignar. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="nc-btn ghost"
                style={{ fontSize: 12 }}
                onClick={() => setConfirmDel(false)}
                disabled={pending}
              >
                Cancelar
              </button>
              <button
                onClick={doDelete}
                disabled={pending}
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 600,
                  background: pending ? "#fca5a5" : "var(--nc-danger, #dc2626)",
                  color: "white", borderRadius: "var(--r-sm)", border: "none",
                  cursor: pending ? "not-allowed" : "pointer",
                }}
              >
                {pending ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
