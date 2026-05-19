"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardDetail = {
  id: string;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CardFile = {
  id: string;
  name: string;
  size: number | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
};

type Comment = {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
};

type Activity = {
  id: string;
  user_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PipelineCardModalProps {
  cardId: string;
  pipelineId: string;
  meId: string;
  meName: string;
  columnName: string;
  teamNames: Record<string, string>;
  onClose: () => void;
  onTitleChange: (cardId: string, newTitle: string) => void;
  onDelete: (cardId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: string): string {
  const d = new Date(ts);
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} · ${hh}:${mm}`;
}

function formatRelative(ts: string): string {
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffH < 24) return `hace ${diffH}h`;
  if (diffD === 1) return "ayer";

  const d = new Date(ts);
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function hashColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fileBadgeColor(mime: string | null): string {
  if (!mime) return "#888";
  if (mime.includes("pdf")) return "#e53e3e";
  if (mime.includes("word") || mime.includes("docx") || mime.includes("document")) return "#3182ce";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("xlsx") || mime.includes("csv")) return "#38a169";
  if (mime.includes("image")) return "#d69e2e";
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return "#805ad5";
  return "#718096";
}

function fileBadgeLabel(mime: string | null, name: string): string {
  if (name.endsWith(".pdf") || (mime && mime.includes("pdf"))) return "PDF";
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "DOC";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "XLS";
  if (name.endsWith(".csv")) return "CSV";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".gif") || name.endsWith(".webp")) return "IMG";
  if (name.endsWith(".zip") || name.endsWith(".rar")) return "ZIP";
  return "FILE";
}

function activityLabel(a: Activity): string {
  switch (a.type) {
    case "created":
      return "Tarjeta creada";
    case "edited":
      if (a.payload?.field === "title") return "Título editado";
      if (a.payload?.field === "notes") return "Notas actualizadas";
      return "Campo editado";
    case "file_added":
      return `Archivo adjuntado: ${a.payload?.name ?? ""}`;
    case "file_removed":
      return `Archivo eliminado: ${a.payload?.name ?? ""}`;
    case "commented":
      return "Comentario añadido";
    case "moved":
      return `Movida a ${a.payload?.to_column ?? ""}`;
    default:
      return a.type;
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ userId, name, size = 28 }: { userId: string; name: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: hashColor(userId),
        color: "#fff",
        fontSize: size * 0.38,
        fontWeight: 600,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initials(name)}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineCardModal({
  cardId,
  pipelineId,
  meId,
  meName,
  columnName,
  teamNames,
  onClose,
  onTitleChange,
  onDelete,
}: PipelineCardModalProps) {
  const supabase = createClient();

  // data
  const [card, setCard] = useState<CardDetail | null>(null);
  const [files, setFiles] = useState<CardFile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  // notes
  const [notesDraft, setNotesDraft] = useState("");
  const notesSaving = useRef(false);

  // comment
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSending, setCommentSending] = useState(false);

  // file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ── active tab for right panel
  const [tab, setTab] = useState<"files" | "comments" | "activity">("files");

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const [cardRes, filesRes, commentsRes, actRes] = await Promise.all([
      supabase.from("pipeline_cards").select("id,title,notes,created_at,updated_at").eq("id", cardId).single(),
      supabase.from("pipeline_card_files").select("*").eq("card_id", cardId).order("created_at", { ascending: true }),
      supabase.from("pipeline_card_comments").select("*").eq("card_id", cardId).order("created_at", { ascending: true }),
      supabase.from("pipeline_card_activity").select("*").eq("card_id", cardId).order("created_at", { ascending: false }),
    ]);

    if (cardRes.data) {
      setCard(cardRes.data as CardDetail);
      setTitleDraft(cardRes.data.title);
      setNotesDraft(cardRes.data.notes ?? "");
    }
    if (filesRes.data) setFiles(filesRes.data as CardFile[]);
    if (commentsRes.data) setComments(commentsRes.data as Comment[]);
    if (actRes.data) setActivity(actRes.data as Activity[]);
    setLoading(false);
  }, [cardId, supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // focus title input when entering edit mode
  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  // ── insert activity helper ─────────────────────────────────────────────────

  async function insertActivity(type: string, payload: Record<string, unknown>) {
    const { data } = await supabase
      .from("pipeline_card_activity")
      .insert({ card_id: cardId, user_id: meId, type, payload })
      .select()
      .single();
    if (data) {
      setActivity((prev) => [data as Activity, ...prev]);
    }
  }

  // ── title save ─────────────────────────────────────────────────────────────

  async function saveTitle() {
    if (!card) return;
    const newTitle = titleDraft.trim();
    if (!newTitle || newTitle === card.title) {
      setTitleDraft(card.title);
      setEditingTitle(false);
      return;
    }
    const oldTitle = card.title;
    setCard((prev) => prev ? { ...prev, title: newTitle } : prev);
    setEditingTitle(false);
    onTitleChange(cardId, newTitle);

    await supabase.from("pipeline_cards").update({ title: newTitle }).eq("id", cardId);
    await insertActivity("edited", { field: "title", old: oldTitle, new: newTitle });
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") saveTitle();
    if (e.key === "Escape") {
      setTitleDraft(card?.title ?? "");
      setEditingTitle(false);
    }
  }

  // ── notes save ─────────────────────────────────────────────────────────────

  async function saveNotes() {
    if (!card || notesSaving.current) return;
    if (notesDraft === (card.notes ?? "")) return;
    notesSaving.current = true;
    await supabase.from("pipeline_cards").update({ notes: notesDraft }).eq("id", cardId);
    await insertActivity("edited", { field: "notes" });
    setCard((prev) => prev ? { ...prev, notes: notesDraft } : prev);
    notesSaving.current = false;
  }

  // ── file upload ────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fileId = crypto.randomUUID();
    const storagePath = `${meId}/${fileId}`;

    const { error: uploadError } = await supabase.storage
      .from("pipeline-files")
      .upload(storagePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const { data: fileRow } = await supabase
      .from("pipeline_card_files")
      .insert({
        id: fileId,
        card_id: cardId,
        name: file.name,
        size: file.size,
        mime_type: file.type || null,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (fileRow) setFiles((prev) => [...prev, fileRow as CardFile]);
    await insertActivity("file_added", { name: file.name });

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── file download ──────────────────────────────────────────────────────────

  async function downloadFile(f: CardFile) {
    const { data } = await supabase.storage
      .from("pipeline-files")
      .createSignedUrl(f.storage_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  // ── file delete ────────────────────────────────────────────────────────────

  async function deleteFile(f: CardFile) {
    await supabase.storage.from("pipeline-files").remove([f.storage_path]);
    await supabase.from("pipeline_card_files").delete().eq("id", f.id);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    await insertActivity("file_removed", { name: f.name });
  }

  // ── comment submit ─────────────────────────────────────────────────────────

  async function submitComment() {
    const text = commentDraft.trim();
    if (!text || commentSending) return;
    setCommentSending(true);

    const { data } = await supabase
      .from("pipeline_card_comments")
      .insert({ card_id: cardId, user_id: meId, text })
      .select()
      .single();

    if (data) setComments((prev) => [...prev, data as Comment]);
    await insertActivity("commented", { text_preview: text.slice(0, 60) });
    setCommentDraft("");
    setCommentSending(false);
  }

  // ── resolve user name ──────────────────────────────────────────────────────

  function userName(userId: string): string {
    if (userId === meId) return meName;
    return teamNames[userId] ?? "Usuario";
  }

  // ── close on backdrop click ────────────────────────────────────────────────

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // ── key close ─────────────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.62)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "var(--nc-surface)",
          border: "1px solid var(--nc-line)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 860,
          height: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* delete + close buttons */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", gap: 6 }}>
          <button
            className="nc-icon-btn"
            onClick={async () => {
              if (!window.confirm("¿Eliminar esta tarjeta?")) return;
              await supabase.from("pipeline_cards").delete().eq("id", cardId);
              onDelete(cardId);
              onClose();
            }}
            title="Eliminar tarjeta"
            style={{ color: "var(--nc-danger)" }}
            aria-label="Eliminar tarjeta"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3h10M5 3V2h4v1M6 6v4M8 6v4M3 3l.7 8.3a1 1 0 001 .7h4.6a1 1 0 001-.7L11 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="nc-icon-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--nc-mute)",
              fontSize: 14,
            }}
          >
            Cargando…
          </div>
        ) : (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* ── Left panel ──────────────────────────────────────────────── */}
            <div
              style={{
                width: "60%",
                borderRight: "1px solid var(--nc-line)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid var(--nc-line)" }}>
                {/* title */}
                {editingTitle ? (
                  <input
                    ref={titleRef}
                    className="nc-input"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={handleTitleKeyDown}
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      width: "100%",
                      marginBottom: 6,
                      paddingRight: 32,
                    }}
                  />
                ) : (
                  <h2
                    onClick={() => setEditingTitle(true)}
                    title="Haz clic para editar"
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--nc-ink)",
                      margin: "0 0 6px",
                      cursor: "text",
                      lineHeight: 1.3,
                      paddingRight: 32,
                      wordBreak: "break-word",
                    }}
                  >
                    {card?.title}
                  </h2>
                )}

                <span style={{ fontSize: 12, color: "var(--nc-mute)" }}>
                  En columna:{" "}
                  <strong style={{ fontWeight: 600, color: "var(--nc-mute)" }}>
                    {columnName}
                  </strong>
                </span>
              </div>

              {/* notes */}
              <div style={{ flex: 1, padding: "20px 28px", overflow: "auto" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--nc-mute)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                  }}
                >
                  Notas
                </label>
                <textarea
                  className="nc-input"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Escribe notas sobre esta tarjeta…"
                  style={{
                    width: "100%",
                    minHeight: 200,
                    resize: "vertical",
                    fontSize: 14,
                    lineHeight: 1.6,
                    fontFamily: "inherit",
                  }}
                />
                <p style={{ fontSize: 11, color: "var(--nc-mute)", marginTop: 4 }}>
                  Guardado automáticamente al salir del campo.
                </p>
              </div>
            </div>

            {/* ── Right panel ─────────────────────────────────────────────── */}
            <div
              style={{
                width: "40%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* tabs */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--nc-line)",
                  padding: "0 4px",
                }}
              >
                {(["files", "comments", "activity"] as const).map((t) => {
                  const labels = { files: "Archivos", comments: "Comentarios", activity: "Actividad" };
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      style={{
                        flex: 1,
                        padding: "12px 8px",
                        background: "none",
                        border: "none",
                        borderBottom: tab === t ? "2px solid var(--nc-green)" : "2px solid transparent",
                        color: tab === t ? "var(--nc-ink)" : "var(--nc-mute)",
                        fontWeight: tab === t ? 600 : 400,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "color 0.15s",
                      }}
                    >
                      {labels[t]}
                      {t === "files" && files.length > 0 && (
                        <span
                          style={{
                            marginLeft: 5,
                            background: "var(--nc-line)",
                            borderRadius: 10,
                            padding: "1px 6px",
                            fontSize: 11,
                          }}
                        >
                          {files.length}
                        </span>
                      )}
                      {t === "comments" && comments.length > 0 && (
                        <span
                          style={{
                            marginLeft: 5,
                            background: "var(--nc-line)",
                            borderRadius: 10,
                            padding: "1px 6px",
                            fontSize: 11,
                          }}
                        >
                          {comments.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* tab content */}
              <div style={{ flex: 1, overflow: "auto" }}>
                {/* ── Files ───────────────────────────────────────────────── */}
                {tab === "files" && (
                  <div style={{ padding: "16px" }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                    <button
                      className="nc-btn primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{ width: "100%", marginBottom: 14, fontSize: 13 }}
                    >
                      {uploading ? "Subiendo…" : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6, verticalAlign: "middle" }}>
                            <path d="M7 1v9M3 5l4-4 4 4M2 11h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Subir archivo
                        </>
                      )}
                    </button>

                    {files.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--nc-mute)", textAlign: "center", marginTop: 24 }}>
                        No hay archivos adjuntos.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {files.map((f) => (
                          <div
                            key={f.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 10px",
                              background: "var(--nc-bg)",
                              border: "1px solid var(--nc-line)",
                              borderRadius: 8,
                            }}
                          >
                            {/* type badge */}
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 34,
                                height: 34,
                                borderRadius: 6,
                                background: fileBadgeColor(f.mime_type),
                                color: "#fff",
                                fontSize: 9,
                                fontWeight: 700,
                                flexShrink: 0,
                                letterSpacing: "0.04em",
                              }}
                            >
                              {fileBadgeLabel(f.mime_type, f.name)}
                            </span>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "var(--nc-ink)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {f.name}
                              </p>
                              <p style={{ margin: 0, fontSize: 11, color: "var(--nc-mute)" }}>
                                {formatFileSize(f.size)} · {formatDate(f.created_at)}
                              </p>
                            </div>

                            <button
                              className="nc-icon-btn"
                              title="Descargar"
                              onClick={() => downloadFile(f)}
                              style={{ flexShrink: 0 }}
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M7 1v8M3 6l4 4 4-4M2 11h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              className="nc-icon-btn"
                              title="Eliminar"
                              onClick={() => deleteFile(f)}
                              style={{ flexShrink: 0, color: "var(--nc-danger)" }}
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 3h10M5 3V2h4v1M6 6v4M8 6v4M3 3l.7 8.3a1 1 0 001 .7h4.6a1 1 0 001-.7L11 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Comments ─────────────────────────────────────────────── */}
                {tab === "comments" && (
                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* comment list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {comments.length === 0 ? (
                        <p style={{ fontSize: 13, color: "var(--nc-mute)", textAlign: "center", marginTop: 12 }}>
                          Sin comentarios aún.
                        </p>
                      ) : (
                        comments.map((c) => {
                          const name = userName(c.user_id);
                          return (
                            <div key={c.id} style={{ display: "flex", gap: 10 }}>
                              <Avatar userId={c.user_id} name={name} size={28} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--nc-ink)" }}>
                                    {name}
                                  </span>
                                  <span style={{ fontSize: 11, color: "var(--nc-mute)" }}>
                                    {formatDate(c.created_at)}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 13,
                                    color: "var(--nc-ink)",
                                    lineHeight: 1.5,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {c.text}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* compose */}
                    <div
                      style={{
                        borderTop: "1px solid var(--nc-line)",
                        paddingTop: 14,
                        marginTop: 4,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <Avatar userId={meId} name={meName} size={28} />
                        <div style={{ flex: 1 }}>
                          <textarea
                            className="nc-input"
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
                            }}
                            placeholder="Escribe un comentario…"
                            rows={3}
                            style={{
                              width: "100%",
                              resize: "vertical",
                              fontSize: 13,
                              lineHeight: 1.5,
                              fontFamily: "inherit",
                            }}
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                            <button
                              className="nc-btn primary"
                              onClick={submitComment}
                              disabled={!commentDraft.trim() || commentSending}
                              style={{ fontSize: 13 }}
                            >
                              {commentSending ? "Enviando…" : "Comentar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Activity ─────────────────────────────────────────────── */}
                {tab === "activity" && (
                  <div style={{ padding: "16px" }}>
                    {activity.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--nc-mute)", textAlign: "center", marginTop: 12 }}>
                        Sin actividad registrada.
                      </p>
                    ) : (
                      <div style={{ position: "relative", paddingLeft: 16 }}>
                        {/* vertical line */}
                        <div
                          style={{
                            position: "absolute",
                            left: 5,
                            top: 8,
                            bottom: 8,
                            width: 1,
                            background: "var(--nc-line)",
                          }}
                        />

                        {activity.map((a) => {
                          const name = a.user_id ? userName(a.user_id) : "Sistema";
                          return (
                            <div key={a.id} style={{ display: "flex", gap: 10, marginBottom: 14, position: "relative" }}>
                              {/* dot */}
                              <span
                                style={{
                                  position: "absolute",
                                  left: -16,
                                  top: 5,
                                  width: 9,
                                  height: 9,
                                  borderRadius: "50%",
                                  background: "var(--nc-green)",
                                  border: "2px solid var(--nc-surface)",
                                  flexShrink: 0,
                                }}
                              />

                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: 13, color: "var(--nc-ink)", lineHeight: 1.4 }}>
                                  <strong style={{ fontWeight: 600 }}>{name}</strong>{" "}
                                  {activityLabel(a)}
                                </p>
                                <p style={{ margin: 0, fontSize: 11, color: "var(--nc-mute)", marginTop: 2 }}>
                                  {formatRelative(a.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
