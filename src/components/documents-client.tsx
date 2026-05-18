"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IFolder, IDownload, IShare, ITrash, IPlus, IX, ICheck, ISearch, IChev } from "./icons";
import { Avatar } from "./primitives";

type Doc = {
  id: string;
  name: string;
  size: number | null;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
  owner_id: string;
  folder: string | null;
};

type Share = { document_id: string; shared_with_user_id: string };
type TeamPick = { id: string; name: string };

const MIME_INFO: Record<string, { label: string; color: string }> = {
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

function mimeInfo(mime: string | null) {
  if (!mime) return { label: "FILE", color: "#718096" };
  if (mime.startsWith("image/")) return { label: "IMG", color: "#b7791f" };
  return MIME_INFO[mime] ?? { label: "FILE", color: "#718096" };
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

// Dada la ruta actual y todos los docs del usuario, devuelve las carpetas hijas visibles
function childFolders(docs: Doc[], currentFolder: string | null): string[] {
  const names = new Set<string>();
  for (const d of docs) {
    if (currentFolder === null) {
      if (d.folder) names.add(d.folder.split("/")[0]);
    } else {
      const prefix = currentFolder + "/";
      if (d.folder?.startsWith(prefix)) {
        names.add(d.folder.slice(prefix.length).split("/")[0]);
      }
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
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

  // Navegación
  const [path, setPath] = useState<string[]>([]); // [] = raíz
  const [view, setView] = useState<"mine" | "shared">("mine");
  const currentFolder = path.length > 0 ? path.join("/") : null;

  // UI
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const plusRef = useRef<HTMLDivElement>(null);

  // Nueva carpeta
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Compartir
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);
  const [shareQuery, setShareQuery] = useState("");
  const [shareBusy, setShareBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const myDocs = docs.filter((d) => d.owner_id === me.id);
  const sharedDocs = docs.filter((d) => d.owner_id !== me.id);

  const folders = childFolders(myDocs, currentFolder);
  const directFiles = myDocs.filter(
    (d) => d.folder === currentFolder && d.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredShared = sharedDocs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  function navigate(segment: string) {
    setPath((p) => [...p, segment]);
    setSearch("");
  }

  function goTo(index: number) {
    setPath((p) => p.slice(0, index));
    setSearch("");
  }

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    navigate(name);
    setNewFolderName("");
    setNewFolderModal(false);
  }

  async function uploadFiles(files: File[], folderOverride?: string) {
    setUploading(true);
    setUploadError(null);

    for (const file of files) {
      const docId = crypto.randomUUID();
      const storagePath = `${me.id}/${docId}`;
      const targetFolder = folderOverride !== undefined ? folderOverride : currentFolder;

      const { error: storageErr } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });

      if (storageErr) {
        setUploadError(`Error subiendo ${file.name}: ${storageErr.message}`);
        setUploading(false);
        return;
      }

      const { data: inserted, error: dbErr } = await supabase
        .from("documents")
        .insert({ id: docId, owner_id: me.id, name: file.name, size: file.size, mime_type: file.type || null, storage_path: storagePath, folder: targetFolder })
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
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadFiles(files);
    e.target.value = "";
  }

  function handleDirInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) { e.target.value = ""; return; }

    // Agrupar por carpeta según webkitRelativePath
    const tasks = files.map((f) => {
      const rel = (f as any).webkitRelativePath as string ?? f.name;
      const parts = rel.split("/");
      parts.pop(); // quitar nombre de archivo
      const subPath = parts.join("/"); // "RootFolder/sub"
      const targetFolder = [currentFolder, subPath].filter(Boolean).join("/") || null;
      return { file: f, folder: targetFolder };
    });

    (async () => {
      setUploading(true);
      setUploadError(null);
      for (const { file, folder } of tasks) {
        await uploadFiles([file], folder ?? null as any);
        if (uploadError) break;
      }
      setUploading(false);
    })();

    e.target.value = "";
  }

  async function handleDownload(doc: Doc) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (error || !data) { alert("No se pudo generar el enlace."); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    await supabase.storage.from("documents").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    setShares((prev) => prev.filter((s) => s.document_id !== doc.id));
  }

  async function toggleShare(doc: Doc, userId: string) {
    if (shareBusy) return;
    setShareBusy(true);
    const exists = shares.find((s) => s.document_id === doc.id && s.shared_with_user_id === userId);
    if (exists) {
      await supabase.from("document_shares").delete().eq("document_id", doc.id).eq("shared_with_user_id", userId);
      setShares((prev) => prev.filter((s) => !(s.document_id === doc.id && s.shared_with_user_id === userId)));
    } else {
      const { data } = await supabase.from("document_shares").insert({ document_id: doc.id, shared_with_user_id: userId }).select().single();
      if (data) setShares((prev) => [...prev, data as Share]);
    }
    setShareBusy(false);
  }

  const docSharees = (doc: Doc) => shares.filter((s) => s.document_id === doc.id).map((s) => s.shared_with_user_id);
  const teamById = new Map(team.map((t) => [t.id, t.name]));
  const shareCandidates = team.filter((t) => t.id !== me.id).filter((t) => !shareQuery || t.name.toLowerCase().includes(shareQuery.toLowerCase()));

  const isEmpty = view === "mine" ? folders.length === 0 && directFiles.length === 0 : filteredShared.length === 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--nc-bg)" }}>

      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--nc-line)", background: "var(--nc-surface)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

        {/* Tabs Mis archivos / Compartidos */}
        <div style={{ display: "flex", gap: 2 }}>
          {(["mine", "shared"] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setPath([]); setSearch(""); }}
              style={{
                padding: "5px 12px", borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 600,
                background: view === v ? "var(--nc-green-soft)" : "transparent",
                color: view === v ? "var(--nc-green-dark)" : "var(--nc-mute)",
                cursor: "pointer",
              }}
            >
              {v === "mine" ? "Mis archivos" : `Compartidos${sharedDocs.length > 0 ? ` (${sharedDocs.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Breadcrumb */}
        {view === "mine" && path.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 12, color: "var(--nc-mute)" }}>
            <button onClick={() => goTo(0)} style={{ color: "var(--nc-green-dark)", fontWeight: 500, cursor: "pointer", background: "none", fontSize: 12 }}>Inicio</button>
            {path.map((seg, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <IChev size={10} dir="right" />
                {i < path.length - 1
                  ? <button onClick={() => goTo(i + 1)} style={{ color: "var(--nc-green-dark)", fontWeight: 500, cursor: "pointer", background: "none", fontSize: 12 }}>{seg}</button>
                  : <span style={{ color: "var(--nc-ink)", fontWeight: 600 }}>{seg}</span>
                }
              </span>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Buscar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--nc-line-2)", padding: "6px 10px", borderRadius: "var(--r-sm)" }}>
          <ISearch size={12} style={{ color: "var(--nc-mute)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, width: 140 }} />
        </div>

        {/* +Nuevo */}
        {view === "mine" && (
          <div ref={plusRef} style={{ position: "relative" }}>
            <button
              className="nc-btn primary"
              style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => setPlusOpen((v) => !v)}
              disabled={uploading}
            >
              <IPlus size={12} />
              {uploading ? "Subiendo…" : "+ Nuevo"}
            </button>
            {plusOpen && (
              <div
                role="menu"
                style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 180, background: "var(--nc-surface)", border: "1px solid var(--nc-line)", borderRadius: "var(--r-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 4, zIndex: 30 }}
              >
                <DropItem onClick={() => { setPlusOpen(false); setNewFolderName(""); setNewFolderModal(true); }} icon="📁">Crear carpeta</DropItem>
                <DropItem onClick={() => { setPlusOpen(false); fileRef.current?.click(); }} icon="📄">Subir archivo</DropItem>
                <DropItem onClick={() => { setPlusOpen(false); dirRef.current?.click(); }} icon="🗂️">Subir carpeta</DropItem>
              </div>
            )}
          </div>
        )}

        {/* Inputs ocultos */}
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={handleFileInput}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif" />
        <input ref={dirRef} type="file" style={{ display: "none" }} onChange={handleDirInput}
          {...{ webkitdirectory: "", multiple: true } as any} />
      </div>

      {uploadError && (
        <div style={{ padding: "8px 20px", background: "#fff5f5", color: "var(--nc-danger)", fontSize: 12, borderBottom: "1px solid var(--nc-line)" }}>
          {uploadError}
        </div>
      )}

      {/* Grid */}
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {isEmpty ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, gap: 10, color: "var(--nc-mute)" }}>
            <IFolder size={36} style={{ opacity: 0.25 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nc-ink)" }}>
              {view === "shared" ? "Nadie ha compartido archivos contigo aún" : search ? "Sin resultados" : path.length > 0 ? "Esta carpeta está vacía" : "No hay archivos todavía"}
            </div>
            {view === "mine" && !search && (
              <div style={{ fontSize: 12 }}>Usa "+ Nuevo" para subir archivos o crear una carpeta</div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>

            {/* Carpetas primero */}
            {view === "mine" && folders
              .filter((f) => !search || f.toLowerCase().includes(search.toLowerCase()))
              .map((f) => {
                const count = myDocs.filter((d) => {
                  const p = currentFolder ? currentFolder + "/" + f : f;
                  return d.folder === p || d.folder?.startsWith(p + "/");
                }).length;
                return (
                  <FolderCard key={f} name={f} count={count} onClick={() => navigate(f)} />
                );
              })}

            {/* Archivos */}
            {(view === "mine" ? directFiles : filteredShared).map((doc) => (
              <FileCard
                key={doc.id}
                doc={doc}
                sharees={view === "mine" ? docSharees(doc) : []}
                teamById={teamById}
                isOwner={view === "mine"}
                onDownload={() => handleDownload(doc)}
                onDelete={() => handleDelete(doc)}
                onShare={() => { setShareDoc(doc); setShareQuery(""); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal nueva carpeta */}
      {newFolderModal && (
        <Modal title="Nueva carpeta" onClose={() => setNewFolderModal(false)}>
          <div style={{ padding: "12px 16px" }}>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setNewFolderModal(false); }}
              placeholder="Nombre de la carpeta"
              className="nc-input"
              style={{ width: "100%", fontSize: 13, padding: "8px 10px", marginBottom: 12 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="nc-btn ghost" style={{ fontSize: 12 }} onClick={() => setNewFolderModal(false)}>Cancelar</button>
              <button className="nc-btn primary" style={{ fontSize: 12 }} onClick={createFolder} disabled={!newFolderName.trim()}>Crear</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal compartir */}
      {shareDoc && (
        <Modal title="Compartir documento" subtitle={shareDoc.name} onClose={() => setShareDoc(null)}>
          <div style={{ padding: "12px 16px" }}>
            <input
              autoFocus value={shareQuery} onChange={(e) => setShareQuery(e.target.value)}
              placeholder="Buscar persona…" className="nc-input"
              style={{ width: "100%", fontSize: 13, padding: "7px 10px", marginBottom: 10 }}
            />
            <div style={{ maxHeight: 300, overflow: "auto" }}>
              {shareCandidates.length === 0
                ? <div style={{ padding: "18px 0", fontSize: 12, color: "var(--nc-mute)", textAlign: "center" }}>Sin coincidencias</div>
                : shareCandidates.map((p) => {
                  const on = docSharees(shareDoc).includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleShare(shareDoc, p.id)} disabled={shareBusy}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 6px", background: on ? "var(--nc-green-soft)" : "transparent", borderRadius: 6, fontSize: 12.5, textAlign: "left", cursor: "pointer" }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid var(--nc-line)", background: on ? "var(--nc-green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                        {on && <ICheck size={10} />}
                      </span>
                      <Avatar id={p.id} name={p.name} size="sm" />
                      <span style={{ fontWeight: 500, color: "var(--nc-ink)" }}>{p.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DropItem({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon: string }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "7px 10px", fontSize: 12.5, color: "var(--nc-ink)", background: "transparent", borderRadius: 4, cursor: "pointer" }}>
      <span>{icon}</span>{children}
    </button>
  );
}

function FolderCard({ name, count, onClick }: { name: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 10px", background: "var(--nc-surface)", border: "1px solid var(--nc-line)", borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "center" }}>
      <IFolder size={36} style={{ color: "var(--nc-yellow)" }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--nc-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{name}</div>
      <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>{count} elemento{count !== 1 ? "s" : ""}</div>
    </button>
  );
}

function FileCard({ doc, sharees, teamById, isOwner, onDownload, onDelete, onShare }: {
  doc: Doc; sharees: string[]; teamById: Map<string, string>; isOwner: boolean;
  onDownload: () => void; onDelete: () => void; onShare: () => void;
}) {
  const { label, color } = mimeInfo(doc.mime_type);
  return (
    <div style={{ display: "flex", flexDirection: "column", background: "var(--nc-surface)", border: "1px solid var(--nc-line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
      <div style={{ height: 70, background: "var(--nc-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 48, background: color + "22", border: `1.5px solid ${color}44`, borderRadius: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          <IFolder size={15} style={{ color }} />
          <span style={{ fontSize: 7, fontWeight: 800, color, letterSpacing: "0.04em" }}>{label}</span>
        </div>
      </div>
      <div style={{ padding: "8px 10px", flex: 1 }}>
        <div title={doc.name} style={{ fontSize: 11.5, fontWeight: 600, color: "var(--nc-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{doc.name}</div>
        <div style={{ fontSize: 10, color: "var(--nc-mute)" }}>{formatSize(doc.size)} · {formatDate(doc.created_at)}</div>
        {sharees.length > 0 && (
          <div style={{ display: "flex", gap: 2, marginTop: 5 }}>
            {sharees.slice(0, 3).map((uid) => <Avatar key={uid} id={uid} name={teamById.get(uid) ?? "?"} size="sm" />)}
            {sharees.length > 3 && <span style={{ fontSize: 9.5, color: "var(--nc-mute)", alignSelf: "center" }}>+{sharees.length - 3}</span>}
          </div>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--nc-line-2)", padding: "5px 8px", display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <button className="nc-icon-btn" title="Descargar" onClick={onDownload}><IDownload size={12} /></button>
        {isOwner && (
          <>
            <button className="nc-icon-btn" title="Compartir" onClick={onShare}><IShare size={12} /></button>
            <button className="nc-icon-btn" title="Eliminar" onClick={onDelete} style={{ color: "var(--nc-danger)" }}><ITrash size={12} /></button>
          </>
        )}
      </div>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(28,31,26,0.35)", zIndex: 40 }} />
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 41 }}>
        <div style={{ width: "100%", maxWidth: 420, background: "var(--nc-surface)", borderRadius: "var(--r-lg)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--nc-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
              {subtitle && <div style={{ fontSize: 11, color: "var(--nc-mute)", marginTop: 2 }}>{subtitle}</div>}
            </div>
            <button type="button" className="nc-icon-btn" onClick={onClose}><IX size={14} /></button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
