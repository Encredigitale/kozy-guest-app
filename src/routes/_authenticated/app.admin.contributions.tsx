import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useEventTypes } from "@/core/eventTypes/useEventTypes";
import ContributionsAdminSettings from "@/extensions/contributions/AdminSettings";
import { NEED_ICON_NAMES, NeedIcon } from "@/extensions/contributions/icons";
import { NEED_TYPES, NEED_TYPE_LABELS, type NeedType } from "@/extensions/contributions/config";
import {
  useCategoryMutation,
  useContributionCatalog,
  useSuggestionMutation,
  useUnitMutation,
} from "@/extensions/contributions/useContributions";

export const Route = createFileRoute("/_authenticated/app/admin/contributions")({
  head: () => ({
    meta: [
      { title: "Contributions — Référentiels | Kozy Admin" },
      {
        name: "description",
        content: "Administrez les catégories, unités et suggestions du plugin Contributions.",
      },
      { property: "og:title", content: "Contributions — Référentiels | Kozy Admin" },
      { property: "og:description", content: "Catégories, unités, suggestions et paramètres des contributions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContributionsAdminPage,
});

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `item-${Date.now()}`;

function ContributionsAdminPage() {
  const { data: catalog, isLoading } = useContributionCatalog();
  const categoryMutation = useCategoryMutation();
  const unitMutation = useUnitMutation();
  const suggestionMutation = useSuggestionMutation();
  const { data: eventTypes = [] } = useEventTypes();

  const [newCategory, setNewCategory] = useState({ label: "", icon: "Package" });
  const [newUnit, setNewUnit] = useState<{ label: string; kind: "quantity" | "money" | "none" }>({
    label: "",
    kind: "quantity",
  });
  const [newSuggestion, setNewSuggestion] = useState<{
    label: string;
    eventTypeKey: string;
    categoryId: string;
    needType: NeedType;
    target: string;
    unitId: string;
  }>({ label: "", eventTypeKey: "", categoryId: "", needType: "quantity", target: "1", unitId: "" });

  const categories = catalog?.categories ?? [];
  const units = catalog?.units ?? [];
  const suggestions = catalog?.suggestions ?? [];

  const fail = () => toast.error("Action impossible. Réservé aux administrateurs.");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl">Contributions</h1>
        <p className="text-sm text-muted-foreground">
          Moteur générique de besoins collaboratifs : catégories, unités, suggestions et paramètres.
        </p>
      </header>

      <Tabs defaultValue="categories">
        <TabsList className="rounded-full">
          <TabsTrigger value="categories" className="rounded-full">
            Catégories
          </TabsTrigger>
          <TabsTrigger value="units" className="rounded-full">
            Unités
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="rounded-full">
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full">
            Paramètres
          </TabsTrigger>
        </TabsList>

        {/* Catégories */}
        <TabsContent value="categories" className="pt-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Catégories de besoins</CardTitle>
              <CardDescription>Les catégories servent uniquement à organiser et présenter les besoins.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 p-3">
                    <NeedIcon name={c.icon} className="h-4 w-4 text-foreground/70" />
                    <Input
                      className="h-9 max-w-56 rounded-2xl"
                      defaultValue={c.label}
                      onBlur={(e) =>
                        e.target.value !== c.label &&
                        categoryMutation.mutate(
                          { action: "update", id: c.id, values: { label: e.target.value } },
                          { onError: fail },
                        )
                      }
                    />
                    <Select
                      value={c.icon}
                      onValueChange={(icon) =>
                        categoryMutation.mutate({ action: "update", id: c.id, values: { icon } }, { onError: fail })
                      }
                    >
                      <SelectTrigger className="h-9 w-40 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NEED_ICON_NAMES.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="h-9 w-20 rounded-2xl"
                      defaultValue={c.sort_order}
                      onBlur={(e) =>
                        categoryMutation.mutate(
                          { action: "update", id: c.id, values: { sort_order: Number(e.target.value) } },
                          { onError: fail },
                        )
                      }
                    />
                    <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      Actif
                      <Switch
                        checked={c.active}
                        onCheckedChange={(active) =>
                          categoryMutation.mutate({ action: "update", id: c.id, values: { active } }, { onError: fail })
                        }
                      />
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-destructive"
                      onClick={() => categoryMutation.mutate({ action: "delete", id: c.id }, { onError: fail })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-border/60 pt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Nouvelle catégorie</Label>
                  <Input
                    className="h-9 w-56 rounded-2xl"
                    placeholder="Aide & organisation"
                    value={newCategory.label}
                    onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
                  />
                </div>
                <Select
                  value={newCategory.icon}
                  onValueChange={(icon) => setNewCategory({ ...newCategory, icon })}
                >
                  <SelectTrigger className="h-9 w-40 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEED_ICON_NAMES.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="rounded-full"
                  onClick={() => {
                    const label = newCategory.label.trim();
                    if (!label) return;
                    categoryMutation.mutate(
                      {
                        action: "insert",
                        values: {
                          key: slug(label),
                          label,
                          icon: newCategory.icon,
                          sort_order: categories.length + 1,
                        },
                      },
                      {
                        onSuccess: () => setNewCategory({ label: "", icon: "Package" }),
                        onError: fail,
                      },
                    );
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unités */}
        <TabsContent value="units" className="pt-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Unités</CardTitle>
              <CardDescription>Quantité, financier, ou sans unité.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {units.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 p-3">
                    <Input
                      className="h-9 max-w-40 rounded-2xl"
                      defaultValue={u.label}
                      onBlur={(e) =>
                        e.target.value !== u.label &&
                        unitMutation.mutate(
                          { action: "update", id: u.id, values: { label: e.target.value } },
                          { onError: fail },
                        )
                      }
                    />
                    <Select
                      value={u.kind}
                      onValueChange={(kind) =>
                        unitMutation.mutate(
                          { action: "update", id: u.id, values: { kind: kind as typeof u.kind } },
                          { onError: fail },
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-40 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quantity">Quantité</SelectItem>
                        <SelectItem value="money">Financier</SelectItem>
                        <SelectItem value="none">Sans unité</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="h-9 w-20 rounded-2xl"
                      defaultValue={u.sort_order}
                      onBlur={(e) =>
                        unitMutation.mutate(
                          { action: "update", id: u.id, values: { sort_order: Number(e.target.value) } },
                          { onError: fail },
                        )
                      }
                    />
                    <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      Actif
                      <Switch
                        checked={u.active}
                        onCheckedChange={(active) =>
                          unitMutation.mutate({ action: "update", id: u.id, values: { active } }, { onError: fail })
                        }
                      />
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-destructive"
                      onClick={() => unitMutation.mutate({ action: "delete", id: u.id }, { onError: fail })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-border/60 pt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Nouvelle unité</Label>
                  <Input
                    className="h-9 w-40 rounded-2xl"
                    placeholder="plateau"
                    value={newUnit.label}
                    onChange={(e) => setNewUnit({ ...newUnit, label: e.target.value })}
                  />
                </div>
                <Select
                  value={newUnit.kind}
                  onValueChange={(kind) => setNewUnit({ ...newUnit, kind: kind as typeof newUnit.kind })}
                >
                  <SelectTrigger className="h-9 w-40 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantity">Quantité</SelectItem>
                    <SelectItem value="money">Financier</SelectItem>
                    <SelectItem value="none">Sans unité</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="rounded-full"
                  onClick={() => {
                    const label = newUnit.label.trim();
                    if (!label) return;
                    unitMutation.mutate(
                      {
                        action: "insert",
                        values: { key: slug(label), label, kind: newUnit.kind, sort_order: units.length + 1 },
                      },
                      { onSuccess: () => setNewUnit({ label: "", kind: "quantity" }), onError: fail },
                    );
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggestions */}
        <TabsContent value="suggestions" className="pt-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Suggestions par type d'événement</CardTitle>
              <CardDescription>Besoins proposés à l'organisateur, qu'il reste libre de modifier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 p-3">
                    <span className="min-w-40 text-sm">{s.label}</span>
                    <span className="text-xs text-muted-foreground">{s.event_type_key ?? "tous types"}</span>
                    <span className="text-xs text-muted-foreground">
                      {NEED_TYPE_LABELS[s.need_type]} · objectif {s.target_quantity ?? 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {categories.find((c) => c.id === s.category_id)?.label ?? "—"}
                    </span>
                    <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      Actif
                      <Switch
                        checked={s.active}
                        onCheckedChange={(active) =>
                          suggestionMutation.mutate(
                            { action: "update", id: s.id, values: { active } },
                            { onError: fail },
                          )
                        }
                      />
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-destructive"
                      onClick={() => suggestionMutation.mutate({ action: "delete", id: s.id }, { onError: fail })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Besoin suggéré</Label>
                  <Input
                    className="h-9 rounded-2xl"
                    placeholder="Chaises"
                    value={newSuggestion.label}
                    onChange={(e) => setNewSuggestion({ ...newSuggestion, label: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type d'événement</Label>
                  <Select
                    value={newSuggestion.eventTypeKey}
                    onValueChange={(v) => setNewSuggestion({ ...newSuggestion, eventTypeKey: v })}
                  >
                    <SelectTrigger className="h-9 rounded-2xl">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Catégorie</Label>
                  <Select
                    value={newSuggestion.categoryId}
                    onValueChange={(v) => setNewSuggestion({ ...newSuggestion, categoryId: v })}
                  >
                    <SelectTrigger className="h-9 rounded-2xl">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type de besoin</Label>
                  <Select
                    value={newSuggestion.needType}
                    onValueChange={(v) => setNewSuggestion({ ...newSuggestion, needType: v as NeedType })}
                  >
                    <SelectTrigger className="h-9 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEED_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {NEED_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Objectif</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-9 rounded-2xl"
                    value={newSuggestion.target}
                    onChange={(e) => setNewSuggestion({ ...newSuggestion, target: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unité</Label>
                  <Select
                    value={newSuggestion.unitId}
                    onValueChange={(v) => setNewSuggestion({ ...newSuggestion, unitId: v })}
                  >
                    <SelectTrigger className="h-9 rounded-2xl">
                      <SelectValue placeholder="Sans unité" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="rounded-full"
                onClick={() => {
                  const label = newSuggestion.label.trim();
                  if (!label) return;
                  suggestionMutation.mutate(
                    {
                      action: "insert",
                      values: {
                        label,
                        event_type_key: newSuggestion.eventTypeKey || null,
                        category_id: newSuggestion.categoryId || null,
                        need_type: newSuggestion.needType,
                        target_quantity: Number(newSuggestion.target) || 1,
                        unit_id: newSuggestion.unitId || null,
                        sort_order: suggestions.length + 1,
                      },
                    },
                    {
                      onSuccess: () =>
                        setNewSuggestion({
                          label: "",
                          eventTypeKey: "",
                          categoryId: "",
                          needType: "quantity",
                          target: "1",
                          unitId: "",
                        }),
                      onError: fail,
                    },
                  );
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Ajouter la suggestion
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres */}
        <TabsContent value="settings" className="pt-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Paramètres du plugin</CardTitle>
              <CardDescription>Aucun paramètre ne nécessite de développement.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContributionsAdminSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
