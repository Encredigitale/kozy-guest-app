import { useMemo } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SurfaceContext, WidgetRow } from "./types";

export const widgetsQueryOptions = queryOptions({
  queryKey: ["core", "widgets"],
  queryFn: async (): Promise<WidgetRow[]> => {
    const { data, error } = await supabase
      .from("widgets")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as WidgetRow[];
  },
  staleTime: 30_000,
});

export function useWidgets() {
  return useQuery(widgetsQueryOptions);
}

export function useActiveWidgets() {
  const q = useWidgets();
  return { ...q, data: (q.data ?? []).filter((w) => w.enabled) };
}

/**
 * Registry query: returns widgets mounted on a given surface, filtered by
 * event type, permissions and dependencies, sorted by manifest.order.
 * Screens should call this instead of hard-coding widget lists.
 */
export function useSurfaceWidgets(surface: string, ctx: SurfaceContext = {}) {
  const q = useActiveWidgets();
  const enabledIds = useMemo(() => new Set(q.data.map((w) => w.id)), [q.data]);

  const widgets = useMemo(() => {
    return q.data
      .filter((w) => w.manifest?.surface === surface)
      .filter((w) => w.manifest?.visible !== false)
      .filter((w) => {
        const types = w.manifest?.eventTypes ?? [];
        if (types.length === 0) return true;
        return ctx.eventType ? types.includes(ctx.eventType) : false;
      })
      .filter((w) => {
        const perms = w.manifest?.permissions ?? [];
        if (perms.length === 0) return true;
        if (perms.includes("admin") && !ctx.isAdmin) return false;
        const roles = ctx.roles ?? [];
        return perms.every((p) => p === "admin" || roles.includes(p));
      })
      .filter((w) => (w.manifest?.dependencies ?? []).every((d) => enabledIds.has(d)))
      .sort((a, b) => (a.manifest?.order ?? 0) - (b.manifest?.order ?? 0));
  }, [q.data, surface, ctx.eventType, ctx.isAdmin, ctx.roles, enabledIds]);

  return { ...q, data: widgets };
}
