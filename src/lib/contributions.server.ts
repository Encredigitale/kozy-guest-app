import {
  CONTRIBUTIONS_SETTINGS_KEY,
  computeCoverage,
  normalizeContributionsConfig,
  type ContributionsConfig,
  type NeedPriority,
  type NeedStatus,
  type NeedType,
} from "@/extensions/contributions/config";
import type { ContributionsContext, PublicNeed } from "@/extensions/contributions/public-types";

export async function loadContributionsConfig(): Promise<ContributionsConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("invitation_settings")
    .select("settings")
    .eq("key", CONTRIBUTIONS_SETTINGS_KEY)
    .maybeSingle();
  return normalizeContributionsConfig((data as { settings?: unknown } | null)?.settings);
}

export async function loadEventTypeKey(eventId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("events").select("metadata").eq("id", eventId).maybeSingle();
  const meta = ((data as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
  return (meta.event_type as string) ?? null;
}

/** Plugin actif globalement, pour l'événement, et pour ce type d'événement ? */
export async function isContributionsEnabled(eventId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const config = await loadContributionsConfig();

  const { data: ext } = await supabaseAdmin
    .from("extensions")
    .select("enabled")
    .eq("key", "contributions")
    .maybeSingle();
  if (!(ext as { enabled?: boolean } | null)?.enabled) return false;

  const { data: override } = await supabaseAdmin
    .from("event_extensions")
    .select("enabled")
    .eq("event_id", eventId)
    .eq("extension_key", "contributions")
    .maybeSingle();
  if ((override as { enabled?: boolean } | null)?.enabled === false) return false;

  // Exclusivité mutuelle avec « Invité apporte ».
  const { isExclusiveWinner } = await import("@/lib/extension-exclusivity.server");
  if (!(await isExclusiveWinner(eventId, "contributions"))) return false;

  if (config.eventTypeKeys.length > 0) {
    const typeKey = await loadEventTypeKey(eventId);
    if (!typeKey || !config.eventTypeKeys.includes(typeKey)) return false;
  }
  return true;
}

function orderNeeds(needs: PublicNeed[], order: ContributionsConfig["displayOrder"]): PublicNeed[] {
  const priorityWeight: Record<NeedPriority, number> = { high: 0, important: 1, normal: 2 };
  const stateWeight = { available: 0, partial: 1, covered: 2, closed: 3, cancelled: 4 } as const;
  const sorted = [...needs];
  if (order === "priority") sorted.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);
  else if (order === "coverage") sorted.sort((a, b) => stateWeight[a.state] - stateWeight[b.state]);
  return sorted;
}

/** Contexte du plugin pour la page publique d'invitation. */
export async function buildContributionsContext(input: {
  eventId: string;
  invitationId: string;
}): Promise<ContributionsContext> {
  const config = await loadContributionsConfig();
  const enabled = await isContributionsEnabled(input.eventId);
  if (!enabled) return { enabled: false, config, needs: [] };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: needRows } = await supabaseAdmin
    .from("contribution_needs")
    .select("*, contribution_categories(label, icon), contribution_units(label, kind)")
    .eq("event_id", input.eventId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  const needs = (needRows ?? []) as unknown as Array<Record<string, any>>;
  if (needs.length === 0) return { enabled: true, config, needs: [] };

  const { data: commitRows } = await supabaseAdmin
    .from("contribution_commitments")
    .select("id, need_id, invitation_id, quantity, note, status, guest_name")
    .in(
      "need_id",
      needs.map((n) => n.id as string),
    )
    .eq("status", "active");
  const commitments = (commitRows ?? []) as unknown as Array<Record<string, any>>;

  const mapped: PublicNeed[] = needs.map((n) => {
    const mine = commitments.filter((c) => c.need_id === n.id && c.invitation_id === input.invitationId);
    const all = commitments.filter((c) => c.need_id === n.id);
    const committed = all.reduce((sum, c) => sum + Number(c.quantity ?? 0), 0);
    const coverage = computeCoverage({
      target: Number(n.target_quantity ?? 0),
      committed,
      status: n.status as NeedStatus,
    });
    return {
      id: n.id as string,
      label: n.label as string,
      description: (n.description as string) ?? null,
      categoryLabel: (n.contribution_categories?.label as string) ?? null,
      icon: (n.contribution_categories?.icon as string) ?? "Package",
      needType: (n.need_type as NeedType) ?? "quantity",
      priority: (n.priority as NeedPriority) ?? "normal",
      target: Number(n.target_quantity ?? 0),
      unitLabel: (n.contribution_units?.label as string) ?? null,
      unitKind: (n.contribution_units?.kind as string) ?? null,
      allowOvercommitment: Boolean(n.allow_overcommitment),
      committed: coverage.committed,
      remaining: coverage.remaining,
      percent: coverage.percent,
      state: coverage.state,
      participants:
        config.participantVisibility === "transparent"
          ? all.map((c) => ({ name: (c.guest_name as string) ?? "Un invité", quantity: Number(c.quantity ?? 0) }))
          : [],
      myCommitment: mine[0]
        ? {
            id: mine[0].id as string,
            quantity: Number(mine[0].quantity ?? 0),
            note: (mine[0].note as string) ?? null,
          }
        : null,
    };
  });

  return { enabled: true, config, needs: orderNeeds(mapped, config.displayOrder) };
}

/** Notification in-app à l'organisateur après un engagement. */
export async function notifyOrganizerAboutCommitment(input: {
  eventId: string;
  guestName: string;
  needLabel: string;
  quantityLabel: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("organizer_id, title")
    .eq("id", input.eventId)
    .maybeSingle();
  const organizerId = (event as { organizer_id?: string } | null)?.organizer_id;
  if (!organizerId) return;
  await supabaseAdmin.from("notifications").insert({
    user_id: organizerId,
    channel: "inapp",
    type: "contribution_commitment",
    title: "Nouvelle contribution",
    body: `${input.guestName} prend en charge ${input.quantityLabel} pour « ${input.needLabel} ».`,
    metadata: { event_id: input.eventId },
    status: "sent",
    sent_at: new Date().toISOString(),
  } as never);
}
