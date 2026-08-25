import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { renderKosyEmail } from "@/lib/email-templates";

function baseUrl(): string {
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
}

async function sendBrevoEmail(to: string, subject: string, html: string, text: string) {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const brevoKey = process.env['BREVO_API_KEY'];
  if (!lovableKey || !brevoKey) throw new Error("Configuration e-mail manquante");

  const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": brevoKey,
    },
    body: JSON.stringify({
      sender: { name: "Kosy", email: "contact@nonvitcha.fr" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Brevo reset email failed [${res.status}]: ${body}`);
    throw new Error("Impossible d'envoyer l'e-mail de réinitialisation");
  }
}

/**
 * Envoie l'e-mail de réinitialisation via Brevo (le SMTP Supabase n'est pas utilisé).
 * Réponse neutre : ne révèle pas si le compte existe.
 */
export const sendPasswordResetEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email().max(255) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const redirectTo = `${baseUrl()}/reset-password`;

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Compte inexistant : on reste neutre.
    if (error || !link?.properties?.action_link) return { ok: true as const };

    const html = renderKosyEmail({
      title: "Réinitialisation de votre mot de passe",
      preheader: "Choisissez un nouveau mot de passe Kosy.",
      greeting: "Bonjour,",
      paragraphs: [
        "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.",
        "Ce lien est valable 1 heure et ne peut être utilisé qu'une seule fois.",
      ],
      ctaLabel: "Choisir un nouveau mot de passe",
      ctaUrl: link.properties.action_link,
      footerNote:
        "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
    });

    await sendBrevoEmail(
      email,
      "Réinitialisation de votre mot de passe — Kosy",
      html,
      `Réinitialisez votre mot de passe : ${link.properties.action_link}`,
    );

    return { ok: true as const };
  });
