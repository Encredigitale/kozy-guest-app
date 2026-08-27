import {
  PHOTOS_SETTINGS_KEY,
  normalizePhotosConfig,
  type PhotosConfig,
} from "@/extensions/photos/config";
import type { PhotoAccess, PhotoAuth } from "@/extensions/photos/public-types";

export const PHOTOS_BUCKET = "event-photos";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadPhotosConfig(): Promise<PhotosConfig> {
  const db = await admin();
  const { data } = await db
    .from("invitation_settings")
    .select("settings")
    .eq("key", PHOTOS_SETTINGS_KEY)
    .maybeSingle();
  return normalizePhotosConfig((data as { settings?: unknown } | null)?.settings);
}

export async function savePhotosConfigRow(config: PhotosConfig): Promise<void> {
  const db = await admin();
  await db
    .from("invitation_settings")
    .upsert({ key: PHOTOS_SETTINGS_KEY, settings: config as never }, { onConflict: "key" });
}

export type Viewer =
  | { kind: "user"; userId: string; label: string }
  | { kind: "guest"; invitationId: string; label: string; accepted: boolean }
  | { kind: "anon" };

/** Résout l'identité de l'appelant : session Supabase (bearer) ou lien d'invitation signé. */
export async function resolveViewer(eventId: string, auth?: PhotoAuth): Promise<Viewer> {
  const db = await admin();

  if (auth?.invitationId && auth?.token) {
    const { data } = await db
      .from("invitations")
      .select("id, name, email, status, token, revoked_at, expires_at, guest_user_id")
      .eq("id", auth.invitationId)
      .eq("event_id", eventId)
      .maybeSingle();
    const inv = data as Record<string, any> | null;
    if (inv && inv.token === auth.token && !inv.revoked_at) {
      const expired = inv.expires_at && new Date(inv.expires_at).getTime() < Date.now();
      if (!expired) {
        return {
          kind: "guest",
          invitationId: inv.id as string,
          label: (inv.name as string) || (inv.email as string) || "Invité",
          accepted: inv.status === "accepted",
        };
      }
    }
    return { kind: "anon" };
  }

  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const header = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
  const jwt = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!jwt) return { kind: "anon" };

  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) return { kind: "anon" };

  const { data: profile } = await db
    .from("profiles")
    .select("display_name")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return {
    kind: "user",
    userId: data.user.id,
    label:
      ((profile as { display_name?: string } | null)?.display_name as string) ||
      (data.user.email ?? "Participant"),
  };
}

export type EventContext = {
  event: Record<string, any>;
  config: PhotosConfig;
  effective: { viewAudience: string; uploadAudience: string; collaborative: boolean };
};

