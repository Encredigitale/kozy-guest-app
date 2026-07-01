export const CONTACT_GROUPS = [
  { value: "family", label: "Famille" },
  { value: "friends", label: "Amis" },
  { value: "colleagues", label: "Collègues" },
  { value: "neighbors", label: "Voisins" },
  { value: "other", label: "Autre" },
] as const;

export type ContactGroup = (typeof CONTACT_GROUPS)[number]["value"];

export const contactGroupLabel = (g: string | null | undefined) =>
  CONTACT_GROUPS.find((x) => x.value === g)?.label ?? "Autre";
