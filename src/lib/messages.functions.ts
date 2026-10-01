import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MESSAGE_MAX_LENGTH, MESSAGE_PAGE_SIZE, type ChatMessage, type MessagesConfig } from "@/extensions/messages/config";

const uuid = z.string().uuid();

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: uuid, before: z.string().optional(), around: uuid.optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("@/lib/messages.server");
    const access = await m.checkAccess(data.eventId, context.userId);
    if (!access.ok) return { ok: false as const };
    const db = await m.admin();
    let q = db.from("event_message").select("*").eq("event_id", data.eventId).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE + 1);
    if (data.before) q = q.lt("created_at", data.before);
    else if (data.around) {
      const { data: target } = await db.from("event_message").select("created_at").eq("id", data.around).eq("event_id", data.eventId).maybeSingle();
      if (target) {
        const { count } = await db.from("event_message").select("id", { count: "exact", head: true }).eq("event_id", data.eventId).gte("created_at", target.created_at);
        q = q.limit(Math.max(MESSAGE_PAGE_SIZE, (count ?? 0) + 5) + 1);
      }
    }
    const { data: rows } = await q;
    const list = rows ?? [];
    const hasMore = list.length > MESSAGE_PAGE_SIZE && !data.around ? true : list.length > MESSAGE_PAGE_SIZE;
    const page = list.slice(0, list.length > MESSAGE_PAGE_SIZE ? list.length - 1 : list.length).reverse();
    const [config, people, { data: pref }, { data: read }] = await Promise.all([
      m.loadMessagesConfig(),
      m.authorizedUserIds(data.eventId, access.organizerId),
      db.from("event_message_preferences").select("notifications_enabled").eq("event_id", data.eventId).eq("user_id", context.userId).maybeSingle(),
      db.from("event_message_read_state").select("last_read_at").eq("event_id", data.eventId).eq("user_id", context.userId).maybeSingle(),
    ]);
    return {
      ok: true as const,
      messages: await m.toChatMessages(page),
      hasMore,
      isOrganizer: access.isOrganizer,
      eventTitle: access.eventTitle,
      participantCount: people.length,
      notificationsEnabled: pref?.notifications_enabled ?? true,
      lastReadAt: (read?.last_read_at as string | undefined) ?? null,
      config: config as MessagesConfig,
    };
  });

export const getMessageById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: uuid, id: uuid }).parse(d))
  .handler(async ({ data, context }): Promise<ChatMessage | null> => {
    const m = await import("@/lib/messages.server");
    if (!(await m.checkAccess(data.eventId, context.userId)).ok) return null;
    const db = await m.admin();
    const { data: row } = await db.from("event_message").select("*").eq("id", data.id).eq("event_id", data.eventId).maybeSingle();
    return row ? (await m.toChatMessages([row]))[0] : null;
  });

export const summarizeMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("@/lib/messages.server");
    const access = await m.checkAccess(data.eventId, context.userId);
    if (!access.ok) return { ok: false as const };
    const db = await m.admin();
    const { data: read } = await db.from("event_message_read_state").select("last_read_at").eq("event_id", data.eventId).eq("user_id", context.userId).maybeSingle();
    let unreadQ = db.from("event_message").select("id", { count: "exact", head: true }).eq("event_id", data.eventId).is("deleted_at", null).neq("author_user_id", context.userId);
    if (read?.last_read_at) unreadQ = unreadQ.gt("created_at", read.last_read_at);
    const [{ count: total }, { count: unread }, { data: last }] = await Promise.all([
      db.from("event_message").select("id", { count: "exact", head: true }).eq("event_id", data.eventId).is("deleted_at", null),
      unreadQ,
      db.from("event_message").select("*").eq("event_id", data.eventId).is("deleted_at", null).order("created_at", { ascending: false }).limit(1),
    ]);
    const lastMsg = last?.[0] ? (await m.toChatMessages(last))[0] : null;
    return { ok: true as const, total: total ?? 0, unread: unread ?? 0, last: lastMsg };
  });

