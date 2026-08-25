import { getRequest } from "@tanstack/react-start/server";

export const KOSY_EMAIL_SENDER = { name: "Kosy", email: "contact@nonvitcha.fr" } as const;

export function getBaseUrl(): string {
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
}

export async function sendBrevoEmail(to: string, subject: string, html: string, text: string) {
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
      sender: KOSY_EMAIL_SENDER,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Brevo email failed [${res.status}]: ${body}`);
    throw new Error(`Provider request failed [${res.status}]: ${body}`);
  }
}