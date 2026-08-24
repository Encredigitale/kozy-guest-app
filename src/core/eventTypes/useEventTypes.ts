import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EventTypeRow = {
  id: string;
  key: string;
  label: string;
  icon: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  default_widgets: string[];
  menu_components: string[];
};

export const eventTypesQueryKey = ["event-types"] as const;

async function fetchEventTypes(): Promise<EventTypeRow[]> {
  const { data, error } = await supabase
    .from("event_types" as never)
    .select("id, key, label, icon, description, sort_order, active, default_widgets, menu_components")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EventTypeRow[];
}

/** All types (admin view). */
export function useEventTypes() {
  return useQuery({ queryKey: eventTypesQueryKey, queryFn: fetchEventTypes, initialData: [] as EventTypeRow[] });
}

/** Only active types (end-user picker). */
export function useActiveEventTypes() {
  const q = useEventTypes();
  return { ...q, data: (q.data ?? []).filter((t) => t.active) };
}
