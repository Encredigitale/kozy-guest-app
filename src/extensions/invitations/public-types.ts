/** Types partagés par la page publique d'invitation (client-safe). */
export type PublicInvitationError = "invalid_token" | "expired" | "cancelled_event" | "deleted";

export type PublicInvitationPayload = {
  invitationId: string;
  eventId: string;
  guestName: string | null;
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
};
