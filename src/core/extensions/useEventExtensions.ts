import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventExtensionRow } from "./types";

/** Per-event activation/deactivation of extensions. */
export function useEventExtensions(eventId: string) {
  const qc = useQueryClient();
  const key = ["core", "event_extensions", eventId];

  const query = useQuery({
    queryKey: key,
    enabled: !!eventId,
    queryFn: async (): Promise<EventExtensionRow[]> => {
      const { data, error } = await supabase
        .from("event_extensions")
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as unknown as EventExtensionRow[];
    },
  });

  const setEnabled = useMutation({
    mutationFn: async (input: { extensionKey: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("event_extensions")
        .upsert(
          {
            event_id: eventId,
            extension_key: input.extensionKey,
            enabled: input.enabled,
          },
          { onConflict: "event_id,extension_key" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, rows: query.data ?? [], setEnabled };
}
