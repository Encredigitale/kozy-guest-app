import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { loadConfig } from "@/lib/invitations.server";
import { getBaseUrl, sendBrevoEmail } from "@/lib/email-delivery.server";
import { renderInvitationEmail } from "@/lib/email-templates";
import { invitationUrl } from "@/extensions/invitations/config";

/**
 * Rappels d'invitations (à appeler par un planificateur quotidien).
 * En-tête requis : x-cron-secret = INVITATIONS_CRON_SECRET.
 *   - invitation sans réponse depuis 3 jours → relance (dans la limite maxReminders)
 *   - événement à J-1 → rappel aux participants
 */
export const Route = createFileRoute("/api/public/invitations/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["INVITATIONS_CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!secret) return new Response("Not configured", { status: 503 });
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const config = await loadConfig();
        if (!config.remindersEnabled) return Response.json({ ok: true, skipped: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();

        const { data: invitations } = await supabaseAdmin
          .from("invitations")
          .select("id, event_id, email, name, status, sent_at, token")
          .not("email", "is", null)
          .in("status", ["sent", "opened", "accepted"]);

        let sent = 0;
        for (const raw of (invitations ?? []) as Record<string, any>[]) {
          const { data: event } = await supabaseAdmin
            .from("events")
            .select("title, starts_at, location, status, organizer_id")
            .eq("id", raw.event_id)
            .maybeSingle();
          const ev = event as Record<string, any> | null;
          if (!ev || ev.status === "archived") continue;

          const { data: logs } = await supabaseAdmin
            .from("invitation_logs")
            .select("event_type, created_at")
            .eq("invitation_id", raw.id);
          const rows = (logs ?? []) as Record<string, any>[];
          const reminders = rows.filter((l) => l.event_type === "reminder_sent");

          const noAnswer = raw.status === "sent" || raw.status === "opened";
          const lastTouch = new Date(
            reminders.at(-1)?.created_at ?? raw.sent_at ?? Date.now(),
          ).getTime();
          const dueNoAnswer =
            noAnswer && reminders.length < config.maxReminders && now - lastTouch > 3 * 86_400_000;

          const startsAt = ev.starts_at ? new Date(ev.starts_at).getTime() : null;
          const dueDayBefore =
            raw.status === "accepted" &&
            startsAt !== null &&
            startsAt - now > 0 &&
            startsAt - now < 86_400_000 &&
            !rows.some((l) => l.event_type === "day_before_sent");

          if (!dueNoAnswer && !dueDayBefore) continue;

          const url = invitationUrl(getBaseUrl(), raw.event_id, raw.id, raw.token);
          const message = dueDayBefore
            ? `C'est demain ! ${ev.title}${
                ev.starts_at
                  ? ` à ${new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(ev.starts_at))}`
                  : ""
              }.`
            : config.templateReminder;

          try {
            await sendBrevoEmail(
              raw.email,
              dueDayBefore ? `Demain : ${ev.title} — Kosy` : `Rappel : ${ev.title} — Kosy`,
              renderInvitationEmail({
                guestName: raw.name ?? undefined,
                eventTitle: ev.title,
                eventDate: ev.starts_at
                  ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(
                      new Date(ev.starts_at),
                    )
                  : undefined,
                eventLocation: ev.location ?? undefined,
                message,
                inviteUrl: url,
              }),
              `${message} ${url}`,
            );
            await supabaseAdmin.from("invitation_logs").insert({
              invitation_id: raw.id,
              event_type: dueDayBefore ? "day_before_sent" : "reminder_sent",
            } as never);
            sent++;
          } catch (error) {
            console.error("[invitations] reminder failed", error);
          }
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});
