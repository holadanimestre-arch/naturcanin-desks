"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskState } from "@/lib/data";

export async function updateTaskState(taskId: number, state: TaskState) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("tasks")
    .update({ state })
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath("/tablero");
  revalidatePath("/");
  revalidatePath("/mis-tareas");
  revalidatePath("/archivo");
  return { success: true };
}
