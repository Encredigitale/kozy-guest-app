/** Configuration du plugin « Cadeaux » (public.invitation_settings, clé 'gifts'). */
export type GiftsConfig = {
  /** Types d'événements concernés (vide = tous). */
  eventTypeKeys: string[];
  /** Autoriser l'ajout d'une photo au cadeau. */
  photoEnabled: boolean;
  /** Plusieurs destinataires par cadeau. */
  multipleRecipients: boolean;
  /** Plusieurs personnes « offert par ». */
  multipleGivers: boolean;
  /** Saisie libre autorisée (personne hors carnet d'adresses). */
  freeTextEnabled: boolean;
  /** Utiliser le carnet d'adresses pour l'autocomplétion. */
  useContactsBook: boolean;
  /** Afficher les cadeaux dans « Mes moments ». */
  showInMemories: boolean;
  /** Visibilité par défaut d'un nouveau cadeau. */
  defaultVisibility: GiftVisibility;
};

export type GiftVisibility = "organizer" | "participants";

export const GIFT_VISIBILITY_LABELS: Record<GiftVisibility, string> = {
  organizer: "Privé organisateur",
  participants: "Participants",
};

export const DEFAULT_GIFTS_CONFIG: GiftsConfig = {
  eventTypeKeys: [],
  photoEnabled: true,
  multipleRecipients: true,
  multipleGivers: true,
  freeTextEnabled: true,
  useContactsBook: true,
  showInMemories: true,
  defaultVisibility: "organizer",
};

export const GIFTS_SETTINGS_KEY = "gifts";

export function normalizeGiftsConfig(raw: unknown): GiftsConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_GIFTS_CONFIG } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_GIFTS_CONFIG)) {
    if (r[k] !== undefined && r[k] !== null) merged[k] = r[k];
  }
  return merged as GiftsConfig;
}
