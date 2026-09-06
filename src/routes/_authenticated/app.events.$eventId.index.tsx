import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MapPin, CalendarDays, Plus, Pencil, Search, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEvent } from "@/widgets/event-shared/queries";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import { useEventFeatures, type EventFeature } from "@/core/features/useEventFeatures";
import { FeatureCard } from "@/core/features/FeatureCard";
import { FeaturePicker } from "@/core/features/FeaturePicker";
import { FeatureIcon } from "@/core/features/FeatureIcon";
import { useSession } from "@/core/auth/useSession";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/events/$eventId/")({
  validateSearch: (search: Record<string, unknown>): { bloc?: string; item?: string } => ({
    bloc: typeof search.bloc === "string" && search.bloc ? search.bloc : undefined,
    item: typeof search.item === "string" && search.item ? search.item : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mon événement — Kozy" },
      { name: "description", content: "Gérez votre événement et ajoutez les fonctionnalités utiles." },
      { property: "og:title", content: "Mon événement — Kozy" },
      { property: "og:description", content: "Gérez votre événement et ajoutez les fonctionnalités utiles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventDetailPage,
});

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
  return `${date} · ${time.replace(":", "h")}`;
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { bloc } = Route.useSearch();
  const { data: ev, isLoading: eventLoading } = useEvent(eventId);
  const { user } = useSession();
  const isOrganizer = !!ev && !!user && ev.organizer_id === user.id;
  const isDraft = ev?.status === "draft";
  const isArchived = ev?.status === "archived";
  const { data: types } = useEventTypes();
  const qc = useQueryClient();
  const [statusBusy, setStatusBusy] = useState(false);

  const changeStatus = async (status: "published" | "archived") => {
    setStatusBusy(true);
    const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
    setStatusBusy(false);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Événement publié." : "Événement archivé.");
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };

  const meta = (ev?.metadata ?? {}) as Record<string, unknown>;
  const typeKey = (meta["event_type"] as string | undefined) ?? null;
  const typeRow = (types ?? []).find((t) => t.key === typeKey);
  const typeLabel =
    typeKey === "other" ? ((meta["event_type_label"] as string) || "Autre") : typeRow?.label ?? null;

  const { features, active, setActive, reorder } = useEventFeatures(eventId, typeKey);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const key = `kozy.event.welcome.${eventId}`;
    if (typeof window !== "undefined" && !localStorage.getItem(key)) {
      setWelcome(true);
      localStorage.setItem(key, "1");
    }
  }, [eventId]);

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

  const addFeature = async (f: EventFeature) => {
    setBusyId(f.id);
    try {
      await setActive.mutateAsync({ id: f.id, enabled: true });
      toast.success(`${f.name} ajouté${f.name.endsWith("s") ? "es" : ""} à votre événement`);
      setPickerOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'ajouter cette fonctionnalité.");
    } finally {
      setBusyId(null);
    }
  };

  const disableFeature = async (f: EventFeature) => {
    try {
      await setActive.mutateAsync({ id: f.id, enabled: false });
      toast.success(`${f.name} désactivé — vos données sont conservées.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de désactiver.");
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const ids = active.map((f) => f.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const suggestions = useMemo(
    () => features.filter((f) => f.recommended && f.state !== "active").slice(0, 3),
    [features],
  );

  const dateLabel = formatDate(ev?.starts_at ?? null);

  if (!eventLoading && !ev) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-primary">Événement indisponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cet événement n'existe plus ou n'est pas encore publié par son organisateur.
        </p>
        <Button asChild className="mt-6 h-11 rounded-full">
          <Link to="/app/events">Mes événements</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-28 pt-4 sm:px-6">
      <Link
        to="/app/events"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Mes événements
      </Link>

      <Link
        to="/app/search"
        search={{ event: eventId }}
        aria-label="Rechercher dans cet événement"
        className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-border/60 px-4 text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" /> Rechercher dans cet événement
      </Link>

      {!online && (
        <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          <WifiOff className="h-4 w-4" /> Hors connexion — dernières informations disponibles.
        </div>
      )}

      {/* CORE : informations toujours présentes, jamais désactivables */}
      <Card className="rounded-2xl border-border/60">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            {typeRow && (
              <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 grid place-items-center">
                <FeatureIcon id="event.type" name={typeRow.icon} className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {typeLabel && (
                  <Badge variant="secondary" className="rounded-full text-[11px]">
                    {typeLabel}
                  </Badge>
                )}
                {isDraft && (
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    Brouillon — visible par vous seul
                  </Badge>
                )}
                {isArchived && (
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    Archivé
                  </Badge>
                )}
                {isOrganizer && (
                  <>
                    {ev?.status !== "published" && (
                      <Button
                        size="sm"
                        className="h-7 rounded-full px-3 text-[11px]"
                        disabled={statusBusy}
                        onClick={() => changeStatus("published")}
                      >
                        Publier
                      </Button>
                    )}
                    {ev?.status !== "archived" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full px-3 text-[11px]"
                        disabled={statusBusy}
                        onClick={() => changeStatus("archived")}
                      >
                        Archiver
                      </Button>
                    )}
                  </>
                )}
              </div>
              <h1 className="mt-1 break-words font-serif text-2xl leading-tight tracking-tight text-primary">
                {ev?.title ?? "Événement"}
              </h1>
            </div>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {dateLabel && (
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" /> {dateLabel}
              </p>
            )}
            {ev?.location && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" /> {ev.location}
              </p>
            )}
          </div>
          {isOrganizer ? (
            <Button asChild variant="outline" className="h-11 w-full rounded-full sm:w-auto">
              <Link to="/app/events/$eventId/edit" params={{ eventId }}>
                <Pencil className="h-4 w-4" />
                Modifier les informations
              </Link>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Vous êtes invité(e) à cet événement : les informations sont consultables uniquement.
            </p>
          )}
        </CardContent>
      </Card>

      {welcome && isOrganizer && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="font-medium">Votre événement est créé 🎉</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez maintenant uniquement les fonctionnalités dont vous avez besoin.
          </p>
        </div>
      )}

      {/* FONCTIONNALITÉS : générées dynamiquement depuis le registry */}
      {active.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {active.map((f, i) => (
            <FeatureCard
              key={f.id}
              feature={f}
              eventId={eventId}
              canMoveUp={i > 0}
              canMoveDown={i < active.length - 1}
              onMove={(dir) => move(i, dir)}
              defaultOpen={bloc === f.id}
              canManage={isOrganizer}
              onDisable={() => disableFeature(f)}
            />
          ))}
        </div>
      ) : isOrganizer ? (
        <Card className="rounded-2xl border-dashed border-border">
          <CardContent className="space-y-4 p-6 text-center">
            <p className="font-serif text-xl text-primary">Votre événement est prêt</p>
            <p className="text-sm text-muted-foreground">
              Ajoutez les fonctionnalités qui vous seront utiles pour l'organiser.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((f) => (
                <Button
                  key={f.id}
                  variant="outline"
                  className="h-11 rounded-full"
                  disabled={busyId === f.id}
                  onClick={() => addFeature(f)}
                >
                  <FeatureIcon id={f.id} name={f.icon} className="h-4 w-4 text-primary" />
                  {f.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-dashed border-border">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            L'organisateur n'a pas encore ajouté de fonctionnalité à cet événement.
          </CardContent>
        </Card>
      )}

      {isOrganizer && (
        <>
          <Button className="h-12 w-full rounded-full" onClick={() => setPickerOpen(true)}>
            <Plus className="h-5 w-5" /> Ajouter une fonctionnalité
          </Button>

          <FeaturePicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            features={features}
            onAdd={addFeature}
            busyId={busyId}
          />
        </>
      )}
    </div>
  );
}
