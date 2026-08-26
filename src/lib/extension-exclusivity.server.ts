import { conflictingExtensionKeys, exclusivityPriority } from "@/core/extensions/exclusivity";

/**
 * Résout l'exclusivité mutuelle entre extensions pour un événement.
 * Renvoie false si une extension du même groupe l'emporte sur `key`.
 */
export async function isExclusiveWinner(eventId: string, key: string): Promise<boolean> {
  const siblings = conflictingExtensionKeys(key);
  if (siblings.length === 0) return true;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const groupKeys = [key, ...siblings];
  const { data } = await supabaseAdmin
    .from("event_extensions")
    .select("extension_key, enabled")
    .eq("event_id", eventId)
    .in("extension_key", groupKeys);

  const rows = ((data ?? []) as unknown as Array<{ extension_key: string; enabled: boolean }>).reduce(
    (acc, r) => ({ ...acc, [r.extension_key]: r.enabled }),
    {} as Record<string, boolean>,
  );

  if (rows[key] === false) return false;

  // Choix explicite de l'organisateur : une seule extension du groupe activée.
  const explicitlyOn = groupKeys.filter((k) => rows[k] === true);
  if (explicitlyOn.length > 0) {
    if (!explicitlyOn.includes(key)) return false;
    if (explicitlyOn.length === 1) return true;
  }

  // Aucun choix explicite : la clé prioritaire du groupe gagne parmi celles non désactivées.
  const candidates = (explicitlyOn.length > 1 ? explicitlyOn : groupKeys).filter((k) => rows[k] !== false);
  const winner = candidates.sort((a, b) => exclusivityPriority(a) - exclusivityPriority(b))[0];
  return winner === key;
}
