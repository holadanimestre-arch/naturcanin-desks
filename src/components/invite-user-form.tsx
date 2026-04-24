"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IPlus } from "./icons";
import { inviteUser, createUserWithPassword } from "@/app/usuarios/actions";

const DEPARTMENTS = ["Fabricación", "Logística", "Comercial", "Administrativo", "Calidad", "Marketing", "Compras", "Gerencia"];

type Mode = "invite" | "password";

function generatePassword(length = 14): string {
  const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const symbols = "!@#$%&*?";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length - 2; i++) out += charset[arr[i] % charset.length];
  out += symbols[arr[length - 2] % symbols.length];
  out += String(arr[length - 1] % 10);
  return out;
}

export function InviteUserForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(true);
  const [department, setDepartment] = useState("Fabricación");
  const [role, setRole] = useState<"usuario" | "admin">("usuario");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setMsg(null);
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setCreated(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("department", department);
    fd.set("role", role);

    if (mode === "invite") {
      const res = await inviteUser(fd);
      if (res?.error) {
        setMsg({ kind: "err", text: res.error });
      } else {
        setMsg({ kind: "ok", text: `Invitación enviada a ${email}` });
        reset();
        router.refresh();
      }
    } else {
      fd.set("password", password);
      const res = await createUserWithPassword(fd);
      if ("error" in res && res.error) {
        setMsg({ kind: "err", text: res.error });
      } else {
        setCreated({ email, password });
        setMsg({ kind: "ok", text: `Usuario ${email} creado. Copia la contraseña y envíasela.` });
        setName("");
        setEmail("");
        setPassword("");
        router.refresh();
      }
    }
    setLoading(false);
  }

  async function copyCredentials() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(
        `Correo: ${created.email}\nContraseña: ${created.password}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
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
      <div style={{ fontSize: 11, color: "var(--nc-mute)", marginBottom: 12 }}>
        {mode === "password"
          ? "Creas tú la contraseña; el usuario puede entrar de inmediato."
          : "Se enviará un correo con un enlace para que fije su propia contraseña."}
      </div>

      {/* Mode toggle */}
      <div
        style={{
          display: "flex", gap: 4,
          background: "var(--nc-line-2)", padding: 3,
          borderRadius: "var(--r-sm)", marginBottom: 14,
        }}
      >
        <ModeTab active={mode === "password"} onClick={() => setMode("password")}>
          Contraseña manual
        </ModeTab>
        <ModeTab active={mode === "invite"} onClick={() => setMode("invite")}>
          Invitación por email
        </ModeTab>
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

        {mode === "password" && (
          <>
            <Label>Contraseña</Label>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <input
                required
                minLength={8}
                type={showPwd ? "text" : "password"}
                className="nc-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mín. 8 caracteres"
                style={{ flex: 1, minWidth: 0, fontFamily: "ui-monospace, monospace" }}
              />
              <button
                type="button"
                className="nc-btn secondary"
                style={{ fontSize: 11, padding: "5px 9px" }}
                onClick={() => setPassword(generatePassword())}
              >
                Generar
              </button>
              <button
                type="button"
                className="nc-btn ghost"
                style={{ fontSize: 11, padding: "5px 9px" }}
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--nc-mute)", marginBottom: 10 }}>
              Apúntala antes de enviar: solo la verás una vez tras crear.
            </div>
          </>
        )}

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

        {created && (
          <div
            style={{
              fontSize: 11.5,
              padding: 10,
              borderRadius: "var(--r-sm)",
              background: "var(--nc-green-soft)",
              border: "1px solid var(--nc-green)",
              color: "var(--nc-ink)",
              marginBottom: 10,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Credenciales creadas</div>
            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, lineHeight: 1.5 }}>
              <div>Correo: {created.email}</div>
              <div>Contraseña: {created.password}</div>
            </div>
            <button
              type="button"
              className="nc-btn secondary"
              style={{ fontSize: 11, marginTop: 6, padding: "4px 9px" }}
              onClick={copyCredentials}
            >
              {copied ? "Copiado ✓" : "Copiar credenciales"}
            </button>
          </div>
        )}

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
              reset();
              setCreated(null);
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
            {loading
              ? mode === "password" ? "Creando…" : "Enviando…"
              : mode === "password" ? "Crear usuario" : "Enviar invitación"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "5px 10px",
        fontSize: 11.5,
        fontWeight: active ? 600 : 500,
        background: active ? "var(--nc-surface)" : "transparent",
        color: active ? "var(--nc-ink)" : "var(--nc-mute)",
        borderRadius: 4,
        boxShadow: active ? "var(--sh-1)" : "none",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
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
