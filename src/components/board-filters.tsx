"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IChev, IFilter, ITag, IUsers } from "./icons";

type Option = { value: string; label: string };

export type BoardFiltersProps = {
  view: string;
  y?: string;
  m?: string;
  person?: string;
  tag?: string;
  prio?: string;
  state?: string;
  people: Option[];
  tags: Option[];
};

const PRIO_OPTIONS: Option[] = [
  { value: "all", label: "Todas las prioridades" },
  { value: "high", label: "Alta" },
  { value: "med", label: "Media" },
  { value: "low", label: "Baja" },
];

const STATE_OPTIONS: Option[] = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "progress", label: "En curso" },
  { value: "done", label: "Completada" },
];

export function BoardFilters(props: BoardFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(null);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  function navigate(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      view: props.view === "tablero" ? undefined : props.view,
      y: props.y,
      m: props.m,
      person: props.person,
      tag: props.tag,
      prio: props.prio,
      state: props.state,
      ...next,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `/tablero?${qs}` : "/tablero");
    setOpen(null);
  }

  const activeCount =
    (props.prio && props.prio !== "all" ? 1 : 0) +
    (props.state && props.state !== "all" ? 1 : 0);

  const personOptions: Option[] = [{ value: "all", label: "Todas las personas" }, ...props.people];
  const tagOptions: Option[] = [{ value: "all", label: "Todas las categorías" }, ...props.tags];

  const personLabel = personOptions.find((o) => o.value === (props.person ?? "all"))?.label ?? "Todas las personas";
  const tagLabel = tagOptions.find((o) => o.value === (props.tag ?? "all"))?.label ?? "Todas las categorías";

  return (
    <div ref={wrapRef} style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
      <Dropdown
        id="filters"
        open={open === "filters"}
        onToggle={() => setOpen(open === "filters" ? null : "filters")}
        trigger={
          <>
            <IFilter size={12} />
            Filtros
            {activeCount > 0 && (
              <span
                style={{
                  background: "var(--nc-green)",
                  color: "white",
                  fontSize: 9.5,
                  fontWeight: 600,
                  borderRadius: 999,
                  padding: "1px 6px",
                  marginLeft: 2,
                }}
              >
                {activeCount}
              </span>
            )}
          </>
        }
      >
        <Section label="Prioridad" />
        {PRIO_OPTIONS.map((o) => (
          <Item
            key={o.value}
            active={(props.prio ?? "all") === o.value}
            label={o.label}
            onClick={() => navigate({ prio: o.value })}
          />
        ))}
        <Section label="Estado" />
        {STATE_OPTIONS.map((o) => (
          <Item
            key={o.value}
            active={(props.state ?? "all") === o.value}
            label={o.label}
            onClick={() => navigate({ state: o.value })}
          />
        ))}
        {activeCount > 0 && (
          <>
            <div style={{ borderTop: "1px solid var(--nc-line-2)", margin: "4px 0" }} />
            <Item
              label="Limpiar filtros"
              onClick={() => navigate({ prio: "all", state: "all" })}
              muted
            />
          </>
        )}
      </Dropdown>

      <Dropdown
        id="people"
        open={open === "people"}
        onToggle={() => setOpen(open === "people" ? null : "people")}
        trigger={
          <>
            <IUsers size={12} />
            {personLabel}
          </>
        }
      >
        {personOptions.map((o) => (
          <Item
            key={o.value}
            active={(props.person ?? "all") === o.value}
            label={o.label}
            onClick={() => navigate({ person: o.value })}
          />
        ))}
      </Dropdown>

      <Dropdown
        id="tags"
        open={open === "tags"}
        onToggle={() => setOpen(open === "tags" ? null : "tags")}
        trigger={
          <>
            <ITag size={11} />
            {tagLabel}
          </>
        }
      >
        {tagOptions.map((o) => (
          <Item
            key={o.value}
            active={(props.tag ?? "all") === o.value}
            label={o.label}
            onClick={() => navigate({ tag: o.value })}
          />
        ))}
      </Dropdown>
    </div>
  );
}

function Dropdown({
  open,
  onToggle,
  trigger,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        className="nc-btn secondary"
        style={{
          padding: "5px 10px",
          fontSize: 11.5,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: open ? "var(--nc-line-2)" : undefined,
        }}
      >
        {trigger}
        <IChev dir="down" size={10} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "var(--nc-surface)",
            border: "1px solid var(--nc-line)",
            borderRadius: "var(--r-sm)",
            boxShadow: "var(--sh-2, 0 4px 14px rgba(0,0,0,0.08))",
            padding: 4,
            minWidth: 200,
            zIndex: 20,
            maxHeight: 320,
            overflow: "auto",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Section({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 9.5,
        color: "var(--nc-mute)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "6px 8px 2px",
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
}

function Item({
  label,
  active,
  onClick,
  muted,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "5px 8px",
        fontSize: 11.5,
        borderRadius: 4,
        background: active ? "var(--nc-green-soft)" : "transparent",
        color: muted ? "var(--nc-mute)" : "var(--nc-ink)",
        fontWeight: active ? 500 : 400,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          border: "1.5px solid var(--nc-line)",
          background: active ? "var(--nc-green)" : "transparent",
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  );
}
