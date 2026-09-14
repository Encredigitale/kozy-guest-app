import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useWidgetItems, scopeFromEventId } from "@/widgets/_shared/useWidgetItems";
import { useMenuComponentsForType } from "@/core/menu/useMenuComponents";
import { useEvent } from "@/widgets/event-shared/queries";
import { useSession } from "@/core/auth/useSession";
import { RecipeMenuAction } from "@/extensions/recipes/RecipeMenuAction";
import { useMenuRecipes } from "@/extensions/recipes/useRecipes";

// Widget: Menu & Thème
// Haut : les choix déjà saisis, groupés par composante, avec modifier / supprimer.
// Bas : formulaire d'ajout (liste déroulante des composantes + libellé du choix).

const WIDGET_KEY = "event.menu";

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  const C = Cmp ?? UtensilsCrossed;
  return <C className={className} />;
}

export default function EventMenuWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string | undefined;
  const { data: event } = useEvent(eventId ?? "");
  const { user } = useSession();
  // Seul l'organisateur peut composer le menu ; les invités le consultent.
  const canEdit = !!event && !!user && event.organizer_id === user.id;
  const eventType =
    (config?.eventType as string | undefined) ??
    ((event?.metadata as Record<string, unknown> | undefined)?.["event_type"] as string | undefined) ??
    null;

  const { data: allComponents } = useMenuComponentsForType(eventType);
  const selectedKeys = ((event?.metadata as Record<string, unknown> | undefined)?.["menu_components"] ??
    null) as string[] | null;
  const components = useMemo(
    () =>
      selectedKeys && selectedKeys.length > 0
        ? allComponents.filter((c) => selectedKeys.includes(c.key))
        : allComponents,
    [allComponents, selectedKeys],
  );
  const { items, create, update, remove } = useWidgetItems(WIDGET_KEY, scopeFromEventId(eventId));
  const { data: recipes } = useMenuRecipes(eventId);

  const [componentKey, setComponentKey] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editComponent, setEditComponent] = useState("");

  const activeComponentKey = componentKey || components[0]?.key || "";

  const byComponent = useMemo(() => {
    const map: Record<string, typeof items> = {};
    for (const it of items) {
      const key = String(it.payload?.["component_key"] ?? "autre");
      (map[key] ??= []).push(it);
    }
    return map;
  }, [items]);

  const add = () => {
    const label = draft.trim();
    if (!label || !activeComponentKey) return;
    create.mutate({ payload: { component_key: activeComponentKey, label } });
    setDraft("");
  };

  const startEdit = (id: string, label: string, key: string) => {
    setEditingId(id);
    setEditLabel(label);
    setEditComponent(key);
  };

  const saveEdit = (id: string) => {
    const label = editLabel.trim();
    if (!label) return;
    update.mutate({ id, patch: { payload: { component_key: editComponent, label } } });
    setEditingId(null);
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Menu &amp; Thème</CardTitle>
            <CardDescription>Composez le repas, composante par composante.</CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full text-[10px]">
            {items.length} choix
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Partie haute : éléments choisis */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              {canEdit ? "Aucun choix pour l'instant. Ajoutez-en un ci-dessous." : "Le menu n'est pas encore renseigné."}
            </p>
          ) : (
            components
              .filter((c) => (byComponent[c.key] ?? []).length > 0)
              .map((c) => (
                <div key={c.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <LucideIcon name={c.icon} className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium flex-1">{c.label}</p>
                    <span className="text-xs text-muted-foreground">{(byComponent[c.key] ?? []).length}</span>
                  </div>
                  <ul className="space-y-1">
                    {(byComponent[c.key] ?? []).map((it) => {
                      const label = String(it.payload?.["label"] ?? "");
                      const isEditing = canEdit && editingId === it.id;
                      return (
                        <li key={it.id} className="flex items-center gap-2 py-1">
                          {isEditing ? (
                            <>
                              <Select value={editComponent} onValueChange={setEditComponent}>
                                <SelectTrigger className="h-9 w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {components.map((opt) => (
                                    <SelectItem key={opt.key} value={opt.key}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                className="h-9 flex-1"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && saveEdit(it.id)}
                                autoFocus
                              />
                              <Button size="icon" variant="ghost" onClick={() => saveEdit(it.id)} aria-label="Valider">
                                <Check className="h-4 w-4 text-primary" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label="Annuler">
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm">{label}</span>
                              {eventId && recipes?.enabled && (
                                <RecipeMenuAction
                                  eventId={eventId}
                                  menuItemId={it.id}
                                  menuItemLabel={label}
                                  summary={recipes.byMenuItem[it.id]}
                                  canEdit={canEdit}
                                />
                              )}
                              {canEdit && (
                              <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEdit(it.id, label, c.key)}
                                aria-label="Modifier"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => remove.mutate(it.id)}
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                              </>
                              )}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
          )}
        </div>

        {/* Partie basse : ajout d'un choix */}
        {!canEdit ? null : components.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Aucune composante de repas configurée pour ce type d'événement.
          </p>
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-3">
            <p className="text-sm font-medium">Ajouter un choix</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="space-y-1.5 sm:w-48">
                <Label htmlFor="menu-component">Composante</Label>
                <Select value={activeComponentKey} onValueChange={setComponentKey}>
                  <SelectTrigger id="menu-component" className="h-9">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {components.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="menu-choice">Choix</Label>
                <Input
                  id="menu-choice"
                  className="h-9"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  placeholder="Ex. Tarte aux pommes"
                />
              </div>
              <Button onClick={add} className="rounded-full h-9">
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
