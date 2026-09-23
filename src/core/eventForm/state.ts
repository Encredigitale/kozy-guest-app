export type EventFormValues = {
  type: string;
  customType: string;
  title: string;
  description: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  address: string;
  postalCode: string;
  city: string;
  organizerNote: string;
};

export const emptyEventForm: EventFormValues = {
  type: "",
  customType: "",
  title: "",
  description: "",
  date: "",
  time: "",
  address: "",
  postalCode: "",
  city: "",
  organizerNote: "",
};

/** Adresse complète en une ligne, stockée dans events.location. */
export function formatLocation(v: Pick<EventFormValues, "address" | "postalCode" | "city">): string {
  const street = v.address.trim();
  const town = `${v.postalCode.trim()} ${v.city.trim()}`.trim();
  return [street, town].filter(Boolean).join(", ");
}

/** Dynamic list of required criteria — add one here and the gauge adapts. */
export function requiredCriteria(v: EventFormValues) {
  return [
    { key: "type", section: 0, label: "Type d'événement", valid: Boolean(v.type) && (v.type !== "other" || v.customType.trim().length > 0) },
    { key: "title", section: 1, label: "Nom de l'événement", valid: v.title.trim().length > 0 },
    { key: "date", section: 2, label: "Date de l'événement", valid: isValidDate(v.date) },
    { key: "time", section: 2, label: "Heure de l'événement", valid: /^\d{2}:\d{2}$/.test(v.time) },
    { key: "location", section: 3, label: "Lieu", valid: v.location.trim().length > 0 },
  ];
}

export function isValidDate(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const dt = new Date(`${d}T00:00:00`);
  return !isNaN(dt.getTime());
}

export function progressOf(v: EventFormValues) {
  const c = requiredCriteria(v);
  return Math.round((c.filter((x) => x.valid).length / c.length) * 100);
}

export function missingOf(v: EventFormValues) {
  return requiredCriteria(v).filter((c) => !c.valid);
}

export function toStartsAt(v: EventFormValues): string | null {
  if (!isValidDate(v.date)) return null;
  const time = /^\d{2}:\d{2}$/.test(v.time) ? v.time : "00:00";
  const dt = new Date(`${v.date}T${time}:00`);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

export function fromStartsAt(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function formatDateSummary(v: EventFormValues): string | null {
  if (!isValidDate(v.date)) return null;
  const d = new Date(`${v.date}T${/^\d{2}:\d{2}$/.test(v.time) ? v.time : "00:00"}:00`);
  const date = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long" }).format(d);
  const time = /^\d{2}:\d{2}$/.test(v.time) ? ` · ${v.time.replace(":", "h")}` : "";
  return `${date}${time}`;
}
