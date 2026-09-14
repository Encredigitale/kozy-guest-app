import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  RECIPES_SETTINGS_KEY,
  normalizeRecipesConfig,
  type RecipesConfig,
} from "./config";
import type { RecipeCandidate, RecipeDetail, RecipeSummary } from "./public-types";

export function useRecipesConfig() {
  return useQuery<RecipesConfig>({
    queryKey: ["recipes", "config"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_settings")
        .select("settings")
        .eq("key", RECIPES_SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      return normalizeRecipesConfig((data as { settings?: unknown } | null)?.settings);
    },
  });
}

export function useSaveRecipesConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: RecipesConfig) => {
      const { error } = await supabase
        .from("invitation_settings")
        .upsert({ key: RECIPES_SETTINGS_KEY, settings: settings as never }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes", "config"] }),
  });
}

/** Recettes de l'événement, indexées par élément de menu. */
export function useMenuRecipes(eventId: string | undefined) {
  return useQuery<{ enabled: boolean; byMenuItem: Record<string, RecipeSummary> }>({
    queryKey: ["recipes", "event", eventId ?? null],
    enabled: !!eventId,
    queryFn: async () => {
      const { listMenuRecipes } = await import("@/lib/recipes.functions");
      const res = (await listMenuRecipes({ data: { eventId: eventId! } })) as {
        enabled: boolean;
        recipes: RecipeSummary[];
      };
      const byMenuItem: Record<string, RecipeSummary> = {};
      for (const r of res.recipes) byMenuItem[r.menuItemId] = r;
      return { enabled: res.enabled, byMenuItem };
    },
  });
}

export function useRecipe(recipeId: string | null) {
  return useQuery<RecipeDetail | null>({
    queryKey: ["recipes", "detail", recipeId],
    enabled: !!recipeId,
    queryFn: async () => {
      const { getRecipe } = await import("@/lib/recipes.functions");
      const res = (await getRecipe({ data: { recipeId: recipeId! } })) as {
        ok: boolean;
        recipe?: RecipeDetail;
      };
      return res.ok ? (res.recipe ?? null) : null;
    },
  });
}

export function useRecipeShareCandidates(eventId: string | undefined, enabled: boolean) {
  return useQuery<RecipeCandidate[]>({
    queryKey: ["recipes", "candidates", eventId ?? null],
    enabled: !!eventId && enabled,
    queryFn: async () => {
      const { listRecipeShareCandidates } = await import("@/lib/recipes.functions");
      const res = (await listRecipeShareCandidates({ data: { eventId: eventId! } })) as {
        candidates: RecipeCandidate[];
      };
      return res.candidates;
    },
  });
}

export function useRecipeMutations(eventId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = (recipeId?: string | null) => {
    qc.invalidateQueries({ queryKey: ["recipes", "event", eventId ?? null] });
    if (recipeId) qc.invalidateQueries({ queryKey: ["recipes", "detail", recipeId] });
  };

  const save = useMutation({
    mutationFn: async (input: {
      menuItemId: string;
      recipeId?: string | null;
      title: string;
      textContent: string;
      externalUrl: string;
      externalUrlNote: string;
      photos: Array<{ path: string; width: number; height: number }>;
    }) => {
      const { saveRecipe } = await import("@/lib/recipes.functions");
      const res = (await saveRecipe({ data: { eventId: eventId!, ...input } })) as {
        ok: boolean;
        error?: string;
        recipeId?: string;
      };
      if (!res.ok) throw new Error(res.error ?? "save_failed");
      return res.recipeId!;
    },
    onSuccess: (recipeId) => invalidate(recipeId),
  });

  const remove = useMutation({
    mutationFn: async (recipeId: string) => {
      const { deleteRecipe } = await import("@/lib/recipes.functions");
      const res = (await deleteRecipe({ data: { recipeId } })) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error ?? "delete_failed");
    },
    onSuccess: () => invalidate(),
  });

  const share = useMutation({
    mutationFn: async (input: { recipeId: string; invitationIds: string[] }) => {
      const { setRecipeShares } = await import("@/lib/recipes.functions");
      const res = (await setRecipeShares({ data: input })) as {
        ok: boolean;
        error?: string;
        added: number;
      };
      if (!res.ok) throw new Error(res.error ?? "share_failed");
      return res.added;
    },
    onSuccess: (_added, input) => invalidate(input.recipeId),
  });

  return { save, remove, share };
}