/** Config globale + surcharge éventuelle définie par l'organisateur pour cet événement. */
export async function loadEventContext(eventId: string): Promise<EventContext | null> {
  const db = await admin();
  const config = await loadPhotosConfig();

  const { data: event } = await db
    .from("events")
    .select("id, organizer_id, status, metadata")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return null;

  const { data: override } = await db
    .from("extension_settings")
    .select("settings")
    .eq("extension_key", "photos")
    .eq("event_id", eventId)
    .maybeSingle();
  const o = ((override as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as Record<
    string,
    unknown
  >;

  const allow = config.allowOrganizerOverride;
  return {
    event: event as Record<string, any>,
    config,
    effective: {
      viewAudience: allow && typeof o.viewAudience === "string" ? o.viewAudience : config.viewAudience,
      uploadAudience:
        allow && typeof o.uploadAudience === "string" ? o.uploadAudience : config.uploadAudience,
      collaborative: allow && typeof o.collaborative === "boolean" ? o.collaborative : config.collaborative,
    },
  };
}

/** Le plugin est-il actif globalement, pour ce type d'événement et pour cet événement ? */
export async function isPhotosEnabled(eventId: string, config: PhotosConfig, event: Record<string, any>) {
  const db = await admin();
  const { data: ext } = await db.from("extensions").select("enabled").eq("key", "photos").maybeSingle();
  if (!(ext as { enabled?: boolean } | null)?.enabled) return false;

  const { data: override } = await db
    .from("event_extensions")
    .select("enabled")
    .eq("event_id", eventId)
    .eq("extension_key", "photos")
    .maybeSingle();
  if ((override as { enabled?: boolean } | null)?.enabled === false) return false;

  if (config.eventTypeKeys.length > 0) {
    const typeKey = ((event.metadata ?? {}) as Record<string, unknown>).event_type as string | undefined;
    if (!typeKey || !config.eventTypeKeys.includes(typeKey)) return false;
  }
  return true;
}

/** Statut de participation : confirmé, en attente, ou aucun. */
async function participation(
  eventId: string,
  viewer: Viewer,
): Promise<"confirmed" | "pending" | "none"> {
  if (viewer.kind === "guest") return viewer.accepted ? "confirmed" : "pending";
  if (viewer.kind !== "user") return "none";
  const db = await admin();

  const { data: p } = await db
    .from("event_participants")
    .select("rsvp_status")
    .eq("event_id", eventId)
    .eq("user_id", viewer.userId)
    .maybeSingle();
  const rsvp = (p as { rsvp_status?: string } | null)?.rsvp_status;
  if (rsvp === "accepted") return "confirmed";

  const { data: inv } = await db
    .from("invitations")
    .select("status")
    .eq("event_id", eventId)
    .eq("guest_user_id", viewer.userId)
    .maybeSingle();
  const st = (inv as { status?: string } | null)?.status;
  if (st === "accepted") return "confirmed";
  if (st === "declined") return "none";
  if (st || rsvp === "pending") return "pending";
  return "none";
}

/** Résolution serveur des trois permissions : consultation, publication, modération. */
export async function resolveAccess(eventId: string, auth?: PhotoAuth): Promise<PhotoAccess> {
  const deny: PhotoAccess = {
    enabled: false,
    canView: false,
    canUpload: false,
    canModerate: false,
    isOrganizer: false,
    pending: false,
    allowDownload: false,
    showAuthor: false,
    photoCount: 0,
    maxPerEvent: 0,
    maxPerUpload: 0,
    maxFileSizeMb: 0,
    acceptedFormats: [],
    thumbnailSize: 400,
    mediumSize: 1200,
    largeSize: 2000,
    quality: 82,
    viewAudience: "confirmed",
    uploadAudience: "confirmed",
    collaborative: false,
    canOverride: false,
  };

  const ctx = await loadEventContext(eventId);
  if (!ctx) return deny;
  const { config, event, effective } = ctx;
  if (!(await isPhotosEnabled(eventId, config, event))) return deny;

  const viewer = await resolveViewer(eventId, auth);
  const isOrganizer = viewer.kind === "user" && event.organizer_id === viewer.userId;
  const part = isOrganizer ? "confirmed" : await participation(eventId, viewer);

  const canView =
    isOrganizer ||
    (effective.viewAudience === "all" && part !== "none") ||
    (effective.viewAudience === "confirmed" && part === "confirmed");

  const canUpload =
    isOrganizer ||
    (effective.collaborative &&
      effective.uploadAudience === "confirmed" &&
      part === "confirmed" &&
      canView);

  const db = await admin();
  const { count } = await db
    .from("event_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .neq("status", "deleted");

  return {
    enabled: true,
    canView,
    canUpload,
    canModerate: isOrganizer,
    isOrganizer,
    pending: !canView && part === "pending",
    allowDownload: config.allowDownload,
    showAuthor: isOrganizer || config.showAuthorToGuests,
    photoCount: count ?? 0,
    maxPerEvent: config.maxPerEvent,
    maxPerUpload: config.maxPerUpload,
    maxFileSizeMb: config.maxFileSizeMb,
    acceptedFormats: config.acceptedFormats,
    thumbnailSize: config.thumbnailSize,
    mediumSize: config.mediumSize,
    largeSize: config.largeSize,
    quality: config.quality,
    viewAudience: effective.viewAudience,
    uploadAudience: effective.uploadAudience,
    collaborative: effective.collaborative,
    canOverride: isOrganizer && config.allowOrganizerOverride,
  };
}

export async function signPath(path: string | null, minutes: number): Promise<string | null> {
  if (!path) return null;
  const db = await admin();
  const { data } = await db.storage.from(PHOTOS_BUCKET).createSignedUrl(path, minutes * 60);
  return data?.signedUrl ?? null;
}

/** Nombre d'envois de ce visiteur sur la dernière minute (rate limiting serveur). */
export async function recentUploadCount(eventId: string, viewer: Viewer): Promise<number> {
  const db = await admin();
  const since = new Date(Date.now() - 60_000).toISOString();
  let q = db
    .from("event_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .gte("created_at", since);
  if (viewer.kind === "user") q = q.eq("uploaded_by_user_id", viewer.userId);
  else if (viewer.kind === "guest") q = q.eq("invitation_id", viewer.invitationId);
  const { count } = await q;
  return count ?? 0;
}

export function viewerOwns(row: Record<string, any>, viewer: Viewer): boolean {
  if (viewer.kind === "user") return row.uploaded_by_user_id === viewer.userId;
  if (viewer.kind === "guest") return row.invitation_id === viewer.invitationId;
  return false;
}
