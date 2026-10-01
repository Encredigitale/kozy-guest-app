/** Réglages globaux du plugin « Messages » (public.invitation_settings, clé 'messages'). */
export const MESSAGES_SETTINGS_KEY = "messages";

export type MessagesConfig = {
  enabled: boolean;
  allowPhotos: boolean;
  allowEdit: boolean;
  allowAuthorDelete: boolean;
  notificationsEnabled: boolean;
  searchEnabled: boolean;
};

export const DEFAULT_MESSAGES_CONFIG: MessagesConfig = {
  enabled: true,
  allowPhotos: true,
  allowEdit: true,
  allowAuthorDelete: true,
  notificationsEnabled: true,
  searchEnabled: true,
};

export function normalizeMessagesConfig(raw: unknown): MessagesConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_MESSAGES_CONFIG };
  for (const k of Object.keys(out) as (keyof MessagesConfig)[]) {
    if (typeof r[k] === "boolean") out[k] = r[k] as boolean;
  }
  return out;
}

export const MESSAGE_PAGE_SIZE = 30;
export const MESSAGE_MAX_LENGTH = 4000;

export type ChatMessage = {
  id: string;
  authorUserId: string;
  authorName: string;
  type: "text" | "photo";
  text: string | null;
  photoUrl: string | null;
  createdAt: string;
  edited: boolean;
  deleted: boolean;
};
