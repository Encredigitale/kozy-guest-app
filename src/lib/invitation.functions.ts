import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public server functions for the dynamic invitation link:
// /invitation/:eventId/:invitationId?token=<token>

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
      "id, owner_id, title, event_type, event_subtype, event_at, location, description, menu_or_theme",
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

    const [{ data: guests }, { data: items }, { data: organizer }] = await Promise.all([
      sb
        .from("event_guests")
        .select("id, rsvp_status")
        .eq("event_id", ev.id),
      sb
        .from("event_contributions")
        .select("id, category, label, claimed_by_name")
        .eq("event_id", ev.id)
        .order("created_at", { ascending: true }),
      sb
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", ev.owner_id)
        .maybeSingle(),
    ]);

    const now = Date.now();
    const eventTime = new Date(ev.event_at).getTime();
    const finished = eventTime < now - 12 * 3600 * 1000;

    const total = guests?.length ?? 0;
    const confirmed = (guests ?? []).filter((g) => g.rsvp_status === "yes").length;
    const contribs = items ?? [];
    const claimedCount = contribs.filter((c) => !!c.claimed_by_name).length;
    const openCount = contribs.length - claimedCount;

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
      organizer: {
        first_name: organizer?.first_name ?? null,
        last_name: organizer?.last_name ?? null,
      },
      guest: {
        id: guest.id,
        name: guest.name,
        responded_at: guest.responded_at,
        rsvp_status: guest.rsvp_status,
      },
      contributions: contribs.map((i) => ({
        id: i.id,
        category: i.category,
        label: i.label,
        claimed: i.claimed_by_name !== null && i.claimed_by_name !== "",
        claimed_by_me: i.claimed_by_name === guest.name,
      })),
      stats: {
        totalGuests: total,
        confirmedGuests: confirmed,
        claimedContributions: claimedCount,
        openContributions: openCount,
      },
      finished,
      locked: finished,
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
    if (new Date(ev.event_at).getTime() < Date.now() - 12 * 3600 * 1000) {
      throw new Error(INVITATION_ERROR.EXPIRED);
    }
    const sb = await admin();

    const { data: rsvp, error: rErr } = await sb
      .from("event_rsvps")
      .insert({ event_id: ev.id, guest_name: guest.name, status: data.status })
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

export const claimInvitationContribution = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        eventId: uuidSchema,
        invitationId: uuidSchema,
        token: tokenSchema,
        // null = unclaim any current pick
        contributionId: uuidSchema.nullable(),
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

    // Release previous claims for this guest (single-select model)
    await sb
      .from("event_contributions")
      .update({ claimed_by_name: null })
      .eq("event_id", ev.id)
      .eq("claimed_by_name", guest.name);

    if (data.contributionId) {
      const { error } = await sb
        .from("event_contributions")
        .update({ claimed_by_name: guest.name })
        .eq("id", data.contributionId)
        .eq("event_id", ev.id)
        .is("claimed_by_name", null);
      if (error) throw new Error("Mise à jour impossible");
    }
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
    const { ev, guest } = await resolveInvitation(
      data.eventId,
      data.invitationId,
      data.token,
    );
    const sb = await admin();

    // Release previous picks
    await sb
      .from("event_contributions")
      .update({ claimed_by_name: null })
      .eq("event_id", ev.id)
      .eq("claimed_by_name", guest.name);

    const { error } = await sb.from("event_contributions").insert({
      event_id: ev.id,
      category: "autre",
      label: data.label,
      claimed_by_name: guest.name,
      proposed_by_name: guest.name,
    });
    if (error) throw new Error("Ajout impossible");

    return { ok: true };
  });
