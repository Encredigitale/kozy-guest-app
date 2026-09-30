import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function CalendarWidget() {
  const { user } = useSession();
  const { data = [] } = useQuery({
    queryKey: ["dashboard", "calendar", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,starts_at")
        .eq("organizer_id", user!.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const dayEvents = data.filter((e) => {
        if (!e.starts_at) return false;
        const ed = new Date(e.starts_at);
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate();
      });
      return { date: d, events: dayEvents };
    });
  }, [data]);

  return (
    <Card className="rounded-3xl border-2 border-primary bg-background p-1 shadow-[8px_8px_0_var(--color-accent)]">
      <CardContent className="p-5 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 -rotate-6 text-secondary" strokeWidth={2.4} />
          <h2 className="font-serif font-extrabold uppercase tracking-tight text-primary">Calendrier</h2>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ date, events }) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const has = events.length > 0;
            const content = (
              <div
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-full border-2 text-xs transition-all hover:-translate-y-0.5 ${
                  isToday
                    ? "border-transparent bg-secondary font-bold text-secondary-foreground shadow-[3px_3px_0_var(--color-primary)]"
                    : has
                      ? "border-primary/40 bg-accent font-semibold text-primary hover:bg-primary/10"
                      : "border-transparent text-muted-foreground hover:bg-accent/40"
                }`}
              >
                <span className="text-[10px] uppercase leading-none opacity-80">{date.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3)}</span>
                <span className="text-sm leading-none">{date.getDate()}</span>
                {has && <span className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-secondary-foreground" : "bg-secondary"}`} />}
              </div>
            );
            return has ? (
              <Link key={date.toISOString()} to="/app/events/$eventId" params={{ eventId: events[0].id }}>
                {content}
              </Link>
            ) : (
              <div key={date.toISOString()}>{content}</div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
