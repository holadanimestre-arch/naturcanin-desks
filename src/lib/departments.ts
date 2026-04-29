export const DEPARTMENTS = [
  "Fabricación",
  "Logística",
  "Comercial",
  "Administrativo",
  "Calidad",
  "Marketing",
  "Compras",
  "Gerencia",
];

// Lee la lista de departamentos del user_metadata aceptando dos formas:
// - nueva: { departments: string[] }
// - legacy: { department: string } (incluso si viene como CSV)
export function parseDepartments(meta: unknown): string[] {
  const m = (meta ?? {}) as Record<string, unknown>;
  const arr = m.departments;
  if (Array.isArray(arr)) {
    return arr.map((x) => String(x).trim()).filter(Boolean);
  }
  const single = m.department;
  if (typeof single === "string" && single.trim()) {
    return single.split(/[,·]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function joinDepartments(depts: string[]): string {
  return depts.join(" · ");
}
