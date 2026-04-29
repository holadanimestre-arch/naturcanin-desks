import type { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

type Admin = ReturnType<typeof createAdminClient>;

// Inserta una notificación por cada usuario al que se le ha asignado una tarea
// (excluyendo a quien hizo la asignación).
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
