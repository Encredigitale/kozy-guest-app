import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SEARCH_SOURCES } from "@/core/search/registry";
import {
  DEFAULT_SEARCH_SETTINGS,
  SEARCH_SETTINGS_KEY,
  normalizeSearchSettings,
  type SearchResponse,
  type SearchResult,
  type SearchSettings,
  type SearchSourceId,
} from "@/core/search/types";
import { recencyBoost, scoreFields } from "@/core/search/scoring";

const inputSchema = z.object({
  q: z.string().max(200),
  eventId: z.string().uuid().nullable().optional(),
  sources: z.array(z.string()).optional(),
});

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  status: string;
  organizer_id: string;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

/** Masque un numéro : 0612345678 → 06 •• •• •• 78 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, "");
  if (digits.length < 4) return "•• •• ••";
  return `${digits.slice(0, 2)} •• •• •• ${digits.slice(-2)}`;
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 1)}•••@${domain}`;
}

function eventContext(ev: EventRow | undefined): string | null {
  if (!ev) return null;
  const date = ev.starts_at
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(ev.starts_at),
      )
    : null;
  return date ? `${ev.title} · ${date}` : ev.title;
}

const STATUS_LABELS: Record<string, string> = {
  accepted: "Participe",
  declined: "Refus",
  maybe: "Peut-être",
};

/**
 * Moteur central de recherche.
 * Les permissions sont appliquées côté serveur : toutes les lectures passent
 * par le client Supabase de l'utilisateur (RLS), et un bloc désactivé retire
 * complètement sa source des résultats.
 */
