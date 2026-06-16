export const EVENT_TYPES = [
  { value: "diner", label: "Dîner" },
  { value: "apero", label: "Apéro dînatoire" },
  { value: "brunch", label: "Brunch" },
  { value: "anniversaire", label: "Anniversaire" },
  { value: "cremaillere", label: "Crémaillère" },
  { value: "repas_fete", label: "Repas de fête" },
  { value: "autre", label: "Autre" },
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];

export const EVENT_SUBTYPES: Record<EventTypeValue, string[]> = {
  diner: ["Amis", "Famille", "Travail"],
  apero: ["Amis", "Famille", "Travail"],
  brunch: ["Amis", "Famille"],
  anniversaire: ["Enfant", "Ami·e", "Famille", "Conjoint·e"],
  cremaillere: [],
  repas_fete: ["Noël", "Nouvel An", "Pâques", "Autre fête"],
  autre: [],
};

export function eventTypeLabel(value: string): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value;
}
