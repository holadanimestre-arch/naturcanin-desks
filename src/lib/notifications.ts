import type { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

type Admin = ReturnType<typeof createAdminClient>;

// ── Asignación ────────────────────────────────────────────────────────────────
// Notifica a los usuarios recién asignados a una tarea (excluye a quien asignó).
export async function notifyAssigned(
  admin: Admin,
  taskId: number,
  taskTitle: string,
  assigneeIds: string[],
  excludeUserId: string,
): Promise<void> {
  const targets = assigneeIds.filter((id) => id && id !== excludeUserId);
  if (targets.length === 0) return;

  const text = `Te han asignado a la tarea «${taskTitle}»`;
  const rows = targets.map((uid) => ({
    user_id: uid,
    text,
    type: "assigned",
    task_id: taskId,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    await logError("Error al crear notificaciones de asignación", {
      context: { message: error.message, taskId, count: rows.length },
      path: `/tareas/${taskId}`,
      userId: excludeUserId,
    });
  }
}

// ── Comentario ────────────────────────────────────────────────────────────────
// Notifica a los asignados de una tarea cuando alguien comenta (excluye al autor).
export async function notifyComment(
  admin: Admin,
  taskId: number,
  taskTitle: string,
  assigneeIds: string[],
  commentAuthorId: string,
  authorName: string,
): Promise<void> {
  const targets = assigneeIds.filter((id) => id && id !== commentAuthorId);
  if (targets.length === 0) return;

  const text = `${authorName} comentó en «${taskTitle}»`;
  const rows = targets.map((uid) => ({
    user_id: uid,
    text,
    type: "comment",
    task_id: taskId,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    await logError("Error al crear notificaciones de comentario", {
      context: { message: error.message, taskId },
      path: `/tareas/${taskId}`,
      userId: commentAuthorId,
    });
  }
}

// ── Mención ───────────────────────────────────────────────────────────────────
// Notifica a los usuarios mencionados con @Nombre en un comentario.
export async function notifyMention(
  admin: Admin,
  taskId: number,
  taskTitle: string,
  mentionedUserIds: string[],
  mentionedByUserId: string,
  authorName: string,
): Promise<void> {
  const targets = mentionedUserIds.filter((id) => id && id !== mentionedByUserId);
  if (targets.length === 0) return;

  const text = `${authorName} te mencionó en «${taskTitle}»`;
  const rows = targets.map((uid) => ({
    user_id: uid,
    text,
    type: "mention",
    task_id: taskId,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    await logError("Error al crear notificaciones de mención", {
      context: { message: error.message, taskId },
      path: `/tareas/${taskId}`,
      userId: mentionedByUserId,
    });
  }
}

