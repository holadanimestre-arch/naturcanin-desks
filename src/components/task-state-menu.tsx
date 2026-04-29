"use client";

import { useRef, useState } from "react";
import { ICheck, IMore } from "./icons";
import type { TaskState } from "@/lib/data";

const STATES: { key: TaskState; label: string; color: string }[] = [
  { key: "pending",  label: "Pendiente",  color: "#C8C6B8" },
  { key: "progress", label: "En curso",   color: "var(--nc-yellow)" },
  { key: "done",     label: "Completada", color: "var(--nc-green)" },
];

export function TaskStateMenu({
  currentState,
  onMove,
}: {
  currentState: TaskState;
  onMove: (s: TaskState) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  function open(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  function close(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPos(null);
  }

  function pick(e: React.MouseEvent, s: TaskState) {
    e.preventDefault();
    e.stopPropagation();
    if (s !== currentState) onMove(s);
    setPos(null);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="nc-icon-btn"
        aria-label="Mover tarea"
        onClick={open}
        style={{ width: 22, height: 22 }}
      >
        <IMore size={12} />
      </button>
      {pos && (
        <>
          <div
            onClick={close}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              minWidth: 170,
              background: "var(--nc-surface)",
              border: "1px solid var(--nc-line)",
              borderRadius: "var(--r-sm)",
              boxShadow: "var(--sh-2)",
              zIndex: 41,
              overflow: "hidden",
              padding: 4,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--nc-mute)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "4px 8px",
              }}
            >
              Mover a
            </div>
            {STATES.map((s) => {
              const active = s.key === currentState;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={(e) => pick(e, s.key)}
                  disabled={active}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "6px 8px",
                    fontSize: 12, textAlign: "left",
                    background: active ? "var(--nc-line-2)" : "transparent",
                    color: "var(--nc-ink)",
                    borderRadius: 4,
                    cursor: active ? "default" : "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: s.color, flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{s.label}</span>
                  {active && <ICheck size={11} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
