import * as Icons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Check } from "lucide-react";
import { useWizard } from "./context";
import { useMenuComponentsForType } from "@/core/menu/useMenuComponents";

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  const C = Cmp ?? UtensilsCrossed;
  return <C className={className} />;
}

export default function MenuStepWidget() {
  const { type, menuComponents, toggleMenuComponent, back, submit, saving, stepIndex, stepCount } = useWizard();
  const { data: components } = useMenuComponentsForType(type);

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Étape {stepIndex + 1} / {stepCount}
          </p>
          <h2 className="text-xl font-serif tracking-tight text-primary mt-1">Menu &amp; Thème</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sélectionnez les composantes du repas. Vous saisirez les choix sur la page de l'événement.
          </p>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {components.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Aucune composante de repas configurée pour ce type d'événement.
            </p>
          ) : (
            components.map((c) => {
              const active = menuComponents.includes(c.key);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleMenuComponent(c.key)}
                  aria-pressed={active}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <LucideIcon name={c.icon} className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm font-medium">{c.label}</span>
                  <span
                    className={`h-5 w-5 rounded-full grid place-items-center border ${
                      active ? "bg-primary border-primary" : "border-border"
                    }`}
                  >
                    {active && <Check className="h-3 w-3 text-primary-foreground" />}
                  </span>
                </button>
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
