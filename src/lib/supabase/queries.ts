import { createClient } from "./server";
import type { Task, TagKey, Priority, TaskState } from "@/lib/data";

function formatDue(date: string | null): string {
  if (!date) return "Sin fecha";
  const d = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const diff = d.getTime() - today.getTime();
  if (diff === 0) return "Hoy";
  if (diff === 86400000) return "Mañana";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function mapRow(t: any): Task {
  return {
    id: Number(t.id),
    title: t.title,
    desc: t.description ?? undefined,
    tag: (t.tag as TagKey) || "produccion",
    prio: (t.priority as Priority) || "med",
    state: (t.state as TaskState) || "pending",
    due: formatDue(t.due_date),
    assignee: (t.task_assignees ?? []).map((a: any) => a.user_id),
    assigneeNames: (t.task_assignees ?? []).map((a: any) => a.profiles?.name ?? "?"),
    comments: t.comments?.[0]?.count ?? 0,
    files: t.files?.[0]?.count ?? 0,
  };
}

const SELECT_TASK = `
  id, title, description, state, priority, tag, due_date, created_at,
  task_assignees(user_id, profiles(name)),
  comments(count),
  files(count)
`;

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT_TASK)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getTask(id: number): Promise<Task | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT_TASK)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return mapRow(data);
}

export async function getTaskComments(taskId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("id, text, created_at, user_id, profiles(name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getTaskFiles(taskId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("files")
    .select("id, name, storage_path, uploaded_at, profiles(name)")
    .eq("task_id", taskId)
    .order("uploaded_at", { ascending: false });
  return data ?? [];
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("task-files")
    .createSignedUrl(storagePath, 3600); // 1 hora
  return data?.signedUrl ?? null;
}

export async function getMyNotifications() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, text, type, read, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}
