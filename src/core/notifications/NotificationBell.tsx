import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useNotifications,
  markNotificationRead,
  markAllRead,
  notificationsQueryOptions,
} from "./useNotifications";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function openNotificationTarget(n: { type?: string; metadata?: unknown }) {
  const m = (n.metadata ?? {}) as { eventId?: string; messageId?: string };
  if (n.type === "event_message" && m.eventId) {
    window.location.assign(`/app/events/${m.eventId}/messages${m.messageId ? `?m=${m.messageId}` : ""}`);
  }
}

export function NotificationBell() {
  const { data } = useNotifications();
  const qc = useQueryClient();
  const items = data ?? [];
  const unread = useMemo(() => items.filter((n) => !n.read_at), [items]);

  const onOpen = async (id: string) => {
    await markNotificationRead(id);
    qc.invalidateQueries({ queryKey: notificationsQueryOptions.queryKey });
  };

  const onReadAll = async () => {
    await markAllRead(unread.map((n) => n.id));
    qc.invalidateQueries({ queryKey: notificationsQueryOptions.queryKey });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium grid place-items-center">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-medium">Notifications</p>
          {unread.length > 0 && (
            <button onClick={onReadAll} className="text-xs text-muted-foreground hover:text-foreground">
              Tout marquer lu
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Aucune notification.</p>
          ) : (
            items.slice(0, 15).map((n) => (
              <button
                key={n.id}
                onClick={() => { if (!n.read_at) onOpen(n.id); openNotificationTarget(n); }}
                className={`w-full text-left px-3 py-3 border-b last:border-0 hover:bg-accent ${
                  !n.read_at ? "bg-accent/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary mt-1.5" />}
                </div>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
              </button>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/app/notifications">Voir tout</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
