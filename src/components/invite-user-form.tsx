"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IPlus } from "./icons";
import { inviteUser } from "@/app/usuarios/actions";

const DEPARTMENTS = ["Producción", "Logística", "Ventas", "Calidad", "Admin"];

export function InviteUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Producción");
  const [role, setRole] = useState<"usuario" | "admin">("usuario");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("department", department);
    fd.set("role", role);
    const res = await inviteUser(fd);
    if (res?.error) {
      setMsg({ kind: "err", text: res.error });
    } else {
      setMsg({ kind: "ok", text: `Invitación enviada a ${email}` });
      setName("");
      setEmail("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        background: "var(--nc-surface)",
        border: "1px solid var(--nc-line)",
        borderRadius: "var(--r-lg)",
        padding: 16,
        alignSelf: "flex-start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <div
          style={{
            width: 24, height: 24, borderRadius: 6,
            background: "var(--nc-green-soft)", color: "var(--nc-green-dark)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <IPlus size={12} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Dar de alta nuevo usuario</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--nc-mute)", marginBottom: 14 }}>
        Se enviará un correo de invitación con un enlace para fijar contraseña.
      </div>

      <form onSubmit={handleSubmit}>
        <Label>Nombre</Label>
        <input
          required
          className="nc-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre y apellido"
          style={{ marginBottom: 10, width: "100%" }}
        />

        <Label>Correo</Label>
        <input
          required
          type="email"
          className="nc-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="persona@naturcanin.com"
          style={{ marginBottom: 10, width: "100%" }}
        />

        <Label>Departamento</Label>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
          {DEPARTMENTS.map((d) => {
            const sel = d === department;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDepartment(d)}
                style={{
                  padding: "4px 10px", borderRadius: 999, fontSize: 11,
                  border: "1px solid " + (sel ? "var(--nc-green)" : "var(--nc-line)"),
                  background: sel ? "var(--nc-green-soft)" : "var(--nc-surface)",
                  color: sel ? "var(--nc-green-dark)" : "var(--nc-text)",
                  fontWeight: sel ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <Label>Rol</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <RoleCard
            selected={role === "usuario"}
            onClick={() => setRole("usuario")}
            title="Usuario"
            desc="Ve solo las tareas asignadas a él/ella."
            color="var(--nc-mute)"
          />
          <RoleCard
            selected={role === "admin"}
            onClick={() => setRole("admin")}
            title="★ Admin"
            desc="Ve todas las tareas y puede gestionar usuarios."
            color="var(--nc-green)"
          />
        </div>

        {msg && (
          <div
            style={{
              fontSize: 11.5,
              padding: "6px 10px",
              borderRadius: 4,
              background: msg.kind === "ok" ? "var(--nc-green-soft)" : "#fef2f2",
              color: msg.kind === "ok" ? "var(--nc-green-dark)" : "#dc2626",
              marginBottom: 10,
            }}
          >
            {msg.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="nc-btn secondary"
            style={{ fontSize: 12, flex: 1, justifyContent: "center" }}
            onClick={() => {
              setName("");
              setEmail("");
              setMsg(null);
            }}
            disabled={loading}
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="nc-btn primary"
            style={{ fontSize: 12, flex: 1, justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Enviando…" : "Enviar invitación"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
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

function RoleCard({
  selected, onClick, title, desc, color,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        border: `2px solid ${selected ? color : "var(--nc-line)"}`,
        borderRadius: "var(--r-sm)",
        padding: "10px 12px",
        cursor: "pointer",
        background: selected ? "var(--nc-green-soft)" : "var(--nc-surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <div
          style={{
            width: 12, height: 12, borderRadius: "50%",
            border: `1.5px solid ${selected ? color : "var(--nc-line)"}`,
            background: selected ? color : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {selected && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "white" }} />}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: selected ? "var(--nc-green-dark)" : "var(--nc-mute)",
          lineHeight: 1.35,
        }}
      >
        {desc}
      </div>
    </button>
  );
}
