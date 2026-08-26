import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTRIBUTIONS_SETTINGS_KEY,
  normalizeContributionsConfig,
  type ContributionsConfig,
  type NeedPriority,
  type NeedStatus,
  type NeedType,
} from "./config";

export type CategoryRow = {
  id: string;
  key: string;
  label: string;
  icon: string;
  sort_order: number;
  active: boolean;
  event_type_keys: string[];
};

export type UnitRow = {
  id: string;
  key: string;
  label: string;
  kind: "quantity" | "money" | "none";
  sort_order: number;
  active: boolean;
};

export type SuggestionRow = {
  id: string;
  event_type_key: string | null;
  category_id: string | null;
  label: string;
  need_type: NeedType;
  target_quantity: number | null;
  unit_id: string | null;
  sort_order: number;
  active: boolean;
};

export type NeedRow = {
  id: string;
  event_id: string;
  category_id: string | null;
  label: string;
  description: string | null;
  need_type: NeedType;
  target_quantity: number;
  unit_id: string | null;
  priority: NeedPriority;
  allow_overcommitment: boolean;
  status: NeedStatus;
  created_at: string;
};

export type CommitmentRow = {
  id: string;
  need_id: string;
  invitation_id: string | null;
  guest_name: string | null;
  quantity: number;
  note: string | null;
  status: "active" | "cancelled";
};

/* ------------------------------------------------------------------ config */

export function useContributionsConfig() {
  return useQuery<ContributionsConfig>({
    queryKey: ["contributions", "config"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_settings")
        .select("settings")
        .eq("key", CONTRIBUTIONS_SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      return normalizeContributionsConfig((data as { settings?: unknown } | null)?.settings);
    },
  });
}

export function useSaveContributionsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: ContributionsConfig) => {
      const { error } = await supabase
        .from("invitation_settings")
        .upsert({ key: CONTRIBUTIONS_SETTINGS_KEY, settings: settings as never }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contributions", "config"] }),
  });
}

/* ----------------------------------------------------------------- catalog */

export function useContributionCatalog() {
  return useQuery({
    queryKey: ["contributions", "catalog"],
    staleTime: 60_000,
    queryFn: async () => {
      const [cats, units, suggestions] = await Promise.all([
        supabase.from("contribution_categories").select("*").order("sort_order", { ascending: true }),
        supabase.from("contribution_units").select("*").order("sort_order", { ascending: true }),
        supabase.from("contribution_suggestions").select("*").order("sort_order", { ascending: true }),
      ]);
      if (cats.error) throw cats.error;
      if (units.error) throw units.error;
      if (suggestions.error) throw suggestions.error;
      return {
        categories: (cats.data ?? []) as unknown as CategoryRow[],
        units: (units.data ?? []) as unknown as UnitRow[],
        suggestions: (suggestions.data ?? []) as unknown as SuggestionRow[],
      };
    },
  });
}

function useCatalogMutation<T>(table: string, invalidate = ["contributions", "catalog"]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action: "insert" | "update" | "delete"; id?: string; values?: T }) => {
      const q = supabase.from(table as never);
      if (input.action === "insert") {
        const { error } = await q.insert(input.values as never);
        if (error) throw error;
      } else if (input.action === "update") {
        const { error } = await q.update(input.values as never).eq("id", input.id!);
        if (error) throw error;
      } else {
        const { error } = await q.delete().eq("id", input.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidate }),
  });
}

export const useCategoryMutation = () => useCatalogMutation<Partial<CategoryRow>>("contribution_categories");
export const useUnitMutation = () => useCatalogMutation<Partial<UnitRow>>("contribution_units");
export const useSuggestionMutation = () => useCatalogMutation<Partial<SuggestionRow>>("contribution_suggestions");

/* ------------------------------------------------------------------- needs */

export function useEventNeeds(eventId: string) {
  const qc = useQueryClient();
  const key = ["contributions", "needs", eventId];

  const query = useQuery({
    queryKey: key,
    enabled: !!eventId,
    queryFn: async () => {
      const needs = await supabase
        .from("contribution_needs")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (needs.error) throw needs.error;
      const needRows = (needs.data ?? []) as unknown as NeedRow[];
      if (needRows.length === 0) return { needs: needRows, commitments: [] as CommitmentRow[] };
      const commits = await supabase
        .from("contribution_commitments")
        .select("*")
        .in(
          "need_id",
          needRows.map((n) => n.id),
        )
        .eq("status", "active");
      if (commits.error) throw commits.error;
      return { needs: needRows, commitments: (commits.data ?? []) as unknown as CommitmentRow[] };
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createNeed = useMutation({
    mutationFn: async (values: Partial<NeedRow>) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("contribution_needs")
        .insert({ ...values, event_id: eventId, created_by: user.user?.id ?? null } as never);
      if (error) throw error;
      await supabase.from("contribution_logs").insert({
        event_id: eventId,
        action: "need_created",
        metadata: { label: values.label ?? null },
      } as never);
    },
    onSuccess: invalidate,
  });

  const updateNeed = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<NeedRow> }) => {
      const { error } = await supabase.from("contribution_needs").update(values as never).eq("id", id);
      if (error) throw error;
      await supabase.from("contribution_logs").insert({
        event_id: eventId,
        need_id: id,
        action: values.status ? `need_${values.status}` : "need_updated",
        metadata: values as never,
      } as never);
    },
    onSuccess: invalidate,
  });

  const deleteNeed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contribution_needs").delete().eq("id", id);
      if (error) throw error;
      await supabase.from("contribution_logs").insert({
        event_id: eventId,
        action: "need_deleted",
        metadata: { need_id: id },
      } as never);
    },
    onSuccess: invalidate,
  });

  return {
    needs: query.data?.needs ?? [],
    commitments: query.data?.commitments ?? [],
    isLoading: query.isLoading,
    createNeed,
    updateNeed,
    deleteNeed,
  };
}
