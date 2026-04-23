"use server";

import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: number;
  text: string;
  type: string | null;
  read: boolean;
  created_at: string;
};

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notifications")
    .select("id, text, type, read, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as NotificationItem[];
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);
  if (error) return { error: error.message };
  return {};
}
