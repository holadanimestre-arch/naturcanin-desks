import { createClient } from "./server";
import { createAdminClient } from "./admin";

export type Stats = {
  completedLast30: number;
  active: number;
  overdue: number;
  compliance: number; // 0-100
  weekly: { label: string; count: number }[];
  distribution: { done: number; progress: number; overdue: number; total: number };
  workload: {
    userId: string;
    name: string;
    role: string;
    department: string;
    active: number;
  }[];
};

export async function getStats(): Promise<Stats | null> {
  const regular = await createClient();
  const { data: { user } } = await regular.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d30 = new Date(today);
  d30.setDate(d30.getDate() - 30);
  const w8start = new Date(today);
  // Start of 8-week window: Monday of the week 7 weeks ago
  const dow = (today.getDay() + 6) % 7; // 0 = Mon ... 6 = Sun
  w8start.setDate(today.getDate() - dow - 7 * 7);

  const [tasksRes, activityRes, assignRes, authRes, profRes] = await Promise.all([
    admin.from("tasks").select("id, state, due_date, created_at"),
    admin
      .from("task_activity")
      .select("task_id, kind, meta, created_at")
      .eq("kind", "state_changed")
      .gte("created_at", w8start.toISOString()),
    admin.from("task_assignees").select("task_id, user_id"),
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, name, role"),
  ]);

  const tasks = (tasksRes.data ?? []) as any[];
  const activity = (activityRes.data ?? []) as any[];
  const assigns = (assignRes.data ?? []) as any[];
  const profiles = (profRes.data ?? []) as any[];
  const authUsers = authRes.data?.users ?? [];

  const isOverdue = (t: any) =>
    t.state !== "done" && t.due_date && new Date(t.due_date + "T00:00:00") < today;

  // KPIs
  const active = tasks.filter((t) => t.state !== "done").length;
  const overdue = tasks.filter(isOverdue).length;
  const completedActivity30 = activity.filter(
    (a) => a.meta?.to === "done" && new Date(a.created_at) >= d30
  );
  const completedLast30 = completedActivity30.length;

  // Compliance: completed on time vs total completed (last 30d)
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  let onTime = 0;
  for (const a of completedActivity30) {
    const t = taskMap.get(a.task_id);
    if (!t || !t.due_date) {
      onTime++;
      continue;
    }
    if (new Date(a.created_at) <= new Date(t.due_date + "T23:59:59")) onTime++;
  }
  const compliance = completedLast30 > 0 ? Math.round((onTime / completedLast30) * 100) : 100;

  // Weekly completions (8 weeks)
  const weekly: { label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(today.getDate() - dow - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = activity.filter((a) => {
      if (a.meta?.to !== "done") return false;
      const d = new Date(a.created_at);
      return d >= start && d < end;
    }).length;
    weekly.push({ label: `S${8 - i}`, count });
  }

  // Distribution (slice of current state)
  const dist = {
    done: tasks.filter((t) => t.state === "done").length,
    progress: tasks.filter((t) => t.state === "progress").length,
    overdue,
    total: 0,
  };
  dist.total = dist.done + dist.progress + dist.overdue;

  // Workload
  const activeIds = new Set(tasks.filter((t) => t.state !== "done").map((t) => t.id));
  const wl = new Map<string, number>();
  for (const a of assigns) {
    if (activeIds.has(a.task_id)) wl.set(a.user_id, (wl.get(a.user_id) ?? 0) + 1);
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const workload = authUsers
    .map((u) => {
      const p: any = profileMap.get(u.id);
      return {
        userId: u.id,
        name: (p?.name as string) ?? u.email?.split("@")[0] ?? "—",
        role: ((p?.role as string) ?? "usuario") as string,
        department: (u.user_metadata?.department as string) ?? "",
        active: wl.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => b.active - a.active);

  return {
    completedLast30,
    active,
    overdue,
    compliance,
    weekly,
    distribution: dist,
    workload,
  };
}
