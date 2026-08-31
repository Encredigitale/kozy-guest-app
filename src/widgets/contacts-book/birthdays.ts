import { useMemo } from "react";
import { useWidgetItems } from "@/widgets/_shared/useWidgetItems";

export type ContactBirthday = {
  id: string;
  name: string;
  birthday: string;
  /** Nombre de jours avant le prochain anniversaire (0 = aujourd'hui). */
  daysUntil: number;
  /** Âge atteint au prochain anniversaire, si l'année de naissance est connue. */
  age: number | null;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Jours restants avant le prochain anniversaire (récurrence annuelle). */
export function daysUntilBirthday(birthday: string, from: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday.trim());
  if (!m) return null;
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const today = startOfDay(from);
  let next = new Date(today.getFullYear(), month, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month, day);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function formatBirthday(birthday: string): string {
  const d = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(d.getTime())) return birthday;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(d);
}

/** Anniversaires des contacts du carnet, dans les `windowDays` prochains jours. */
export function useUpcomingBirthdays(windowDays = 15): ContactBirthday[] {
  const { items } = useWidgetItems("contacts.book", { scope_type: "global", scope_id: null });

  return useMemo(() => {
    const now = new Date();
    const out: ContactBirthday[] = [];
    for (const it of items) {
      const birthday = String(it.payload.birthday ?? "").trim();
      if (!birthday) continue;
      const daysUntil = daysUntilBirthday(birthday, now);
      if (daysUntil === null || daysUntil > windowDays) continue;
      const year = Number(birthday.slice(0, 4));
      const nextYear = now.getFullYear() + (daysUntil > 0 && new Date(now.getFullYear(), Number(birthday.slice(5, 7)) - 1, Number(birthday.slice(8, 10))) < startOfDay(now) ? 1 : 0);
      out.push({
        id: it.id,
        name: String(it.payload.name ?? "Contact"),
        birthday,
        daysUntil,
        age: year > 1900 ? nextYear - year : null,
      });
    }
    return out.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [items, windowDays]);
}
