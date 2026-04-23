import Link from "next/link";
import { IChev } from "./icons";
import type { Task } from "@/lib/data";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function buildGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (firstDay.getDay() + 6) % 7;

  const grid: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

function prioColor(p: string): string {
  if (p === "high") return "var(--pr-high)";
  if (p === "low") return "var(--pr-low)";
  return "var(--pr-med)";
}

export function BoardCalendarView({
  tasks,
  year,
  month,
}: {
  tasks: Task[];
  year: number;
  month: number;
}) {
  const grid = buildGrid(year, month);

  const mm = String(month).padStart(2, "0");
  const tasksByDay = new Map<number, Task[]>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const [y, m, d] = t.dueDate.split("-");
    if (Number(y) !== year || m !== mm) continue;
    const day = Number(d);
    if (!tasksByDay.has(day)) tasksByDay.set(day, []);
    tasksByDay.get(day)!.push(t);
  }

  const withDate = Array.from(tasksByDay.values()).reduce((n, l) => n + l.length, 0);

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const now = new Date();
  const todayIsThisMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = todayIsThisMonth ? now.getDate() : -1;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "var(--nc-bg)" }}>
      <div
        style={{
          padding: "10px 18px",
          borderBottom: "1px solid var(--nc-line)",
          background: "var(--nc-surface)",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        <Link
          href={`/tablero?view=calendario&y=${prevMonth.y}&m=${prevMonth.m}`}
          className="nc-icon-btn"
          aria-label="Mes anterior"
        >
          <IChev dir="left" size={13} />
        </Link>
        <div style={{ fontSize: 13, fontWeight: 600, minWidth: 140 }}>
          {MONTHS[month - 1]} {year}
        </div>
        <Link
          href={`/tablero?view=calendario&y=${nextMonth.y}&m=${nextMonth.m}`}
          className="nc-icon-btn"
          aria-label="Mes siguiente"
        >
          <IChev dir="right" size={13} />
        </Link>
        <Link
          href="/tablero?view=calendario"
          className="nc-btn secondary"
          style={{ fontSize: 11, padding: "4px 9px", marginLeft: 6 }}
        >
          Hoy
        </Link>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: "var(--nc-mute)" }}>
          {withDate} tarea{withDate !== 1 ? "s" : ""} con fecha este mes
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateRows: "auto 1fr", minHeight: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            background: "var(--nc-surface)",
            borderBottom: "1px solid var(--nc-line)",
          }}
        >
          {DAYS.map((d) => (
            <div
              key={d}
              style={{
                padding: "6px 8px",
                fontSize: 10.5,
                color: "var(--nc-mute)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gridTemplateRows: `repeat(${grid.length}, 1fr)`,
            minHeight: 0,
          }}
        >
          {grid.flat().map((d, i) => {
            const evs = d ? tasksByDay.get(d) ?? [] : [];
            const isToday = d === todayDay;
            return (
              <div
                key={i}
                style={{
                  borderRight: "1px solid var(--nc-line-2)",
                  borderBottom: "1px solid var(--nc-line-2)",
                  padding: 6,
                  background: d ? "var(--nc-surface)" : "var(--nc-bg)",
                  minHeight: 60,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  overflow: "hidden",
                }}
              >
                {d && (
                  <div
                    style={{
                      fontSize: 11,
                      color: isToday ? "white" : "var(--nc-ink)",
                      fontWeight: isToday ? 600 : 500,
                      width: 20, height: 20, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isToday ? "var(--nc-green)" : "transparent",
                      flexShrink: 0,
                    }}
                  >
                    {d}
                  </div>
                )}
                {evs.slice(0, 4).map((e) => {
                  const c = prioColor(e.prio);
                  return (
                    <Link
                      key={e.id}
                      href={`/tareas/${e.id}`}
                      style={{
                        fontSize: 9.5,
                        padding: "1px 5px",
                        borderRadius: 2,
                        background: `color-mix(in oklab, ${c} 20%, transparent)`,
                        color: c,
                        fontWeight: 500,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        textDecoration: "none",
                      }}
                      title={e.title}
                    >
                      ● {e.title}
                    </Link>
                  );
                })}
                {evs.length > 4 && (
                  <div style={{ fontSize: 9, color: "var(--nc-mute)", paddingLeft: 5 }}>
                    +{evs.length - 4} más
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
