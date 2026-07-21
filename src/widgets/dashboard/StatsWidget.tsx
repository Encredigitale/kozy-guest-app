import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, CheckCheck } from "lucide-react";

export default function DashboardStatsWidget() {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["dashboard", "stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ count: eventsCount }, { count: participatingCount }] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }).eq("organizer_id", user!.id),
        supabase.from("event_participants").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return { eventsCount: eventsCount ?? 0, participating: participatingCount ?? 0 };
    },
  });

  const stats = [
    { icon: Calendar, label: "Événements organisés", value: data?.eventsCount ?? 0 },
    { icon: Users, label: "Invitations acceptées", value: data?.participating ?? 0 },
    { icon: CheckCheck, label: "Session", value: "Sécurisée" },
  ];

  return (
    <Card className="rounded-2xl border-border/60 h-full">
      <CardContent className="p-5 space-y-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Vue d'ensemble</p>
        <div className="space-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                <p className="text-base font-medium">{String(s.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
