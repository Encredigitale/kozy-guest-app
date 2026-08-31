import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveWidgets, useEventWidgets, useEventExtensionRows } from "@/core/registry/useRegistry";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import { conflictingExtensionKeys } from "@/core/extensions/exclusivity";

/** Le bloc « Informations » appartient au Core : il n'est jamais désactivable. */
export const CORE_WIDGET_IDS = ["event.info"];

export type FeatureState = "active" | "inactive" | "available";

export type EventFeature = {
  id: string;
  component: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  state: FeatureState;
  recommended: boolean;
  position: number;
  isExtension: boolean;
};

/** Libellés utilisateurs des catégories techniques du registry. */
export const CATEGORY_LABELS: Record<string, string> = {
  engagement: "Inviter",
  "Événement": "Organiser",
  catering: "Organiser",
  memories: "Souvenirs",
  utility: "Pratique",
  export: "Pratique",
};

export function categoryLabel(cat: string | null | undefined): string {
  if (!cat) return "Autres";
  return CATEGORY_LABELS[cat] ?? cat;
}

/**
 * Catalogue des fonctionnalités d'un événement.
 * La page événement ne connaît aucun plugin : elle interroge le registry.
 */
export function useEventFeatures(eventId: string, eventTypeKey?: string | null) {
  const qc = useQueryClient();
  const { data: widgets, isLoading } = useActiveWidgets();
  const { data: eventWidgets = [] } = useEventWidgets(eventId);
  const { data: extensionRows = [] } = useEventExtensionRows(eventId);
  const { data: types } = useEventTypes();

  const recommendedIds = useMemo(() => {
    const t = (types ?? []).find((x) => x.key === eventTypeKey);
    return new Set(t?.default_widgets ?? []);
  }, [types, eventTypeKey]);

  const features = useMemo<EventFeature[]>(() => {
    const rowById = new Map(eventWidgets.map((r) => [r.widget_id, r]));
    const extById = new Map(extensionRows.map((r) => [r.extension_key, r.enabled]));

    return (widgets ?? [])
      .filter((w) => w.manifest?.surface === "event.detail")
      .filter((w) => (w.status ?? "published") === "published")
      .filter((w) => !CORE_WIDGET_IDS.includes(w.id))
      .map((w) => {
        const isExtension = w.id.startsWith("ext.");
        const extKey = isExtension ? w.id.slice(4) : null;
        const row = rowById.get(w.id);
        const extState = extKey ? extById.get(extKey) : undefined;

        let state: FeatureState = "available";
        if (row?.enabled === true || extState === true) state = "active";
        else if (row?.enabled === false || extState === false) state = "inactive";

        return {
          id: w.id,
          component: w.manifest?.component ?? w.id,
          name: w.name,
          description: w.description,
          icon: w.manifest?.icon ?? null,
          category: w.category ?? "Autres",
          state,
          recommended: recommendedIds.has(w.id),
          position: row?.position ?? w.manifest?.order ?? 0,
          isExtension,
        } satisfies EventFeature;
      })
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }, [widgets, eventWidgets, extensionRows, recommendedIds]);

  const active = features.filter((f) => f.state === "active");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["core", "event_widgets", eventId] });
    qc.invalidateQueries({ queryKey: ["core", "event_extensions", eventId] });
  };

  const setActive = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const maxPos = active.reduce((m, f) => Math.max(m, f.position), 0);
      const existing = features.find((f) => f.id === id);
      const position = existing?.state === "inactive" ? existing.position : maxPos + 1;

      const { error } = await supabase
        .from("event_widgets" as never)
        .upsert(
          { event_id: eventId, widget_id: id, enabled, position } as never,
          { onConflict: "event_id,widget_id" } as never,
        );
      if (error) throw error;

      if (id.startsWith("ext.")) {
        const key = id.slice(4);
        const rows = [
          { event_id: eventId, extension_key: key, enabled },
          ...(enabled
            ? conflictingExtensionKeys(key).map((k) => ({
                event_id: eventId,
                extension_key: k,
                enabled: false,
              }))
            : []),
        ];
        const { error: extErr } = await supabase
          .from("event_extensions")
          .upsert(rows, { onConflict: "event_id,extension_key" });
        if (extErr) throw extErr;

        // Les fonctionnalités exclusives concurrentes sont masquées, jamais purgées.
        if (enabled) {
          for (const k of conflictingExtensionKeys(key)) {
            await supabase
              .from("event_widgets" as never)
              .update({ enabled: false } as never)
              .eq("event_id", eventId)
              .eq("widget_id", `ext.${k}`);
          }
        }
      }
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const rows = orderedIds.map((widget_id, i) => ({
        event_id: eventId,
        widget_id,
        enabled: true,
        position: i,
      }));
      const { error } = await supabase
        .from("event_widgets" as never)
        .upsert(rows as never, { onConflict: "event_id,widget_id" } as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { features, active, isLoading, setActive, reorder };
}
