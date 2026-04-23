import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Avatar } from "@/components/primitives";
import { getTeam } from "@/lib/supabase/team";

export default async function TeamPage() {
  const team = await getTeam();

  return (
    <div className="nc-app-shell">
      <Sidebar active="team" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Equipo" subtitle={`${team.length} persona${team.length !== 1 ? "s" : ""}`} showAdd={false} />
        <div style={{ flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)" }}>

          {team.length === 0 ? (
            <div
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: "var(--r-lg)",
                padding: "48px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sin miembros en el equipo</div>
              <div style={{ fontSize: 12, color: "var(--nc-mute)" }}>
                Da de alta personas desde <Link href="/usuarios" style={{ color: "var(--nc-green-dark)" }}>Usuarios</Link>.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {team.map((m) => (
                <Link
                  key={m.id}
                  href={`/equipo/${m.id}`}
                  className="nc-card-hover"
                  style={{
                    background: "var(--nc-surface)",
                    border: "1px solid var(--nc-line)",
                    borderRadius: "var(--r-lg)",
                    padding: 16,
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <Avatar id={m.id} name={m.name} size="xl" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.name}
                        </div>
                        {m.role === "admin" && (
                          <span
                            style={{
                              fontSize: 9, fontWeight: 700, color: "var(--nc-green-dark)",
                              background: "var(--nc-green-soft)", padding: "1px 5px", borderRadius: 3,
                            }}
                          >
                            ★ ADMIN
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11, color: "var(--nc-mute)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {m.department || "Sin departamento"}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5, color: "var(--nc-mute)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {m.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, fontSize: 11, paddingTop: 10, borderTop: "1px solid var(--nc-line-2)" }}>
                    <div>
                      <b style={{ fontWeight: 700, fontSize: 13 }}>{m.active}</b>{" "}
                      <span style={{ color: "var(--nc-mute)" }}>activas</span>
                    </div>
                    <div>
                      <b style={{ fontWeight: 700, fontSize: 13 }}>{m.done}</b>{" "}
                      <span style={{ color: "var(--nc-mute)" }}>hechas</span>
                    </div>
                    {m.overdue > 0 && (
                      <div>
                        <b style={{ fontWeight: 700, fontSize: 13, color: "var(--nc-danger)" }}>{m.overdue}</b>{" "}
                        <span style={{ color: "var(--nc-mute)" }}>vencida{m.overdue !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                    {m.status === "Invitado" && (
                      <div style={{ marginLeft: "auto", color: "var(--nc-ink)", fontSize: 10, fontWeight: 600, background: "var(--nc-yellow-soft)", padding: "2px 6px", borderRadius: 999 }}>
                        Invitado
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
