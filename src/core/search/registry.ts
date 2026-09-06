import type { SearchEntityType, SearchSourceId } from "./types";

/**
 * Search Registry — extension du Module Registry.
 * Chaque plugin déclare : quoi chercher, comment le présenter, où aller,
 * et de quel bloc il dépend (permissions / activation par événement).
 */
export type SearchSource = {
  id: SearchSourceId;
  entityType: SearchEntityType;
  /** Libellé de la catégorie affichée dans les résultats. */
  label: string;
  icon: string;
  /** Bloc du registry conditionnant l'activation sur un événement. */
  widgetId: string | null;
  /** Champs recherchés (documentation + back-office). */
  searchFields: string[];
  order: number;
};

export const SEARCH_SOURCES: SearchSource[] = [
  {
    id: "contacts",
    entityType: "contact",
    label: "Contacts",
    icon: "BookUser",
    widgetId: null,
    searchFields: ["name", "email", "phone"],
    order: 1,
  },
  {
    id: "events",
    entityType: "event",
    label: "Événements",
    icon: "Calendar",
    widgetId: null,
    searchFields: ["title", "type", "location", "description", "date"],
    order: 2,
  },
  {
    id: "invitations",
    entityType: "invitation",
    label: "Invités",
    icon: "MailCheck",
    widgetId: "event.guests",
    searchFields: ["name", "email", "status"],
    order: 3,
  },
  {
    id: "menu",
    entityType: "menu_item",
    label: "Menu & Thème",
    icon: "UtensilsCrossed",
    widgetId: "event.menu",
    searchFields: ["component_name", "item_name"],
    order: 4,
  },
  {
    id: "contributions",
    entityType: "contribution",
    label: "Contributions",
    icon: "HandHeart",
    widgetId: "ext.contributions",
    searchFields: ["label", "description", "unit"],
    order: 5,
  },
  {
    id: "guest-brings",
    entityType: "guest_bring",
    label: "Invité apporte",
    icon: "Gift",
    widgetId: "ext.guest-brings",
    searchFields: ["label", "note", "unit"],
    order: 6,
  },
  {
    id: "gifts",
    entityType: "gift",
    label: "Cadeaux",
    icon: "Gift",
    widgetId: "ext.gifts",
    searchFields: ["gift_name", "description", "recipient_names", "giver_names"],
    order: 7,
  },
  {
    id: "photos",
    entityType: "photo",
    label: "Photos",
    icon: "Camera",
    widgetId: "ext.photos",
    searchFields: ["description", "author_label"],
    order: 8,
  },
  {
    id: "notes",
    entityType: "note",
    label: "Notes",
    icon: "StickyNote",
    widgetId: "event.notes",
    searchFields: ["title", "content"],
    order: 9,
  },
];

export function findSearchSource(id: string): SearchSource | undefined {
  return SEARCH_SOURCES.find((s) => s.id === id);
}
