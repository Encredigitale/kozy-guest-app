import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EventRow = {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  metadata: Record<string, unknown>;
};

export type Participant = {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string | null;
  role: "organizer" | "guest";
  rsvp_status: "pending" | "accepted" | "declined";
};

export const eventQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["event", eventId],
    queryFn: async (): Promise<EventRow | null> => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return data as EventRow | null;
    },
  });

export const participantsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: ["event", eventId, "participants"],
    queryFn: async (): Promise<Participant[]> => {
      const { data, error } = await supabase.from("event_participants").select("*").eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as Participant[];
    },
  });

export function useEvent(eventId: string) {
  return useQuery(eventQueryOptions(eventId));
}
export function useParticipants(eventId: string) {
  return useQuery(participantsQueryOptions(eventId));
}
