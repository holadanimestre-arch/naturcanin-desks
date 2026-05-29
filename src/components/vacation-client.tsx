"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  requestVacation,
  cancelVacation,
  approveVacation,
  rejectVacation,
  updateUserVacationArea,
  createEmployee,
  deleteEmployee,
} from "@/app/vacaciones/actions";
import {
  VACATION_AREAS,
  VACATION_AREA_LIST,
  getWeeksOfYear,
  formatWeekRange,
  detectConflicts,
  isBlackFridayRestricted,
  getISOYear,
} from "@/lib/vacation-rules";
import type { VacationAreaId, UserVacationMeta } from "@/lib/vacation-rules";
import type { VacationRequest, UserWithVacationInfo } from "@/lib/supabase/vacations";
import { ICheck, IX, IPlus, IChev } from "./icons";

// ─── Helpers ───────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  if (s === "approved") return { text: "Aprobada", color: "var(--nc-green)", bg: "var(--nc-green-soft)" };
  if (s === "rejected") return { text: "Rechazada", color: "var(--nc-danger)", bg: "#FBE8E1" };
  return { text: "Pendiente", color: "var(--nc-yellow)", bg: "var(--nc-yellow-soft)" };
}

function areaColor(area: VacationAreaId | null | undefined): string {
  if (!area) return "var(--nc-mute)";
  return VACATION_AREAS[area]?.color ?? "var(--nc-mute)";
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const colors = ["#7B9C49","#6C98C2","#E39454","#A57CC1","#48B0A0","#C15F3E","#7A8590","#627D39"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: "50%",
        background: colors[idx], color: "white",
        fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
        letterSpacing: 0,
      }}
    >
      {initials}
    </span>
  );
}

// ─── Navegador de año ─────────────────────────────────────────────────────

function YearNav({ year }: { year: number }) {
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "var(--nc-surface)", border: "1px solid var(--nc-line)",
        borderRadius: "var(--r-sm)", boxShadow: "var(--sh-1)", overflow: "hidden",
      }}
    >
      <Link
        href={`/vacaciones?year=${year - 1}`}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28,
          color: "var(--nc-text)", textDecoration: "none", fontSize: 13,
        }}
        title={String(year - 1)}
      >
        ‹
      </Link>
      <span
        style={{
          padding: "0 10px", fontSize: 12.5, fontWeight: 700,
          color: "var(--nc-ink)", borderLeft: "1px solid var(--nc-line)",
          borderRight: "1px solid var(--nc-line)", lineHeight: "28px",
        }}
      >
        {year}
      </span>
      <Link
        href={`/vacaciones?year=${year + 1}`}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28,
          color: "var(--nc-text)", textDecoration: "none", fontSize: 13,
        }}
        title={String(year + 1)}
      >
        ›
      </Link>
    </div>
  );
}

// ─── Componente principal — Vista Empleado ─────────────────────────────────

