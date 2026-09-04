import { normalizeConfig, type InvitationsConfig } from "@/extensions/invitations/config";
import type {
  PublicInvitationError,
  PublicInvitationPayload,
} from "@/extensions/invitations/public-types";

export type { PublicInvitationError, PublicInvitationPayload };

export function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loadConfig(): Promise<InvitationsConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("invitation_settings")
    .select("settings")
    .eq("key", "default")
    .maybeSingle();
  return normalizeConfig((data as { settings?: unknown } | null)?.settings);
}

/** Menu de l'événement (groupé par composante) pour l'e-mail et la page publique. */
export async function loadEventMenu(
  eventId: string,
): Promise<{ label: string; items: string[] }[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("widget_items")
    .select("payload, position, created_at")
    .eq("widget_key", "event.menu")
    .eq("scope_type", "event")
    .eq("scope_id", eventId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const items = (rows ?? []) as { payload: Record<string, unknown> | null }[];
  if (items.length === 0) return [];

  const { data: comps } = await supabaseAdmin
    .from("menu_components" as never)
    .select("key, label, sort_order")
    .order("sort_order", { ascending: true });
  const compList = (comps ?? []) as unknown as { key: string; label: string }[];
  const labels = new Map(compList.map((c) => [c.key, c.label]));

  const groups = new Map<string, string[]>();
  for (const row of items) {
    const payload = row.payload ?? {};
    const key = String(payload["component_key"] ?? "autre");
    const label = String(payload["label"] ?? payload["value"] ?? "").trim();
    if (!label) continue;
    const group = labels.get(key) ?? "Autre";
    const list = groups.get(group) ?? [];
    list.push(label);
    groups.set(group, list);
  }

  return Array.from(groups.entries()).map(([label, values]) => ({ label, items: values }));
}


/** Vérifie le token côté serveur et renvoie une charge utile publique minimale. */
export async function resolvePublicInvitation(input: {
  eventId: string;
  invitationId: string;
  token: string;
  markOpened?: boolean;
}): Promise<
  | { ok: true; payload: PublicInvitationPayload }
  | { ok: false; error: PublicInvitationError }
> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const config = await loadConfig();

  const { data: invitation } = await supabaseAdmin
    .from("invitations")
    .select("*")
    .eq("id", input.invitationId)
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (!invitation) return { ok: false, error: "deleted" };
  const inv = invitation as Record<string, any>;
  if (!inv.token || inv.token !== input.token || inv.revoked_at) {
    return { ok: false, error: "invalid_token" };
  }
  if (inv.status === "cancelled") return { ok: false, error: "deleted" };
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, title, description, starts_at, ends_at, location, status, metadata, organizer_id")
    .eq("id", input.eventId)
    .maybeSingle();

  if (!event) return { ok: false, error: "deleted" };
  const ev = event as Record<string, any>;
  if (ev.status === "archived") return { ok: false, error: "cancelled_event" };
  // Un événement en brouillon n'est visible que de son créateur.
  if (ev.status === "draft") return { ok: false, error: "cancelled_event" };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("user_id", ev.organizer_id)
    .maybeSingle();

  // Type d'événement (libellé public)
  const meta = (ev.metadata ?? {}) as Record<string, unknown>;
  let typeLabel: string | null = (meta.event_type_other as string) ?? null;
  const typeKey = (meta.event_type as string) ?? null;
  if (typeKey) {
    const { data: type } = await supabaseAdmin
      .from("event_types")
      .select("label")
      .eq("key", typeKey)
      .maybeSingle();
    typeLabel = (type as { label?: string } | null)?.label ?? typeLabel;
  }

  // Le widget Contributions est-il actif pour cet événement ?
  let contributionsEnabled = false;
  const { data: widget } = await supabaseAdmin
    .from("widgets")
    .select("id, enabled, status")
    .eq("id", "event.contributions")
    .maybeSingle();
  const w = widget as Record<string, any> | null;
  if (w?.enabled && (w.status ?? "published") === "published") {
    const { data: override } = await supabaseAdmin
      .from("event_widgets")
      .select("enabled")
      .eq("event_id", input.eventId)
      .eq("widget_id", "event.contributions")
      .maybeSingle();
    contributionsEnabled = (override as { enabled?: boolean } | null)?.enabled !== false;
  }

  // Date limite de réponse
  let responseClosed = false;
  if (ev.starts_at && config.responseDeadlineDays > 0) {
    const deadline = new Date(ev.starts_at).getTime() - config.responseDeadlineDays * 86_400_000;
    responseClosed = Date.now() > deadline;
  }

  if (input.markOpened) {
    const patch: Record<string, unknown> = { opened_at: inv.opened_at ?? new Date().toISOString() };
    if (inv.status === "sent" || inv.status === "draft") patch.status = "opened";
    await supabaseAdmin.from("invitations").update(patch as never).eq("id", inv.id);
    if (!inv.opened_at) {
      await supabaseAdmin
        .from("invitation_logs")
        .insert({ invitation_id: inv.id, event_type: "opened" } as never);
    }
  }

  const { data: contributionLog } = await supabaseAdmin
    .from("invitation_logs")
    .select("metadata")
    .eq("invitation_id", inv.id)
    .eq("event_type", "contribution")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Modules activés par l'organisateur sur cet événement
  const { data: enabledRows } = await supabaseAdmin
    .from("event_widgets")
    .select("widget_id, enabled")
    .eq("event_id", input.eventId);
  const enabledMap = new Map(
    ((enabledRows ?? []) as { widget_id: string; enabled: boolean }[]).map((r) => [
      r.widget_id,
      r.enabled === true,
    ]),
  );
  const isOn = (id: string) => enabledMap.get(id) === true;
  const menuOn = isOn("event.menu");
  const guestsOn = isOn("event.guests") || isOn("ext.invitations");
  const bringsOn = isOn("ext.guest-brings");

  // Menu de l'événement
  const menu = menuOn ? await loadEventMenu(input.eventId) : [];

  // Liste des invités de l'événement (nom + statut)
  const { data: allInvitations } = await supabaseAdmin
    .from("invitations")
    .select("id, name, email, status")
    .eq("event_id", input.eventId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  const invRows = (allInvitations ?? []) as { id: string; name: string | null; email: string | null; status: string }[];
  const guests = guestsOn
    ? invRows
        .filter((g) => g.status !== "cancelled")
        .map((g) => ({
          name: g.name || (g.email ? g.email.split("@")[0]! : "Invité"),
          status: g.status,
          isSelf: g.id === inv.id,
        }))
    : [];
  const nameById = new Map(invRows.map((g) => [g.id, g.name || "Invité"]));

  // Ce que les invités apportent
  const { data: bringRows } = bringsOn
    ? await supabaseAdmin
        .from("guest_contributions")
        .select("invitation_id, label, quantity, unit, status, created_at")
        .eq("event_id", input.eventId)
        .neq("status", "removed")
        .order("created_at", { ascending: true })
    : { data: [] as unknown[] };
  const brings = ((bringRows ?? []) as {
    invitation_id: string;
    label: string;
    quantity: number | null;
    unit: string | null;
  }[]).map((b) => ({
    guestName: nameById.get(b.invitation_id) ?? "Invité",
    label: b.label,
    quantity: b.quantity ?? null,
    unit: b.unit ?? null,
  }));


  return {
    ok: true,
    payload: {
      menu,
      guests,
      brings,
      invitationId: inv.id,
      eventId: input.eventId,
      guestName: inv.name ?? null,
      guestEmail: inv.email ?? null,
      hasAccount: !!inv.guest_user_id,
      status: inv.status,
      event: {
        title: ev.title,
        description: ev.description ?? null,
        startsAt: ev.starts_at ?? null,
        endsAt: ev.ends_at ?? null,
        location: ev.location ?? null,
        typeLabel,
        organizerName: (profile as { display_name?: string } | null)?.display_name ?? null,
      },
      config: {
        allowMaybe: config.allowMaybe,
        allowChangeResponse: config.allowChangeResponse,
        contributionsEnabled,
      },
      responseClosed,
      contribution:
        ((contributionLog as { metadata?: Record<string, unknown> } | null)?.metadata?.text as string) ??
        null,
    },
  };
}
