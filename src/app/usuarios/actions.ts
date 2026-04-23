"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "No autorizado" as const };
  return { user };
}

export async function inviteUser(formData: FormData) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const role = (formData.get("role") as string) || "usuario";
  const department = (formData.get("department") as string) || "";

  if (!email || !name) return { error: "Nombre y correo obligatorios" };
  if (role !== "admin" && role !== "usuario") return { error: "Rol inválido" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role, department },
  });

  if (error) {
    await logError("Error al invitar usuario", { context: { message: error.message, email }, path: "/usuarios" });
    return { error: error.message };
  }
  revalidatePath("/usuarios");
  return { success: true };
}

export async function createUserWithPassword(formData: FormData) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const password = (formData.get("password") as string) ?? "";
  const role = (formData.get("role") as string) || "usuario";
  const department = (formData.get("department") as string) || "";

  if (!email || !name) return { error: "Nombre y correo obligatorios" };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  if (role !== "admin" && role !== "usuario") return { error: "Rol inválido" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, department },
  });
  if (error || !data?.user) {
    await logError("Error al crear usuario con contraseña", { context: { message: error?.message, email }, path: "/usuarios" });
    return { error: error?.message ?? "Error al crear usuario" };
  }

  // Asegura el perfil con nombre y rol (por si el trigger no rellena todo).
  await admin.from("profiles").upsert({ id: data.user.id, name, role });

  revalidatePath("/usuarios");
  return { success: true as const, userId: data.user.id };
}

export async function updateUserProfile(
  userId: string,
  fields: { name?: string; email?: string; password?: string }
) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const admin = createAdminClient();
  const authUpdate: { email?: string; password?: string } = {};
  if (fields.email) authUpdate.email = fields.email.trim().toLowerCase();
  if (fields.password) authUpdate.password = fields.password;

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(userId, authUpdate);
    if (error) return { error: error.message };
  }

  if (fields.name) {
    const { error } = await admin
      .from("profiles")
      .update({ name: fields.name.trim() })
      .eq("id", userId);
    if (error) return { error: error.message };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function changeUserRole(userId: string, role: "admin" | "usuario") {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/usuarios");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  // No permitir auto-eliminación
  if (check.user.id === userId) return { error: "No puedes eliminarte a ti mismo" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/usuarios");
  return { success: true };
}

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "usuario";
  department: string | null;
  status: "Activo" | "Invitado";
  lastSignIn: string | null;
};

export async function getAllUsers(): Promise<UserListItem[]> {
  const check = await requireAdmin();
  if ("error" in check) return [];

  const admin = createAdminClient();

  // auth.users — emails y estado de invitación
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 200 });
  const authUsers = authData?.users ?? [];

  // profiles — nombre y rol
  const { data: profiles } = await admin.from("profiles").select("id, name, role");
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return authUsers.map((u) => {
    const p = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      name: (p?.name as string) ?? (u.user_metadata?.name as string) ?? (u.email?.split("@")[0] ?? "—"),
      role: ((p?.role as string) ?? (u.user_metadata?.role as string) ?? "usuario") as "admin" | "usuario",
      department: (u.user_metadata?.department as string) ?? null,
      status: u.last_sign_in_at ? "Activo" : "Invitado",
      lastSignIn: u.last_sign_in_at ?? null,
    };
  });
}
