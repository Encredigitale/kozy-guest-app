import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBaseUrl, sendBrevoEmail } from "@/lib/email-delivery.server";
import { renderInvitationEmail } from "@/lib/email-templates";
import { generateToken, loadConfig, resolvePublicInvitation } from "@/lib/invitations.server";
import { invitationUrl } from "@/extensions/invitations/config";
import { toE164 } from "@/lib/phone";

const guestSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(40).optional(),
  /** Code pays ISO utilisé pour normaliser le numéro saisi. */
  country: z.string().trim().length(2).optional(),
  contactId: z.string().uuid().nullable().optional(),
  saveToContacts: z.boolean().optional(),
});


/** Crée une invitation (contact existant, membre, nouveau contact ou invité ponctuel). */
export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => guestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: event, error: eventError } = await context.supabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", data.eventId)
      .eq("organizer_id", context.userId)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    if (!event) throw new Error("Événement introuvable ou accès refusé");

    const config = await loadConfig();
    if (!data.email && !data.phone && !data.name) throw new Error("Renseignez au moins un nom, un e-mail ou un téléphone");
    if (!data.contactId && data.saveToContacts === false && !config.inviteWithoutContact) {
      throw new Error("L'invitation sans enregistrement du contact est désactivée");
    }

    let phoneE164: string | null = null;
    if (data.phone) {
      if (!config.phoneEnabled) throw new Error("Le canal téléphone est désactivé");
      phoneE164 = toE164(data.phone, data.country ?? config.defaultCountry);
      if (!phoneE164) throw new Error("Numéro de téléphone invalide");
      const allowed = config.allowedCountries ?? [];
      if (allowed.length > 0) {
        const { COUNTRIES } = await import("@/lib/phone");
        const ok = allowed.some((code) => {
          const c = COUNTRIES.find((x) => x.code === code);
          return c && phoneE164!.startsWith(`+${c.dial}`);
        });
        if (!ok) throw new Error("Ce pays n'est pas autorisé pour les invitations par téléphone");
      }
    }

    // Doublons : même e-mail ou même numéro déjà invité sur cet événement.
    const { data: existing } = await context.supabase
      .from("invitations")
      .select("id, name, email, phone_e164, status")
      .eq("event_id", data.eventId);
    const duplicate = (existing ?? []).find((row) => {
      const r = row as Record<string, any>;
      if (r.status === "cancelled") return false;
      if (phoneE164 && r.phone_e164 === phoneE164) return true;
      if (data.email && r.email && r.email.toLowerCase() === data.email.toLowerCase()) return true;
      return false;
    }) as Record<string, any> | undefined;
    if (duplicate) {
      const label = duplicate.name || duplicate.email || "Cette personne";
      const err = new Error(`${label} est déjà invité(e) à cet événement.`);
      (err as Error & { invitationId?: string }).invitationId = duplicate.id;
      throw err;
    }

    let contactId = data.contactId ?? null;
    if (!contactId && data.saveToContacts) {
      const { data: contact, error } = await context.supabase
        .from("widget_items")
        .insert({
          owner_id: context.userId,
          widget_key: "contacts.book",
          scope_type: "global",
          scope_id: null,
          payload: {
            name: data.name ?? data.email ?? data.phone,
            email: data.email,
            phone: data.phone,
            phone_e164: phoneE164,
          } as never,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      contactId = contact.id;
    } else if (contactId && phoneE164) {
      // Enrichit le contact existant avec le numéro normalisé.
      const { data: contact } = await context.supabase
        .from("widget_items")
        .select("payload")
        .eq("id", contactId)
        .maybeSingle();
      const payload = (contact?.payload ?? {}) as Record<string, unknown>;
      if (!payload.phone_e164) {
        await context.supabase
          .from("widget_items")
          .update({ payload: { ...payload, phone: data.phone ?? payload.phone, phone_e164: phoneE164 } as never })
          .eq("id", contactId);
      }
    }

    // Le contact correspond-il à un membre de l'application ?
    let guestUserId: string | null = null;
    if (data.email || phoneE164) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const match = users?.users.find(
          (u) =>
            (data.email && u.email?.toLowerCase() === data.email.toLowerCase()) ||
            (phoneE164 && u.phone && `+${u.phone.replace(/\D/g, "")}` === phoneE164),
        );
        guestUserId = match?.id ?? null;
      } catch (error) {
        console.error("[invitations] member lookup failed", error);
      }
    }

    const expiresAt =
      config.expiresDays > 0
        ? new Date(Date.now() + config.expiresDays * 86_400_000).toISOString()
        : null;

    const { data: invitation, error } = await context.supabase
      .from("invitations")
      .insert({
        event_id: data.eventId,
        organizer_id: context.userId,
        contact_id: contactId,
        guest_user_id: guestUserId,
        name: data.name ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        phone_e164: phoneE164,
        token: generateToken(),
        status: "draft",
        expires_at: expiresAt,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);


    await context.supabase
      .from("invitation_logs")
      .insert({ invitation_id: invitation.id, event_type: "created" } as never);

    return { invitation, isMember: !!guestUserId };
  });

