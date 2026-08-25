import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendBrevoEmail } from "@/lib/email-delivery.server";
import { renderNotificationEmail } from "@/lib/email-templates";

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      userId: z.string().uuid(),
      channel: z.enum(["inapp", "email", "push"]).default("inapp"),
      type: z.string().min(1).max(80),
      title: z.string().min(1).max(200),
      body: z.string().max(4000).optional(),
      emailTo: z.string().email().optional(),
      ctaLabel: z.string().max(60).optional(),
      ctaUrl: z.string().url().max(2000).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let status: "pending" | "sent" | "failed" = "pending";
    let sentAt: string | null = null;

    // Send email via Brevo when requested
    if (data.channel === "email" && data.emailTo) {
      try {
        await sendBrevoEmail(
          data.emailTo,
          data.title,
          renderNotificationEmail({
            title: data.title,
            body: data.body,
            ctaLabel: data.ctaLabel,
            ctaUrl: data.ctaUrl,
          }),
          data.body ?? data.title,
        );
        status = "sent";
        sentAt = new Date().toISOString();
      } catch (e) {
        console.error("Brevo error", e);
        status = "failed";
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
