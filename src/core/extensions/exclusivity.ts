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

/**
 * Résolution pure de l'exclusivité à partir des choix explicites
 * (table event_extensions : clé → enabled). Renvoie false si une extension
 * du même groupe l'emporte sur `key`.
 */
export function isExclusiveWinnerFrom(
  explicit: Record<string, boolean | undefined>,
  key: string,
): boolean {
  const siblings = conflictingExtensionKeys(key);
  if (siblings.length === 0) return true;
  if (explicit[key] === false) return false;

  const groupKeys = [key, ...siblings];
  const explicitlyOn = groupKeys.filter((k) => explicit[k] === true);
  if (explicitlyOn.length === 1) return explicitlyOn[0] === key;
  if (explicitlyOn.length > 1 && !explicitlyOn.includes(key)) return false;

  const candidates = (explicitlyOn.length > 1 ? explicitlyOn : groupKeys).filter(
    (k) => explicit[k] !== false,
  );
  const winner = candidates.sort((a, b) => exclusivityPriority(a) - exclusivityPriority(b))[0];
  return winner === key;
}
