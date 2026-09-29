import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { ChevronLeft, ChevronRight, Search, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SEARCH_SOURCES } from "@/core/search/registry";
import type { SearchResult, SearchSourceId } from "@/core/search/types";
import {
  useDebounced,
  useRecentSearches,
  useSearchResults,
  useSearchSettings,
} from "@/core/search/useSearch";
import { useQuery } from "@tanstack/react-query";
import { eventQueryOptions } from "@/widgets/event-shared/queries";

type SearchParams = { q?: string; source?: string; event?: string };

export const Route = createFileRoute("/_authenticated/app/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
    source: typeof search.source === "string" ? search.source : undefined,
    event: typeof search.event === "string" ? search.event : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Rechercher — Kozy" },
      {
        name: "description",
        content: "Retrouvez un événement, une personne, un cadeau ou un plat en une recherche.",
      },
      { property: "og:title", content: "Rechercher — Kozy" },
      {
        property: "og:description",
        content: "Retrouvez un événement, une personne, un cadeau ou un plat en une recherche.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Cmp ? <Cmp className={className} /> : <Search className={className} />;
}

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(params.q ?? "");
  const { data: settings } = useSearchSettings();
  const eventId = params.event ?? null;
  const { data: ev } = useQuery({ ...eventQueryOptions(eventId ?? ""), enabled: !!eventId });
  const [online, setOnline] = useState(true);

  const { recent, remember, clear } = useRecentSearches(settings.recentRetentionDays);
  const debounced = useDebounced(text, 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // La requête vit dans l'URL : le retour arrière conserve la recherche.
  useEffect(() => {
    if ((params.q ?? "") === debounced) return;
    navigate({
      to: "/app/search",
      search: (prev) => ({ ...prev, q: debounced || undefined }),
      replace: true,
    });
  }, [debounced, params.q, navigate]);

  useEffect(() => {
    if (debounced.trim().length >= settings.minChars && settings.recentEnabled) {
      remember(debounced);
    }
  }, [debounced, settings.minChars, settings.recentEnabled, remember]);

  const activeSource = params.source as SearchSourceId | undefined;
  const sourcesFilter = activeSource ? [activeSource] : undefined;

  const { data, isFetching, isError, refetch } = useSearchResults({
    query: debounced,
    eventId,
    sources: sourcesFilter,
    minChars: settings.minChars,
  });

  const availableSources = useMemo(
    () =>
      SEARCH_SOURCES.filter(
        (s) => !settings.disabledSources.includes(s.id) && (!eventId || s.id !== "contacts"),
      ).sort((a, b) => a.order - b.order),
    [settings.disabledSources, eventId],
  );

  const grouped = useMemo(() => {
    const map = new Map<SearchSourceId, SearchResult[]>();
    for (const r of data?.results ?? []) {
      const list = map.get(r.source) ?? [];
      list.push(r);
      map.set(r.source, list);
    }
    return availableSources
      .map((s) => ({ source: s, items: map.get(s.id) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [data, availableSources]);

  const hasQuery = debounced.trim().length >= settings.minChars;
  const setFilter = (source?: SearchSourceId) =>
    navigate({ to: "/app/search", search: (prev) => ({ ...prev, source }), replace: true });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="kozy-title-band mb-6 flex items-center gap-2 p-3 pr-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          aria-label="Retour"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-xl text-primary">
          {eventId ? "Rechercher dans cet événement" : "Rechercher"}
        </h1>
      </div>

      {eventId && ev && (
        <p className="mb-2 text-xs text-muted-foreground">Dans : {ev.title}</p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rechercher un événement, une personne, un cadeau…"
          aria-label="Rechercher"
          autoComplete="off"
          className="h-12 rounded-full pl-10 pr-11"
        />
        {text && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => {
              setText("");
              inputRef.current?.focus();
            }}
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <Chip active={!activeSource} onClick={() => setFilter(undefined)} label="Tout" />
        {availableSources.map((s) => (
          <Chip
            key={s.id}
            active={activeSource === s.id}
            onClick={() => setFilter(s.id)}
            label={s.label}
          />
        ))}
      </div>

      {!online && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          <WifiOff className="h-4 w-4" /> Recherche hors connexion — résultats disponibles sur cet
          appareil uniquement.
        </div>
      )}

      {!hasQuery ? (
        <div className="mt-6 space-y-6">
          {settings.recentEnabled && recent.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recherches récentes
                </h2>
                <button
                  type="button"
                  onClick={clear}
                  className="min-h-11 text-xs text-primary"
                >
                  Effacer
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setText(r)}
                    className="min-h-11 rounded-full border border-border/60 px-4 text-sm"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}
          {!eventId && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Accès rapides
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <QuickLink to="/app/events" label="Mes événements" icon="Calendar" />
                <QuickLink to="/app/contacts" label="Mes contacts" icon="BookUser" />
              </div>
            </section>
          )}
        </div>
      ) : isError ? (
        <Card className="mt-6 rounded-2xl">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="font-medium">Recherche momentanément indisponible</p>
            <p className="text-sm text-muted-foreground">Réessayez dans quelques instants.</p>
            <Button className="h-11 rounded-full" onClick={() => refetch()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : isFetching && !data ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <Card className="mt-6 rounded-2xl border-dashed">
          <CardContent className="p-6 text-center">
            <p className="font-medium">Aucun résultat pour « {debounced.trim()} »</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez un autre mot ou vérifiez l'orthographe.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map(({ source, items }) => {
            const limited = activeSource ? items : items.slice(0, settings.perCategory);
            return (
              <section key={source.id}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {source.label}
                  </h2>
                  {!activeSource && items.length > limited.length && (
                    <button
                      type="button"
                      onClick={() => setFilter(source.id)}
                      className="min-h-11 text-xs font-medium text-primary"
                    >
                      Voir tout ({items.length})
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {limited.map((r) => (
                    <ResultRow key={`${r.source}-${r.id}`} result={r} icon={source.icon} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm"
    >
      <DynIcon name={icon} className="h-4 w-4 text-primary" />
      {label}
    </Link>
  );
}

/** Deep link : chaque résultat ouvre directement l'information concernée. */
function resultLink(r: SearchResult): { to: string; params?: Record<string, string>; search?: Record<string, string> } {
  if (r.source === "contacts") {
    return { to: "/app/contacts", search: { c: r.id } };
  }
  if (r.source === "events" || !r.eventId) {
    return { to: "/app/events/$eventId", params: { eventId: r.eventId ?? r.id } };
  }
  return {
    to: "/app/events/$eventId",
    params: { eventId: r.eventId },
    search: { bloc: r.blockId ?? "", item: r.id },
  };
}

function ResultRow({ result, icon }: { result: SearchResult; icon: string }) {
  const link = resultLink(result);
  return (
    <Link
      to={link.to}
      params={link.params as never}
      search={link.search as never}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-3"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
        <DynIcon name={icon} className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{result.title}</p>
        {result.subtitle && (
          <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
        )}
        {result.context && (
          <p className="truncate text-xs text-muted-foreground/80">{result.context}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
