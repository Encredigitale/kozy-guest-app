import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { toE164 } from "@/lib/phone";
import { buildAvatarVariants, checkAvatarFile } from "./avatar";
import type {
  LegalDocument,
  ProfileFieldConfig,
  ReferentialItem,
  UserConsent,
  UserProfile,
  UserSelection,
} from "./types";

/** Référentiels administrables (préférences alimentaires / allergies). */
export function useReferentials() {
  return useQuery({
    queryKey: ["user-info", "referentials"],
    queryFn: async () => {
      const [prefs, allergies] = await Promise.all([
        supabase.from("food_preferences").select("*").eq("active", true).order("sort_order"),
        supabase.from("allergies").select("*").eq("active", true).order("sort_order"),
      ]);
      if (prefs.error) throw prefs.error;
      if (allergies.error) throw allergies.error;
      return {
        foodPreferences: (prefs.data ?? []) as ReferentialItem[],
        allergies: (allergies.data ?? []) as ReferentialItem[],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Configuration des champs (obligatoire / facultatif / masqué). */
export function useProfileFieldConfig() {
  return useQuery({
    queryKey: ["user-info", "field-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_field_config")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ProfileFieldConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function fieldStatus(config: ProfileFieldConfig[] | undefined, key: string) {
  return config?.find((c) => c.field_key === key)?.status ?? "optional";
}

/** Dernières versions publiées des documents légaux. */
export function useLegalDocuments() {
  return useQuery({
    queryKey: ["user-info", "legal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("*")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });
      if (error) throw error;
      const docs = (data ?? []) as LegalDocument[];
      return {
        all: docs,
        terms: docs.find((d) => d.doc_type === "terms") ?? null,
        privacy: docs.find((d) => d.doc_type === "privacy") ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserProfile() {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = ["user-info", "profile", user?.id ?? null];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Non authentifié");
      const [profile, prefs, allergies, consents] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_food_preferences").select("*").eq("user_id", user.id),
        supabase.from("user_allergies").select("*").eq("user_id", user.id),
        supabase
          .from("user_consents")
          .select("*")
          .eq("user_id", user.id)
          .order("accepted_at", { ascending: false }),
      ]);
      if (profile.error) throw profile.error;
      return {
        profile: (profile.data ?? null) as UserProfile | null,
        foodPreferences: ((prefs.data ?? []) as { id: string; preference_id: string | null; custom_value: string | null }[]).map(
          (r): UserSelection => ({ id: r.id, refId: r.preference_id, custom_value: r.custom_value }),
        ),
        allergies: ((allergies.data ?? []) as { id: string; allergy_id: string | null; custom_value: string | null }[]).map(
          (r): UserSelection => ({ id: r.id, refId: r.allergy_id, custom_value: r.custom_value }),
        ),
        consents: (consents.data ?? []) as UserConsent[],
      };
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const saveIdentity = useMutation({
    mutationFn: async (input: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      countryCode?: string;
    }) => {
      if (!user) throw new Error("Non authentifié");
      const patch: Record<string, unknown> = { user_id: user.id };
      if (input.first_name !== undefined) patch.first_name = input.first_name.trim() || null;
      if (input.last_name !== undefined) patch.last_name = input.last_name.trim() || null;
      if (input.phone !== undefined) {
        const raw = input.phone.trim();
        const e164 = raw ? toE164(raw, input.countryCode) : null;
        if (raw && !e164) throw new Error("Numéro de téléphone invalide.");
        patch.phone = raw || null;
        patch.phone_normalized = e164;
        patch.phone_verified = false;
      }
      const { error } = await supabase
        .from("user_profiles")
        .upsert(patch as never, { onConflict: "user_id" });
      if (error) throw error;
      // Le nom affiché du Core reste synchronisé avec l'identité du plugin.
      if (input.first_name !== undefined || input.last_name !== undefined) {
        const display = [
          input.first_name ?? query.data?.profile?.first_name ?? "",
          input.last_name ?? query.data?.profile?.last_name ?? "",
        ]
          .join(" ")
          .trim();
        if (display) await supabase.from("profiles").upsert({ user_id: user.id, display_name: display });
      }
    },
    onSuccess: invalidate,
  });

  const saveSelections = useMutation({
    mutationFn: async (input: {
      table: "food" | "allergy";
      selected: { refId: string; custom_value?: string | null }[];
    }) => {
      if (!user) throw new Error("Non authentifié");
      const table = input.table === "food" ? "user_food_preferences" : "user_allergies";
      const fk = input.table === "food" ? "preference_id" : "allergy_id";
      const { error: delError } = await supabase.from(table).delete().eq("user_id", user.id);
      if (delError) throw delError;
      if (input.selected.length === 0) return;
      const rows = input.selected.map((s) => ({
        user_id: user.id,
        [fk]: s.refId,
        custom_value: s.custom_value?.trim() || null,
      }));
      const { error } = await supabase.from(table).insert(rows as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Non authentifié");
      const problem = checkAvatarFile(file);
      if (problem) throw new Error(problem);
      const { small, large } = await buildAvatarVariants(file);
      const stamp = Date.now();
      const base = `${user.id}/avatar-${stamp}`;
      const up1 = await supabase.storage
        .from("avatars")
        .upload(`${base}-256.webp`, small, { contentType: "image/webp", upsert: true });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage
        .from("avatars")
        .upload(`${base}-512.webp`, large, { contentType: "image/webp", upsert: true });
      if (up2.error) throw up2.error;
      const { error } = await supabase
        .from("user_profiles")
        .upsert({ user_id: user.id, profile_picture_path: `${base}-256.webp` } as never, {
          onConflict: "user_id",
        });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeAvatar = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      const path = query.data?.profile?.profile_picture_path;
      if (path) {
        await supabase.storage.from("avatars").remove([path, path.replace("-256.webp", "-512.webp")]);
      }
      const { error } = await supabase
        .from("user_profiles")
        .upsert({ user_id: user.id, profile_picture_path: null } as never, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const recordConsent = useMutation({
    mutationFn: async (input: { consent_type: "terms" | "privacy"; document_version: string }) => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from("user_consents").insert({
        user_id: user.id,
        consent_type: input.consent_type,
        document_version: input.document_version,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    ...query,
    profile: query.data?.profile ?? null,
    consents: query.data?.consents ?? [],
    foodPreferences: query.data?.foodPreferences ?? [],
    allergies: query.data?.allergies ?? [],
    saveIdentity,
    saveSelections,
    uploadAvatar,
    removeAvatar,
    recordConsent,
  };
}

/** URL signée temporaire de l'avatar (stockage privé). */
export function useAvatarUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}
