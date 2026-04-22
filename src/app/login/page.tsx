"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoLg } from "@/components/primitives";
import { IEye } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("marketing@naturcanin.com");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div
      className="nc-app-shell"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--nc-bg)",
        minHeight: "100vh",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <LogoLg />
        </div>
        <form
          onSubmit={handleSubmit}
          style={{
            background: "var(--nc-surface)",
            border: "1px solid var(--nc-line)",
            borderRadius: "var(--r-lg)",
            padding: 24,
            boxShadow: "var(--sh-2)",
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            Entrar a Tasks
          </h2>
          <p style={{ fontSize: 11.5, color: "var(--nc-mute)", margin: "0 0 18px" }}>
            Gestión de tareas del equipo Naturcanin
          </p>

          <label
            htmlFor="email"
            style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--nc-text)", marginBottom: 4 }}
          >
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="nc-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <label
            htmlFor="password"
            style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--nc-text)", marginBottom: 4 }}
          >
            Contraseña
          </label>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              required
              className="nc-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="nc-icon-btn"
              style={{ position: "absolute", right: 2, top: 2, width: 24, height: 24 }}
              aria-label="Mostrar contraseña"
              onClick={() => setShowPw((v) => !v)}
            >
              <IEye size={12} />
            </button>
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "var(--nc-danger, #dc2626)",
                background: "#fef2f2",
                borderRadius: 4,
                padding: "6px 10px",
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              marginBottom: 14,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--nc-text)" }}>
              <input type="checkbox" defaultChecked style={{ accentColor: "var(--nc-green)" }} />
              Mantener sesión
            </label>
            <a style={{ color: "var(--nc-green-dark)", fontWeight: 500 }} href="#">
              ¿Olvidaste?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="nc-btn primary"
            style={{ width: "100%", justifyContent: "center", padding: "9px" }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--nc-mute)", marginTop: 16 }}>
          © 2026 Naturcanin · Solo personal autorizado
        </div>
      </div>
    </div>
  );
}
