import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { globalSearch, getSearchSettings } from "@/lib/search.functions";
import {
  DEFAULT_SEARCH_SETTINGS,
  type SearchResponse,
  type SearchSettings,
} from "./types";

const RECENT_KEY = "kozy.search.recent";

type RecentEntry = { q: string; at: number };

export function useSearchSettings() {
  const fn = useServerFn(getSearchSettings);
  return useQuery<SearchSettings>({
    queryKey: ["search", "settings"],
    staleTime: 60_000,
    queryFn: () => fn(),
    initialData: DEFAULT_SEARCH_SETTINGS,
  });
}

/** Debounce court : on n'interroge pas le serveur à chaque frappe. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useSearchResults(params: {
  query: string;
  eventId?: string | null;
  sources?: string[];
  minChars: number;
  enabled?: boolean;
}) {
  const fn = useServerFn(globalSearch);
  const { query, eventId = null, sources, minChars, enabled = true } = params;
  return useQuery<SearchResponse>({
    queryKey: ["search", query, eventId, sources?.join(",") ?? "all"],
    enabled: enabled && query.trim().length >= minChars,
    staleTime: 15_000,
    retry: 1,
    queryFn: () => fn({ data: { q: query.trim(), eventId, sources } }),
  });
}

/** Historique strictement personnel, conservé sur l'appareil. */
export function useRecentSearches(retentionDays: number) {
  const [recent, setRecent] = useState<string[]>([]);

  const read = useCallback((): RecentEntry[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as RecentEntry[];
      const cutoff = Date.now() - retentionDays * 86_400_000;
      return raw.filter((e) => e && typeof e.q === "string" && e.at > cutoff);
    } catch {
      return [];
    }
  }, [retentionDays]);

  useEffect(() => {
    const entries = read();
    setRecent(entries.map((e) => e.q));
    localStorage.setItem(RECENT_KEY, JSON.stringify(entries));
  }, [read]);

  const remember = useCallback(
    (q: string) => {
      const value = q.trim();
      if (value.length < 2) return;
      const entries = read().filter((e) => e.q.toLowerCase() !== value.toLowerCase());
      const next = [{ q: value, at: Date.now() }, ...entries].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecent(next.map((e) => e.q));
    },
    [read],
  );

  const clear = useCallback(() => {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  }, []);

  return { recent, remember, clear };
}
