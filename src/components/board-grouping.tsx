"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ICheck, IChev } from "./icons";

export type GroupKey = "state" | "prio" | "tag" | "person";

const OPTIONS: { key: GroupKey; label: string }[] = [
  { key: "state", label: "Estado" },
  { key: "prio", label: "Prioridad" },
  { key: "tag", label: "Categoría" },
  { key: "person", label: "Asignado" },
];

const LABEL: Record<GroupKey, string> = Object.fromEntries(
  OPTIONS.map((o) => [o.key, o.label])
) as Record<GroupKey, string>;

export function BoardGrouping({ value }: { value: GroupKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  function open() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  function close() {
    setPos(null);
  }

  function pick(g: GroupKey) {
    const u = new URLSearchParams(searchParams.toString());
    if (g === "state") u.delete("group");
    else u.set("group", g);
    const qs = u.toString();
    router.push(`/tablero${qs ? `?${qs}` : ""}`);
    close();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        className="nc-btn ghost"
        style={{ padding: "4px 8px", fontSize: 11.5, color: "var(--nc-ink)" }}
        onClick={() => (pos ? close() : open())}
      >
        Agrupar: {LABEL[value]} <IChev dir="down" />
      </button>

      {pos && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={close} />
          <div
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              minWidth: 160,
              background: "var(--nc-surface)",
              border: "1px solid var(--nc-line)",
              borderRadius: "var(--r-sm)",
              boxShadow: "var(--sh-2)",
              zIndex: 41,
              overflow: "hidden",
              padding: 4,
            }}
          >
            {OPTIONS.map((o) => {
              const active = o.key === value;
              return (
                <button
                  key={o.key}
                  onClick={() => pick(o.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "6px 8px",
                    fontSize: 12, textAlign: "left",
                    background: active ? "var(--nc-line-2)" : "transparent",
                    color: "var(--nc-ink)",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ width: 12, display: "inline-flex", justifyContent: "center" }}>
                    {active && <ICheck size={11} />}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
