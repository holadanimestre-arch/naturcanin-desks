"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type Level = "error" | "warn" | "info";

export async function logError(
  message: string,
  opts?: { context?: Record<string, unknown>; path?: string; userId?: string; level?: Level }
) {
  try {
    const admin = createAdminClient();
    await admin.from("app_logs").insert({
      level: opts?.level ?? "error",
      message,
      context: opts?.context ?? null,
      user_id: opts?.userId ?? null,
      path: opts?.path ?? null,
    });
  } catch {
    // no-op: logging must never crash the caller
  }
}
