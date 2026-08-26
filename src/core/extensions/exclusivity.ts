/**
 * Groupes d'extensions mutuellement exclusives.
 * Deux plugins d'un même groupe ne peuvent pas être actifs en même temps
 * sur un même événement. L'ordre du tableau définit la priorité :
 * en cas d'ambiguïté, la clé la plus à gauche gagne.
 */
export const EXCLUSIVE_EXTENSION_GROUPS: string[][] = [["contributions", "guest-brings"]];

/** Les autres clés du groupe auquel appartient `key` (vide si aucun groupe). */
export function conflictingExtensionKeys(key: string): string[] {
  const group = EXCLUSIVE_EXTENSION_GROUPS.find((g) => g.includes(key));
  return group ? group.filter((k) => k !== key) : [];
}

/** Priorité de la clé dans son groupe (plus petit = prioritaire). */
export function exclusivityPriority(key: string): number {
  const group = EXCLUSIVE_EXTENSION_GROUPS.find((g) => g.includes(key));
  return group ? group.indexOf(key) : 0;
}
