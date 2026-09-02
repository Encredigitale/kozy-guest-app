import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBaseUrl, sendBrevoEmail } from "@/lib/email-delivery.server";
import { renderInvitationEmail } from "@/lib/email-templates";
import { loadEventMenu } from "@/lib/invitations.server";

export const sendEventInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      eventId: z.string().uuid(),
      participantId: z.string().uuid(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: event, error: eventError } = await context.supabase
      .from("events")
      .select("id, title, starts_at, location, organizer_id")
      .eq("id", data.eventId)
      .eq("organizer_id", context.userId)
      .maybeSingle();

    if (eventError) throw new Error(eventError.message);
    if (!event) throw new Error("Événement introuvable ou accès refusé");

    const { data: participant, error: participantError } = await context.supabase
      .from("event_participants")
      .select("id, email")
      .eq("id", data.participantId)
      .eq("event_id", data.eventId)
      .maybeSingle();

    if (participantError) throw new Error(participantError.message);
    if (!participant?.email) throw new Error("Cet invité n'a pas d'adresse e-mail");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", context.userId)
      .maybeSingle();

    const inviteUrl = `${getBaseUrl()}/app/events/${event.id}`;
    const eventDate = event.starts_at
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(event.starts_at))
      : undefined;
    const menu = await loadEventMenu(event.id);
    const html = renderInvitationEmail({
      hostName: profile?.display_name ?? undefined,
      eventTitle: event.title,
      eventDate,
      eventLocation: event.location ?? undefined,
      inviteUrl,
      menu,
    });

    await sendBrevoEmail(
      participant.email,
      `Invitation : ${event.title} — Kozy`,
      html,
      `${profile?.display_name ?? "Un proche"} vous invite à ${event.title}. Voir l'invitation : ${inviteUrl}`,
    );

    return { ok: true as const };
  });