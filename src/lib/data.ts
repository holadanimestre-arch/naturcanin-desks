export type PersonId = "lau" | "car" | "ana" | "pab" | "mar" | "jor";
export type TagKey = "produccion" | "logistica" | "ventas" | "calidad" | "admin";
export type Priority = "high" | "med" | "low";
export type TaskState = "pending" | "progress" | "done";

export type Person = {
  id: PersonId;
  name: string;
  role: string;
  initials: string;
  c: string;
};

export type Task = {
  id: number;
  title: string;
  tag: TagKey;
  prio: Priority;
  state: TaskState;
  due: string;
  assignee: string[];        // PersonId (mock) or UUID (DB)
  assigneeNames?: string[];  // display names for UUID-based assignees
  comments: number;
  files: number;
  subs?: { d: number; t: number };
  desc?: string;
};

export const people: Person[] = [
  { id: "lau", name: "Laura M.",  role: "Producción", initials: "LM", c: "c1" },
  { id: "car", name: "Carlos B.", role: "Logística",  initials: "CB", c: "c2" },
  { id: "ana", name: "Ana G.",    role: "Ventas",     initials: "AG", c: "c3" },
  { id: "pab", name: "Pablo R.",  role: "Calidad",    initials: "PR", c: "c4" },
  { id: "mar", name: "María S.",  role: "Admin",      initials: "MS", c: "c5" },
  { id: "jor", name: "Jorge T.",  role: "Producción", initials: "JT", c: "c7" },
];

export const peopleById: Record<PersonId, Person> = Object.fromEntries(
  people.map((p) => [p.id, p])
) as Record<PersonId, Person>;

export const tags: Record<TagKey, { label: string; cls: string }> = {
  produccion: { label: "Producción", cls: "produccion" },
  logistica:  { label: "Logística",  cls: "logistica" },
  ventas:     { label: "Ventas",     cls: "ventas" },
  calidad:    { label: "Calidad",    cls: "calidad" },
  admin:      { label: "Admin",      cls: "admin" },
};

export const tasks: Task[] = [
  { id: 1,  title: "Revisar lote 204-A de pollo",        tag: "calidad",    prio: "high", state: "progress", due: "Hoy",    assignee: ["pab"],        comments: 3, files: 2, subs: { d: 2, t: 5 }, desc: "Inspección de lote antes de envasado. Verificar temperatura de cámara y trazabilidad del proveedor." },
  { id: 2,  title: "Formular receta nueva línea puppy",  tag: "produccion", prio: "med",  state: "progress", due: "24 abr", assignee: ["lau", "jor"], comments: 8, files: 5, subs: { d: 3, t: 6 } },
  { id: 3,  title: "Pedido distribuidor Galicia",        tag: "logistica",  prio: "high", state: "pending",  due: "Mañana", assignee: ["car"],        comments: 1, files: 1, subs: { d: 0, t: 4 } },
  { id: 4,  title: "Preparar ficha marca blanca Petfit", tag: "ventas",     prio: "med",  state: "pending",  due: "26 abr", assignee: ["ana"],        comments: 2, files: 3, subs: { d: 1, t: 3 } },
  { id: 5,  title: "Inventario cámara congelación 2",    tag: "logistica",  prio: "low",  state: "pending",  due: "28 abr", assignee: ["car", "jor"], comments: 0, files: 0, subs: { d: 0, t: 5 } },
  { id: 6,  title: "Responder reseñas web (abril)",      tag: "ventas",     prio: "low",  state: "progress", due: "25 abr", assignee: ["ana"],        comments: 4, files: 0 },
  { id: 7,  title: "Actualizar etiquetas UE 2026",       tag: "calidad",    prio: "high", state: "pending",  due: "30 abr", assignee: ["pab", "mar"], comments: 6, files: 4, subs: { d: 1, t: 8 } },
  { id: 8,  title: "Cierre contabilidad Q1",             tag: "admin",      prio: "med",  state: "progress", due: "29 abr", assignee: ["mar"],        comments: 2, files: 7 },
  { id: 9,  title: "Limpieza semanal sala de mezclas",   tag: "produccion", prio: "low",  state: "done",     due: "20 abr", assignee: ["jor"],        comments: 0, files: 1 },
  { id: 10, title: "Envíos lote 87 (España)",            tag: "logistica",  prio: "med",  state: "done",     due: "19 abr", assignee: ["car"],        comments: 1, files: 2 },
  { id: 11, title: "Formación seguridad alimentaria",    tag: "calidad",    prio: "med",  state: "done",     due: "18 abr", assignee: ["pab", "lau"], comments: 3, files: 0 },
  { id: 12, title: "Muestras clínica veterinaria Sevilla", tag: "ventas",   prio: "med",  state: "pending",  due: "2 may",  assignee: ["ana"],        comments: 0, files: 1 },
];

export type Notification = {
  id: number;
  who: string;
  text: string;
  when: string;
  unread: boolean;
};

export const notifications: Notification[] = [
  { id: 1, who: "Carlos B.", text: 'te ha mencionado en "Pedido distribuidor Galicia"',    when: "hace 2 min", unread: true },
  { id: 2, who: "María S.",  text: 'ha asignado "Cierre contabilidad Q1" a ti',             when: "hace 40 min", unread: true },
  { id: 3, who: "Ana G.",    text: 'añadió un archivo en "Preparar ficha marca blanca"',    when: "hace 2 h",    unread: true },
  { id: 4, who: "Sistema",   text: 'Recordatorio: "Revisar lote 204-A" vence hoy',          when: "hace 3 h",    unread: false },
  { id: 5, who: "Pablo R.",  text: 'completó "Formación seguridad alimentaria"',            when: "ayer",        unread: false },
  { id: 6, who: "Jorge T.",  text: 'comentó en "Formular receta línea puppy"',              when: "ayer",        unread: false },
];

export type Comment = {
  who: PersonId;
  name: string;
  when: string;
  text: string;
};

export const comments: Comment[] = [
  { who: "car", name: "Carlos B.", when: "hace 1h",  text: "Confirmado con el transportista, recogida el viernes a las 8:00." },
  { who: "lau", name: "Laura M.",  when: "hace 45m", text: "Perfecto. Dejo el albarán firmado en oficina para que puedas pasarlo por administración." },
  { who: "mar", name: "María S.",  when: "hace 20m", text: "¿Incluye las 3 cajas de muestras para el cliente nuevo?" },
];

export const myTasks = tasks.filter((t) => t.assignee.includes("lau"));
