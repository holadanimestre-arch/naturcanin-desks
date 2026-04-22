"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function deleteTask(taskId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };

  redirect("/tablero");
}
