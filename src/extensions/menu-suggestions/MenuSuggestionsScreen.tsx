import { MENUS_BY_TYPE } from "./MenuSuggestionsWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_LABELS: Record<string, string> = {
  wedding: "Mariage",
  birthday: "Anniversaire",
  dinner: "Dîner",
  default: "Autre",
};

export default function MenuSuggestionsScreen() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Suggestions de menus</h1>
        <p className="text-sm text-muted-foreground mt-1">Idées de menus par type d'événement.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(MENUS_BY_TYPE).map(([type, menus]) => (
          <Card key={type} className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">{TYPE_LABELS[type] ?? type}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {menus.map((m, i) => (
                <div key={i} className="border-t border-border/40 first:border-0 pt-3 first:pt-0 text-sm">
                  <p><span className="text-muted-foreground">Entrée :</span> {m.starter}</p>
                  <p><span className="text-muted-foreground">Plat :</span> {m.main}</p>
                  <p><span className="text-muted-foreground">Dessert :</span> {m.dessert}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
