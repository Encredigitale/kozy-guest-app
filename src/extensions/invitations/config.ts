/** Configuration du plugin Invitations (table public.invitation_settings, clé 'default'). */
export type InvitationChannel = "link" | "share" | "email" | "sms" | "whatsapp" | "push";

export type InvitationsConfig = {
  /** Types d'événements concernés (vide = tous). */
  eventTypeKeys: string[];
  /** Module obligatoire pour ces types d'événements. */
  required: boolean;
  allowMaybe: boolean;
  allowChangeResponse: boolean;
  /** Nombre de jours avant l'événement jusqu'auquel on peut répondre. */
  responseDeadlineDays: number;
  /** Durée de validité d'une invitation (jours). 0 = pas d'expiration. */
  expiresDays: number;
  maxReminders: number;
  channels: InvitationChannel[];
  inviteWithoutContact: boolean;
  /** "organizer" = seul l'organisateur voit la liste des invités. */
  guestVisibility: "organizer" | "guests";
  remindersEnabled: boolean;
  templateInvitation: string;
  templateReminder: string;
  templateConfirmation: string;
  /** Canal téléphone : autorise l'invitation via un numéro. */
  phoneEnabled: boolean;
  /** Partage SMS depuis le téléphone de l'organisateur (MVP sans fournisseur). */
  smsShareEnabled: boolean;
  /** Envoi SMS automatisé via une extension fournisseur (à venir). */
  smsAutoEnabled: boolean;
  /** Codes pays autorisés (vide = tous). */
  allowedCountries: string[];
  /** Pays par défaut du sélecteur. */
  defaultCountry: string;
  /** Modèle du SMS ({host}, {event}, {guest}, {link}). */
  templateSms: string;
  /** Expéditeur SMS si le fournisseur le permet. */
  smsSender: string;
};


export const DEFAULT_INVITATIONS_CONFIG: InvitationsConfig = {
  eventTypeKeys: [],
  required: false,
  allowMaybe: true,
  allowChangeResponse: true,
  responseDeadlineDays: 1,
  expiresDays: 30,
  maxReminders: 2,
  channels: ["link", "share", "email", "sms"],
  inviteWithoutContact: true,
  guestVisibility: "organizer",
  remindersEnabled: true,
  templateInvitation: "{host} vous invite à {event}.",
  templateReminder: "Petit rappel : vous n'avez pas encore répondu à cette invitation.",
  templateConfirmation: "Votre participation est confirmée. À bientôt !",
  phoneEnabled: true,
  smsShareEnabled: true,
  smsAutoEnabled: false,
  allowedCountries: [],
  defaultCountry: "FR",
  templateSms: "{guest}, {host} vous invite à {event}. Consultez votre invitation et répondez ici : {link}",
  smsSender: "Kosy",
};

export function normalizeConfig(raw: unknown): InvitationsConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_INVITATIONS_CONFIG } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_INVITATIONS_CONFIG)) {
    if (r[k] !== undefined && r[k] !== null) merged[k] = r[k];
  }
  return merged as InvitationsConfig;
}

export const INVITATION_STATUSES = [
  "draft",
  "sent",
  "opened",
  "accepted",
  "declined",
  "maybe",
  "cancelled",
  "expired",
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const STATUS_LABELS: Record<InvitationStatus, string> = {
  draft: "À envoyer",
  sent: "Envoyée",
  opened: "Vue",
  accepted: "Participe",
  declined: "Ne participe pas",
  maybe: "Peut-être",
  cancelled: "Annulée",
  expired: "Expirée",
};

export function invitationUrl(origin: string, eventId: string, invitationId: string, token: string) {
  return `${origin}/invitation/${eventId}/${invitationId}?token=${token}`;
}
