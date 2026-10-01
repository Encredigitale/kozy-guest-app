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
  {
    key: "personal-info",
    name: "Informations utilisateur",
    description:
      "Fiche profil de référence : identité, coordonnées, photo, préférences alimentaires, allergies et consentements.",
    category: "profile",
    icon: "UserCircle2",
    version: "2.0.0",
    scope: "global",
    widgets: [
      { key: "ext.personal-info", component: lazy(() => import("@/extensions/user-info/UserInfoWidget")) },
    ],
    screens: [
      {
        path: "edit",
        label: "Mon profil",
        component: lazy(() => import("@/extensions/user-info/ProfileScreen")),
      },
    ],
    menu: [{ label: "Mon profil", path: "edit", icon: "UserCircle2", order: 5 }],
  },

  {
    key: "invitations",
    name: "Gestion des invitations",
    description:
      "Cycle de vie complet des invitations : invités, liens sécurisés, envoi, réponses, rappels et historique.",
    category: "engagement",
    icon: "MailCheck",
    version: "1.0.0",
    scope: "event",
    settingsComponent: lazy(() => import("@/extensions/invitations/AdminSettings")),
    widgets: [
      {
        key: "ext.invitations",
        component: lazy(() => import("@/extensions/invitations/InvitationsWidget")),
      },
    ],
  },
  {
    key: "guest-brings",
    name: "Invité apporte",
    description:
      "Permet aux invités ayant accepté de préciser ce qu'ils apportent, avec référentiel administrable et résumé pour l'organisateur.",
    category: "engagement",
    icon: "Gift",
    version: "1.0.0",
    scope: "event",
    settingsComponent: lazy(() => import("@/extensions/guest-brings/AdminSettings")),
    widgets: [
      {
        key: "ext.guest-brings",
        component: lazy(() => import("@/extensions/guest-brings/GuestBringsWidget")),
      },
    ],
  },
  {
    key: "contributions",
    name: "Contributions",
    description:
      "Moteur générique de besoins collaboratifs : l'organisateur définit des besoins, les invités s'engagent, la couverture se calcule automatiquement.",
    category: "engagement",
    icon: "HandHeart",
    version: "1.0.0",
    scope: "event",
    settingsComponent: lazy(() => import("@/extensions/contributions/AdminSettings")),
    widgets: [
      {
        key: "ext.contributions",
        component: lazy(() => import("@/extensions/contributions/ContributionsWidget")),
      },
    ],
  },
  {
    key: "photos",
    name: "Photos de l'événement",
    description:
      "Album collaboratif privé : ajout depuis mobile, optimisation automatique, visionneuse, modération et signalements.",
    category: "memories",
    icon: "Camera",
    version: "1.0.0",
    scope: "event",
    settingsComponent: lazy(() => import("@/extensions/photos/AdminSettings")),
    widgets: [
      {
        key: "ext.photos",
        component: lazy(() => import("@/extensions/photos/PhotosWidget")),
      },
    ],
  },
  {
    key: "gifts",
    name: "Cadeaux",
    description:
      "Mémoriser les cadeaux offerts pendant l'événement : quoi, à qui et par qui, avec visibilité paramétrable.",
    category: "memories",
    icon: "Gift",
    version: "1.0.0",
    scope: "event",
    settingsComponent: lazy(() => import("@/extensions/gifts/AdminSettings")),
    widgets: [
      { key: "ext.gifts", component: lazy(() => import("@/extensions/gifts/GiftsWidget")) },
    ],
  },
  {
    key: "recipes",
    name: "Recette",
    description:
      "Ajoute très simplement une recette (texte, photos, lien) à un élément du Menu & Thème, avec partage ciblé aux invités.",
    category: "catering",
    icon: "BookOpen",
    version: "1.0.0",
    scope: "event",
    settingsComponent: lazy(() => import("@/extensions/recipes/AdminSettings")),
  },
  {
    key: "messages",
    name: "Messages",
    description: "Échangez facilement avec tous les participants de votre événement.",
    category: "engagement",
    icon: "MessageCircle",
    version: "1.0.0",
    scope: "event",
    settingsComponent: lazy(() => import("@/extensions/messages/AdminSettings")),
    widgets: [
      { key: "ext.messages", component: lazy(() => import("@/extensions/messages/MessagesWidget")) },
    ],
  },
];



export function findExtensionByKey(key: string): ExtensionDefinition | undefined {
  return EXTENSIONS.find((e) => e.key === key);
}
