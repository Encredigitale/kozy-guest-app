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
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Calendrier</h2>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ date, events }) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const has = events.length > 0;
            const content = (
              <div
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  isToday
                    ? "border-primary bg-primary/10 font-semibold"
                    : has
                      ? "border-primary/40 bg-accent hover:bg-primary/10"
                      : "border-border/50 text-muted-foreground"
                }`}
              >
                <span className="text-[10px] uppercase">{date.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3)}</span>
                <span className="text-sm">{date.getDate()}</span>
                {has && <span className="h-1 w-1 rounded-full bg-primary" />}
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
