/** Configuration globale du plugin « Photos » (public.invitation_settings, clé 'photos'). */

export const PHOTOS_SETTINGS_KEY = "photos";

export type PhotoAudience = "organizer" | "confirmed" | "all";

export type PhotosConfig = {
  /** Types d'événements concernés (vide = tous). */
  eventTypeKeys: string[];
  /** Qui peut consulter l'album. */
  viewAudience: PhotoAudience;
  /** Qui peut publier des photos. */
  uploadAudience: Exclude<PhotoAudience, "all">;
  /** L'organisateur peut-il redéfinir les audiences pour son événement ? */
  allowOrganizerOverride: boolean;
  /** Album collaboratif (les participants confirmés peuvent ajouter). */
  collaborative: boolean;
  /** Afficher l'auteur aux autres invités (toujours visible par l'organisateur). */
  showAuthorToGuests: boolean;

  /** Limites d'envoi (vérifiées côté serveur). */
  maxFileSizeMb: number;
  maxPerUpload: number;
  maxPerEvent: number;
  acceptedFormats: string[];
  uploadsPerMinute: number;

  /** Pipeline d'optimisation. */
  thumbnailSize: number;
  mediumSize: number;
  largeSize: number;
  quality: number;

  /** Originaux. */
  keepOriginal: boolean;
  /** 0 = conservation permanente. */
  originalRetentionDays: number;

  /** Confidentialité. */
  signedUrlMinutes: number;
  /** 0 = illimité tant que le compte existe. */
  albumRetentionMonths: number;
  trashDays: number;
  allowDownload: boolean;
};

export const DEFAULT_PHOTOS_CONFIG: PhotosConfig = {
  eventTypeKeys: [],
  viewAudience: "confirmed",
  uploadAudience: "confirmed",
  allowOrganizerOverride: true,
  collaborative: true,
  showAuthorToGuests: true,
  maxFileSizeMb: 15,
  maxPerUpload: 20,
  maxPerEvent: 100,
  acceptedFormats: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  uploadsPerMinute: 30,
  thumbnailSize: 400,
  mediumSize: 1200,
  largeSize: 2000,
  quality: 82,
  keepOriginal: true,
  originalRetentionDays: 30,
  signedUrlMinutes: 15,
  albumRetentionMonths: 0,
  trashDays: 30,
  allowDownload: true,
};

export function normalizePhotosConfig(raw: unknown): PhotosConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_PHOTOS_CONFIG } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_PHOTOS_CONFIG)) {
    if (r[k] !== undefined && r[k] !== null) merged[k] = r[k];
  }
  return merged as PhotosConfig;
}

export const REPORT_REASONS = [
  { value: "privacy", label: "Je ne souhaite pas apparaître sur cette photo" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "no_consent", label: "Photo publiée sans autorisation" },
  { value: "removal_request", label: "Je souhaite faire retirer cette photo" },
  { value: "other", label: "Autre" },
] as const;

export const RETENTION_OPTIONS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: 0, label: "Conservation permanente" },
];

export const ALBUM_RETENTION_OPTIONS = [
  { value: 0, label: "Illimitée tant que le compte existe" },
  { value: 12, label: "1 an" },
  { value: 36, label: "3 ans" },
];
