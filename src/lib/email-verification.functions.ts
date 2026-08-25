import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { renderKosyEmail } from "@/lib/email-templates";

const TOKEN_TTL_HOURS = 24;

function baseUrl(): string {
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
      sender: { name: "Kosy", email: "contact@obolia.com" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Brevo verification email failed [${res.status}]: ${body}`);
    throw new Error("Impossible d'envoyer l'e-mail de vérification");
  }
}

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
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("email_verification_tokens")
      .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });
    if (insertError) throw new Error(insertError.message);

    const link = `${baseUrl()}/verify-email?token=${token}`;
    const html = renderKosyEmail({
      title: "Confirmez votre adresse e-mail",
      preheader: "Une dernière étape pour activer votre compte Kosy.",
      greeting: profile?.display_name ? `Bonjour ${profile.display_name},` : "Bonjour,",
      paragraphs: [
        "Bienvenue sur Kosy ! Pour sécuriser votre compte, confirmez votre adresse e-mail en cliquant sur le bouton ci-dessous.",
        `Ce lien est valable ${TOKEN_TTL_HOURS} heures.`,
      ],
      ctaLabel: "Valider mon adresse e-mail",
      ctaUrl: link,
      footerNote:
        "Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet e-mail.",
    });

    await sendBrevoEmail(
      email,
      "Confirmez votre adresse e-mail — Kosy",
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
    const tokenHash = await hashToken(data.token);

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
