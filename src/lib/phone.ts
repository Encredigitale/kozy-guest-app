/** Utilitaires téléphone : normalisation E.164, affichage, masquage. */

export type Country = { code: string; name: string; dial: string; flag: string; trunk?: boolean };

/** Pays proposés dans le sélecteur (extensible). */
export const COUNTRIES: Country[] = [
  { code: "FR", name: "France", dial: "33", flag: "🇫🇷", trunk: true },
  { code: "BE", name: "Belgique", dial: "32", flag: "🇧🇪", trunk: true },
  { code: "CH", name: "Suisse", dial: "41", flag: "🇨🇭", trunk: true },
  { code: "LU", name: "Luxembourg", dial: "352", flag: "🇱🇺" },
  { code: "ES", name: "Espagne", dial: "34", flag: "🇪🇸" },
  { code: "IT", name: "Italie", dial: "39", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "DE", name: "Allemagne", dial: "49", flag: "🇩🇪", trunk: true },
  { code: "GB", name: "Royaume-Uni", dial: "44", flag: "🇬🇧", trunk: true },
  { code: "US", name: "États-Unis", dial: "1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "1", flag: "🇨🇦" },
  { code: "MA", name: "Maroc", dial: "212", flag: "🇲🇦", trunk: true },
  { code: "DZ", name: "Algérie", dial: "213", flag: "🇩🇿", trunk: true },
  { code: "TN", name: "Tunisie", dial: "216", flag: "🇹🇳" },
  { code: "SN", name: "Sénégal", dial: "221", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", dial: "225", flag: "🇨🇮" },
  { code: "BJ", name: "Bénin", dial: "229", flag: "🇧🇯" },
  { code: "TG", name: "Togo", dial: "228", flag: "🇹🇬" },
];

export const DEFAULT_COUNTRY = "FR";

export function findCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

/** Convertit une saisie libre en E.164 (`+33612345678`) ou renvoie null. */
export function toE164(input: string, countryCode = DEFAULT_COUNTRY): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const digitsOnly = raw.replace(/[^\d+]/g, "");
  if (!digitsOnly) return null;

  let value = digitsOnly;
  if (value.startsWith("00")) value = `+${value.slice(2)}`;

  if (value.startsWith("+")) {
    const digits = value.slice(1).replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const country = findCountry(countryCode);
  let local = value.replace(/\D/g, "");
  if (country.trunk && local.startsWith("0")) local = local.replace(/^0+/, "");
  if (!local) return null;
  const full = `${country.dial}${local}`;
  if (full.length < 8 || full.length > 15) return null;
  return `+${full}`;
}

export function isValidPhone(input: string, countryCode = DEFAULT_COUNTRY): boolean {
  return toE164(input, countryCode) !== null;
}

/** Affichage lisible : groupes de 2 pour la France, sinon E.164. */
export function formatPhone(display: string | null | undefined, e164?: string | null): string {
  const value = (display ?? "").trim() || e164 || "";
  if (!value) return "";
  if (value.startsWith("+33")) {
    const digits = value.slice(3);
    return `0${digits}`.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return value;
}

/** Masque partiellement un numéro : `06 •• •• •• 78`. */
export function maskPhone(display: string | null | undefined, e164?: string | null): string {
  const pretty = formatPhone(display, e164);
  const digits = pretty.replace(/\D/g, "");
  if (digits.length < 4) return pretty ? "•• •• •• ••" : "";
  const head = digits.slice(0, 2);
  const tail = digits.slice(-2);
  const hidden = Math.max(1, Math.ceil((digits.length - 4) / 2));
  return `${head} ${Array.from({ length: hidden }, () => "••").join(" ")} ${tail}`;
}

/** Vrai si la saisie ressemble à un début de numéro de téléphone. */
export function looksLikePhone(input: string): boolean {
  const s = input.trim();
  if (!s) return false;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 3 && /^[+\d][\d\s.\-()]*$/.test(s);
}
