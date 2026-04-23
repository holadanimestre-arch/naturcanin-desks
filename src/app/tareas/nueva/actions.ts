"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Falta el título" };

  const assigneeIds = formData
    .getAll("assignee_ids")
    .map((v) => String(v))
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

  if (error || !task) return { error: error?.message ?? "Error al crear" };

  // Asigna al creador siempre que no esté ya incluido
  const finalAssignees = Array.from(new Set([user.id, ...assigneeIds]));

  // Usa admin client para insertar asignaciones de otros usuarios
  // (si el creador no es admin, RLS bloquearía insertar asignaciones ajenas).
  const admin = createAdminClient();
  await admin.from("task_assignees").insert(
    finalAssignees.map((uid) => ({ task_id: task.id, user_id: uid }))
  );

  revalidatePath("/tablero");
  revalidatePath("/");
  revalidatePath("/mis-tareas");
  redirect("/tablero");
}
