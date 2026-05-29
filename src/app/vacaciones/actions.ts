"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getISOWeek, getISOYear, weekStartFromDate } from "@/lib/vacation-rules";
import type { VacationAreaId } from "@/lib/vacation-rules";

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

  revalidatePath("/vacaciones");
  return { success: true };
}

/** Rechazar una solicitud */
export async function rejectVacation(requestId: number, notes?: string) {
  const user = await requireAdmin();
  if (!user) return { error: "Sin permisos" };

  const admin = createAdminClient();
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
