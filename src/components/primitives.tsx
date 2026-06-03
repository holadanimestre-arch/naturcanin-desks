import { peopleById, tags } from "@/lib/data";
import type { Person, TagKey, Priority as Prio, TaskState } from "@/lib/data";
import { IClock } from "./icons";

type Size = "sm" | "lg" | "xl" | undefined;

const AVATAR_COLORS = ["c1","c2","c3","c4","c5","c7"];
function colorForUUID(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ id, name, size }: { id: string; name?: string; size?: Size }) {
  const p = (peopleById as Record<string, Person>)[id];
  if (p) return <span className={`nc-avatar ${p.c}${size ? ` ${size}` : ""}`}>{p.initials}</span>;
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return <span className={`nc-avatar ${colorForUUID(id)}${size ? ` ${size}` : ""}`}>{initials}</span>;
}

export function AvStack({ ids, names, size }: { ids: string[]; names?: string[]; size?: Size }) {
  return (
    <span className="nc-avatar-stack">
      {ids.map((id, i) => <Avatar key={id} id={id} name={names?.[i]} size={size} />)}
    </span>
  );
}

export function Tag({ k }: { k: TagKey }) {
  const t = tags[k];
  if (!t) return null;
  return <span className={`nc-tag ${t.cls}`}>{t.label}</span>;
}

export function Priority({ level, showLabel }: { level: Prio; showLabel?: boolean }) {
  const labels: Record<Prio, string> = { high: "Alta", med: "Media", low: "Baja" };
  return (
    <span className={`nc-priority ${level}`}>
      <span className="bar" />
      <span className="bar" />
      <span className="bar" />
      {showLabel && <span>{labels[level]}</span>}
    </span>
  );
}

export function Due({ text, overdue }: { text: string; overdue?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10.5,
        color: overdue ? "var(--nc-danger)" : "var(--nc-text)",
      }}
    >
      <IClock size={11} />
      {text}
    </span>
  );
}

export function State({ s }: { s: TaskState }) {
  const labels: Record<TaskState, string> = {
    pending: "Pendiente",
    progress: "En curso",
    done: "Completada",
  };
  return (
    <span className={`nc-state ${s}`}>
      <span className="sq" />
      {labels[s]}
    </span>
  );
}

export function LogoLg() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img
        src="/logo.svg"
        alt="Naturcanin"
        width={44}
        height={44}
        style={{ display: "block" }}
      />
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Naturcanin</div>
        <div
          style={{
            fontSize: 10, color: "var(--nc-mute)",
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}
        >
          Tasks · BARF
        </div>
      </div>
    </div>
  );
}

export function Annot({
  children,
  angle = -3,
  style,
}: {
  children: React.ReactNode;
  angle?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div className="nc-note" style={{ transform: `rotate(${angle}deg)`, ...style }}>
      {children}
    </div>
  );
}