export function VacationEmployeeView({
  year,
  myRequests,
  allRequests,
  currentUserId,
  myArea,
  myConflictExtras,
  myName,
  allUsers,
}: {
  year: number;
  myRequests: VacationRequest[];
  allRequests: VacationRequest[];
  currentUserId: string;
  myArea: VacationAreaId | null;
  myConflictExtras: VacationAreaId[];
  myName: string;
  allUsers: UserVacationMeta[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const weeks = getWeeksOfYear(year);
  const requestedWeeks = new Set(myRequests.map((r) => r.week_start));
  const approvedCount = myRequests.filter((r) => r.status === "approved").length;
  const pendingCount = myRequests.filter((r) => r.status === "pending").length;

  // Semanas disponibles (no solicitadas aún)
  const availableWeeks = weeks.filter((w) => !requestedWeeks.has(w.weekStart));

  const allUsersMeta: UserVacationMeta[] = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    vacation_area: u.vacation_area,
    vacation_conflict_extras: u.vacation_conflict_extras,
  }));

  const selectedConflict =
    selectedWeek
      ? detectConflicts(currentUserId, selectedWeek, allRequests, allUsersMeta)
      : null;

  function handleRequest() {
    if (!selectedWeek) return;
    setError("");
    startTransition(async () => {
      const res = await requestVacation(selectedWeek, requestNote || undefined);
      if (res?.error) {
        setError(res.error);
      } else {
        setShowModal(false);
        setSelectedWeek("");
        setRequestNote("");
      }
    });
  }

  function handleCancel(id: number) {
    startTransition(async () => {
      await cancelVacation(id);
    });
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 760 }}>
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Aprobadas", value: approvedCount, color: "var(--nc-green)" },
          { label: "Pendientes", value: pendingCount, color: "var(--nc-yellow)" },
          { label: "Total solicitadas", value: myRequests.length, color: "var(--nc-mute)" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: "var(--r-md)",
              background: "var(--nc-surface)", border: "1px solid var(--nc-line)",
              boxShadow: "var(--sh-1)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--nc-mute)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}

        {myArea && (
          <div
            style={{
              flex: 2, padding: "12px 16px", borderRadius: "var(--r-md)",
              background: "var(--nc-surface)", border: "1px solid var(--nc-line)",
              boxShadow: "var(--sh-1)", display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: areaColor(myArea), flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--nc-ink)" }}>
                {VACATION_AREAS[myArea]?.label}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--nc-mute)", marginTop: 1 }}>Tu área</div>
            </div>
          </div>
        )}
      </div>

      {/* Header + navegador de año + botón solicitar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Mis solicitudes</h2>
          <YearNav year={year} />
        </div>
        <button className="nc-btn primary" onClick={() => setShowModal(true)}>
          <IPlus size={13} /> Solicitar semana
        </button>
      </div>

      {/* Lista de solicitudes */}
      {myRequests.length === 0 ? (
        <div
          style={{
            padding: "32px 20px", textAlign: "center",
            color: "var(--nc-mute)", fontSize: 12.5,
            background: "var(--nc-surface)", borderRadius: "var(--r-md)",
            border: "1px solid var(--nc-line)",
          }}
        >
          No tienes solicitudes de vacaciones para {year}.<br />
          <span style={{ fontSize: 11.5 }}>Pulsa &ldquo;Solicitar semana&rdquo; para añadir.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {myRequests.map((r) => {
            const s = statusLabel(r.status);
            const conflict = detectConflicts(r.user_id, r.week_start, allRequests, allUsersMeta);
            return (
              <div
                key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: "var(--r-md)",
                  background: "var(--nc-surface)", border: "1px solid var(--nc-line)",
                  boxShadow: "var(--sh-1)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {formatWeekRange(r.week_start)}
                  </div>
                  {conflict.isBlackFriday && (
                    <div style={{ fontSize: 10.5, color: "var(--nc-danger)", marginTop: 3 }}>
                      ⚠️ Semana de Black Friday — requiere aprobación especial
                    </div>
                  )}
                  {conflict.conflictingNames.length > 0 && (
                    <div style={{ fontSize: 10.5, color: "#B07020", marginTop: 3 }}>
                      ⚠️ Coincide con: {conflict.conflictingNames.join(", ")}
                    </div>
                  )}
                  {r.notes && (
                    <div style={{ fontSize: 10.5, color: "var(--nc-mute)", marginTop: 3 }}>
                      Nota: {r.notes}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    padding: "2px 9px", borderRadius: 99,
                    fontSize: 10.5, fontWeight: 600,
                    background: s.bg, color: s.color,
                  }}
                >
                  {s.text}
                </span>
                {r.status === "pending" && (
                  <button
                    className="nc-icon-btn"
                    title="Cancelar solicitud"
                    onClick={() => handleCancel(r.id)}
                    disabled={pending}
                    style={{ color: "var(--nc-danger)" }}
                  >
                    <IX size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal solicitar semana */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(28,31,26,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            style={{
              background: "var(--nc-surface)", borderRadius: "var(--r-lg)",
              padding: 24, width: "100%", maxWidth: 440,
              boxShadow: "var(--sh-2)",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>
              Solicitar semana de vacaciones
            </h3>

            <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Selecciona la semana
            </label>
            <select
              className="nc-input"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              style={{ marginBottom: 14 }}
            >
              <option value="">— Elige una semana —</option>
              {availableWeeks.map((w) => {
                const isBF = isBlackFridayRestricted(w.weekStart, year);
                const conflict = detectConflicts(currentUserId, w.weekStart, allRequests, allUsersMeta);
                const hasConflict = conflict.conflictingNames.length > 0;
                return (
                  <option key={w.weekStart} value={w.weekStart}>
                    {w.label}
                    {isBF ? " 🚫 Black Friday" : ""}
                    {hasConflict ? ` ⚠️ Conflicto` : ""}
                  </option>
                );
              })}
            </select>

            {selectedWeek && selectedConflict && (
              <>
                {selectedConflict.isBlackFriday && (
                  <div
                    style={{
                      padding: "8px 12px", borderRadius: "var(--r-sm)",
                      background: "#FBE8E1", color: "var(--nc-danger)",
                      fontSize: 11.5, marginBottom: 12,
                    }}
                  >
                    🚫 <strong>Restricción Black Friday</strong> — Esta semana está bloqueada para tu área. Solo se aprueba por causa de fuerza mayor.
                  </div>
                )}
                {selectedConflict.conflictingNames.length > 0 && (
                  <div
                    style={{
                      padding: "8px 12px", borderRadius: "var(--r-sm)",
                      background: "var(--nc-yellow-soft)", color: "#7A5200",
                      fontSize: 11.5, marginBottom: 12,
                    }}
                  >
                    ⚠️ <strong>Coincidencia detectada</strong> — {selectedConflict.conflictingNames.join(", ")} también {selectedConflict.conflictingNames.length === 1 ? "tiene" : "tienen"} vacaciones esa semana. La solicitud quedará pendiente de aprobación.
                  </div>
                )}
              </>
            )}

            <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Nota (opcional)
            </label>
            <textarea
              className="nc-input"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Motivo o comentario para el aprobador…"
              rows={3}
              style={{ resize: "vertical", marginBottom: 16 }}
            />

            {error && (
              <div style={{ color: "var(--nc-danger)", fontSize: 11.5, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="nc-btn secondary"
                onClick={() => { setShowModal(false); setError(""); }}
              >
                Cancelar
              </button>
              <button
                className="nc-btn primary"
                onClick={handleRequest}
                disabled={!selectedWeek || pending}
              >
                {pending ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vista Admin ───────────────────────────────────────────────────────────

export function VacationAdminView({
  year,
  allRequests,
  allUsers,
  currentUserId,
}: {
  year: number;
  allRequests: VacationRequest[];
  allUsers: UserWithVacationInfo[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"pending" | "calendar" | "employees">("pending");
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<number, string>>({});

  const allUsersMeta: UserVacationMeta[] = allUsers.map((u) => ({
    id: u.id, name: u.name,
    vacation_area: u.vacation_area,
    vacation_conflict_extras: u.vacation_conflict_extras,
  }));

  const pendingRequests = allRequests.filter((r) => r.status === "pending");
  const approvedRequests = allRequests.filter((r) => r.status === "approved");

  function handleApprove(id: number) {
    startTransition(async () => {
      await approveVacation(id, notes[id]);
    });
  }

  function handleReject(id: number) {
    startTransition(async () => {
      await rejectVacation(id, notes[id]);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 0, padding: "0 24px",
          borderBottom: "1px solid var(--nc-line)",
          background: "var(--nc-surface)",
        }}
      >
        {(["pending", "calendar", "employees"] as const).map((t) => {
          const labels: Record<string, string> = {
            pending: `Pendientes${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}`,
            calendar: "Calendario",
            employees: "Empleados",
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "12px 16px", fontSize: 12.5, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "var(--nc-green-dark)" : "var(--nc-text)",
                borderBottom: tab === t ? "2px solid var(--nc-green)" : "2px solid transparent",
                background: "none",
                transition: "color 120ms",
              }}
            >
              {labels[t]}
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", paddingRight: 4 }}>
          <YearNav year={year} />
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
        {/* ── Tab: Pendientes ── */}
        {tab === "pending" && (
          <div style={{ maxWidth: 760 }}>
            {pendingRequests.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px", textAlign: "center",
                  color: "var(--nc-mute)", fontSize: 12.5,
                  background: "var(--nc-surface)", borderRadius: "var(--r-md)",
                  border: "1px solid var(--nc-line)",
                }}
              >
                ✓ No hay solicitudes pendientes
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pendingRequests.map((r) => {
                  const conflict = detectConflicts(r.user_id, r.week_start, allRequests, allUsersMeta);
                  const hasConflict = conflict.conflictingNames.length > 0;
                  const isBF = conflict.isBlackFriday;

                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: "14px 16px", borderRadius: "var(--r-md)",
                        background: "var(--nc-surface)", border: `1px solid ${hasConflict || isBF ? "#E8C87A" : "var(--nc-line)"}`,
                        boxShadow: "var(--sh-1)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <Avatar name={r.user_name ?? "?"} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{r.user_name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--nc-mute)" }}>
                            {r.vacation_area ? VACATION_AREAS[r.vacation_area]?.label : "Sin área"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                            {formatWeekRange(r.week_start)}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>
                            {new Date(r.created_at).toLocaleDateString("es-ES")}
                          </div>
                        </div>
                      </div>

                      {/* Alertas */}
                      {isBF && (
                        <div style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", background: "#FBE8E1", color: "var(--nc-danger)", fontSize: 11, marginBottom: 8 }}>
                          🚫 Semana de Black Friday — área restringida
                        </div>
                      )}
                      {hasConflict && (
                        <div style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", background: "var(--nc-yellow-soft)", color: "#7A5200", fontSize: 11, marginBottom: 8 }}>
                          ⚠️ Coincide con: <strong>{conflict.conflictingNames.join(", ")}</strong>
                        </div>
                      )}
                      {r.notes && (
                        <div style={{ fontSize: 11, color: "var(--nc-text)", marginBottom: 8, fontStyle: "italic" }}>
                          &ldquo;{r.notes}&rdquo;
                        </div>
                      )}

                      {/* Notas + botones */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          className="nc-input"
                          placeholder="Nota (opcional)…"
                          value={notes[r.id] ?? ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                          style={{ flex: 1, fontSize: 11.5 }}
                        />
                        <button
                          className="nc-btn secondary"
                          style={{ color: "var(--nc-danger)", borderColor: "var(--nc-danger)" }}
                          onClick={() => handleReject(r.id)}
                          disabled={pending}
                        >
                          <IX size={12} /> Rechazar
                        </button>
                        <button
                          className="nc-btn primary"
                          onClick={() => handleApprove(r.id)}
                          disabled={pending}
                        >
                          <ICheck size={12} /> Aprobar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Calendario ── */}
        {tab === "calendar" && (
          <VacationCalendar
            year={year}
            allRequests={allRequests}
            allUsers={allUsers}
          />
        )}

        {/* ── Tab: Empleados ── */}
        {tab === "employees" && (
          <VacationEmployeeManager allUsers={allUsers} />
        )}
      </div>
    </div>
  );
}

// ─── Calendario global (admin) ─────────────────────────────────────────────

function VacationCalendar({
  year,
  allRequests,
  allUsers,
}: {
  year: number;
  allRequests: VacationRequest[];
  allUsers: UserWithVacationInfo[];
}) {
  const weeks = getWeeksOfYear(year);
  // Agrupar por área
  const areaGroups = VACATION_AREA_LIST.map((area) => ({
    area,
    users: allUsers.filter((u) => u.vacation_area === area.id),
  })).filter((g) => g.users.length > 0);

  // Mapa rápido: userId+weekStart → status
  const reqMap = new Map<string, "pending" | "approved" | "rejected">();
  for (const r of allRequests) {
    reqMap.set(`${r.user_id}::${r.week_start}`, r.status);
  }

  // Meses para los headers
  const monthHeaders: { label: string; start: number; span: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = new Date(w.weekStart + "T00:00:00").getMonth();
    if (m !== lastMonth) {
      monthHeaders.push({ label: new Date(w.weekStart + "T00:00:00").toLocaleDateString("es-ES", { month: "short" }), start: i, span: 1 });
      lastMonth = m;
    } else {
      monthHeaders[monthHeaders.length - 1].span++;
    }
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: weeks.length * 18 + 180 }}>
        {/* Header de semanas */}
        <div style={{ display: "flex", marginBottom: 4, paddingLeft: 180 }}>
          {monthHeaders.map((mh) => (
            <div
              key={mh.start}
              style={{
                width: mh.span * 18, fontSize: 9, color: "var(--nc-mute)",
                fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                paddingLeft: 2,
              }}
            >
              {mh.label}
            </div>
          ))}
        </div>

        {/* Filas por área y empleado */}
        {areaGroups.map(({ area, users }) => (
          <div key={area.id} style={{ marginBottom: 16 }}>
            {/* Cabecera de área */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 7,
                marginBottom: 6, padding: "4px 8px",
                background: "var(--nc-line-2)", borderRadius: "var(--r-sm)",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: area.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--nc-ink-2)" }}>{area.label}</span>
            </div>

            {/* Fila por empleado */}
            {users.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
                <div
                  style={{
                    width: 180, paddingRight: 12, fontSize: 11.5,
                    color: "var(--nc-text)", whiteSpace: "nowrap", overflow: "hidden",
                    textOverflow: "ellipsis", flexShrink: 0,
                  }}
                  title={u.name}
                >
                  {u.name}
                </div>
                <div style={{ display: "flex", gap: 1 }}>
                  {weeks.map((w) => {
                    const status = reqMap.get(`${u.id}::${w.weekStart}`);
                    const isBF = isBlackFridayRestricted(w.weekStart, year) && area.blackFridayRestricted;
                    let bg = "var(--nc-line-2)";
                    let title = w.label;
                    if (status === "approved") { bg = area.color; title += " · Aprobada"; }
                    else if (status === "pending") { bg = "#FEC457"; title += " · Pendiente"; }
                    else if (isBF) { bg = "#F5DDDD"; title += " · Black Friday (restringida)"; }
                    return (
                      <div
                        key={w.weekStart}
                        title={title}
                        style={{
                          width: 16, height: 16, borderRadius: 2,
                          background: bg,
                          opacity: status ? 1 : 0.5,
                          cursor: "default",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Leyenda */}
        <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          {[
            { color: "#7B9C49", label: "Aprobada" },
            { color: "#FEC457", label: "Pendiente" },
            { color: "#F5DDDD", label: "Black Friday restringida" },
            { color: "var(--nc-line-2)", label: "Libre" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Gestión de empleados (admin) ─────────────────────────────────────────

const EMPTY_NEW = {
  name: "", email: "", password: "Naturcanin2026",
  vacation_area: "" as VacationAreaId | "",
  vacation_conflict_extras: [] as VacationAreaId[],
};

function VacationEmployeeManager({ allUsers }: { allUsers: UserWithVacationInfo[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editArea, setEditArea] = useState<VacationAreaId | "">("");
  const [editExtras, setEditExtras] = useState<VacationAreaId[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newData, setNewData] = useState({ ...EMPTY_NEW });

  const [savePending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState("");
  const [newError, setNewError] = useState("");
  const [newSuccess, setNewSuccess] = useState("");

  function startEdit(u: UserWithVacationInfo) {
    setEditingId(u.id);
    setEditArea(u.vacation_area ?? "");
    setEditExtras(u.vacation_conflict_extras ?? []);
    setSaveError("");
    setConfirmDeleteId(null);
  }

  function handleSave(userId: string) {
    startTransition(async () => {
      const res = await updateUserVacationArea(
        userId,
        (editArea as VacationAreaId) || null,
        editExtras,
      );
      if (res?.error) setSaveError(res.error);
      else setEditingId(null);
    });
  }

  function handleDelete(userId: string) {
    startTransition(async () => {
      const res = await deleteEmployee(userId);
      if (res?.error) setSaveError(res.error);
      else { setConfirmDeleteId(null); setEditingId(null); }
    });
  }

  function handleCreate() {
    setNewError(""); setNewSuccess("");
    if (!newData.name.trim()) { setNewError("El nombre es obligatorio"); return; }
    if (!newData.email.trim()) { setNewError("El email es obligatorio"); return; }
    if (!newData.password.trim() || newData.password.length < 6) {
      setNewError("La contraseña debe tener al menos 6 caracteres"); return;
    }
    startTransition(async () => {
      const res = await createEmployee({
        name: newData.name.trim(),
        email: newData.email.trim(),
        password: newData.password,
        vacation_area: (newData.vacation_area as VacationAreaId) || null,
        vacation_conflict_extras: newData.vacation_conflict_extras,
      });
      if (res?.error) {
        setNewError(res.error);
      } else {
        setNewSuccess(`✓ ${newData.name} dado de alta. Contraseña temporal: ${newData.password}`);
        setNewData({ ...EMPTY_NEW });
        setShowNewForm(false);
      }
    });
  }

  function toggleExtra(area: VacationAreaId) {
    setEditExtras((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  function toggleNewExtra(area: VacationAreaId) {
    setNewData((prev) => ({
      ...prev,
      vacation_conflict_extras: prev.vacation_conflict_extras.includes(area)
        ? prev.vacation_conflict_extras.filter((a) => a !== area)
        : [...prev.vacation_conflict_extras, area],
    }));
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "var(--nc-mute)", margin: 0 }}>
          {allUsers.length} empleado{allUsers.length !== 1 ? "s" : ""} en el sistema
        </p>
        <button
          className="nc-btn primary"
          onClick={() => { setShowNewForm(true); setNewError(""); setNewSuccess(""); }}
        >
          <IPlus size={13} /> Nuevo empleado
        </button>
      </div>

      {/* Mensaje de éxito tras crear */}
      {newSuccess && (
        <div style={{
          padding: "10px 14px", borderRadius: "var(--r-sm)", marginBottom: 12,
          background: "var(--nc-green-soft)", color: "var(--nc-green-dark)",
          fontSize: 12, fontWeight: 500,
        }}>
          {newSuccess}
        </div>
      )}

      {/* Formulario nuevo empleado */}
      {showNewForm && (
        <div style={{
          padding: "16px", borderRadius: "var(--r-md)", marginBottom: 16,
          background: "var(--nc-surface)", border: "2px solid var(--nc-green-soft)",
          boxShadow: "var(--sh-1)",
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Nuevo empleado</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Nombre *</label>
              <input
                className="nc-input"
                placeholder="Nombre completo"
                value={newData.name}
                onChange={(e) => setNewData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Email *</label>
              <input
                className="nc-input"
                type="email"
                placeholder="correo@ejemplo.com"
                value={newData.email}
                onChange={(e) => setNewData((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Contraseña temporal *
              </label>
              <input
                className="nc-input"
                value={newData.password}
                onChange={(e) => setNewData((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Área de vacaciones</label>
              <select
                className="nc-input"
                value={newData.vacation_area}
                onChange={(e) => setNewData((p) => ({ ...p, vacation_area: e.target.value as VacationAreaId }))}
              >
                <option value="">— Sin asignar —</option>
                {VACATION_AREA_LIST.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Conflictos adicionales
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {VACATION_AREA_LIST.filter((a) => a.id !== newData.vacation_area).map((a) => {
              const on = newData.vacation_conflict_extras.includes(a.id);
              return (
                <button key={a.id} onClick={() => toggleNewExtra(a.id)} style={{
                  padding: "3px 10px", borderRadius: 99, fontSize: 10.5, fontWeight: 500,
                  border: `1.5px solid ${on ? a.color : "var(--nc-line)"}`,
                  background: on ? a.color + "22" : "transparent",
                  color: on ? a.color : "var(--nc-text)", cursor: "pointer",
                }}>
                  {a.label}
                </button>
              );
            })}
          </div>

          {newError && (
            <div style={{ color: "var(--nc-danger)", fontSize: 11.5, marginBottom: 10 }}>{newError}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="nc-btn secondary" onClick={() => { setShowNewForm(false); setNewError(""); }}>
              Cancelar
            </button>
            <button className="nc-btn primary" onClick={handleCreate} disabled={savePending}>
              {savePending ? "Creando…" : "Dar de alta"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de empleados */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {allUsers.map((u) => {
          const isEditing = editingId === u.id;
          const isConfirmingDelete = confirmDeleteId === u.id;

          return (
            <div
              key={u.id}
              style={{
                padding: "12px 14px", borderRadius: "var(--r-md)",
                background: "var(--nc-surface)",
                border: `1px solid ${isConfirmingDelete ? "var(--nc-danger)" : "var(--nc-line)"}`,
                boxShadow: "var(--sh-1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={u.name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>{u.email}</div>
                </div>

                {!isEditing && !isConfirmingDelete && (
                  <>
                    {u.vacation_area ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 8px", borderRadius: 99, fontSize: 10.5,
                        background: areaColor(u.vacation_area) + "22",
                        color: areaColor(u.vacation_area), fontWeight: 600,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                        {VACATION_AREAS[u.vacation_area]?.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: "var(--nc-mute)" }}>Sin área</span>
                    )}
                    {u.vacation_conflict_extras.length > 0 && (
                      <span style={{ fontSize: 10, color: "var(--nc-mute)" }}>
                        +{u.vacation_conflict_extras.length} extra{u.vacation_conflict_extras.length > 1 ? "s" : ""}
                      </span>
                    )}
                    <button
                      className="nc-btn secondary"
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      onClick={() => startEdit(u)}
                    >
                      Editar
                    </button>
                    <button
                      className="nc-btn ghost"
                      style={{ fontSize: 11, padding: "4px 8px", color: "var(--nc-danger)" }}
                      onClick={() => setConfirmDeleteId(u.id)}
                      title="Dar de baja"
                    >
                      <IX size={12} />
                    </button>
                  </>
                )}

                {isConfirmingDelete && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: "var(--nc-danger)", fontWeight: 500 }}>
                      ¿Dar de baja a {u.name}? Se borrarán sus datos.
                    </span>
                    <button className="nc-btn secondary" onClick={() => setConfirmDeleteId(null)}>
                      Cancelar
                    </button>
                    <button
                      className="nc-btn"
                      style={{ background: "var(--nc-danger)", color: "white", padding: "6px 12px", borderRadius: "var(--r-sm)", fontSize: 12 }}
                      onClick={() => handleDelete(u.id)}
                      disabled={savePending}
                    >
                      {savePending ? "Eliminando…" : "Confirmar baja"}
                    </button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Área de vacaciones
                  </label>
                  <select
                    className="nc-input"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value as VacationAreaId)}
                    style={{ marginBottom: 12 }}
                  >
                    <option value="">— Sin asignar —</option>
                    {VACATION_AREA_LIST.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>

                  <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Conflictos adicionales
                  </label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    {VACATION_AREA_LIST.filter((a) => a.id !== editArea).map((a) => {
                      const on = editExtras.includes(a.id);
                      return (
                        <button key={a.id} onClick={() => toggleExtra(a.id)} style={{
                          padding: "3px 10px", borderRadius: 99, fontSize: 10.5, fontWeight: 500,
                          border: `1.5px solid ${on ? a.color : "var(--nc-line)"}`,
                          background: on ? a.color + "22" : "transparent",
                          color: on ? a.color : "var(--nc-text)", cursor: "pointer",
                        }}>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>

                  {saveError && (
                    <div style={{ color: "var(--nc-danger)", fontSize: 11.5, marginBottom: 10 }}>{saveError}</div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="nc-btn secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                    <button className="nc-btn primary" onClick={() => handleSave(u.id)} disabled={savePending}>
                      {savePending ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
