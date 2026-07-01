import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public server functions for the dynamic invitation link:
// /invitation/:eventId/:invitationId?token=<token>
//
// These call SECURITY DEFINER RPCs that validate the (event, invitation, token)
// triple internally, so no service role key is required.

const uuidSchema = z.string().uuid();
const tokenSchema = z.string().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/);

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase non configuré");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const INVITATION_ERROR = {
  INVALID: "INVITATION_INVALID",
  EXPIRED: "INVITATION_EXPIRED",
  REVOKED: "INVITATION_REVOKED",
  EVENT_MISSING: "EVENT_MISSING",
} as const;

function mapPgError(msg: string | undefined): string {
  if (!msg) return "OTHER";
  if (msg.includes("INVITATION_EXPIRED")) return INVITATION_ERROR.EXPIRED;
  if (msg.includes("INVITATION_REVOKED")) return INVITATION_ERROR.REVOKED;
  if (msg.includes("INVITATION_INVALID")) return INVITATION_ERROR.INVALID;
  if (msg.includes("EVENT_MISSING")) return INVITATION_ERROR.EVENT_MISSING;
  return msg;
}

type InvitationPayload = {
  event: {
    id: string;
    title: string;
    event_type: string;
    event_subtype: string | null;
    event_at: string;
    location: string | null;
    description: string | null;
    menu_or_theme: string | null;
  };
  organizer: { first_name: string | null; last_name: string | null };
  guest: {
    id: string;
    name: string;
    responded_at: string | null;
    rsvp_status: string | null;
  };
  contributions: Array<{
    id: string;
    category: string;
    label: string;
    claimed: boolean;
    claimed_by_me: boolean;
  }>;
  stats: {
    totalGuests: number;
    confirmedGuests: number;
    claimedContributions: number;
    openContributions: number;
  };
  finished: boolean;
  locked: boolean;
};

export const getInvitation = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({ eventId: uuidSchema, invitationId: uuidSchema, token: tokenSchema })
      .parse(d),
  )
  .handler(async ({ data }): Promise<InvitationPayload> => {
    const sb = publicClient();
    // rpc typed via generated types
    const { data: result, error } = await sb.rpc("invitation_get", {
      p_event_id: data.eventId,
      p_invitation_id: data.invitationId,
      p_token: data.token,
    });
    if (error) throw new Error(mapPgError(error.message));
    return result as unknown as InvitationPayload;
  });

export const respondToInvitation = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        eventId: uuidSchema,
        invitationId: uuidSchema,
        token: tokenSchema,
        status: z.enum(["yes", "no"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    // rpc typed via generated types
    const { error } = await sb.rpc("invitation_respond", {
      p_event_id: data.eventId,
      p_invitation_id: data.invitationId,
      p_token: data.token,
      p_status: data.status,
    });
    if (error) throw new Error(mapPgError(error.message));
    return { ok: true };
  });

export const claimInvitationContribution = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        eventId: uuidSchema,
        invitationId: uuidSchema,
        token: tokenSchema,
        contributionId: uuidSchema.nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    // rpc typed via generated types
    const { error } = await sb.rpc("invitation_claim_contribution", {
      p_event_id: data.eventId,
      p_invitation_id: data.invitationId,
      p_token: data.token,
      p_contribution_id: data.contributionId as string | null,
    });
    if (error) throw new Error(mapPgError(error.message));
    return { ok: true };
  });

export const addCustomContribution = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        eventId: uuidSchema,
        invitationId: uuidSchema,
        token: tokenSchema,
        label: z.string().trim().min(2).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    // rpc typed via generated types
    const { error } = await sb.rpc("invitation_add_custom_contribution", {
      p_event_id: data.eventId,
      p_invitation_id: data.invitationId,
      p_token: data.token,
      p_label: data.label,
    });
    if (error) throw new Error(mapPgError(error.message));
    return { ok: true };
  });
