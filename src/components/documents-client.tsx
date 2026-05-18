"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IFolder, IDownload, IShare, ITrash, IPlus, IX, ICheck, ISearch } from "./icons";
import { Avatar } from "./primitives";

type Doc = {
  id: string;
  name: string;
  size: number | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
  owner_id: string;
};

type Share = { document_id: string; shared_with_user_id: string };
type TeamPick = { id: string; name: string };

const MIME_LABELS: Record<string, { label: string; color: string }> = {
  "application/pdf": { label: "PDF", color: "#e53e3e" },
  "application/msword": { label: "DOC", color: "#2b6cb0" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { label: "DOCX", color: "#2b6cb0" },
  "application/vnd.ms-excel": { label: "XLS", color: "#276749" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { label: "XLSX", color: "#276749" },
  "application/vnd.ms-powerpoint": { label: "PPT", color: "#c05621" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { label: "PPTX", color: "#c05621" },
  "text/plain": { label: "TXT", color: "#718096" },
  "text/csv": { label: "CSV", color: "#276749" },
};

function fileLabel(mime: string | null) {
  if (!mime) return { label: "FILE", color: "#718096" };
  if (mime.startsWith("image/")) return { label: "IMG", color: "#b7791f" };
  return MIME_LABELS[mime] ?? { label: "FILE", color: "#718096" };
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function DocumentsClient({
  me,
  docs: initialDocs,
  shares: initialShares,
  team,
}: {
  me: { id: string };
  docs: Doc[];
  shares: Share[];
  team: TeamPick[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [shares, setShares] = useState<Share[]>(initialShares);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [shareModalDoc, setShareModalDoc] = useState<Doc | null>(null);
  const [shareQuery, setShareQuery] = useState("");
  const [shareBusy, setShareBusy] = useState(false);

  const myDocs = docs.filter((d) => d.owner_id === me.id);
  const sharedWithMe = docs.filter((d) => d.owner_id !== me.id);

  const filtered = (list: Doc[]) =>
    list.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    for (const file of Array.from(files)) {
      const docId = crypto.randomUUID();
      const path = `${me.id}/${docId}`;

      const { error: storageErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (storageErr) {
        setUploadError(`Error subiendo ${file.name}: ${storageErr.message}`);
        setUploading(false);
        return;
      }

      const { data: inserted, error: dbErr } = await supabase
        .from("documents")
        .insert({
          id: docId,
          owner_id: me.id,
          name: file.name,
          size: file.size,
          mime_type: file.type || null,
          storage_path: path,
        })
        .select()
        .single();

      if (dbErr || !inserted) {
        setUploadError(`Error registrando ${file.name}: ${dbErr?.message}`);
        setUploading(false);
        return;
      }

      setDocs((prev) => [inserted as Doc, ...prev]);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownload(doc: Doc) {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60);

    if (error || !data) {
      alert("No se pudo generar el enlace de descarga.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`¿Eliminar "${doc.name}"? Esta acción no se puede deshacer.`)) return;

    await supabase.storage.from("documents").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", doc.id);

    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    setShares((prev) => prev.filter((s) => s.document_id !== doc.id));
  }

  async function toggleShare(doc: Doc, userId: string) {
    if (shareBusy) return;
    setShareBusy(true);
    const existing = shares.find(
      (s) => s.document_id === doc.id && s.shared_with_user_id === userId
    );

    if (existing) {
      await supabase
        .from("document_shares")
        .delete()
        .eq("document_id", doc.id)
        .eq("shared_with_user_id", userId);
      setShares((prev) =>
        prev.filter((s) => !(s.document_id === doc.id && s.shared_with_user_id === userId))
      );
    } else {
      const { data } = await supabase
        .from("document_shares")
        .insert({ document_id: doc.id, shared_with_user_id: userId })
        .select()
        .single();
      if (data) setShares((prev) => [...prev, data as Share]);
    }
    setShareBusy(false);
  }

  const docSharees = (doc: Doc) =>
    shares.filter((s) => s.document_id === doc.id).map((s) => s.shared_with_user_id);

  const filteredShareCandidates = team
    .filter((t) => t.id !== me.id)
    .filter((t) => {
      const q = shareQuery.trim().toLowerCase();
      return !q || t.name.toLowerCase().includes(q);
    });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--nc-bg)" }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--nc-line)",
          background: "var(--nc-surface)",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Documentos</div>
          <div style={{ fontSize: 11, color: "var(--nc-mute)" }}>
            {myDocs.length} archivo{myDocs.length !== 1 ? "s" : ""} propios
            {sharedWithMe.length > 0 && ` · ${sharedWithMe.length} compartido${sharedWithMe.length !== 1 ? "s" : ""} contigo`}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--nc-line-2)", padding: "6px 10px",
            borderRadius: "var(--r-sm)", fontSize: 12,
          }}
        >
          <ISearch size={12} style={{ color: "var(--nc-mute)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, width: 160 }}
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleUpload(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif"
        />
        <button
          className="nc-btn primary"
          style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <IPlus size={12} />
          {uploading ? "Subiendo…" : "Subir archivo"}
        </button>
      </div>

      {uploadError && (
        <div style={{ padding: "8px 18px", background: "var(--nc-danger-soft)", color: "var(--nc-danger)", fontSize: 12 }}>
          {uploadError}
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: 18 }}>
        {/* Mis documentos */}
        <Section title="Mis documentos" empty={filtered(myDocs).length === 0} emptyText="Aún no has subido ningún archivo.">
          <DocGrid>
            {filtered(myDocs).map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                sharees={docSharees(doc)}
                team={team}
                isOwner
                onDownload={() => handleDownload(doc)}
                onDelete={() => handleDelete(doc)}
                onShare={() => { setShareModalDoc(doc); setShareQuery(""); }}
              />
            ))}
          </DocGrid>
        </Section>

        {sharedWithMe.length > 0 && (
          <Section title="Compartidos conmigo" empty={filtered(sharedWithMe).length === 0} emptyText="Sin resultados.">
            <DocGrid>
              {filtered(sharedWithMe).map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  sharees={[]}
                  team={team}
                  isOwner={false}
                  onDownload={() => handleDownload(doc)}
                  onDelete={() => {}}
                  onShare={() => {}}
                />
              ))}
            </DocGrid>
          </Section>
        )}
      </div>

      {/* Share modal */}
      {shareModalDoc && (
        <>
          <div
            onClick={() => setShareModalDoc(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(28,31,26,0.35)", zIndex: 40 }}
          />
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 41 }}>
            <div style={{ width: "100%", maxWidth: 420, background: "var(--nc-surface)", borderRadius: "var(--r-lg)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--nc-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Compartir documento</div>
                  <div style={{ fontSize: 11, color: "var(--nc-mute)", marginTop: 2 }}>{shareModalDoc.name}</div>
                </div>
                <button type="button" className="nc-icon-btn" onClick={() => setShareModalDoc(null)}><IX size={14} /></button>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <input
                  autoFocus
                  value={shareQuery}
                  onChange={(e) => setShareQuery(e.target.value)}
                  placeholder="Buscar persona…"
                  className="nc-input"
                  style={{ width: "100%", fontSize: 13, padding: "7px 10px", marginBottom: 10 }}
                />
                <div style={{ maxHeight: 300, overflow: "auto", margin: "0 -4px" }}>
                  {filteredShareCandidates.length === 0 ? (
                    <div style={{ padding: "18px 10px", fontSize: 12, color: "var(--nc-mute)", textAlign: "center" }}>Sin coincidencias</div>
                  ) : (
                    filteredShareCandidates.map((p) => {
                      const shared = docSharees(shareModalDoc).includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleShare(shareModalDoc, p.id)}
                          disabled={shareBusy}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            width: "100%", padding: "8px 10px",
                            background: shared ? "var(--nc-green-soft)" : "transparent",
                            borderRadius: 6, fontSize: 12.5, textAlign: "left", cursor: "pointer",
                          }}
                        >
                          <span style={{
                            width: 16, height: 16, borderRadius: 4,
                            border: "1.5px solid var(--nc-line)",
                            background: shared ? "var(--nc-green)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", flexShrink: 0,
                          }}>
                            {shared && <ICheck size={10} />}
                          </span>
                          <Avatar id={p.id} name={p.name} size="sm" />
                          <span style={{ fontWeight: 500, color: "var(--nc-ink)" }}>{p.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, children, empty, emptyText }: { title: string; children: React.ReactNode; empty: boolean; emptyText: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--nc-mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        {title}
      </div>
      {empty ? (
        <div style={{ fontSize: 12, color: "var(--nc-mute)", padding: "20px 0" }}>{emptyText}</div>
      ) : children}
    </div>
  );
}

function DocGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
      {children}
    </div>
  );
}

function DocCard({
  doc, sharees, team, isOwner, onDownload, onDelete, onShare,
}: {
  doc: Doc;
  sharees: string[];
  team: TeamPick[];
  isOwner: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const { label, color } = fileLabel(doc.mime_type);
  const teamById = new Map(team.map((t) => [t.id, t.name]));

  return (
    <div
      style={{
        background: "var(--nc-surface)",
        border: "1px solid var(--nc-line)",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Preview area */}
      <div
        style={{
          height: 80, background: "var(--nc-line-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 44, height: 52,
            background: color + "22",
            border: `1.5px solid ${color}44`,
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 4,
          }}
        >
          <IFolder size={18} style={{ color }} />
          <span style={{ fontSize: 8, fontWeight: 800, color, letterSpacing: "0.04em" }}>{label}</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px", flex: 1 }}>
        <div
          title={doc.name}
          style={{ fontSize: 12, fontWeight: 600, color: "var(--nc-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}
        >
          {doc.name}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>
          {formatSize(doc.size)} · {formatDate(doc.created_at)}
        </div>
        {sharees.length > 0 && (
          <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
            {sharees.slice(0, 4).map((uid) => (
              <Avatar key={uid} id={uid} name={teamById.get(uid) ?? "?"} size="sm" />
            ))}
            {sharees.length > 4 && (
              <span style={{ fontSize: 10, color: "var(--nc-mute)", alignSelf: "center" }}>+{sharees.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          borderTop: "1px solid var(--nc-line-2)",
          padding: "6px 10px",
          display: "flex", gap: 4, justifyContent: "flex-end",
        }}
      >
        <button className="nc-icon-btn" title="Descargar" onClick={onDownload}><IDownload size={13} /></button>
        {isOwner && (
          <>
            <button className="nc-icon-btn" title="Compartir" onClick={onShare}><IShare size={13} /></button>
            <button className="nc-icon-btn" title="Eliminar" onClick={onDelete} style={{ color: "var(--nc-danger)" }}><ITrash size={13} /></button>
          </>
        )}
      </div>
    </div>
  );
}
