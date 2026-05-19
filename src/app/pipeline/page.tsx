export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { SidebarServer as Sidebar } from "@/components/sidebar-server";
import { createClient } from "@/lib/supabase/server";
import { PipelineListClient } from "@/components/pipeline-list-client";

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="nc-app-shell">
      <Sidebar active="pipeline" />
      <PipelineListClient
        meId={user.id}
        initialPipelines={(pipelines ?? []) as { id: string; name: string; created_at: string }[]}
      />
    </div>
  );
}
