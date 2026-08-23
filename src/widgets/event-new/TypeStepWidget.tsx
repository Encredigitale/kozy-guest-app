import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWizard } from "./context";
import { useActiveEventTypes } from "@/core/eventTypes/useEventTypes";
import {
  Utensils, Briefcase, PartyPopper, Gift, Coffee, Heart, Cake, Music, Baby,
  Users, CalendarDays, Sparkles, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Utensils, Briefcase, PartyPopper, Gift, Coffee, Heart, Cake, Music, Baby, Users, CalendarDays, Sparkles,
};

export const OTHER_TYPE = "other";

export default function TypeStepWidget() {
  const { type, setType, customType, setCustomType, next } = useWizard();
  const { data: types, isLoading } = useActiveEventTypes();

  const isOther = type === OTHER_TYPE;
  const canContinue = Boolean(type) && (!isOther || customType.trim().length > 0);

  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Étape 1 / 3</p>
          <h2 className="text-xl font-serif tracking-tight text-primary mt-1">Type d'événement</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choisissez un type parmi ceux proposés, ou sélectionnez « Autre » pour le préciser.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des types…</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {types.map((t) => {
              const Icon = ICONS[t.icon] ?? Sparkles;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${type === t.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <Icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium">{t.label}</p>
                  {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setType(OTHER_TYPE)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${isOther ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <Sparkles className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium">Autre</p>
            </button>
          </div>
        )}

        {isOther && (
          <div className="space-y-2">
            <Label htmlFor="custom-type">Précisez le type d'événement</Label>
            <Input
              id="custom-type"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Ex. Crémaillère, Brunch entre voisins…"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button disabled={!canContinue} onClick={next} className="rounded-full">Continuer</Button>
        </div>
      </CardContent>
    </Card>
  );
}
