import { getRequest } from "@tanstack/react-start/server";

export const KOSY_EMAIL_SENDER = { name: "Kozy", email: "contact@obolia.com" } as const;

export function getBaseUrl(): string {
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
}

export async function sendBrevoEmail(to: string, subject: string, html: string, text: string) {
  const lovableApiKey = process.env['LOVABLE_API_KEY'];
  const brevoConnectionKey = process.env['BREVO_API_KEY'];
  if (!lovableApiKey || !brevoConnectionKey) throw new Error("Configuration e-mail manquante");

  const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": brevoConnectionKey,
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