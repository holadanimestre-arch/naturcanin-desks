"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

type CreateResult = { id: number } | { error: string };

export async function createTask(formData: FormData): Promise<CreateResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Falta el título" };

  const assigneeIds = formData
    .getAll("assignee_ids")
    .map((v) => String(v))
    .filter(Boolean);

  const subtaskTexts = formData
    .getAll("subtasks[]")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: (formData.get("desc") as string)?.trim() || null,
      state: "pending",
      priority: (formData.get("priority") as string) || "med",
      tag: (formData.get("tag") as string) || "produccion",
      due_date: (formData.get("due_date") as string) || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) {
    await logError("Error al crear tarea", { context: { message: error?.message }, path: "/tareas/nueva", userId: user.id });
    return { error: error?.message ?? "Error al crear" };
  }

  const finalAssignees = Array.from(new Set([user.id, ...assigneeIds]));

  const admin = createAdminClient();
  await admin.from("task_assignees").insert(
    finalAssignees.map((uid) => ({ task_id: task.id, user_id: uid }))
  );

  if (subtaskTexts.length > 0) {
    await admin.from("subtasks").insert(
      subtaskTexts.map((text, i) => ({
        task_id: task.id,
        text,
        position: i,
        created_by: user.id,
      }))
    );
  }

  revalidatePath("/tablero");
  revalidatePath("/");
  revalidatePath("/mis-tareas");
  return { id: Number(task.id) };
}