/** Envoie (ou renvoie) l'invitation par e-mail. */
export const sendInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ invitationId: z.string().uuid(), reminder: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: invitation, error } = await context.supabase
      .from("invitations")
      .select("*")
      .eq("id", data.invitationId)
      .eq("organizer_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invitation) throw new Error("Invitation introuvable");
    const inv = invitation as Record<string, any>;
    if (!inv.email) throw new Error("Cet invité n'a pas d'adresse e-mail");

    const { data: event } = await context.supabase
      .from("events")
      .select("title, starts_at, location")
      .eq("id", inv.event_id)
      .maybeSingle();
    const ev = (event ?? {}) as Record<string, any>;

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", context.userId)
      .maybeSingle();

    const config = await loadConfig();
    const hostName = (profile as { display_name?: string } | null)?.display_name ?? "Un proche";
    const url = invitationUrl(getBaseUrl(), inv.event_id, inv.id, inv.token);
    const eventDate = ev.starts_at
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(ev.starts_at))
      : undefined;

    const intro = (data.reminder ? config.templateReminder : config.templateInvitation)
      .replace(/\{host\}/g, hostName)
      .replace(/\{event\}/g, ev.title ?? "un événement");

    const html = renderInvitationEmail({
      hostName,
      eventTitle: ev.title ?? "Invitation",
      eventDate,
      eventLocation: ev.location ?? undefined,
      inviteUrl: url,
      message: intro,
    });

    await sendBrevoEmail(
      inv.email,
      data.reminder ? `Rappel : ${ev.title} — Kosy` : `Invitation : ${ev.title} — Kosy`,
      html,
      `${intro} Voir l'invitation : ${url}`,
    );

    const patch: Record<string, unknown> = { sent_at: new Date().toISOString() };
    if (inv.status === "draft") patch.status = "sent";
    await context.supabase.from("invitations").update(patch as never).eq("id", inv.id);
    await context.supabase
      .from("invitation_logs")
      .insert({ invitation_id: inv.id, event_type: data.reminder ? "reminder_sent" : "sent" } as never);

    return { ok: true as const, url };
  });

/** Page publique : lecture d'une invitation via son lien sécurisé. */
export const getPublicInvitation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        invitationId: z.string().uuid(),
        token: z.string().min(10).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => resolvePublicInvitation({ ...data, markOpened: true }));

/** Page publique : enregistrement de la réponse. */
export const respondToInvitation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        invitationId: z.string().uuid(),
        token: z.string().min(10).max(200),
        response: z.enum(["accepted", "declined", "maybe"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const resolved = await resolvePublicInvitation(data);
    if (!resolved.ok) return resolved;
    const config = await loadConfig();
    if (data.response === "maybe" && !config.allowMaybe) {
      return { ok: false as const, error: "invalid_token" as const };
    }
    const already = ["accepted", "declined", "maybe"].includes(resolved.payload.status);
    if ((already && !config.allowChangeResponse) || resolved.payload.responseClosed) {
      return { ok: false as const, error: "expired" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("invitations")
      .update({ status: data.response, responded_at: new Date().toISOString() } as never)
      .eq("id", data.invitationId);
    await supabaseAdmin
      .from("invitation_logs")
      .insert({
        invitation_id: data.invitationId,
        event_type: "responded",
        metadata: { response: data.response },
      } as never);

    return await resolvePublicInvitation(data);
  });

/** Page publique : contribution de l'invité (widget Contributions actif). */
export const savePublicContribution = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        invitationId: z.string().uuid(),
        token: z.string().min(10).max(200),
        text: z.string().trim().min(1).max(300),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const resolved = await resolvePublicInvitation(data);
    if (!resolved.ok) return resolved;
    if (!resolved.payload.config.contributionsEnabled) {
      return { ok: false as const, error: "invalid_token" as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("invitation_logs")
      .insert({
        invitation_id: data.invitationId,
        event_type: "contribution",
        metadata: { text: data.text },
      } as never);
    return await resolvePublicInvitation(data);
  });
