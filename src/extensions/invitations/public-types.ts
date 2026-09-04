/** Types partagés par la page publique d'invitation (client-safe). */
export type PublicInvitationError = "invalid_token" | "expired" | "cancelled_event" | "deleted";

export type PublicInvitationPayload = {
  invitationId: string;
  eventId: string;
  guestName: string | null;
  guestEmail: string | null;
  /** L'invité est déjà rattaché à un compte Kozy. */
  hasAccount: boolean;
  status: string;
  event: {
    title: string;
    description: string | null;
    startsAt: string | null;
    endsAt: string | null;
    location: string | null;
    typeLabel: string | null;
    organizerName: string | null;
  };
  config: {
    allowMaybe: boolean;
    allowChangeResponse: boolean;
    contributionsEnabled: boolean;
  };
  responseClosed: boolean;
  contribution: string | null;
  /** Menu de l'événement, groupé par composante. */
  menu: { label: string; items: string[] }[];
  /** Autres invités et leur réponse. */
  guests: { name: string; status: string; isSelf: boolean }[];
  /** Ce que les invités apportent. */
  brings: { guestName: string; label: string; quantity: number | null; unit: string | null }[];
};
