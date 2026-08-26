import { conflictingExtensionKeys, isExclusiveWinnerFrom } from "@/core/extensions/exclusivity";

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

  const explicit: Record<string, boolean | undefined> = {};
  for (const r of (data ?? []) as unknown as Array<{ extension_key: string; enabled: boolean }>) {
    explicit[r.extension_key] = r.enabled;
  }
  return isExclusiveWinnerFrom(explicit, key);
}
