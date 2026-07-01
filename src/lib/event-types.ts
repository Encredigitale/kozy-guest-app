export const EVENT_TYPES = [
  { value: "diner", label: "Dîner" },
  { value: "dejeuner", label: "Déjeuner" },
  { value: "brunch", label: "Brunch" },
  { value: "apero", label: "Apéro" },
  { value: "apero_dinatoire", label: "Apéro dînatoire" },
  { value: "cremaillere", label: "Crémaillère" },
  { value: "anniv_adulte", label: "Anniversaire adulte" },
  { value: "anniv_enfant", label: "Anniversaire enfant" },
  { value: "noel", label: "Noël" },
  { value: "nouvel_an", label: "Nouvel An" },
  { value: "pro", label: "Professionnel" },
  { value: "autre", label: "Autre" },
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];

export const GUEST_CIRCLES = [
  "Famille",
  "Amis",
  "Couple",
  "Collègues",
  "Mixte",
] as const;

// Legacy compat: subtype list per type (kept for backwards references)
export const EVENT_SUBTYPES: Record<string, string[]> = Object.fromEntries(
  EVENT_TYPES.map((t) => [t.value, [...GUEST_CIRCLES]]),
);

export function eventTypeLabel(value: string): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value;
}
