/** Types client-safe partagés entre l'app, la page publique et les fonctions serveur. */

export type PhotoAuth = {
  invitationId?: string;
  token?: string;
};

export type PhotoAccess = {
  enabled: boolean;
  canView: boolean;
  canUpload: boolean;
  canModerate: boolean;
  isOrganizer: boolean;
  /** Invitation en attente de réponse : aperçu seulement. */
  pending: boolean;
  allowDownload: boolean;
  showAuthor: boolean;
  photoCount: number;
  maxPerEvent: number;
  maxPerUpload: number;
  maxFileSizeMb: number;
  acceptedFormats: string[];
  thumbnailSize: number;
  mediumSize: number;
  largeSize: number;
  quality: number;
  /** Audiences applicables à cet événement (après override organisateur). */
  viewAudience: string;
  uploadAudience: string;
  collaborative: boolean;
  canOverride: boolean;
};

export type PhotoItem = {
  id: string;
  url: string | null;
  width: number;
  height: number;
  description: string | null;
  authorLabel: string | null;
  isCover: boolean;
  status: string;
  reportCount: number;
  mine: boolean;
  createdAt: string;
};

export type PhotoPage = {
  ok: boolean;
  error?: string;
  photos: PhotoItem[];
  total: number;
};

export type PhotoReportItem = {
  id: string;
  photoId: string;
  reason: string;
  comment: string | null;
  status: string;
  reporterLabel: string | null;
  createdAt: string;
  thumbUrl: string | null;
};
