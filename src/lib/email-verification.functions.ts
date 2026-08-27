import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBaseUrl, sendBrevoEmail } from "@/lib/email-delivery.server";
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS, hashEmailVerificationToken } from "@/lib/email-verification.server";
import { renderKozyEmail } from "@/lib/email-templates";

/**
 * Envoie (ou renvoie) l'e-mail de validation d'adresse.
 * Réponse volontairement neutre : ne révèle pas si le compte existe.
 */
export const sendVerificationEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email().max(255) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw new Error(listError.message);
    const user = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!user) return { ok: true as const };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, email_verified_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.email_verified_at) return { ok: true as const, alreadyVerified: true };

    // Invalide les anciens jetons
    await supabaseAdmin
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null);

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const tokenHash = await hashEmailVerificationToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 3600 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("email_verification_tokens")
      .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });
    if (insertError) throw new Error(insertError.message);

    const link = `${getBaseUrl()}/verify-email?token=${token}`;
    const html = renderKozyEmail({
      title: "Confirmez votre adresse e-mail",
      preheader: "Une dernière étape pour activer votre compte Kozy.",
      greeting: profile?.display_name ? `Bonjour ${profile.display_name},` : "Bonjour,",
      paragraphs: [
        "Bienvenue sur Kozy ! Pour sécuriser votre compte, confirmez votre adresse e-mail en cliquant sur le bouton ci-dessous.",
        `Ce lien est valable ${EMAIL_VERIFICATION_TOKEN_TTL_HOURS} heures.`,
      ],
      ctaLabel: "Valider mon adresse e-mail",
      ctaUrl: link,
      footerNote:
        "Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet e-mail.",
    });

    await sendBrevoEmail(
      email,
      "Confirmez votre adresse e-mail — Kozy",
      html,
      `Confirmez votre adresse e-mail : ${link}`,
    );

    return { ok: true as const };
  });

/** Valide un jeton de vérification d'e-mail. */
export const confirmEmailVerification = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().trim().min(20).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenHash = await hashEmailVerificationToken(data.token);

    const { data: row } = await supabaseAdmin
      .from("email_verification_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!row) return { status: "invalid" as const };
    if (row.used_at) return { status: "used" as const };
    if (new Date(row.expires_at).getTime() < Date.now()) return { status: "expired" as const };

    await supabaseAdmin
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("user_id", row.user_id);
    if (error) throw new Error(error.message);

    return { status: "verified" as const };
  });

/** Indique si l'utilisateur courant a validé son adresse (appel public par e-mail). */
export const checkEmailVerified = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email_verified_at")
      .eq("user_id", data.userId)
      .maybeSingle();
    return { verified: Boolean(profile?.email_verified_at) };
  });
