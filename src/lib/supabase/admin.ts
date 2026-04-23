import { createClient } from "@supabase/supabase-js";

// Service-role client — NUNCA exponer al cliente. Solo usar en Server Actions / Route Handlers.
// Bypassa RLS y puede gestionar auth.users.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
