import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";

export type WidgetItem = {
  id: string;
  owner_id: string;
  widget_key: string;
  scope_type: "event" | "user" | "global";
  scope_id: string | null;
  payload: Record<string, unknown>;
  position: number;
  done: boolean;
  created_at: string;
  updated_at: string;
};

export type Scope = { scope_type: "event" | "user" | "global"; scope_id: string | null };

export function scopeFromEventId(eventId?: string): Scope {
  return eventId
    ? { scope_type: "event", scope_id: eventId }
    : { scope_type: "user", scope_id: null };
}

export function useWidgetItems(widgetKey: string, scope: Scope) {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = ["widget_items", widgetKey, scope.scope_type, scope.scope_id, user?.id ?? null];

  const query = useQuery<WidgetItem[]>({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("widget_items")
        .select("*")
        .eq("widget_key", widgetKey)
        .eq("scope_type", scope.scope_type)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      q = scope.scope_id ? q.eq("scope_id", scope.scope_id) : q.is("scope_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WidgetItem[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: async (input: { payload?: Record<string, unknown>; done?: boolean; position?: number }) => {
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("widget_items")
        .insert({
          owner_id: user.id,
          widget_key: widgetKey,
          scope_type: scope.scope_type,
          scope_id: scope.scope_id,
          payload: input.payload ?? {},
          done: input.done ?? false,
          position: input.position ?? (query.data?.length ?? 0),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as WidgetItem;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Pick<WidgetItem, "payload" | "done" | "position">> }) => {
      const { error } = await supabase.from("widget_items").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("widget_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Upsert a single-row widget (notes, localisation…). */
  const upsertSingle = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!user) throw new Error("Non authentifié");
      const existing = query.data?.[0];
      if (existing) {
        const { error } = await supabase.from("widget_items").update({ payload }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("widget_items").insert({
          owner_id: user.id,
          widget_key: widgetKey,
          scope_type: scope.scope_type,
          scope_id: scope.scope_id,
          payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return { ...query, items: query.data ?? [], create, update, remove, upsertSingle };
}
