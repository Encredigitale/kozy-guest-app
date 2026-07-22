import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, ChevronRight } from "lucide-react";

export default function MyEventsWidget() {
  const { user } = useSession();
  const { data = [] } = useQuery({
    queryKey: ["dashboard", "my-events", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,starts_at,location")
        .eq("organizer_id", user!.id)
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Mes événements</h2>
          <Link to="/app/events" className="text-xs text-primary hover:underline flex items-center gap-1">
            Tout voir <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {data.length === 0 ? (
          <Link to="/app/events/new" className="block text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg hover:bg-accent transition-colors">
            + Créer votre premier événement
          </Link>
        ) : (
          <ul className="space-y-2">
            {data.map((e) => (
              <li key={e.id}>
                <Link
                  to="/app/events/$eventId"
                  params={{ eventId: e.id }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
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
