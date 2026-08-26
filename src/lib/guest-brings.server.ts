import {
  GUEST_BRINGS_SETTINGS_KEY,
  normalizeGuestBringsConfig,
  type GuestBringsConfig,
} from "@/extensions/guest-brings/config";
import type {
  ContributionTypePublic,
  GuestBringsContext,
  GuestContributionPublic,
} from "@/extensions/guest-brings/public-types";

export async function loadGuestBringsConfig(): Promise<GuestBringsConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("invitation_settings")
    .select("settings")
    .eq("key", GUEST_BRINGS_SETTINGS_KEY)
    .maybeSingle();
  return normalizeGuestBringsConfig((data as { settings?: unknown } | null)?.settings);
}

/** Le plugin est-il actif globalement puis pour cet événement ? */
export async function isGuestBringsEnabled(eventId: string, eventTypeKey: string | null): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const config = await loadGuestBringsConfig();

  const { data: ext } = await supabaseAdmin
    .from("extensions")
    .select("enabled")
    .eq("key", "guest-brings")
    .maybeSingle();
  if (!(ext as { enabled?: boolean } | null)?.enabled) return false;

  const { data: override } = await supabaseAdmin
    .from("event_extensions")
    .select("enabled")
    .eq("event_id", eventId)
    .eq("extension_key", "guest-brings")
    .maybeSingle();
  if ((override as { enabled?: boolean } | null)?.enabled === false) return false;

  if (config.eventTypeKeys.length > 0 && (!eventTypeKey || !config.eventTypeKeys.includes(eventTypeKey))) {
    return false;
  }
  return true;
}

export async function loadEventTypeKey(eventId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("events").select("metadata").eq("id", eventId).maybeSingle();
  const meta = ((data as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
  return (meta.event_type as string) ?? null;
}

/** Catalogue des catégories actives, filtré par type d'événement. */
export async function loadCatalog(eventTypeKey: string | null): Promise<ContributionTypePublic[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: types } = await supabaseAdmin
    .from("contribution_types")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  const { data: choices } = await supabaseAdmin
    .from("contribution_choices")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const rows = (types ?? []) as unknown as Array<Record<string, any>>;
  const allChoices = (choices ?? []) as unknown as Array<Record<string, any>>;

  return rows
    .filter((t) => {
      const keys = (t.event_type_keys ?? []) as string[];
      return keys.length === 0 || (eventTypeKey ? keys.includes(eventTypeKey) : false);
    })
    .map((t) => ({
      id: t.id as string,
      key: t.key as string,
      label: t.label as string,
      icon: (t.icon as string) ?? "Gift",
      allowSubchoices: Boolean(t.allow_subchoices),
      allowFreeText: Boolean(t.allow_free_text),
      choices: t.allow_subchoices
        ? allChoices.filter((c) => c.type_id === t.id).map((c) => ({ id: c.id as string, label: c.label as string }))
        : [],
    }));
}

function mapContribution(
  row: Record<string, any>,
  categories: ContributionTypePublic[],
): GuestContributionPublic {
  const cat = categories.find((c) => c.id === row.contribution_type_id) ?? null;
  return {
    id: row.id as string,
    typeId: (row.contribution_type_id as string) ?? null,
    typeKey: cat?.key ?? null,
    typeLabel: cat?.label ?? null,
    icon: cat?.icon ?? "Gift",
    choiceId: (row.choice_id as string) ?? null,
    label: row.label as string,
    quantity: row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : null,
    unit: (row.unit as string) ?? null,
    note: (row.note as string) ?? null,
    status: (row.status as string) ?? "declared",
  };
}

/** Suggestions issues des composantes de repas choisies pour l'événement. */
async function loadMenuHints(eventId: string): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("widget_items")
    .select("payload")
    .eq("widget_key", "event.menu")
    .eq("scope_id", eventId)
    .limit(20);
  const rows = (data ?? []) as unknown as Array<{ payload?: Record<string, unknown> }>;
  return rows
    .map((r) => (r.payload?.label ?? r.payload?.title ?? r.payload?.value) as string | undefined)
    .filter((v): v is string => Boolean(v && v.trim()))
    .slice(0, 6);
}

/** Contexte complet pour la page publique d'invitation. */
export async function buildGuestBringsContext(input: {
  eventId: string;
  invitationId: string;
}): Promise<GuestBringsContext> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const config = await loadGuestBringsConfig();
  const eventTypeKey = await loadEventTypeKey(input.eventId);
  const enabled = await isGuestBringsEnabled(input.eventId, eventTypeKey);
  if (!enabled) {
    return { enabled: false, config, categories: [], contributions: [], othersByType: {}, menuHints: [] };
  }

  const categories = await loadCatalog(eventTypeKey);
  const { data } = await supabaseAdmin
    .from("guest_contributions")
    .select("*")
    .eq("event_id", input.eventId)
    .neq("status", "removed")
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as unknown as Array<Record<string, any>>;

  const mine = rows.filter((r) => r.invitation_id === input.invitationId).map((r) => mapContribution(r, categories));
  const othersByType: Record<string, number> = {};
  for (const r of rows) {
    if (r.invitation_id === input.invitationId) continue;
    const cat = categories.find((c) => c.id === r.contribution_type_id);
    if (!cat) continue;
    othersByType[cat.key] = (othersByType[cat.key] ?? 0) + 1;
  }

  const menuHints = config.useMenuContext ? await loadMenuHints(input.eventId) : [];
  return { enabled: true, config, categories, contributions: mine, othersByType, menuHints };
}

/** Notifie l'organisateur d'un nouvel apport (canal in-app). */
export async function notifyOrganizerAboutContribution(input: {
  eventId: string;
  guestName: string;
  label: string;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("organizer_id, title")
      .eq("id", input.eventId)
      .maybeSingle();
    const ev = event as { organizer_id?: string; title?: string } | null;
    if (!ev?.organizer_id) return;
    await supabaseAdmin.from("notifications").insert({
      user_id: ev.organizer_id,
      channel: "inapp",
      type: "guest_brings",
      title: `${input.guestName} apportera ${input.label}`,
      body: ev.title ?? null,
      metadata: { event_id: input.eventId },
      status: "sent",
      sent_at: new Date().toISOString(),
    } as never);
  } catch (error) {
    console.error("[guest-brings] notification failed", error);
  }
}
