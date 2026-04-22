"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const { data: task } = await supabase
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

  if (task) {
    await supabase.from("task_assignees").insert({ task_id: task.id, user_id: user.id });
  }

  redirect("/tablero");
}
