import { createClient } from "./server";
import { createAdminClient } from "./admin";
import type { Task, TagKey, Priority, TaskState } from "@/lib/data";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: "admin" | "usuario";
  status: "Activo" | "Invitado";
};

export type TeamMemberWithStats = TeamMember & {
  active: number;
  done: number;
  overdue: number;
};

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getTeam(): Promise<TeamMemberWithStats[]> {
  const user = await requireAuth();
  if (!user) return [];

  const admin = createAdminClient();
  const [authRes, profilesRes, tasksRes, assignRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, name, role"),
    admin.from("tasks").select("id, state, due_date"),
    admin.from("task_assignees").select("task_id, user_id"),
  ]);

  const authUsers = authRes.data?.users ?? [];
  const profiles = profilesRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const assignments = assignRes.data ?? [];

  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
  const taskMap = new Map(tasks.map((t: any) => [t.id, t]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Aggregate task stats per user
  const statsByUser = new Map<string, { active: number; done: number; overdue: number }>();
  for (const a of assignments) {
    const t: any = taskMap.get(a.task_id);
    if (!t) continue;
    const s = statsByUser.get(a.user_id) ?? { active: 0, done: 0, overdue: 0 };
    if (t.state === "done") {
      s.done++;
    } else {
      s.active++;
      if (t.due_date && new Date(t.due_date + "T00:00:00") < today) s.overdue++;
    }
    statsByUser.set(a.user_id, s);
  }

  return authUsers.map((u) => {
    const p: any = profileMap.get(u.id);
    const stats = statsByUser.get(u.id) ?? { active: 0, done: 0, overdue: 0 };
    return {
      id: u.id,
      name: (p?.name as string) ?? (u.user_metadata?.name as string) ?? (u.email?.split("@")[0] ?? "—"),
      email: u.email ?? "",
      department: (u.user_metadata?.department as string) ?? null,
      role: ((p?.role as string) ?? "usuario") as "admin" | "usuario",
      status: u.last_sign_in_at ? "Activo" : "Invitado",
      ...stats,
    };
  });
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const user = await requireAuth();
  if (!user) return null;

  const admin = createAdminClient();
  const [authRes, profRes] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from("profiles").select("name, role").eq("id", id).single(),
  ]);

  const u = authRes.data?.user;
  if (!u) return null;
  const p: any = profRes.data;

  return {
    id: u.id,
    name: (p?.name as string) ?? (u.user_metadata?.name as string) ?? (u.email?.split("@")[0] ?? "—"),
    email: u.email ?? "",
    department: (u.user_metadata?.department as string) ?? null,
    role: ((p?.role as string) ?? "usuario") as "admin" | "usuario",
    status: u.last_sign_in_at ? "Activo" : "Invitado",
  };
}

function formatDue(date: string | null): string {
  if (!date) return "Sin fecha";
  const d = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  if (diff === 0) return "Hoy";
  if (diff === 86400000) return "Mañana";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export async function getTasksAssignedTo(userId: string): Promise<Task[]> {
  const user = await requireAuth();
  if (!user) return [];

  // Usa admin client para dar visibilidad al equipo (similar a getTeam).
  const admin = createAdminClient();

  const { data: assignments } = await admin
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", userId);
  const ids = assignments?.map((a: any) => a.task_id) ?? [];
  if (ids.length === 0) return [];

  const { data } = await admin
    .from("tasks")
    .select(`
      id, title, description, state, priority, tag, due_date, created_at,
      task_assignees(user_id, profiles(name)),
      comments(count),
      files(count)
    `)
    .in("id", ids)
    .order("due_date", { ascending: true, nullsFirst: false });

  return (data ?? []).map((t: any) => ({
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
  }));
}
