/** Configuration du plugin « Invité apporte » (public.invitation_settings, clé 'guest-brings'). */
export type GuestBringsConfig = {
  /** Types d'événements concernés (vide = tous). */
  eventTypeKeys: string[];
  /** Autoriser plusieurs apports par invité. */
  multiple: boolean;
  quantityEnabled: boolean;
  notesEnabled: boolean;
  freeTextEnabled: boolean;
  remindersEnabled: boolean;
  notifyOrganizer: boolean;
  /** Utiliser les composantes du module Menu / Thème pour affiner les suggestions. */
  useMenuContext: boolean;
  /** Afficher « 2 personnes apportent déjà du vin ». */
  showDuplicateHint: boolean;
};

export const DEFAULT_GUEST_BRINGS_CONFIG: GuestBringsConfig = {
  eventTypeKeys: [],
  multiple: true,
  quantityEnabled: true,
  notesEnabled: true,
  freeTextEnabled: true,
  remindersEnabled: false,
  notifyOrganizer: true,
  useMenuContext: false,
  showDuplicateHint: true,
};

export const GUEST_BRINGS_SETTINGS_KEY = "guest-brings";

export function normalizeGuestBringsConfig(raw: unknown): GuestBringsConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_GUEST_BRINGS_CONFIG } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_GUEST_BRINGS_CONFIG)) {
    if (r[k] !== undefined && r[k] !== null) merged[k] = r[k];
  }
  return merged as GuestBringsConfig;
}

export const CONTRIBUTION_STATUSES = ["declared", "modified", "removed", "confirmed", "brought"] as const;
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  declared: "Déclaré",
  modified: "Modifié",
  removed: "Supprimé",
  confirmed: "Confirmé",
  brought: "Apporté",
};

export const CONTRIBUTION_UNITS = ["", "bouteille(s)", "gâteau(x)", "bouquet(s)", "part(s)", "kg", "L", "pièce(s)"];
