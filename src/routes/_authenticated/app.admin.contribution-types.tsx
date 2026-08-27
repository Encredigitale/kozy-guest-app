import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import {
  contributionTypesQueryKey,
  useContributionCatalog,
  type ContributionTypeRow,
} from "@/extensions/guest-brings/useGuestBrings";
import { CONTRIBUTION_ICON_NAMES, ContributionIcon } from "@/extensions/guest-brings/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/contribution-types")({
  head: () => ({
    meta: [
      { title: "Types d'apports — Administration Kozy" },
      {
        name: "description",
        content: "Gérez les catégories d'apports (vin, dessert, fleurs, cadeau…), leurs suggestions et leurs types d'événements.",
      },
      { property: "og:title", content: "Types d'apports — Administration Kozy" },
      { property: "og:description", content: "Référentiel des apports du plugin « Invité apporte »." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContributionTypesAdminPage,
});

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function ContributionTypesAdminPage() {
  const { isAdmin, loading } = useSession();
  const { data: catalog, isLoading } = useContributionCatalog();
  const { data: eventTypes = [] } = useEventTypes();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("Gift");
  const [choiceDrafts, setChoiceDrafts] = useState<Record<string, string>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: contributionTypesQueryKey });
  const types = catalog?.types ?? [];
  const choices = catalog?.choices ?? [];

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-destructive">Accès réservé aux administrateurs.</div>;

  const addType = async () => {
    const name = label.trim();
    if (!name) return toast.error("Libellé requis.");
    const { error } = await supabase.from("contribution_types" as never).insert({
      key: slug(name),
      label: name,
      icon: icon || "Gift",
      sort_order: (types.at(-1)?.sort_order ?? 0) + 10,
    } as never);
    if (error) return toast.error(error.message);
    setLabel("");
    toast.success("Catégorie ajoutée.");
    refresh();
  };

  const updateType = async (t: ContributionTypeRow, patch: Partial<ContributionTypeRow>) => {
    const { error } = await supabase
      .from("contribution_types" as never)
      .update(patch as never)
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const removeType = async (t: ContributionTypeRow) => {
    if (!confirm(`Supprimer la catégorie « ${t.label} » et ses suggestions ?`)) return;
    const { error } = await supabase.from("contribution_types" as never).delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Catégorie supprimée.");
    refresh();
  };

  const addChoice = async (t: ContributionTypeRow) => {
    const value = (choiceDrafts[t.id] ?? "").trim();
    if (!value) return;
    const siblings = choices.filter((c) => c.type_id === t.id);
    const { error } = await supabase.from("contribution_choices" as never).insert({
      type_id: t.id,
      label: value,
      sort_order: (siblings.at(-1)?.sort_order ?? 0) + 10,
    } as never);
    if (error) return toast.error(error.message);
    setChoiceDrafts((d) => ({ ...d, [t.id]: "" }));
    refresh();
  };

  const removeChoice = async (id: string) => {
    const { error } = await supabase.from("contribution_choices" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl">Types d'apports</h1>
        <p className="text-sm text-muted-foreground">
          Référentiel du plugin « Invité apporte » : catégories, suggestions et types d'événements concernés.
        </p>
      </header>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Nouvelle catégorie</CardTitle>
          <CardDescription>Le nom est visible par les invités sur la page d'invitation.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1 space-y-1">
            <Label className="text-xs">Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Fromage" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Icône</Label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {CONTRIBUTION_ICON_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={addType} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" /> Ajouter
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-4">
          {types.map((t) => (
            <Card key={t.id} className="rounded-2xl border-border/60">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <ContributionIcon name={t.icon} className="h-5 w-5 text-primary" />
                  <Input
                    value={t.label}
                    onChange={(e) => updateType(t, { label: e.target.value })}
                    className="h-9 max-w-56"
                  />
                  <select
                    value={t.icon}
                    onChange={(e) => updateType(t, { icon: e.target.value })}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {CONTRIBUTION_ICON_NAMES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    value={t.sort_order}
                    onChange={(e) => updateType(t, { sort_order: Number(e.target.value) })}
                    className="h-9 w-20"
                  />
                  <Badge variant="secondary" className="rounded-full font-mono text-[11px]">
                    {t.key}
                  </Badge>
                  <div className="ml-auto flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={t.active} onCheckedChange={(v) => updateType(t, { active: v })} /> Actif
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeType(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={t.allow_subchoices}
                      onCheckedChange={(v) => updateType(t, { allow_subchoices: v })}
                    />
                    Sous-choix
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={t.allow_free_text}
                      onCheckedChange={(v) => updateType(t, { allow_free_text: v })}
                    />
                    Saisie libre
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Types d'événements (aucun = tous)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map((et) => {
                      const on = t.event_type_keys.includes(et.key);
                      return (
                        <button
                          key={et.key}
                          type="button"
                          onClick={() =>
                            updateType(t, {
                              event_type_keys: on
                                ? t.event_type_keys.filter((k) => k !== et.key)
                                : [...t.event_type_keys, et.key],
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs ${
                            on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                          }`}
                        >
                          {et.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {t.allow_subchoices && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {choices
                        .filter((c) => c.type_id === t.id)
                        .map((c) => (
                          <span
                            key={c.id}
                            className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
                          >
                            {c.label}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => removeChoice(c.id)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={choiceDrafts[t.id] ?? ""}
                        onChange={(e) => setChoiceDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                        placeholder="Ex. Vin rouge"
                        className="h-9 max-w-56"
                      />
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => addChoice(t)}>
                        Ajouter
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
