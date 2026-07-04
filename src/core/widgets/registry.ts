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
