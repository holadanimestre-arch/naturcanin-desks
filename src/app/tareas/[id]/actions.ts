"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

export async function recordFile(taskId: number, fileName: string, storagePath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("files").insert({
    task_id: taskId,
    name: fileName,
    storage_path: storagePath,
    uploaded_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/tareas/${taskId}`);
  return { success: true };
}

export async function postComment(taskId: number, text: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("comments").insert({
    task_id: taskId,
    user_id: user.id,
    text: text.trim(),
  });

  if (error) return { error: error.message };
  revalidatePath(`/tareas/${taskId}`);
  return { success: true };
}

export async function addSubtask(taskId: number, text: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const t = text.trim();
  if (!t) return { error: "Texto vacío" };

  const { data: last } = await supabase
    .from("subtasks")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((last?.position as number | undefined) ?? -1) + 1;

  const { error } = await supabase.from("subtasks").insert({
    task_id: taskId,
    text: t,
    position: nextPos,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/tareas/${taskId}`);
  revalidatePath("/tablero");
  revalidatePath("/");
  revalidatePath("/mis-tareas");
  return { success: true };
}

export async function toggleSubtask(subtaskId: number, done: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: row, error: fetchErr } = await supabase
    .from("subtasks")
    .update({ done })
    .eq("id", subtaskId)
    .select("task_id")
    .single();
  if (fetchErr || !row) return { error: fetchErr?.message ?? "No encontrada" };

  revalidatePath(`/tareas/${row.task_id}`);
  revalidatePath("/tablero");
  revalidatePath("/");
  revalidatePath("/mis-tareas");
  return { success: true };
}

export async function deleteSubtask(subtaskId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: row } = await supabase
    .from("subtasks")
    .select("task_id")
    .eq("id", subtaskId)
    .single();

  const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
  if (error) return { error: error.message };

  if (row?.task_id) revalidatePath(`/tareas/${row.task_id}`);
  revalidatePath("/tablero");
  revalidatePath("/");
  revalidatePath("/mis-tareas");
  return { success: true };
}

type UpdateFields = {
  title: string;
  description: string | null;
  priority: "low" | "med" | "high";
  tag: string;
  due_date: string | null;
  assignee_ids: string[];
};

export async function updateTask(taskId: number, fields: UpdateFields) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const title = fields.title.trim();
  if (!title) return { error: "Falta el título" };
  if (!["low", "med", "high"].includes(fields.priority)) return { error: "Prioridad inválida" };

  const admin = createAdminClient();

  const { error } = await admin
    .from("tasks")
    .update({
      title,
      description: fields.description?.trim() || null,
      priority: fields.priority,
      tag: fields.tag,
      due_date: fields.due_date || null,
    })
    .eq("id", taskId);

  if (error) {
    await logError("Error al actualizar tarea", {
      context: { message: error.message, taskId },
      path: `/tareas/${taskId}`,
      userId: user.id,
    });
    return { error: error.message };
  }

  // Reemplaza los asignados.
  await admin.from("task_assignees").delete().eq("task_id", taskId);
  const uniqueAssignees = Array.from(new Set(fields.assignee_ids.filter(Boolean)));
  if (uniqueAssignees.length > 0) {
    const { error: assignErr } = await admin.from("task_assignees").insert(
      uniqueAssignees.map((uid) => ({ task_id: taskId, user_id: uid }))
    );
    if (assignErr) {
      await logError("Error al actualizar asignados", {
        context: { message: assignErr.message, taskId },
        path: `/tareas/${taskId}`,
        userId: user.id,
      });
      return { error: assignErr.message };
    }
  }

  revalidatePath(`/tareas/${taskId}`);
  revalidatePath("/tablero");
  revalidatePath("/");
  revalidatePath("/mis-tareas");
  revalidatePath("/archivo");
  return { success: true };
}

export async function deleteTask(taskId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();

  // Limpia filas dependientes antes de borrar la tarea (defensivo
  // por si algún FK no tiene ON DELETE CASCADE).
  await admin.from("comments").delete().eq("task_id", taskId);
  await admin.from("files").delete().eq("task_id", taskId);
  await admin.from("task_activity").delete().eq("task_id", taskId);
  await admin.from("task_assignees").delete().eq("task_id", taskId);
  await admin.from("subtasks").delete().eq("task_id", taskId);

  const { error } = await admin.from("tasks").delete().eq("id", taskId);
  if (error) {
    await logError("Error al eliminar tarea", {
      context: { message: error.message, taskId },
      path: `/tareas/${taskId}`,
      userId: user.id,
    });
    return { error: error.message };
  }

  revalidatePath("/tablero");
  revalidatePath("/");
  revalidatePath("/mis-tareas");
  revalidatePath("/archivo");
  redirect("/tablero");
}
