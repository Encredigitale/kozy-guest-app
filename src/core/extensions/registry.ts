import { lazy } from "react";
import type { ExtensionDefinition } from "./types";

/**
 * Extensions are self-contained plugins.
 * They can register widgets (auto-discovered by the widget registry),
 * screens (mounted at /app/x/<extension-key>/<path>) and menu links.
 * Extensions never modify the Core — they only declare additions.
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
    widgets: [
      {
        key: "ext.weather",
        component: lazy(() => import("@/extensions/weather/WeatherWidget")),
      },
    ],
  },
  {
    key: "menu-suggestions",
    name: "Suggestions de menus",
    description: "Idées de menus par type d'événement.",
    category: "catering",
    icon: "UtensilsCrossed",
    widgets: [
      {
        key: "ext.menu-suggestions",
        component: lazy(() => import("@/extensions/menu-suggestions/MenuSuggestionsWidget")),
      },
    ],
    screens: [
      {
        path: "menu-suggestions",
        label: "Suggestions de menus",
        component: lazy(() => import("@/extensions/menu-suggestions/MenuSuggestionsScreen")),
      },
    ],
    menu: [{ label: "Menus", path: "menu-suggestions", icon: "UtensilsCrossed" }],
  },
  {
    key: "pdf-export",
    name: "Export PDF",
    description: "Exporter un événement au format PDF.",
    category: "export",
    icon: "FileDown",
    widgets: [
      {
        key: "ext.pdf-export",
        component: lazy(() => import("@/extensions/pdf-export/PdfExportWidget")),
      },
    ],
  },
  {
    key: "stats-advanced",
    name: "Statistiques avancées",
    description: "Tableau de bord analytique des événements.",
    category: "analytics",
    icon: "BarChart3",
    screens: [
      {
        path: "stats",
        label: "Statistiques",
        component: lazy(() => import("@/extensions/stats-advanced/StatsScreen")),
      },
    ],
    menu: [{ label: "Statistiques", path: "stats", icon: "BarChart3" }],
  },
];

export function findExtensionByKey(key: string): ExtensionDefinition | undefined {
  return EXTENSIONS.find((e) => e.key === key);
}
