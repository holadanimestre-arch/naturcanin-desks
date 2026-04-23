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

export async function getMyTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: assignments } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", user.id);

  const taskIds = assignments?.map((a) => a.task_id) ?? [];
  if (taskIds.length === 0) return [];

  const { data } = await supabase
    .from("tasks")
    .select(SELECT_TASK)
    .in("id", taskIds)
    .order("due_date", { ascending: true, nullsFirst: false });

  return data?.map(mapRow) ?? [];
}

export type CalendarTask = {
  id: number;
  title: string;
  day: number;
  priority: "low" | "med" | "high";
  tag: string;
};

export async function getCalendarTasks(year: number, month: number): Promise<CalendarTask[]> {
  const supabase = await createClient();
  const mm = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const dd = String(daysInMonth).padStart(2, "0");
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${dd}`;

  const { data } = await supabase
    .from("tasks")
    .select("id, title, priority, tag, due_date")
    .gte("due_date", start)
    .lte("due_date", end)
    .order("due_date", { ascending: true });

  return (data ?? []).map((t: any) => ({
    id: Number(t.id),
    title: t.title,
    day: Number(t.due_date.split("-")[2]),
    priority: t.priority,
    tag: t.tag,
  }));
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

export type ArchivedTask = {
  id: number;
  title: string;
  tag: string;
  createdAt: string;
  completedAt: string | null;
  completedByName: string | null;
  completedByUserId: string | null;
  assignees: { id: string; name: string }[];
  files: { id: number; name: string; storagePath: string }[];
};

export async function getArchivedTasks(): Promise<ArchivedTask[]> {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id, title, tag, created_at,
      task_assignees(user_id, profiles(name)),
      files(id, name, storage_path)
    `)
    .eq("state", "done")
    .order("created_at", { ascending: false });

  if (!tasks) return [];

  const ids = tasks.map((t: any) => t.id);
  const completionMap = new Map<number, any>();
  if (ids.length > 0) {
    const { data: activity } = await supabase
      .from("task_activity")
      .select("task_id, created_at, user_id, meta, profiles(name)")
      .in("task_id", ids)
      .eq("kind", "state_changed")
      .order("created_at", { ascending: false });

    for (const a of (activity ?? []) as any[]) {
      if (a?.meta?.to === "done" && !completionMap.has(a.task_id)) {
        completionMap.set(a.task_id, a);
      }
    }
  }

  return (tasks as any[]).map((t) => {
    const comp = completionMap.get(t.id);
    return {
      id: Number(t.id),
      title: t.title,
      tag: t.tag,
      createdAt: t.created_at,
      completedAt: comp?.created_at ?? null,
      completedByName: comp?.profiles?.name ?? null,
      completedByUserId: comp?.user_id ?? null,
      assignees: (t.task_assignees ?? []).map((a: any) => ({
        id: a.user_id,
        name: a.profiles?.name ?? "?",
      })),
      files: (t.files ?? []).map((f: any) => ({
        id: Number(f.id),
        name: f.name,
        storagePath: f.storage_path,
      })),
    };
  });
}

export type ActivityEntry = {
  id: number;
  kind: string;
  meta: any;
  created_at: string;
  user_id: string | null;
  profiles: { name: string } | null;
};

export async function getTaskActivity(taskId: number): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_activity")
    .select("id, kind, meta, created_at, user_id, profiles(name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as any;
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
