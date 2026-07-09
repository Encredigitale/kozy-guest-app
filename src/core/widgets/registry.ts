import type { WidgetDefinition, WidgetSurface, WidgetContext } from "./types";

/**
 * Registre central des Widgets.
 *
 * Les surfaces (écrans) n'importent JAMAIS un widget directement — elles
 * interrogent uniquement ce Registry via `getWidgetsFor(surface, context)`.
 *
 * Ajouter un widget = un appel à `registerWidget` dans src/widgets/index.ts.
 * Aucun écran existant n'a besoin d'être modifié.
 */
const widgets = new Map<string, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition) {
  if (widgets.has(def.id)) {
    // En dev, un HMR peut réévaluer le module — on remplace silencieusement.
    widgets.set(def.id, def);
    return;
  }
  widgets.set(def.id, def);
}

export function getWidget(id: string): WidgetDefinition | undefined {
  return widgets.get(id);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(widgets.values());
}

/**
 * Retourne les widgets à afficher sur une surface donnée, filtrés par
 * type d'événement et statut d'activation, puis triés par `order`.
 */
export function getWidgetsFor(
  surface: WidgetSurface,
  context: WidgetContext = {},
): WidgetDefinition[] {
  return Array.from(widgets.values())
    .filter((w) => w.surface === surface)
    .filter((w) => w.enabled || w.required)
    .filter((w) => {
      if (!w.eventTypes || w.eventTypes.length === 0) return true;
      if (!context.eventType) return true;
      return w.eventTypes.includes(context.eventType);
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Activation / désactivation dynamique (utilisé plus tard par le Studio).
 */
export function setWidgetEnabled(id: string, enabled: boolean) {
  const w = widgets.get(id);
  if (!w || w.required) return;
  widgets.set(id, { ...w, enabled });
}

/**
 * Surcharge persistée (table `widget_configs`). Chaque champ est optionnel :
 * seuls les champs présents écrasent le défaut déclaré via `registerWidget`.
 */
export type WidgetConfigOverride = {
  widget_id: string;
  enabled?: boolean | null;
  display_order?: number | null;
  event_types?: string[] | null;
};

/**
 * Applique un lot de surcharges au Registry. Les widgets marqués `required`
 * restent activés — seuls `order` et `eventTypes` peuvent être modifiés.
 */
export function applyWidgetConfigs(configs: WidgetConfigOverride[]) {
  for (const cfg of configs) {
    const w = widgets.get(cfg.widget_id);
    if (!w) continue;
    widgets.set(cfg.widget_id, {
      ...w,
      enabled: w.required ? true : cfg.enabled ?? w.enabled,
      order: cfg.display_order ?? w.order,
      eventTypes: cfg.event_types ?? w.eventTypes,
    });
  }
}
