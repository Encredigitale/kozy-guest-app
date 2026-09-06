/**
 * Contrat commun entre le moteur de recherche et les plugins.
 * Le moteur ne connaît jamais les tables internes d'un plugin : il lit
 * uniquement le Search Registry (voir `registry.ts`).
 */
export type SearchEntityType =
  | "event"
  | "contact"
  | "invitation"
  | "menu_item"
  | "contribution"
  | "guest_bring"
  | "gift"
  | "photo"
  | "note";

export type SearchSourceId =
  | "events"
  | "contacts"
  | "invitations"
  | "menu"
  | "contributions"
  | "guest-brings"
  | "gifts"
  | "photos"
  | "notes";

/** Résultat standardisé renvoyé par le moteur. */
export type SearchResult = {
  id: string;
  source: SearchSourceId;
  entityType: SearchEntityType;
  title: string;
  subtitle?: string | null;
  /** Contexte (événement + date) affiché sous le résultat. */
  context?: string | null;
  eventId?: string | null;
  /** Identifiant du bloc à ouvrir sur la page événement (deep link). */
  blockId?: string | null;
  /** Référence transversale « personne » quand elle existe. */
  personIds?: string[];
  score: number;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  /** Sources réellement interrogées (permissions + activation). */
  sources: SearchSourceId[];
};

export type SearchSettings = {
  enabled: boolean;
  globalEnabled: boolean;
  eventEnabled: boolean;
  recentEnabled: boolean;
  recentRetentionDays: number;
  perCategory: number;
  maxResults: number;
  minChars: number;
  fuzzy: boolean;
  disabledSources: SearchSourceId[];
};

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  enabled: true,
  globalEnabled: true,
  eventEnabled: true,
  recentEnabled: true,
  recentRetentionDays: 90,
  perCategory: 3,
  maxResults: 50,
  minChars: 2,
  fuzzy: true,
  disabledSources: [],
};

export const SEARCH_SETTINGS_KEY = "search";

export function normalizeSearchSettings(raw: unknown): SearchSettings {
  const s = (raw ?? {}) as Partial<SearchSettings>;
  return {
    ...DEFAULT_SEARCH_SETTINGS,
    ...s,
    disabledSources: Array.isArray(s.disabledSources)
      ? (s.disabledSources as SearchSourceId[])
      : [],
  };
}
