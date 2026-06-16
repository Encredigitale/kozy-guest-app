import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public server functions for invitees accessing an event via a share link.
// All access is gated by the event's invite_token. We use the admin client
// inside handlers so we can read/write across the owner-only RLS boundary
// AFTER verifying the token. Per the import-graph rules, supabaseAdmin is
// loaded dynamically inside each handler.

const tokenSchema = z.string().min(8).max(64).regex(/^[a-f0-9]+$/i);
const nameSchema = z.string().trim().min(1).max(60);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function resolveEvent(token: string) {
  const sb = await admin();
  const { data, error } = await sb
    .from("events")
    .select("id, title, event_type, event_subtype, event_at, location, description, menu_or_theme, invite_token")
    .eq("invite_token", token)
    .maybeSingle();
  if (error) throw new Error("Lookup failed");
  if (!data) throw new Error("Not found");
  return data;
}

export const getInviteEvent = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const ev = await resolveEvent(data.token);
    const sb = await admin();
    // Public-safe contributions: items + whether claimed, but NEVER who claimed.
    const { data: items } = await sb
      .from("event_contributions")
      .select("id, category, label, claimed_by_name")
      .eq("event_id", ev.id)
      .order("created_at", { ascending: true });
    const publicItems = (items ?? []).map((i) => ({
      id: i.id,
      category: i.category,
      label: i.label,
      claimed: i.claimed_by_name !== null && i.claimed_by_name !== "",
    }));
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
      contributions: publicItems,
    };
  });

export const submitInviteRsvp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        name: nameSchema,
        status: z.enum(["yes", "no", "maybe"]),
        message: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const ev = await resolveEvent(data.token);
    const sb = await admin();
    const { data: row, error } = await sb
      .from("event_rsvps")
      .insert({
        event_id: ev.id,
        guest_name: data.name,
        status: data.status,
        message: data.message || null,
      })
      .select("id")
      .single();
    if (error) throw new Error("Unable to save RSVP");
    return { rsvpId: row.id };
  });

export const claimInviteContribution = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        contributionId: z.string().uuid(),
        guestName: nameSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const ev = await resolveEvent(data.token);
    const sb = await admin();
    // Only claim if not already claimed.
    const { data: existing, error: readErr } = await sb
      .from("event_contributions")
      .select("id, claimed_by_name, event_id")
      .eq("id", data.contributionId)
      .maybeSingle();
    if (readErr || !existing || existing.event_id !== ev.id) {
      throw new Error("Item introuvable");
    }
    if (existing.claimed_by_name) {
      throw new Error("Déjà pris");
    }
    const { error } = await sb
      .from("event_contributions")
      .update({ claimed_by_name: data.guestName })
      .eq("id", data.contributionId)
      .is("claimed_by_name", null);
    if (error) throw new Error("Mise à jour impossible");
    return { ok: true };
  });

export const proposeInviteContribution = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        category: z.string().min(1).max(40),
        label: z.string().trim().min(1).max(120),
        guestName: nameSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const ev = await resolveEvent(data.token);
    const sb = await admin();
    const { error } = await sb.from("event_contributions").insert({
      event_id: ev.id,
      category: data.category,
      label: data.label,
      proposed_by_name: data.guestName,
      claimed_by_name: data.guestName, // proposer brings it
    });
    if (error) throw new Error("Ajout impossible");
    return { ok: true };
  });
