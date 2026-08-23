import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { useEventTypes, eventTypesQueryKey, type EventTypeRow } from "@/core/eventTypes/useEventTypes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/event-types")({
  head: () => ({
    meta: [
      { title: "Types d'événement — Administration Kosy" },
      { name: "description", content: "Gérez le catalogue des types d'événement proposés aux organisateurs." },
      { property: "og:title", content: "Types d'événement — Administration Kosy" },
      { property: "og:description", content: "Catalogue des types d'événement de la plateforme Kosy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventTypesAdminPage,
});

const slug = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function EventTypesAdminPage() {
  const { isAdmin, loading } = useSession();
  const { data: types, isLoading } = useEventTypes();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("Sparkles");

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

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-destructive">Accès réservé aux administrateurs.</div>;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-primary">Types d'événement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ces types sont proposés aux organisateurs lors de la création d'un événement. Un utilisateur peut toujours
          choisir « Autre » et saisir sa propre valeur.
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
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : types.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun type pour l'instant.</p>
          ) : (
            types.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
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
            ))
          )}
          <p className="text-xs text-muted-foreground pt-2">Champs : libellé, icône, ordre d'affichage, actif.</p>
        </CardContent>
      </Card>
    </div>
  );
}
