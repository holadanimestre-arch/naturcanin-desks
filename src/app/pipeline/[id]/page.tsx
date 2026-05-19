export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { SidebarServer as Sidebar } from "@/components/sidebar-server";
import { PipelineBoard } from "@/components/pipeline-board";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PipelineBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch pipeline (RLS ensures owner access)
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .select("id, name, owner_id")
    .eq("id", id)
    .single();

  if (pipelineError || !pipeline) notFound();

  // Fetch columns and cards in parallel
  const [columnsRes, cardsRes] = await Promise.all([
    supabase
      .from("pipeline_columns")
      .select("id, name, color, position")
      .eq("pipeline_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("pipeline_cards")
      .select("id, column_id, pipeline_id, title, notes, position, created_at")
      .eq("pipeline_id", id)
      .order("position", { ascending: true }),
  ]);

  // Fetch team member names (for comments/activity attribution)
  const admin = createAdminClient();
  const [profilesRes] = await Promise.all([
    admin.from("profiles").select("id, name"),
  ]);
  const profiles = (profilesRes.data ?? []) as { id: string; name: string }[];
  const teamNames: Record<string, string> = {};
  for (const p of profiles) {
    teamNames[p.id] = p.name;
  }

  // Resolve current user's display name
  const myProfile = profiles.find((p) => p.id === user.id);
  const myName =
    myProfile?.name ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Yo";

  return (
    <div className="nc-app-shell">
      <Sidebar active="pipeline" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--nc-line)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--nc-surface)",
            flexShrink: 0,
          }}
        >
          <a
            href="/pipeline"
            style={{
              fontSize: 12,
              color: "var(--nc-mute)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ← Pipelines
          </a>
          <span style={{ color: "var(--nc-line)" }}>|</span>
          <h1
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--nc-ink)",
            }}
          >
            {pipeline.name}
          </h1>
        </div>

        {/* Board */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <PipelineBoard
            pipelineId={id}
            pipelineName={pipeline.name}
            me={{ id: user.id, name: myName }}
            initialColumns={(columnsRes.data ?? []) as any[]}
            initialCards={(cardsRes.data ?? []) as any[]}
            teamNames={teamNames}
          />
        </div>
      </div>
    </div>
  );
}
