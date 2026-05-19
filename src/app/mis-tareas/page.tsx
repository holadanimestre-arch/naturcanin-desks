import { SidebarServer as Sidebar } from "@/components/sidebar-server";
import { MyTasksClient } from "@/components/my-tasks-client";
import { getMyTasks } from "@/lib/supabase/queries";

export default async function MyTasksPage() {
  const tasks = await getMyTasks();

  return (
    <div className="nc-app-shell">
      <Sidebar active="my" />
      <MyTasksClient tasks={tasks} />
    </div>
  );
}
