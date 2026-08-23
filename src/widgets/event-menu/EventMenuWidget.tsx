import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import type { WidgetProps } from "@/core/registry/components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Plus, Trash2 } from "lucide-react";
import { useWidgetItems, scopeFromEventId } from "@/widgets/_shared/useWidgetItems";
import { useMenuComponentsForType } from "@/core/menu/useMenuComponents";
import { useEvent } from "@/widgets/event-shared/queries";

// Widget: Menu & Thème
// Les composantes du repas (apéritif, entrée, plat, grignotage, dessert, boisson…)
// sont administrées dans /app/admin/menu-components et filtrées par type d'événement.
// Chaque composante peut recevoir un ou plusieurs choix de mets/boissons.

const WIDGET_KEY = "event.menu";

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  const Fallback = UtensilsCrossed;
  const C = Cmp ?? Fallback;
  return <C className={className} />;
}

export default function EventMenuWidget({ config }: WidgetProps) {
  const eventId = config?.eventId as string | undefined;
  const { data: event } = useEvent(eventId ?? "");
  const eventType =
    (config?.eventType as string | undefined) ??
    ((event?.metadata as Record<string, unknown> | undefined)?.["event_type"] as string | undefined) ??
    null;

  const { data: components } = useMenuComponentsForType(eventType);
  const { items, create, remove } = useWidgetItems(WIDGET_KEY, scopeFromEventId(eventId));

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const byComponent = useMemo(() => {
    const map: Record<string, typeof items> = {};
    for (const it of items) {
      const key = String(it.payload?.["component_key"] ?? "autre");
      (map[key] ??= []).push(it);
    }
    return map;
  }, [items]);

  const add = (componentKey: string) => {
    const label = (drafts[componentKey] ?? "").trim();
    if (!label) return;
    create.mutate({ payload: { component_key: componentKey, label } });
    setDrafts((d) => ({ ...d, [componentKey]: "" }));
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
      <CardContent className="space-y-4">
        {components.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Aucune composante de repas configurée pour ce type d'événement.
          </p>
        ) : (
          components.map((c) => {
            const list = byComponent[c.key] ?? [];
            return (
              <div key={c.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <LucideIcon name={c.icon} className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium flex-1">{c.label}</p>
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>

                {list.length > 0 && (
                  <ul className="space-y-1">
                    {list.map((it) => (
                      <li key={it.id} className="flex items-center gap-2 group py-1">
                        <span className="flex-1 text-sm">{String(it.payload?.["label"] ?? "")}</span>
                        <button
                          onClick={() => remove.mutate(it.id)}
                          className="opacity-0 group-hover:opacity-100 transition"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Input
                    className="h-9"
                    value={drafts[c.key] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && add(c.key)}
                    placeholder={`Ajouter un choix de ${c.label.toLowerCase()}…`}
                  />
                  <Button onClick={() => add(c.key)} size="icon" variant="secondary" className="rounded-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
