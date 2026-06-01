"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getISOYear, weekStartFromDate, formatWeekRange } from "@/lib/vacation-rules";
import type { VacationAreaId } from "@/lib/vacation-rules";

// ─── Helpers de notificación ──────────────────────────────────────────────

/** Inserta notificaciones en la tabla notifications para una lista de usuarios */
async function insertNotifications(
  userIds: string[],
  text: string,
  type: string,
) {
  if (userIds.length === 0) return;
  const admin = createAdminClient();
  await admin.from("notifications").insert(
    userIds.map((uid) => ({ user_id: uid, text, type, read: false })),
  );
}

/** Devuelve los IDs de todos los admins del sistema */
async function getAdminIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  return (data ?? []).map((p: { id: string }) => p.id);
}

/** Nombre del usuario a partir de su ID (via profiles) */
async function getUserName(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single();
  return (data as { name?: string } | null)?.name ?? "Un empleado";
}

// ─── Empleado ─────────────────────────────────────────────────────────────

/** Solicitar una semana de vacaciones */
export async function requestVacation(weekStart: string, requestNotes?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Asegurar que weekStart es un lunes
  const monday = weekStartFromDate(weekStart);
  const d = new Date(monday + "T00:00:00");
  const year = getISOYear(d);

  const { error } = await supabase.from("vacation_requests").insert({
    user_id: user.id,
    week_start: monday,
    year,
    status: "pending",
    notes: requestNotes ?? null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya tienes una solicitud para esa semana" };
    return { error: error.message };
  }

  // Notificar a todos los admins
  const [adminIds, name] = await Promise.all([
    getAdminIds(),
    getUserName(user.id),
  ]);
  const weekLabel = formatWeekRange(monday);
  await insertNotifications(
    adminIds.filter((id) => id !== user.id),
    `${name} ha solicitado vacaciones — semana del ${weekLabel}`,
    "vacation_request",
  );

  revalidatePath("/vacaciones");
  return { success: true };
}

/** Cancelar una solicitud pendiente propia */
export async function cancelVacation(requestId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("vacation_requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/vacaciones");
  return { success: true };
}

// ─── Admin ────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") return null;
  return user;
}

/** Aprobar una solicitud */
export async function approveVacation(requestId: number, notes?: string) {
  const user = await requireAdmin();
  if (!user) return { error: "Sin permisos" };

  const admin = createAdminClient();

  // Obtener la solicitud antes de actualizar para saber a quién notificar
  const { data: req } = await admin
    .from("vacation_requests")
    .select("user_id, week_start")
    .eq("id", requestId)
    .single();

  const { error } = await admin
    .from("vacation_requests")
    .update({
      status: "approved",
      notes: notes ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  // Notificar al empleado
  if (req) {
    const weekLabel = formatWeekRange((req as { week_start: string }).week_start);
    const notesText = notes ? ` — "${notes}"` : "";
    await insertNotifications(
      [(req as { user_id: string }).user_id],
      `✓ Tus vacaciones de la semana del ${weekLabel} han sido aprobadas${notesText}`,
      "vacation_approved",
    );
  }

  revalidatePath("/vacaciones");
  return { success: true };
}

/** Rechazar una solicitud */
export async function rejectVacation(requestId: number, notes?: string) {
  const user = await requireAdmin();
  if (!user) return { error: "Sin permisos" };

  const admin = createAdminClient();

  // Obtener la solicitud antes de actualizar
  const { data: req } = await admin
    .from("vacation_requests")
    .select("user_id, week_start")
    .eq("id", requestId)
    .single();

  const { error } = await admin
    .from("vacation_requests")
    .update({
      status: "rejected",
      notes: notes ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  // Notificar al empleado
  if (req) {
    const weekLabel = formatWeekRange((req as { week_start: string }).week_start);
    const notesText = notes ? ` — "${notes}"` : "";
    await insertNotifications(
      [(req as { user_id: string }).user_id],
      `✗ Tu solicitud de vacaciones (semana del ${weekLabel}) ha sido rechazada${notesText}`,
      "vacation_rejected",
    );
  }

  revalidatePath("/vacaciones");
  return { success: true };
}

/** Crear un nuevo empleado */
export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  vacation_area: VacationAreaId | null;
  vacation_conflict_extras: VacationAreaId[];
}) {
  const user = await requireAdmin();
  if (!user) return { error: "Sin permisos" };

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      name: data.name,
      ...(data.vacation_area ? { vacation_area: data.vacation_area } : {}),
      ...(data.vacation_conflict_extras.length > 0
        ? { vacation_conflict_extras: data.vacation_conflict_extras }
        : {}),
    },
  });

  if (error) {
    if (error.message.includes("already registered"))
      return { error: "Ya existe un usuario con ese email" };
    return { error: error.message };
  }

  revalidatePath("/vacaciones");
  return { success: true, userId: created.user.id };
}

/** Dar de baja (eliminar) un empleado */
export async function deleteEmployee(userId: string) {
  const user = await requireAdmin();
  if (!user) return { error: "Sin permisos" };

  // No permitir que un admin se elimine a sí mismo
  if (userId === user.id) return { error: "No puedes eliminarte a ti mismo" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/vacaciones");
  return { success: true };
}

/** Actualizar área de vacaciones y reglas extra de un empleado */
export async function updateUserVacationArea(
  userId: string,
  area: VacationAreaId | null,
  extras: VacationAreaId[],
) {
  const user = await requireAdmin();
  if (!user) return { error: "Sin permisos" };

  const admin = createAdminClient();

  // Obtener metadata actual para no sobreescribir otros campos
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const currentMeta = authUser?.user?.user_metadata ?? {};

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMeta,
      vacation_area: area ?? undefined,
      vacation_conflict_extras: extras.length > 0 ? extras : undefined,
    },
  });

  if (error) return { error: error.message };

  revalidatePath("/vacaciones");
  return { success: true };
}
