import { redirect } from "next/navigation";
import { SidebarServer as Sidebar } from "@/components/sidebar-server";
import { TopBar } from "@/components/topbar";
import {
  VacationEmployeeView,
  VacationAdminView,
} from "@/components/vacation-client";
import {
  getMyVacationRequests,
  getAllVacationRequests,
  getAllApprovedForYear,
  getUsersWithVacationInfo,
  getAllUsersForManagement,
} from "@/lib/supabase/vacations";
import { createClient } from "@/lib/supabase/server";
import type { VacationAreaId, UserVacationMeta } from "@/lib/vacation-rules";

export default async function VacacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || new Date().getFullYear();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const myArea = (meta.vacation_area as VacationAreaId) ?? null;
  const myConflictExtras = (meta.vacation_conflict_extras as VacationAreaId[]) ?? [];
  const myName = (profile?.name as string) ?? (meta.name as string) ?? "Tú";

  if (isAdmin) {
    const [allRequests, allUsers] = await Promise.all([
      getAllVacationRequests(year),
      getAllUsersForManagement(),
    ]);

    return (
      <div className="nc-app-shell">
        <Sidebar active="vacaciones" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar
            title="Gestión de vacaciones"
            subtitle={`${year} · ${allRequests.filter((r) => r.status === "pending").length} pendientes`}
          />
          <VacationAdminView
            year={year}
            allRequests={allRequests}
            allUsers={allUsers}
            currentUserId={user.id}
          />
        </div>
      </div>
    );
  }

  // Vista empleado
  const [myRequests, allApproved, vacUsers] = await Promise.all([
    getMyVacationRequests(year),
    getAllApprovedForYear(year),
    getUsersWithVacationInfo(),
  ]);

  const allUsersMeta: UserVacationMeta[] = [
    // Asegurar que el usuario actual aparece aunque no tenga área asignada en la lista
    {
      id: user.id,
      name: myName,
      vacation_area: myArea,
      vacation_conflict_extras: myConflictExtras,
    },
    ...vacUsers
      .filter((u) => u.id !== user.id)
      .map((u) => ({
        id: u.id,
        name: u.name,
        vacation_area: u.vacation_area,
        vacation_conflict_extras: u.vacation_conflict_extras,
      })),
  ];

  return (
    <div className="nc-app-shell">
      <Sidebar active="vacaciones" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          title="Mis vacaciones"
          subtitle={`${myName} · ${year}`}
        />
        <VacationEmployeeView
          year={year}
          myRequests={myRequests}
          allRequests={allApproved}
          currentUserId={user.id}
          myArea={myArea}
          myConflictExtras={myConflictExtras}
          myName={myName}
          allUsers={allUsersMeta}
        />
      </div>
    </div>
  );
}
