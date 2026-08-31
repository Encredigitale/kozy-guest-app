import { Link } from "@tanstack/react-router";
import { Cake, ChevronRight } from "lucide-react";
import { useUpcomingBirthdays, formatBirthday } from "./birthdays";

/** Alerte d'anniversaire des contacts du carnet (aujourd'hui et à venir). */
export function BirthdayNotice({ windowDays = 15 }: { windowDays?: number }) {
  const birthdays = useUpcomingBirthdays(windowDays);
  if (birthdays.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Cake className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-primary">Anniversaires</p>
      </div>
      <ul className="mt-2 space-y-1">
        {birthdays.slice(0, 4).map((b) => (
          <li key={b.id} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{b.name}</span>{" "}
            {b.daysUntil === 0
              ? `fête son anniversaire aujourd'hui 🎉`
              : `dans ${b.daysUntil} jour${b.daysUntil > 1 ? "s" : ""} — ${formatBirthday(b.birthday)}`}
            {b.age !== null && ` (${b.age} ans)`}
          </li>
        ))}
      </ul>
      <Link
        to="/app/contacts"
        className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs text-primary hover:underline"
      >
        Voir le carnet d'adresses <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
