import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { GIFTS_SETTINGS_KEY, normalizeGiftsConfig, type GiftsConfig } from "./config";
import type { Gift, GiftPerson, GiftPersonInput } from "./public-types";

export function useGiftsConfig() {
  return useQuery<GiftsConfig>({
    queryKey: ["gifts", "config"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_settings")
        .select("settings")
        .eq("key", GIFTS_SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;
      return normalizeGiftsConfig((data as { settings?: unknown } | null)?.settings);
    },
  });
}

export function useSaveGiftsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: GiftsConfig) => {
      const { error } = await supabase
        .from("invitation_settings")
        .upsert({ key: GIFTS_SETTINGS_KEY, settings: settings as never }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gifts", "config"] }),
  });
}

/** Contacts du carnet d'adresses de l'utilisateur (widget_items / contacts.book). */
export type ContactOption = { id: string; name: string; email: string; phone: string };

export function useContactOptions() {
  const { user } = useSession();
  return useQuery<ContactOption[]>({
    queryKey: ["gifts", "contacts", user?.id ?? null],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("widget_items")
        .select("id, payload")
        .eq("widget_key", "contacts.book")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const p = (row.payload ?? {}) as Record<string, unknown>;
        return {
          id: row.id as string,
          name: String(p.name ?? p.display_name ?? "Contact"),
          email: String(p.email ?? ""),
          phone: String(p.phone ?? ""),
        };
      });
    },
  });
}

export const giftsQueryKey = (eventId: string) => ["gifts", "list", eventId];

export function useEventGifts(eventId: string) {
  return useQuery<Gift[]>({
    queryKey: giftsQueryKey(eventId),
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_gift")
        .select("*")
        .eq("event_id", eventId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const gifts = (data ?? []) as unknown as Omit<Gift, "recipients" | "givers">[];
      if (gifts.length === 0) return [];
      const { data: people, error: pErr } = await supabase
        .from("event_gift_person")
        .select("*")
        .in("gift_id", gifts.map((g) => g.id));
      if (pErr) throw pErr;
      const rows = (people ?? []) as unknown as GiftPerson[];
      return gifts.map((g) => ({
        ...g,
        recipients: rows.filter((p) => p.gift_id === g.id && p.role === "recipient"),
        givers: rows.filter((p) => p.gift_id === g.id && p.role === "giver"),
      }));
    },
  });
}

export type GiftInput = {
  giftName: string;
  description?: string | null;
  note?: string | null;
  giftDate?: string | null;
  photoId?: string | null;
  visibility: "organizer" | "participants";
  recipients: GiftPersonInput[];
  givers: GiftPersonInput[];
};

function personRows(giftId: string, list: GiftPersonInput[], role: "recipient" | "giver") {
  return list.map((p) => ({
    gift_id: giftId,
    role,
    contact_id: p.sourceType === "contact" ? p.contactId : null,
    manual_name: p.sourceType === "manual" ? p.displayName : null,
    display_name_snapshot: p.displayName,
    source_type: p.sourceType,
  }));
}

export function useGiftMutations(eventId: string) {
  const qc = useQueryClient();
  const { user } = useSession();
  const invalidate = () => qc.invalidateQueries({ queryKey: giftsQueryKey(eventId) });

  const create = useMutation({
    mutationFn: async (input: GiftInput) => {
      const { data, error } = await supabase
        .from("event_gift")
        .insert({
          event_id: eventId,
          gift_name: input.giftName,
          description: input.description ?? null,
          note: input.note ?? null,
          gift_date: input.giftDate ?? null,
          photo_id: input.photoId ?? null,
          visibility: input.visibility,
          created_by_user_id: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const giftId = (data as { id: string }).id;
      const rows = [...personRows(giftId, input.recipients, "recipient"), ...personRows(giftId, input.givers, "giver")];
      if (rows.length > 0) {
        const { error: pErr } = await supabase.from("event_gift_person").insert(rows);
        if (pErr) throw pErr;
      }
      return giftId;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: GiftInput & { id: string }) => {
      const { error } = await supabase
        .from("event_gift")
        .update({
          gift_name: input.giftName,
          description: input.description ?? null,
          note: input.note ?? null,
          gift_date: input.giftDate ?? null,
          photo_id: input.photoId ?? null,
          visibility: input.visibility,
        })
        .eq("id", input.id);
      if (error) throw error;
      const { error: dErr } = await supabase.from("event_gift_person").delete().eq("gift_id", input.id);
      if (dErr) throw dErr;
      const rows = [...personRows(input.id, input.recipients, "recipient"), ...personRows(input.id, input.givers, "giver")];
      if (rows.length > 0) {
        const { error: pErr } = await supabase.from("event_gift_person").insert(rows);
        if (pErr) throw pErr;
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_gift")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
