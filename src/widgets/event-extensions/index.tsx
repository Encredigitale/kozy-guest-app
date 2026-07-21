import { EventExtensionsPanel } from "@/core/extensions/EventExtensionsPanel";

type Props = { config?: { eventId?: string } };

export default function EventExtensionsWidget({ config }: Props) {
  const eventId = config?.eventId;
  if (!eventId) return null;
  return <EventExtensionsPanel eventId={eventId} />;
}
