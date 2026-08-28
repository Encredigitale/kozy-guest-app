import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { WidgetRenderer } from "@/core/registry/WidgetRenderer";
import { useSession } from "@/core/auth/useSession";
import { useEvent, useParticipants } from "@/widgets/event-shared/queries";
import { EventExtensionsPanel } from "@/core/extensions/EventExtensionsPanel";

export const Route = createFileRoute("/_authenticated/app/events/$eventId")({
  head: () => ({ meta: [{ title: "Événement — Kozy" }] }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { user, isAdmin } = useSession();
  const { data: ev } = useEvent(eventId);
  const { data: participants = [] } = useParticipants(eventId);

  const contextualRoles: string[] = [];
  if (ev && user) {
    if (ev.organizer_id === user.id) contextualRoles.push("organizer");
    if (participants.some((p) => p.user_id === user.id)) contextualRoles.push("guest");
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Link to="/app/events" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>
      <WidgetRenderer surface="event.detail" layout="grid-2" eventId={eventId} contextualRoles={contextualRoles} context={{ eventId }} />
      {isAdmin && <EventExtensionsPanel eventId={eventId} />}
    </div>
  );
}