export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<SearchResponse> => {
    const db = context.supabase;
    const userId = context.userId;
    const query = data.q.trim();

    const { data: settingsRow } = await db
      .from("invitation_settings")
      .select("settings")
      .eq("key", SEARCH_SETTINGS_KEY)
      .maybeSingle();
    const settings: SearchSettings = settingsRow
      ? normalizeSearchSettings((settingsRow as { settings?: unknown }).settings)
      : DEFAULT_SEARCH_SETTINGS;

    const empty: SearchResponse = { query, results: [], sources: [] };
    if (!settings.enabled) return empty;
    if (data.eventId ? !settings.eventEnabled : !settings.globalEnabled) return empty;
    if (query.length < settings.minChars) return empty;

    // 1. Périmètre accessible (RLS) --------------------------------------
    let eventsQuery = db
      .from("events")
      .select("id, title, description, location, starts_at, status, organizer_id, metadata, updated_at")
      .order("starts_at", { ascending: false })
      .limit(500);
    if (data.eventId) eventsQuery = eventsQuery.eq("id", data.eventId);
    const { data: eventRows } = await eventsQuery;
    const events = ((eventRows ?? []) as unknown as EventRow[]).filter(
      (e) => e.status !== "draft" || e.organizer_id === userId,
    );
    const eventIds = events.map((e) => e.id);
    const eventById = new Map(events.map((e) => [e.id, e]));

    // 2. Blocs désactivés par événement ----------------------------------
    const disabled = new Set<string>(); // `${eventId}:${widgetId}`
    if (eventIds.length > 0) {
      const [{ data: ws }, { data: exts }] = await Promise.all([
        db.from("event_widgets").select("event_id, widget_id, enabled").in("event_id", eventIds),
        db.from("event_extensions").select("event_id, extension_key, enabled").in("event_id", eventIds),
      ]);
      for (const r of (ws ?? []) as { event_id: string; widget_id: string; enabled: boolean }[]) {
        if (r.enabled === false) disabled.add(`${r.event_id}:${r.widget_id}`);
      }
      for (const r of (exts ?? []) as {
        event_id: string;
        extension_key: string;
        enabled: boolean;
      }[]) {
        if (r.enabled === false) disabled.add(`${r.event_id}:ext.${r.extension_key}`);
      }
    }

    const fuzzy = settings.fuzzy;
    const requested = new Set((data.sources ?? []).filter(Boolean));
    const activeSources = SEARCH_SOURCES.filter(
      (s) =>
        !settings.disabledSources.includes(s.id) &&
        (requested.size === 0 || requested.has(s.id)) &&
        (!data.eventId || s.id !== "contacts"),
    );
    const enabled = (id: SearchSourceId) => activeSources.some((s) => s.id === id);
    const blockOn = (eventId: string, widgetId: string | null) =>
      !widgetId || !disabled.has(`${eventId}:${widgetId}`);

    const results: SearchResult[] = [];
    const push = (r: SearchResult) => {
      if (r.score > 0) results.push(r);
    };

    // 3. Événements -------------------------------------------------------
    if (enabled("events")) {
      for (const ev of events) {
        const meta = (ev.metadata ?? {}) as Record<string, unknown>;
        const typeLabel = String(meta["event_type_label"] ?? meta["event_type"] ?? "");
        const dateText = ev.starts_at
          ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(ev.starts_at))
          : "";
        const score = scoreFields(
          query,
          [
            { value: ev.title, weight: 3 },
            { value: typeLabel, weight: 2 },
            { value: ev.location, weight: 2 },
            { value: dateText, weight: 2 },
            { value: ev.description, weight: 1 },
          ],
          { fuzzy },
        );
        push({
          id: ev.id,
          source: "events",
          entityType: "event",
          title: ev.title,
          subtitle: dateText || ev.location,
          eventId: ev.id,
          score: score > 0 ? score + recencyBoost(ev.starts_at) : 0,
        });
      }
    }

    // 4. Contacts (carnet privé de l'utilisateur) -------------------------
    if (enabled("contacts")) {
      const { data: contacts } = await db
        .from("widget_items")
        .select("id, payload, updated_at")
        .eq("widget_key", "contacts.book")
        .eq("owner_id", userId)
        .limit(1000);
      for (const row of (contacts ?? []) as {
        id: string;
        payload: Record<string, unknown> | null;
        updated_at: string | null;
      }[]) {
        const p = row.payload ?? {};
        const name = String(p["name"] ?? "Contact");
        const email = String(p["email"] ?? "");
        const phone = String(p["phone"] ?? "");
        const score = scoreFields(
          query,
          [
            { value: name, weight: 3 },
            { value: email, weight: 2 },
            { value: phone, weight: 2 },
          ],
          { fuzzy },
        );
        const hints = [phone ? maskPhone(phone) : "", email ? maskEmail(email) : ""].filter(Boolean);
        push({
          id: row.id,
          source: "contacts",
          entityType: "contact",
          title: name,
          subtitle: hints.join(" · ") || null,
          personIds: [row.id],
          score,
        });
      }
    }

    if (eventIds.length === 0) {
      return finish(results, settings, activeSources.map((s) => s.id), query);
    }

    // 5. Invités -----------------------------------------------------------
    if (enabled("invitations")) {
      const { data: invs } = await db
        .from("invitations")
        .select("id, event_id, name, email, status, contact_id, updated_at")
        .in("event_id", eventIds)
        .is("revoked_at", null)
        .limit(1000);
      for (const inv of (invs ?? []) as {
        id: string;
        event_id: string;
        name: string | null;
        email: string | null;
        status: string;
        contact_id: string | null;
        updated_at: string | null;
      }[]) {
        if (!blockOn(inv.event_id, "event.guests")) continue;
        const statusLabel = STATUS_LABELS[inv.status] ?? "En attente";
        const score = scoreFields(
          query,
          [
            { value: inv.name, weight: 3 },
            { value: inv.email, weight: 2 },
            { value: statusLabel, weight: 2 },
          ],
          { fuzzy },
        );
        push({
          id: inv.id,
          source: "invitations",
          entityType: "invitation",
          title: inv.name || inv.email || "Invité",
          subtitle: statusLabel,
          context: eventContext(eventById.get(inv.event_id)),
          eventId: inv.event_id,
          blockId: "event.guests",
          personIds: inv.contact_id ? [inv.contact_id] : [],
          score: score > 0 ? score + recencyBoost(eventById.get(inv.event_id)?.starts_at) : 0,
        });
      }
    }

    // 6. Menu & notes (widget_items) ---------------------------------------
    const itemKeys: string[] = [];
    if (enabled("menu")) itemKeys.push("event.menu");
    if (enabled("notes")) itemKeys.push("event.notes");
    if (itemKeys.length > 0) {
      const { data: items } = await db
        .from("widget_items")
        .select("id, widget_key, scope_id, payload")
        .in("widget_key", itemKeys)
        .eq("scope_type", "event")
        .in("scope_id", eventIds)
        .limit(2000);
      let components = new Map<string, string>();
      if (enabled("menu")) {
        const { data: comps } = await db
          .from("menu_components" as never)
          .select("key, label");
        components = new Map(
          ((comps ?? []) as unknown as { key: string; label: string }[]).map((c) => [c.key, c.label]),
        );
      }
      for (const row of (items ?? []) as {
        id: string;
        widget_key: string;
        scope_id: string | null;
        payload: Record<string, unknown> | null;
      }[]) {
        const eventId = row.scope_id ?? "";
        if (!blockOn(eventId, row.widget_key)) continue;
        const p = row.payload ?? {};
        const ev = eventById.get(eventId);
        if (row.widget_key === "event.menu") {
          const label = String(p["label"] ?? "");
          const compLabel = components.get(String(p["component_key"] ?? "")) ?? "Menu";
          const score = scoreFields(
            query,
            [
              { value: label, weight: 3 },
              { value: compLabel, weight: 2 },
            ],
            { fuzzy },
          );
          push({
            id: row.id,
            source: "menu",
            entityType: "menu_item",
            title: label || compLabel,
            subtitle: compLabel,
            context: eventContext(ev),
            eventId,
            blockId: "event.menu",
            score: score > 0 ? score + recencyBoost(ev?.starts_at) : 0,
          });
        } else {
          const title = String(p["title"] ?? "Note");
          const content = String(p["content"] ?? p["text"] ?? "");
          const score = scoreFields(
            query,
            [
              { value: title, weight: 3 },
              { value: content, weight: 1 },
            ],
            { fuzzy },
          );
          push({
            id: row.id,
            source: "notes",
            entityType: "note",
            title,
            subtitle: content.slice(0, 90) || null,
            context: eventContext(ev),
            eventId,
            blockId: "event.notes",
            score: score > 0 ? score + recencyBoost(ev?.starts_at) : 0,
          });
        }
      }
    }

    // 7. Contributions ------------------------------------------------------
    if (enabled("contributions")) {
      const { data: needs } = await db
        .from("contribution_needs" as never)
        .select("id, event_id, label, description, status")
        .in("event_id", eventIds)
        .limit(1000);
      for (const n of (needs ?? []) as unknown as {
        id: string;
        event_id: string;
        label: string;
        description: string | null;
        status: string;
      }[]) {
        if (n.status === "cancelled") continue;
        if (!blockOn(n.event_id, "ext.contributions")) continue;
        const ev = eventById.get(n.event_id);
        const score = scoreFields(
          query,
          [
            { value: n.label, weight: 3 },
            { value: n.description, weight: 1 },
          ],
          { fuzzy },
        );
        push({
          id: n.id,
          source: "contributions",
          entityType: "contribution",
          title: n.label,
          subtitle: n.description,
          context: eventContext(ev),
          eventId: n.event_id,
          blockId: "ext.contributions",
          score: score > 0 ? score + recencyBoost(ev?.starts_at) : 0,
        });
      }
    }

    // 8. Invité apporte ------------------------------------------------------
    if (enabled("guest-brings")) {
      const { data: rows } = await db
        .from("guest_contributions" as never)
        .select("id, event_id, label, note, quantity, unit, contact_id, guest_user_id, invitation_id, status")
        .in("event_id", eventIds)
        .limit(1000);
      const invitationIds = Array.from(
        new Set(
          ((rows ?? []) as unknown as { invitation_id: string | null }[])
            .map((r) => r.invitation_id)
            .filter((v): v is string => !!v),
        ),
      );
      const guestNames = new Map<string, string>();
      if (invitationIds.length > 0) {
        const { data: invs } = await db
          .from("invitations")
          .select("id, name, email")
          .in("id", invitationIds);
        for (const i of (invs ?? []) as { id: string; name: string | null; email: string | null }[]) {
          guestNames.set(i.id, i.name || i.email || "Invité");
        }
      }
      for (const r of (rows ?? []) as unknown as {
        id: string;
        event_id: string;
        label: string;
        note: string | null;
        quantity: number | null;
        unit: string | null;
        contact_id: string | null;
        invitation_id: string | null;
        status: string;
      }[]) {
        if (!blockOn(r.event_id, "ext.guest-brings")) continue;
        const ev = eventById.get(r.event_id);
        const who = r.invitation_id ? guestNames.get(r.invitation_id) ?? "" : "";
        const score = scoreFields(
          query,
          [
            { value: r.label, weight: 3 },
            { value: who, weight: 2 },
            { value: r.unit, weight: 2 },
            { value: r.note, weight: 1 },
          ],
          { fuzzy },
        );
        const qty = r.quantity ? `${r.quantity}${r.unit ? ` ${r.unit}` : ""}` : "";
        push({
          id: r.id,
          source: "guest-brings",
          entityType: "guest_bring",
          title: r.label,
          subtitle: [who, qty].filter(Boolean).join(" · ") || null,
          context: eventContext(ev),
          eventId: r.event_id,
          blockId: "ext.guest-brings",
          personIds: r.contact_id ? [r.contact_id] : [],
          score: score > 0 ? score + recencyBoost(ev?.starts_at) : 0,
        });
      }
    }

    // 9. Cadeaux --------------------------------------------------------------
    if (enabled("gifts")) {
      const { data: gifts } = await db
        .from("event_gift")
        .select("id, event_id, gift_name, description, note, deleted_at")
        .in("event_id", eventIds)
        .is("deleted_at", null)
        .limit(1000);
      const giftList = (gifts ?? []) as unknown as {
        id: string;
        event_id: string;
        gift_name: string;
        description: string | null;
        note: string | null;
      }[];
      const people = new Map<string, { recipients: string[]; givers: string[]; contactIds: string[] }>();
      if (giftList.length > 0) {
        const { data: persons } = await db
          .from("event_gift_person")
          .select("gift_id, role, display_name_snapshot, contact_id")
          .in(
            "gift_id",
            giftList.map((g) => g.id),
          );
        for (const p of (persons ?? []) as {
          gift_id: string;
          role: string;
          display_name_snapshot: string;
          contact_id: string | null;
        }[]) {
          const entry = people.get(p.gift_id) ?? { recipients: [], givers: [], contactIds: [] };
          if (p.role === "recipient") entry.recipients.push(p.display_name_snapshot);
          else entry.givers.push(p.display_name_snapshot);
          if (p.contact_id) entry.contactIds.push(p.contact_id);
          people.set(p.gift_id, entry);
        }
      }
      for (const g of giftList) {
        if (!blockOn(g.event_id, "ext.gifts")) continue;
        const ev = eventById.get(g.event_id);
        const entry = people.get(g.id) ?? { recipients: [], givers: [], contactIds: [] };
        const score = scoreFields(
          query,
          [
            { value: g.gift_name, weight: 3 },
            { value: entry.recipients.join(" "), weight: 2 },
            { value: entry.givers.join(" "), weight: 2 },
            { value: g.description, weight: 1 },
            { value: g.note, weight: 1 },
          ],
          { fuzzy },
        );
        const parts: string[] = [];
        if (entry.recipients.length) parts.push(`Offert à ${entry.recipients.join(", ")}`);
        if (entry.givers.length) parts.push(`par ${entry.givers.join(", ")}`);
        push({
          id: g.id,
          source: "gifts",
          entityType: "gift",
          title: g.gift_name,
          subtitle: parts.join(" ") || null,
          context: eventContext(ev),
          eventId: g.event_id,
          blockId: "ext.gifts",
          personIds: entry.contactIds,
          score: score > 0 ? score + recencyBoost(ev?.starts_at) : 0,
        });
      }
    }

    // 10. Photos ---------------------------------------------------------------
    if (enabled("photos")) {
      const { data: photos } = await db
        .from("event_photos")
        .select("id, event_id, description, author_label, status, deleted_at, created_at")
        .in("event_id", eventIds)
        .is("deleted_at", null)
        .eq("status", "published")
        .limit(1000);
      for (const p of (photos ?? []) as unknown as {
        id: string;
        event_id: string;
        description: string | null;
        author_label: string | null;
        created_at: string;
      }[]) {
        if (!blockOn(p.event_id, "ext.photos")) continue;
        const ev = eventById.get(p.event_id);
        const score = scoreFields(
          query,
          [
            { value: p.description, weight: 3 },
            { value: p.author_label, weight: 2 },
            { value: ev?.title, weight: 1 },
          ],
          { fuzzy },
        );
        push({
          id: p.id,
          source: "photos",
          entityType: "photo",
          title: p.description || "Photo",
          subtitle: p.author_label ? `Ajoutée par ${p.author_label}` : null,
          context: eventContext(ev),
          eventId: p.event_id,
          blockId: "ext.photos",
          score: score > 0 ? score + recencyBoost(p.created_at) : 0,
        });
      }
    }

    // 11. Recettes -------------------------------------------------------------
    // Le contenu des photos et la page externe ne sont jamais indexés.
    if (enabled("recipes")) {
      const { data: recipes } = await db
        .from("menu_recipe")
        .select("id, event_id, menu_item_id, title, text_content, external_url_note, updated_at")
        .in("event_id", eventIds)
        .is("deleted_at", null)
        .limit(1000);
      for (const r of (recipes ?? []) as unknown as {
        id: string;
        event_id: string;
        menu_item_id: string;
        title: string;
        text_content: string | null;
        external_url_note: string | null;
        updated_at: string | null;
      }[]) {
        if (!blockOn(r.event_id, "event.menu")) continue;
        const ev = eventById.get(r.event_id);
        const score = scoreFields(
          query,
          [
            { value: r.title, weight: 3 },
            { value: r.text_content, weight: 1 },
            { value: r.external_url_note, weight: 1 },
          ],
          { fuzzy },
        );
        push({
          id: r.id,
          source: "recipes",
          entityType: "recipe",
          title: r.title || "Recette",
          subtitle: (r.text_content ?? r.external_url_note ?? "").slice(0, 90) || null,
          context: eventContext(ev),
          eventId: r.event_id,
          blockId: "event.menu",
          score: score > 0 ? score + recencyBoost(r.updated_at ?? ev?.starts_at) : 0,
        });
      }
    }

    // 12. Messages -------------------------------------------------------------
    // Mêmes permissions que la discussion : chaque événement est revérifié.
    if (enabled("messages") && eventIds.length > 0) {
      const m = await import("@/lib/messages.server");
      const cfg = await m.loadMessagesConfig();
      const term = query.trim().replace(/[%_,()]/g, " ").trim();
      if (cfg.searchEnabled && term.length >= 2) {
        const adminDb = await m.admin();
        const { data: msgs } = await adminDb
          .from("event_message")
          .select("id, event_id, author_user_id, text_content, created_at")
          .in("event_id", eventIds)
          .is("deleted_at", null)
          .ilike("text_content", `%${term}%`)
          .order("created_at", { ascending: false })
          .limit(200);
        const rows = (msgs ?? []) as { id: string; event_id: string; author_user_id: string; text_content: string | null; created_at: string }[];
        const allowed = new Set<string>();
        for (const evId of [...new Set(rows.map((r) => r.event_id))]) {
          if ((await m.checkAccess(evId, userId)).ok) allowed.add(evId);
        }
        const visible = rows.filter((r) => allowed.has(r.event_id));
        const authors = [...new Set(visible.map((r) => r.author_user_id))];
        const { data: profs } = authors.length
          ? await adminDb.from("profiles").select("user_id, display_name").in("user_id", authors)
          : { data: [] };
        const names = new Map(((profs ?? []) as { user_id: string; display_name: string | null }[]).map((p) => [p.user_id, p.display_name]));
        for (const r of visible) {
          const ev = eventById.get(r.event_id);
          const score = scoreFields(query, [{ value: r.text_content, weight: 2 }], { fuzzy });
          push({
            id: r.id,
            source: "messages",
            entityType: "message",
            title: `« ${(r.text_content ?? "").slice(0, 120)} »`,
            subtitle: names.get(r.author_user_id) ?? "Participant",
            context: eventContext(ev),
            eventId: r.event_id,
            blockId: "ext.messages",
            score: (score > 0 ? score : 1) + recencyBoost(r.created_at),
          });
        }
      }
    }

    return finish(results, settings, activeSources.map((s) => s.id), query);
  });

function finish(
  results: SearchResult[],
  settings: SearchSettings,
  sources: SearchSourceId[],
  query: string,
): SearchResponse {
  const sorted = results.sort((a, b) => b.score - a.score).slice(0, settings.maxResults);
  return { query, results: sorted, sources };
}

/** Réglages exposés à l'interface (back-office SuperAdmin + UI). */
export const getSearchSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SearchSettings> => {
    const { data } = await context.supabase
      .from("invitation_settings")
      .select("settings")
      .eq("key", SEARCH_SETTINGS_KEY)
      .maybeSingle();
    return data
      ? normalizeSearchSettings((data as { settings?: unknown }).settings)
      : DEFAULT_SEARCH_SETTINGS;
  });
