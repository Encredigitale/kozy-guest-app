import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeConfig, type InvitationsConfig, type InvitationStatus } from "./config";

export type InvitationRow = {
  id: string;
  event_id: string;
  organizer_id: string;
  contact_id: string | null;
  guest_user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  phone_e164: string | null;
  channel: string | null;
  status: InvitationStatus;
  token: string;
  message: string | null;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type InvitationLogRow = {
  id: string;
  invitation_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function useInvitationsConfig() {
  return useQuery<InvitationsConfig>({
    queryKey: ["invitations", "config"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_settings")
        .select("settings")
        .eq("key", "default")
        .maybeSingle();
      if (error) throw error;
      return normalizeConfig((data as { settings?: unknown } | null)?.settings);
    },
  });
}

export function useSaveInvitationsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: InvitationsConfig) => {
      const { error } = await supabase
        .from("invitation_settings")
        .upsert({ key: "default", settings: settings as never }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", "config"] }),
  });
}

export function useEventInvitations(eventId: string) {
  const qc = useQueryClient();
  const key = ["invitations", "event", eventId];

  const query = useQuery<InvitationRow[]>({
    queryKey: key,
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as InvitationRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<InvitationRow> }) => {
      const { error } = await supabase.from("invitations").update(input.patch as never).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { ...query, invitations: query.data ?? [], update, remove, invalidate };
}

export function useInvitationLogs(invitationId: string | null) {
  return useQuery<InvitationLogRow[]>({
    queryKey: ["invitations", "logs", invitationId],
    enabled: !!invitationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_logs")
        .select("*")
        .eq("invitation_id", invitationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as InvitationLogRow[];
    },
  });
}

/** Contacts du carnet d'adresses (widget_items) pour l'autocomplétion. */
export function useContactBook() {
  return useQuery({
    queryKey: ["invitations", "contacts"],
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
          name: (p.name as string) ?? "",
          email: (p.email as string) ?? "",
          phone: (p.phone as string) ?? "",
          phoneE164: (p.phone_e164 as string) ?? "",
          group: (p.group as string) ?? "",
          avatarUrl: (p.avatar_url as string) ?? "",
        };
      });
    },
  });
}
