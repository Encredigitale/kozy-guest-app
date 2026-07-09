import { supabase } from "@/integrations/supabase/client";
import { applyWidgetConfigs } from "./registry";

let loaded = false;
let inflight: Promise<void> | null = null;

/**
 * Charge la configuration des widgets depuis la base et l'applique
 * au Registry. Idempotent : n'exécute la requête qu'une seule fois par
 * session client. Silencieux en cas d'erreur — les défauts déclarés
 * dans `registerWidget` restent actifs.
 */
export function loadWidgetConfigs(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from("widget_configs")
        .select("widget_id, enabled, display_order, event_types");
      if (error) throw error;
      if (data && data.length > 0) applyWidgetConfigs(data);
      loaded = true;
    } catch (err) {
      // Non bloquant : on garde les défauts du Registry.
      console.warn("[widgets] loadWidgetConfigs failed", err);
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
