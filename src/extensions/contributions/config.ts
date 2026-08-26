/** Configuration du plugin « Contributions » (public.invitation_settings, clé 'contributions'). */

export const CONTRIBUTIONS_SETTINGS_KEY = "contributions";

export const NEED_TYPES = ["quantity", "unique", "people", "money"] as const;
export type NeedType = (typeof NEED_TYPES)[number];

export const NEED_TYPE_LABELS: Record<NeedType, string> = {
  quantity: "Quantité",
  unique: "Un seul",
  people: "Personnes",
  money: "Participation",
};

export const NEED_TYPE_HINTS: Record<NeedType, string> = {
  quantity: "Plusieurs invités peuvent participer (6 bouteilles).",
  unique: "Dès qu'un invité s'engage, c'est couvert (1 vidéoprojecteur).",
  people: "Chaque engagement représente une ou plusieurs personnes.",
  money: "Engagement financier déclaré, sans paiement.",
};

export const NEED_PRIORITIES = ["normal", "important", "high"] as const;
export type NeedPriority = (typeof NEED_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<NeedPriority, string> = {
  normal: "Normale",
  important: "Important",
  high: "Prioritaire",
};

export const NEED_STATUSES = ["open", "closed", "cancelled"] as const;
export type NeedStatus = (typeof NEED_STATUSES)[number];

export const NEED_STATUS_LABELS: Record<NeedStatus, string> = {
  open: "Ouvert",
  closed: "Fermé",
  cancelled: "Annulé",
};

/** État de couverture dérivé (jamais stocké). */
export type CoverageState = "available" | "partial" | "covered" | "closed" | "cancelled";

export const COVERAGE_LABELS: Record<CoverageState, string> = {
  available: "Disponible",
  partial: "Partiellement couvert",
  covered: "Couvert",
  closed: "Fermé",
  cancelled: "Annulé",
};

export type ContributionsConfig = {
  /** Types d'événements concernés (vide = tous). */
  eventTypeKeys: string[];
  /** Un invité peut s'engager sur plusieurs besoins. */
  allowMultipleCommitments: boolean;
  /** Valeur par défaut proposée à la création d'un besoin. */
  allowOvercommitmentDefault: boolean;
  /** transparent = les invités voient qui apporte quoi. */
  participantVisibility: "transparent" | "discreet";
  /** L'invité peut modifier / annuler son engagement. */
  allowGuestEdit: boolean;
  remindersEnabled: boolean;
  notifyOrganizer: boolean;
  prioritiesEnabled: boolean;
  /** Types de besoins autorisés à la création. */
  needTypes: NeedType[];
  /** Libellé du bouton côté invité. */
  ctaLabel: string;
  /** Ordre d'affichage des besoins. */
  displayOrder: "coverage" | "priority" | "created";
};

export const DEFAULT_CONTRIBUTIONS_CONFIG: ContributionsConfig = {
  eventTypeKeys: [],
  allowMultipleCommitments: true,
  allowOvercommitmentDefault: false,
  participantVisibility: "transparent",
  allowGuestEdit: true,
  remindersEnabled: false,
  notifyOrganizer: true,
  prioritiesEnabled: true,
  needTypes: [...NEED_TYPES],
  ctaLabel: "Je contribue",
  displayOrder: "coverage",
};

export function normalizeContributionsConfig(raw: unknown): ContributionsConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_CONTRIBUTIONS_CONFIG } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_CONTRIBUTIONS_CONFIG)) {
    if (r[k] !== undefined && r[k] !== null) merged[k] = r[k];
  }
  const config = merged as ContributionsConfig;
  if (!Array.isArray(config.needTypes) || config.needTypes.length === 0) {
    config.needTypes = [...NEED_TYPES];
  }
  return config;
}

/**
 * Moteur générique : un besoin, un objectif, des engagements, un niveau de
 * couverture. Aucune logique par catégorie.
 */
export function computeCoverage(input: {
  target: number;
  committed: number;
  status: NeedStatus;
}): { committed: number; remaining: number; percent: number; state: CoverageState } {
  const target = Math.max(input.target, 0);
  const committed = Math.max(input.committed, 0);
  const remaining = Math.max(target - committed, 0);
  const percent = target > 0 ? Math.min(Math.round((committed / target) * 100), 100) : committed > 0 ? 100 : 0;
  let state: CoverageState;
  if (input.status === "cancelled") state = "cancelled";
  else if (input.status === "closed") state = "closed";
  else if (remaining <= 0 && target > 0) state = "covered";
  else if (committed > 0) state = "partial";
  else state = "available";
  return { committed, remaining, percent, state };
}

/** Formate « 6 bouteilles », « 3 personnes », « 100 € », « 1 ». */
export function formatQuantity(quantity: number, unitLabel: string | null, unitKind: string | null): string {
  const q = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/\.00$/, "");
  if (!unitLabel || unitKind === "none") return q;
  if (unitKind === "money") return `${q} ${unitLabel}`;
  const plural = quantity > 1 && !unitLabel.endsWith("s") ? `${unitLabel}s` : unitLabel;
  return `${q} ${plural}`;
}
