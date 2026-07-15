import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/events/")({
  head: () => ({ meta: [{ title: "Événements — Framework" }] }),
  component: EventsListPage,
});

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  starts_at: string | null;
  location: string | null;
};

function EventsListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["core", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, status, starts_at, location")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-primary">Événements</h1>
          <p className="text-sm text-muted-foreground mt-1">Vos événements et ceux auxquels vous participez.</p>
        </div>
        <Button asChild className="rounded-full"><Link to="/app/events/new"><Plus className="h-4 w-4" /> Nouveau</Link></Button>
      </div>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (data ?? []).length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Aucun événement.
            </CardContent>
          </Card>
        ) : (
          (data ?? []).map((e) => (
            <Link key={e.id} to="/app/events/$eventId" params={{ eventId: e.id }}>
              <Card className="rounded-2xl border-border/60 hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{e.title}</CardTitle>
                      {e.description && <CardDescription className="line-clamp-1">{e.description}</CardDescription>}
                    </div>
                    <Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex gap-4 text-xs text-muted-foreground">
                  {e.starts_at && (<span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(e.starts_at).toLocaleString("fr-FR")}</span>)}
                  {e.location && (<span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>)}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
