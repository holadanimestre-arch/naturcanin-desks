"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordFile } from "@/app/tareas/[id]/actions";
import { IClip } from "./icons";

export function FileUpload({ taskId }: { taskId: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const path = `${taskId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("task-files")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordFile(taskId, file.name, path);
    if (result?.error) setError(result.error);

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 10px",
          border: "1px dashed var(--nc-line)",
          borderRadius: "var(--r-sm)",
          fontSize: 11.5,
          color: uploading ? "var(--nc-mute)" : "var(--nc-text)",
          background: "transparent",
          cursor: uploading ? "not-allowed" : "pointer",
        }}
      >
        <IClip size={11} />
        {uploading ? "Subiendo…" : "Adjuntar archivo"}
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleChange}
          disabled={uploading}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.doc,.docx,.xlsx,.csv"
        />
      </label>
      {error && (
        <div style={{ fontSize: 11, color: "var(--nc-danger, #dc2626)", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
