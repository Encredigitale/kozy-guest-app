import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, MapPin } from "lucide-react";
import { eventTypeLabel } from "@/lib/event-types";

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  event_subtype: string | null;
  event_at: string;
  location: string | null;
};

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Mes moments — Kosy" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState<{ first_name: string | null } | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: e }] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("events")
          .select("id, title, event_type, event_subtype, event_at, location")
          .order("event_at", { ascending: true }),
      ]);
      setProfile(p);
      setEvents((e ?? []) as EventRow[]);
      setLoading(false);
    })();
  }, [user.id]);

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.event_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.event_at).getTime() < now);

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="font-serif text-3xl mb-1">Bonjour {profile?.first_name ?? ""} 👋</h2>
          <p className="text-muted-foreground">Vos moments en un coup d'œil.</p>
        </div>
        <Button asChild>
          <Link to="/app/events/new">
            <Plus className="h-4 w-4" />
            Créer un moment
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucun moment pour l'instant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre premier moment pour rassembler vos proches.
            </p>
            <Button asChild>
              <Link to="/app/events/new">
                <Plus className="h-4 w-4" />
                Créer un moment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <Section title="À venir" events={upcoming} emptyLabel="Rien de prévu." />
          {past.length > 0 && (
            <Section title="Passés" events={past.slice().reverse()} emptyLabel="" />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  events,
  emptyLabel,
}: {
  title: string;
  events: EventRow[];
  emptyLabel: string;
}) {
  return (
    <section>
      <h3 className="font-serif text-xl mb-3">{title}</h3>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((e) => (
            <Link
              key={e.id}
              to="/app/events/$eventId"
              params={{ eventId: e.id }}
              className="block"
            >
              <Card className="hover:border-primary/50 transition-colors h-full">
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
  );
}
