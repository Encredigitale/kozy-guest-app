import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PHOTOS_SETTINGS_KEY, normalizePhotosConfig, type PhotosConfig } from "./config";

const key = ["photos", "config"];

export function usePhotosConfig() {
  return useQuery<PhotosConfig>({
    queryKey: key,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_settings")
        .select("settings")
        .eq("key", PHOTOS_SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      return normalizePhotosConfig((data as { settings?: unknown } | null)?.settings);
    },
  });
}

export function useSavePhotosConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: PhotosConfig) => {
      const { error } = await supabase
        .from("invitation_settings")
        .upsert({ key: PHOTOS_SETTINGS_KEY, settings: settings as never }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
