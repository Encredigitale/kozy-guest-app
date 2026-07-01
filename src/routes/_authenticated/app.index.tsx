import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, MapPin, LogOut } from "lucide-react";
import { eventTypeLabel } from "@/lib/event-types";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  event_subtype: string | null;
  event_at: string;
  location: string | null;
};

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Accueil — Kosy" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: e }] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("events")
          .select("id, title, event_type, event_subtype, event_at, location")
          .order("event_at", { ascending: true })
          .limit(4),
      ]);
      setFirstName(p?.first_name ?? null);
      setEvents((e ?? []) as EventRow[]);
      setLoading(false);
    })();
  }, [user.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("À bientôt !");
    navigate({ to: "/auth", replace: true });
  };

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.event_at).getTime() >= now);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="font-serif text-4xl tracking-tight mb-2">
            Bonjour {firstName ?? ""}
          </h1>
          <p className="text-muted-foreground">
            Prêt à organiser votre prochain moment de convivialité ?
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {loading ? null : events.length === 0 ? (
        <Card className="rounded-3xl border-border/60 shadow-none">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-accent grid place-items-center mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-serif text-xl mb-2">Aucun moment pour l'instant</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Créez votre premier événement pour rassembler vos proches.
            </p>
            <Button asChild size="lg" className="rounded-full">
              <Link to="/app/events/new">
                <Plus className="h-4 w-4" />
                Créer mon premier événement
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-8">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/app/events/new">
                <Plus className="h-4 w-4" />
                Créer un événement
              </Link>
            </Button>
          </div>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-xl">À venir</h2>
              <Link to="/app/events" className="text-sm text-muted-foreground hover:text-foreground">
                Tout voir →
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien de prévu.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((e) => (
                  <Link
                    key={e.id}
                    to="/app/events/$eventId"
                    params={{ eventId: e.id }}
                    className="block"
                  >
                    <Card className="rounded-3xl border-border/60 shadow-none hover:border-primary/40 transition-colors h-full">
                      <CardHeader>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {eventTypeLabel(e.event_type)}
                          {e.event_subtype ? ` · ${e.event_subtype}` : ""}
                        </div>
                        <CardTitle className="font-serif">{e.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(e.event_at).toLocaleString("fr-FR", {
                            dateStyle: "full",
                            timeStyle: "short",
                          })}
                        </div>
                        {e.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {e.location}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
