/** Types client-safe partagés par la page publique d'invitation. */
import type { GuestBringsConfig } from "./config";

export type ContributionChoicePublic = {
  id: string;
  label: string;
};

export type ContributionTypePublic = {
  id: string;
  key: string;
  label: string;
  icon: string;
  allowSubchoices: boolean;
  allowFreeText: boolean;
  choices: ContributionChoicePublic[];
};

export type GuestContributionPublic = {
  id: string;
  typeId: string | null;
  typeKey: string | null;
  typeLabel: string | null;
  icon: string;
  choiceId: string | null;
  label: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  status: string;
};

export type GuestBringsContext = {
  enabled: boolean;
  config: GuestBringsConfig;
  categories: ContributionTypePublic[];
  contributions: GuestContributionPublic[];
  /** Nombre d'apports déjà déclarés par les autres invités, par clé de catégorie. */
  othersByType: Record<string, number>;
  /** Suggestions issues du module Menu / Thème (optionnel). */
  menuHints: string[];
};

export type GuestBringsResult =
  | { ok: true; context: GuestBringsContext }
  | { ok: false; error: string };
