import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public server functions for the dynamic invitation link:
// /invitation/:eventId/:invitationId?token=<token>
//
// invitationId = event_guests.id
// token        = event_guests.invite_token (unique)

const uuidSchema = z.string().uuid();
const tokenSchema = z.string().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const INVITATION_ERROR = {
  INVALID: "INVITATION_INVALID",
  EXPIRED: "INVITATION_EXPIRED",
  REVOKED: "INVITATION_REVOKED",
  EVENT_MISSING: "EVENT_MISSING",
} as const;

async function resolveInvitation(
  eventId: string,
  invitationId: string,
  token: string,
  opts: { touch?: boolean } = {},
) {
  const sb = await admin();

  const { data: guest } = await sb
    .from("event_guests")
    .select(
      "id, event_id, name, email, invite_token, status, expires_at, last_opened_at, responded_at, rsvp_status",
    )
    .eq("id", invitationId)
    .maybeSingle();

  if (!guest || guest.event_id !== eventId || guest.invite_token !== token) {
    throw new Error(INVITATION_ERROR.INVALID);
  }
  if (guest.status !== "active") {
    throw new Error(INVITATION_ERROR.REVOKED);
  }
  if (guest.expires_at && new Date(guest.expires_at).getTime() < Date.now()) {
    throw new Error(INVITATION_ERROR.EXPIRED);
  }

  const { data: ev } = await sb
    .from("events")
    .select(
      "id, title, event_type, event_subtype, event_at, location, description, menu_or_theme",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (!ev) throw new Error(INVITATION_ERROR.EVENT_MISSING);

  if (opts.touch) {
    await sb
      .from("event_guests")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("id", guest.id);
  }

  return { ev, guest };
}

export const getInvitation = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({ eventId: uuidSchema, invitationId: uuidSchema, token: tokenSchema })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { ev, guest } = await resolveInvitation(
      data.eventId,
      data.invitationId,
      data.token,
      { touch: true },
    );
    const sb = await admin();

    const [{ data: guests }, { data: items }] = await Promise.all([
      sb
        .from("event_guests")
        .select("id, name, responded_at, rsvp_status")
        .eq("event_id", ev.id)
        .order("created_at", { ascending: true }),
      sb
        .from("event_contributions")
        .select("id, category, label, claimed_by_name")
        .eq("event_id", ev.id)
        .order("created_at", { ascending: true }),
    ]);

    const eventEndPassed = new Date(ev.event_at).getTime() < Date.now() - 24 * 3600 * 1000;

    return {
      event: {
        id: ev.id,
        title: ev.title,
        event_type: ev.event_type,
        event_subtype: ev.event_subtype,
        event_at: ev.event_at,
        location: ev.location,
        description: ev.description,
        menu_or_theme: ev.menu_or_theme,
      },
      guest: {
        id: guest.id,
        name: guest.name,
        responded_at: guest.responded_at,
        rsvp_status: guest.rsvp_status,
      },
      guests: (guests ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        responded_at: g.responded_at,
        rsvp_status: g.rsvp_status,
      })),
      contributions: (items ?? []).map((i) => ({
        id: i.id,
        category: i.category,
        label: i.label,
        claimed: i.claimed_by_name !== null && i.claimed_by_name !== "",
        claimed_by_me: i.claimed_by_name === guest.name,
      })),
      locked: eventEndPassed,
    };
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
    const { ev, guest } = await resolveInvitation(
      data.eventId,
      data.invitationId,
      data.token,
    );
    // Event finished more than 24h ago -> lock
    if (new Date(ev.event_at).getTime() < Date.now() - 24 * 3600 * 1000) {
      throw new Error(INVITATION_ERROR.EXPIRED);
    }
    const sb = await admin();

    // Insert or update an RSVP row for this guest.
    const { data: rsvp, error: rErr } = await sb
      .from("event_rsvps")
      .insert({
        event_id: ev.id,
        guest_name: guest.name,
        status: data.status,
      })
      .select("id")
      .single();
    if (rErr || !rsvp) throw new Error("Enregistrement impossible");

    const { error: uErr } = await sb
      .from("event_guests")
      .update({
        responded_at: new Date().toISOString(),
        rsvp_status: data.status,
        rsvp_id: rsvp.id,
      })
      .eq("id", guest.id);
    if (uErr) throw new Error("Mise à jour impossible");

    return { ok: true };
  });

export const claimInvitationContributions = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        eventId: uuidSchema,
        invitationId: uuidSchema,
        token: tokenSchema,
        contributionIds: z.array(uuidSchema).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { ev, guest } = await resolveInvitation(
      data.eventId,
      data.invitationId,
      data.token,
    );
    const sb = await admin();

    // Release my previous claims for this event, then claim the selected ones.
    await sb
      .from("event_contributions")
      .update({ claimed_by_name: null })
      .eq("event_id", ev.id)
      .eq("claimed_by_name", guest.name);

    if (data.contributionIds.length > 0) {
      const { error } = await sb
        .from("event_contributions")
        .update({ claimed_by_name: guest.name })
        .in("id", data.contributionIds)
        .eq("event_id", ev.id)
        .is("claimed_by_name", null);
      if (error) throw new Error("Mise à jour impossible");
    }
    return { ok: true };
  });
