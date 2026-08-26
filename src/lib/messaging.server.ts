/**
 * Service de messagerie : couche d'abstraction entre le plugin Invitations
 * et un futur fournisseur SMS (Plugin Invitations → Service de messagerie → Provider).
 * Le plugin n'appelle jamais un fournisseur directement.
 */

export type SmsResult =
  | { ok: true; providerId: string; reference?: string }
  | { ok: false; reason: "no_provider" | "failed"; message: string };

export type SmsProvider = {
  id: string;
  send: (input: { to: string; text: string; sender?: string }) => Promise<{ reference?: string }>;
};

let provider: SmsProvider | null = null;

/** Point d'extension : une extension SMS enregistre son fournisseur ici. */
export function registerSmsProvider(next: SmsProvider) {
  provider = next;
}

export function hasSmsProvider() {
  return provider !== null;
}

export async function sendSms(input: { to: string; text: string; sender?: string }): Promise<SmsResult> {
  if (!provider) {
    return {
      ok: false,
      reason: "no_provider",
      message: "Aucun fournisseur SMS n'est connecté. Utilisez le partage SMS depuis votre téléphone.",
    };
  }
  try {
    const { reference } = await provider.send(input);
    return { ok: true, providerId: provider.id, reference };
  } catch (error) {
    return {
      ok: false,
      reason: "failed",
      message: error instanceof Error ? error.message : "Envoi SMS impossible",
    };
  }
}
