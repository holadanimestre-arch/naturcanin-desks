import Link from "next/link";
import {
  IHome, IKanban, IList, ICal, IChat, IUsers, IUser, IClip, IChart, ISettings, ILog,
} from "./icons";
import type { SVGProps } from "react";

export type SidebarKey =
  | "home" | "board" | "my" | "cal" | "chat" | "team" | "users" | "archive" | "stats" | "logs";

type Item = {
  k: SidebarKey;
  l: string;
  href: string;
  Ic: (p: SVGProps<SVGSVGElement> & { size?: number }) => React.ReactElement;
  badge?: number;
};

const items: Item[] = [
  { k: "home",    l: "Inicio",       href: "/",         Ic: IHome },
  { k: "board",   l: "Tablero",      href: "/tablero",  Ic: IKanban },
  { k: "my",      l: "Mis tareas",   href: "/mis-tareas", Ic: IList },
  { k: "cal",     l: "Calendario",   href: "/calendario", Ic: ICal },
  { k: "chat",    l: "Chat",         href: "/chat",     Ic: IChat },
  { k: "team",    l: "Equipo",       href: "/equipo",   Ic: IUsers },
  { k: "users",   l: "Usuarios",     href: "/usuarios", Ic: IUser },
  { k: "archive", l: "Archivo",      href: "/archivo",  Ic: IClip },
  { k: "stats",   l: "Estadísticas", href: "/estadisticas", Ic: IChart },
  { k: "logs",    l: "Logs",         href: "/logs",         Ic: ILog },
];

export function Sidebar({
  active = "board",
  compact = false,
}: {
  active?: SidebarKey;
  compact?: boolean;
}) {
  return (
    <aside
      style={{
        width: compact ? 56 : 200,
        background: "var(--nc-surface)",
        borderRight: "1px solid var(--nc-line)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: compact ? "14px 0" : "14px 16px",
          display: "flex",
          justifyContent: compact ? "center" : "flex-start",
        }}
      >
        <div className="nc-logo">
          <div className="mark">n</div>
          {!compact && <>Naturcanin</>}
        </div>
      </div>
      <nav
        style={{
          padding: compact ? "8px 6px" : "8px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {items.map((it) => {
          const isActive = active === it.k;
          return (
            <Link
              key={it.k}
              href={it.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: compact ? "9px 0" : "8px 10px",
                justifyContent: compact ? "center" : "flex-start",
                borderRadius: "var(--r-sm)",
                fontSize: 12.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--nc-green-dark)" : "var(--nc-text)",
                background: isActive ? "var(--nc-green-soft)" : "transparent",
                textDecoration: "none",
                position: "relative",
              }}
            >
              <span style={{ position: "relative", display: "inline-flex" }}>
                <it.Ic size={15} />
                {it.badge && compact && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      minWidth: 13,
                      height: 13,
                      padding: "0 3px",
                      borderRadius: 7,
                      background: "var(--nc-green)",
                      color: "white",
                      fontSize: 8.5,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1.5px solid var(--nc-surface)",
                    }}
                  >
                    {it.badge}
                  </span>
                )}
              </span>
              {!compact && <span style={{ flex: 1, textAlign: "left" }}>{it.l}</span>}
              {it.badge && !compact && (
                <span
                  style={{
                    minWidth: 16,
                    height: 16,
                    padding: "0 5px",
                    borderRadius: 8,
                    background: "var(--nc-green)",
                    color: "white",
                    fontSize: 9.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {it.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div style={{ marginTop: "auto", padding: compact ? "10px 6px" : "10px" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: compact ? "8px 0" : "8px 10px",
            justifyContent: compact ? "center" : "flex-start",
            borderRadius: "var(--r-sm)",
            width: "100%",
            color: "var(--nc-text)",
            fontSize: 12.5,
          }}
        >
          <ISettings size={15} />
          {!compact && "Ajustes"}
        </button>
      </div>
    </aside>
  );
}
