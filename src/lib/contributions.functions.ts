import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolvePublicInvitation } from "@/lib/invitations.server";
import {
  buildContributionsContext,
  loadContributionsConfig,
  notifyOrganizerAboutCommitment,
} from "@/lib/contributions.server";
import { formatQuantity } from "@/extensions/contributions/config";
import type { ContributionsResult } from "@/extensions/contributions/public-types";

const baseInput = {
  eventId: z.string().uuid(),
  invitationId: z.string().uuid(),
  token: z.string().min(10).max(200),
};

/** Page publique : besoins de l'événement et engagements de l'invité. */
export const getPublicContributions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object(baseInput).parse(data))
  .handler(async ({ data }): Promise<ContributionsResult> => {
    const resolved = await resolvePublicInvitation(data);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    return { ok: true, context: await buildContributionsContext(data) };
  });

/** Page publique : prise ou modification d'un engagement (contrôle serveur). */
export const commitToNeed = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ...baseInput,
        needId: z.string().uuid(),
        commitmentId: z.string().uuid().optional(),
        quantity: z.number().positive().max(1000000),
        note: z.string().trim().max(300).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<ContributionsResult> => {
    const resolved = await resolvePublicInvitation(data);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    if (resolved.payload.status !== "accepted") return { ok: false, error: "not_accepted" };

    const config = await loadContributionsConfig();
    const context = await buildContributionsContext(data);
    if (!context.enabled) return { ok: false, error: "disabled" };
    if (data.commitmentId && !config.allowGuestEdit) return { ok: false, error: "edit_disabled" };

    const need = context.needs.find((n) => n.id === data.needId);
    if (!need) return { ok: false, error: "not_found" };
    if (
      !data.commitmentId &&
      !config.allowMultipleCommitments &&
      context.needs.some((n) => n.myCommitment)
    ) {
      return { ok: false, error: "single_only", context };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invitation } = await supabaseAdmin
      .from("invitations")
      .select("guest_user_id, contact_id, name, email")
      .eq("id", data.invitationId)
      .maybeSingle();
    const inv = (invitation ?? {}) as Record<string, any>;
    const guestName = (inv.name as string) || resolved.payload.guestName || "Un invité";

    const { data: rpc, error } = await supabaseAdmin.rpc("commit_contribution", {
      _need_id: data.needId,
      _invitation_id: data.invitationId,
      _quantity: data.quantity,
      _note: data.note ?? null,
      _commitment_id: data.commitmentId ?? null,
      _guest_name: guestName,
      _user_id: inv.guest_user_id ?? null,
      _contact_id: inv.contact_id ?? null,
    } as never);
    if (error) return { ok: false, error: "failed", context: await buildContributionsContext(data) };

    const result = (rpc ?? {}) as { ok?: boolean; error?: string; remaining?: number };
    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? "failed",
        remaining: result.remaining,
        context: await buildContributionsContext(data),
      };
    }

    if (!data.commitmentId && config.notifyOrganizer) {
      await notifyOrganizerAboutCommitment({
        eventId: data.eventId,
        guestName,
        needLabel: need.label,
        quantityLabel: formatQuantity(data.quantity, need.unitLabel, need.unitKind),
      });
    }

    return { ok: true, context: await buildContributionsContext(data) };
  });

/** Page publique : désengagement. */
export const cancelCommitment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ ...baseInput, commitmentId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<ContributionsResult> => {
    const resolved = await resolvePublicInvitation(data);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    const config = await loadContributionsConfig();
    if (!config.allowGuestEdit) return { ok: false, error: "edit_disabled" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("contribution_commitments")
      .update({ status: "cancelled" } as never)
      .eq("id", data.commitmentId)
      .eq("invitation_id", data.invitationId)
      .select("need_id");
    const needId = ((rows ?? [])[0] as { need_id?: string } | undefined)?.need_id ?? null;
    await supabaseAdmin.from("contribution_logs").insert({
      event_id: data.eventId,
      need_id: needId,
      action: "commitment_cancelled",
      actor_label: resolved.payload.guestName ?? null,
      metadata: { commitment_id: data.commitmentId },
    } as never);

    return { ok: true, context: await buildContributionsContext(data) };
  });
