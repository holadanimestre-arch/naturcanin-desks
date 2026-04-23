import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Avatar } from "@/components/primitives";
import { getStats } from "@/lib/supabase/stats";

export default async function StatsPage() {
  const stats = await getStats();
  if (!stats) {
    return (
      <div className="nc-app-shell">
        <Sidebar active="stats" />
        <div style={{ flex: 1, padding: 40 }}>Sin sesión.</div>
      </div>
    );
  }

  const { completedLast30, active, overdue, compliance, weekly, distribution: dist, workload } = stats;

  const kpis = [
    { n: String(completedLast30), l: "Completadas (30d)", c: "var(--nc-green)" },
    { n: String(active),          l: "Activas",           c: "var(--nc-yellow)" },
    { n: String(overdue),         l: "Vencidas",          c: "var(--nc-danger)" },
    { n: `${compliance}%`,        l: "Cumplimiento",      c: "var(--nc-green-dark)" },
  ];

  const maxWeekly = Math.max(1, ...weekly.map((w) => w.count));
  const barArea = 120;

  // Donut calcs (SVG arc dasharray on perimeter ≈ 100)
  const total = dist.total || 1;
  const pctDone = (dist.done / total) * 100;
  const pctProg = (dist.progress / total) * 100;
  const pctOver = (dist.overdue / total) * 100;

  return (
    <div className="nc-app-shell">
      <Sidebar active="stats" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title="Estadísticas" subtitle="Resumen en tiempo real · últimos 30 días" showAdd={false} />
        <div style={{ flex: 1, overflow: "auto", padding: 18, background: "var(--nc-bg)" }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
            {kpis.map((k) => (
              <div
                key={k.l}
                style={{
                  background: "var(--nc-surface)",
                  border: "1px solid var(--nc-line)",
                  borderRadius: "var(--r-lg)",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: "var(--nc-mute)" }}>{k.l}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: k.c, letterSpacing: "-0.02em" }}>
                    {k.n}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart + Donut */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* Weekly bar chart */}
            <div
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: "var(--r-lg)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                Tareas completadas por semana
              </div>
              <div style={{ height: 140, display: "flex", alignItems: "flex-end", gap: 10, padding: "6px 0" }}>
                {weekly.map((w, i) => {
                  const h = w.count === 0 ? 0 : Math.max(2, (w.count / maxWeekly) * barArea);
                  const isCurrent = i === weekly.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div
                        title={`${w.count} completada${w.count !== 1 ? "s" : ""}`}
                        style={{
                          width: "100%",
                          background: isCurrent ? "var(--nc-green)" : "var(--nc-green-soft)",
                          height: h,
                          borderRadius: "4px 4px 0 0",
                        }}
                      />
                      <div style={{ fontSize: 9.5, color: "var(--nc-mute)" }}>{w.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Donut chart */}
            <div
              style={{
                background: "var(--nc-surface)",
                border: "1px solid var(--nc-line)",
                borderRadius: "var(--r-lg)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Distribución</div>
              <svg viewBox="0 0 42 42" width="120" height="120" style={{ display: "block", margin: "6px auto" }}>
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--nc-line-2)" strokeWidth="6" />
                <DonutSlice color="var(--nc-green)"  pct={pctDone} offset={0} />
                <DonutSlice color="var(--nc-yellow)" pct={pctProg} offset={pctDone} />
                <DonutSlice color="var(--pr-high)"   pct={pctOver} offset={pctDone + pctProg} />
              </svg>
              <div style={{ fontSize: 11 }}>
                {[
                  { c: "var(--nc-green)",  l: "Completadas", v: pctDone, n: dist.done },
                  { c: "var(--nc-yellow)", l: "En curso",    v: pctProg, n: dist.progress },
                  { c: "var(--pr-high)",   l: "Vencidas",    v: pctOver, n: dist.overdue },
                ].map((r) => (
                  <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: r.c }} />
                    <span style={{ color: "var(--nc-text)" }}>{r.l}</span>
                    <span style={{ marginLeft: "auto", color: "var(--nc-mute)", fontSize: 10 }}>
                      {r.n}
                    </span>
                    <span style={{ color: "var(--nc-ink)", fontWeight: 500, minWidth: 36, textAlign: "right" }}>
                      {Math.round(r.v)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workload */}
          <div
            style={{
              background: "var(--nc-surface)",
              border: "1px solid var(--nc-line)",
              borderRadius: "var(--r-lg)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Carga por persona</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>tareas activas</div>
            </div>

            {workload.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--nc-mute)", padding: "12px 0" }}>
                Sin personas registradas
              </div>
            ) : (
              (() => {
                const maxLoad = Math.max(1, ...workload.map((w) => w.active));
                return workload.map((w, i) => {
                  const pct = (w.active / maxLoad) * 100;
                  const color =
                    pct > 70 ? "var(--pr-high)" : pct > 40 ? "var(--nc-yellow)" : "var(--nc-green)";
                  return (
                    <div
                      key={w.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 0",
                        borderTop: i === 0 ? "none" : "1px solid var(--nc-line-2)",
                      }}
                    >
                      <Avatar id={w.userId} name={w.name} />
                      <div style={{ width: 140, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {w.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--nc-mute)", width: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {w.department || "—"}
                      </div>
                      <div style={{ flex: 1, height: 6, background: "var(--nc-line-2)", borderRadius: 3, minWidth: 80 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, width: 54, textAlign: "right" }}>
                        {w.active} <span style={{ color: "var(--nc-mute)", fontWeight: 400 }}>act.</span>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function DonutSlice({ color, pct, offset }: { color: string; pct: number; offset: number }) {
  if (pct <= 0) return null;
  return (
    <circle
      cx="21" cy="21" r="15.9"
      fill="none" stroke={color} strokeWidth="6"
      strokeDasharray={`${pct.toFixed(2)} 100`}
      strokeDashoffset={(25 - offset).toFixed(2)}
      transform="rotate(-90 21 21)"
    />
  );
}
