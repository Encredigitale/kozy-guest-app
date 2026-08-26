import { getRequest } from "@tanstack/react-start/server";

export const KOSY_EMAIL_SENDER = { name: "Kosy", email: "contact@obolia.com" } as const;

export function getBaseUrl(): string {
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
}

export async function sendBrevoEmail(to: string, subject: string, html: string, text: string) {
  const brevoDirectKey = process.env['BREVO_DIRECT_API_KEY'];
  if (!brevoDirectKey) throw new Error("Configuration e-mail manquante");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "api-key": brevoDirectKey,
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