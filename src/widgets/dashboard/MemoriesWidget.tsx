import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ChevronRight } from "lucide-react";

export default function MemoriesWidget() {
  const { user } = useSession();
  const { data = [] } = useQuery({
    queryKey: ["dashboard", "memories", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,starts_at,location")
        .eq("organizer_id", user!.id)
        .lt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold">Souvenirs</h2>
          </div>
          <Link to="/app/events" className="text-xs text-primary hover:underline flex items-center gap-1">
            Tout voir <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Vos événements passés apparaîtront ici.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {data.map((e) => (
              <li key={e.id}>
                <Link
                  to="/app/events/$eventId"
                  params={{ eventId: e.id }}
                  className="block p-3 rounded-lg border border-border/60 hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {e.starts_at ? new Date(e.starts_at).toLocaleDateString("fr-FR", { dateStyle: "medium" }) : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
