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
 *
 * Permission tokens accepted in manifest.permissions[] (OR semantics —
 * user must hold AT LEAST ONE to see the widget):
 *   - "admin"                → app-level admin (user_roles)
 *   - "organizer" | "guest"  → contextual role for the current surface
 *   - any other string       → custom app-level role from ctx.roles
 * Empty permissions = visible to everyone.
 */
export function useSurfaceWidgets(surface: string, ctx: SurfaceContext = {}) {
  const q = useActiveWidgets();
  const enabledIds = useMemo(() => new Set(q.data.map((w) => w.id)), [q.data]);

  const widgets = useMemo(() => {
    const held = new Set<string>([
      ...(ctx.isAdmin ? ["admin"] : []),
      ...(ctx.roles ?? []),
      ...(ctx.contextualRoles ?? []),
    ]);
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
        // Admin is a super-role: always grants access.
        if (ctx.isAdmin) return true;
        return perms.some((p) => held.has(p));
      })
      .filter((w) => (w.manifest?.dependencies ?? []).every((d) => enabledIds.has(d)))
      .sort((a, b) => (a.manifest?.order ?? 0) - (b.manifest?.order ?? 0));
  }, [q.data, surface, ctx.eventType, ctx.isAdmin, ctx.roles, ctx.contextualRoles, enabledIds]);

  return { ...q, data: widgets };
}

