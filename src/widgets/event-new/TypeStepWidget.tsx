import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWizard } from "./context";
import { Utensils, Briefcase, PartyPopper, Gift, Coffee, Sparkles } from "lucide-react";

const TYPES = [
  { id: "dinner", label: "Dîner", icon: Utensils },
  { id: "meeting", label: "Réunion pro", icon: Briefcase },
  { id: "party", label: "Fête", icon: PartyPopper },
  { id: "birthday", label: "Anniversaire", icon: Gift },
  { id: "aperitif", label: "Apéro", icon: Coffee },
  { id: "other", label: "Autre", icon: Sparkles },
];

export default function TypeStepWidget() {
  const { type, setType, next } = useWizard();
  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Étape 1 / 3</p>
          <h2 className="text-xl font-serif tracking-tight text-primary mt-1">Type d'événement</h2>
          <p className="text-sm text-muted-foreground mt-1">Le type détermine les widgets proposés par défaut.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${type === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <t.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-medium">{t.label}</p>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button disabled={!type} onClick={next} className="rounded-full">Continuer</Button>
        </div>
      </CardContent>
    </Card>
  );
}
