import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar,
  MapPin,
  Search,
  CalendarDays,
  Mail,
  Heart,
  Users,
  CheckCircle2,
  ArrowUpDown,
} from "lucide-react";
import { eventTypeLabel } from "@/lib/event-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WidgetContext } from "@/core/widgets";

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  event_subtype: string | null;
  event_at: string;
  location: string | null;
  owner_id: string;
};

type GuestRow = {
  id: string;
  event_id: string;
  rsvp_status: string | null;
};

type Kind = "organizer" | "invited" | "memory";
type Filter = "all" | "organizer" | "invited" | "memory";
type Sort = "date_desc" | "date_asc" | "type";

type EnrichedEvent = EventRow & {
  kind: Kind;
  guestCount: number;
  confirmedCount: number;
  myGuest?: GuestRow;
};

export function DashboardEventsWidget({ context }: { context: WidgetContext }) {
  const userId = context.userId as string;
  const userEmail = (context.userEmail as string | undefined) ?? "";
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("date_desc");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [ownedRes, invitedGuestsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, event_type, event_subtype, event_at, location, owner_id")
          .eq("owner_id", userId),
        userEmail
          ? supabase
              .from("event_guests")
              .select("id, event_id, rsvp_status")
              .eq("email", userEmail)
          : Promise.resolve({ data: [] as GuestRow[] }),
      ]);

      const owned = (ownedRes.data ?? []) as EventRow[];
      const invitedGuests = (invitedGuestsRes.data ?? []) as GuestRow[];
      const invitedEventIds = invitedGuests
        .map((g) => g.event_id)
        .filter((id) => !owned.some((e) => e.id === id));

      const invitedEventsRes = invitedEventIds.length
        ? await supabase
            .from("events")
            .select("id, title, event_type, event_subtype, event_at, location, owner_id")
            .in("id", invitedEventIds)
        : { data: [] as EventRow[] };
      const invitedEvents = (invitedEventsRes.data ?? []) as EventRow[];

      const allEventIds = [...owned.map((e) => e.id), ...invitedEvents.map((e) => e.id)];
      const guestsRes = allEventIds.length
        ? await supabase
            .from("event_guests")
            .select("id, event_id, rsvp_status")
            .in("event_id", allEventIds)
        : { data: [] as GuestRow[] };
      const allGuests = (guestsRes.data ?? []) as GuestRow[];

      const now = Date.now();
      const enrich = (e: EventRow, baseKind: "organizer" | "invited"): EnrichedEvent => {
        const past = new Date(e.event_at).getTime() < now;
        const guests = allGuests.filter((g) => g.event_id === e.id);
        const confirmed = guests.filter((g) => g.rsvp_status === "yes").length;
        const myGuest = invitedGuests.find((g) => g.event_id === e.id);
        return {
          ...e,
          kind: past ? "memory" : baseKind,
          guestCount: guests.length,
          confirmedCount: confirmed,
          myGuest,
        };
      };

      const list = [
        ...owned.map((e) => enrich(e, "organizer")),
        ...invitedEvents.map((e) => enrich(e, "invited")),
      ];
      setEvents(list);
      setLoading(false);
    })();
  }, [userId, userEmail]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = events;
    if (filter !== "all") list = list.filter((e) => e.kind === filter);
    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q) ||
          eventTypeLabel(e.event_type).toLowerCase().includes(q) ||
          new Date(e.event_at).toLocaleDateString("fr-FR").includes(q),
      );
    }
    const sorted = [...list];
    if (sort === "date_desc") sorted.sort((a, b) => +new Date(b.event_at) - +new Date(a.event_at));
    if (sort === "date_asc") sorted.sort((a, b) => +new Date(a.event_at) - +new Date(b.event_at));
    if (sort === "type") sorted.sort((a, b) => a.event_type.localeCompare(b.event_type));
    return sorted;
  }, [events, filter, query, sort]);

  const organizer = filtered.filter((e) => e.kind === "organizer");
  const invited = filtered.filter((e) => e.kind === "invited");
  const memories = filtered.filter((e) => e.kind === "memory");

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un événement, un lieu…"
            className="pl-9 rounded-full h-11 bg-card"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full h-11 w-11 shrink-0">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Trier par</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSort("date_desc")}>
              Date · Plus récent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("date_asc")}>
              Date · Plus ancien
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("type")}>Type d'événement</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-none">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="Tous" />
        <FilterPill
          active={filter === "organizer"}
          onClick={() => setFilter("organizer")}
          label="Mes événements"
          dotClass="bg-[hsl(210_80%_55%)]"
        />
        <FilterPill
          active={filter === "invited"}
          onClick={() => setFilter("invited")}
          label="Invitations"
          dotClass="bg-[hsl(28_90%_58%)]"
        />
        <FilterPill
          active={filter === "memory"}
          onClick={() => setFilter("memory")}
          label="Souvenirs"
          dotClass="bg-[hsl(150_45%_45%)]"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : events.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Aucun événement ne correspond à votre recherche.
        </p>
      ) : (
        <div className="space-y-10 animate-fade-in">
          {(filter === "all" || filter === "organizer") && organizer.length > 0 && (
            <Section
              title="Mes événements"
              subtitle="Vous êtes l'organisateur"
              Icon={CalendarDays}
              accentClass="text-[hsl(210_80%_55%)]"
              accentBgClass="bg-[hsl(210_80%_55%/0.12)]"
              accentBarClass="bg-[hsl(210_80%_55%)]"
              events={organizer}
            />
          )}
          {(filter === "all" || filter === "invited") && invited.length > 0 && (
            <Section
              title="Mes invitations"
              subtitle="Vous êtes invité"
              Icon={Mail}
              accentClass="text-[hsl(28_90%_50%)]"
              accentBgClass="bg-[hsl(28_90%_58%/0.15)]"
              accentBarClass="bg-[hsl(28_90%_58%)]"
              events={invited}
            />
          )}
          {(filter === "all" || filter === "memory") && memories.length > 0 && (
            <Section
              title="Mes souvenirs"
              subtitle="Moments partagés"
              Icon={Heart}
              accentClass="text-[hsl(150_45%_38%)]"
              accentBgClass="bg-[hsl(150_45%_45%/0.15)]"
              accentBarClass="bg-[hsl(150_45%_45%)]"
              events={memories}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  dotClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dotClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
      }`}
    >
      {dotClass && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
      {label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  Icon,
  accentClass,
  accentBgClass,
  accentBarClass,
  events,
}: {
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  accentBgClass: string;
  accentBarClass: string;
  events: EnrichedEvent[];
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-10 w-10 rounded-2xl grid place-items-center ${accentBgClass}`}>
          <Icon className={`h-5 w-5 ${accentClass}`} />
        </div>
        <div>
          <h2 className="font-serif text-xl leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            accentClass={accentClass}
            accentBarClass={accentBarClass}
            accentBgClass={accentBgClass}
          />
        ))}
      </div>
    </section>
  );
}

