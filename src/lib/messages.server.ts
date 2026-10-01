import { MESSAGES_SETTINGS_KEY, normalizeMessagesConfig, type ChatMessage, type MessagesConfig } from "@/extensions/messages/config";

export const MESSAGES_BUCKET = "event-photos";

export async function admin(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadMessagesConfig(): Promise<MessagesConfig> {
  const db = await admin();
  const { data } = await db.from("invitation_settings").select("settings").eq("key", MESSAGES_SETTINGS_KEY).maybeSingle();
  return normalizeMessagesConfig(data?.settings);
}

export async function saveMessagesConfigRow(config: MessagesConfig) {
  const db = await admin();
  await db.from("invitation_settings").upsert({ key: MESSAGES_SETTINGS_KEY, settings: config }, { onConflict: "key" });
}

export type Access = { ok: false } | { ok: true; isOrganizer: boolean; invitationId: string | null; eventTitle: string; organizerId: string };

/** Vérifie : événement existant, plugin actif (global + événement), utilisateur autorisé (organisateur ou invité ayant accepté). */
export async function checkAccess(eventId: string, userId: string): Promise<Access> {
  const db = await admin();
  const config = await loadMessagesConfig();
  if (!config.enabled) return { ok: false };
  const [{ data: ev }, { data: ext }, { data: evExt }] = await Promise.all([
    db.from("events").select("id, title, organizer_id").eq("id", eventId).maybeSingle(),
    db.from("extensions").select("enabled").eq("key", "messages").maybeSingle(),
    db.from("event_extensions").select("enabled").eq("event_id", eventId).eq("extension_key", "messages").maybeSingle(),
  ]);
  if (!ev || ext?.enabled !== true || evExt?.enabled !== true) return { ok: false };
  if (ev.organizer_id === userId) return { ok: true, isOrganizer: true, invitationId: null, eventTitle: ev.title, organizerId: ev.organizer_id };
  const { data: inv } = await db.from("invitations").select("id").eq("event_id", eventId).eq("guest_user_id", userId)
    .eq("status", "accepted").is("revoked_at", null).limit(1).maybeSingle();
  if (inv) return { ok: true, isOrganizer: false, invitationId: inv.id, eventTitle: ev.title, organizerId: ev.organizer_id };
  const { data: part } = await db.from("event_participants").select("id").eq("event_id", eventId).eq("user_id", userId)
    .eq("rsvp_status", "accepted").limit(1).maybeSingle();
  if (part) return { ok: true, isOrganizer: false, invitationId: null, eventTitle: ev.title, organizerId: ev.organizer_id };
  return { ok: false };
}

/** Comptes ayant accès à la discussion (pour notifications et compteur). */
export async function authorizedUserIds(eventId: string, organizerId: string): Promise<string[]> {
  const db = await admin();
  const [{ data: invs }, { data: parts }] = await Promise.all([
    db.from("invitations").select("guest_user_id").eq("event_id", eventId).eq("status", "accepted").is("revoked_at", null).not("guest_user_id", "is", null),
    db.from("event_participants").select("user_id").eq("event_id", eventId).eq("rsvp_status", "accepted").not("user_id", "is", null),
  ]);
  return [...new Set([organizerId, ...(invs ?? []).map((i: any) => i.guest_user_id), ...(parts ?? []).map((p: any) => p.user_id)])];
}

export async function toChatMessages(rows: any[]): Promise<ChatMessage[]> {
  const db = await admin();
  const ids = [...new Set(rows.map((r) => r.author_user_id))];
  const { data: profiles } = ids.length ? await db.from("profiles").select("user_id, display_name").in("user_id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));
  const paths = rows.filter((r) => r.photo_path && !r.deleted_at).map((r) => r.photo_path);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await db.storage.from(MESSAGES_BUCKET).createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows.map((r) => {
    const deleted = !!r.deleted_at;
    return {
      id: r.id,
      authorUserId: r.author_user_id,
      authorName: (names.get(r.author_user_id) as string) || "Participant",
      type: r.message_type === "photo" ? "photo" : "text",
      text: deleted ? null : r.text_content,
      photoUrl: deleted || !r.photo_path ? null : urls.get(r.photo_path) ?? null,
      createdAt: r.created_at,
      edited: !!r.edited_at,
      deleted,
    };
  });
}
