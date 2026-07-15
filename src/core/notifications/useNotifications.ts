import { useEffect } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NotificationRow = {
  id: string;
  user_id: string;
  channel: "inapp" | "email" | "push";
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  status: "pending" | "sent" | "failed";
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
};

export const notificationsQueryOptions = queryOptions({
  queryKey: ["core", "notifications"],
  queryFn: async (): Promise<NotificationRow[]> => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as unknown as NotificationRow[];
  },
});

export function useNotifications() {
  const qc = useQueryClient();
  const query = useQuery(notificationsQueryOptions);

  useEffect(() => {
    const channel = supabase
      .channel("notifications-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: notificationsQueryOptions.queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllRead(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}
