import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { loadConfig } from "@/lib/invitations.server";
import { sendBrevoEmail } from "@/lib/email-delivery.server";
import { renderInvitationEmail } from "@/lib/email-templates";
import { invitationUrl } from "@/extensions/invitations/config";

const APP_URL = "https://kozy-guest-app.lovable.app";
const TZ = "Europe/Paris";

/** Date calendaire (YYYY-MM-DD) à Paris. */
function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/**
 * Rappels quotidiens (planificateur, chaque matin).
 * En-tête requis : x-cron-secret = KOZY_REMINDERS_CRON_SECRET.
 *   - sans réponse depuis 3 jours → relance (limite maxReminders)
 *   - J-1 → e-mail de relance à tous les invités (hors refus/annulés)
 *   - J   → notification sur le tableau de bord des invités ayant un compte
 */
export const Route = createFileRoute("/api/public/invitations/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["KOZY_REMINDERS_CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!secret) return new Response("Not configured", { status: 503 });
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const config = await loadConfig();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();
        const today = dayKey(new Date(now));
        const tomorrow = dayKey(new Date(now + 86_400_000));

        const { data: invitations } = await supabaseAdmin
          .from("invitations")
          .select("id, event_id, email, name, status, sent_at, token, guest_user_id")
          .is("revoked_at", null)
          .in("status", ["sent", "opened", "accepted", "maybe"]);

        const eventCache = new Map<string, Record<string, any> | null>();
        let emails = 0;
        let notified = 0;

        for (const raw of (invitations ?? []) as Record<string, any>[]) {
          if (!eventCache.has(raw.event_id)) {
            const { data } = await supabaseAdmin
              .from("events")
              .select("title, starts_at, location, status")
              .eq("id", raw.event_id)
              .maybeSingle();
            eventCache.set(raw.event_id, (data as Record<string, any>) ?? null);
          }
          const ev = eventCache.get(raw.event_id);
          if (!ev || ev.status !== "published" || !ev.starts_at) continue;

          const startsAt = new Date(ev.starts_at);
          const eventDay = dayKey(startsAt);
          const isDayBefore = eventDay === tomorrow;
          const isDayOf = eventDay === today && startsAt.getTime() > now - 12 * 3_600_000;

          const { data: logs } = await supabaseAdmin
            .from("invitation_logs")
            .select("event_type, created_at")
            .eq("invitation_id", raw.id);
          const rows = (logs ?? []) as Record<string, any>[];
          const has = (t: string) => rows.some((l) => l.event_type === t);
          const url = invitationUrl(APP_URL, raw.event_id, raw.id, raw.token);
          const time = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short", timeZone: TZ }).format(startsAt);
          const fullDate = new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: TZ,
          }).format(startsAt);

          // J : notification in-app pour les invités ayant un compte
          if (isDayOf && raw.guest_user_id && !has("day_of_notified")) {
            const { error } = await supabaseAdmin.from("notifications").insert({
              user_id: raw.guest_user_id,
              channel: "inapp",
              type: "event.day_of",
              title: `C'est aujourd'hui : ${ev.title}`,
              body: `Rendez-vous à ${time}${ev.location ? ` · ${ev.location}` : ""}.`,
              metadata: { event_id: raw.event_id, url: `/app/events/${raw.event_id}` } as never,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
            if (!error) {
              await supabaseAdmin
                .from("invitation_logs")
                .insert({ invitation_id: raw.id, event_type: "day_of_notified" } as never);
              notified++;
            } else console.error("[invitations] day-of notification failed", error);
          }

          if (!raw.email) continue;

          // J-1 : e-mail de relance
          let kind: "day_before_sent" | "reminder_sent" | null = null;
          if (isDayBefore && !has("day_before_sent")) kind = "day_before_sent";
          else if (config.remindersEnabled && (raw.status === "sent" || raw.status === "opened")) {
            const reminders = rows.filter((l) => l.event_type === "reminder_sent");
            const lastTouch = new Date(reminders.at(-1)?.created_at ?? raw.sent_at ?? now).getTime();
            if (reminders.length < config.maxReminders && now - lastTouch > 3 * 86_400_000 && startsAt.getTime() > now) {
              kind = "reminder_sent";
            }
          }
          if (!kind) continue;

          const noAnswer = raw.status === "sent" || raw.status === "opened";
          const message =
            kind === "day_before_sent"
              ? `C'est demain ! ${ev.title} à ${time}.${noAnswer ? " Pensez à confirmer votre présence." : ""}`
              : config.templateReminder;

          try {
            await sendBrevoEmail(
              raw.email,
              kind === "day_before_sent" ? `Demain : ${ev.title} — Ma Belle Table` : `Rappel : ${ev.title} — Ma Belle Table`,
              renderInvitationEmail({
                guestName: raw.name ?? undefined,
                eventTitle: ev.title,
                eventDate: fullDate,
                eventLocation: ev.location ?? undefined,
                message,
                inviteUrl: url,
              }),
              `${message} ${url}`,
            );
            await supabaseAdmin
              .from("invitation_logs")
              .insert({ invitation_id: raw.id, event_type: kind } as never);
            emails++;
          } catch (error) {
            console.error("[invitations] reminder failed", error);
          }
        }

        return Response.json({ ok: true, emails, notified });
      },
    },
  },
});
