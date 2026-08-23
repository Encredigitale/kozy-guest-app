import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MenuComponentRow = {
  id: string;
  key: string;
  label: string;
  icon: string;
  sort_order: number;
  active: boolean;
  event_types: string[];
};

export const menuComponentsQueryKey = ["menu-components"] as const;

async function fetchMenuComponents(): Promise<MenuComponentRow[]> {
  const { data, error } = await supabase
    .from("menu_components" as never)
    .select("id, key, label, icon, sort_order, active, event_types")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MenuComponentRow[];
}

/** All components (admin view). */
export function useMenuComponents() {
  return useQuery({
    queryKey: menuComponentsQueryKey,
    queryFn: fetchMenuComponents,
    initialData: [] as MenuComponentRow[],
  });
}

/** Active components applicable to a given event type (empty event_types = all types). */
export function useMenuComponentsForType(eventType?: string | null) {
  const q = useMenuComponents();
  const data = (q.data ?? [])
    .filter((c) => c.active)
    .filter((c) => c.event_types.length === 0 || (eventType ? c.event_types.includes(eventType) : false));
  return { ...q, data };
}
