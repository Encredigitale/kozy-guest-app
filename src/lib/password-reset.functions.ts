import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBaseUrl, sendBrevoEmail } from "@/lib/email-delivery.server";
import { renderBrandEmail } from "@/lib/email-templates";

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
    const redirectTo = `${getBaseUrl()}/reset-password`;

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Compte inexistant : on reste neutre.
    if (error || !link?.properties?.hashed_token) {
      if (error) console.error("Password reset generateLink failed:", error.message);
      return { ok: true as const };
    }

    // Lien direct vers notre page (pas de redirection Supabase, résistant aux scanners d'e-mails).
    const resetUrl = `${redirectTo}?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=recovery`;

    const html = renderBrandEmail({
      title: "Réinitialisation de votre mot de passe",
      preheader: "Choisissez un nouveau mot de passe Ma Belle Table.",
      greeting: "Bonjour,",
      paragraphs: [
        "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.",
        "Ce lien est valable 1 heure et ne peut être utilisé qu'une seule fois.",
      ],
      ctaLabel: "Choisir un nouveau mot de passe",
      ctaUrl: resetUrl,
      footerNote:
        "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
    });

    await sendBrevoEmail(
      email,
      "Réinitialisation de votre mot de passe — Ma Belle Table",
      html,
      `Réinitialisez votre mot de passe : ${resetUrl}`,
    );

    return { ok: true as const };
  });
