export const CONTRIBUTION_CATEGORIES = [
  { value: "boisson", label: "Boisson" },
  { value: "plat", label: "Plat" },
  { value: "dessert", label: "Dessert" },
  { value: "cadeau", label: "Cadeau commun" },
  { value: "decoration", label: "Décoration" },
  { value: "aide", label: "Aide installation" },
  { value: "autre", label: "Autre" },
] as const;

export type ContributionCategory = (typeof CONTRIBUTION_CATEGORIES)[number]["value"];

export function contributionCategoryLabel(v: string): string {
  return CONTRIBUTION_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
