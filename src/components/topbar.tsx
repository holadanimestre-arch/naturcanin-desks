"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { peopleById } from "@/lib/data";
import type { PersonId } from "@/lib/data";
import { Avatar } from "./primitives";
import { IBell, IPlus, ISearch } from "./icons";
import { createClient } from "@/lib/supabase/client";

type TopBarProps = {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  me?: PersonId;
  showAdd?: boolean;
  unread?: number;
};

export function TopBar({
  title,
  subtitle,
  searchPlaceholder = "Buscar tareas, personas…",
  actions,
  me = "lau",
  showAdd = true,
  unread = 3,
}: TopBarProps) {
  const p = peopleById[me];
  const router = useRouter();

  async function handleLogout() {
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
      <button className="nc-icon-btn" style={{ position: "relative" }} aria-label="Notificaciones">
        <IBell size={15} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--nc-danger)",
              border: "1.5px solid var(--nc-surface)",
            }}
          />
        )}
      </button>
      {showAdd && (
        <Link href="/tareas/nueva" className="nc-btn primary">
          <IPlus /> Nueva tarea
        </Link>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: 4,
          borderLeft: "1px solid var(--nc-line)",
          marginLeft: 4,
          cursor: "pointer",
        }}
        title="Cerrar sesión"
        onClick={handleLogout}
      >
        <Avatar id={me} size="lg" />
        <div style={{ fontSize: 11.5, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600, color: "var(--nc-ink)" }}>{p?.name}</div>
          <div style={{ color: "var(--nc-mute)", fontSize: 10 }}>{p?.role}</div>
        </div>
      </div>
    </div>
  );
}
