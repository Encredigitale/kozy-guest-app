import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { freeInvitationUrl, freeLinkAvailable, freeRegistrationSchema, freeTokenSchema } from "@/extensions/invitations/free-link.schema";

export const getEventInvitationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: event } = await context.supabase.from("events").select("id").eq("id", data.eventId).eq("organizer_id", context.userId).maybeSingle();
    if (!event) throw new Error("Accès refusé.");
    const { data: link, error } = await context.supabase.from("event_invitation_links").select("token, active").eq("event_id", data.eventId).single();
    if (error || !link) throw new Error("Lien indisponible.");
    const { getBaseUrl } = await import("@/lib/email-delivery.server");
    return { url: freeInvitationUrl(getBaseUrl(), link.token), active: link.active };
  });

export const manageEventInvitationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid(), action: z.enum(["disable", "regenerate"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: event } = await context.supabase.from("events").select("id").eq("id", data.eventId).eq("organizer_id", context.userId).maybeSingle();
    if (!event) throw new Error("Accès refusé.");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const patch = data.action === "disable" ? { active: false } : { active: true, token };
    const { data: updated, error } = await context.supabase.from("event_invitation_links").update(patch).eq("event_id", data.eventId).select("event_id").single();
    if (error || !updated) throw new Error("Modification impossible.");
    return { ok: true };
  });

// The public capability is checked here; visitors never receive direct table access.
export const checkFreeInvitationLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: freeTokenSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("event_invitation_links").select("event_id, active").eq("token", data.token).maybeSingle();
    if (!link?.active) return { available: false };
    const { data: event } = await supabaseAdmin.from("events").select("status").eq("id", link.event_id).maybeSingle();
    return { available: freeLinkAvailable(link.active, event?.status ?? "") };
  });

export const registerFreeInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => freeRegistrationSchema.parse(input))
  .handler(async ({ data }) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.registrationKey));
    const keyHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // This service-only operation locks and verifies the public link before writing.
    const { data: result, error } = await supabaseAdmin.rpc("register_free_invitation", {
      _token: data.token, _first_name: data.firstName, _last_name: data.lastName, _key_hash: keyHash,
    });
    const parsed = z.object({ ok: z.literal(true), eventId: z.string().uuid(), invitationId: z.string().uuid(), token: freeTokenSchema }).safeParse(result);
    if (error || !parsed.success) return { ok: false as const };
    return parsed.data;
  });