import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWizard } from "./context";
import { useActiveWidgets } from "@/core/registry/useRegistry";
import { useMemo } from "react";

export default function WidgetsStepWidget() {
  const { type, selectedWidgets, toggleWidget, back, next, submit, saving, isLastStep, stepIndex, stepCount } = useWizard();
  const { data: widgets } = useActiveWidgets();

  const available = useMemo(() => {
    return widgets
      .filter((w) => w.manifest?.surface === "event.detail")
      .filter((w) => w.manifest?.component !== "event.type")
      .filter((w) => {
        const types = w.manifest?.eventTypes ?? [];
        return types.length === 0 || types.includes(type);
      })
      .sort((a, b) => (a.manifest?.order ?? 0) - (b.manifest?.order ?? 0));
  }, [widgets, type]);

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Étape {stepIndex + 1} / {stepCount}</p>
          <h2 className="text-xl font-serif tracking-tight text-primary mt-1">Blocs activés</h2>
          <p className="text-sm text-muted-foreground mt-1">Cochez ceux qui apparaîtront sur la page de votre événement.</p>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {available.map((w) => {
            const checked = selectedWidgets.includes(w.id);
            return (
              <label key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-accent/40 cursor-pointer">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{w.description ?? w.id}</p>
                </div>
                <Switch checked={checked} onCheckedChange={() => toggleWidget(w.id)} />
              </label>
            );
          })}
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={back} className="rounded-full">Retour</Button>
          {isLastStep ? (
            <Button disabled={saving} onClick={submit} className="rounded-full">{saving ? "Création…" : "Créer l'événement"}</Button>
          ) : (
            <Button onClick={next} className="rounded-full">Continuer</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
