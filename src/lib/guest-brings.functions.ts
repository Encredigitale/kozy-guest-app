import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolvePublicInvitation } from "@/lib/invitations.server";
import {
  buildGuestBringsContext,
  loadGuestBringsConfig,
  notifyOrganizerAboutContribution,
} from "@/lib/guest-brings.server";
import type { GuestBringsResult } from "@/extensions/guest-brings/public-types";

/** Page publique : contexte du plugin (catégories, apports de l'invité, doublons). */
export const getGuestBrings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        invitationId: z.string().uuid(),
        token: z.string().min(10).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<GuestBringsResult> => {
    const resolved = await resolvePublicInvitation(data);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    const context = await buildGuestBringsContext(data);
    return { ok: true, context };
  });

/** Page publique : déclaration ou modification d'un apport. */
export const saveGuestContribution = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        invitationId: z.string().uuid(),
        token: z.string().min(10).max(200),
        contributionId: z.string().uuid().optional(),
        typeId: z.string().uuid(),
        choiceId: z.string().uuid().nullable().optional(),
        label: z.string().trim().min(1).max(160),
        quantity: z.number().min(0).max(999).nullable().optional(),
        unit: z.string().trim().max(40).nullable().optional(),
        note: z.string().trim().max(300).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<GuestBringsResult> => {
    const resolved = await resolvePublicInvitation(data);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    if (resolved.payload.status !== "accepted") return { ok: false, error: "not_accepted" };

    const context = await buildGuestBringsContext(data);
    if (!context.enabled) return { ok: false, error: "disabled" };
    if (
      !data.contributionId &&
      !context.config.multiple &&
      context.contributions.length > 0
    ) {
      return { ok: false, error: "single_only" };
    }

    const config = await loadGuestBringsConfig();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      event_id: data.eventId,
      invitation_id: data.invitationId,
      contribution_type_id: data.typeId,
      choice_id: data.choiceId ?? null,
      label: data.label,
      quantity: config.quantityEnabled ? (data.quantity ?? null) : null,
      unit: config.quantityEnabled ? (data.unit ?? null) : null,
      note: config.notesEnabled ? (data.note ?? null) : null,
    };

    if (data.contributionId) {
      await supabaseAdmin
        .from("guest_contributions")
        .update({ ...payload, status: "modified" } as never)
        .eq("id", data.contributionId)
        .eq("invitation_id", data.invitationId);
    } else {
      const { data: invitation } = await supabaseAdmin
        .from("invitations")
        .select("guest_user_id, contact_id")
        .eq("id", data.invitationId)
        .maybeSingle();
      const inv = (invitation ?? {}) as Record<string, any>;
      await supabaseAdmin.from("guest_contributions").insert({
        ...payload,
        guest_user_id: inv.guest_user_id ?? null,
        contact_id: inv.contact_id ?? null,
        status: "declared",
      } as never);
      if (config.notifyOrganizer) {
        await notifyOrganizerAboutContribution({
          eventId: data.eventId,
          guestName: resolved.payload.guestName ?? "Un invité",
          label: data.label,
        });
      }
    }

    await supabaseAdmin.from("invitation_logs").insert({
      invitation_id: data.invitationId,
      event_type: "contribution_declared",
      metadata: { label: data.label, quantity: data.quantity ?? null, note: data.note ?? null },
    } as never);

    return { ok: true, context: await buildGuestBringsContext(data) };
  });

/** Page publique : suppression d'un apport (conservé en historique). */
export const deleteGuestContribution = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        invitationId: z.string().uuid(),
        token: z.string().min(10).max(200),
        contributionId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<GuestBringsResult> => {
    const resolved = await resolvePublicInvitation(data);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("guest_contributions")
      .update({ status: "removed" } as never)
      .eq("id", data.contributionId)
      .eq("invitation_id", data.invitationId);
    await supabaseAdmin.from("invitation_logs").insert({
      invitation_id: data.invitationId,
      event_type: "contribution_removed",
      metadata: { contribution_id: data.contributionId },
    } as never);
    return { ok: true, context: await buildGuestBringsContext(data) };
  });
