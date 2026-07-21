import { useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EXTENSIONS } from "./registry";
import { checkExtensionCompatibility } from "@/core/version";
import type { ExtensionDefinition, ExtensionRow, EventExtensionRow } from "./types";

export const extensionsQueryOptions = queryOptions({
  queryKey: ["core", "extensions"],
  queryFn: async (): Promise<ExtensionRow[]> => {
    const { data, error } = await supabase
      .from("extensions")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ExtensionRow[];
  },
  staleTime: 30_000,
});

export function useExtensions() {
  return useQuery(extensionsQueryOptions);
}

export function eventExtensionsQueryOptions(eventId?: string) {
  return queryOptions({
    queryKey: ["core", "event_extensions", eventId ?? null],
    enabled: !!eventId,
    queryFn: async (): Promise<EventExtensionRow[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("event_extensions")
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as unknown as EventExtensionRow[];
    },
    staleTime: 30_000,
  });
}

/**
 * Active extensions: globally enabled AND code-side registered AND compatible
 * AND (if `eventId` provided and scope is event/both) not explicitly disabled
 * for that event.
 */
export function useActiveExtensions(eventId?: string) {
  const q = useExtensions();
  const eq = useQuery(eventExtensionsQueryOptions(eventId));

  const active = useMemo<ExtensionDefinition[]>(() => {
    const rows = q.data ?? [];
    const eventRows = eq.data ?? [];
    const disabledForEvent = new Set(
      eventRows.filter((r) => r.enabled === false).map((r) => r.extension_key),
    );

    return EXTENSIONS.filter((def) => {
      const row = rows.find((r) => r.key === def.key);
      if (!row || !row.enabled) return false;
      if (!checkExtensionCompatibility(row).ok) return false;
      if (eventId && (row.scope === "event" || row.scope === "both")) {
        if (disabledForEvent.has(def.key)) return false;
      }
      // Order the menu links according to menu_order
      const order = row.menu_order ?? {};
      if (def.menu && Object.keys(order).length) {
        def.menu = [...def.menu].sort(
          (a, b) => (order[a.path] ?? a.order ?? 0) - (order[b.path] ?? b.order ?? 0),
        );
      }
      return true;
    });
  }, [q.data, eq.data, eventId]);

  return { ...q, data: active };
}
