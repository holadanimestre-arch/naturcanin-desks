import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Level = "error" | "warn" | "info";

const LEVEL_COLORS: Record<Level, { bg: string; color: string; label: string }> = {
  error: { bg: "#fef2f2", color: "#dc2626", label: "Error" },
  warn:  { bg: "#fffbeb", color: "#d97706", label: "Aviso" },
  info:  { bg: "var(--nc-green-soft)", color: "var(--nc-green-dark)", label: "Info" },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d}d`;
  return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { level: levelFilter } = await searchParams;

  const admin = createAdminClient();
  let query = admin
    .from("app_logs")
    .select("id, level, message, context, path, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (levelFilter && ["error", "warn", "info"].includes(levelFilter)) {
    query = query.eq("level", levelFilter);
  }

  const { data: logs } = await query;
  const rows = (logs ?? []) as Array<{
    id: number;
    level: Level;
    message: string;
    context: Record<string, unknown> | null;
    path: string | null;
    created_at: string;
    user_id: string | null;
  }>;

  const counts = { error: 0, warn: 0, info: 0 };
  for (const r of rows) counts[r.level] = (counts[r.level] ?? 0) + 1;

  return (
    <div className="nc-app-shell">
      <Sidebar active="logs" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Logs del sistema" subtitle="Solo admin" showAdd={false} />
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Filtros de nivel */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {(["all", "error", "warn", "info"] as const).map((l) => {
              const active = (l === "all" && !levelFilter) || l === levelFilter;
              const cfg = l !== "all" ? LEVEL_COLORS[l] : null;
              return (
                <a
                  key={l}
                  href={l === "all" ? "/logs" : `/logs?level=${l}`}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    textDecoration: "none",
                    border: "1px solid " + (active ? (cfg?.color ?? "var(--nc-green)") : "var(--nc-line)"),
                    background: active ? (cfg?.bg ?? "var(--nc-green-soft)") : "var(--nc-surface)",
                    color: active ? (cfg?.color ?? "var(--nc-green-dark)") : "var(--nc-text)",
                  }}
                >
                  {l === "all"
                    ? `Todos (${rows.length})`
                    : `${LEVEL_COLORS[l].label} (${counts[l]})`}
                </a>
              );
            })}
          </div>

          {/* Tabla */}
          {rows.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--nc-mute)", fontSize: 13, paddingTop: 60 }}>
              No hay registros{levelFilter ? ` de nivel "${levelFilter}"` : ""}.
            </div>
          ) : (
            <div
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
              }}
            >
              {rows.map((row, i) => {
                const cfg = LEVEL_COLORS[row.level];
                return (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 1fr auto",
                      gap: "0 12px",
                      padding: "10px 16px",
                      alignItems: "start",
                      borderTop: i === 0 ? "none" : "1px solid var(--nc-line-2)",
                    }}
                  >
                    {/* Nivel */}
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: cfg.bg,
                          color: cfg.color,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    {/* Mensaje + contexto */}
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2 }}>
                        {row.message}
                      </div>
                      {row.path && (
                        <div style={{ fontSize: 10.5, color: "var(--nc-mute)", fontFamily: "ui-monospace, monospace", marginBottom: 2 }}>
                          {row.path}
                        </div>
                      )}
                      {row.context && (
                        <details style={{ marginTop: 4 }}>
                          <summary style={{ fontSize: 10.5, color: "var(--nc-mute)", cursor: "pointer", userSelect: "none" }}>
                            Ver contexto
                          </summary>
                          <pre
                            style={{
                              fontSize: 10.5,
                              background: "var(--nc-line-2)",
                              borderRadius: 4,
                              padding: "6px 8px",
                              marginTop: 4,
                              overflowX: "auto",
                              color: "var(--nc-ink)",
                              lineHeight: 1.5,
                            }}
                          >
                            {JSON.stringify(row.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{ fontSize: 10.5, color: "var(--nc-mute)", whiteSpace: "nowrap", paddingTop: 2 }}>
                      {timeAgo(row.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
