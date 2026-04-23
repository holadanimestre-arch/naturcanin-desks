import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Avatar } from "@/components/primitives";
import { InviteUserForm } from "@/components/invite-user-form";
import { UserRowActions } from "@/components/user-row-actions";
import { createClient } from "@/lib/supabase/server";
import { getAllUsers } from "./actions";

function timeAgo(ts: string | null): string {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default async function UsersPage() {
  // Verificar admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="nc-app-shell">
        <Sidebar active="users" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar title="Usuarios" />
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sin acceso</div>
            <div style={{ fontSize: 12, color: "var(--nc-mute)" }}>
              Solo los administradores pueden gestionar usuarios.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const users = await getAllUsers();

  return (
    <div className="nc-app-shell">
      <Sidebar active="users" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          title="Usuarios"
          subtitle={`Solo admin · ${users.length} persona${users.length !== 1 ? "s" : ""}`}
          showAdd={false}
        />
        <div
          style={{
            flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)",
            display: "grid", gridTemplateColumns: "1fr 340px", gap: 14,
          }}
        >
          {/* LEFT: user list */}
          <div
            style={{
              background: "var(--nc-surface)",
              border: "1px solid var(--nc-line)",
              borderRadius: "var(--r-lg)",
              overflow: "hidden",
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 0.7fr 0.8fr 0.3fr",
                gap: 10,
                padding: "10px 14px",
                borderBottom: "1px solid var(--nc-line)",
                background: "var(--nc-line-2)",
                fontSize: 10, fontWeight: 600,
                color: "var(--nc-mute)",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              <div>Persona</div>
              <div>Correo</div>
              <div>Rol</div>
              <div>Estado</div>
              <div />
            </div>
            {users.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 0.7fr 0.8fr 0.3fr",
                  gap: 10,
                  padding: "12px 14px",
                  borderTop: i === 0 ? "none" : "1px solid var(--nc-line-2)",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Avatar id={u.id} name={u.name} size="lg" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.name}
                      {u.id === user.id && (
                        <span style={{ fontSize: 10, color: "var(--nc-mute)", fontWeight: 500, marginLeft: 6 }}>
                          (tú)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>
                      {u.department || "—"} · Últ. acceso {timeAgo(u.lastSignIn)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--nc-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.email}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 10.5, fontWeight: 600,
                      padding: "3px 8px", borderRadius: 999,
                      background: u.role === "admin" ? "var(--nc-green-soft)" : "var(--nc-line-2)",
                      color: u.role === "admin" ? "var(--nc-green-dark)" : "var(--nc-text)",
                    }}
                  >
                    {u.role === "admin" ? "★ Admin" : "Usuario"}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: "3px 8px", borderRadius: 999,
                      background: u.status === "Activo" ? "var(--nc-green-soft)" : "var(--nc-yellow-soft)",
                      color: u.status === "Activo" ? "var(--nc-green-dark)" : "var(--nc-ink)",
                    }}
                  >
                    {u.status}
                  </span>
                </div>
                <UserRowActions
                  userId={u.id}
                  userName={u.name}
                  currentRole={u.role}
                  isSelf={u.id === user.id}
                />
              </div>
            ))}
          </div>

          {/* RIGHT: invite form */}
          <InviteUserForm />
        </div>
      </div>
    </div>
  );
}
