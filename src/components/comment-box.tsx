"use client";

import { useState } from "react";
import { IClip, ISend } from "./icons";
import { postComment } from "@/app/tareas/[id]/actions";

export function CommentBox({ taskId }: { taskId: number }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    const result = await postComment(taskId, text);
    if (result?.error) {
      setError(result.error);
    } else {
      setText("");
    }
    setSending(false);
  }

  return (
    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
      <div
        style={{
          flex: 1,
          background: "var(--nc-surface)",
          border: "1px solid var(--nc-line)",
          borderRadius: "var(--r-sm)",
          padding: "8px 10px",
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un comentario…"
          rows={2}
          style={{
            width: "100%", border: "none", background: "transparent",
            fontSize: 12.5, color: "var(--nc-ink)", resize: "none", outline: "none",
            fontFamily: "inherit",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
          }}
        />
        {error && (
          <div style={{ fontSize: 11, color: "var(--nc-danger, #dc2626)", marginBottom: 4 }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <button className="nc-icon-btn" style={{ width: 22, height: 22 }} type="button">
            <IClip size={12} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="nc-btn primary"
            style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={handleSend}
            disabled={sending || !text.trim()}
            type="button"
          >
            <ISend size={11} /> {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
