import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  PhotoAccess,
  PhotoItem,
  PhotoPage,
  PhotoReportItem,
} from "@/extensions/photos/public-types";

const authSchema = z.object({
  invitationId: z.string().uuid().optional(),
  token: z.string().min(10).max(200).optional(),
});

const baseSchema = z.object({ eventId: z.string().uuid() }).merge(authSchema);

/** Droits (consultation / publication / modération) recalculés côté serveur. */
export const getPhotoAccess = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseSchema.parse(data))
  .handler(async ({ data }): Promise<PhotoAccess> => {
    const { resolveAccess } = await import("@/lib/photos.server");
    const { eventId, ...auth } = data;
    return resolveAccess(eventId, auth);
  });

/** Album paginé : uniquement des miniatures signées, jamais les originaux. */
export const listEventPhotos = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(60).default(30),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<PhotoPage> => {
    const { resolveAccess, resolveViewer, loadPhotosConfig, signPath, viewerOwns, admin } =
      await import("@/lib/photos.server");
    const { eventId, offset, limit, ...auth } = data;

    const access = await resolveAccess(eventId, auth);
    if (!access.canView) return { ok: false, error: "forbidden", photos: [], total: 0 };

    const viewer = await resolveViewer(eventId, auth);
    const config = await loadPhotosConfig();
    const db = await admin();

    const statuses: Array<"published" | "hidden"> = access.canModerate
      ? ["published", "hidden"]
      : ["published"];
    const { data: rows, count } = await db
      .from("event_photos")
      .select("*", { count: "exact" })
      .eq("event_id", eventId)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const list = (rows ?? []) as unknown as Array<Record<string, any>>;
    let reports: Record<string, number> = {};
    if (access.canModerate && list.length > 0) {
      const { data: rep } = await db
        .from("photo_reports")
        .select("photo_id")
        .eq("event_id", eventId)
        .eq("status", "pending");
      reports = ((rep ?? []) as Array<{ photo_id: string }>).reduce<Record<string, number>>((acc, r) => {
        acc[r.photo_id] = (acc[r.photo_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    const photos: PhotoItem[] = await Promise.all(
      list.map(async (r) => ({
        id: r.id as string,
        url: await signPath(r.thumbnail_storage_path as string, config.signedUrlMinutes),
        width: Number(r.width ?? 0),
        height: Number(r.height ?? 0),
        description: (r.description as string) ?? null,
        authorLabel: access.showAuthor ? ((r.author_label as string) ?? "Utilisateur supprimé") : null,
        isCover: Boolean(r.is_cover),
        status: r.status as string,
        reportCount: reports[r.id as string] ?? 0,
        mine: viewerOwns(r, viewer),
        createdAt: r.created_at as string,
      })),
    );

    return { ok: true, photos, total: count ?? photos.length };
  });

/** URL signée temporaire d'une variante, après contrôle des droits. */
export const getPhotoAsset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({
        photoId: z.string().uuid(),
        size: z.enum(["medium", "large", "original"]).default("medium"),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; url?: string; error?: string }> => {
    const { resolveAccess, loadPhotosConfig, signPath, admin } = await import("@/lib/photos.server");
    const { eventId, photoId, size, ...auth } = data;

    const access = await resolveAccess(eventId, auth);
    if (!access.canView) return { ok: false, error: "forbidden" };
    if (size === "original" && !(access.allowDownload || access.canModerate)) {
      return { ok: false, error: "forbidden" };
    }

    const db = await admin();
    const { data: row } = await db
      .from("event_photos")
      .select("*")
      .eq("id", photoId)
      .eq("event_id", eventId)
      .maybeSingle();
    const p = row as Record<string, any> | null;
    if (!p || p.status === "deleted") return { ok: false, error: "not_found" };
    if (p.status === "hidden" && !access.canModerate) return { ok: false, error: "forbidden" };

    const config = await loadPhotosConfig();
    const path =
      size === "original"
        ? (p.original_storage_path ?? p.large_storage_path)
        : size === "large"
          ? p.large_storage_path
          : p.medium_storage_path;
    const url = await signPath(path as string, config.signedUrlMinutes);
    return url ? { ok: true, url } : { ok: false, error: "not_found" };
  });

/** Ouvre un emplacement d'upload : quotas, format, taille et rate limiting vérifiés ici. */
export const createPhotoUpload = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({
        mimeType: z.string().min(3).max(80),
        originalSize: z.number().int().min(1),
        keepOriginal: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      ok: boolean;
      error?: string;
      photoId?: string;
      paths?: { thumb: string; medium: string; large: string; original: string | null };
      uploads?: Record<string, string>;
    }> => {
      const { resolveAccess, resolveViewer, loadPhotosConfig, recentUploadCount, admin, PHOTOS_BUCKET } =
        await import("@/lib/photos.server");
      const { eventId, mimeType, originalSize, ...auth } = data;

      const access = await resolveAccess(eventId, auth);
      if (!access.canUpload) return { ok: false, error: "forbidden" };

      const config = await loadPhotosConfig();
      if (!config.acceptedFormats.includes(mimeType.toLowerCase())) {
        return { ok: false, error: "unsupported_format" };
      }
      if (originalSize > config.maxFileSizeMb * 1024 * 1024) return { ok: false, error: "too_large" };
      if (access.photoCount >= config.maxPerEvent) return { ok: false, error: "quota_event" };

      const viewer = await resolveViewer(eventId, auth);
      if ((await recentUploadCount(eventId, viewer)) >= config.uploadsPerMinute) {
        return { ok: false, error: "rate_limited" };
      }

      const db = await admin();
      const photoId = crypto.randomUUID();
      const base = `${eventId}/${photoId}`;
      const keepOriginal = config.keepOriginal && data.keepOriginal;
      const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
      const paths = {
        thumb: `${base}/thumb.webp`,
        medium: `${base}/medium.webp`,
        large: `${base}/large.webp`,
        original: keepOriginal ? `${base}/original.${ext}` : null,
      };

      const uploads: Record<string, string> = {};
      for (const [key, path] of Object.entries(paths)) {
        if (!path) continue;
        const { data: signed, error } = await db.storage
          .from(PHOTOS_BUCKET)
          .createSignedUploadUrl(path);
        if (error || !signed) return { ok: false, error: "storage_unavailable" };
        uploads[key] = signed.signedUrl;
      }

      return { ok: true, photoId, paths, uploads };
    },
  );

/** Publication : enregistre la photo une fois les variantes déposées. */
export const finalizePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({
        photoId: z.string().uuid(),
        thumbPath: z.string().min(3),
        mediumPath: z.string().min(3),
        largePath: z.string().min(3),
        originalPath: z.string().min(3).nullable().optional(),
        mimeType: z.string().min(3),
        width: z.number().int().min(1),
        height: z.number().int().min(1),
        originalSize: z.number().int().min(0),
        optimizedSize: z.number().int().min(0),
        description: z.string().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { resolveAccess, resolveViewer, loadPhotosConfig, admin } = await import("@/lib/photos.server");
    const { eventId, photoId, ...rest } = data;

    const access = await resolveAccess(eventId, { invitationId: data.invitationId, token: data.token });
    if (!access.canUpload) return { ok: false, error: "forbidden" };
    if (access.photoCount >= access.maxPerEvent) return { ok: false, error: "quota_event" };

    const prefix = `${eventId}/${photoId}/`;
    for (const p of [rest.thumbPath, rest.mediumPath, rest.largePath, rest.originalPath ?? prefix]) {
      if (!String(p).startsWith(prefix)) return { ok: false, error: "invalid_path" };
    }

    const viewer = await resolveViewer(eventId, { invitationId: data.invitationId, token: data.token });
    const config = await loadPhotosConfig();
    const db = await admin();

    const { error } = await db.from("event_photos").insert({
      id: photoId,
      event_id: eventId,
      uploaded_by_user_id: viewer.kind === "user" ? viewer.userId : null,
      invitation_id: viewer.kind === "guest" ? viewer.invitationId : null,
      author_label: viewer.kind === "anon" ? null : viewer.label,
      thumbnail_storage_path: rest.thumbPath,
      medium_storage_path: rest.mediumPath,
      large_storage_path: rest.largePath,
      original_storage_path: rest.originalPath ?? null,
      original_retention_until:
        rest.originalPath && config.originalRetentionDays > 0
          ? new Date(Date.now() + config.originalRetentionDays * 86400_000).toISOString()
          : null,
      mime_type: rest.mimeType,
      width: rest.width,
      height: rest.height,
      original_file_size: rest.originalSize,
      optimized_file_size: rest.optimizedSize,
      description: rest.description ?? null,
      status: "published",
    } as never);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

/** Suppression logique (corbeille) : auteur ou organisateur. */
export const deletePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseSchema.extend({ photoId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { resolveAccess, resolveViewer, viewerOwns, admin } = await import("@/lib/photos.server");
    const { eventId, photoId, ...auth } = data;
    const access = await resolveAccess(eventId, auth);
    if (!access.canView) return { ok: false, error: "forbidden" };

    const db = await admin();
    const { data: row } = await db
      .from("event_photos")
      .select("*")
      .eq("id", photoId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (!row) return { ok: false, error: "not_found" };

    const viewer = await resolveViewer(eventId, auth);
    if (!access.canModerate && !viewerOwns(row as Record<string, any>, viewer)) {
      return { ok: false, error: "forbidden" };
    }

    await db
      .from("event_photos")
      .update({ status: "deleted", deleted_at: new Date().toISOString(), is_cover: false } as never)
      .eq("id", photoId);
    return { ok: true };
  });

/** Modération organisateur : masquer / réafficher / supprimer. */
export const moderatePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({ photoId: z.string().uuid(), action: z.enum(["hide", "publish", "delete"]) })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { resolveAccess, admin } = await import("@/lib/photos.server");
    const { eventId, photoId, action, ...auth } = data;
    const access = await resolveAccess(eventId, auth);
    if (!access.canModerate) return { ok: false, error: "forbidden" };

    const db = await admin();
    const patch =
      action === "delete"
        ? { status: "deleted", deleted_at: new Date().toISOString(), is_cover: false }
        : { status: action === "hide" ? "hidden" : "published" };
    await db.from("event_photos").update(patch as never).eq("id", photoId).eq("event_id", eventId);
    return { ok: true };
  });

/** Photo de couverture + cadrage 16:9 conservé en coordonnées. */
export const setPhotoCover = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({
        photoId: z.string().uuid(),
        cropX: z.number().min(0).max(1).default(0),
        cropY: z.number().min(0).max(1).default(0),
        cropWidth: z.number().min(0).max(1).default(1),
        cropHeight: z.number().min(0).max(1).default(1),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { resolveAccess, admin } = await import("@/lib/photos.server");
    const { eventId, photoId, ...auth } = data;
    const access = await resolveAccess(eventId, auth);
    if (!access.canModerate) return { ok: false, error: "forbidden" };

    const db = await admin();
    await db.from("event_photos").update({ is_cover: false } as never).eq("event_id", eventId);
    await db
      .from("event_photos")
      .update({
        is_cover: true,
        crop_x: data.cropX,
        crop_y: data.cropY,
        crop_width: data.cropWidth,
        crop_height: data.cropHeight,
      } as never)
      .eq("id", photoId)
      .eq("event_id", eventId);
    return { ok: true };
  });

/** Description (texte alternatif) : auteur ou organisateur. */
export const updatePhotoDescription = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema.extend({ photoId: z.string().uuid(), description: z.string().max(300) }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { resolveAccess, resolveViewer, viewerOwns, admin } = await import("@/lib/photos.server");
    const { eventId, photoId, description, ...auth } = data;
    const access = await resolveAccess(eventId, auth);
    if (!access.canView) return { ok: false, error: "forbidden" };

    const db = await admin();
    const { data: row } = await db
      .from("event_photos")
      .select("*")
      .eq("id", photoId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (!row) return { ok: false, error: "not_found" };
    const viewer = await resolveViewer(eventId, auth);
    if (!access.canModerate && !viewerOwns(row as Record<string, any>, viewer)) {
      return { ok: false, error: "forbidden" };
    }
    await db.from("event_photos").update({ description } as never).eq("id", photoId);
    return { ok: true };
  });

/** Signalement / demande de retrait. */
export const reportPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({
        photoId: z.string().uuid(),
        reason: z.string().min(2).max(40),
        comment: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { resolveAccess, resolveViewer, admin } = await import("@/lib/photos.server");
    const { eventId, photoId, reason, comment, ...auth } = data;
    const access = await resolveAccess(eventId, auth);
    if (!access.canView) return { ok: false, error: "forbidden" };

    const viewer = await resolveViewer(eventId, auth);
    const db = await admin();
    await db.from("photo_reports").insert({
      photo_id: photoId,
      event_id: eventId,
      reported_by: viewer.kind === "user" ? viewer.userId : null,
      reporter_label: viewer.kind === "anon" ? null : viewer.label,
      reason,
      comment: comment ?? null,
    } as never);

    const { data: ev } = await db.from("events").select("organizer_id, title").eq("id", eventId).maybeSingle();
    const organizerId = (ev as { organizer_id?: string } | null)?.organizer_id;
    if (organizerId) {
      await db.from("notifications").insert({
        user_id: organizerId,
        channel: "inapp",
        type: "photo_report",
        title: "Photo signalée",
        body: `Une photo de « ${(ev as { title?: string }).title ?? "votre événement"} » a été signalée.`,
        metadata: { eventId, photoId, reason },
        status: "sent",
        sent_at: new Date().toISOString(),
      } as never);
    }
    return { ok: true };
  });

/** Liste des signalements (organisateur). */
export const listPhotoReports = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; reports: PhotoReportItem[] }> => {
    const { resolveAccess, loadPhotosConfig, signPath, admin } = await import("@/lib/photos.server");
    const { eventId, ...auth } = data;
    const access = await resolveAccess(eventId, auth);
    if (!access.canModerate) return { ok: false, reports: [] };

    const db = await admin();
    const { data: rows } = await db
      .from("photo_reports")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (rows ?? []) as unknown as Array<Record<string, any>>;
    if (list.length === 0) return { ok: true, reports: [] };

    const { data: photos } = await db
      .from("event_photos")
      .select("id, thumbnail_storage_path")
      .in("id", list.map((r) => r.photo_id as string));
    const byId = new Map(
      ((photos ?? []) as Array<Record<string, any>>).map((p) => [p.id as string, p.thumbnail_storage_path as string]),
    );
    const config = await loadPhotosConfig();

    const reports: PhotoReportItem[] = await Promise.all(
      list.map(async (r) => ({
        id: r.id as string,
        photoId: r.photo_id as string,
        reason: r.reason as string,
        comment: (r.comment as string) ?? null,
        status: r.status as string,
        reporterLabel: (r.reporter_label as string) ?? null,
        createdAt: r.created_at as string,
        thumbUrl: await signPath(byId.get(r.photo_id as string) ?? null, config.signedUrlMinutes),
      })),
    );
    return { ok: true, reports };
  });

/** Décision de modération sur un signalement. */
export const resolvePhotoReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({ reportId: z.string().uuid(), decision: z.enum(["keep", "hide", "delete"]) })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { resolveAccess, resolveViewer, admin } = await import("@/lib/photos.server");
    const { eventId, reportId, decision, ...auth } = data;
    const access = await resolveAccess(eventId, auth);
    if (!access.canModerate) return { ok: false, error: "forbidden" };

    const db = await admin();
    const { data: rep } = await db
      .from("photo_reports")
      .select("*")
      .eq("id", reportId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (!rep) return { ok: false, error: "not_found" };
    const viewer = await resolveViewer(eventId, auth);

    if (decision !== "keep") {
      await db
        .from("event_photos")
        .update(
          decision === "hide"
            ? { status: "hidden" }
            : { status: "deleted", deleted_at: new Date().toISOString(), is_cover: false },
        )
        .eq("id", (rep as { photo_id: string }).photo_id);
    }
    await db
      .from("photo_reports")
      .update({
        status: decision === "keep" ? "rejected" : decision === "hide" ? "hidden" : "deleted",
        moderated_by: viewer.kind === "user" ? viewer.userId : null,
        moderated_at: new Date().toISOString(),
      } as never)
      .eq("id", reportId);
    return { ok: true };
  });

/** Réglages d'album de l'organisateur (audiences, mode collaboratif). */
export const saveEventPhotoSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    baseSchema
      .extend({
        viewAudience: z.enum(["organizer", "confirmed", "all"]),
        uploadAudience: z.enum(["organizer", "confirmed"]),
        collaborative: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { resolveAccess, resolveViewer, admin } = await import("@/lib/photos.server");
    const { eventId, viewAudience, uploadAudience, collaborative, ...auth } = data;
    const access = await resolveAccess(eventId, auth);
    if (!access.canOverride) return { ok: false, error: "forbidden" };

    const viewer = await resolveViewer(eventId, auth);
    if (viewer.kind !== "user") return { ok: false, error: "forbidden" };
    const db = await admin();

    const { data: existing } = await db
      .from("extension_settings")
      .select("id")
      .eq("extension_key", "photos")
      .eq("event_id", eventId)
      .maybeSingle();

    const settings = { viewAudience, uploadAudience, collaborative };
    if (existing) {
      await db.from("extension_settings").update({ settings } as never).eq("id", (existing as { id: string }).id);
    } else {
      await db.from("extension_settings").insert({
        extension_key: "photos",
        event_id: eventId,
        user_id: viewer.userId,
        settings,
      } as never);
    }
    return { ok: true };
  });
