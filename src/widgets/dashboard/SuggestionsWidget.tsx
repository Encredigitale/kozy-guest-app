import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, PartyPopper, UtensilsCrossed, Cake } from "lucide-react";

const SUGGESTIONS = [
  { title: "Organiser un dîner", desc: "Réunissez vos proches autour d'un repas", icon: UtensilsCrossed },
  { title: "Fêter un anniversaire", desc: "Créez un moment inoubliable", icon: Cake },
  { title: "Planifier une fête", desc: "Rassemblez tout le monde", icon: PartyPopper },
] as const;

export default function SuggestionsWidget() {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Suggestions</h2>
        </div>
        <div className="space-y-2">
          {SUGGESTIONS.map(({ title, desc, icon: Icon }) => (
            <Link
              key={title}
              to="/app/events/new"
              className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-accent transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
