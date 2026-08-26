import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  GUEST_BRINGS_SETTINGS_KEY,
  normalizeGuestBringsConfig,
  type GuestBringsConfig,
} from "./config";

export type ContributionTypeRow = {
  id: string;
  key: string;
  label: string;
  icon: string;
  sort_order: number;
  active: boolean;
  allow_subchoices: boolean;
  allow_free_text: boolean;
  event_type_keys: string[];
};

export type ContributionChoiceRow = {
  id: string;
  type_id: string;
  label: string;
  sort_order: number;
  active: boolean;
};

export type EventContributionRow = {
  id: string;
  event_id: string;
  invitation_id: string;
  contribution_type_id: string | null;
  choice_id: string | null;
  label: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

export const contributionTypesQueryKey = ["guest-brings", "types"];

export function useGuestBringsConfig() {
  return useQuery<GuestBringsConfig>({
    queryKey: ["guest-brings", "config"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_settings")
        .select("settings")
        .eq("key", GUEST_BRINGS_SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      return normalizeGuestBringsConfig((data as { settings?: unknown } | null)?.settings);
    },
  });
}

export function useSaveGuestBringsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: GuestBringsConfig) => {
      const { error } = await supabase
        .from("invitation_settings")
        .upsert({ key: GUEST_BRINGS_SETTINGS_KEY, settings: settings as never }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guest-brings", "config"] }),
  });
}

/** Référentiel administrable : catégories + sous-choix. */
export function useContributionCatalog() {
  return useQuery({
    queryKey: contributionTypesQueryKey,
    queryFn: async () => {
      const [types, choices] = await Promise.all([
        supabase.from("contribution_types" as never).select("*").order("sort_order", { ascending: true }),
        supabase.from("contribution_choices" as never).select("*").order("sort_order", { ascending: true }),
      ]);
      if (types.error) throw types.error;
      if (choices.error) throw choices.error;
      return {
        types: (types.data ?? []) as unknown as ContributionTypeRow[],
        choices: (choices.data ?? []) as unknown as ContributionChoiceRow[],
      };
    },
  });
}

export function useEventContributions(eventId: string) {
  return useQuery<EventContributionRow[]>({
    queryKey: ["guest-brings", "event", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_contributions" as never)
        .select("*")
        .eq("event_id", eventId)
        .neq("status", "removed")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventContributionRow[];
    },
  });
}
