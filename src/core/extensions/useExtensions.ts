import { useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EXTENSIONS } from "./registry";
import type { ExtensionDefinition, ExtensionRow } from "./types";

export const extensionsQueryOptions = queryOptions({
  queryKey: ["core", "extensions"],
  queryFn: async (): Promise<ExtensionRow[]> => {
    const { data, error } = await supabase
      .from("extensions")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ExtensionRow[];
  },
  staleTime: 30_000,
});

export function useExtensions() {
  return useQuery(extensionsQueryOptions);
}

/** Extensions that have both a DB row marked enabled AND a code definition. */
export function useActiveExtensions() {
  const q = useExtensions();
  const active = useMemo<ExtensionDefinition[]>(() => {
    const enabled = new Set((q.data ?? []).filter((r) => r.enabled).map((r) => r.key));
    return EXTENSIONS.filter((e) => enabled.has(e.key));
  }, [q.data]);
  return { ...q, data: active };
}
