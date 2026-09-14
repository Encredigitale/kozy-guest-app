/** Configuration globale du plugin « Recette » (public.invitation_settings, clé 'recipes'). */

export const RECIPES_SETTINGS_KEY = "recipes";

export type RecipesConfig = {
  /** Fonctionnalité active. */
  enabled: boolean;
  /** Autoriser une recette écrite. */
  allowText: boolean;
  /** Autoriser les photos de recette. */
  allowPhotos: boolean;
  /** Nombre maximum de photos par recette. */
  maxPhotos: number;
  /** Autoriser un lien web. */
  allowLink: boolean;
  /** Autoriser le partage avec des invités. */
  allowSharing: boolean;
  /** Recherche globale. */
  searchEnabled: boolean;
  /** Limites et optimisation des images. */
  maxFileSizeMb: number;
  imageSize: number;
  quality: number;
  signedUrlMinutes: number;
};

export const DEFAULT_RECIPES_CONFIG: RecipesConfig = {
  enabled: true,
  allowText: true,
  allowPhotos: true,
  maxPhotos: 2,
  allowLink: true,
  allowSharing: true,
  searchEnabled: true,
  maxFileSizeMb: 15,
  imageSize: 2000,
  quality: 84,
  signedUrlMinutes: 30,
};

export function normalizeRecipesConfig(raw: unknown): RecipesConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_RECIPES_CONFIG } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_RECIPES_CONFIG)) {
    if (r[k] !== undefined && r[k] !== null) merged[k] = r[k];
  }
  const out = merged as RecipesConfig;
  out.maxPhotos = Math.min(Math.max(1, Number(out.maxPhotos) || 2), 2);
  return out;
}

/** Seuls les schémas web sûrs sont acceptés (pas de javascript:, data:, etc.). */
export function normalizeRecipeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Nom de domaine affiché sur la fiche (ex. www.marmiton.org). */
export function urlLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
