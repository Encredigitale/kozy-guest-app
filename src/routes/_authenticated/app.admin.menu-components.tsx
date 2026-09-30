import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import {
  useMenuComponents,
  menuComponentsQueryKey,
  type MenuComponentRow,
} from "@/core/menu/useMenuComponents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/menu-components")({
  head: () => ({
    meta: [
      { title: "Composantes de repas — Administration Ma Belle Table" },
      {
        name: "description",
        content: "Gérez les composantes de repas (apéritif, entrée, plat, dessert, boissons) par type d'événement.",
      },
      { property: "og:title", content: "Composantes de repas — Administration Ma Belle Table" },
      { property: "og:description", content: "Catalogue des composantes de repas de la plateforme Ma Belle Table." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuComponentsAdminPage,
});

const slug = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function MenuComponentsAdminPage() {
  const { isAdmin, loading } = useSession();
  const { data: components, isLoading } = useMenuComponents();
  const { data: eventTypes } = useEventTypes();
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("UtensilsCrossed");

  const refresh = () => qc.invalidateQueries({ queryKey: menuComponentsQueryKey });

  const add = async () => {
    const name = label.trim();
    if (!name) return toast.error("Libellé requis.");
    const { error } = await supabase.from("menu_components" as never).insert({
      key: slug(name),
      label: name,
      icon: icon.trim() || "UtensilsCrossed",
      sort_order: (components.at(-1)?.sort_order ?? 0) + 10,
    } as never);
    if (error) return toast.error(error.message);
    setLabel("");
    toast.success("Composante ajoutée.");
    refresh();
  };

  const update = async (c: MenuComponentRow, patch: Partial<MenuComponentRow>) => {
    const { error } = await supabase.from("menu_components" as never).update(patch as never).eq("id", c.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const toggleType = (c: MenuComponentRow, key: string) => {
    const next = c.event_types.includes(key)
      ? c.event_types.filter((k) => k !== key)
      : [...c.event_types, key];
    update(c, { event_types: next });
  };

  const remove = async (c: MenuComponentRow) => {
    if (!confirm(`Supprimer la composante « ${c.label} » ?`)) return;
    const { error } = await supabase.from("menu_components" as never).delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Composante supprimée.");
    refresh();
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <div className="p-8 text-sm text-destructive">Accès réservé aux administrateurs.</div>;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-primary">Composantes de repas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ces composantes structurent le widget « Menu &amp; Thème ». Sélectionnez les types d'événement concernés —
          aucun type coché signifie « tous les types ».
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Ajouter une composante</CardTitle>
          <CardDescription>Ex. Apéritif, Grignotage, Entrée, Plat, Dessert, Boissons…</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2 flex-1 min-w-48">
            <Label htmlFor="mc-label">Libellé</Label>
            <Input id="mc-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Digestif" />
          </div>
          <div className="space-y-2 w-40">
            <Label htmlFor="mc-icon">Icône</Label>
            <Input id="mc-icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="UtensilsCrossed" />
          </div>
          <Button onClick={add} className="rounded-full">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Catalogue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : components.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucune composante pour l'instant.</p>
          ) : (
            components.map((c) => (
              <div key={c.id} className="rounded-xl border border-border/60 p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    className="h-9 flex-1"
                    defaultValue={c.label}
                    onBlur={(e) =>
                      e.target.value.trim() && e.target.value !== c.label && update(c, { label: e.target.value.trim() })
                    }
                  />
                  <Input
                    className="h-9 w-40"
                    defaultValue={c.icon}
                    onBlur={(e) => e.target.value.trim() !== c.icon && update(c, { icon: e.target.value.trim() })}
                  />
                  <Input
                    type="number"
                    className="h-9 w-20"
                    defaultValue={c.sort_order}
                    onBlur={(e) => update(c, { sort_order: Number(e.target.value) || 0 })}
                  />
                  <Switch checked={c.active} onCheckedChange={(v) => update(c, { active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => remove(c)} aria-label="Supprimer">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Types :</span>
                  {c.event_types.length === 0 && (
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      Tous
                    </Badge>
                  )}
                  {eventTypes.map((t) => {
                    const on = c.event_types.includes(t.key);
                    return (
                      <button key={t.id} type="button" onClick={() => toggleType(c, t.key)}>
                        <Badge
                          variant={on ? "default" : "outline"}
                          className="rounded-full text-[10px] cursor-pointer"
                        >
                          {t.label}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
