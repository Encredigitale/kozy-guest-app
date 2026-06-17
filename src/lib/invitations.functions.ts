import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SENDER_EMAIL = "contact@obolia.com";
const SENDER_NAME = "Kosy";

const inputSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(160),
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const sendEventInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, title, event_at, location, invite_token, user_id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr || !event || event.user_id !== userId) {
      throw new Error("Moment introuvable");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Insert guest (avoid duplicate by email if present)
    let guest: { id: string; name: string; email: string | null } | null = null;
    const { data: existing } = await supabaseAdmin
      .from("event_guests")
      .select("id, name, email")
      .eq("event_id", data.eventId)
      .eq("email", data.email)
      .maybeSingle();
    if (existing) {
      guest = existing as typeof guest;
    } else {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("event_guests")
        .insert({ event_id: data.eventId, name: data.name, email: data.email })
        .select("id, name, email")
        .single();
      if (insErr || !inserted) throw new Error("Ajout impossible");
      guest = inserted as typeof guest;
    }

    const origin =
      process.env.SITE_URL ||
      process.env.VITE_SITE_URL ||
      "https://friendly-guest-buddy.lovable.app";
    const inviteUrl = `${origin}/i/${event.invite_token}`;

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!LOVABLE_API_KEY || !BREVO_API_KEY) {
      throw new Error("Email non configuré");
    }

    const dateStr = new Date(event.event_at).toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const subject = `Tu es invité·e à ${event.title}`;
    const htmlContent = `
<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#ffffff;color:#111;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    <h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(subject)}</h1>
    <p>Bonjour ${escapeHtml(data.name)},</p>
    <p>Tu es invité·e à <strong>${escapeHtml(event.title)}</strong>.</p>
    <p><strong>Quand :</strong> ${escapeHtml(dateStr)}<br/>
    ${event.location ? `<strong>Où :</strong> ${escapeHtml(event.location)}` : ""}</p>
    <p style="margin:24px 0;">
      <a href="${inviteUrl}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">
        Voir l'invitation
      </a>
    </p>
    <p style="font-size:12px;color:#666;">Ou copie ce lien : <br/>${inviteUrl}</p>
  </div>
</body></html>`.trim();

    const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: data.email, name: data.name }],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[brevo] send failed", res.status, body);
      throw new Error(`Envoi impossible (${res.status})`);
    }

    return { guest };
  });
