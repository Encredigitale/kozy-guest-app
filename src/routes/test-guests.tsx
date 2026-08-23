import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EventGuestsWidget from "@/widgets/event-guests/EventGuestsWidget";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test-guests")({
  component: TestGuestsPage,
});

const mockParticipants = [
  { id: "1", event_id: "evt", user_id: null, email: "marie.dupont@example.com", role: "guest" as const, rsvp_status: "accepted" as const },
  { id: "2", event_id: "evt", user_id: null, email: "pierre.martin@example.com", role: "guest" as const, rsvp_status: "pending" as const },
  { id: "3", event_id: "evt", user_id: null, email: "sophie@example.com", role: "organizer" as const, rsvp_status: "accepted" as const },
  { id: "4", event_id: "evt", user_id: null, email: "jean.doe@example.com", role: "guest" as const, rsvp_status: "declined" as const },
];

const mockEvent = { id: "evt", organizer_id: "user-1", title: "Test", description: null, status: "published" as const, starts_at: null, ends_at: null, location: null, metadata: {} };

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity } },
});

qc.setQueryData(["event", "evt"], mockEvent);
qc.setQueryData(["event", "evt", "participants"], mockParticipants);

function TestGuestsPage() {
  return (
    <QueryClientProvider client={qc}>
      <div className="p-6 max-w-2xl mx-auto">
        <EventGuestsWidget config={{ eventId: "evt" }} />
      </div>
    </QueryClientProvider>
  );
}
