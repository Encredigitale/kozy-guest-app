import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, Users, Bell } from "lucide-react";

export default function StatsScreen() {
  const events = useQuery({
    queryKey: ["ext", "stats", "events"],
    queryFn: async () => {
      const { count } = await supabase.from("events").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  const participants = useQuery({
    queryKey: ["ext", "stats", "participants"],
    queryFn: async () => {
      const { count } = await supabase.from("event_participants").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  const notifs = useQuery({
    queryKey: ["ext", "stats", "notifications"],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const cards = [
    { icon: Calendar, label: "Événements", value: events.data ?? "…" },
    { icon: Users, label: "Participants", value: participants.data ?? "…" },
    { icon: Bell, label: "Notifications", value: notifs.data ?? "…" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl">Statistiques avancées</h1>
          <p className="text-sm text-muted-foreground">Vue analytique de la plateforme.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-2xl border-border/60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <c.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{c.label}</CardTitle>
              </div>
              <CardDescription>Total (RLS appliquée)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-serif">{String(c.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
