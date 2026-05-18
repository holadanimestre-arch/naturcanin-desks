import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";
import type { SidebarKey } from "./sidebar";

export async function SidebarServer({
  active,
  compact,
}: {
  active?: SidebarKey;
  compact?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = data?.role === "admin";
  }

  return <Sidebar active={active} compact={compact} isAdmin={isAdmin} />;
}
