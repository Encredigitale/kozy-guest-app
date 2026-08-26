import type { ContributionsConfig, CoverageState, NeedPriority, NeedType } from "./config";

export type PublicParticipant = {
  name: string;
  quantity: number;
};

export type PublicNeed = {
  id: string;
  label: string;
  description: string | null;
  categoryLabel: string | null;
  icon: string;
  needType: NeedType;
  priority: NeedPriority;
  target: number;
  unitLabel: string | null;
  unitKind: string | null;
  allowOvercommitment: boolean;
  committed: number;
  remaining: number;
  percent: number;
  state: CoverageState;
  /** Détail visible seulement en mode transparent. */
  participants: PublicParticipant[];
  myCommitment: { id: string; quantity: number; note: string | null } | null;
};

export type ContributionsContext = {
  enabled: boolean;
  config: ContributionsConfig;
  needs: PublicNeed[];
};

export type ContributionsResult =
  | { ok: true; context: ContributionsContext }
  | { ok: false; error: string; context?: ContributionsContext; remaining?: number };
