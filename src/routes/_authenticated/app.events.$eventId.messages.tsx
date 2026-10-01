import { createFileRoute } from "@tanstack/react-router";
import { MessagesScreen } from "@/extensions/messages/MessagesScreen";

export const Route = createFileRoute("/_authenticated/app/events/$eventId/messages")({
  validateSearch: (s: Record<string, unknown>): { m?: string } => ({
    m: typeof s.m === "string" && s.m ? s.m : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages — Ma Belle Table" }, { name: "robots", content: "noindex" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { eventId } = Route.useParams();
  const { m } = Route.useSearch();
  return <MessagesScreen eventId={eventId} focusId={m} />;
}
