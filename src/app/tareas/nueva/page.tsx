import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { NewTaskForm } from "@/components/new-task-form";
import { createClient } from "@/lib/supabase/server";
import { getTeam } from "@/lib/supabase/team";

export default async function NewTaskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const team = await getTeam();
  const teamPicks = team.map((m) => ({
    id: m.id,
    name: m.name,
    department: m.department,
  }));

  const me = {
    id: user.id,
    name: profile?.name ?? user.email?.split("@")[0] ?? "Tú",
  };

  return (
    <div className="nc-app-shell" style={{ position: "relative" }}>
      <Sidebar active="board" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Tablero general" subtitle="Nueva tarea" />
      </div>
      <NewTaskForm team={teamPicks} me={me} />
    </div>
  );
}
