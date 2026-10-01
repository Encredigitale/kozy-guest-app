import { openNotificationTarget } from "@/core/notifications/NotificationBell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications, markNotificationRead, markAllRead, notificationsQueryOptions } from "@/core/notifications/useNotifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Smartphone, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  head: () => ({ meta: [
    { title: "Notifications — Ma Belle Table" },
    { name: "description", content: "Consultez vos notifications Ma Belle Table." },
    { property: "og:title", content: "Notifications — Ma Belle Table" },
    { property: "og:description", content: "Consultez vos notifications Ma Belle Table." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: NotificationsPage,
});

function iconFor(channel: string) {
  if (channel === "email") return Mail;
  if (channel === "push") return Smartphone;
  return MessageSquare;
}

function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const qc = useQueryClient();
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at);

  const readAll = async () => {
    await markAllRead(unread.map((n) => n.id));
    qc.invalidateQueries({ queryKey: notificationsQueryOptions.queryKey });
  };

  const readOne = async (id: string) => {
    await markNotificationRead(id);
    qc.invalidateQueries({ queryKey: notificationsQueryOptions.queryKey });
  };

  return (
    <div className="kozy-page max-w-3xl">
      <div className="kozy-title-band flex items-start justify-between gap-4 p-5 md:p-6">
        <div>
          <h1 className="font-serif text-3xl text-primary">Notifications</h1>
          <p className="text-sm text-foreground/70 mt-1">
            {unread.length > 0 ? `${unread.length} non lue${unread.length > 1 ? "s" : ""}` : "Tout est lu."}
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" onClick={readAll} className="rounded-full">
            Tout marquer lu
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="p-10 text-center">
              <Bell className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Aucune notification pour le moment.</p>
              <Button asChild variant="link" className="mt-3">
                <Link to="/app">Retour au tableau de bord</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          items.map((n) => {
            const Icon = iconFor(n.channel);
            return (
              <Card
                key={n.id}
                onClick={() => { if (!n.read_at) readOne(n.id); openNotificationTarget(n); }}
                className={`rounded-2xl border-border/60 cursor-pointer transition-colors ${
                  !n.read_at ? "bg-accent/30" : ""
                }`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(n.created_at).toLocaleString("fr-FR")} · {n.channel} · {n.type}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
