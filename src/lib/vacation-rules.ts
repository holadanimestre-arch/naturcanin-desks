// Reglas de vacaciones de Naturcanin
// Basado en el Boletín Oficial de Empresa · Política de Vacaciones

export type VacationAreaId =
  | "encargadas_produccion"
  | "administracion"
  | "logistica"
  | "picado"
  | "produccion_albondigas"
  | "envasado_tarrinas"
  | "produccion_horno";

export type VacationArea = {
  id: VacationAreaId;
  label: string;
  color: string;
  blackFridayRestricted: boolean;
  // Áreas cuyos miembros NO pueden coincidir con miembros de esta área
  // (incluye la propia área para los conflictos internos)
  conflictsWith: VacationAreaId[];
};

export const VACATION_AREAS: Record<VacationAreaId, VacationArea> = {
  encargadas_produccion: {
    id: "encargadas_produccion",
    label: "Encargadas de Producción",
    color: "#7B9C49",
    blackFridayRestricted: false,
    conflictsWith: ["encargadas_produccion"],
  },
  administracion: {
    id: "administracion",
    label: "Oficina Administración",
    color: "#7A8590",
    blackFridayRestricted: true,
    conflictsWith: ["administracion"],
  },
  logistica: {
    id: "logistica",
    label: "Logística",
    color: "#6C98C2",
    blackFridayRestricted: true,
    conflictsWith: ["logistica"],
  },
  picado: {
    id: "picado",
    label: "Área de Picado",
    color: "#E39454",
    blackFridayRestricted: false,
    conflictsWith: ["picado"],
  },
  produccion_albondigas: {
    id: "produccion_albondigas",
    label: "Prod. y Envasado Albóndigas",
    color: "#A57CC1",
    blackFridayRestricted: false,
    // No puede coincidir internamente NI con Envasado Tarrinas
    conflictsWith: ["produccion_albondigas", "envasado_tarrinas"],
  },
  envasado_tarrinas: {
    id: "envasado_tarrinas",
    label: "Envasado Tarrinas y Bolsas",
    color: "#48B0A0",
    blackFridayRestricted: false,
    conflictsWith: ["envasado_tarrinas", "produccion_albondigas"],
  },
  produccion_horno: {
    id: "produccion_horno",
    label: "Producción Horno",
    color: "#C15F3E",
    blackFridayRestricted: false,
    conflictsWith: ["produccion_horno"],
    // Reglas extra por persona (Johan Camilo ↔ Logística, Sergio ↔ Picado)
    // se almacenan en vacation_conflict_extras de cada usuario
  },
};

export const VACATION_AREA_LIST = Object.values(VACATION_AREAS);

// ─── Cálculo de semanas ISO ────────────────────────────────────────────────

/** Devuelve el lunes (Date) de la semana ISO W del año Y */
export function isoWeekToMonday(year: number, week: number): Date {
  // La semana ISO 1 es la que contiene el 4 de enero
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7; // domingo = 7
  const monday1 = new Date(jan4);
  monday1.setDate(jan4.getDate() - (day - 1));
  const result = new Date(monday1);
  result.setDate(monday1.getDate() + (week - 1) * 7);
  return result;
}

/** Devuelve el número de semana ISO de una fecha */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Devuelve el año ISO de una fecha (puede diferir del año calendario en los extremos) */
export function getISOYear(date: Date): number {
  const week = getISOWeek(date);
  if (week === 1 && date.getMonth() === 11) return date.getFullYear() + 1;
  if (week >= 52 && date.getMonth() === 0) return date.getFullYear() - 1;
  return date.getFullYear();
}

/** Convierte un string YYYY-MM-DD al lunes de su semana ISO */
export function weekStartFromDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toISOString().split("T")[0];
}

