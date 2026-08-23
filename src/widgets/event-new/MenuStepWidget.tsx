import { useState } from "react";
import * as Icons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed, Plus, Trash2 } from "lucide-react";
import { useWizard } from "./context";
import { useMenuComponentsForType } from "@/core/menu/useMenuComponents";

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  const C = Cmp ?? UtensilsCrossed;
  return <C className={className} />;
}

export default function MenuStepWidget() {
  const { type, menuChoices, addMenuChoice, removeMenuChoice, back, submit, saving, stepIndex, stepCount } = useWizard();
  const { data: components } = useMenuComponentsForType(type);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const add = (key: string) => {
    const label = (drafts[key] ?? "").trim();
    if (!label) return;
    addMenuChoice(key, label);
    setDrafts((d) => ({ ...d, [key]: "" }));
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Étape {stepIndex + 1} / {stepCount}
          </p>
          <h2 className="text-xl font-serif tracking-tight text-primary mt-1">Menu &amp; Thème</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Composez le repas : ajoutez un ou plusieurs choix par composante.
          </p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {components.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Aucune composante de repas configurée pour ce type d'événement.
            </p>
          ) : (
            components.map((c) => {
              const list = menuChoices[c.key] ?? [];
              return (
                <div key={c.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <LucideIcon name={c.icon} className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium flex-1">{c.label}</p>
                    <span className="text-xs text-muted-foreground">{list.length}</span>
                  </div>

                  {list.length > 0 && (
                    <ul className="space-y-1">
                      {list.map((label, i) => (
                        <li key={`${label}-${i}`} className="flex items-center gap-2 group py-1">
                          <span className="flex-1 text-sm">{label}</span>
                          <button
                            type="button"
                            onClick={() => removeMenuChoice(c.key, i)}
                            className="opacity-60 hover:opacity-100 transition"
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
                    <Button type="button" onClick={() => add(c.key)} size="icon" variant="secondary" className="rounded-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={back} className="rounded-full">Retour</Button>
          <Button disabled={saving} onClick={submit} className="rounded-full">
            {saving ? "Création…" : "Créer l'événement"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
