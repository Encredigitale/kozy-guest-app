import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { WidgetRenderer } from "@/core/registry/WidgetRenderer";

export const Route = createFileRoute("/_authenticated/app/events/$eventId")({
  head: () => ({ meta: [{ title: "Événement — Framework" }] }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Link to="/app/events" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>
      <WidgetRenderer surface="event.detail" context={{ eventId }} />
    </div>
  );
}
