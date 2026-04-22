import Link from "next/link";
import type { Task } from "@/lib/data";
import { AvStack, Due, Priority, Tag } from "./primitives";
import { ICheck, IClip, IMsg } from "./icons";

export function TaskCard({ t, compact }: { t: Task; compact?: boolean }) {
  return (
    <Link
      href={`/tareas/${t.id}`}
      className="nc-card-hover"
      style={{
        display: "block",
        background: "var(--nc-surface)",
        border: "1px solid var(--nc-line)",
        borderRadius: "var(--r-md)",
        padding: compact ? "8px 10px" : "10px 12px",
        marginBottom: 8,
        boxShadow: "var(--sh-1)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Tag k={t.tag} />
        <Priority level={t.prio} />
        <div style={{ flex: 1 }} />
        {t.due && <Due text={t.due} overdue={t.due === "Hoy" && t.state !== "done"} />}
      </div>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--nc-ink)",
          marginBottom: compact ? 4 : 8,
          lineHeight: 1.35,
        }}
      >
        {t.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <AvStack ids={t.assignee} names={t.assigneeNames} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--nc-mute)",
            fontSize: 10.5,
          }}
        >
          {t.subs && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <ICheck size={11} />
              {t.subs.d}/{t.subs.t}
            </span>
          )}
          {t.comments > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <IMsg size={11} />
              {t.comments}
            </span>
          )}
          {t.files > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <IClip size={11} />
              {t.files}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
