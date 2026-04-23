"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskState } from "@/app/tablero/actions";

export function RestoreTaskBtn({ taskId }: { taskId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await updateTaskState(taskId, "pending");
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title="Restaurar a Pendiente"
      className="nc-icon-btn"
      style={{ width: 26, height: 26 }}
    >
      {pending ? (
        <span style={{ fontSize: 9, color: "var(--nc-mute)" }}>…</span>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          <path d="M3 21v-5h5"/>
        </svg>
      )}
    </button>
  );
}
