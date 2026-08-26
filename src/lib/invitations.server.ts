import { normalizeConfig, type InvitationsConfig } from "@/extensions/invitations/config";

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

export type PublicInvitationError =
  | "invalid_token"
  | "expired"
  | "cancelled_event"
  | "deleted";

export type PublicInvitationPayload = {
  invitationId: string;
  eventId: string;
  guestName: string | null;
  status: string;
  event: {
    title: string;
    description: string | null;
    startsAt: string | null;
    endsAt: string | null;
    location: string | null;
    typeLabel: string | null;
    organizerName: string | null;
  };
  config: {
    allowMaybe: boolean;
    allowChangeResponse: boolean;
    contributionsEnabled: boolean;
  };
  responseClosed: boolean;
  contribution: string | null;
};

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

  return {
    ok: true,
    payload: {
      invitationId: inv.id,
      eventId: input.eventId,
      guestName: inv.name ?? null,
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
