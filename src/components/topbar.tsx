"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./primitives";
import { IPlus, ISearch } from "./icons";
import { NotificationsBell } from "./notifications-bell";
import { createClient } from "@/lib/supabase/client";

type TopBarProps = {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  showAdd?: boolean;
};

type MeProfile = { id: string; name: string; role: string };

export function TopBar({
  title,
  subtitle,
  searchPlaceholder = "Buscar tareas, personas…",
  actions,
  showAdd = true,
}: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [me, setMe] = useState<MeProfile | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      const name =
        (profile?.name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split("@")[0] ??
        "—";
      const role = (profile?.role as string | undefined) ?? "usuario";
      setMe({ id: user.id, name, role });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 18px",
        borderBottom: "1px solid var(--nc-line)",
        background: "var(--nc-surface)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--nc-ink)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: "var(--nc-mute)" }}>{subtitle}</div>}
      </div>
      <div style={{ flex: 1, maxWidth: 280, marginLeft: "auto" }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--nc-mute)",
            }}
          >
            <ISearch />
          </div>
          <input
            className="nc-input"
            placeholder={searchPlaceholder}
            style={{ paddingLeft: 28, fontSize: 12 }}
          />
        </div>
      </div>
      {actions}
      <NotificationsBell />
      {showAdd && (
        <Link href="/tareas/nueva" className="nc-btn primary">
          <IPlus /> Nueva tarea
        </Link>
      )}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 4,
            borderLeft: "1px solid var(--nc-line)",
            marginLeft: 4,
            cursor: "pointer",
            background: "transparent",
            border: "none",
            borderLeftStyle: "solid",
            borderLeftWidth: 1,
            borderLeftColor: "var(--nc-line)",
          }}
        >
          {me ? (
            <Avatar id={me.id} name={me.name} size="lg" />
          ) : (
            <span className="nc-avatar c1 lg">··</span>
          )}
          <div style={{ fontSize: 11.5, lineHeight: 1.2, textAlign: "left" }}>
            <div style={{ fontWeight: 600, color: "var(--nc-ink)" }}>{me?.name ?? "…"}</div>
            <div style={{ color: "var(--nc-mute)", fontSize: 10 }}>{me?.role ?? ""}</div>
          </div>
        </button>

        {menuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              minWidth: 180,
              background: "var(--nc-surface)",
              border: "1px solid var(--nc-line)",
              borderRadius: "var(--r-md)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: 4,
              zIndex: 40,
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={signingOut}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                fontSize: 12,
                color: "var(--nc-danger)",
                background: "transparent",
                borderRadius: 4,
                cursor: signingOut ? "not-allowed" : "pointer",
                opacity: signingOut ? 0.6 : 1,
              }}
            >
              {signingOut ? "Saliendo…" : "Salir"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
