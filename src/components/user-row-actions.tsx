"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { IMore, IX } from "./icons";
import { changeUserRole, deleteUser, updateUserProfile } from "@/app/usuarios/actions";
import { DEPARTMENTS } from "@/lib/departments";

export function UserRowActions({
  userId,
  userName,
  userEmail,
  currentRole,
  currentDepartments,
  isSelf,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: "admin" | "usuario";
  currentDepartments: string[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Edit form state
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [editPwd, setEditPwd] = useState("");
  const [editDepts, setEditDepts] = useState<string[]>(currentDepartments);
  const [editMsg, setEditMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function openMenu() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  function closeMenu() {
    setMenuPos(null);
  }

  function toggleRole() {
    const next = currentRole === "admin" ? "usuario" : "admin";
    startTransition(async () => {
      await changeUserRole(userId, next);
      closeMenu();
      router.refresh();
    });
  }

  function doDelete() {
    startTransition(async () => {
      await deleteUser(userId);
      setConfirmDel(false);
      router.refresh();
    });
  }

  function deptsEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  }

  function toggleDept(d: string) {
    setEditDepts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function doEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditMsg(null);
    const fields: { name?: string; email?: string; password?: string; departments?: string[] } = {};
    if (editName.trim() && editName.trim() !== userName) fields.name = editName;
    if (editEmail.trim() && editEmail.trim() !== userEmail) fields.email = editEmail;
    if (editPwd.trim()) {
      if (editPwd.length < 8) {
        setEditMsg({ kind: "err", text: "La contraseña debe tener al menos 8 caracteres" });
        return;
      }
      fields.password = editPwd;
    }
    if (!deptsEqual(editDepts, currentDepartments)) {
      fields.departments = editDepts;
    }
    if (Object.keys(fields).length === 0) {
      setEditMsg({ kind: "err", text: "No hay cambios que guardar" });
      return;
    }
    startTransition(async () => {
      const res = await updateUserProfile(userId, fields);
      if ("error" in res && res.error) {
        setEditMsg({ kind: "err", text: res.error });
      } else {
        setEditMsg({ kind: "ok", text: "Cambios guardados correctamente" });
        setEditPwd("");
        router.refresh();
      }
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        className="nc-icon-btn"
        onClick={() => menuPos ? closeMenu() : openMenu()}
        aria-label="Acciones"
        disabled={pending}
      >
        <IMore size={14} />
      </button>

      {/* Dropdown — position: fixed to escape overflow:hidden */}
      {menuPos && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={closeMenu} />
          <div
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              minWidth: 180,
              background: "var(--nc-surface)",
              border: "1px solid var(--nc-line)",
              borderRadius: "var(--r-sm)",
              boxShadow: "var(--sh-2)",
              zIndex: 41,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => { closeMenu(); setEditName(userName); setEditEmail(userEmail); setEditPwd(""); setEditDepts(currentDepartments); setEditMsg(null); setEditOpen(true); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", fontSize: 12,
                background: "transparent", color: "var(--nc-text)", cursor: "pointer",
              }}
            >
              Editar usuario
            </button>
            <button
              onClick={toggleRole}
              disabled={pending || isSelf}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", fontSize: 12,
                borderTop: "1px solid var(--nc-line-2)",
                background: "transparent",
                color: isSelf ? "var(--nc-mute)" : "var(--nc-text)",
                cursor: isSelf ? "not-allowed" : "pointer",
              }}
            >
              {currentRole === "admin" ? "Quitar admin" : "Hacer admin"}
            </button>
            <button
              onClick={() => { closeMenu(); setConfirmDel(true); }}
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

      {/* Modal: Editar usuario */}
      {editOpen && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(28,31,26,0.4)", zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
          onClick={() => !pending && setEditOpen(false)}
        >
          <div
            style={{
              background: "var(--nc-surface)",
              borderRadius: "var(--r-lg)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              width: "100%", maxWidth: 420,
              padding: "20px 22px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Editar usuario</div>
              <button className="nc-icon-btn" onClick={() => setEditOpen(false)} disabled={pending}>
                <IX size={13} />
              </button>
            </div>

            <form onSubmit={doEdit}>
              <FieldLabel>Nombre</FieldLabel>
              <input
                className="nc-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre y apellido"
                style={{ width: "100%", marginBottom: 12 }}
                disabled={pending}
              />

              <FieldLabel>Correo de acceso</FieldLabel>
              <input
                type="email"
                className="nc-input"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="correo@naturcanin.com"
                style={{ width: "100%", marginBottom: 12 }}
                disabled={pending}
              />

              <FieldLabel>Nueva contraseña</FieldLabel>
              <input
                type="password"
                className="nc-input"
                value={editPwd}
                onChange={(e) => setEditPwd(e.target.value)}
                placeholder="Dejar vacío para no cambiar"
                style={{ width: "100%", marginBottom: 16 }}
                disabled={pending}
                autoComplete="new-password"
              />

              <FieldLabel>Departamentos</FieldLabel>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
                {DEPARTMENTS.map((d) => {
                  const sel = editDepts.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDept(d)}
                      disabled={pending}
                      style={{
                        padding: "4px 10px", borderRadius: 999, fontSize: 11,
                        border: "1px solid " + (sel ? "var(--nc-green)" : "var(--nc-line)"),
                        background: sel ? "var(--nc-green-soft)" : "var(--nc-surface)",
                        color: sel ? "var(--nc-green-dark)" : "var(--nc-text)",
                        fontWeight: sel ? 600 : 500,
                        cursor: pending ? "not-allowed" : "pointer",
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {editMsg && (
                <div
                  style={{
                    fontSize: 11.5, padding: "6px 10px", borderRadius: 4, marginBottom: 12,
                    background: editMsg.kind === "ok" ? "var(--nc-green-soft)" : "#fef2f2",
                    color: editMsg.kind === "ok" ? "var(--nc-green-dark)" : "#dc2626",
                  }}
                >
                  {editMsg.text}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="nc-btn ghost"
                  style={{ fontSize: 12 }}
                  onClick={() => setEditOpen(false)}
                  disabled={pending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="nc-btn primary"
                  style={{ fontSize: 12 }}
                  disabled={pending}
                >
                  {pending ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar eliminación */}
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block", fontSize: 10.5, fontWeight: 600,
        color: "var(--nc-text)", textTransform: "uppercase",
        letterSpacing: "0.05em", marginBottom: 4,
      }}
    >
      {children}
    </label>
  );
}
