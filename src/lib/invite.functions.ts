import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public server functions for invitees accessing an event via a share link
// tied to a specific guest id. The token gates the event; the guest id
// identifies which row in event_guests is responding. We use the admin
// client inside handlers AFTER verifying both.

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

async function resolveEventAndGuest(
  token: string,
  guestId: string,
  opts: { requireUnused: boolean },
) {
  const sb = await admin();
  const { data: ev, error: evErr } = await sb
    .from("events")
    .select(
      "id, title, event_type, event_subtype, event_at, location, description, menu_or_theme, invite_token",
    )
    .eq("invite_token", token)
    .maybeSingle();
  if (evErr || !ev) throw new Error(INVITE_ERROR.INVALID);
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


export const getInviteEventForGuest = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ token: tokenSchema, guestId: uuidSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const { ev, guest } = await resolveEventAndGuest(data.token, data.guestId);
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
    const { ev, guest } = await resolveEventAndGuest(data.token, data.guestId);
    if (guest.responded_at) throw new Error("Lien déjà utilisé");
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
    const { ev, guest } = await resolveEventAndGuest(data.token, data.guestId);
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