function EventCard({
  event: e,
  accentClass,
  accentBarClass,
  accentBgClass,
}: {
  event: EnrichedEvent;
  accentClass: string;
  accentBarClass: string;
  accentBgClass: string;
}) {
  const badgeLabel =
    e.kind === "organizer" ? "Organisateur" : e.kind === "invited" ? "Invité" : "Terminé";

  return (
    <Link to="/app/events/$eventId" params={{ eventId: e.id }} className="block group">
      <Card className="rounded-3xl border-border/60 shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden">
        <div className={`h-1 w-full ${accentBarClass}`} />
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                {eventTypeLabel(e.event_type)}
                {e.event_subtype ? ` · ${e.event_subtype}` : ""}
              </div>
              <h3 className="font-serif text-lg leading-tight truncate">{e.title}</h3>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 rounded-full text-[11px] font-medium border-transparent ${accentBgClass} ${accentClass}`}
            >
              {badgeLabel}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {new Date(e.event_at).toLocaleString("fr-FR", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {e.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{e.location}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/50 text-sm">
            {e.kind === "organizer" && (
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {e.guestCount} invité{e.guestCount > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {e.confirmedCount} confirmé{e.confirmedCount > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {e.kind === "invited" && (
              <div className="text-muted-foreground">
                {e.myGuest?.rsvp_status === "yes" ? (
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="h-4 w-4" /> Vous avez confirmé
                  </span>
                ) : e.myGuest?.rsvp_status === "no" ? (
                  <span>Vous avez décliné</span>
                ) : (
                  <span className="text-foreground">Réponse attendue</span>
                )}
              </div>
            )}
            {e.kind === "memory" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                {e.guestCount} participant{e.guestCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <Card className="rounded-3xl border-border/60 shadow-none">
      <CardContent className="py-14 flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-3xl bg-accent grid place-items-center mb-5">
          <Calendar className="h-7 w-7 text-primary" />
        </div>
        <h2 className="font-serif text-xl mb-2">Vous n'avez encore aucun événement</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Créez votre premier moment de convivialité et rassemblez vos proches.
        </p>
        <Button asChild size="lg" className="rounded-full">
          <Link to="/app/events/new">
            <Plus className="h-4 w-4" />
            Créer un événement
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
