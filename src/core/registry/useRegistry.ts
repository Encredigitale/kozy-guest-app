import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WidgetRow } from "./types";

export const widgetsQueryOptions = queryOptions({
  queryKey: ["core", "widgets"],
  queryFn: async (): Promise<WidgetRow[]> => {
    const { data, error } = await supabase
      .from("widgets")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as WidgetRow[];
  },
  staleTime: 30_000,
});

export function useWidgets() {
  return useQuery(widgetsQueryOptions);
}

export function useActiveWidgets() {
  const q = useWidgets();
  return { ...q, data: (q.data ?? []).filter((w) => w.enabled) };
}
