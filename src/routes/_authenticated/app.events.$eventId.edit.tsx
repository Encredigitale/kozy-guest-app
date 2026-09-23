import { createFileRoute } from "@tanstack/react-router";
import { EventForm } from "@/core/eventForm/EventForm";
import { useEvent } from "@/widgets/event-shared/queries";
import { fromStartsAt, type EventFormValues } from "@/core/eventForm/state";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/app/events/$eventId/edit")({
  head: () => ({
    meta: [
      { title: "Modifier l'événement — Kozy" },
      { name: "description", content: "Modifiez les informations principales de votre événement." },
      { property: "og:title", content: "Modifier l'événement — Kozy" },
      { property: "og:description", content: "Modifiez les informations principales de votre événement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditEventPage,
});

function EditEventPage() {
  const { eventId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data: ev, isLoading } = useEvent(eventId);

  const initial = useMemo<Partial<EventFormValues> | null>(() => {
    if (!ev) return null;
    const meta = (ev.metadata ?? {}) as Record<string, unknown>;
    const { date, time } = fromStartsAt(ev.starts_at);
    return {
      type: (meta["event_type"] as string) ?? "",
      customType: (meta["event_type_label"] as string) ?? "",
      title: ev.title ?? "",
      description: ev.description ?? "",
      date,
      time,
      address: (meta["address"] as string) ?? ev.location ?? "",
      postalCode: (meta["postal_code"] as string) ?? "",
      city: (meta["city"] as string) ?? "",
      organizerNote: (meta["organizer_note"] as string) ?? "",
    };
  }, [ev]);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Chargement…</p>;
  if (!initial) return <p className="p-6 text-sm text-destructive">Événement introuvable.</p>;

  return <EventForm mode="edit" eventId={eventId} initial={initial} organizerId={user.id} />;
}
