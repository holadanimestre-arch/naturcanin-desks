import { createClient } from "./server";
import { createAdminClient } from "./admin";
import type { VacationAreaId } from "@/lib/vacation-rules";

export type VacationRequest = {
  id: number;
  user_id: string;
  week_start: string;
  year: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Enriquecido en servidor
  user_name?: string;
  vacation_area?: VacationAreaId | null;
  vacation_conflict_extras?: VacationAreaId[];
};

export type UserWithVacationInfo = {
  id: string;
  name: string;
  email: string;
  vacation_area: VacationAreaId | null;
  vacation_conflict_extras: VacationAreaId[];
  is_admin: boolean;
};

// ─── Queries ───────────────────────────────────────────────────────────────

/** Solicitudes del usuario actual para un año dado */
export async function getMyVacationRequests(year: number): Promise<VacationRequest[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("vacation_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("year", year)
    .order("week_start", { ascending: true });

  return (data ?? []) as VacationRequest[];
}

/** Todas las solicitudes de todos los usuarios para un año (solo para admins) */
export async function getAllVacationRequests(year: number): Promise<VacationRequest[]> {
  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("vacation_requests")
    .select("*")
    .eq("year", year)
    .order("created_at", { ascending: false });

  if (!requests?.length) return [];

  const users = await getUsersWithVacationInfo();
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (requests as any[]).map((r) => {
    const u = userMap.get(r.user_id);
    return {
      ...r,
      user_name: u?.name ?? "?",
      vacation_area: u?.vacation_area ?? null,
      vacation_conflict_extras: u?.vacation_conflict_extras ?? [],
    } as VacationRequest;
  });
}

/** Solicitudes de todos los usuarios (para el empleado — solo las aprobadas, para ver conflictos) */
export async function getAllApprovedForYear(year: number): Promise<VacationRequest[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("vacation_requests")
    .select("id, user_id, week_start, year, status, created_at")
    .eq("year", year)
    .neq("status", "rejected")
    .order("week_start", { ascending: true });

  return (data ?? []) as VacationRequest[];
}

/** Lista de usuarios con su configuración de vacaciones */
export async function getUsersWithVacationInfo(): Promise<UserWithVacationInfo[]> {
  const admin = createAdminClient();

  const [authRes, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, name, role"),
  ]);

  const profiles = (profilesRes.data ?? []) as { id: string; name: string; role: string }[];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return (authRes.data?.users ?? [])
    .filter((u) => {
      const meta = u.user_metadata ?? {};
      // Solo incluir usuarios con área de vacaciones asignada (empleados del sistema)
      return !!meta.vacation_area;
    })
    .map((u) => {
      const meta = u.user_metadata ?? {};
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        name: profile?.name ?? (meta.name as string) ?? u.email?.split("@")[0] ?? "?",
        email: u.email ?? "",
        vacation_area: (meta.vacation_area as VacationAreaId) ?? null,
        vacation_conflict_extras: (meta.vacation_conflict_extras as VacationAreaId[]) ?? [],
        is_admin: profile?.role === "admin",
      };
    });
}

/** Todos los usuarios del sistema (incluyendo los sin área asignada) — para el panel de gestión */
export async function getAllUsersForManagement(): Promise<UserWithVacationInfo[]> {
  const admin = createAdminClient();

  const [authRes, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, name, role"),
  ]);

  const profiles = (profilesRes.data ?? []) as { id: string; name: string; role: string }[];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return (authRes.data?.users ?? [])
    .filter((u) => {
      // Excluir cuentas que no son empleados de Naturcanin
      const meta = u.user_metadata ?? {};
      const email = u.email ?? "";
      // Incluir si tiene vacation_area O si es un email @naturcanin.com O si tiene nombre en metadata
      return (
        !!meta.vacation_area ||
        email.endsWith("@naturcanin.com") ||
        (!!meta.name && !email.includes("danimestre") && !email.includes("alamopartners"))
      );
    })
    .map((u) => {
      const meta = u.user_metadata ?? {};
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        name: profile?.name ?? (meta.name as string) ?? u.email?.split("@")[0] ?? "?",
        email: u.email ?? "",
        vacation_area: (meta.vacation_area as VacationAreaId) ?? null,
        vacation_conflict_extras: (meta.vacation_conflict_extras as VacationAreaId[]) ?? [],
        is_admin: profile?.role === "admin",
      };
    })
    .sort((a, b) => {
      if (a.vacation_area && !b.vacation_area) return -1;
      if (!a.vacation_area && b.vacation_area) return 1;
      return a.name.localeCompare(b.name, "es");
    });
}
