import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";

/**
 * Extension settings hook. `eventId` scopes to a specific event; the
 * returned `settings` are merged (global → event override).
 */
export function useExtensionSettings(extensionKey: string, eventId?: string) {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = ["core", "extension_settings", extensionKey, eventId ?? null, user?.id ?? null];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { global: {}, event: {}, merged: {} } as const;
      let q = supabase
        .from("extension_settings")
        .select("*")
        .eq("extension_key", extensionKey)
        .eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      const globalRow = data?.find((r) => r.event_id === null);
      const eventRow = eventId ? data?.find((r) => r.event_id === eventId) : undefined;
      const globalSettings = (globalRow?.settings ?? {}) as Record<string, unknown>;
      const eventSettings = (eventRow?.settings ?? {}) as Record<string, unknown>;
      return {
        global: globalSettings,
        event: eventSettings,
        merged: { ...globalSettings, ...eventSettings } as Record<string, unknown>,
      };
    },
  });

  const save = useMutation({
    mutationFn: async (input: { settings: Record<string, unknown>; scope: "global" | "event" }) => {
      if (!user) throw new Error("Non authentifié");
      const payload = {
        user_id: user.id,
        extension_key: extensionKey,
        event_id: input.scope === "event" ? eventId ?? null : null,
        settings: input.settings as never,
      };
      const { error } = await supabase
        .from("extension_settings")
        .upsert(payload, { onConflict: "user_id,extension_key,event_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    ...query,
    settings: query.data?.merged ?? {},
    globalSettings: query.data?.global ?? {},
    eventSettings: query.data?.event ?? {},
    save,
  };
}
