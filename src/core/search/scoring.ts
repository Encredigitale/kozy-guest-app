/**
 * Fonctions communes de normalisation et de score.
 * Le moteur central gère la casse, les accents, la recherche partielle et une
 * tolérance raisonnable aux fautes ; les plugins n'implémentent rien de tout ça.
 */
export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@+]+/g, " ")
    .trim();
}

export function queryTokens(query: string): string[] {
  return normalizeText(query).split(" ").filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

export type ScoredField = {
  value: unknown;
  /** 3 = titre, 2 = donnée structurée, 1 = description. */
  weight: number;
};

/**
 * Score de pertinence : correspondance exacte > titre > donnée structurée >
 * description. Une tolérance aux fautes simples est appliquée en dernier recours.
 */
export function scoreFields(
  query: string,
  fields: ScoredField[],
  options?: { fuzzy?: boolean },
): number {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return 0;
  const fuzzy = options?.fuzzy ?? true;

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const field of fields) {
      const text = normalizeText(field.value);
      if (!text) continue;
      const words = text.split(" ");
      let hit = 0;
      if (text === token) hit = 100;
      else if (words.includes(token)) hit = 80;
      else if (words.some((w) => w.startsWith(token))) hit = 60;
      else if (text.includes(token)) hit = 40;
      else if (fuzzy && token.length >= 5 && words.some((w) => levenshtein(w, token) <= 1))
        hit = 20;
      if (hit > 0) best = Math.max(best, hit * field.weight);
    }
    if (best === 0) return 0; // tous les mots doivent correspondre
    total += best;
  }
  return total / tokens.length;
}

/** Pondération contextuelle : récence et événements à venir sont favorisés. */
export function recencyBoost(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  const days = Math.abs(Date.now() - t) / 86_400_000;
  if (days <= 30) return 25;
  if (days <= 180) return 15;
  if (days <= 365) return 8;
  return 0;
}
