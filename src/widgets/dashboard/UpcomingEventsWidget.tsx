import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/core/auth/useSession";
import { Calendar, MapPin } from "lucide-react";

export default function UpcomingEventsWidget() {
  const { user } = useSession();
  const { data = [] } = useQuery({
    queryKey: ["dashboard", "upcoming", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,starts_at,location")
        .eq("organizer_id", user!.id)
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="rounded-2xl border-border/60 h-full">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Événements à venir</p>
          <Link to="/app/events" className="text-xs text-primary hover:underline">Tout voir</Link>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun événement planifié.</p>
        ) : (
          <ul className="space-y-2">
            {data.map((e) => (
              <li key={e.id}>
                <Link
                  to="/app/events/$eventId"
                  params={{ eventId: e.id }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                      {e.starts_at ? new Date(e.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "Date à définir"}
                      {e.location && (<><MapPin className="h-3 w-3" /> {e.location}</>)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
