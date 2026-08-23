/**
 * Templates d'e-mails Kosy (HTML compatible clients mail : tables + styles inline).
 * Palette alignée sur le design system : terracotta #C2683F, sauge, crème.
 */

const BRAND = {
  name: "Kosy",
  primary: "#C2683F",
  primaryDark: "#A4522F",
  ink: "#2B2320",
  muted: "#8A7B72",
  border: "#EDE5DE",
  cream: "#FBF8F5",
};

export type KosyEmailOptions = {
  title: string;
  preheader?: string;
  greeting?: string;
  /** Paragraphes de texte (déjà échappés / sûrs). */
  paragraphs?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  /** Petit bloc d'information (ex : détails d'un événement). */
  infoRows?: { label: string; value: string }[];
  footerNote?: string;
};

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Convertit un texte brut en paragraphes HTML échappés. */
export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => escapeHtml(p.trim()).replace(/\n/g, "<br/>"))
    .filter(Boolean);
}

export function renderKosyEmail(options: KosyEmailOptions): string {
  const {
    title,
    preheader = "",
    greeting,
    paragraphs = [],
    ctaLabel,
    ctaUrl,
    infoRows = [],
    footerNote,
  } = options;

  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${BRAND.ink};">${p}</p>`,
    )
    .join("");

  const infoHtml = infoRows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:16px;">
        <tr><td style="padding:18px 20px;">
          ${infoRows
            .map(
              (row) =>
                `<div style="margin:0 0 10px;font-size:14px;line-height:20px;">
                   <span style="color:${BRAND.muted};">${escapeHtml(row.label)}</span><br/>
                   <strong style="color:${BRAND.ink};font-size:15px;">${escapeHtml(row.value)}</strong>
                 </div>`,
            )
            .join("")}
        </td></tr>
      </table>`
    : "";

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">
          <tr><td style="border-radius:999px;background:${BRAND.primary};">
            <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(ctaLabel)}</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${BRAND.muted};">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
          <a href="${ctaUrl}" style="color:${BRAND.primaryDark};word-break:break-all;">${ctaUrl}</a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F3EEE9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid ${BRAND.border};">
            <tr>
              <td style="padding:28px 32px 8px;">
                <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${BRAND.primary};">${BRAND.name}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px;">
                <h1 style="margin:0 0 18px;font-size:26px;line-height:34px;font-weight:700;letter-spacing:-0.02em;color:${BRAND.ink};">${escapeHtml(title)}</h1>
                ${greeting ? `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${BRAND.ink};">${escapeHtml(greeting)}</p>` : ""}
                ${paragraphsHtml}
                ${infoHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};background:${BRAND.cream};">
                ${footerNote ? `<p style="margin:0 0 10px;font-size:13px;line-height:20px;color:${BRAND.muted};">${escapeHtml(footerNote)}</p>` : ""}
                <p style="margin:0;font-size:12px;line-height:18px;color:${BRAND.muted};">
                  ${BRAND.name} — l'app qui aide à organiser les moments entre proches.<br/>
                  Cet e-mail vous a été envoyé par ${BRAND.name}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** E-mail de notification générique (in-app / e-mail). */
export function renderNotificationEmail(params: {
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  return renderKosyEmail({
    title: params.title,
    preheader: params.body?.slice(0, 120) ?? params.title,
    paragraphs: params.body ? textToParagraphs(params.body) : [],
    ctaLabel: params.ctaLabel,
    ctaUrl: params.ctaUrl,
  });
}

/** E-mail d'invitation à un événement. */
export function renderInvitationEmail(params: {
  guestName?: string;
  hostName?: string;
  eventTitle: string;
  eventDate?: string;
  eventLocation?: string;
  message?: string;
  inviteUrl: string;
}): string {
  const infoRows: { label: string; value: string }[] = [
    { label: "Événement", value: params.eventTitle },
  ];
  if (params.eventDate) infoRows.push({ label: "Quand", value: params.eventDate });
  if (params.eventLocation) infoRows.push({ label: "Où", value: params.eventLocation });

  return renderKosyEmail({
    title: `Vous êtes invité·e : ${params.eventTitle}`,
    preheader: `${params.hostName ?? "Un proche"} vous invite à ${params.eventTitle}`,
    greeting: params.guestName ? `Bonjour ${params.guestName},` : "Bonjour,",
    paragraphs: [
      `${escapeHtml(params.hostName ?? "Un proche")} vous invite à un moment à partager.`,
      ...(params.message ? textToParagraphs(params.message) : []),
      "Répondez en un clic, indiquez ce que vous apportez et retrouvez toutes les infos au même endroit.",
    ],
    infoRows,
    ctaLabel: "Voir l'invitation",
    ctaUrl: params.inviteUrl,
    footerNote: "Aucun compte n'est nécessaire pour répondre à cette invitation.",
  });
}
