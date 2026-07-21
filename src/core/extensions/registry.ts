import { lazy } from "react";
import type { ExtensionDefinition } from "./types";

/**
 * Extensions are self-contained plugins.
 * They can register widgets (auto-discovered by the widget registry),
 * screens (mounted at /app/x/<extension-key>/<path>), menu links, and
 * per-user or per-event settings. Extensions never modify the Core.
 *
 * To add a new extension:
 *   1. Create src/extensions/<key>/ with widget/screen components.
 *   2. Register it below with lazy imports.
 *   3. Insert a matching row in the `extensions` table so admins can toggle it.
 */
export const EXTENSIONS: ExtensionDefinition[] = [
  {
    key: "weather",
    name: "Météo",
    description: "Prévision météo pour la date de l'événement.",
    category: "utility",
    icon: "CloudSun",
    version: "1.0.0",
    scope: "both",
    settingsSchema: [
      { key: "defaultCity", label: "Ville par défaut", type: "text", default: "Paris" },
      {
        key: "unit",
        label: "Unité",
        type: "select",
        default: "celsius",
        options: [
          { value: "celsius", label: "Celsius" },
          { value: "fahrenheit", label: "Fahrenheit" },
        ],
      },
    ],
    widgets: [
      { key: "ext.weather", component: lazy(() => import("@/extensions/weather/WeatherWidget")) },
    ],
  },
  {
    key: "menu-suggestions",
    name: "Suggestions de menus",
    description: "Idées de menus par type d'événement.",
    category: "catering",
    icon: "UtensilsCrossed",
    version: "1.0.0",
    scope: "both",
    settingsSchema: [
      {
        key: "diet",
        label: "Régime préféré",
        type: "select",
        default: "any",
        options: [
          { value: "any", label: "Tout" },
          { value: "vegetarian", label: "Végétarien" },
          { value: "vegan", label: "Végan" },
          { value: "gluten-free", label: "Sans gluten" },
        ],
      },
      { key: "includeDesserts", label: "Inclure les desserts", type: "boolean", default: true },
    ],
    widgets: [
      { key: "ext.menu-suggestions", component: lazy(() => import("@/extensions/menu-suggestions/MenuSuggestionsWidget")) },
    ],
    screens: [
      {
        path: "menu-suggestions",
        label: "Suggestions de menus",
        component: lazy(() => import("@/extensions/menu-suggestions/MenuSuggestionsScreen")),
      },
    ],
    menu: [{ label: "Menus", path: "menu-suggestions", icon: "UtensilsCrossed", order: 10 }],
  },
  {
    key: "pdf-export",
    name: "Export PDF",
    description: "Exporter un événement au format PDF.",
    category: "export",
    icon: "FileDown",
    version: "1.0.0",
    scope: "event",
    widgets: [
      { key: "ext.pdf-export", component: lazy(() => import("@/extensions/pdf-export/PdfExportWidget")) },
    ],
  },
  {
    key: "stats-advanced",
    name: "Statistiques avancées",
    description: "Tableau de bord analytique des événements.",
    category: "analytics",
    icon: "BarChart3",
    version: "1.0.0",
    scope: "global",
    screens: [
      {
        path: "stats",
        label: "Statistiques",
        component: lazy(() => import("@/extensions/stats-advanced/StatsScreen")),
      },
    ],
    menu: [{ label: "Statistiques", path: "stats", icon: "BarChart3", order: 20 }],
  },
];

export function findExtensionByKey(key: string): ExtensionDefinition | undefined {
  return EXTENSIONS.find((e) => e.key === key);
}
