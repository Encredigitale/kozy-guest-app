import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public server functions for invitees accessing an event via a share link.
// Two modes:
// - Personal link (/i/<token>?g=<guestId>): the guest is pre-selected.
// - Generic link (/i/<token>): the visitor enters name/email so we can find
//   or create the matching event_guests row before they respond.

const tokenSchema = z.string().min(8).max(64).regex(/^[a-f0-9]+$/i);
const uuidSchema = z.string().uuid();

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Error codes used by the page to render specific states.
export const INVITE_ERROR = {
  INVALID: "INVITE_INVALID",
  USED: "INVITE_USED",
} as const;

async function resolveEvent(token: string) {
  const sb = await admin();
  const { data: ev, error: evErr } = await sb
    .from("events")
    .select(
      "id, title, event_type, event_subtype, event_at, location, description, menu_or_theme, invite_token",
    )
    .eq("invite_token", token)
    .maybeSingle();
  if (evErr || !ev) throw new Error(INVITE_ERROR.INVALID);
  return ev;
}

async function resolveEventAndGuest(
  token: string,
  guestId: string,
  opts: { requireUnused: boolean },
) {
  const ev = await resolveEvent(token);
  const sb = await admin();
  const { data: guest, error: gErr } = await sb
    .from("event_guests")
    .select("id, name, email, event_id, responded_at, rsvp_status")
    .eq("id", guestId)
    .maybeSingle();
  if (gErr || !guest || guest.event_id !== ev.id) {
    throw new Error(INVITE_ERROR.INVALID);
  }
  if (opts.requireUnused && guest.responded_at) {
    throw new Error(INVITE_ERROR.USED);
  }
  return { ev, guest };
}

function mapEvent(ev: {
  id: string;
  title: string;
  event_type: string;
  event_subtype: string | null;
  event_at: string;
  location: string | null;
  description: string | null;
  menu_or_theme: string | null;
}) {
  return {
    id: ev.id,
    title: ev.title,
    event_type: ev.event_type,
    event_subtype: ev.event_subtype,
    event_at: ev.event_at,
    location: ev.location,
    description: ev.description,
    menu_or_theme: ev.menu_or_theme,
  };
}

export const getInviteEventByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const ev = await resolveEvent(data.token);
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

    return {
      event: mapEvent(ev),
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
      })),
    };
  });

export const identifyGuestForEvent = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        name: z.string().trim().min(1).max(60),
        email: z.string().trim().email().max(160),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const ev = await resolveEvent(data.token);
    const sb = await admin();

    // Try to find an existing guest with the same email for this event.
    const { data: existing } = await sb
      .from("event_guests")
      .select("id, name, email, event_id, responded_at, rsvp_status")
      .eq("event_id", ev.id)
      .eq("email", data.email)
      .maybeSingle();

    if (existing) {
      return { guestId: existing.id };
    }

    // Otherwise create a new guest.
    const { data: inserted, error: insErr } = await sb
      .from("event_guests")
      .insert({ event_id: ev.id, name: data.name, email: data.email })
      .select("id")
      .single();

    if (insErr || !inserted) throw new Error("Ajout impossible");
    return { guestId: inserted.id };
  });

export const getInviteEventForGuest = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ token: tokenSchema, guestId: uuidSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const { ev, guest } = await resolveEventAndGuest(data.token, data.guestId, {
      requireUnused: false,
    });
    const sb = await admin();

    const { data: guests } = await sb
      .from("event_guests")
      .select("id, name, responded_at, rsvp_status")
      .eq("event_id", ev.id)
      .order("created_at", { ascending: true });

    const { data: items } = await sb
      .from("event_contributions")
      .select("id, category, label, claimed_by_name")
      .eq("event_id", ev.id)
      .order("created_at", { ascending: true });

    return {
      event: mapEvent(ev),
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
      })),
    };
  });

export const respondAsGuest = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        guestId: uuidSchema,
        status: z.enum(["yes", "no"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { ev, guest } = await resolveEventAndGuest(data.token, data.guestId, {
      requireUnused: true,
    });
    const sb = await admin();
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
    return { ok: true, rsvpId: rsvp.id };
  });

export const claimContributionsAsGuest = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        guestId: uuidSchema,
        contributionIds: z.array(uuidSchema).min(1).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { ev, guest } = await resolveEventAndGuest(data.token, data.guestId, {
      requireUnused: false,
    });
    if (guest.rsvp_status !== "yes") {
      throw new Error(INVITE_ERROR.INVALID);
    }
    const sb = await admin();
    // Only claim items in this event that are still free.
    const { error } = await sb
      .from("event_contributions")
      .update({ claimed_by_name: guest.name })
      .in("id", data.contributionIds)
      .eq("event_id", ev.id)
      .is("claimed_by_name", null);
    if (error) throw new Error("Mise à jour impossible");
    return { ok: true };
  });
