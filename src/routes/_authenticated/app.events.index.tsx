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

export const Route = createFileRoute("/_authenticated/app/events/")({
  head: () => ({ meta: [{ title: "Mes événements — Kosy" }] }),
  component: EventsPage,
});

function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, event_type, event_subtype, event_at, location")
      .order("event_at", { ascending: true })
      .then(({ data }) => {
        setEvents((data ?? []) as EventRow[]);
        setLoading(false);
      });
  }, []);

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.event_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.event_at).getTime() < now).reverse();

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight mb-1">Mes événements</h1>
          <p className="text-muted-foreground">À venir et passés.</p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/app/events/new">
            <Plus className="h-4 w-4" />
            Créer
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          <Section title="À venir" events={upcoming} emptyLabel="Rien de prévu." />
          {past.length > 0 && <Section title="Passés" events={past} emptyLabel="" />}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="rounded-3xl border-border/60 shadow-none">
      <CardHeader>
        <CardTitle className="font-serif">Aucun événement pour l'instant</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Créez votre premier événement et invitez vos proches.
        </p>
        <Button asChild className="rounded-full">
          <Link to="/app/events/new">
            <Plus className="h-4 w-4" /> Créer un événement
          </Link>
        </Button>
      </CardContent>
    </Card>
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
      <h2 className="font-serif text-xl mb-3">{title}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((e) => (
            <Link key={e.id} to="/app/events/$eventId" params={{ eventId: e.id }} className="block">
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
  );
}