export const createMessagePhotoUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: uuid, size: z.number().int().min(1).max(20 * 1024 * 1024) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("@/lib/messages.server");
    if (!(await m.checkAccess(data.eventId, context.userId)).ok) return { ok: false as const, error: "forbidden" };
    if (!(await m.loadMessagesConfig()).allowPhotos) return { ok: false as const, error: "disabled" };
    const db = await m.admin();
    const path = `messages/${data.eventId}/${crypto.randomUUID()}.webp`;
    const { data: signed, error } = await db.storage.from(m.MESSAGES_BUCKET).createSignedUploadUrl(path);
    if (error || !signed) return { ok: false as const, error: "storage" };
    return { ok: true as const, path, uploadUrl: signed.signedUrl as string };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ eventId: uuid, text: z.string().max(MESSAGE_MAX_LENGTH).optional(), photoPath: z.string().max(300).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const m = await import("@/lib/messages.server");
    const access = await m.checkAccess(data.eventId, context.userId);
    if (!access.ok) return { ok: false as const, error: "forbidden" };
    const config = await m.loadMessagesConfig();
    const text = data.text?.trim() || null;
    if (data.photoPath) {
      if (!config.allowPhotos) return { ok: false as const, error: "disabled" };
      if (!data.photoPath.startsWith(`messages/${data.eventId}/`)) return { ok: false as const, error: "invalid" };
    }
    if (!text && !data.photoPath) return { ok: false as const, error: "empty" };
    const db = await m.admin();
    const { data: row, error } = await db.from("event_message").insert({
      event_id: data.eventId,
      author_user_id: context.userId,
      author_invitation_id: access.invitationId,
      message_type: data.photoPath ? "photo" : "text",
      text_content: text,
      photo_path: data.photoPath ?? null,
    }).select("*").single();
    if (error || !row) return { ok: false as const, error: "failed" };
    await db.from("event_message_read_state").upsert(
      { event_id: data.eventId, user_id: context.userId, last_read_message_id: row.id, last_read_at: row.created_at },
      { onConflict: "event_id,user_id" },
    );

    if (config.notificationsEnabled) {
      try {
        const people = (await m.authorizedUserIds(data.eventId, access.organizerId)).filter((u) => u !== context.userId);
        const { data: prefs } = await db.from("event_message_preferences").select("user_id, notifications_enabled").eq("event_id", data.eventId).eq("notifications_enabled", false);
        const muted = new Set((prefs ?? []).map((p: any) => p.user_id));
        const targets = people.filter((u) => !muted.has(u));
        const { data: prof } = await db.from("profiles").select("display_name").eq("user_id", context.userId).maybeSingle();
        const author = prof?.display_name || "Un participant";
        const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: recent } = targets.length
          ? await db.from("notifications").select("id, user_id, metadata").eq("type", "event_message").is("read_at", null)
              .gte("created_at", since).in("user_id", targets).contains("metadata", { eventId: data.eventId })
          : { data: [] };
        const recentByUser = new Map((recent ?? []).map((n: any) => [n.user_id, n]));
        const preview = text ? (text.length > 140 ? `${text.slice(0, 140)}…` : text) : "📷 Photo";
        const inserts: any[] = [];
        for (const u of targets) {
          const prev: any = recentByUser.get(u);
          if (prev) {
            const count = Number(prev.metadata?.count ?? 1) + 1;
            await db.from("notifications").update({
              title: `${count} nouveaux messages dans ${access.eventTitle}`,
              body: `${author} : ${preview}`,
              metadata: { ...prev.metadata, count, messageId: row.id },
            }).eq("id", prev.id);
          } else {
            inserts.push({
              user_id: u, channel: "inapp", type: "event_message",
              title: `${author} · ${access.eventTitle}`, body: preview,
              metadata: { eventId: data.eventId, messageId: row.id, count: 1, url: `/app/events/${data.eventId}/messages` },
              status: "sent", sent_at: new Date().toISOString(),
            });
          }
        }
        if (inserts.length) await db.from("notifications").insert(inserts);
      } catch (e) {
        console.error("messages notify failed", e);
      }
    }
    return { ok: true as const, message: (await m.toChatMessages([row]))[0] };
  });

export const editMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: uuid, id: uuid, text: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("@/lib/messages.server");
    if (!(await m.checkAccess(data.eventId, context.userId)).ok) return { ok: false as const };
    if (!(await m.loadMessagesConfig()).allowEdit) return { ok: false as const };
    const db = await m.admin();
    const { data: row } = await db.from("event_message").update({ text_content: data.text, edited_at: new Date().toISOString() })
      .eq("id", data.id).eq("event_id", data.eventId).eq("author_user_id", context.userId).is("deleted_at", null).select("id").maybeSingle();
    return { ok: !!row };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: uuid, id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("@/lib/messages.server");
    const access = await m.checkAccess(data.eventId, context.userId);
    if (!access.ok) return { ok: false as const };
    const db = await m.admin();
    const { data: msg } = await db.from("event_message").select("id, author_user_id, photo_path").eq("id", data.id).eq("event_id", data.eventId).is("deleted_at", null).maybeSingle();
    if (!msg) return { ok: false as const };
    const own = msg.author_user_id === context.userId;
    if (own && !(await m.loadMessagesConfig()).allowAuthorDelete && !access.isOrganizer) return { ok: false as const };
    if (!own && !access.isOrganizer) return { ok: false as const };
    await db.from("event_message").update({ deleted_at: new Date().toISOString(), deleted_by: context.userId }).eq("id", msg.id);
    if (msg.photo_path) await db.storage.from(m.MESSAGES_BUCKET).remove([msg.photo_path]);
    if (!own) await db.from("event_message_moderation_log").insert({ event_id: data.eventId, message_id: msg.id, moderator_user_id: context.userId, action: "delete" });
    return { ok: true as const };
  });

export const markMessagesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("@/lib/messages.server");
    const access = await m.checkAccess(data.eventId, context.userId);
    if (!access.ok) return { ok: false };
    const db = await m.admin();
    await db.from("event_message_read_state").upsert(
      { event_id: data.eventId, user_id: context.userId, invitation_id: access.invitationId, last_read_at: new Date().toISOString() },
      { onConflict: "event_id,user_id" },
    );
    return { ok: true };
  });

export const setMessageNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: uuid, enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await import("@/lib/messages.server");
    const access = await m.checkAccess(data.eventId, context.userId);
    if (!access.ok) return { ok: false };
    const db = await m.admin();
    await db.from("event_message_preferences").upsert(
      { event_id: data.eventId, user_id: context.userId, invitation_id: access.invitationId, notifications_enabled: data.enabled },
      { onConflict: "event_id,user_id" },
    );
    return { ok: true };
  });

export const getMessagesConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const m = await import("@/lib/messages.server");
    return m.loadMessagesConfig();
  });

export const saveMessagesConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      enabled: z.boolean(), allowPhotos: z.boolean(), allowEdit: z.boolean(),
      allowAuthorDelete: z.boolean(), notificationsEnabled: z.boolean(), searchEnabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ok } = await (context.supabase.rpc as any)("is_superadmin", { _user_id: context.userId });
    if (ok !== true) throw new Response("Forbidden", { status: 403 });
    const m = await import("@/lib/messages.server");
    await m.saveMessagesConfigRow(data);
    const db = await m.admin();
    await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: "Réglages Messages modifiés", entity_type: "extension", entity_id: "messages", metadata: data });
    return { ok: true };
  });
