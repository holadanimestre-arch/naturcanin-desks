import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Avatar, Tag } from "@/components/primitives";
import { RestoreTaskBtn } from "@/components/restore-task-btn";
import { IEye, IFlag, ILock } from "@/components/icons";
import { getArchivedTasks, type ArchivedTask } from "@/lib/supabase/queries";

function formatShortDate(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function fileKind(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const isImg = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  return {
    label: isImg ? "IMG" : ext.toUpperCase() || "FILE",
    bg: isImg ? "var(--nc-yellow-soft)" : "var(--nc-green-soft)",
    fg: isImg ? "var(--nc-ink)" : "var(--nc-green-dark)",
  };
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  const sp = await searchParams;
  const onlyWithFiles = sp.only === "files";

  let archived = await getArchivedTasks();
  if (onlyWithFiles) archived = archived.filter((t) => t.files.length > 0);

  const totalFiles = archived.reduce((n, t) => n + t.files.length, 0);
  const missingFiles = archived.filter((t) => t.files.length === 0).length;

  return (
    <div className="nc-app-shell">
      <Sidebar active="archive" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          title="Archivo"
          subtitle="Tareas completadas · histórico permanente"
          searchPlaceholder="Buscar tareas archivadas, archivos, personas…"
          showAdd={false}
        />

        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px",
            borderBottom: "1px solid var(--nc-line)",
            background: "var(--nc-surface)",
            flexWrap: "wrap",
          }}
        >
          <Link
            href={onlyWithFiles ? "/archivo" : "/archivo?only=files"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11.5,
              padding: "5px 10px",
              borderRadius: "var(--r-sm)",
              background: onlyWithFiles ? "var(--nc-green-soft)" : "var(--nc-line-2)",
              color: onlyWithFiles ? "var(--nc-green-dark)" : "var(--nc-text)",
              fontWeight: onlyWithFiles ? 600 : 500,
              textDecoration: "none",
            }}
          >
            <input type="checkbox" readOnly checked={onlyWithFiles} style={{ accentColor: "var(--nc-green)" }} />
            Solo con archivos
          </Link>

          <div style={{ flex: 1 }} />

          <div style={{ fontSize: 11, color: "var(--nc-mute)" }}>
            <b style={{ color: "var(--nc-ink)", fontWeight: 600 }}>{archived.length}</b>{" "}
            tarea{archived.length !== 1 ? "s" : ""} archivada{archived.length !== 1 ? "s" : ""} ·{" "}
            <b style={{ color: "var(--nc-ink)", fontWeight: 600 }}>{totalFiles}</b> archivo{totalFiles !== 1 ? "s" : ""}
            {missingFiles > 0 && !onlyWithFiles && (
              <>
                {" · "}
                <span style={{ color: "var(--pr-high)", fontWeight: 600 }}>
                  {missingFiles} sin adjuntos
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)" }}>
          {/* Banner */}
          <div
            style={{
              background: "var(--nc-yellow-tint)",
              border: "1px solid var(--nc-yellow)",
              borderRadius: "var(--r-sm)",
              padding: "10px 14px",
              marginBottom: 14,
              display: "flex", gap: 10, alignItems: "flex-start",
              fontSize: 11.5, color: "var(--nc-ink)", lineHeight: 1.45,
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 1 }}>
              <ILock size={13} />
            </div>
            <div>
              <b style={{ fontWeight: 600 }}>Histórico permanente.</b> Las tareas completadas
              se guardan aquí junto con sus archivos, comentarios y actividad. Nada se borra —
              sirve de auditoría si alguien dice haber hecho algo que no hizo.
            </div>
          </div>

          {archived.length === 0 ? (
            <div
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: "var(--r-lg)",
                padding: "48px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                {onlyWithFiles ? "Sin tareas archivadas con archivos" : "Archivo vacío"}
              </div>
              <div style={{ fontSize: 12, color: "var(--nc-mute)" }}>
                Las tareas completadas aparecerán aquí automáticamente.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 0.8fr 0.9fr 0.6fr 1.3fr 0.4fr",
                  gap: 10,
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--nc-line)",
                  background: "var(--nc-line-2)",
                  fontSize: 10, fontWeight: 600, color: "var(--nc-mute)",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}
              >
                <div>Tarea</div>
                <div>Categoría</div>
                <div>Completada por</div>
                <div>Fecha</div>
                <div>Archivos</div>
                <div />
              </div>
              {archived.map((t, i) => (
                <ArchiveRow key={t.id} t={t} top={i === 0} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchiveRow({ t, top }: { t: ArchivedTask; top: boolean }) {
  const doneBy = t.completedByName
    ? { id: t.completedByUserId ?? "unk", name: t.completedByName }
    : t.assignees[0] ?? null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.5fr 0.8fr 0.9fr 0.6fr 1.3fr 0.4fr",
        gap: 10,
        padding: "12px 14px",
        borderTop: top ? "none" : "1px solid var(--nc-line-2)",
        alignItems: "center",
      }}
    >
      <Link
        href={`/tareas/${t.id}`}
        style={{
          display: "flex", gap: 8, alignItems: "center", minWidth: 0,
          textDecoration: "none", color: "inherit",
        }}
      >
        <div
          style={{
            width: 16, height: 16, borderRadius: "50%",
            background: "var(--nc-green)", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l5 5L20 6"/>
          </svg>
        </div>
        <div
          style={{
            fontSize: 12.5, fontWeight: 500,
            textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
          }}
        >
          {t.title}
        </div>
      </Link>

      <div><Tag k={t.tag as any} /></div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {doneBy ? (
          <>
            <Avatar id={doneBy.id} name={doneBy.name} size="sm" />
            <span
              style={{
                fontSize: 11.5, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {doneBy.name}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>—</span>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: "var(--nc-text)" }}>
        {formatShortDate(t.completedAt ?? t.createdAt)}
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {t.files.length === 0 ? (
          <span
            style={{
              fontSize: 10.5, color: "var(--pr-high)",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <IFlag size={11} /> Sin archivos — revisar
          </span>
        ) : (
          t.files.slice(0, 3).map((f) => {
            const k = fileKind(f.name);
            return (
              <div
                key={f.id}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 6px",
                  background: "var(--nc-line-2)",
                  borderRadius: 3,
                  fontSize: 10.5,
                  maxWidth: 160,
                }}
                title={f.name}
              >
                <div
                  style={{
                    width: 14, height: 16,
                    background: k.bg,
                    borderRadius: 2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 6.5, fontWeight: 700, color: k.fg,
                  }}
                >
                  {k.label}
                </div>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 120,
                  }}
                >
                  {f.name}
                </span>
              </div>
            );
          })
        )}
        {t.files.length > 3 && (
          <span style={{ fontSize: 10, color: "var(--nc-mute)" }}>+{t.files.length - 3}</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <Link
          href={`/tareas/${t.id}`}
          className="nc-icon-btn"
          style={{ width: 26, height: 26 }}
          title="Abrir tarea"
        >
          <IEye size={12} />
        </Link>
        <RestoreTaskBtn taskId={t.id} />
      </div>
    </div>
  );
}
