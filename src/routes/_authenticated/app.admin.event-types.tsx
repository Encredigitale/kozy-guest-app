import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { useEventTypes, eventTypesQueryKey, type EventTypeRow } from "@/core/eventTypes/useEventTypes";
import { useActiveWidgets } from "@/core/registry/useRegistry";
import { useMenuComponents } from "@/core/menu/useMenuComponents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/event-types")({
  head: () => ({
    meta: [
      { title: "Types d'événement — Administration Kozy" },
      { name: "description", content: "Gérez le catalogue des types d'événement proposés aux organisateurs." },
      { property: "og:title", content: "Types d'événement — Administration Kozy" },
      { property: "og:description", content: "Catalogue des types d'événement de la plateforme Kozy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventTypesAdminPage,
});

const slug = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Most frequent free-text values entered by users when picking « Autre ». */
function useOtherTypeValues() {
  return useQuery({
    queryKey: ["admin", "other-event-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("metadata").limit(1000);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        const meta = (row as { metadata: Record<string, unknown> | null }).metadata ?? {};
        if (meta["event_type"] !== "other") continue;
        const label = String(meta["event_type_label"] ?? "").trim();
        if (!label) continue;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    },
    initialData: [] as { label: string; count: number }[],
  });
}

function EventTypesAdminPage() {
  const { isAdmin, loading } = useSession();
  const { data: types, isLoading } = useEventTypes();
  const { data: widgets } = useActiveWidgets();
  const { data: components } = useMenuComponents();
  const { data: otherValues } = useOtherTypeValues();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [open, setOpen] = useState<string | null>(null);

  const eventWidgets = useMemo(
    () =>
      (widgets ?? [])
        .filter((w) => w.manifest?.surface === "event.detail" && w.manifest?.component !== "event.type")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [widgets],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: eventTypesQueryKey });

  const add = async () => {
    const name = label.trim();
    if (!name) return toast.error("Libellé requis.");
    const { error } = await supabase.from("event_types" as never).insert({
      key: slug(name),
      label: name,
      icon: icon.trim() || "Sparkles",
      sort_order: (types.at(-1)?.sort_order ?? 0) + 10,
    } as never);
    if (error) return toast.error(error.message);
    setLabel("");
    toast.success("Type ajouté.");
    refresh();
  };

  const update = async (t: EventTypeRow, patch: Partial<EventTypeRow>) => {
    const { error } = await supabase.from("event_types" as never).update(patch as never).eq("id", t.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (t: EventTypeRow) => {
    if (!confirm(`Supprimer le type « ${t.label} » ?`)) return;
    const { error } = await supabase.from("event_types" as never).delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Type supprimé.");
    refresh();
  };

  const toggleIn = (list: string[], key: string) =>
    list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-destructive">Accès réservé aux administrateurs.</div>;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-primary">Types d'événement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Référentiel géré uniquement ici. Les organisateurs choisissent un type existant ; s'ils sélectionnent
          « Autre », leur saisie reste attachée à leur seul événement et n'alimente pas ce catalogue.
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Ajouter un type</CardTitle>
          <CardDescription>Le libellé est affiché aux utilisateurs, l'icône provient de la bibliothèque Lucide.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2 flex-1 min-w-48">
            <Label htmlFor="et-label">Libellé</Label>
            <Input id="et-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Baby shower" />
          </div>
          <div className="space-y-2 w-40">
            <Label htmlFor="et-icon">Icône</Label>
            <Input id="et-icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Sparkles" />
          </div>
          <Button onClick={add} className="rounded-full"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Catalogue</CardTitle>
          <CardDescription>Libellé, icône, ordre, activation — puis widgets et composantes de repas associés.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : types.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun type pour l'instant.</p>
          ) : (
            types.map((t) => {
              const expanded = open === t.id;
              return (
                <div key={t.id} className="rounded-lg border border-border/60">
                  <div className="flex items-center gap-3 p-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setOpen(expanded ? null : t.id)}
                      aria-label={`Configurer ${t.label}`}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <Input
                      className="h-9 flex-1"
                      defaultValue={t.label}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== t.label && update(t, { label: e.target.value.trim() })}
                    />
                    <Input
                      className="h-9 w-32"
                      defaultValue={t.icon}
                      onBlur={(e) => e.target.value.trim() !== t.icon && update(t, { icon: e.target.value.trim() || "Sparkles" })}
                    />
                    <Input
                      className="h-9 w-20"
                      type="number"
                      defaultValue={t.sort_order}
                      onBlur={(e) => Number(e.target.value) !== t.sort_order && update(t, { sort_order: Number(e.target.value) })}
                    />
                    <Switch checked={t.active} onCheckedChange={(v) => update(t, { active: v })} />
                    <Button variant="ghost" size="icon" onClick={() => remove(t)} aria-label={`Supprimer ${t.label}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {expanded && (
                    <div className="border-t border-border/60 p-4 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor={`desc-${t.id}`}>Description</Label>
                        <Input
                          id={`desc-${t.id}`}
                          defaultValue={t.description ?? ""}
                          placeholder="Courte description affichée à l'organisateur"
                          onBlur={(e) =>
                            e.target.value.trim() !== (t.description ?? "") &&
                            update(t, { description: e.target.value.trim() || null })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Widgets associés</Label>
                        <p className="text-xs text-muted-foreground">Présélectionnés lors de la création d'un événement de ce type.</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {eventWidgets.map((w) => {
                            const on = t.default_widgets.includes(w.id);
                            return (
                              <Badge
                                key={w.id}
                                variant={on ? "default" : "outline"}
                                className="cursor-pointer rounded-full"
                                onClick={() => update(t, { default_widgets: toggleIn(t.default_widgets, w.id) })}
                              >
                                {w.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Composantes de repas associées</Label>
                        <p className="text-xs text-muted-foreground">Proposées par défaut à l'étape « Menu &amp; Thème ».</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {(components ?? []).map((c) => {
                            const on = t.menu_components.includes(c.key);
                            return (
                              <Badge
                                key={c.id}
                                variant={on ? "default" : "outline"}
                                className="cursor-pointer rounded-full"
                                onClick={() => update(t, { menu_components: toggleIn(t.menu_components, c.key) })}
                              >
                                {c.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Valeurs « Autre » saisies par les organisateurs</CardTitle>
          <CardDescription>
            Ces valeurs restent attachées à leur événement. Utilisez-les pour décider d'ouvrir un nouveau type officiel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {otherValues.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucune valeur personnalisée pour l'instant.</p>
          ) : (
            <div className="space-y-2">
              {otherValues.map((v) => (
                <div key={v.label} className="flex items-center justify-between p-3 rounded-lg border border-border/60">
                  <span className="text-sm">{v.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{v.count} événement{v.count > 1 ? "s" : ""}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={async () => {
                        const { error } = await supabase.from("event_types" as never).insert({
                          key: slug(v.label),
                          label: v.label,
                          icon: "Sparkles",
                          sort_order: (types.at(-1)?.sort_order ?? 0) + 10,
                        } as never);
                        if (error) return toast.error(error.message);
                        toast.success("Type ajouté au référentiel.");
                        refresh();
                      }}
                    >
                      Créer le type
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
