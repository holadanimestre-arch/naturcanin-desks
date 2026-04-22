import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Avatar, Priority, State, Tag } from "@/components/primitives";
import { FileUpload } from "@/components/file-upload";
import { CommentBox } from "@/components/comment-box";
import { DeleteTaskBtn } from "@/components/delete-task-btn";
import { ICheck, IChev, IClip, IEye, ILock, ISend } from "@/components/icons";
import { getTask, getTaskComments, getTaskFiles, getSignedUrl } from "@/lib/supabase/queries";

type SubtaskRow = { d: boolean; t: string };
const subtasks: SubtaskRow[] = [
  { d: false, t: "Pendiente de definir" },
];

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function fileExt(name: string): string {
  return name.split(".").pop()?.toUpperCase() ?? "FILE";
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taskId = Number(id);
  const [t, comments, files] = await Promise.all([
    getTask(taskId),
    getTaskComments(taskId),
    getTaskFiles(taskId),
  ]);
  if (!t) return notFound();

  // Generar URLs firmadas para cada archivo
  const filesWithUrls = await Promise.all(
    files.map(async (f: any) => ({
      ...f,
      url: await getSignedUrl(f.storage_path),
    }))
  );

  return (
    <div className="nc-app-shell">
      <Sidebar active="board" compact />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--nc-bg)" }}>

        {/* Header */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 18px",
            borderBottom: "1px solid var(--nc-line)",
            background: "var(--nc-surface)", flexShrink: 0,
          }}
        >
          <Link href="/tablero" className="nc-icon-btn" aria-label="Volver">
            <IChev dir="left" size={14} />
          </Link>
          <div style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>
            Tablero / <span style={{ color: "var(--nc-ink)" }}>Tarea #{t.id}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button className="nc-btn ghost" style={{ fontSize: 11.5 }}>
            <IEye size={12} /> Seguir
          </button>
          <button className="nc-btn primary" style={{ fontSize: 11.5 }}>
            <ICheck size={12} /> Archivar
          </button>
          <DeleteTaskBtn taskId={taskId} title={t.title} />
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Main */}
          <div style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Tag k={t.tag} />
              <Priority level={t.prio} showLabel />
              <State s={t.state} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
              {t.title}
            </h1>
            {t.desc && (
              <p style={{ fontSize: 13, color: "var(--nc-text)", marginBottom: 20, maxWidth: 560, lineHeight: 1.55 }}>
                {t.desc}
              </p>
            )}

            {/* Archivos */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--nc-mute)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Archivos · {filesWithUrls.length}
                </div>
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 10, color: "var(--nc-green-dark)",
                    display: "flex", alignItems: "center", gap: 3,
                    background: "var(--nc-green-soft)", padding: "2px 7px", borderRadius: 999,
                  }}
                >
                  <ILock size={9} /> Almacenamiento permanente
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {filesWithUrls.map((f: any) => (
                  <a
                    key={f.id}
                    href={f.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 10px",
                      background: "var(--nc-surface)",
                      border: "1px solid var(--nc-line)",
                      borderRadius: "var(--r-sm)",
                      fontSize: 11.5,
                      textDecoration: "none", color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 26, height: 30,
                        background: "var(--nc-green-soft)",
                        borderRadius: 3,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--nc-green-dark)", fontSize: 8, fontWeight: 700,
                      }}
                    >
                      {fileExt(f.name)}
                    </div>
                    <div>
                      <div>{f.name}</div>
                      <div style={{ fontSize: 9.5, color: "var(--nc-mute)" }}>
                        {f.profiles?.name ?? "—"} · {timeAgo(f.uploaded_at)}
                      </div>
                    </div>
                  </a>
                ))}
                <FileUpload taskId={taskId} />
              </div>

              <div style={{ fontSize: 10.5, color: "var(--nc-mute)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <ILock size={10} /> Los archivos se conservan incluso si la tarea se archiva.
              </div>
            </div>

            {/* Comentarios */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--nc-mute)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Comentarios · {comments.length}
              </div>
              {comments.map((c: any) => (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <Avatar id={c.user_id} name={c.profiles?.name} size="lg" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.profiles?.name ?? "Usuario"}</span>
                      <span style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12.5, color: "var(--nc-text)",
                        background: "var(--nc-surface)",
                        padding: "8px 10px",
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--nc-line)",
                      }}
                    >
                      {c.text}
                    </div>
                  </div>
                </div>
              ))}
              <CommentBox taskId={taskId} />
            </div>
          </div>

          {/* Right rail */}
          <div
            style={{
              width: 240, borderLeft: "1px solid var(--nc-line)",
              background: "var(--nc-surface)", padding: "16px",
              overflow: "auto", flexShrink: 0,
            }}
          >
            <Row
              l="Asignado a"
              v={
                t.assignee.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--nc-mute)" }}>Sin asignar</span>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Avatar id={t.assignee[0]} name={t.assigneeNames?.[0]} />
                    <span style={{ fontSize: 12 }}>
                      {t.assignee.length === 1
                        ? (t.assigneeNames?.[0] ?? "1 persona")
                        : `${t.assignee.length} personas`}
                    </span>
                  </div>
                )
              }
            />
            <Row
              l="Fecha límite"
              v={
                <span style={{ fontSize: 12, color: t.due === "Hoy" ? "var(--nc-danger)" : "var(--nc-ink)" }}>
                  {t.due}
                </span>
              }
            />
            <Row l="Prioridad" v={<Priority level={t.prio} showLabel />} />
            <Row l="Categoría" v={<Tag k={t.tag} />} />
            <Row l="Estado" v={<State s={t.state} />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: "var(--nc-mute)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {l}
      </div>
      <div>{v}</div>
    </div>
  );
}
