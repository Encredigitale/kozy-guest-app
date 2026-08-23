import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { renderNotificationEmail } from "@/lib/email-templates";

const sendSchema = z.object({
  userId: z.string().uuid(),
  channel: z.enum(["inapp", "email", "push"]).default("inapp"),
  type: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  body: z.string().max(4000).optional(),
  emailTo: z.string().email().optional(),
  ctaLabel: z.string().max(60).optional(),
  ctaUrl: z.string().url().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let status: "pending" | "sent" | "failed" = "pending";
    let sentAt: string | null = null;

    // Send email via Brevo when requested
    if (data.channel === "email" && data.emailTo) {
      const lovableKey = process.env.LOVABLE_API_KEY;
      const brevoKey = process.env.BREVO_API_KEY;
      if (!lovableKey || !brevoKey) {
        status = "failed";
      } else {
        try {
          const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              "Authorization": `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": brevoKey,
            },
            body: JSON.stringify({
              sender: { name: "Kosy", email: "contact@nonvitcha.fr" },
              to: [{ email: data.emailTo }],
              subject: data.title,
              htmlContent: renderNotificationEmail({
                title: data.title,
                body: data.body,
                ctaLabel: data.ctaLabel,
                ctaUrl: data.ctaUrl,
              }),
              textContent: data.body ?? data.title,
            }),
          });
          if (res.ok) {
            status = "sent";
            sentAt = new Date().toISOString();
          } else {
            status = "failed";
            console.error("Brevo send failed:", await res.text());
          }
        } catch (e) {
          console.error("Brevo error", e);
          status = "failed";
        }
      }
    } else {
      status = "sent";
      sentAt = new Date().toISOString();
    }

    const { data: row, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: data.userId,
        channel: data.channel,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        metadata: (data.metadata ?? {}) as never,
        status,
        sent_at: sentAt,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Audit
    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      action: "notification.sent",
      target: row.id,
      metadata: { channel: data.channel, type: data.type, recipient: data.userId } as never,
    });

    return { id: row.id, status };
  });
