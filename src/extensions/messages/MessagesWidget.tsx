import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeMessages } from "@/lib/messages.functions";

export default function MessagesWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string | undefined;
  const fn = useServerFn(summarizeMessages);
  const { data } = useQuery({
    queryKey: ["messages", eventId, "summary"],
    enabled: !!eventId,
    queryFn: () => fn({ data: { eventId: eventId! } }),
    refetchInterval: 30_000,
  });
  if (!eventId || !data || !data.ok) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-full border-2 border-primary bg-card">
            <MessageCircle className="h-5 w-5" />
            {data.unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[11px] font-bold text-secondary-foreground">
                {data.unread}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">Messages</CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.unread > 0
                ? `${data.unread} nouveau${data.unread > 1 ? "x" : ""} message${data.unread > 1 ? "s" : ""}`
                : data.total > 0
                  ? `${data.total} message${data.total > 1 ? "s" : ""}`
                  : "Échangez avec tous les participants de l'événement."}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.last ? (
          <p className="line-clamp-2 text-sm">
            <span className="font-semibold">{data.last.authorName} :</span>{" "}
            {data.last.text || (data.last.photoUrl ? "📷 Photo" : "")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
        )}
        <Link
          to="/app/events/$eventId/messages"
          params={{ eventId }}
          className="inline-flex min-h-11 items-center rounded-full border-2 border-primary bg-accent px-4 text-sm font-semibold text-accent-foreground"
        >
          {data.total > 0 ? "Voir la discussion" : "Écrire un message"}
        </Link>
      </CardContent>
    </Card>
  );
}
