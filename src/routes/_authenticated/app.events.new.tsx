import { createFileRoute } from "@tanstack/react-router";
import { EventForm } from "@/core/eventForm/EventForm";

export const Route = createFileRoute("/_authenticated/app/events/new")({
  head: () => ({
    meta: [
      { title: "Créer un événement — Kozy" },
      { name: "description", content: "Créez votre événement en quelques blocs : type, informations, date, lieu." },
      { property: "og:title", content: "Créer un événement — Kozy" },
      { property: "og:description", content: "Créez votre événement en quelques blocs : type, informations, date, lieu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewEventPage,
});

function NewEventPage() {
  const { user } = Route.useRouteContext();
  return <EventForm mode="create" organizerId={user.id} />;
}