/** Formatea el rango de una semana: "5 ene — 11 ene" */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("es-ES", opts)} — ${end.toLocaleDateString("es-ES", opts)}`;
}

/** Genera todas las semanas del año ISO (array de { week, weekStart, label }) */
export function getWeeksOfYear(year: number): { week: number; weekStart: string; label: string }[] {
  const result = [];
  for (let w = 1; w <= 53; w++) {
    const monday = isoWeekToMonday(year, w);
    if (getISOYear(monday) !== year) break;
    const ws = monday.toISOString().split("T")[0];
    result.push({ week: w, weekStart: ws, label: `Sem. ${w} · ${formatWeekRange(ws)}` });
  }
  return result;
}

// ─── Black Friday ──────────────────────────────────────────────────────────

/** Devuelve los dos lunes restringidos por Black Friday en un año dado */
export function getBlackFridayWeekStarts(year: number): string[] {
  // Último viernes de noviembre
  let d = new Date(year, 10, 30); // nov 30
  while (d.getDay() !== 5) d.setDate(d.getDate() - 1); // retroceder hasta viernes
  // Lunes de esa semana
  const mon1 = new Date(d);
  mon1.setDate(d.getDate() - 4);
  // Lunes siguiente
  const mon2 = new Date(mon1);
  mon2.setDate(mon1.getDate() + 7);
  return [
    mon1.toISOString().split("T")[0],
    mon2.toISOString().split("T")[0],
  ];
}

export function isBlackFridayRestricted(weekStart: string, year: number): boolean {
  return getBlackFridayWeekStarts(year).includes(weekStart);
}

// ─── Detección de conflictos ───────────────────────────────────────────────

export type ConflictInfo = {
  conflictingNames: string[];
  isBlackFriday: boolean;
};

export type UserVacationMeta = {
  id: string;
  name: string;
  vacation_area: VacationAreaId | null;
  vacation_conflict_extras: VacationAreaId[];
};

export type SimpleRequest = {
  user_id: string;
  week_start: string;
  status: "pending" | "approved" | "rejected";
};

/**
 * Detecta conflictos para un usuario que quiere pedir una semana concreta.
 * Devuelve nombres de compañeros que ya tienen esa semana (pending o approved)
 * y si cae en Black Friday restringido.
 */
export function detectConflicts(
  userId: string,
  weekStart: string,
  allRequests: SimpleRequest[],
  allUsers: UserVacationMeta[],
): ConflictInfo {
  const me = allUsers.find((u) => u.id === userId);
  const year = getISOYear(new Date(weekStart + "T00:00:00"));

  const isBlackFriday =
    me?.vacation_area
      ? VACATION_AREAS[me.vacation_area]?.blackFridayRestricted &&
        isBlackFridayRestricted(weekStart, year)
      : false;

  if (!me?.vacation_area) {
    return { conflictingNames: [], isBlackFriday };
  }

  const areaRules = VACATION_AREAS[me.vacation_area];
  // Áreas con las que yo conflicto (las de mi área + extras personales)
  const myConflictAreas = new Set<VacationAreaId>([
    ...areaRules.conflictsWith,
    ...me.vacation_conflict_extras,
  ]);

  const conflictingNames: string[] = [];

  for (const req of allRequests) {
    if (req.user_id === userId) continue;
    if (req.week_start !== weekStart) continue;
    if (req.status === "rejected") continue;

    const otherUser = allUsers.find((u) => u.id === req.user_id);
    if (!otherUser || !otherUser.vacation_area) continue;

    const otherArea = otherUser.vacation_area;

    // Conflicto si el otro está en un área con la que yo conflicto
    // O si el otro tiene extras que incluyen mi área
    const otherConflictsWithMe =
      VACATION_AREAS[otherArea]?.conflictsWith.includes(me.vacation_area) ||
      otherUser.vacation_conflict_extras.includes(me.vacation_area);

    if (myConflictAreas.has(otherArea) || otherConflictsWithMe) {
      conflictingNames.push(otherUser.name);
    }
  }

  return { conflictingNames, isBlackFriday };
}
