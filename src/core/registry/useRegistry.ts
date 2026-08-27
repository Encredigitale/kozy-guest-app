import { useMemo } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  DashboardLayoutRow,
  EventWidgetRow,
  ResolvedPlacement,
  SurfaceContext,
  WidgetRoleBinding,
  WidgetRow,
  WidgetSize,
} from "./types";
import { isExclusiveWinnerFrom } from "@/core/extensions/exclusivity";

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

/** Event-level widget overrides (placement, size, enabled). */
export function useEventWidgets(eventId?: string) {
  return useQuery({
    queryKey: ["core", "event_widgets", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventWidgetRow[]> => {
      const { data, error } = await supabase
        .from("event_widgets" as never)
        .select("*")
        .eq("event_id", eventId!);
      if (error) throw error;
      return (data ?? []) as unknown as EventWidgetRow[];
    },
    staleTime: 15_000,
  });
}

/** Per-event extension activation rows (used to hide extension widgets). */
export function useEventExtensionRows(eventId?: string) {
  return useQuery({
    queryKey: ["core", "event_extensions", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<Array<{ extension_key: string; enabled: boolean }>> => {
      const { data, error } = await supabase
        .from("event_extensions")
        .select("extension_key, enabled")
        .eq("event_id", eventId!);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ extension_key: string; enabled: boolean }>;
    },
    staleTime: 15_000,
  });
}

/** Global dashboard layout (user_id IS NULL). */
export function useDashboardLayout(userId: string | null = null) {
  return useQuery({
    queryKey: ["core", "dashboard_layout", userId ?? "global"],
    queryFn: async (): Promise<DashboardLayoutRow[]> => {
      let q = supabase.from("dashboard_layout" as never).select("*");
      q = userId ? q.eq("user_id", userId) : q.is("user_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DashboardLayoutRow[];
    },
    staleTime: 15_000,
  });
}

/** Role bindings across all widgets (small table, cached long). */
export function useWidgetRoleBindings() {
  return useQuery({
    queryKey: ["core", "widget_role_bindings"],
    queryFn: async (): Promise<WidgetRoleBinding[]> => {
      const { data, error } = await supabase.from("widget_role_bindings" as never).select("*");
      if (error) throw error;
      return (data ?? []) as unknown as WidgetRoleBinding[];
    },
    staleTime: 60_000,
  });
}

/**
 * Registry query: returns widgets mounted on a given surface with resolved
 * size / order / config, applying:
 *   - status = 'published' (bypassed when ctx.includeDrafts)
 *   - event_widgets overrides (for surface 'event.detail' when eventId is set)
 *   - dashboard_layout overrides (for surface 'dashboard')
 *   - eventType filter, permissions, dependencies
 */
export function useSurfaceWidgets(surface: string, ctx: SurfaceContext = {}) {
  const q = useActiveWidgets();
  const { data: eventOverrides = [] } = useEventWidgets(
    surface === "event.detail" ? ctx.eventId : undefined,
  );
  const { data: dashboardLayout = [] } = useDashboardLayout(surface === "dashboard" ? null : undefined as never);
  const { data: bindings = [] } = useWidgetRoleBindings();
  const { data: extensionRows = [] } = useEventExtensionRows(
    surface === "event.detail" ? ctx.eventId : undefined,
  );

  const extensionStateMap = useMemo(() => {
    const m: Record<string, boolean | undefined> = {};
    for (const r of extensionRows) m[r.extension_key] = r.enabled;
    return m;
  }, [extensionRows]);

  const enabledIds = useMemo(() => new Set(q.data.map((w) => w.id)), [q.data]);

  const eventOverrideMap = useMemo(() => {
    const m = new Map<string, EventWidgetRow>();
    for (const row of eventOverrides) m.set(row.widget_id, row);
    return m;
  }, [eventOverrides]);

  const dashboardMap = useMemo(() => {
    const m = new Map<string, DashboardLayoutRow>();
    for (const row of dashboardLayout) m.set(row.widget_id, row);
    return m;
  }, [dashboardLayout]);

  const roleBindingsByWidget = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const b of bindings) {
      if (!m.has(b.widget_id)) m.set(b.widget_id, new Set());
      m.get(b.widget_id)!.add(b.role);
    }
    return m;
  }, [bindings]);

  const placements: ResolvedPlacement[] = useMemo(() => {
    const held = new Set<string>([
      ...(ctx.isAdmin ? ["admin"] : []),
      ...(ctx.roles ?? []),
      ...(ctx.contextualRoles ?? []),
    ]);

    return q.data
      .filter((w) => w.manifest?.surface === surface)
      .filter((w) => w.manifest?.visible !== false)
      .filter((w) => (ctx.includeDrafts || ctx.isAdmin ? true : (w.status ?? "published") === "published"))
      .filter((w) => {
        // Extension widgets (ext.<key>) : respecter la désactivation par événement
        // et l'exclusivité mutuelle entre extensions.
        if (surface !== "event.detail" || !ctx.eventId || !w.id.startsWith("ext.")) return true;
        const key = w.id.slice(4);
        if (extensionStateMap[key] === false) return false;
        return isExclusiveWinnerFrom(extensionStateMap, key);
      })
      .map<ResolvedPlacement | null>((w) => {
        // Event override: hides the widget when disabled explicitly
        if (surface === "event.detail" && ctx.eventId) {
          const ov = eventOverrideMap.get(w.id);
          if (ov && ov.enabled === false) return null;
          // Sélection à la création : si l'événement a une sélection de blocs,
          // n'afficher que ceux-ci (les extensions restent pilotées par event_extensions).
          if (!ov && eventOverrideMap.size > 0 && !w.id.startsWith("ext.")) return null;
          const size = (ov?.size ?? w.size ?? "full") as WidgetSize;
          const order = ov ? ov.position : (w.manifest?.order ?? 0);
          return {
            widget: w,
            size,
            order,
            config: { ...(w.manifest?.config ?? {}) },
          };
        }
        // Dashboard: only widgets present in the layout & visible
        if (surface === "dashboard") {
          const ov = dashboardMap.get(w.id);
          if (dashboardMap.size > 0) {
            if (!ov || ov.visible === false) return null;
            return {
              widget: w,
              size: ov.size,
              order: ov.position,
              config: { ...(w.manifest?.config ?? {}) },
            };
          }
        }
        return {
          widget: w,
          size: (w.size ?? "full") as WidgetSize,
          order: w.manifest?.order ?? 0,
          config: { ...(w.manifest?.config ?? {}) },
        };
      })
      .filter((p): p is ResolvedPlacement => p !== null)
      .filter(({ widget: w }) => {
        const types = w.manifest?.eventTypes ?? [];
        if (types.length === 0) return true;
        return ctx.eventType ? types.includes(ctx.eventType) : false;
      })
      .filter(({ widget: w }) => {
        const perms = new Set<string>(w.manifest?.permissions ?? []);
        for (const r of roleBindingsByWidget.get(w.id) ?? []) perms.add(r);
        if (perms.size === 0) return true;
        if (ctx.isAdmin) return true;
        for (const p of perms) if (held.has(p)) return true;
        return false;
      })
      .filter(({ widget: w }) =>
        (w.manifest?.dependencies ?? []).every((d) => enabledIds.has(d)),
      )
      .sort((a, b) => a.order - b.order);
  }, [q.data, surface, ctx.eventType, ctx.eventId, ctx.isAdmin, ctx.roles, ctx.contextualRoles, ctx.includeDrafts, enabledIds, eventOverrideMap, dashboardMap, roleBindingsByWidget, extensionStateMap]);

  return { ...q, data: placements };
}
